import { describe, expect, it } from "vitest";
import { MockCruxProvider } from "./mock";
import type { CruxProvider } from "./types";

describe("MockCruxProvider contract", () => {
  it("creates an inspectable Ask-to-Memo run and stores it for lookup", async () => {
    const provider: CruxProvider = new MockCruxProvider({
      now: () => "2026-05-01T10:00:00.000Z",
    });

    const run = await provider.ask({
      question: "How should support reduce first-response time this month?",
      context: "No additional hiring is available this month.",
      timeHorizon: "30 days",
      sourcePolicy: "offline",
    });

    expect(run.runId).toMatch(/^mock-/);
    expect(run.question).toBe(
      "How should support reduce first-response time this month?",
    );
    expect(run.trust.status).toBe("warn");
    expect(run.trust.blockingIssues).toContain(
      "Offline mock run has no source inventory yet.",
    );
    expect(run.agents).toEqual(
      expect.objectContaining({
        status: "warn",
        agentCount: 6,
        warningCount: 2,
      }),
    );
    expect(run.paths.decisionMemo).toContain(`${run.runId}/decision_memo.md`);
    expect(run.memoPreview).toContain("Recommendation");

    await expect(provider.listRuns()).resolves.toHaveLength(1);

    const bundle = await provider.getRun(run.runId);
    expect(bundle.artifacts.agents).toEqual(
      expect.objectContaining({
        synthesis: expect.objectContaining({ status: "warn" }),
        findings: expect.arrayContaining([
          expect.objectContaining({ agent_id: "research_scout" }),
          expect.objectContaining({ agent_id: "council_moderator" }),
        ]),
      }),
    );
    expect(bundle.artifacts.claims).toEqual(
      expect.objectContaining({
        claims: expect.arrayContaining([
          expect.objectContaining({ text: expect.stringContaining("support") }),
        ]),
      }),
    );
    expect(bundle.artifacts.trace).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ stage: "mock-provider.ask" }),
      ]),
    );
  });

  it("strengthens a mock run when source-pack context is supplied", async () => {
    const provider: CruxProvider = new MockCruxProvider({
      now: () => "2026-05-01T10:00:00.000Z",
    });

    const run = await provider.ask({
      question: "Should a bakery automate wholesale order intake?",
      sourcePolicy: "hybrid",
      sourcePack: {
        id: "source-pack-1",
        name: "Wholesale order evidence",
        sourceCount: 2,
        files: [
          {
            name: "queue-notes.md",
            content: "Wholesale email orders create preventable intake errors.",
            contentHash: "hash-1",
            size: 58,
          },
        ],
      },
    });

    expect(run.trust.status).toBe("pass");
    const bundle = await provider.getRun(run.runId);
    expect(bundle.artifacts.queryIntake).toEqual(
      expect.objectContaining({
        sourcePack: expect.objectContaining({
          files: expect.arrayContaining([
            expect.objectContaining({
              name: "queue-notes.md",
              content: expect.stringContaining("preventable intake errors"),
            }),
          ]),
        }),
      }),
    );
    expect(bundle.artifacts.evidence).toEqual(
      expect.objectContaining({
        evidence: expect.arrayContaining([
          expect.objectContaining({
            sourceType: "source_pack",
            summary: expect.stringContaining("queue-notes.md"),
          }),
        ]),
      }),
    );
  });
});
