import type {
  AskInput,
  CruxProvider,
  RunBundle,
  RunSummary,
  SourcePolicy,
} from "@crux-studio/crux-provider";
import { createHash, randomUUID } from "node:crypto";
import Fastify from "fastify";
import { z } from "zod";
import {
  createMemoryStudioStore,
  type StudioEvidenceTask,
  type StudioRunJob,
  type StudioRunJobStatus,
  type StudioStore,
} from "./studio-store";

const askSchema = z.object({
  question: z.string(),
  context: z.string().optional(),
  timeHorizon: z.string().optional(),
  sourcePolicy: z.enum(["offline", "hybrid", "web"]).optional(),
  projectId: z.string().optional(),
  sourcePackId: z.string().optional(),
});

const projectSchema = z.object({
  name: z.string().min(1),
});

const sourcePackSchema = z.object({
  projectId: z.string().min(1),
  name: z.string().min(1),
  files: z
    .array(
      z.object({
        name: z.string().min(1),
        content: z.string(),
      }),
    )
    .min(1),
});

const claimReviewSchema = z.object({
  claimId: z.string().min(1),
  status: z.enum(["approved", "rejected"]),
  reviewer: z.string().min(1),
  rationale: z.string().min(1),
});

const evidenceAnnotationSchema = z.object({
  evidenceId: z.string().min(1),
  reviewer: z.string().min(1),
  note: z.string().min(1),
});

const compareSchema = z.object({
  leftRunId: z.string().min(1),
  rightRunId: z.string().min(1),
});

const evidenceTaskResolutionSchema = z.object({
  sourcePackName: z.string().min(1).optional(),
  sourceName: z.string().min(1).optional(),
  sourceContent: z.string().min(1),
  note: z.string().optional(),
});

type BuildServerOptions = {
  provider: CruxProvider;
  store?: StudioStore;
  providerId?: string;
};

type StudioAskInput = {
  question: string;
  context?: string;
  timeHorizon?: string;
  sourcePolicy?: SourcePolicy;
  projectId?: string;
  sourcePackId?: string;
};

type RunJobStatus = StudioRunJobStatus;
type RunJob = StudioRunJob;

const artifactNames = [
  "memo",
  "query-intake",
  "claims",
  "evidence",
  "contradictions",
  "uncertainty",
  "source-inventory",
  "source-chunks",
  "agent-manifest",
  "agents",
  "council",
  "eval-report",
  "diagnostics",
  "trace",
] as const;

type ArtifactName = (typeof artifactNames)[number];

const artifactNameSet = new Set<string>(artifactNames);

const demoQuestions = [
  {
    id: "investment-allocation",
    title: "Diversified portfolio allocation",
    question: "How should I invest 10000 USD into a diversified portfolio?",
    context: "I want a practical long-term allocation and I want risks and assumptions made explicit.",
    timeHorizon: "5 years",
    sourcePolicy: "offline",
  },
  {
    id: "product-roadmap",
    title: "Product roadmap priority",
    question: "Which product bet should our team prioritize this quarter?",
    context: "We have one engineering squad and need to balance retention, activation, and enterprise requests.",
    timeHorizon: "90 days",
    sourcePolicy: "hybrid",
  },
  {
    id: "support-response-time",
    title: "Support response time",
    question: "How should a support team reduce first-response time without hiring more agents this month?",
    context: "The team can change triage, macros, routing, and coverage but cannot add headcount.",
    timeHorizon: "30 days",
    sourcePolicy: "hybrid",
  },
  {
    id: "market-entry",
    title: "Market entry decision",
    question: "Should we enter the German mid-market segment this year?",
    context: "We need to compare revenue upside, sales motion risk, localization cost, and competitive pressure.",
    timeHorizon: "12 months",
    sourcePolicy: "hybrid",
  },
  {
    id: "architecture-choice",
    title: "Architecture tradeoff",
    question: "Should we keep a modular monolith or split this product into services now?",
    context: "The team is small, release velocity matters, and observability maturity is limited.",
    timeHorizon: "6 months",
    sourcePolicy: "offline",
  },
] as const;

