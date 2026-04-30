import "@testing-library/jest-dom/vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
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

describe("Crux Studio Ask workflow", () => {
  beforeEach(() => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL) => {
        if (String(input).endsWith("/api/runs/ask")) {
          return new Response(JSON.stringify(mockRun), {
            status: 201,
            headers: { "Content-Type": "application/json" },
          });
        }

        return new Response(JSON.stringify([]), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }),
    );
  });

  afterEach(() => {
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
    expect(screen.getByText("warn")).toBeInTheDocument();
    expect(screen.getByText(/Use a staged approach/)).toBeInTheDocument();
    expect(screen.getByText("runs/mock-ask/decision_memo.md")).toBeInTheDocument();
    expect(screen.getByText(/Offline mock run/)).toBeInTheDocument();
  });
});

