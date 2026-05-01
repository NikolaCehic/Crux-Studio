import { MockCruxProvider } from "@crux-studio/crux-provider";
import { afterEach, describe, expect, it } from "vitest";
import { buildServer } from "./app";
import { createMemoryStudioStore } from "./studio-store";

const apps: Array<ReturnType<typeof buildServer>> = [];

afterEach(async () => {
  await Promise.all(apps.map((app) => app.close()));
  apps.length = 0;
});

describe("Studio product workflow API", () => {
  it("supports projects, source packs, source-backed reruns, review, replay, compare, and provider registry", async () => {
    const provider = new MockCruxProvider({
      now: () => "2026-05-01T12:00:00.000Z",
    });
    const store = createMemoryStudioStore({
      now: () => "2026-05-01T12:00:00.000Z",
    });
    const app = buildServer({ provider, store });
    apps.push(app);

    const projectResponse = await app.inject({
      method: "POST",
      url: "/api/projects",
      payload: { name: "Bakery Operations" },
    });
    expect(projectResponse.statusCode).toBe(201);
    const project = projectResponse.json();
    expect(project.name).toBe("Bakery Operations");

    const sourceResponse = await app.inject({
      method: "POST",
      url: "/api/source-packs",
      payload: {
        projectId: project.id,
        name: "Wholesale order intake pack",
        files: [
          {
            name: "queue-notes.md",
            content:
              "# Queue notes\n\nWholesale email orders create preventable intake errors.",
          },
          {
            name: "response-times.csv",
            content: "week,first_response_minutes\n1,88\n2,74\n",
          },
        ],
      },
    });
    expect(sourceResponse.statusCode).toBe(201);
    const sourcePack = sourceResponse.json();
    expect(sourcePack.sourceCount).toBe(2);

    const createdRunResponse = await app.inject({
      method: "POST",
      url: "/api/runs/ask",
      payload: {
        projectId: project.id,
        sourcePackId: sourcePack.id,
        question: "Should the bakery automate wholesale order intake this quarter?",
        context: "Two coordinators and no new headcount.",
        sourcePolicy: "hybrid",
      },
    });
    expect(createdRunResponse.statusCode).toBe(201);
    const run = createdRunResponse.json();
    expect(run.trust.status).toBe("pass");
    expect(run.projectId).toBe(project.id);
    expect(run.sourcePackId).toBe(sourcePack.id);

    const bundleResponse = await app.inject({
      method: "GET",
      url: `/api/runs/${run.runId}`,
    });
    expect(bundleResponse.statusCode).toBe(200);
    const bundle = bundleResponse.json();
    expect(bundle.artifacts.queryIntake.sourcePack.files).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: "queue-notes.md",
          content: expect.stringContaining("preventable intake errors"),
        }),
      ]),
    );
    expect(bundle.artifacts.evidence.evidence[0].sourceType).toBe("source_pack");

    const reviewResponse = await app.inject({
      method: "POST",
      url: `/api/runs/${run.runId}/review/claims`,
      payload: {
        claimId: "claim-1",
        status: "approved",
        reviewer: "Nikola",
        rationale: "Supported by the uploaded source pack.",
      },
    });
    expect(reviewResponse.statusCode).toBe(201);
    expect(reviewResponse.json().summary.approvedClaims).toEqual(["claim-1"]);

    const annotationResponse = await app.inject({
      method: "POST",
      url: `/api/runs/${run.runId}/review/evidence`,
      payload: {
        evidenceId: "evidence-1",
        reviewer: "Nikola",
        note: "Needs a real operational owner before rollout.",
      },
    });
    expect(annotationResponse.statusCode).toBe(201);
    expect(annotationResponse.json().summary.evidenceAnnotations).toEqual([
      { evidenceId: "evidence-1", noteCount: 1 },
    ]);

    const reviewedMemo = await app.inject({
      method: "GET",
      url: `/api/runs/${run.runId}/export/reviewed-memo`,
    });
    expect(reviewedMemo.statusCode).toBe(200);
    expect(reviewedMemo.body).toContain("Human Review Summary");
    expect(reviewedMemo.body).toContain("claim-1");

    const replayResponse = await app.inject({
      method: "POST",
      url: `/api/runs/${run.runId}/replay`,
    });
    expect(replayResponse.statusCode).toBe(201);
    const replayed = replayResponse.json();
    expect(replayed.runId).not.toBe(run.runId);

    const compareResponse = await app.inject({
      method: "POST",
      url: "/api/runs/compare",
      payload: { leftRunId: run.runId, rightRunId: replayed.runId },
    });
    expect(compareResponse.statusCode).toBe(200);
    expect(compareResponse.json()).toEqual(
      expect.objectContaining({
        leftRunId: run.runId,
        rightRunId: replayed.runId,
        trustMovement: expect.any(Number),
      }),
    );

    const projectRuns = await app.inject({
      method: "GET",
      url: `/api/projects/${project.id}/runs`,
    });
    expect(projectRuns.statusCode).toBe(200);
    expect(projectRuns.json().map((item: { runId: string }) => item.runId)).toContain(
      run.runId,
    );

    const providers = await app.inject({ method: "GET", url: "/api/providers" });
    expect(providers.statusCode).toBe(200);
    expect(providers.json().providers).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: "mock",
          status: "active",
          capabilities: expect.arrayContaining(["ask", "inspect", "review", "compare"]),
        }),
      ]),
    );
  });
});
