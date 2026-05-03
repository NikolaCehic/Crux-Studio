import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { App } from "./App";

const mockRun = {
  runId: "mock-ask",
  runDir: "runs/mock-ask",
  question: "How should a support team reduce first-response time?",
  scope: "general-analysis",
  intent: "decision",
  answerability: "answerable_with_assumptions",
  risk: "medium",
  createdAt: "2026-05-01T10:00:00.000Z",
  harnessVersion: "mock",
  trust: {
    status: "warn",
    confidence: 0.68,
    blockingIssues: ["Offline mock run has no source inventory yet."],
  },
  readiness: {
    status: "usable_with_warnings",
    label: "Usable with warnings",
    reason: "The run is inspectable, but warnings or missing evidence still need review.",
    blockerCount: 2,
    nextAction: "Attach source material and rerun before relying on the memo.",
  },
  agents: {
    status: "warn",
    confidence: 0.76,
    agentCount: 6,
    warningCount: 2,
    failingCount: 0,
    blockingIssues: ["Research Scout: No source material is attached to the run."],
    nextActions: ["Attach source material and rerun before relying on the memo."],
  },
  sourceWorkspace: {
    sourceCount: 1,
    sourceChunkCount: 2,
    sourcePackName: "Wholesale intake notes",
    missingEvidence: ["Current response-time baseline"],
  },
  paths: {
    generatedInput: "runs/query-inputs/mock-ask.yaml",
    queryIntake: "runs/mock-ask/query_intake.json",
    decisionMemo: "runs/mock-ask/decision_memo.md",
    htmlReport: "runs/mock-ask/run_report.html",
  },
  memoPreview:
    "## Recommendation\n\nUse a staged approach: clarify the queue policy, automate routing, and measure response-time movement daily.",
};

const mockBundle = {
  ...mockRun,
  memo: mockRun.memoPreview,
  review: {
    runId: "mock-ask",
    actions: [],
    summary: {
      approvedClaims: [],
      rejectedClaims: [],
      evidenceAnnotations: [],
    },
  },
  artifacts: {
    queryIntake: {
      original_query: mockRun.question,
      intent: "decision",
      analysis_scope: "general-analysis",
    },
    claims: {
      claims: [
        {
          id: "claim-1",
          text: "Queue triage should happen before adding more tooling.",
          status: "supported",
          confidence: 0.74,
          evidenceIds: ["evidence-1"],
        },
      ],
    },
    evidence: {
      evidence: [
        {
          id: "evidence-1",
          summary: "Mock source shows first-response gains came from queue policy changes.",
          sourceType: "mock",
          reliability: 0.64,
          relevance: 0.81,
          supports: ["claim-1"],
          challenges: [],
        },
      ],
    },
    sourceInventory: {
      sources: [{ id: "source-1", title: "Wholesale intake notes", path: "notes.md" }],
    },
    sourceChunks: {
      chunks: [
        { id: "chunk-1", source_id: "source-1", text: "Queue policy changed." },
        { id: "chunk-2", source_id: "source-1", text: "Response times improved." },
      ],
    },
    diagnostics: {
      blockingIssues: ["Offline mock run has no source inventory yet."],
      nextFixes: ["Attach source material and rerun."],
    },
    agentManifest: {
      mode: "bounded",
      agents: [
        { agent_id: "research_scout", name: "Research Scout", role: "Source gap planner" },
        { agent_id: "evidence_auditor", name: "Evidence Auditor", role: "Claim support auditor" },
        { agent_id: "council_moderator", name: "Council Moderator", role: "Cross-agent synthesis judge" },
      ],
    },
    agents: {
      schema_version: "crux.agent_findings.v1",
      mode: "bounded",
      synthesis: {
        status: "warn",
        confidence: 0.76,
        blocking_issues: ["Research Scout: No source material is attached to the run."],
        next_actions: ["Attach source material and rerun before relying on the memo."],
      },
      findings: [
        {
          agent_id: "research_scout",
          name: "Research Scout",
          role: "Source gap planner",
          status: "warn",
          confidence: 0.58,
          stage: "ingest_sources",
          summary: "Run has no ingested sources.",
          blocking_issues: ["No source material is attached to the run."],
          recommendations: ["Collect source material for the top evidence gap."],
          next_actions: ["Attach source material and rerun before relying on the memo."],
          input_artifacts: ["source_inventory.json"],
        },
        {
          agent_id: "evidence_auditor",
          name: "Evidence Auditor",
          role: "Claim support auditor",
          status: "pass",
          confidence: 0.95,
          stage: "gather_evidence",
          summary: "Important claims are mapped to evidence IDs.",
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
          blocking_issues: ["Research Scout: No source material is attached to the run."],
          recommendations: ["Attach source material and rerun before relying on the memo."],
          next_actions: ["Attach source material and rerun before relying on the memo."],
          input_artifacts: ["agent_findings.json"],
        },
      ],
    },
    evalReport: {
      scores: { source_quality: 0.64, decision_usefulness: 0.82 },
      council: { synthesis: { status: "warn", confidence: 0.68 } },
    },
    trace: [
      {
        timestamp: "2026-05-01T10:00:00.000Z",
        stage: "mock-provider.ask",
        message: "Created deterministic Studio run bundle.",
      },
    ],
  },
};