export function buildServer({
  provider,
  store = createMemoryStudioStore(),
  providerId = "mock",
}: BuildServerOptions) {
  const app = Fastify({ logger: false });
  const runJobs = new Map<string, RunJob>();
  const runQueue: string[] = [];
  let queueIsDraining = false;
  let recoveryPromise: Promise<void> | null = null;

  function now() {
    return new Date().toISOString();
  }

  function normalizeAskInput(body: unknown): StudioAskInput | null {
    const parsed = askSchema.safeParse(body);

    if (!parsed.success || parsed.data.question.trim().length === 0) {
      return null;
    }

    return {
      ...parsed.data,
      question: parsed.data.question.trim(),
      context: parsed.data.context?.trim() || undefined,
      timeHorizon: parsed.data.timeHorizon?.trim() || undefined,
    };
  }

  async function askProvider(input: StudioAskInput): Promise<RunSummary> {
    const sourcePack = input.sourcePackId
      ? await store.getSourcePack(input.sourcePackId)
      : undefined;
    const providerInput: AskInput = {
      ...input,
      sourcePack: sourcePack
        ? {
            id: sourcePack.id,
            name: sourcePack.name,
            sourceCount: sourcePack.sourceCount,
            files: sourcePack.files.map((file) => ({
              name: file.name,
              content: file.content,
              contentHash: file.contentHash,
              size: file.size,
            })),
          }
        : undefined,
    };

    return provider.ask(providerInput);
  }

  async function persistRunLink(input: StudioAskInput, run: RunSummary) {
    if (input.projectId || input.sourcePackId) {
      await store.linkRun({
        runId: run.runId,
        projectId: input.projectId,
        sourcePackId: input.sourcePackId,
      });
    }

    return enrichRun(run, await store.getRunLink(run.runId));
  }

  function enqueueRunJob(jobId: string) {
    if (!runQueue.includes(jobId)) {
      runQueue.push(jobId);
    }
    setTimeout(() => void drainRunQueue(), 0);
  }

  async function ensureRecoveredJobs() {
    if (!recoveryPromise) {
      recoveryPromise = recoverRunJobs();
    }

    await recoveryPromise;
  }

  async function recoverRunJobs() {
    const durableJobs = await store.listRunJobs();
    const queuedJobIds: string[] = [];

    for (const durableJob of durableJobs) {
      let job = durableJob;

      if (job.status === "running") {
        const finishedAt = now();
        job = {
          ...job,
          status: "failed",
          error: "Run job interrupted by a server restart before completion. Retry the job to run it again.",
          finishedAt,
          updatedAt: finishedAt,
        };
        await store.saveRunJob(job);
      }

      runJobs.set(job.jobId, job);
      if (job.status === "queued") {
        queuedJobIds.push(job.jobId);
      }
    }

    for (const jobId of queuedJobIds) {
      enqueueRunJob(jobId);
    }
  }

  async function createRunJob(input: StudioAskInput, retryOf?: string): Promise<RunJob> {
    await ensureRecoveredJobs();

    const createdAt = now();
    const job: RunJob = {
      jobId: `job-${createdAt.replace(/[^0-9]/g, "").slice(0, 14)}-${randomUUID().slice(0, 8)}`,
      status: "queued",
      createdAt,
      updatedAt: createdAt,
      retryOf,
      input,
    };

    runJobs.set(job.jobId, job);
    await store.saveRunJob(job);
    enqueueRunJob(job.jobId);
    return job;
  }

  async function drainRunQueue() {
    await ensureRecoveredJobs();

    if (queueIsDraining) {
      return;
    }

    queueIsDraining = true;
    try {
      while (runQueue.length > 0) {
        const jobId = runQueue.shift();
        const job = jobId ? runJobs.get(jobId) : undefined;
        if (!job || job.status !== "queued") {
          continue;
        }

        const startedAt = now();
        job.status = "running";
        job.startedAt = startedAt;
        job.updatedAt = startedAt;
        await store.saveRunJob(job);

        try {
          const providerRun = await askProvider(job.input);
          if (runJobs.get(job.jobId)?.status !== "cancelled") {
            const linkedRun = await persistRunLink(job.input, providerRun);
            const finishedAt = now();
            job.status = "succeeded";
            job.run = linkedRun;
            job.finishedAt = finishedAt;
            job.updatedAt = finishedAt;
            await store.saveRunJob(job);
          }
        } catch (caught) {
          if (runJobs.get(job.jobId)?.status !== "cancelled") {
            const finishedAt = now();
            job.status = "failed";
            job.error = caught instanceof Error ? caught.message : "Run job failed.";
            job.finishedAt = finishedAt;
            job.updatedAt = finishedAt;
            await store.saveRunJob(job);
          }
        }
      }
    } finally {
      queueIsDraining = false;
    }
  }

  async function listRunJobs() {
    await ensureRecoveredJobs();
    return [...runJobs.values()].sort((left, right) =>
      right.createdAt.localeCompare(left.createdAt),
    );
  }

  async function ensureEvidenceTasks(runId: string): Promise<StudioEvidenceTask[]> {
    const existing = await store.listEvidenceTasks(runId);
    if (existing.length > 0) {
      return existing;
    }

    const bundle = await provider.getRun(runId);
    const link = await store.getRunLink(runId);
    const tasks = createEvidenceTasksFromRun(bundle, link?.projectId, now());

    for (const task of tasks) {
      await store.saveEvidenceTask(task);
    }

    return store.listEvidenceTasks(runId);
  }

  setTimeout(() => void ensureRecoveredJobs(), 0);

  app.get("/health", async () => ({
    ok: true,
    service: "crux-studio-server",
  }));

  app.get("/api/providers", async () => ({
    providers: [
      {
        id: providerId,
        status: "active",
        capabilities: [
          "ask",
          "inspect",
          "lifecycle",
          "evidence-tasks",
          "sources",
          "review",
          "replay",
          "compare",
          "agents",
          "demos",
          "readiness",
          "export",
        ],
      },
    ],
  }));

  app.get("/api/demos", async () => ({ demos: demoQuestions }));

  app.post("/api/runs/jobs", async (request, reply) => {
    const input = normalizeAskInput(request.body);
    if (!input) {
      return reply.code(400).send({ message: "Question is required." });
    }

    return reply.code(202).send(await createRunJob(input));
  });

  app.get("/api/runs/jobs", async () => listRunJobs());

  app.get<{ Params: { jobId: string } }>("/api/runs/jobs/:jobId", async (request, reply) => {
    await ensureRecoveredJobs();
    const job = runJobs.get(request.params.jobId);
    if (!job) {
      return reply.code(404).send({ message: "Run job not found." });
    }

    return job;
  });

  app.post<{ Params: { jobId: string } }>(
    "/api/runs/jobs/:jobId/cancel",
    async (request, reply) => {
      await ensureRecoveredJobs();
      const job = runJobs.get(request.params.jobId);
      if (!job) {
        return reply.code(404).send({ message: "Run job not found." });
      }

      if (job.status === "succeeded" || job.status === "failed" || job.status === "cancelled") {
        return reply.code(409).send({ message: "Run job is already finished." });
      }

      const finishedAt = now();
      job.status = "cancelled";
      job.finishedAt = finishedAt;
      job.updatedAt = finishedAt;
      job.error =
        job.startedAt
          ? "Cancellation requested while the provider was running. The job result will be ignored."
          : "Run job cancelled before provider execution.";

      await store.saveRunJob(job);
      return job;
    },
  );

  app.post<{ Params: { jobId: string } }>(
    "/api/runs/jobs/:jobId/retry",
    async (request, reply) => {
      await ensureRecoveredJobs();
      const job = runJobs.get(request.params.jobId);
      if (!job) {
        return reply.code(404).send({ message: "Run job not found." });
      }

      if (job.status !== "failed" && job.status !== "cancelled") {
        return reply.code(409).send({ message: "Only failed or cancelled jobs can be retried." });
      }

      return reply.code(202).send(await createRunJob(job.input, job.jobId));
    },
  );

  app.post("/api/projects", async (request, reply) => {
    const parsed = projectSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ message: "Project name is required." });
    }

    return reply.code(201).send(await store.createProject(parsed.data.name.trim()));
  });

  app.get("/api/projects", async () => store.listProjects());

  app.get<{ Params: { projectId: string } }>(
    "/api/projects/:projectId/runs",
    async (request) =>
      sortRunsNewestFirst(
        await store.listProjectRuns(request.params.projectId, await provider.listRuns()),
      ),
  );

  app.post("/api/source-packs", async (request, reply) => {
    const parsed = sourcePackSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply
        .code(400)
        .send({ message: "Source pack requires project, name, and files." });
    }

    return reply.code(201).send(await store.createSourcePack(parsed.data));
  });

  app.get("/api/source-packs", async (request) => {
    const url = new URL(request.url, "http://127.0.0.1");
    return store.listSourcePacks(url.searchParams.get("projectId") ?? undefined);
  });

  app.post("/api/runs/ask", async (request, reply) => {
    const input = normalizeAskInput(request.body);
    if (!input) {
      return reply.code(400).send({ message: "Question is required." });
    }

    const run = await askProvider(input);
    return reply.code(201).send(await persistRunLink(input, run));
  });

  app.get("/api/runs", async () =>
    sortRunsNewestFirst(
      await Promise.all(
        (await provider.listRuns()).map(async (run) =>
          enrichRun(run, await store.getRunLink(run.runId)),
        ),
      ),
    ),
  );

  app.get<{ Params: { runId: string } }>(
    "/api/runs/:runId/evidence-tasks",
    async (request, reply) => {
      try {
        return await ensureEvidenceTasks(request.params.runId);
      } catch {
        return reply.code(404).send({ message: "Run not found." });
      }
    },
  );

  app.post<{ Params: { runId: string; taskId: string } }>(
    "/api/runs/:runId/evidence-tasks/:taskId/resolve",
    async (request, reply) => {
      const parsed = evidenceTaskResolutionSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.code(400).send({ message: "Evidence task resolution requires source content." });
      }

      try {
        const tasks = await ensureEvidenceTasks(request.params.runId);
        const task = tasks.find((item) => item.taskId === request.params.taskId);
        if (!task) {
          return reply.code(404).send({ message: "Evidence task not found." });
        }

        if (task.status === "resolved") {
          return reply.code(409).send({ message: "Evidence task is already resolved." });
        }

        const bundle = await provider.getRun(request.params.runId);
        const link = await store.getRunLink(bundle.runId);
        const projectId = task.projectId ?? link?.projectId ?? (await store.createProject(`Evidence Closure ${bundle.runId.slice(0, 12)}`)).id;
        const sourcePack = await store.createSourcePack({
          projectId,
          name: parsed.data.sourcePackName?.trim() || `Evidence closure for ${task.title}`,
          files: [
            {
              name: parsed.data.sourceName?.trim() || `${slugify(task.title) || "evidence-gap"}.md`,
              content: parsed.data.sourceContent,
            },
          ],
        });
        const resolvedAt = now();
        let resolvedTask = await store.saveEvidenceTask({
          ...task,
          status: "resolved",
          updatedAt: resolvedAt,
          resolvedAt,
          resolvedBySourcePackId: sourcePack.id,
          resolutionNote: parsed.data.note?.trim() || undefined,
        });
        const job = await createRunJob({
          projectId,
          sourcePackId: sourcePack.id,
          question: bundle.question,
          context: evidenceClosureContext(bundle, task, parsed.data.note),
          timeHorizon: "same as source run",
          sourcePolicy: "hybrid",
        });
        resolvedTask = await store.saveEvidenceTask({
          ...resolvedTask,
          updatedAt: now(),
          rerunJobId: job.jobId,
        });

        return reply.code(201).send({ task: resolvedTask, sourcePack, job });
      } catch {
        return reply.code(404).send({ message: "Run not found." });
      }
    },
  );

  app.get<{ Params: { runId: string; artifactName: string } }>(
    "/api/runs/:runId/artifacts/:artifactName",
    async (request, reply) => {
      if (!artifactNameSet.has(request.params.artifactName)) {
        return reply.code(404).send({ message: "Artifact not found." });
      }

      try {
        const bundle = await provider.getRun(request.params.runId);
        const artifact = selectArtifact(
          bundle,
          request.params.artifactName as ArtifactName,
        );

        if (request.params.artifactName === "memo") {
          return reply.type("text/markdown; charset=utf-8").send(String(artifact ?? ""));
        }

        return reply.send(artifact ?? null);
      } catch {
        return reply.code(404).send({ message: "Run not found." });
      }
    },
  );

  app.get<{ Params: { runId: string } }>(
    "/api/runs/:runId/export/memo",
    async (request, reply) => {
      try {
        const bundle = await provider.getRun(request.params.runId);
        return reply
          .type("text/markdown; charset=utf-8")
          .header(
            "content-disposition",
            `attachment; filename="${bundle.runId}-decision-memo.md"`,
          )
          .send(bundle.memo);
      } catch {
        return reply.code(404).send({ message: "Run not found." });
      }
    },
  );

  app.get<{ Params: { runId: string } }>("/api/runs/:runId", async (request, reply) => {
    try {
      const bundle = await provider.getRun(request.params.runId);
      const link = await store.getRunLink(bundle.runId);
      return {
        ...enrichRun(bundle, link),
        artifacts: bundle.artifacts,
        memo: bundle.memo,
        review: await store.getReview(bundle.runId),
      };
    } catch {
      return reply.code(404).send({ message: "Run not found." });
    }
  });

  app.post<{ Params: { runId: string } }>(
    "/api/runs/:runId/review/claims",
    async (request, reply) => {
      const parsed = claimReviewSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply
          .code(400)
          .send({ message: "Claim review requires claim, status, reviewer, and rationale." });
      }

      return reply
        .code(201)
        .send(await store.addClaimReview({ runId: request.params.runId, ...parsed.data }));
    },
  );

  app.post<{ Params: { runId: string } }>(
    "/api/runs/:runId/review/evidence",
    async (request, reply) => {
      const parsed = evidenceAnnotationSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply
          .code(400)
          .send({ message: "Evidence annotation requires evidence, reviewer, and note." });
      }

      return reply
        .code(201)
        .send(await store.addEvidenceAnnotation({ runId: request.params.runId, ...parsed.data }));
    },
  );

  app.get<{ Params: { runId: string } }>(
    "/api/runs/:runId/review",
    async (request) => store.getReview(request.params.runId),
  );

  app.get<{ Params: { runId: string } }>(
    "/api/runs/:runId/export/reviewed-memo",
    async (request, reply) => {
      try {
        const bundle = await provider.getRun(request.params.runId);
        const review = await store.getReview(request.params.runId);
        return reply
          .type("text/markdown; charset=utf-8")
          .header(
            "content-disposition",
            `attachment; filename="${bundle.runId}-reviewed-memo.md"`,
          )
          .send(renderReviewedMemo(bundle.memo, review));
      } catch {
        return reply.code(404).send({ message: "Run not found." });
      }
    },
  );

  app.get<{ Params: { runId: string } }>(
    "/api/runs/:runId/export/decision-package",
    async (request, reply) => {
      try {
        const bundle = await provider.getRun(request.params.runId);
        const review = await store.getReview(request.params.runId);
        return reply
          .type("text/markdown; charset=utf-8")
          .header(
            "content-disposition",
            `attachment; filename="${bundle.runId}-decision-package.md"`,
          )
          .send(renderDecisionPackage(bundle, review));
      } catch {
        return reply.code(404).send({ message: "Run not found." });
      }
    },
  );

  app.post<{ Params: { runId: string } }>(
    "/api/runs/:runId/replay",
    async (request, reply) => {
      try {
        const bundle = await provider.getRun(request.params.runId);
        const link = await store.getRunLink(bundle.runId);
        const sourcePack = link?.sourcePackId
          ? await store.getSourcePack(link.sourcePackId)
          : undefined;
        const replayed = await provider.ask({
          question: bundle.question,
          context: `Replay of ${bundle.runId}`,
          timeHorizon: "same as original",
          sourcePolicy: sourcePack ? "hybrid" : "offline",
          sourcePack: sourcePack
            ? {
                id: sourcePack.id,
                name: sourcePack.name,
                sourceCount: sourcePack.sourceCount,
                files: sourcePack.files.map((file) => ({
                  name: file.name,
                  content: file.content,
                  contentHash: file.contentHash,
                  size: file.size,
                })),
              }
            : undefined,
        });
        await store.linkRun({
          runId: replayed.runId,
          projectId: link?.projectId,
          sourcePackId: link?.sourcePackId,
        });
        return reply
          .code(201)
          .send(enrichRun(replayed, await store.getRunLink(replayed.runId)));
      } catch {
        return reply.code(404).send({ message: "Run not found." });
      }
    },
  );

  app.post("/api/runs/compare", async (request, reply) => {
    const parsed = compareSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ message: "Comparison requires left and right run IDs." });
    }

    try {
      const [left, right] = await Promise.all([
        provider.getRun(parsed.data.leftRunId),
        provider.getRun(parsed.data.rightRunId),
      ]);
      return compareRunBundles(
        left,
        right,
        await closedEvidenceTaskTitles(parsed.data.leftRunId, parsed.data.rightRunId),
      );
    } catch {
      return reply.code(404).send({ message: "Run not found." });
    }
  });

  app.post("/api/runs/compare/export/decision-delta-package", async (request, reply) => {
    const parsed = compareSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ message: "Comparison export requires left and right run IDs." });
    }

    try {
      const [left, right] = await Promise.all([
        provider.getRun(parsed.data.leftRunId),
        provider.getRun(parsed.data.rightRunId),
      ]);
      const comparison = compareRunBundles(
        left,
        right,
        await closedEvidenceTaskTitles(parsed.data.leftRunId, parsed.data.rightRunId),
      );
      const [leftReview, rightReview] = await Promise.all([
        store.getReview(left.runId),
        store.getReview(right.runId),
      ]);

      return reply
        .type("text/markdown; charset=utf-8")
        .header(
          "content-disposition",
          `attachment; filename="${safeFilename(right.runId)}-decision-delta-package.md"`,
        )
        .send(renderDecisionDeltaPackage(left, right, comparison, leftReview, rightReview));
    } catch {
      return reply.code(404).send({ message: "Run not found." });
    }
  });

  async function closedEvidenceTaskTitles(leftRunId: string, rightRunId: string) {
    await ensureRecoveredJobs();
    const [tasks, rightLink] = await Promise.all([
      store.listEvidenceTasks(leftRunId),
      store.getRunLink(rightRunId),
    ]);
    const jobById = new Map((await listRunJobs()).map((job) => [job.jobId, job]));

    return tasks
      .filter((task) => {
        const rerunJob = task.rerunJobId ? jobById.get(task.rerunJobId) : undefined;
        const matchedByRerunJob = rerunJob?.run?.runId === rightRunId;
        const matchedBySourcePack =
          Boolean(task.resolvedBySourcePackId) &&
          task.resolvedBySourcePackId === rightLink?.sourcePackId;
        return task.status === "resolved" && (matchedByRerunJob || matchedBySourcePack);
      })
      .map((task) => task.title);
  }

  return app;
}

