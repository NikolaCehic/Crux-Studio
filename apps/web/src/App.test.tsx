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

describe("Crux Studio Ask workflow", () => {
  beforeEach(() => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = String(input);

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
                  capabilities: ["ask", "inspect", "sources", "review", "compare", "agents"],
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
              summary: { differenceCount: 1, leftTrust: "warn", rightTrust: "pass" },
            }),
            {
              status: 200,
              headers: { "Content-Type": "application/json" },
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
        "/api/runs/ask",
        expect.objectContaining({ method: "POST" }),
      );
    });

    expect(await screen.findByText("Trust gate")).toBeInTheDocument();
    expect(screen.getByText("Usable with warnings")).toBeInTheDocument();
    expect(screen.getAllByText("warn").length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Use a staged approach/).length).toBeGreaterThan(0);
    expect(screen.getByText("runs/mock-ask/decision_memo.md")).toBeInTheDocument();
    expect(screen.getByText(/Offline mock run/)).toBeInTheDocument();
  });

  it("preloads the latest run so returning users land on a useful workbench", async () => {
    render(<App />);

    expect(await screen.findByText("Decision memo")).toBeInTheDocument();
    expect(screen.getByText("runs/mock-ask/decision_memo.md")).toBeInTheDocument();
    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith("/api/runs/mock-ask");
    });
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

    fireEvent.click(screen.getByRole("button", { name: "Create source pack" }));
    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        "/api/source-packs",
        expect.objectContaining({ method: "POST" }),
      );
    });

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
    expect(await screen.findByText(/Trust movement: 10%/)).toBeInTheDocument();

    expect(
      screen.getAllByRole("link", { name: "Export reviewed memo" })[0],
    ).toHaveAttribute("href", "/api/runs/mock-replay/export/reviewed-memo");
  });
});