const mockProject = {
  id: "project-bakery",
  name: "Bakery Operations",
  createdAt: "2026-05-01T10:00:00.000Z",
  runIds: [],
  sourcePackIds: [],
};

const mockSourcePack = {
  id: "source-pack-wholesale",
  projectId: "project-bakery",
  name: "Wholesale intake notes",
  createdAt: "2026-05-01T10:00:00.000Z",
  sourceCount: 1,
  files: [{ id: "source-1", name: "notes.md" }],
};

const mockReview = {
  runId: "mock-ask",
  actions: [],
  summary: {
    approvedClaims: ["claim-1"],
    rejectedClaims: [],
    evidenceAnnotations: [{ evidenceId: "evidence-1", noteCount: 1 }],
  },
};

const replayedRun = {
  ...mockRun,
  runId: "mock-replay",
  trust: { ...mockRun.trust, confidence: 0.78 },
};

const replayedBundle = {
  ...mockBundle,
  ...replayedRun,
  memo: replayedRun.memoPreview,
  review: mockReview,
};

const mockQueuedJob = {
  jobId: "job-mock-ask",
  status: "queued",
  createdAt: "2026-05-01T10:00:00.000Z",
  updatedAt: "2026-05-01T10:00:00.000Z",
  input: {
    question: mockRun.question,
    context: "No new hiring this month.",
    timeHorizon: "30 days",
    sourcePolicy: "offline",
  },
};

const mockCompletedJob = {
  ...mockQueuedJob,
  status: "succeeded",
  startedAt: "2026-05-01T10:00:01.000Z",
  finishedAt: "2026-05-01T10:00:02.000Z",
  updatedAt: "2026-05-01T10:00:02.000Z",
  run: mockRun,
};

const mockFailedJob = {
  ...mockQueuedJob,
  jobId: "job-failed",
  status: "failed",
  error: "Run job interrupted by a server restart before completion. Retry the job to run it again.",
};

const mockEvidenceTask = {
  taskId: "task-current-response-time-baseline",
  runId: "mock-ask",
  projectId: "project-bakery",
  status: "open",
  kind: "missing_evidence",
  title: "Current response-time baseline",
  detail: "Current response-time baseline",
  createdAt: "2026-05-01T10:00:00.000Z",
  updatedAt: "2026-05-01T10:00:00.000Z",
};

const mockResolutionJob = {
  ...mockQueuedJob,
  jobId: "job-gap-resolution",
  input: {
    ...mockQueuedJob.input,
    sourcePackId: "source-pack-evidence-gap",
    sourcePolicy: "hybrid",
  },
};

const mockResolvedEvidenceTask = {
  ...mockEvidenceTask,
  status: "resolved",
  resolvedAt: "2026-05-01T10:00:03.000Z",
  resolvedBySourcePackId: "source-pack-evidence-gap",
  rerunJobId: "job-gap-resolution",
};

const mockLineage = {
  projectId: "project-bakery",
  projectName: "Bakery Operations",
  summary: {
    runCount: 2,
    sourcePackCount: 1,
    evidenceTaskCount: 1,
    resolvedTaskCount: 1,
    openTaskCount: 0,
    deltaCount: 1,
    latestRunId: "mock-replay",
    latestReadiness: "ready",
    latestTrust: "pass",
    nextStep: "Review claims and export the decision package.",
  },
  events: [
    {
      id: "run-mock-ask",
      type: "run_created",
      timestamp: "2026-05-01T10:00:00.000Z",
      title: "Run created",
      detail: "How should a support team reduce first-response time?",
      runId: "mock-ask",
      status: "usable_with_warnings",
      trustStatus: "warn",
      readinessStatus: "usable_with_warnings",
    },
    {
      id: "task-current-response-time-baseline-opened",
      type: "evidence_task_opened",
      timestamp: "2026-05-01T10:00:00.000Z",
      title: "Evidence task opened",
      detail: "Current response-time baseline",
      taskId: "task-current-response-time-baseline",
      runId: "mock-ask",
      status: "open",
    },
    {
      id: "task-current-response-time-baseline-resolved",
      type: "evidence_task_resolved",
      timestamp: "2026-05-01T10:00:03.000Z",
      title: "Evidence task resolved",
      detail: "Current response-time baseline",
      taskId: "task-current-response-time-baseline",
      sourcePackId: "source-pack-evidence-gap",
      jobId: "job-gap-resolution",
      status: "resolved",
    },
    {
      id: "job-gap-resolution-rerun-completed",
      type: "rerun_completed",
      timestamp: "2026-05-01T10:00:04.000Z",
      title: "Rerun completed",
      detail: "Evidence closure rerun finished.",
      runId: "mock-replay",
      jobId: "job-gap-resolution",
      readinessStatus: "ready",
      trustStatus: "pass",
    },
    {
      id: "mock-ask-to-mock-replay-delta",
      type: "decision_delta_available",
      timestamp: "2026-05-01T10:00:04.000Z",
      title: "Decision delta ready",
      detail: "The newer run is stronger because trust improved and evidence gaps closed.",
      leftRunId: "mock-ask",
      rightRunId: "mock-replay",
      delta: {
        direction: "improved",
        label: "+10 pts",
        nextStep: "Review claims and export the decision package.",
        closedGapCount: 1,
        remainingBlockerCount: 0,
        sourceCountDelta: 1,
      },
    },
  ],
};

