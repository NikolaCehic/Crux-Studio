import { MockCruxProvider, type AskInput, type CruxProvider, type RunBundle, type RunSummary } from "@crux-studio/crux-provider";
import { afterEach, describe, expect, it } from "vitest";
import { buildServer } from "./app";

const apps: Array<ReturnType<typeof buildServer>> = [];

afterEach(async () => {
  await Promise.all(apps.map((app) => app.close()));
  apps.length = 0;
});

describe("Studio run API", () => {
  it("tracks async run lifecycle jobs with queued, running, succeeded, cancelled, failed, and retry states", async () => {
    const provider = new DeferredCruxProvider();
    const app = buildServer({ provider });
    apps.push(app);

    const firstJobResponse = await app.inject({
      method: "POST",
      url: "/api/runs/jobs",
      payload: { question: "Should we automate invoice triage?", sourcePolicy: "offline" },
    });
    expect(firstJobResponse.statusCode).toBe(202);
    const firstJob = firstJobResponse.json();
    expect(firstJob.status).toBe("queued");

    await waitForJob(app, firstJob.jobId, "running");
    expect(provider.pendingCount()).toBe(1);

    const runningCancelResponse = await app.inject({
      method: "POST",
      url: `/api/runs/jobs/${firstJob.jobId}/cancel`,
    });
    expect(runningCancelResponse.statusCode).toBe(200);
    expect(runningCancelResponse.json()).toEqual(
      expect.objectContaining({
        status: "cancelled",
        error: expect.stringContaining("provider was running"),
      }),
    );

    const queuedJobResponse = await app.inject({
      method: "POST",
      url: "/api/runs/jobs",
      payload: { question: "Should the queued job be cancelled?", sourcePolicy: "offline" },
    });
    expect(queuedJobResponse.statusCode).toBe(202);
    const queuedJob = queuedJobResponse.json();
    expect(queuedJob.status).toBe("queued");

    const cancelledResponse = await app.inject({
      method: "POST",
      url: `/api/runs/jobs/${queuedJob.jobId}/cancel`,
    });
    expect(cancelledResponse.statusCode).toBe(200);
    expect(cancelledResponse.json().status).toBe("cancelled");

    await provider.resolveNext();
    await waitForJob(app, firstJob.jobId, "cancelled");

    const successJobResponse = await app.inject({
      method: "POST",
      url: "/api/runs/jobs",
      payload: { question: "Should this run complete successfully?", sourcePolicy: "offline" },
    });
    expect(successJobResponse.statusCode).toBe(202);
    const successJob = successJobResponse.json();
    await waitForJob(app, successJob.jobId, "running");

    await provider.resolveNext();
    const completedJob = await waitForJob(app, successJob.jobId, "succeeded");
    expect(completedJob.run.runId).toContain("mock-20260501100000");

    const failingJobResponse = await app.inject({
      method: "POST",
      url: "/api/runs/jobs",
      payload: { question: "Should this failed run be retryable?", sourcePolicy: "offline" },
    });
    expect(failingJobResponse.statusCode).toBe(202);
    const failingJob = failingJobResponse.json();
    await waitForJob(app, failingJob.jobId, "running");

    provider.rejectNext(new Error("Provider timed out."));
    const failedJob = await waitForJob(app, failingJob.jobId, "failed");
    expect(failedJob.error).toContain("Provider timed out.");

    const retryResponse = await app.inject({
      method: "POST",
      url: `/api/runs/jobs/${failedJob.jobId}/retry`,
    });
    expect(retryResponse.statusCode).toBe(202);
    const retryJob = retryResponse.json();
    expect(retryJob.retryOf).toBe(failedJob.jobId);
    expect(retryJob.status).toBe("queued");

    await waitForJob(app, retryJob.jobId, "running");
    await provider.resolveNext();
    await waitForJob(app, retryJob.jobId, "succeeded");

    const listed = await app.inject({ method: "GET", url: "/api/runs/jobs" });
    expect(listed.statusCode).toBe(200);
    expect(listed.json().map((job: { status: string }) => job.status)).toEqual(
      expect.arrayContaining(["succeeded", "failed", "cancelled"]),
    );

    const providers = await app.inject({ method: "GET", url: "/api/providers" });
    expect(providers.json().providers[0].capabilities).toContain("lifecycle");
  });

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
        agents: expect.objectContaining({
          status: "warn",
          agentCount: 6,
        }),
        artifacts: expect.objectContaining({
          agents: expect.objectContaining({
            synthesis: expect.objectContaining({ status: "warn" }),
          }),
          claims: expect.any(Object),
          trace: expect.any(Array),
        }),
      }),
    );
  });

  it("returns safe inspectable artifacts and memo export for a run", async () => {
    const provider = new MockCruxProvider({
      now: () => "2026-05-01T10:00:00.000Z",
    });
    const app = buildServer({ provider });
    apps.push(app);

    const created = await app.inject({
      method: "POST",
      url: "/api/runs/ask",
      payload: {
        question: "Should operations automate warehouse slotting?",
        sourcePolicy: "offline",
      },
    });
    const run = created.json();

    const claims = await app.inject({
      method: "GET",
      url: `/api/runs/${run.runId}/artifacts/claims`,
    });
    expect(claims.statusCode).toBe(200);
    expect(claims.json()).toEqual(
      expect.objectContaining({
        claims: expect.arrayContaining([
          expect.objectContaining({ id: "claim-1" }),
        ]),
      }),
    );

    const agents = await app.inject({
      method: "GET",
      url: `/api/runs/${run.runId}/artifacts/agents`,
    });
    expect(agents.statusCode).toBe(200);
    expect(agents.json()).toEqual(
      expect.objectContaining({
        findings: expect.arrayContaining([
          expect.objectContaining({ agent_id: "council_moderator" }),
        ]),
      }),
    );

    const memo = await app.inject({
      method: "GET",
      url: `/api/runs/${run.runId}/export/memo`,
    });
    expect(memo.statusCode).toBe(200);
    expect(memo.headers["content-type"]).toContain("text/markdown");
    expect(memo.body).toContain("## Recommendation");

    const unsafe = await app.inject({
      method: "GET",
      url: `/api/runs/${run.runId}/artifacts/../../package.json`,
    });
    expect(unsafe.statusCode).toBe(404);
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

type DeferredAsk = {
  input: AskInput;
  resolve: (run: RunSummary) => void;
  reject: (error: Error) => void;
};

class DeferredCruxProvider implements CruxProvider {
  private readonly mock = new MockCruxProvider({
    now: () => "2026-05-01T10:00:00.000Z",
  });
  private readonly pending: DeferredAsk[] = [];

  async ask(input: AskInput): Promise<RunSummary> {
    return new Promise<RunSummary>((resolve, reject) => {
      this.pending.push({ input, resolve, reject });
    });
  }

  async listRuns(): Promise<RunSummary[]> {
    return this.mock.listRuns();
  }

  async getRun(runId: string): Promise<RunBundle> {
    return this.mock.getRun(runId);
  }

  pendingCount() {
    return this.pending.length;
  }

  async resolveNext() {
    const next = this.pending.shift();
    if (!next) {
      throw new Error("No pending run.");
    }

    next.resolve(await this.mock.ask(next.input));
  }

  rejectNext(error: Error) {
    const next = this.pending.shift();
    if (!next) {
      throw new Error("No pending run.");
    }

    next.reject(error);
  }
}

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
