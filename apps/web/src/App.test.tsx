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
  trust: {
    status: "warn",
    confidence: 0.68,
    blockingIssues: ["Offline mock run has no source inventory yet."],
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
    diagnostics: {
      blockingIssues: ["Offline mock run has no source inventory yet."],
      nextFixes: ["Attach source material and rerun."],
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
                  capabilities: ["ask", "inspect", "sources", "review", "compare"],
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
    expect(screen.getAllByText("warn").length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Use a staged approach/).length).toBeGreaterThan(0);
    expect(screen.getByText("runs/mock-ask/decision_memo.md")).toBeInTheDocument();
    expect(screen.getByText(/Offline mock run/)).toBeInTheDocument();
  });

  it("loads run history and lets the user inspect claims, evidence, diagnostics, and trace", async () => {
    render(<App />);

    expect(await screen.findByText("mock-ask")).toBeInTheDocument();

    fireEvent.click(screen.getByText("mock-ask"));
    expect(await screen.findByRole("tab", { name: "Claims" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("tab", { name: "Claims" }));
    expect(screen.getByText(/Queue triage should happen/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("tab", { name: "Evidence" }));
    expect(screen.getByText(/first-response gains/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("tab", { name: "Diagnostics" }));
    expect(screen.getByText(/Attach source material/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("tab", { name: "Trace" }));
    expect(screen.getByText("mock-provider.ask")).toBeInTheDocument();

    expect(screen.getByRole("link", { name: "Export memo" })).toHaveAttribute(
      "href",
      "/api/runs/mock-ask/export/memo",
    );
  });

  it("exposes project, source, review, replay, compare, and provider controls", async () => {
    render(<App />);

    expect(await screen.findByText("Provider: mock")).toBeInTheDocument();
    expect(screen.getByText("Bakery Operations")).toBeInTheDocument();
    expect(screen.getAllByText("Wholesale intake notes").length).toBeGreaterThan(0);

    fireEvent.click(screen.getByRole("button", { name: "Create source pack" }));
    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        "/api/source-packs",
        expect.objectContaining({ method: "POST" }),
      );
    });

    fireEvent.click(screen.getByText("mock-ask"));
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
