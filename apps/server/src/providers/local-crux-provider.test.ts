import { describe, expect, it } from "vitest";
import { mkdtemp, readFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { LocalCruxHarnessProvider } from "./local-crux-provider";

describe("LocalCruxHarnessProvider", () => {
  it("materializes Studio source files into a Harness source pack and maps the run bundle", async () => {
    const projectRoot = await mkdtemp(path.join(os.tmpdir(), "crux-studio-local-provider-"));
    let capturedContext = "";
    let capturedSourcePack: string | undefined;
    let capturedRawFile = "";
    const provider = new LocalCruxHarnessProvider({
      projectRoot,
      driver: {
        async runQuery(_projectRoot, question, options) {
          capturedContext = options.context ?? "";
          capturedSourcePack = options.sourcePack;
          return {
            runId: "20260501T100000Z-support",
            runDir: `${projectRoot}/runs/20260501T100000Z-support`,
            generatedInputPath:
              `${projectRoot}/runs/query-inputs/20260501T100000Z-support.yaml`,
            intake: {
              original_query: question,
              analysis_scope: "general-analysis",
              intent: "decision",
              risk_level: "medium",
              answerability: options.context ? "answerable" : "answerable_with_assumptions",
              source_policy: options.sourcePolicy,
            },
          };
        },
        async importSources(options) {
          capturedRawFile = await readFile(path.join(options.inputDir, "queue-notes.md"), "utf8");
          return {
            input_dir: options.inputDir,
            output_dir: options.outputDir,
            imported_count: 1,
            skipped_count: 0,
            sources: [
              {
                id: "S1",
                title: "Support notes",
                source_type: "internal_document",
                input_path: path.join(options.inputDir, "queue-notes.md"),
                output_path: path.join(options.outputDir, "s1-support-notes.md"),
                content_hash: "hash",
              },
            ],
            skipped: [],
          };
        },
        async loadRunArtifactBundle() {
          return {
            run_dir: "runs/20260501T100000Z-support",
            run_config: {
              harness_version: "1.12.1",
              source_pack: "runs/studio-source-packs/source-pack-1-support-queue-notes-abcdef123456/pack",
            },
            question_spec: {
              question: "How should support reduce first-response time?",
            },
            decision_memo:
              "## Recommendation\n\nReduce response time by triaging queues and measuring daily movement.",
            eval_report: {
              council: {
                synthesis: {
                  status: "fail",
                  confidence: 0.55,
                  blocking_failures: ["Source policy hybrid requires evidence."],
                },
              },
              diagnostics: [],
            },
            claims: { claims: [] },
            evidence: { evidence: [] },
            contradictions: {
              contradictions: [],
              missing_evidence: ["Current queue baseline"],
            },
            uncertainty: { confidence: 0.55 },
            source_inventory: { sources: [{ id: "S1", title: "Support notes" }] },
            source_chunks: { chunks: [{ id: "CH1", source_id: "S1" }] },
            summary: { source_count: 1, source_chunk_count: 1 },
            agent_manifest: {
              mode: "bounded",
              agents: [
                {
                  agent_id: "evidence_auditor",
                  name: "Evidence Auditor",
                  role: "Claim support auditor",
                },
              ],
            },
            agent_findings: {
              schema_version: "crux.agent_findings.v1",
              mode: "bounded",
              synthesis: {
                status: "warn",
                confidence: 0.82,
                blocking_issues: ["Research Scout: source coverage is thin."],
                next_actions: ["Attach one more source pack and rerun."],
              },
              findings: [
                {
                  agent_id: "evidence_auditor",
                  name: "Evidence Auditor",
                  role: "Claim support auditor",
                  status: "pass",
                  confidence: 0.95,
                  stage: "gather_evidence",
                  summary: "Claims are traceable.",
                  blocking_issues: [],
                  recommendations: ["Keep evidence source-backed."],
                  next_actions: [],
                  input_artifacts: ["claims.json", "evidence.json"],
                },
                {
                  agent_id: "council_moderator",
                  name: "Council Moderator",
                  role: "Cross-agent synthesis judge",
                  status: "warn",
                  confidence: 0.82,
                  stage: "run_agents",
                  summary: "One source warning remains.",
                  blocking_issues: ["Research Scout: source coverage is thin."],
                  recommendations: ["Attach one more source pack and rerun."],
                  next_actions: ["Attach one more source pack and rerun."],
                  input_artifacts: ["agent_findings.json"],
                },
              ],
            },
            trace: [],
            relationships: {},
          };
        },
        async writeRunReport() {
          return "runs/20260501T100000Z-support/run_report.html";
        },
        async listRunDirs() {
          return ["runs/20260501T100000Z-support"];
        },
      },
    });

    const run = await provider.ask({
      question: "How should support reduce first-response time?",
      context: "No hiring this month.",
      sourcePolicy: "hybrid",
      sourcePack: {
        id: "source-pack-1",
        name: "Support queue notes",
        sourceCount: 1,
        files: [
          {
            name: "queue-notes.md",
            content: "Preventable queue handoff errors appear every Monday.",
            contentHash: "hash-1",
            size: 51,
          },
        ],
      },
    });

    expect(capturedContext).toContain("Support queue notes");
    expect(capturedContext).toContain("queue-notes.md");
    expect(capturedContext).toContain("Harness source pack:");
    expect(capturedContext).not.toContain("Preventable queue handoff errors");
    expect(capturedSourcePack).toMatch(/^runs\/studio-source-packs\/source-pack-1-support-queue-notes-[a-f0-9]{12}\/pack$/);
    expect(capturedRawFile).toBe("Preventable queue handoff errors appear every Monday.");

    expect(run).toEqual(
      expect.objectContaining({
        runId: "20260501T100000Z-support",
        runDir: "runs/20260501T100000Z-support",
        question: "How should support reduce first-response time?",
        harnessVersion: "1.12.1",
        trust: {
          status: "fail",
          confidence: 0.55,
          blockingIssues: ["Source policy hybrid requires evidence."],
        },
        paths: expect.objectContaining({
          generatedInput:
            "runs/query-inputs/20260501T100000Z-support.yaml",
          decisionMemo: "runs/20260501T100000Z-support/decision_memo.md",
          htmlReport: "runs/20260501T100000Z-support/run_report.html",
        }),
        agents: {
          status: "warn",
          confidence: 0.82,
          agentCount: 2,
          warningCount: 1,
          failingCount: 0,
          blockingIssues: ["Research Scout: source coverage is thin."],
          nextActions: ["Attach one more source pack and rerun."],
        },
        readiness: {
          status: "blocked",
          label: "Blocked",
          reason: "Trust, agent, or source blockers must be resolved before this run is used operationally.",
          blockerCount: 2,
          nextAction: "Attach one more source pack and rerun.",
        },
        sourceWorkspace: {
          sourceCount: 1,
          sourceChunkCount: 1,
          missingEvidence: ["Current queue baseline"],
          sourcePackName: "source-pack-1-support-queue-notes-abcdef123456",
        },
      }),
    );

    await expect(provider.getRun(run.runId)).resolves.toEqual(
      expect.objectContaining({
        runId: run.runId,
        artifacts: expect.objectContaining({
          agentManifest: expect.objectContaining({ mode: "bounded" }),
          agents: expect.objectContaining({
            synthesis: expect.objectContaining({ status: "warn" }),
          }),
          sourceInventory: { sources: [{ id: "S1", title: "Support notes" }] },
          sourceChunks: { chunks: [{ id: "CH1", source_id: "S1" }] },
          evalReport: expect.objectContaining({
            council: expect.any(Object),
          }),
          claims: { claims: [] },
          evidence: { evidence: [] },
          trace: [],
        }),
      }),
    );

    await expect(provider.listRuns()).resolves.toEqual([
      expect.objectContaining({ runId: "20260501T100000Z-support" }),
    ]);
  });
});