const mockDossier = {
  projectId: "project-bakery",
  projectName: "Bakery Operations",
  title: "Decision Record Dossier",
  latestRunId: "mock-replay",
  question: "How should a support team reduce first-response time?",
  createdAt: "2026-05-01T10:00:05.000Z",
  recommendation:
    "Use a staged approach: clarify the queue policy, automate routing, and measure response-time movement daily.",
  nextStep: "Review claims and export the decision package.",
  readiness: {
    status: "ready",
    label: "Ready for review",
    reason: "Source-backed rerun is ready for review.",
    blockerCount: 0,
    nextAction: "Review claims and export the decision package.",
  },
  trust: {
    status: "pass",
    confidence: 0.78,
    blockingIssues: [],
  },
  sourceSummary: {
    sourceCount: 1,
    sourceChunkCount: 2,
    missingEvidence: [],
    sourcePackName: "Wholesale intake notes",
  },
  review: mockReview.summary,
  lineage: {
    eventCount: 5,
    deltaCount: 1,
    latestDelta: {
      direction: "improved",
      label: "+10 pts",
      nextStep: "Review claims and export the decision package.",
      closedGapCount: 1,
      remainingBlockerCount: 0,
      sourceCountDelta: 1,
    },
  },
  keyArtifacts: {
    input: "runs/query-inputs/mock-ask.yaml",
    memo: "runs/mock-replay/decision_memo.md",
    report: "runs/mock-replay/run_report.html",
  },
};

const mockAcceptanceGate = {
  projectId: "project-bakery",
  projectName: "Bakery Operations",
  latestRunId: "mock-replay",
  status: "accepted",
  label: "Ready to share",
  score: 1,
  recommendedAction: "Export dossier and share with the decision owner.",
  summary: {
    passCount: 8,
    warnCount: 0,
    failCount: 0,
    requiredPassCount: 4,
    totalCount: 8,
  },
  checks: [
    {
      id: "trust_gate",
      label: "Trust gate",
      status: "pass",
      detail: "The latest run passed the trust gate.",
      nextAction: "Keep trust evidence attached to the dossier.",
      weight: 2,
    },
    {
      id: "readiness",
      label: "Readiness",
      status: "pass",
      detail: "The latest run is ready for review.",
      nextAction: "Proceed with final review.",
      weight: 1,
    },
    {
      id: "source_coverage",
      label: "Source coverage",
      status: "pass",
      detail: "The dossier includes source-backed evidence.",
      nextAction: "Preserve the cited source pack.",
      weight: 2,
    },
    {
      id: "human_review",
      label: "Human review",
      status: "pass",
      detail: "A reviewer approved claims and no claims are rejected.",
      nextAction: "Keep reviewer rationale with the run.",
      weight: 1,
    },
    {
      id: "lineage_delta",
      label: "Lineage movement",
      status: "pass",
      detail: "The latest decision delta improved.",
      nextAction: "Reference the improved delta when sharing.",
      weight: 1,
    },
    {
      id: "export_package",
      label: "Export package",
      status: "pass",
      detail: "The memo artifact is available for dossier export.",
      nextAction: "Export the dossier package.",
      weight: 1,
    },
  ],
};

const mockHandoffReviewPack = {
  projectId: "project-bakery",
  projectName: "Bakery Operations",
  title: "Decision Handoff Review Pack",
  latestRunId: "mock-replay",
  status: "ready",
  label: "Ready for handoff",
  generatedAt: "2026-05-01T10:06:00.000Z",
  recommendedAction: "Export handoff pack and decision record.",
  summary: {
    acceptanceScore: 1,
    acceptancePassCount: 8,
    acceptanceWarnCount: 0,
    acceptanceFailCount: 0,
    openRemediationActions: 0,
    completedRemediationActions: 1,
    remediationEventCount: 2,
    sourceCount: 1,
    missingEvidenceCount: 0,
    approvedClaimCount: 1,
    rejectedClaimCount: 0,
    lineageEventCount: 5,
    deltaCount: 1,
    artifactCount: 3,
  },
  sections: [
    {
      id: "decision",
      label: "Decision summary",
      status: "pass",
      summary: "Recommendation and next step are present.",
      detail: "Use a staged approach.",
      nextAction: "Keep the recommendation paired with the current run.",
      evidence: ["Latest run: mock-replay"],
      href: "#memo",
    },
    {
      id: "acceptance",
      label: "Acceptance gate",
      status: "pass",
      summary: "8/8 checks pass.",
      detail: "The decision record is ready to share.",
      nextAction: "Keep acceptance evidence with the handoff.",
      evidence: ["Acceptance score: 100%"],
      href: "#acceptance",
    },
    {
      id: "remediation",
      label: "Remediation evidence",
      status: "pass",
      summary: "1 completed action from 2 ledger events.",
      detail: "Guided remediation activity is recorded.",
      nextAction: "Preserve ledger events in the handoff.",
      evidence: ["Action Completed: Close missing evidence"],
      href: "#remediation-ledger",
    },
    {
      id: "lineage",
      label: "Decision lineage",
      status: "pass",
      summary: "Improved delta available.",
      detail: "The latest rerun improved the decision state.",
      nextAction: "Reference the latest delta.",
      evidence: ["Decision delta ready"],
      href: "#lineage",
    },
  ],
  exports: {
    handoffReviewPackHref: "/api/projects/project-bakery/export/handoff-review-pack",
    decisionRecordDossierHref: "/api/projects/project-bakery/export/decision-record-dossier",
    decisionPackageHref: "/api/runs/mock-replay/export/decision-package",
    reviewedMemoHref: "/api/runs/mock-replay/export/reviewed-memo",
  },
};

