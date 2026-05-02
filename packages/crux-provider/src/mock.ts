import type { AgentSummary, AskInput, CruxProvider, RunBundle, RunSummary, SourcePolicy } from "./types";

type MockCruxProviderOptions = {
  now?: () => string;
};

const defaultNow = () => new Date().toISOString();

const slugify = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 52);

const firstTopicPhrase = (question: string) => {
  const compact = question.replace(/\s+/g, " ").trim().replace(/[?.!]+$/g, "");
  return compact.length > 0 ? compact : "this decision";
};

export class MockCruxProvider implements CruxProvider {
  private readonly now: () => string;
  private readonly runs = new Map<string, RunBundle>();

  constructor(options: MockCruxProviderOptions = {}) {
    this.now = options.now ?? defaultNow;
  }

  async ask(input: AskInput): Promise<RunSummary> {
    const createdAt = this.now();
    const question = input.question.trim();
    const sourcePolicy = input.sourcePolicy ?? "hybrid";
    const hasSourcePack = Boolean(input.sourcePack && input.sourcePack.sourceCount > 0);
    const runId = this.createRunId(question, createdAt);
    const runDir = `runs/${runId}`;
    const blockingIssues = hasSourcePack ? [] : this.blockingIssuesFor(sourcePolicy);
    const topic = firstTopicPhrase(question);
    const agentStatus: AgentSummary["status"] = blockingIssues.length > 0 ? "warn" : "pass";
    const agentBlockingIssues = hasSourcePack ? [] : ["Research Scout: No source material is attached to the run."];
    const agentNextActions = hasSourcePack
      ? ["Continue with human review before exporting the memo."]
      : ["Attach source material and rerun before relying on the memo."];
    const agentSummary: AgentSummary = {
      status: agentStatus,
      confidence: hasSourcePack ? 0.88 : 0.72,
      agentCount: 6,
      warningCount: hasSourcePack ? 0 : 2,
      failingCount: 0,
      blockingIssues: agentBlockingIssues,
      nextActions: agentNextActions,
    };

    const summary: RunSummary = {
      runId,
      runDir,
      question,
      scope: "general-analysis",
      intent: "decision",
      answerability: "answerable_with_assumptions",
      risk: "medium",
      createdAt,
      harnessVersion: "mock",
      trust: {
        status: blockingIssues.length > 0 ? "warn" : "pass",
        confidence: blockingIssues.length > 0 ? 0.68 : 0.86,
        blockingIssues,
      },
      readiness: hasSourcePack
        ? {
            status: "ready",
            label: "Ready for review",
            reason: "Source context and bounded agents are available for inspection.",
            blockerCount: 0,
            nextAction: "Review claims and export the memo when approved.",
          }
        : {
            status: "usable_with_warnings",
            label: "Usable with warnings",
            reason: "The run is inspectable but still needs source material before operational use.",
            blockerCount: blockingIssues.length + agentBlockingIssues.length,
            nextAction: agentNextActions[0],
          },
      agents: agentSummary,
      sourceWorkspace: {
        sourceCount: input.sourcePack?.sourceCount ?? 0,
        sourceChunkCount: input.sourcePack?.sourceCount ?? 0,
        missingEvidence: hasSourcePack ? [] : ["Attach source material for the top evidence gap."],
        sourcePackName: input.sourcePack?.name,
      },
      paths: {
        generatedInput: `runs/query-inputs/${runId}.yaml`,
        queryIntake: `${runDir}/query_intake.json`,
        decisionMemo: `${runDir}/decision_memo.md`,
        htmlReport: `${runDir}/run_report.html`,
      },
      memoPreview: this.createMemo(topic, input.context, input.timeHorizon, input.sourcePack),
    };

    const bundle: RunBundle = {
      ...summary,
      memo: summary.memoPreview,
      artifacts: {
        queryIntake: {
          question,
          context: input.context ?? "",
          timeHorizon: input.timeHorizon ?? "90 days",
          sourcePolicy,
          inferredIntent: "decision",
          inferredScope: "general-analysis",
          sourcePack: input.sourcePack
            ? {
                id: input.sourcePack.id,
                name: input.sourcePack.name,
                sourceCount: input.sourcePack.sourceCount,
                files: input.sourcePack.files ?? [],
              }
            : undefined,
        },
        claims: {
          claims: [
            {
              id: "claim-1",
              text: `${topic} should be handled as a staged decision until stronger evidence is available.`,
              status: "supported",
              confidence: 0.71,
              evidenceIds: ["evidence-1"],
            },
            {
              id: "claim-2",
              text: `The support team should keep source and constraint gaps visible before acting on the memo.`,
              status: "needs_evidence",
              confidence: 0.59,
              evidenceIds: [],
            },
          ],
        },
        evidence: {
          evidence: [
            {
              id: "evidence-1",
              summary: input.sourcePack
                ? `${input.sourcePack.name}${sourceFileLabel(input.sourcePack.files)} provides source-backed context for this run.`
                : "Mock evidence stands in for a future harness artifact while preserving the UI contract.",
              sourceType: input.sourcePack ? "source_pack" : "mock",
              reliability: input.sourcePack ? 0.78 : 0.54,
              relevance: input.sourcePack ? 0.84 : 0.76,
              supports: ["claim-1"],
              challenges: [],
            },
          ],
        },
        contradictions: {
          contradictions: [
            {
              id: "contradiction-1",
              summary:
                "The run is directionally useful, but source-free output should not be treated as final.",
              severity: "medium",
            },
          ],
        },
        uncertainty: {
          confidence: summary.trust.confidence,
          keyUncertainties: [
            "Whether the user's operating constraints are complete.",
            "Whether source evidence would change the recommended next test.",
          ],
        },
        sourceInventory: {
          source_pack: input.sourcePack
            ? { path: input.sourcePack.path ?? null, mode: "studio" }
            : { path: null, mode: "none" },
          sources: input.sourcePack?.files?.map((file, index) => ({
            id: `source-${index + 1}`,
            title: file.name,
            path: file.name,
            type: "studio_upload",
          })) ?? [],
        },
        sourceChunks: {
          chunks: input.sourcePack?.files?.map((file, index) => ({
            id: `chunk-${index + 1}`,
            source_id: `source-${index + 1}`,
            text: file.content.slice(0, 500),
          })) ?? [],
        },
        agentManifest: {
          mode: "bounded",
          agents: [
            { agent_id: "research_scout", name: "Research Scout", role: "Source gap planner" },
            { agent_id: "evidence_auditor", name: "Evidence Auditor", role: "Claim support auditor" },
            { agent_id: "red_team_agent", name: "Red Team Agent", role: "Recommendation breaker" },
            { agent_id: "council_moderator", name: "Council Moderator", role: "Cross-agent synthesis judge" },
            { agent_id: "replay_planner", name: "Replay Planner", role: "Run improvement planner" },
            { agent_id: "eval_scenario_agent", name: "Eval Scenario Agent", role: "E2E test designer" },
          ],
        },
        agents: {
          schema_version: "crux.agent_findings.v1",
          mode: "bounded",
          synthesis: {
            status: agentSummary.status,
            confidence: agentSummary.confidence,
            blocking_issues: agentBlockingIssues,
            next_actions: agentNextActions,
          },
          findings: [
            {
              agent_id: "research_scout",
              name: "Research Scout",
              role: "Source gap planner",
              status: hasSourcePack ? "pass" : "warn",
              confidence: hasSourcePack ? 0.84 : 0.58,
              stage: "ingest_sources",
              summary: hasSourcePack
                ? "Source pack context is attached to the run."
                : "Run has no ingested source pack, so the recommendation remains a draft.",
              blocking_issues: agentBlockingIssues,
              recommendations: agentNextActions,
              next_actions: agentNextActions,
              input_artifacts: ["source_inventory.json", "source_chunks.json", "contradictions.json"],
            },
            {
              agent_id: "evidence_auditor",
              name: "Evidence Auditor",
              role: "Claim support auditor",
              status: hasSourcePack ? "pass" : "warn",
              confidence: hasSourcePack ? 0.88 : 0.68,
              stage: "gather_evidence",
              summary: hasSourcePack
                ? "Evidence is source-pack backed in the Studio mock run."
                : "Evidence is inspectable but source quality is intentionally limited.",
              blocking_issues: [],
              recommendations: ["Keep important claims linked to source-backed evidence."],
              next_actions: [],
              input_artifacts: ["claims.json", "evidence.json"],
            },
            {
              agent_id: "council_moderator",
              name: "Council Moderator",
              role: "Cross-agent synthesis judge",
              status: agentStatus,
              confidence: hasSourcePack ? 0.9 : 0.76,
              stage: "run_agents",
              summary: hasSourcePack
                ? "No agent-level blockers were found in the mock run."
                : "The agent council preserved source weakness as a warning.",
              blocking_issues: agentBlockingIssues,
              recommendations: agentNextActions,
              next_actions: agentNextActions,
              input_artifacts: ["agent_findings.json"],
            },
          ],
        },
        council: {
          status: summary.trust.status,
          reviewers: [
            { id: "evidence-auditor", status: "warn", score: 0.68 },
            { id: "decision-utility-auditor", status: "pass", score: 0.82 },
          ],
        },
        evalReport: {
          scores: {
            source_quality: hasSourcePack ? 0.82 : 0.55,
            decision_usefulness: 0.82,
          },
          council: {
            synthesis: {
              status: summary.trust.status,
              confidence: summary.trust.confidence,
            },
          },
        },
        diagnostics: {
          blockingIssues,
          nextFixes:
            blockingIssues.length > 0
              ? ["Attach sources or switch to an offline draft expectation before trusting the answer."]
              : [],
        },
        trace: [
          {
            timestamp: createdAt,
            stage: "mock-provider.ask",
            message: "Created deterministic Studio run bundle through provider boundary.",
          },
        ],
      },
    };

    this.runs.set(runId, bundle);
    return summary;
  }

