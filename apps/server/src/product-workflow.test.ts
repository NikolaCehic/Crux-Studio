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

    const demos = await app.inject({ method: "GET", url: "/api/demos" });
    expect(demos.statusCode).toBe(200);
    expect(demos.json().demos).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: "support-response-time",
          question: expect.stringContaining("first-response time"),
        }),
      ]),
    );

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
    expect(run.readiness.status).toBe("ready");
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
    expect(bundle.sourceWorkspace.sourceCount).toBe(2);
    expect(bundle.artifacts.sourceInventory.sources).toHaveLength(2);
    expect(bundle.artifacts.sourceChunks.chunks).toHaveLength(2);

    const sourceInventory = await app.inject({
      method: "GET",
      url: `/api/runs/${run.runId}/artifacts/source-inventory`,
    });
    expect(sourceInventory.statusCode).toBe(200);
    expect(sourceInventory.json().sources).toHaveLength(2);

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

    const decisionPackage = await app.inject({
      method: "GET",
      url: `/api/runs/${run.runId}/export/decision-package`,
    });
    expect(decisionPackage.statusCode).toBe(200);
    expect(decisionPackage.body).toContain("Crux Decision Package");
    expect(decisionPackage.body).toContain("Readiness: Ready for review");
    expect(decisionPackage.body).toContain("Agents: pass");

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
        delta: expect.objectContaining({
          verdict: expect.stringContaining("newer run"),
          readinessMovement: expect.objectContaining({
            from: "ready",
            to: "ready",
            changed: false,
          }),
          trustMovement: expect.objectContaining({
            direction: "unchanged",
            fromStatus: "pass",
            toStatus: "pass",
          }),
          nextStep: expect.any(String),
        }),
        summary: expect.objectContaining({
          leftReadiness: "ready",
          rightReadiness: "ready",
        }),
      }),
    );
    expect(compareResponse.json().differences.map((difference: { path: string }) => difference.path)).toEqual(
      expect.arrayContaining(["runId"]),
    );

    const deltaPackageResponse = await app.inject({
      method: "POST",
      url: "/api/runs/compare/export/decision-delta-package",
      payload: { leftRunId: run.runId, rightRunId: replayed.runId },
    });
    expect(deltaPackageResponse.statusCode).toBe(200);
    expect(deltaPackageResponse.headers["content-type"]).toContain("text/markdown");
    expect(deltaPackageResponse.headers["content-disposition"]).toContain("decision-delta-package");
    expect(deltaPackageResponse.body).toContain("# Crux Decision Delta Package");
    expect(deltaPackageResponse.body).toContain("## Verdict");
    expect(deltaPackageResponse.body).toContain("## Human Review Summary");
    expect(deltaPackageResponse.body).toContain("Left run approved claims: claim-1");
    expect(deltaPackageResponse.body).toContain("Right run approved claims: none");
    expect(deltaPackageResponse.body).toContain("## Changed Artifact Paths");
    expect(deltaPackageResponse.body).toContain("## Newer Run Decision Memo");
    expect(deltaPackageResponse.body).toContain(replayed.runId);

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
          capabilities: expect.arrayContaining(["ask", "inspect", "review", "compare", "demos", "readiness"]),
        }),
      ]),
    );
    expect(providers.json().providers[0].capabilities).toContain("agents");
  });

  it("turns evidence gaps into source tasks that can be resolved, rerun, and compared", async () => {
    const provider = new MockCruxProvider({
      now: () => "2026-05-01T13:00:00.000Z",
    });
    const store = createMemoryStudioStore({
      now: () => "2026-05-01T13:00:00.000Z",
    });
    const app = buildServer({ provider, store });
    apps.push(app);

    const projectResponse = await app.inject({
      method: "POST",
      url: "/api/projects",
      payload: { name: "Support Ops" },
    });
    const project = projectResponse.json();

    const draftRunResponse = await app.inject({
      method: "POST",
      url: "/api/runs/ask",
      payload: {
        projectId: project.id,
        question: "How should support reduce first-response time this month?",
        context: "No new hiring.",
        sourcePolicy: "offline",
      },
    });
    expect(draftRunResponse.statusCode).toBe(201);
    const draftRun = draftRunResponse.json();
    expect(draftRun.readiness.status).toBe("usable_with_warnings");

    const taskResponse = await app.inject({
      method: "GET",
      url: `/api/runs/${draftRun.runId}/evidence-tasks`,
    });
    expect(taskResponse.statusCode).toBe(200);
    expect(taskResponse.json()).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          runId: draftRun.runId,
          status: "open",
          title: expect.stringContaining("Attach source material"),
        }),
      ]),
    );
    const task = taskResponse.json()[0];

    const resolutionResponse = await app.inject({
      method: "POST",
      url: `/api/runs/${draftRun.runId}/evidence-tasks/${task.taskId}/resolve`,
      payload: {
        sourcePackName: "Support baseline evidence",
        sourceName: "baseline.md",
        sourceContent: "# Baseline\n\nMedian first-response time was 64 minutes last week. Monday handoffs created the largest delay.",
        note: "Baseline added from support operations notes.",
      },
    });
    expect(resolutionResponse.statusCode).toBe(201);
    expect(resolutionResponse.json()).toEqual(
      expect.objectContaining({
        task: expect.objectContaining({ status: "resolved", resolvedBySourcePackId: expect.any(String) }),
        sourcePack: expect.objectContaining({ sourceCount: 1 }),
        job: expect.objectContaining({
          status: "queued",
          input: expect.objectContaining({
            projectId: project.id,
            sourcePolicy: "hybrid",
          }),
        }),
      }),
    );

    const job = resolutionResponse.json().job;
    const completedJob = await waitForJob(app, job.jobId, "succeeded");
    expect(completedJob.run.sourceWorkspace.sourceCount).toBe(1);
    expect(completedJob.run.readiness.status).toBe("ready");

    const resolvedTasks = await app.inject({
      method: "GET",
      url: `/api/runs/${draftRun.runId}/evidence-tasks`,
    });
    expect(resolvedTasks.json()).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          taskId: task.taskId,
          status: "resolved",
          rerunJobId: job.jobId,
        }),
      ]),
    );

    const compareResponse = await app.inject({
      method: "POST",
      url: "/api/runs/compare",
      payload: { leftRunId: draftRun.runId, rightRunId: completedJob.run.runId },
    });
    expect(compareResponse.statusCode).toBe(200);
    expect(compareResponse.json().summary).toEqual(
      expect.objectContaining({
        leftReadiness: "usable_with_warnings",
        rightReadiness: "ready",
      }),
    );
    expect(compareResponse.json().trustMovement).toBeGreaterThan(0);
    expect(compareResponse.json().delta).toEqual(
      expect.objectContaining({
        verdict: expect.stringContaining("newer run"),
        readinessMovement: expect.objectContaining({
          from: "usable_with_warnings",
          to: "ready",
          changed: true,
        }),
        trustMovement: expect.objectContaining({
          direction: "improved",
          fromStatus: "warn",
          toStatus: "pass",
        }),
        sourceMovement: expect.objectContaining({
          sourceCountDelta: 1,
          sourceChunkDelta: 1,
          closedGaps: expect.arrayContaining([
            "Attach source material for the top evidence gap.",
          ]),
          remainingGaps: [],
        }),
        blockerMovement: expect.objectContaining({
          closedBlockers: expect.arrayContaining([
            "Offline mock run has no source inventory yet.",
            "Research Scout: No source material is attached to the run.",
          ]),
          remainingBlockers: [],
        }),
        nextStep: "Review claims and export the decision package.",
      }),
    );
    expect(compareResponse.json().delta.notableChanges).toEqual(
      expect.arrayContaining([
        expect.stringContaining("Readiness moved from usable_with_warnings to ready."),
        expect.stringMatching(/\d+ evidence gaps? closed\./),
      ]),
    );

    const deltaPackageResponse = await app.inject({
      method: "POST",
      url: "/api/runs/compare/export/decision-delta-package",
      payload: { leftRunId: draftRun.runId, rightRunId: completedJob.run.runId },
    });
    expect(deltaPackageResponse.statusCode).toBe(200);
    expect(deltaPackageResponse.body).toContain("## Closed Evidence Gaps");
    expect(deltaPackageResponse.body).toContain(task.title);
    expect(deltaPackageResponse.body).toContain("## Next Step");

    const lineageResponse = await app.inject({
      method: "GET",
      url: `/api/projects/${project.id}/lineage`,
    });
    expect(lineageResponse.statusCode).toBe(200);
    const lineage = lineageResponse.json();
    expect(lineage.summary).toEqual(
      expect.objectContaining({
        runCount: 2,
        sourcePackCount: 1,
        evidenceTaskCount: 4,
        resolvedTaskCount: 1,
        openTaskCount: 3,
        deltaCount: 1,
        latestRunId: completedJob.run.runId,
        latestReadiness: "ready",
        nextStep: "Review claims and export the decision package.",
      }),
    );
    expect(lineage.events).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: "run_created",
          runId: draftRun.runId,
          title: "Run created",
        }),
        expect.objectContaining({
          type: "evidence_task_opened",
          taskId: task.taskId,
          runId: draftRun.runId,
          title: "Evidence task opened",
        }),
        expect.objectContaining({
          type: "evidence_task_resolved",
          taskId: task.taskId,
          sourcePackId: expect.any(String),
          jobId: job.jobId,
          title: "Evidence task resolved",
        }),
        expect.objectContaining({
          type: "rerun_completed",
          jobId: job.jobId,
          runId: completedJob.run.runId,
          title: "Rerun completed",
        }),
        expect.objectContaining({
          type: "decision_delta_available",
          leftRunId: draftRun.runId,
          rightRunId: completedJob.run.runId,
          title: "Decision delta ready",
          delta: expect.objectContaining({
            direction: "improved",
            closedGapCount: expect.any(Number),
            remainingBlockerCount: 0,
          }),
        }),
      ]),
    );
    const deltaEvent = lineage.events.find(
      (event: { type: string }) => event.type === "decision_delta_available",
    );
    expect(deltaEvent.delta.closedGapCount).toBeGreaterThan(0);
    const eventTypes = lineage.events.map((event: { type: string }) => event.type);
    expect(eventTypes.indexOf("evidence_task_opened")).toBeLessThan(
      eventTypes.indexOf("decision_delta_available"),
    );

    const latestReviewResponse = await app.inject({
      method: "POST",
      url: `/api/runs/${completedJob.run.runId}/review/claims`,
      payload: {
        claimId: "claim-1",
        status: "approved",
        reviewer: "Nikola",
        rationale: "Ready for the decision record after source-backed rerun.",
      },
    });
    expect(latestReviewResponse.statusCode).toBe(201);

    const dossierResponse = await app.inject({
      method: "GET",
      url: `/api/projects/${project.id}/decision-record`,
    });
    expect(dossierResponse.statusCode).toBe(200);
    const dossier = dossierResponse.json();
    expect(dossier).toEqual(
      expect.objectContaining({
        projectId: project.id,
        projectName: "Support Ops",
        title: "Decision Record Dossier",
        latestRunId: completedJob.run.runId,
        question: completedJob.run.question,
        readiness: expect.objectContaining({
          status: "ready",
          label: "Ready for review",
        }),
        trust: expect.objectContaining({
          status: "pass",
        }),
        review: expect.objectContaining({
          approvedClaims: ["claim-1"],
          rejectedClaims: [],
        }),
        lineage: expect.objectContaining({
          eventCount: lineage.events.length,
          deltaCount: 1,
          latestDelta: expect.objectContaining({
            direction: "improved",
          }),
        }),
      }),
    );
    expect(dossier.recommendation).toContain("Use a staged approach");
    expect(dossier.nextStep).toBe("Review claims and export the decision package.");
    expect(dossier.sourceSummary.sourceCount).toBe(1);
    expect(dossier.keyArtifacts).toEqual(
      expect.objectContaining({
        memo: completedJob.run.paths.decisionMemo,
      }),
    );

    const dossierExportResponse = await app.inject({
      method: "GET",
      url: `/api/projects/${project.id}/export/decision-record-dossier`,
    });
    expect(dossierExportResponse.statusCode).toBe(200);
    expect(dossierExportResponse.headers["content-type"]).toContain("text/markdown");
    expect(dossierExportResponse.headers["content-disposition"]).toContain("decision-record-dossier");
    expect(dossierExportResponse.body).toContain("# Crux Decision Record Dossier");
    expect(dossierExportResponse.body).toContain("## Final Recommendation");
    expect(dossierExportResponse.body).toContain("## Human Review");
    expect(dossierExportResponse.body).toContain("Approved claims: claim-1");
    expect(dossierExportResponse.body).toContain("## Decision Lineage");
    expect(dossierExportResponse.body).toContain("Decision delta ready");
    expect(dossierExportResponse.body).toContain("## Final Memo");
  });
});

async function waitForJob(
  app: ReturnType<typeof buildServer>,
  jobId: string,
  status: string,
) {
  for (let index = 0; index < 20; index += 1) {
    const response = await app.inject({ method: "GET", url: `/api/runs/jobs/${jobId}` });
    expect(response.statusCode).toBe(200);
    const job = response.json();
    if (job.status === status) {
      return job;
    }

    await new Promise((resolve) => setTimeout(resolve, 10));
  }

  throw new Error(`Job ${jobId} did not reach ${status}.`);
}
