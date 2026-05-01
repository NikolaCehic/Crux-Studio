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

describe("Crux Studio Ask workflow", () => {
  beforeEach(() => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input);

        if (url.endsWith("/api/runs/ask")) {
          return new Response(JSON.stringify(mockRun), {
            status: 201,
            headers: { "Content-Type": "application/json" },
          });
        }

        if (url.endsWith("/api/runs/mock-ask")) {
          return new Response(JSON.stringify(mockBundle), {
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
});