  async listRuns(): Promise<RunSummary[]> {
    return [...this.runs.values()]
      .map(({ artifacts: _artifacts, ...summary }) => summary)
      .sort((left, right) => right.createdAt.localeCompare(left.createdAt));
  }

  async getRun(runId: string): Promise<RunBundle> {
    const run = this.runs.get(runId);

    if (!run) {
      throw new Error(`Run not found: ${runId}`);
    }

    return run;
  }

  private createRunId(question: string, createdAt: string) {
    const timestamp = createdAt.replace(/[^0-9]/g, "").slice(0, 14);
    const base = `mock-${timestamp}-${slugify(question) || "run"}`;
    if (!this.runs.has(base)) {
      return base;
    }

    let suffix = 2;
    while (this.runs.has(`${base}-${suffix}`)) {
      suffix += 1;
    }
    return `${base}-${suffix}`;
  }

  private blockingIssuesFor(sourcePolicy: SourcePolicy) {
    if (sourcePolicy === "offline") {
      return ["Offline mock run has no source inventory yet."];
    }

    if (sourcePolicy === "hybrid") {
      return ["Hybrid mock run needs attached sources before the memo can be trusted."];
    }

    return [];
  }

  private createMemo(
    topic: string,
    context?: string,
    timeHorizon?: string,
    sourcePack?: AskInput["sourcePack"],
  ) {
    const horizon = timeHorizon?.trim() || "90 days";
    const contextLine = context?.trim()
      ? `\n\nContext considered: ${context.trim()}`
      : "";
    const sourceLine = sourcePack
      ? `\n\nSources considered: ${sourcePack.name} (${sourcePack.sourceCount} source${sourcePack.sourceCount === 1 ? "" : "s"}).`
      : "";

    return `## Recommendation

Use a staged approach to ${topic}: clarify the decision criteria, compare the highest-leverage options, and run the smallest validation cycle inside ${horizon}.${contextLine}${sourceLine}

## Why

The current run is useful as a structured draft. ${sourcePack ? "Uploaded source context has strengthened the evidence path, but human review is still required before rollout." : "It should become a trusted recommendation only after the missing constraints and source evidence are attached."}

## Next Tests

1. Confirm the decision owner and constraints.
2. Add sources that would change the recommendation.
3. Rerun Crux and compare trust movement.`;
  }
}

function sourceFileLabel(files: NonNullable<AskInput["sourcePack"]>["files"] = []) {
  if (!files.length) {
    return "";
  }

  return ` (${files.map((file) => file.name).join(", ")})`;
}