const mockRemediationPlan = {
  projectId: "project-bakery",
  projectName: "Bakery Operations",
  latestRunId: "mock-replay",
  status: "complete",
  recommendedAction: "Export dossier and share with the decision owner.",
  summary: {
    totalActions: 1,
    blockingActions: 0,
    warningActions: 0,
    readyActions: 1,
  },
  actions: [
    {
      id: "export-dossier",
      gateCheckId: "export_package",
      label: "Export accepted dossier",
      status: "pass",
      priority: "low",
      actionType: "export_dossier",
      rationale: "All acceptance checks passed. The dossier is ready to share.",
      recommendedAction: "Export dossier and share with the decision owner.",
      ctaLabel: "Export dossier",
      href: "/api/projects/project-bakery/export/decision-record-dossier",
    },
  ],
};

const mockActionRequiredRemediationPlan = {
  projectId: "project-bakery",
  projectName: "Bakery Operations",
  latestRunId: "mock-ask",
  status: "action_required",
  recommendedAction: "Current response-time baseline",
  summary: {
    totalActions: 3,
    blockingActions: 0,
    warningActions: 3,
    readyActions: 0,
  },
  actions: [
    {
      id: "missing-evidence-remediation",
      gateCheckId: "missing_evidence",
      label: "Close missing evidence",
      status: "warn",
      priority: "high",
      actionType: "close_evidence_gap",
      rationale: "1 evidence gap still needs attention.",
      recommendedAction: "Current response-time baseline",
      ctaLabel: "Close evidence gap",
      href: "#artifacts",
      target: {
        runId: "mock-ask",
        evidenceGap: "Current response-time baseline",
        artifactPath: "runs/mock-ask/decision_memo.md",
      },
    },
    {
      id: "human-review-remediation",
      gateCheckId: "human_review",
      label: "Review key claims",
      status: "warn",
      priority: "medium",
      actionType: "review_claims",
      rationale: "No human claim approval is recorded yet.",
      recommendedAction: "Approve or reject key claims before sharing.",
      ctaLabel: "Review claims",
      href: "#artifacts",
      target: { runId: "mock-ask", artifactPath: "runs/mock-ask/decision_memo.md" },
    },
    {
      id: "lineage-remediation",
      gateCheckId: "lineage_delta",
      label: "Compare rerun movement",
      status: "warn",
      priority: "medium",
      actionType: "compare_rerun",
      rationale: "No decision delta is available for the latest project run.",
      recommendedAction: "Compare a source-backed rerun against the prior decision state.",
      ctaLabel: "Compare rerun",
      href: "#lineage",
      target: { runId: "mock-ask", artifactPath: "runs/mock-ask/run_report.html" },
    },
  ],
};

type MockRemediationLedger = {
  projectId: string;
  projectName: string;
  summary: {
    eventCount: number;
    actionCount: number;
    gateMovementCount: number;
    completedActionCount: number;
  };
  events: Array<{
    id: string;
    projectId: string;
    createdAt: string;
    eventType: string;
    action?: { label?: string };
    outcome?: { status?: string; detail?: string };
  }>;
};

const emptyRemediationLedger: MockRemediationLedger = {
  projectId: "project-bakery",
  projectName: "Bakery Operations",
  summary: {
    eventCount: 0,
    actionCount: 0,
    gateMovementCount: 0,
    completedActionCount: 0,
  },
  events: [],
};

let currentRemediationPlan = mockRemediationPlan;
let currentRemediationLedger = emptyRemediationLedger;
let recordedRemediationEvents: Array<{ eventType: string; action?: { label?: string } }> = [];