type RunLike = Awaited<ReturnType<CruxProvider["getRun"]>>;

function enrichRun<T extends { runId: string }>(
  run: T,
  link: { projectId?: string; sourcePackId?: string } | undefined,
): T & { projectId?: string; sourcePackId?: string } {
  return link ? { ...run, projectId: link.projectId, sourcePackId: link.sourcePackId } : run;
}

function sortRunsNewestFirst<T extends { createdAt: string; runId: string }>(runs: T[]) {
  return [...runs].sort((left, right) => {
    const createdAtOrder = right.createdAt.localeCompare(left.createdAt);
    if (createdAtOrder !== 0) {
      return createdAtOrder;
    }

    return right.runId.localeCompare(left.runId);
  });
}

function createEvidenceTasksFromRun(
  bundle: RunBundle,
  projectId: string | undefined,
  createdAt: string,
): StudioEvidenceTask[] {
  const seeds = uniqueEvidenceSeeds([
    ...(bundle.sourceWorkspace?.missingEvidence ?? []).map((detail) => ({
      kind: "missing_evidence" as const,
      title: detail,
      detail,
    })),
    ...bundle.trust.blockingIssues.map((detail) => ({
      kind: "trust_blocker" as const,
      title: detail,
      detail,
    })),
    ...(bundle.agents?.blockingIssues ?? []).map((detail) => ({
      kind: "agent_blocker" as const,
      title: detail,
      detail,
    })),
    ...(bundle.agents?.nextActions ?? [])
      .filter(isEvidenceAction)
      .map((detail) => ({
        kind: "agent_next_action" as const,
        title: detail,
        detail,
      })),
  ]);

  return seeds.map((seed, index) => ({
    taskId: `task-${shortRunKey(bundle.runId)}-${index + 1}-${slugify(seed.title).slice(0, 36) || seed.kind}`,
    runId: bundle.runId,
    projectId,
    status: "open",
    kind: seed.kind,
    title: seed.title,
    detail: seed.detail,
    createdAt,
    updatedAt: createdAt,
  }));
}

