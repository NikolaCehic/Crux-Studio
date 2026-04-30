import { MockCruxProvider } from "@crux-studio/crux-provider";
import { afterEach, describe, expect, it } from "vitest";
import { buildServer } from "./app";

const apps: Array<ReturnType<typeof buildServer>> = [];

afterEach(async () => {
  await Promise.all(apps.map((app) => app.close()));
  apps.length = 0;
});

describe("Studio run API", () => {
  it("creates, lists, and fetches Crux runs through the provider boundary", async () => {
    const provider = new MockCruxProvider({
      now: () => "2026-05-01T10:00:00.000Z",
    });
    const app = buildServer({ provider });
    apps.push(app);

    const created = await app.inject({
      method: "POST",
      url: "/api/runs/ask",
      payload: {
        question: "Should we automate invoice triage?",
        context: "Finance has two analysts and a backlog.",
        timeHorizon: "45 days",
        sourcePolicy: "offline",
      },
    });

    expect(created.statusCode).toBe(201);
    const run = created.json();
    expect(run.scope).toBe("general-analysis");
    expect(run.trust.status).toBe("warn");
    expect(run.memoPreview).toContain("Recommendation");

    const listed = await app.inject({ method: "GET", url: "/api/runs" });
    expect(listed.statusCode).toBe(200);
    expect(listed.json()).toEqual([expect.objectContaining({ runId: run.runId })]);

    const fetched = await app.inject({
      method: "GET",
      url: `/api/runs/${run.runId}`,
    });
    expect(fetched.statusCode).toBe(200);
    expect(fetched.json()).toEqual(
      expect.objectContaining({
        runId: run.runId,
        artifacts: expect.objectContaining({
          claims: expect.any(Object),
          trace: expect.any(Array),
        }),
      }),
    );
  });

  it("rejects empty questions before reaching the provider", async () => {
    const provider = new MockCruxProvider();
    const app = buildServer({ provider });
    apps.push(app);

    const response = await app.inject({
      method: "POST",
      url: "/api/runs/ask",
      payload: { question: "   " },
    });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toEqual(
      expect.objectContaining({ message: "Question is required." }),
    );
    await expect(provider.listRuns()).resolves.toHaveLength(0);
  });
});

