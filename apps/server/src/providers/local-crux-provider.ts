import type {
  AgentSummary,
  AskInput,
  CruxProvider,
  RunBundle,
  RunSummary,
  SourcePolicy,
  TrustStatus,
} from "@crux-studio/crux-provider";
import { readdir } from "node:fs/promises";
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
  run_config?: { input?: { question?: string; query_intake?: Record<string, unknown> } };
  decision_memo?: string;
  eval_report?: {
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
  contradictions?: unknown;
  uncertainty?: unknown;
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

export type LocalCruxHarnessDriver = {
  runQuery(
    projectRoot: string,
    question: string,
    options: {
      context?: string;
      timeHorizon?: string;
      sourcePolicy?: SourcePolicy;
    },
  ): Promise<HarnessRunResult>;
  loadRunArtifactBundle(projectRoot: string, runDir: string): Promise<HarnessArtifactBundle>;
  writeRunReport(projectRoot: string, runDir: string): Promise<string>;
  listRunDirs(projectRoot: string): Promise<string[]>;
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
    const result = await this.driver.runQuery(this.projectRoot, input.question, {
      context: [input.context, formatSourcePackContext(input.sourcePack)]
        .filter(Boolean)
        .join("\n\n"),
      timeHorizon: input.timeHorizon,
      sourcePolicy: input.sourcePolicy,
    });
    const reportPath = await this.driver.writeRunReport(this.projectRoot, result.runDir);
    const bundle = await this.loadBundle(result.runDir, {
      generatedInputPath: result.generatedInputPath,
      intake: result.intake,
      reportPath,
    });

    return this.toSummary(bundle);
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
      trust: {
        status,
        confidence: Number(synthesis?.confidence ?? 0),
        blockingIssues: synthesis?.blocking_failures ?? [],
      },
      agents: agentSummary,
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
        agentManifest: harnessBundle.agent_manifest,
        agents: harnessBundle.agent_findings,
        council: harnessBundle.eval_report?.council,
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

  return {
    runQuery: queryModule.runQuery,
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

function formatSourcePackContext(sourcePack: AskInput["sourcePack"]) {
  if (!sourcePack) {
    return undefined;
  }

  const files = sourcePack.files
    ?.map((file) => `### ${file.name}\n${file.content.trim().slice(0, 5000)}`)
    .join("\n\n");

  return [`Studio source pack: ${sourcePack.name}`, files].filter(Boolean).join("\n\n");
}

function stringField(source: Record<string, unknown>, field: string): string | undefined {
  const value = source[field];
  return typeof value === "string" ? value : undefined;
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