function uniqueEvidenceSeeds(
  seeds: Array<Pick<StudioEvidenceTask, "kind" | "title" | "detail">>,
) {
  const seen = new Set<string>();
  return seeds.filter((seed) => {
    const key = `${seed.kind}:${seed.detail.toLowerCase()}`;
    if (seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
}

function isEvidenceAction(value: string): boolean {
  return /\b(source|evidence|attach|missing|rerun)\b/i.test(value);
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 56);
}

function shortRunKey(runId: string): string {
  return createHash("sha256").update(runId).digest("hex").slice(0, 8);
}

function evidenceClosureContext(
  bundle: RunBundle,
  task: StudioEvidenceTask,
  note: string | undefined,
): string {
  return [
    `Evidence closure rerun for ${bundle.runId}.`,
    `Task: ${task.title}`,
    `Task type: ${task.kind}`,
    note?.trim() ? `Resolution note: ${note.trim()}` : undefined,
  ].filter(Boolean).join("\n");
}

function renderReviewedMemo(
  memo: string,
  review: Awaited<ReturnType<StudioStore["getReview"]>>,
): string {
  return `# Reviewed Crux Memo

## Human Review Summary

Approved claims: ${review.summary.approvedClaims.join(", ") || "none"}
Rejected claims: ${review.summary.rejectedClaims.join(", ") || "none"}
Evidence annotations: ${
    review.summary.evidenceAnnotations
      .map((item) => `${item.evidenceId} (${item.noteCount})`)
      .join(", ") || "none"
  }

## Original Machine Memo

${memo}`;
}

function renderDecisionPackage(
  bundle: Awaited<ReturnType<CruxProvider["getRun"]>>,
  review: Awaited<ReturnType<StudioStore["getReview"]>>,
): string {
  const agentNextAction = bundle.agents?.nextActions[0] ?? "none";
  const missingEvidence = bundle.sourceWorkspace?.missingEvidence.join(", ") || "none";

  return `# Crux Decision Package

Run: ${bundle.runId}
Question: ${bundle.question}
Readiness: ${bundle.readiness.label}
Trust: ${bundle.trust.status} (${bundle.trust.confidence})
Agents: ${bundle.agents?.status ?? "unknown"} (${bundle.agents?.agentCount ?? 0} agents)
Sources: ${bundle.sourceWorkspace?.sourceCount ?? 0} sources, ${bundle.sourceWorkspace?.sourceChunkCount ?? 0} chunks

## Readiness

${bundle.readiness.reason}

Next action: ${bundle.readiness.nextAction ?? agentNextAction}

## Source Gaps

${missingEvidence}

## Agent Next Action

${agentNextAction}

## Human Review Summary

Approved claims: ${review.summary.approvedClaims.join(", ") || "none"}
Rejected claims: ${review.summary.rejectedClaims.join(", ") || "none"}
Evidence annotations: ${
    review.summary.evidenceAnnotations
      .map((item) => `${item.evidenceId} (${item.noteCount})`)
      .join(", ") || "none"
  }

## Decision Memo

${bundle.memo}`;
}

function renderDecisionDeltaPackage(
  left: RunLike,
  right: RunLike,
  comparison: ReturnType<typeof compareRunBundles>,
  leftReview: Awaited<ReturnType<StudioStore["getReview"]>>,
  rightReview: Awaited<ReturnType<StudioStore["getReview"]>>,
): string {
  const delta = comparison.delta;

  return `# Crux Decision Delta Package

Left run: ${left.runId}
Right run: ${right.runId}
Question: ${right.question}

## Verdict

${delta.verdict}

## Next Step

${delta.nextStep}

## Trust Movement

- Direction: ${delta.trustMovement.direction}
- Movement: ${delta.trustMovementLabel}
- Status: ${delta.trustMovement.fromStatus} to ${delta.trustMovement.toStatus}
- Confidence: ${delta.trustMovement.fromConfidence} to ${delta.trustMovement.toConfidence}

## Readiness Movement

- Status: ${delta.readinessMovement.from} to ${delta.readinessMovement.to}
- Changed: ${delta.readinessMovement.changed ? "yes" : "no"}

## Source Movement

- Sources: ${formatSignedNumber(delta.sourceMovement.sourceCountDelta)}
- Source chunks: ${formatSignedNumber(delta.sourceMovement.sourceChunkDelta)}
- Remaining evidence gaps: ${delta.sourceMovement.remainingGaps.length}

## Closed Evidence Gaps

${markdownList(delta.sourceMovement.closedGaps)}

## Remaining Evidence Gaps

${markdownList(delta.sourceMovement.remainingGaps)}

## Blocker Movement

Closed blockers:

${markdownList(delta.blockerMovement.closedBlockers)}

New blockers:

${markdownList(delta.blockerMovement.newBlockers)}

Remaining blockers:

${markdownList(delta.blockerMovement.remainingBlockers)}

## Notable Changes

${markdownList(delta.notableChanges)}

## Human Review Summary

Left run approved claims: ${leftReview.summary.approvedClaims.join(", ") || "none"}
Left run rejected claims: ${leftReview.summary.rejectedClaims.join(", ") || "none"}
Left run evidence annotations: ${formatEvidenceAnnotations(leftReview)}

Right run approved claims: ${rightReview.summary.approvedClaims.join(", ") || "none"}
Right run rejected claims: ${rightReview.summary.rejectedClaims.join(", ") || "none"}
Right run evidence annotations: ${formatEvidenceAnnotations(rightReview)}

## Changed Artifact Paths

${markdownList(comparison.differences.map((difference) => difference.path))}

## Newer Run Decision Memo

${right.memo}`;
}

function compareRunBundles(
  left: RunLike,
  right: RunLike,
  resolvedEvidenceTaskTitles: string[] = [],
) {
  const trustMovement = Number((right.trust.confidence - left.trust.confidence).toFixed(2));
  const differences = [
    ...compareValue("runId", left.runId, right.runId),
    ...compareValue("question", left.question, right.question),
    ...compareValue("readiness.status", left.readiness.status, right.readiness.status),
    ...compareValue("trust.status", left.trust.status, right.trust.status),
    ...compareValue("agents.status", left.agents?.status, right.agents?.status),
    ...compareValue("agents.agentCount", left.agents?.agentCount, right.agents?.agentCount),
    ...compareValue("agents.blockingIssues", left.agents?.blockingIssues, right.agents?.blockingIssues),
    ...compareValue("sourceWorkspace.sourceCount", left.sourceWorkspace?.sourceCount, right.sourceWorkspace?.sourceCount),
    ...compareValue("sourceWorkspace.sourceChunkCount", left.sourceWorkspace?.sourceChunkCount, right.sourceWorkspace?.sourceChunkCount),
    ...compareValue("sourceWorkspace.missingEvidence", left.sourceWorkspace?.missingEvidence, right.sourceWorkspace?.missingEvidence),
    ...compareValue("answerability", left.answerability, right.answerability),
    ...compareValue("risk", left.risk, right.risk),
    ...compareValue(
      "blockingIssues",
      left.trust.blockingIssues,
      right.trust.blockingIssues,
    ),
  ];

  return {
    leftRunId: left.runId,
    rightRunId: right.runId,
    trustMovement,
    differences,
    delta: buildDecisionDelta(left, right, trustMovement, resolvedEvidenceTaskTitles),
    summary: {
      differenceCount: differences.length,
      leftTrust: left.trust.status,
      rightTrust: right.trust.status,
      leftReadiness: left.readiness.status,
      rightReadiness: right.readiness.status,
    },
  };
}

function buildDecisionDelta(
  left: RunLike,
  right: RunLike,
  trustMovement: number,
  resolvedEvidenceTaskTitles: string[],
) {
  const movementPoints = Math.round(trustMovement * 100);
  const direction = trustDirection(left, right, movementPoints);
  const leftMissingEvidence = uniqueStrings(left.sourceWorkspace?.missingEvidence ?? []);
  const rightMissingEvidence = uniqueStrings(right.sourceWorkspace?.missingEvidence ?? []);
  const leftBlockers = runBlockers(left);
  const rightBlockers = runBlockers(right);
  const closedGaps = uniqueStrings([
    ...difference(leftMissingEvidence, rightMissingEvidence),
    ...resolvedEvidenceTaskTitles,
  ]);
  const newGaps = difference(rightMissingEvidence, leftMissingEvidence);
  const remainingGaps = rightMissingEvidence;
  const closedBlockers = difference(leftBlockers, rightBlockers);
  const newBlockers = difference(rightBlockers, leftBlockers);
  const remainingBlockers = rightBlockers;
  const sourceCountDelta = (right.sourceWorkspace?.sourceCount ?? 0) - (left.sourceWorkspace?.sourceCount ?? 0);
  const sourceChunkDelta = (right.sourceWorkspace?.sourceChunkCount ?? 0) - (left.sourceWorkspace?.sourceChunkCount ?? 0);
  const readinessChanged = left.readiness.status !== right.readiness.status;
  const notableChanges = [
    readinessChanged
      ? `Readiness moved from ${left.readiness.status} to ${right.readiness.status}.`
      : undefined,
    movementPoints !== 0
      ? `Trust confidence ${movementPoints > 0 ? "improved" : "regressed"} by ${Math.abs(movementPoints)} ${plural("point", Math.abs(movementPoints))}.`
      : undefined,
    sourceCountDelta !== 0
      ? `Source coverage ${sourceCountDelta > 0 ? "increased" : "decreased"} by ${Math.abs(sourceCountDelta)} ${plural("source", Math.abs(sourceCountDelta))}.`
      : undefined,
    sourceChunkDelta !== 0
      ? `Source chunks ${sourceChunkDelta > 0 ? "increased" : "decreased"} by ${Math.abs(sourceChunkDelta)} ${plural("chunk", Math.abs(sourceChunkDelta))}.`
      : undefined,
    closedGaps.length
      ? `${closedGaps.length} evidence ${plural("gap", closedGaps.length)} closed.`
      : undefined,
    newGaps.length
      ? `${newGaps.length} new evidence ${plural("gap", newGaps.length)} appeared.`
      : undefined,
    closedBlockers.length
      ? `${closedBlockers.length} ${plural("blocker", closedBlockers.length)} cleared.`
      : undefined,
    newBlockers.length
      ? `${newBlockers.length} new ${plural("blocker", newBlockers.length)} appeared.`
      : undefined,
    remainingGaps.length
      ? `${remainingGaps.length} evidence ${plural("gap", remainingGaps.length)} still ${remainingGaps.length === 1 ? "needs" : "need"} closure.`
      : undefined,
    remainingBlockers.length
      ? `${remainingBlockers.length} ${plural("blocker", remainingBlockers.length)} still ${remainingBlockers.length === 1 ? "needs" : "need"} resolution.`
      : undefined,
  ].filter((item): item is string => Boolean(item));

  return {
    verdict: decisionDeltaVerdict({
      direction,
      readinessChanged,
      sourceCountDelta,
      closedGaps,
      closedBlockers,
    }),
    trustMovementLabel: formatTrustMovementLabel(movementPoints),
    readinessMovement: {
      from: left.readiness.status,
      to: right.readiness.status,
      changed: readinessChanged,
    },
    trustMovement: {
      fromStatus: left.trust.status,
      toStatus: right.trust.status,
      fromConfidence: left.trust.confidence,
      toConfidence: right.trust.confidence,
      points: movementPoints,
      direction,
    },
    sourceMovement: {
      sourceCountDelta,
      sourceChunkDelta,
      closedGaps,
      newGaps,
      remainingGaps,
    },
    blockerMovement: {
      closedBlockers,
      newBlockers,
      remainingBlockers,
    },
    notableChanges: notableChanges.length
      ? notableChanges
      : ["Only run identity changed; readiness, trust, sources, and blockers are stable."],
    nextStep: decisionDeltaNextStep(right, remainingGaps, remainingBlockers, newBlockers),
  };
}

function trustDirection(
  left: RunLike,
  right: RunLike,
  movementPoints: number,
): "improved" | "regressed" | "unchanged" {
  if (movementPoints > 0) {
    return "improved";
  }

  if (movementPoints < 0) {
    return "regressed";
  }

  const leftRank = trustStatusRank(left.trust.status);
  const rightRank = trustStatusRank(right.trust.status);
  if (rightRank > leftRank) {
    return "improved";
  }

  if (rightRank < leftRank) {
    return "regressed";
  }

  return "unchanged";
}

function trustStatusRank(status: RunLike["trust"]["status"]) {
  return { fail: 0, warn: 1, pass: 2 }[status];
}

function decisionDeltaVerdict(input: {
  direction: "improved" | "regressed" | "unchanged";
  readinessChanged: boolean;
  sourceCountDelta: number;
  closedGaps: string[];
  closedBlockers: string[];
}) {
  const reasons = [
    input.direction === "improved" ? "trust improved" : undefined,
    input.direction === "regressed" ? "trust regressed" : undefined,
    input.readinessChanged ? "readiness changed" : undefined,
    input.sourceCountDelta > 0 ? "source coverage increased" : undefined,
    input.sourceCountDelta < 0 ? "source coverage decreased" : undefined,
    input.closedGaps.length ? "evidence gaps closed" : undefined,
    input.closedBlockers.length ? "blockers cleared" : undefined,
  ].filter((item): item is string => Boolean(item));

  if (input.direction === "regressed") {
    return `The newer run is weaker because ${joinSentence(reasons)}.`;
  }

  if (reasons.length > 0) {
    return `The newer run is stronger because ${joinSentence(reasons)}.`;
  }

  return "The newer run is comparable because readiness, trust, sources, and blockers stayed stable.";
}

function decisionDeltaNextStep(
  right: RunLike,
  remainingGaps: string[],
  remainingBlockers: string[],
  newBlockers: string[],
) {
  if (newBlockers.length > 0) {
    return `Resolve new blocker: ${newBlockers[0]}`;
  }

  if (remainingBlockers.length > 0) {
    return `Resolve blocker: ${remainingBlockers[0]}`;
  }

  if (remainingGaps.length > 0) {
    return `Attach evidence for: ${remainingGaps[0]}`;
  }

  if (right.readiness.status === "ready") {
    return "Review claims and export the decision package.";
  }

  return right.readiness.nextAction ?? "Inspect the changed artifacts before acting.";
}

function formatTrustMovementLabel(points: number) {
  if (points === 0) {
    return "No trust movement";
  }

  return `${points > 0 ? "+" : ""}${points} pts`;
}

function runBlockers(run: RunLike) {
  return uniqueStrings([
    ...run.trust.blockingIssues,
    ...(run.agents?.blockingIssues ?? []),
  ]);
}

function uniqueStrings(values: string[]) {
  const seen = new Set<string>();
  return values.filter((value) => {
    const trimmed = value.trim();
    const key = trimmed.toLowerCase();
    if (!trimmed || seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
}

function difference(left: string[], right: string[]) {
  const rightKeys = new Set(right.map((item) => item.toLowerCase()));
  return left.filter((item) => !rightKeys.has(item.toLowerCase()));
}

function plural(noun: string, count: number) {
  return count === 1 ? noun : `${noun}s`;
}

function joinSentence(items: string[]) {
  if (items.length <= 1) {
    return items[0] ?? "the core decision state stayed stable";
  }

  if (items.length === 2) {
    return `${items[0]} and ${items[1]}`;
  }

  return `${items.slice(0, -1).join(", ")}, and ${items[items.length - 1]}`;
}

function markdownList(items: string[]) {
  if (!items.length) {
    return "- none";
  }

  return items.map((item) => `- ${item.replace(/\s+/g, " ").trim()}`).join("\n");
}

function formatSignedNumber(value: number) {
  if (value === 0) {
    return "0";
  }

  return `${value > 0 ? "+" : ""}${value}`;
}

function formatEvidenceAnnotations(review: Awaited<ReturnType<StudioStore["getReview"]>>) {
  return review.summary.evidenceAnnotations
    .map((item) => `${item.evidenceId} (${item.noteCount})`)
    .join(", ") || "none";
}

function safeFilename(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 96) || "crux-run";
}

function compareValue(pathName: string, left: unknown, right: unknown) {
  if (JSON.stringify(left) === JSON.stringify(right)) {
    return [];
  }

  return [{ path: pathName, left, right }];
}

function selectArtifact(
  bundle: Awaited<ReturnType<CruxProvider["getRun"]>>,
  artifactName: ArtifactName,
): unknown {
  switch (artifactName) {
    case "memo":
      return bundle.memo;
    case "query-intake":
      return bundle.artifacts.queryIntake;
    case "claims":
      return bundle.artifacts.claims;
    case "evidence":
      return bundle.artifacts.evidence;
    case "contradictions":
      return bundle.artifacts.contradictions;
    case "uncertainty":
      return bundle.artifacts.uncertainty;
    case "source-inventory":
      return bundle.artifacts.sourceInventory;
    case "source-chunks":
      return bundle.artifacts.sourceChunks;
    case "agent-manifest":
      return bundle.artifacts.agentManifest;
    case "agents":
      return bundle.artifacts.agents;
    case "council":
      return bundle.artifacts.council;
    case "eval-report":
      return bundle.artifacts.evalReport;
    case "diagnostics":
      return bundle.artifacts.diagnostics;
    case "trace":
      return bundle.artifacts.trace;
  }
}