describe("Crux Studio Ask workflow", () => {
  beforeEach(() => {
    currentRemediationPlan = mockRemediationPlan;
    currentRemediationLedger = emptyRemediationLedger;
    recordedRemediationEvents = [];
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
    vi.stubGlobal(
      "URL",
      Object.assign(URL, {
        createObjectURL: vi.fn(() => "blob:crux-delta-package"),
        revokeObjectURL: vi.fn(),
      }),
    );
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = String(input);

        if (url.endsWith("/api/runs/mock-ask/evidence-tasks/task-current-response-time-baseline/resolve")) {
          return new Response(
            JSON.stringify({
              task: mockResolvedEvidenceTask,
              sourcePack: { ...mockSourcePack, id: "source-pack-evidence-gap", sourceCount: 1 },
              job: mockResolutionJob,
            }),
            {
              status: 201,
              headers: { "Content-Type": "application/json" },
            },
          );
        }

        if (url.endsWith("/api/runs/mock-ask/evidence-tasks")) {
          return new Response(JSON.stringify([mockEvidenceTask]), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          });
        }

        if (url.endsWith("/api/runs/jobs") && init?.method === "POST") {
          return new Response(JSON.stringify(mockQueuedJob), {
            status: 202,
            headers: { "Content-Type": "application/json" },
          });
        }

        if (url.endsWith("/api/runs/jobs/job-mock-ask/cancel")) {
          return new Response(JSON.stringify({ ...mockQueuedJob, status: "cancelled" }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          });
        }

        if (url.endsWith("/api/runs/jobs/job-failed/retry")) {
          return new Response(
            JSON.stringify({ ...mockQueuedJob, jobId: "job-retry", retryOf: "job-failed" }),
            {
              status: 202,
              headers: { "Content-Type": "application/json" },
            },
          );
        }

        if (
          url.endsWith("/api/runs/jobs/job-mock-ask") ||
          url.endsWith("/api/runs/jobs/job-retry") ||
          url.endsWith("/api/runs/jobs/job-gap-resolution")
        ) {
          return new Response(JSON.stringify(mockCompletedJob), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          });
        }

        if (url.endsWith("/api/runs/jobs")) {
          return new Response(JSON.stringify([mockFailedJob]), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          });
        }

        if (url.endsWith("/api/runs/ask")) {
          return new Response(JSON.stringify(mockRun), {
            status: 201,
            headers: { "Content-Type": "application/json" },
          });
        }

        if (url.endsWith("/api/projects") && init?.method === "POST") {
          return new Response(JSON.stringify(mockProject), {
            status: 201,
            headers: { "Content-Type": "application/json" },
          });
        }

        if (url.endsWith("/api/projects/project-bakery/lineage")) {
          return new Response(JSON.stringify(mockLineage), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          });
        }

        if (url.endsWith("/api/projects/project-bakery/decision-record")) {
          return new Response(JSON.stringify(mockDossier), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          });
        }

        if (url.endsWith("/api/projects/project-bakery/acceptance-gate")) {
          return new Response(JSON.stringify(mockAcceptanceGate), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          });
        }

        if (url.endsWith("/api/projects/project-bakery/handoff-review-pack")) {
          return new Response(JSON.stringify(mockHandoffReviewPack), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          });
        }

        if (url.endsWith("/api/projects/project-bakery/export/handoff-review-pack")) {
          return new Response(
            "# Crux Decision Handoff Review Pack\n\n## Handoff Status\n\nReady for handoff.",
            {
              status: 200,
              headers: {
                "Content-Type": "text/markdown; charset=utf-8",
                "Content-Disposition": "attachment; filename=\"bakery-operations-handoff-review-pack.md\"",
              },
            },
          );
        }

        if (url.endsWith("/api/projects/project-bakery/remediation-plan")) {
          return new Response(JSON.stringify(currentRemediationPlan), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          });
        }

        if (url.endsWith("/api/projects/project-bakery/remediation-ledger/events") && init?.method === "POST") {
          const event = JSON.parse(String(init.body));
          recordedRemediationEvents.push(event);
          currentRemediationLedger = {
            ...currentRemediationLedger,
            summary: {
              eventCount: currentRemediationLedger.summary.eventCount + 1,
              actionCount: 1,
              gateMovementCount: currentRemediationLedger.summary.gateMovementCount + (event.eventType === "gate_changed" ? 1 : 0),
              completedActionCount: currentRemediationLedger.summary.completedActionCount + (event.eventType === "action_completed" ? 1 : 0),
            },
            events: [
              {
                id: `ledger-${recordedRemediationEvents.length}`,
                projectId: "project-bakery",
                createdAt: "2026-05-01T10:05:00.000Z",
                eventType: event.eventType,
                action: event.action,
                outcome: event.outcome,
              },
              ...currentRemediationLedger.events,
            ],
          };

          return new Response(JSON.stringify(currentRemediationLedger.events[0]), {
            status: 201,
            headers: { "Content-Type": "application/json" },
          });
        }

        if (url.endsWith("/api/projects/project-bakery/remediation-ledger")) {
          return new Response(JSON.stringify(currentRemediationLedger), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          });
        }

        if (url.endsWith("/api/projects/project-bakery/export/decision-record-dossier")) {
          return new Response(
            "# Crux Decision Record Dossier\n\n## Final Recommendation\n\nUse a staged approach.",
            {
              status: 200,
              headers: {
                "Content-Type": "text/markdown; charset=utf-8",
                "Content-Disposition": "attachment; filename=\"bakery-operations-decision-record-dossier.md\"",
              },
            },
          );
        }

        if (url.endsWith("/api/projects")) {
          return new Response(JSON.stringify([mockProject]), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          });
        }

        if (url.includes("/api/source-packs") && init?.method === "POST") {
          return new Response(JSON.stringify(mockSourcePack), {
            status: 201,
            headers: { "Content-Type": "application/json" },
          });
        }

        if (url.includes("/api/source-packs")) {
          return new Response(JSON.stringify([mockSourcePack]), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          });
        }

        if (url.endsWith("/api/providers")) {
          return new Response(
            JSON.stringify({
              providers: [
                {
                  id: "mock",
                  status: "active",
                  capabilities: ["ask", "inspect", "sources", "review", "compare", "agents", "lifecycle", "evidence-tasks", "lineage", "dossier", "acceptance-gate", "remediation-plan", "remediation-ledger", "handoff-review-pack"],
                },
              ],
            }),
            {
              status: 200,
              headers: { "Content-Type": "application/json" },
            },
          );
        }

        if (url.endsWith("/api/demos")) {
          return new Response(
            JSON.stringify({
              demos: [
                {
                  id: "support-response-time",
                  title: "Support response time",
                  question: "How should a support team reduce first-response time without hiring more agents this month?",
                  context: "No new hiring.",
                  timeHorizon: "30 days",
                  sourcePolicy: "hybrid",
                },
              ],
            }),
            {
              status: 200,
              headers: { "Content-Type": "application/json" },
            },
          );
        }

        if (url.endsWith("/review/claims") || url.endsWith("/review/evidence")) {
          return new Response(JSON.stringify(mockReview), {
            status: 201,
            headers: { "Content-Type": "application/json" },
          });
        }

        if (url.endsWith("/replay")) {
          return new Response(JSON.stringify(replayedRun), {
            status: 201,
            headers: { "Content-Type": "application/json" },
          });
        }

        if (url.endsWith("/api/runs/compare")) {
          return new Response(
            JSON.stringify({
              leftRunId: "mock-ask",
              rightRunId: "mock-replay",
              trustMovement: 0.1,
              differences: [{ path: "trust.status", left: "warn", right: "pass" }],
              delta: {
                verdict: "The newer run is stronger because trust improved and evidence gaps closed.",
                trustMovementLabel: "+10 pts",
                readinessMovement: {
                  from: "usable_with_warnings",
                  to: "ready",
                  changed: true,
                },
                trustMovement: {
                  fromStatus: "warn",
                  toStatus: "pass",
                  fromConfidence: 0.68,
                  toConfidence: 0.78,
                  points: 10,
                  direction: "improved",
                },
                sourceMovement: {
                  sourceCountDelta: 1,
                  sourceChunkDelta: 1,
                  closedGaps: ["Attach source material for the top evidence gap."],
                  newGaps: [],
                  remainingGaps: [],
                },
                blockerMovement: {
                  closedBlockers: ["Offline mock run has no source inventory yet."],
                  newBlockers: [],
                  remainingBlockers: [],
                },
                notableChanges: [
                  "Readiness moved from usable_with_warnings to ready.",
                  "1 evidence gap closed.",
                ],
                nextStep: "Review claims and export the decision package.",
              },
              summary: { differenceCount: 1, leftTrust: "warn", rightTrust: "pass" },
            }),
            {
              status: 200,
              headers: { "Content-Type": "application/json" },
            },
          );
        }

        if (url.endsWith("/api/runs/compare/export/decision-delta-package")) {
          return new Response(
            "# Crux Decision Delta Package\n\n## Verdict\n\nThe newer run is stronger.",
            {
              status: 200,
              headers: {
                "Content-Type": "text/markdown; charset=utf-8",
                "Content-Disposition": "attachment; filename=\"mock-replay-decision-delta-package.md\"",
              },
            },
          );
        }

        if (url.endsWith("/api/runs/mock-ask")) {
          return new Response(JSON.stringify(mockBundle), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          });
        }

        if (url.endsWith("/api/runs/mock-replay")) {
          return new Response(JSON.stringify(replayedBundle), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          });
        }

        if (url.endsWith("/api/runs")) {
          return new Response(JSON.stringify([mockRun]), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          });
        }

        return new Response(JSON.stringify({ message: "Not found" }), {
          status: 404,
          headers: { "Content-Type": "application/json" },
        });
      }),
    );
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("submits an arbitrary question and renders memo, trust state, and paths", async () => {
    render(<App />);

    fireEvent.change(screen.getByLabelText("Question"), {
      target: { value: "How should a support team reduce first-response time?" },
    });
    fireEvent.change(screen.getByLabelText("Context"), {
      target: { value: "No new hiring this month." },
    });
    fireEvent.click(screen.getByRole("button", { name: "Run Crux" }));

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        "/api/runs/jobs",
        expect.objectContaining({ method: "POST" }),
      );
    });

    expect((await screen.findAllByText("Completed")).length).toBeGreaterThan(0);
    expect(screen.getByText("Run lifecycle")).toBeInTheDocument();
    expect(screen.getByText(/server restart before completion/)).toBeInTheDocument();
    expect(screen.getAllByText("Retry run").length).toBeGreaterThan(0);
    expect((await screen.findAllByText("Trust gate")).length).toBeGreaterThan(0);
    expect(screen.getAllByText("Usable with warnings").length).toBeGreaterThan(0);
    expect(screen.getAllByText("warn").length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Use a staged approach/).length).toBeGreaterThan(0);
    expect(screen.getAllByText("Evidence gap closure").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Current response-time baseline").length).toBeGreaterThan(0);
    fireEvent.change(screen.getByLabelText("Source content"), {
      target: { value: "# Baseline\n\nMedian first-response time was 64 minutes last week." },
    });
    fireEvent.click(screen.getAllByRole("button", { name: "Resolve with source note" })[0]);
    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        "/api/runs/mock-ask/evidence-tasks/task-current-response-time-baseline/resolve",
        expect.objectContaining({ method: "POST" }),
      );
    });
    expect(screen.getByText("runs/mock-ask/decision_memo.md")).toBeInTheDocument();
    expect(screen.getAllByText(/Offline mock run/).length).toBeGreaterThan(0);
  });

  it("preloads the latest run so returning users land on a useful workbench", async () => {
    render(<App />);

    expect(await screen.findByRole("heading", { name: "Decision brief" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Brief" })).toBeInTheDocument();
    expect(screen.getByText("Answer first")).toBeInTheDocument();
    expect(screen.getAllByText(/Use a staged approach/).length).toBeGreaterThan(0);
    expect(await screen.findByRole("heading", { name: "Decision record" })).toBeInTheDocument();
    expect(await screen.findByRole("heading", { name: "Acceptance gate" })).toBeInTheDocument();
    expect(screen.getByText("Ready to share")).toBeInTheDocument();
    expect(screen.getByText("Export dossier and share with the decision owner.")).toBeInTheDocument();
    expect(screen.getAllByText("Human review").length).toBeGreaterThan(0);
    expect(await screen.findByRole("heading", { name: "Remediation plan" })).toBeInTheDocument();
    expect(screen.getByText("Acceptance work is complete.")).toBeInTheDocument();
    expect(screen.getByText("Export accepted dossier")).toBeInTheDocument();
    expect(await screen.findByRole("heading", { name: "Decision handoff review" })).toBeInTheDocument();
    expect(screen.getByText("Ready for handoff")).toBeInTheDocument();
    expect(screen.getByText("Export handoff pack and decision record.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Export handoff pack" })).toHaveAttribute(
      "href",
      "/api/projects/project-bakery/export/handoff-review-pack",
    );
    expect(screen.getByText("Decision Record Dossier")).toBeInTheDocument();
    expect(screen.getByText("Final recommendation")).toBeInTheDocument();
    expect(screen.getByText(/Approved claims: claim-1/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Export dossier" })).toHaveAttribute(
      "href",
      "/api/projects/project-bakery/export/decision-record-dossier",
    );
    expect(await screen.findByRole("heading", { name: "Decision lineage" })).toBeInTheDocument();
    expect(screen.getByText("Decision delta ready")).toBeInTheDocument();
    expect(screen.getAllByText("Review claims and export the decision package.").length).toBeGreaterThan(0);
    expect(screen.getByText("mock-ask to mock-replay")).toBeInTheDocument();
    expect(screen.getByText("Review readiness")).toBeInTheDocument();
    fireEvent.click(screen.getByText("Open full memo"));
    expect(screen.getByRole("tab", { name: "Memo" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("heading", { name: "Recommendation" })).toBeInTheDocument();
    expect(screen.getByText("runs/mock-ask/decision_memo.md")).toBeInTheDocument();
    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith("/api/runs/mock-ask");
    });
  });

  it("guides evidence remediation into source intake and shows gate movement", async () => {
    currentRemediationPlan = mockActionRequiredRemediationPlan;
    render(<App />);

    expect(await screen.findByRole("heading", { name: "Remediation plan" })).toBeInTheDocument();

    fireEvent.click(await screen.findByRole("button", { name: "Close missing evidence: Close evidence gap" }));
    expect(await screen.findByRole("heading", { name: "Guided remediation" })).toBeInTheDocument();
    expect(screen.getAllByText("Close missing evidence").length).toBeGreaterThan(0);
    expect(screen.getByText("Watching gate: no gate change yet.")).toBeInTheDocument();
    expect(await screen.findByRole("heading", { name: "Remediation evidence ledger" })).toBeInTheDocument();
    await waitFor(() => {
      expect(recordedRemediationEvents.some((event) => event.eventType === "action_started")).toBe(true);
    });
    expect(recordedRemediationEvents.some((event) => event.eventType === "workflow_triggered")).toBe(true);
    expect(screen.getByLabelText("New source pack")).toHaveValue("Evidence for Close missing evidence");
    expect((screen.getByLabelText("Source content") as HTMLTextAreaElement).value).toContain(
      "Current response-time baseline",
    );

    currentRemediationPlan = mockRemediationPlan;
    fireEvent.click(screen.getByRole("button", { name: "Create source pack" }));
    await waitFor(() => {
      expect(screen.getByText("Gate changed after this action.")).toBeInTheDocument();
    });
    await waitFor(() => {
      expect(recordedRemediationEvents.some((event) => event.eventType === "gate_changed")).toBe(true);
    });

    fireEvent.click(screen.getByRole("button", { name: "Mark guided remediation complete" }));
    await waitFor(() => {
      expect(recordedRemediationEvents.some((event) => event.eventType === "action_completed")).toBe(true);
    });
    expect(screen.queryByRole("heading", { name: "Guided remediation" })).not.toBeInTheDocument();
  });

  it("guides review, replay, and comparison remediation actions", async () => {
    currentRemediationPlan = mockActionRequiredRemediationPlan;
    render(<App />);

    expect(await screen.findByRole("heading", { name: "Remediation plan" })).toBeInTheDocument();

    fireEvent.click(await screen.findByRole("button", { name: "Review key claims: Review claims" }));
    expect(screen.getByRole("tab", { name: "Claims" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getAllByText("Review key claims").length).toBeGreaterThan(0);

    fireEvent.click(screen.getByRole("button", { name: "Replay run" }));
    expect((await screen.findAllByText("mock-replay")).length).toBeGreaterThan(0);

    fireEvent.click(await screen.findByRole("button", { name: "Compare rerun movement: Compare rerun" }));
    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        "/api/runs/compare",
        expect.objectContaining({ method: "POST" }),
      );
    });
    expect(await screen.findByText("Decision delta")).toBeInTheDocument();
    expect(screen.getAllByText("Compare rerun movement").length).toBeGreaterThan(0);
  });

  it("loads run history and lets the user inspect claims, evidence, diagnostics, and trace", async () => {
    render(<App />);

    expect((await screen.findAllByText("mock-ask")).length).toBeGreaterThan(0);

    fireEvent.click(screen.getAllByText("mock-ask")[0]);
    expect(await screen.findByRole("tab", { name: "Claims" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("tab", { name: "Claims" }));
    expect(screen.getByText(/Queue triage should happen/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("tab", { name: "Evidence" }));
    expect(screen.getByText(/first-response gains/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("tab", { name: "Sources" }));
    expect(screen.getByText("Source workspace")).toBeInTheDocument();
    expect(screen.getAllByText("Current response-time baseline").length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Wholesale intake notes/).length).toBeGreaterThan(0);

    fireEvent.click(screen.getByRole("tab", { name: "Diagnostics" }));
    expect(screen.getAllByText(/Attach source material/).length).toBeGreaterThan(0);

    fireEvent.click(screen.getByRole("tab", { name: "Agents" }));
    expect(screen.getByText("Research Scout")).toBeInTheDocument();
    expect(screen.getByText("Evidence Auditor")).toBeInTheDocument();
    expect(screen.getByText(/No source material is attached/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("tab", { name: "Trace" }));
    expect(screen.getByText("mock-provider.ask")).toBeInTheDocument();

    expect(screen.getByRole("link", { name: "Export memo" })).toHaveAttribute(
      "href",
      "/api/runs/mock-ask/export/memo",
    );
    expect(screen.getByRole("link", { name: "Decision package" })).toHaveAttribute(
      "href",
      "/api/runs/mock-ask/export/decision-package",
    );
  });

  it("exposes project, source, review, replay, compare, and provider controls", async () => {
    render(<App />);

    expect(await screen.findByText("Provider: mock")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Support response time" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Support response time" }));
    expect(screen.getByLabelText("Question")).toHaveValue(
      "How should a support team reduce first-response time without hiring more agents this month?",
    );
    expect(screen.getByText("Bounded agents")).toBeInTheDocument();
    expect(screen.getByText("6 agents")).toBeInTheDocument();
    expect(screen.getAllByText("Sources").length).toBeGreaterThan(0);
    expect(screen.getByRole("combobox", { name: "Project" })).toHaveDisplayValue(
      "Bakery Operations",
    );
    expect(screen.getByText("harness engine ready")).toBeInTheDocument();
    expect(screen.getAllByText("Wholesale intake notes").length).toBeGreaterThan(0);

    const sourceFiles = [
      new File(["# Queue notes\n\nMonday handoffs delay first response."], "queue-notes.md", {
        type: "text/markdown",
      }),
      new File(["week,first_response_minutes\n1,82\n2,71\n"], "response-times.csv", {
        type: "text/csv",
      }),
    ];
    fireEvent.change(screen.getByLabelText("Attach source files"), {
      target: { files: sourceFiles },
    });
    expect(await screen.findByText("queue-notes.md")).toBeInTheDocument();
    expect(screen.getByText("response-times.csv")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Create source pack" }));
    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        "/api/source-packs",
        expect.objectContaining({ method: "POST" }),
      );
    });
    const sourcePackCall = vi.mocked(fetch).mock.calls.find(([url, init]) => {
      return String(url).endsWith("/api/source-packs") && init?.method === "POST";
    });
    expect(JSON.parse(String(sourcePackCall?.[1]?.body))).toEqual(
      expect.objectContaining({
        files: [
          {
            name: "queue-notes.md",
            content: "# Queue notes\n\nMonday handoffs delay first response.",
          },
          {
            name: "response-times.csv",
            content: "week,first_response_minutes\n1,82\n2,71\n",
          },
        ],
      }),
    );

    fireEvent.click(screen.getAllByText("mock-ask")[0]);
    fireEvent.click(await screen.findByRole("tab", { name: "Claims" }));
    fireEvent.click(screen.getByRole("button", { name: "Approve claim-1" }));
    expect((await screen.findAllByText(/Approved claims: claim-1/)).length).toBeGreaterThan(
      0,
    );

    fireEvent.click(screen.getByRole("tab", { name: "Evidence" }));
    fireEvent.click(screen.getByRole("button", { name: "Annotate evidence-1" }));
    expect((await screen.findAllByText(/Evidence notes: evidence-1/)).length).toBeGreaterThan(
      0,
    );

    fireEvent.click(screen.getByRole("button", { name: "Replay run" }));
    expect((await screen.findAllByText("mock-replay")).length).toBeGreaterThan(0);

    fireEvent.click(screen.getByRole("button", { name: "Compare latest" }));
    expect(await screen.findByText("Decision delta")).toBeInTheDocument();
    expect(screen.getAllByText(/newer run is stronger/).length).toBeGreaterThan(0);
    expect(screen.getAllByText("+10 pts").length).toBeGreaterThan(0);
    expect(screen.getByText("1 closed")).toBeInTheDocument();
    expect(screen.getByText("Changed artifact paths")).toBeInTheDocument();
    expect(screen.getAllByText("Review claims and export the decision package.").length).toBeGreaterThan(0);
    fireEvent.click(screen.getByRole("button", { name: "Export delta package" }));
    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        "/api/runs/compare/export/decision-delta-package",
        expect.objectContaining({ method: "POST" }),
      );
    });
    expect(URL.createObjectURL).toHaveBeenCalled();

    expect(
      screen.getAllByRole("link", { name: "Export reviewed memo" })[0],
    ).toHaveAttribute("href", "/api/runs/mock-replay/export/reviewed-memo");
  });
});
