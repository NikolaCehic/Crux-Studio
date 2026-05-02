import type {
  AgentSummary,
  AskInput,
  CruxProvider,
  ReadinessSummary,
  RunBundle,
  RunSummary,
  SourceWorkspaceSummary,
  SourcePolicy,
  TrustStatus,
} from "@crux-studio/crux-provider";
import { createHash } from "node:crypto";
import { mkdir, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

type HarnessRunResult = {
  runId: string;
  runDir: string;
  generatedInputPath?: string;
  intake?: Record<string, unknown>;
};

type HarnessArtifactBundle = {
  run_dir?: string;
  question_spec?: { question?: string };
  run_config?: {
    harness_version?: string;
    source_pack?: string | null;
    input?: { question?: string; query_intake?: Record<string, unknown> };
  };
  decision_memo?: string;
  eval_report?: {
    scores?: Record<string, number>;
    council?: {
      synthesis?: {
        status?: string;
        confidence?: number;
        blocking_failures?: string[];
      };
    };
    diagnostics?: unknown[];
  };
  claims?: unknown;
  evidence?: unknown;
  contradictions?: {
    missing_evidence?: string[];
    contradictions?: unknown[];
  };
  uncertainty?: unknown;
  summary?: {
    source_count?: number;
    source_chunk_count?: number;
  };
  agent_manifest?: unknown;
  agent_findings?: {
    synthesis?: {
      status?: string;
      confidence?: number;
      blocking_issues?: string[];
      next_actions?: string[];
    };
    findings?: Array<{
      status?: string;
      blocking_issues?: string[];
    }>;
  };
  source_inventory?: unknown;
  source_chunks?: unknown;
  trace?: unknown[];
  relationships?: unknown;
};

type HarnessSourceImportReport = {
  input_dir: string;
  output_dir: string;
  imported_count: number;
  skipped_count: number;
  sources: unknown[];
  skipped: unknown[];
};

export type LocalCruxHarnessDriver = {
  runQuery(
    projectRoot: string,
    question: string,
    options: {
      context?: string;
      timeHorizon?: string;
      sourcePolicy?: SourcePolicy;
      sourcePack?: string;
    },
  ): Promise<HarnessRunResult>;
  importSources(options: {
    inputDir: string;
    outputDir: string;
  }): Promise<HarnessSourceImportReport>;
  loadRunArtifactBundle(projectRoot: string, runDir: string): Promise<HarnessArtifactBundle>;
  writeRunReport(projectRoot: string, runDir: string): Promise<string>;
  listRunDirs(projectRoot: string): Promise<string[]>;
};

type PreparedSourcePack = {
  relativePackDir: string;
  importedCount: number;
  skippedCount: number;
  fileNames: string[];
};

type LocalCruxHarnessProviderOptions = {
  projectRoot: string;
  driver: LocalCruxHarnessDriver;
};

export class LocalCruxHarnessProvider implements CruxProvider {
  private readonly cache = new Map<string, RunBundle>();
  private readonly projectRoot: string;
  private readonly driver: LocalCruxHarnessDriver;

  constructor(options: LocalCruxHarnessProviderOptions) {
    this.projectRoot = options.projectRoot;
    this.driver = options.driver;
  }

  static async fromHarnessRoot(projectRoot: string): Promise<LocalCruxHarnessProvider> {
    return new LocalCruxHarnessProvider({
      projectRoot,
      driver: await createDistDriver(projectRoot),
    });
  }

  async ask(input: AskInput): Promise<RunSummary> {
    const preparedSourcePack = await this.materializeSourcePack(input.sourcePack);
    const result = await this.driver.runQuery(this.projectRoot, input.question, {
      context: [input.context, formatSourcePackContext(input.sourcePack, preparedSourcePack)]
        .filter(Boolean)
        .join("\n\n"),
      timeHorizon: input.timeHorizon,
      sourcePolicy: input.sourcePolicy,
      sourcePack: preparedSourcePack?.relativePackDir ?? input.sourcePack?.path,
    });
    const reportPath = await this.driver.writeRunReport(this.projectRoot, result.runDir);
    const bundle = await this.loadBundle(result.runDir, {
      generatedInputPath: result.generatedInputPath,
      intake: result.intake,
      reportPath,
    });

    return this.toSummary(bundle);
  }

  private async materializeSourcePack(
    sourcePack: AskInput["sourcePack"],
  ): Promise<PreparedSourcePack | undefined> {
    if (!sourcePack) {
      return undefined;
    }

    const files = sourcePack.files ?? [];
    if (files.length === 0) {
      return sourcePack.path
        ? {
            relativePackDir: sourcePack.path,
            importedCount: sourcePack.sourceCount,
            skippedCount: 0,
            fileNames: [],
          }
        : undefined;
    }

    const safeFiles = files.map((file, index) => ({
      name: safeSourceFileName(file.name, index),
      content: file.content,
      contentHash: file.contentHash,
    }));
    const contentHash = hashSourcePackFiles(safeFiles);
    const slug = slugifyPathSegment(`${sourcePack.id}-${sourcePack.name}-${contentHash.slice(0, 12)}`);
    const baseDir = path.join(this.projectRoot, "runs", "studio-source-packs", slug);
    const rawDir = path.join(baseDir, "raw");
    const packDir = path.join(baseDir, "pack");

    await mkdir(rawDir, { recursive: true });

    await Promise.all(
      safeFiles.map((file) => writeFile(path.join(rawDir, file.name), file.content, "utf8")),
    );

    const report = await this.driver.importSources({ inputDir: rawDir, outputDir: packDir });
    if (report.imported_count === 0) {
      throw new Error("Source pack did not contain any supported source files.");
    }

    return {
      relativePackDir: path.relative(this.projectRoot, packDir),
      importedCount: report.imported_count,
      skippedCount: report.skipped_count,
      fileNames: safeFiles.map((file) => file.name),
    };
  }

  async listRuns(): Promise<RunSummary[]> {
    const runDirs = await this.driver.listRunDirs(this.projectRoot);
    const loaded = await Promise.allSettled(
      runDirs.map((runDir) => this.loadBundle(runDir)),
    );

    return loaded
      .filter((result): result is PromiseFulfilledResult<RunBundle> => result.status === "fulfilled")
      .map((result) => this.toSummary(result.value))
      .sort((left, right) => right.createdAt.localeCompare(left.createdAt));
  }

  async getRun(runId: string): Promise<RunBundle> {
    const cached = this.cache.get(runId);

    if (cached) {
      return cached;
    }

    return this.loadBundle(`runs/${runId}`);
  }

  private async loadBundle(
    runDir: string,
    extras: {
      generatedInputPath?: string;
      intake?: Record<string, unknown>;
      reportPath?: string;
    } = {},
  ): Promise<RunBundle> {
    const harnessBundle = await this.driver.loadRunArtifactBundle(this.projectRoot, runDir);
    const bundle = this.toRunBundle(harnessBundle, extras);
    this.cache.set(bundle.runId, bundle);
    return bundle;
  }

  private toRunBundle(
    harnessBundle: HarnessArtifactBundle,
    extras: {
      generatedInputPath?: string;
      intake?: Record<string, unknown>;
      reportPath?: string;
    },
  ): RunBundle {
    const runDir = harnessBundle.run_dir ?? "runs/unknown";
    const runId = path.basename(runDir);
    const intake =
      extras.intake ??
      harnessBundle.run_config?.input?.query_intake ??
      {};
    const synthesis = harnessBundle.eval_report?.council?.synthesis;
    const status = toTrustStatus(synthesis?.status);
    const agentSummary = summarizeAgents(harnessBundle.agent_findings);
    const sourceWorkspace = summarizeSourceWorkspace(harnessBundle);
    const readiness = summarizeReadiness(status, synthesis?.blocking_failures ?? [], agentSummary, sourceWorkspace);
    const question =
      harnessBundle.question_spec?.question ??
      harnessBundle.run_config?.input?.question ??
      stringField(intake, "original_query") ??
      "Untitled Crux run";

    const summary: RunSummary = {
      runId,
      runDir,
      question,
      scope: stringField(intake, "analysis_scope") ?? "general-analysis",
      intent: stringField(intake, "intent") ?? "decision",
      answerability: stringField(intake, "answerability") ?? "unknown",
      risk: stringField(intake, "risk_level") ?? "unknown",
      createdAt: createdAtFromRunId(runId),
      harnessVersion: harnessBundle.run_config?.harness_version,
      trust: {
        status,
        confidence: Number(synthesis?.confidence ?? 0),
        blockingIssues: synthesis?.blocking_failures ?? [],
      },
      readiness,
      agents: agentSummary,
      sourceWorkspace,
      paths: {
        generatedInput: extras.generatedInputPath
          ? path.relative(this.projectRoot, extras.generatedInputPath)
          : undefined,
        queryIntake: `${runDir}/query_intake.json`,
        decisionMemo: `${runDir}/decision_memo.md`,
        htmlReport: extras.reportPath,
      },
      memoPreview: excerptMemo(harnessBundle.decision_memo ?? ""),
    };

    return {
      ...summary,
      memo: harnessBundle.decision_memo ?? "",
      artifacts: {
        queryIntake: intake,
        claims: harnessBundle.claims,
        evidence: harnessBundle.evidence,
        contradictions: harnessBundle.contradictions,
        uncertainty: harnessBundle.uncertainty,
        sourceInventory: harnessBundle.source_inventory,
        sourceChunks: harnessBundle.source_chunks,
        agentManifest: harnessBundle.agent_manifest,
        agents: harnessBundle.agent_findings,
        council: harnessBundle.eval_report?.council,
        evalReport: harnessBundle.eval_report,
        diagnostics: harnessBundle.eval_report?.diagnostics,
        trace: harnessBundle.trace,
      },
    };
  }

  private toSummary(bundle: RunBundle): RunSummary {
    const { artifacts: _artifacts, ...summary } = bundle;
    return summary;
  }
}

async function createDistDriver(projectRoot: string): Promise<LocalCruxHarnessDriver> {
  const queryModule = await importDist<{
    runQuery: LocalCruxHarnessDriver["runQuery"];
  }>(projectRoot, "query-intake.js");
  const bundleModule = await importDist<{
    loadRunArtifactBundle: LocalCruxHarnessDriver["loadRunArtifactBundle"];
  }>(projectRoot, "run-bundle.js");
  const reportModule = await importDist<{
    writeRunReport: LocalCruxHarnessDriver["writeRunReport"];
  }>(projectRoot, "run-report.js");
  const sourceImporterModule = await importDist<{
    importSources: LocalCruxHarnessDriver["importSources"];
  }>(projectRoot, "source-importer.js");

  return {
    runQuery: queryModule.runQuery,
    importSources: sourceImporterModule.importSources,
    loadRunArtifactBundle: bundleModule.loadRunArtifactBundle,
    writeRunReport: reportModule.writeRunReport,
    async listRunDirs(root) {
      const runsRoot = path.join(root, "runs");
      const entries = await readdir(runsRoot, { withFileTypes: true }).catch(() => []);
      return entries
        .filter((entry) => entry.isDirectory() && entry.name !== "query-inputs")
        .map((entry) => path.join("runs", entry.name));
    },
  };
}

async function importDist<T>(projectRoot: string, fileName: string): Promise<T> {
  const modulePath = path.join(projectRoot, "dist", "src", fileName);
  return import(pathToFileURL(modulePath).href) as Promise<T>;
}

function toTrustStatus(value: string | undefined): TrustStatus {
  if (value === "pass" || value === "warn" || value === "fail") {
    return value;
  }

  return "warn";
}

function summarizeAgents(agentFindings: HarnessArtifactBundle["agent_findings"]): AgentSummary | undefined {
  if (!agentFindings?.synthesis) {
    return undefined;
  }

  const findings = agentFindings.findings ?? [];
  return {
    status: toTrustStatus(agentFindings.synthesis.status),
    confidence: Number(agentFindings.synthesis.confidence ?? 0),
    agentCount: findings.length,
    warningCount: findings.filter((finding) => finding.status === "warn").length,
    failingCount: findings.filter((finding) => finding.status === "fail").length,
    blockingIssues: agentFindings.synthesis.blocking_issues ?? [],
    nextActions: agentFindings.synthesis.next_actions ?? [],
  };
}

function summarizeSourceWorkspace(bundle: HarnessArtifactBundle): SourceWorkspaceSummary {
  const sourceInventory = asRecord(bundle.source_inventory);
  const sourceChunks = asRecord(bundle.source_chunks);
  const sources = Array.isArray(sourceInventory.sources) ? sourceInventory.sources : [];
  const chunks = Array.isArray(sourceChunks.chunks) ? sourceChunks.chunks : [];
  const missingEvidence = bundle.contradictions?.missing_evidence ?? [];

  return {
    sourceCount: bundle.summary?.source_count ?? sources.length,
    sourceChunkCount: bundle.summary?.source_chunk_count ?? chunks.length,
    missingEvidence,
    ...(bundle.run_config?.source_pack ? { sourcePackName: sourcePackDisplayName(bundle.run_config.source_pack) } : {}),
  };
}

function summarizeReadiness(
  trustStatus: TrustStatus,
  trustBlockers: string[],
  agents: AgentSummary | undefined,
  sources: SourceWorkspaceSummary,
): ReadinessSummary {
  const blockerCount = trustBlockers.length + (agents?.blockingIssues.length ?? 0);
  const nextAction = agents?.nextActions[0] ?? sources.missingEvidence[0] ?? trustBlockers[0];

  if (trustStatus === "fail" || (agents?.status === "fail") || blockerCount > 0) {
    return {
      status: "blocked",
      label: "Blocked",
      reason: "Trust, agent, or source blockers must be resolved before this run is used operationally.",
      blockerCount,
      ...(nextAction ? { nextAction } : {}),
    };
  }

  if (trustStatus === "warn" || (agents?.status === "warn") || sources.missingEvidence.length > 0) {
    return {
      status: "usable_with_warnings",
      label: "Usable with warnings",
      reason: "The run is inspectable, but warnings or missing evidence still need review.",
      blockerCount,
      ...(nextAction ? { nextAction } : {}),
    };
  }

  return {
    status: "ready",
    label: "Ready for review",
    reason: "Trust gate, bounded agents, and source checks do not report blockers.",
    blockerCount,
    nextAction: "Review claims and export the memo when approved.",
  };
}

function formatSourcePackContext(
  sourcePack: AskInput["sourcePack"],
  preparedSourcePack?: PreparedSourcePack,
) {
  if (!sourcePack) {
    return undefined;
  }

  return [
    `Studio source pack: ${sourcePack.name}`,
    preparedSourcePack?.relativePackDir
      ? `Harness source pack: ${preparedSourcePack.relativePackDir}`
      : sourcePack.path
        ? `Harness source pack: ${sourcePack.path}`
        : undefined,
    preparedSourcePack
      ? `Imported sources: ${preparedSourcePack.importedCount}; skipped files: ${preparedSourcePack.skippedCount}.`
      : undefined,
    preparedSourcePack?.fileNames.length
      ? `Files: ${preparedSourcePack.fileNames.join(", ")}`
      : sourcePack.files?.length
        ? `Files: ${sourcePack.files.map((file) => file.name).join(", ")}`
        : undefined,
  ].filter(Boolean).join("\n");
}

function stringField(source: Record<string, unknown>, field: string): string | undefined {
  const value = source[field];
  return typeof value === "string" ? value : undefined;
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function safeSourceFileName(fileName: string, index: number): string {
  const baseName = path.basename(fileName.trim()) || `source-${index + 1}.md`;
  return baseName.replace(/[^a-zA-Z0-9._ -]/g, "_");
}

function slugifyPathSegment(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 72) || "source-pack";
}

function sourcePackDisplayName(sourcePackPath: string): string {
  const baseName = path.basename(sourcePackPath);
  return baseName === "pack" ? path.basename(path.dirname(sourcePackPath)) : baseName;
}

function hashSourcePackFiles(
  files: Array<{ name: string; content: string; contentHash?: string }>,
): string {
  const hash = createHash("sha256");
  for (const file of files) {
    hash.update(file.name);
    hash.update("\0");
    hash.update(file.contentHash ?? file.content);
    hash.update("\0");
  }
  return hash.digest("hex");
}

function createdAtFromRunId(runId: string): string {
  const match = runId.match(/^(\d{8})T?(\d{6})?Z?/);

  if (!match) {
    return new Date(0).toISOString();
  }

  const [, date, time = "000000"] = match;
  return `${date.slice(0, 4)}-${date.slice(4, 6)}-${date.slice(6, 8)}T${time.slice(0, 2)}:${time.slice(2, 4)}:${time.slice(4, 6)}.000Z`;
}

function excerptMemo(memo: string): string {
  const trimmed = memo.trim();

  if (trimmed.length <= 1600) {
    return trimmed;
  }

  return `${trimmed.slice(0, 1597)}...`;
}
