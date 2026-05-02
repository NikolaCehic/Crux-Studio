import type {
  AskInput,
  CruxProvider,
  RunSummary,
  SourcePolicy,
} from "@crux-studio/crux-provider";
import { randomUUID } from "node:crypto";
import Fastify from "fastify";
import { z } from "zod";
import { createMemoryStudioStore, type StudioStore } from "./studio-store";

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

type RunJobStatus = "queued" | "running" | "succeeded" | "failed" | "cancelled";

type RunJob = {
  jobId: string;
  status: RunJobStatus;
  createdAt: string;
  updatedAt: string;
  startedAt?: string;
  finishedAt?: string;
  retryOf?: string;
  input: StudioAskInput;
  run?: RunSummary;
  error?: string;
};

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

  function createRunJob(input: StudioAskInput, retryOf?: string): RunJob {
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
    runQueue.push(job.jobId);
    setTimeout(() => void drainRunQueue(), 0);
    return job;
  }

  async function drainRunQueue() {
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

        try {
          const providerRun = await askProvider(job.input);
          if (runJobs.get(job.jobId)?.status !== "cancelled") {
            const linkedRun = await persistRunLink(job.input, providerRun);
            const finishedAt = now();
            job.status = "succeeded";
            job.run = linkedRun;
            job.finishedAt = finishedAt;
            job.updatedAt = finishedAt;
          }
        } catch (caught) {
          if (runJobs.get(job.jobId)?.status !== "cancelled") {
            const finishedAt = now();
            job.status = "failed";
            job.error = caught instanceof Error ? caught.message : "Run job failed.";
            job.finishedAt = finishedAt;
            job.updatedAt = finishedAt;
          }
        }
      }
    } finally {
      queueIsDraining = false;
    }
  }

  function listRunJobs() {
    return [...runJobs.values()].sort((left, right) =>
      right.createdAt.localeCompare(left.createdAt),
    );
  }

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

    return reply.code(202).send(createRunJob(input));
  });

  app.get("/api/runs/jobs", async () => listRunJobs());

  app.get<{ Params: { jobId: string } }>("/api/runs/jobs/:jobId", async (request, reply) => {
    const job = runJobs.get(request.params.jobId);
    if (!job) {
      return reply.code(404).send({ message: "Run job not found." });
    }

    return job;
  });

  app.post<{ Params: { jobId: string } }>(
    "/api/runs/jobs/:jobId/cancel",
    async (request, reply) => {
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

      return job;
    },
  );

  app.post<{ Params: { jobId: string } }>(
    "/api/runs/jobs/:jobId/retry",
    async (request, reply) => {
      const job = runJobs.get(request.params.jobId);
      if (!job) {
        return reply.code(404).send({ message: "Run job not found." });
      }

      if (job.status !== "failed" && job.status !== "cancelled") {
        return reply.code(409).send({ message: "Only failed or cancelled jobs can be retried." });
      }

      return reply.code(202).send(createRunJob(job.input, job.jobId));
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
      store.listProjectRuns(request.params.projectId, await provider.listRuns()),
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
    Promise.all(
      (await provider.listRuns()).map(async (run) =>
        enrichRun(run, await store.getRunLink(run.runId)),
      ),
    ),
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
      return compareRunBundles(left, right);
    } catch {
      return reply.code(404).send({ message: "Run not found." });
    }
  });

  return app;
}

type RunLike = Awaited<ReturnType<CruxProvider["getRun"]>>;

function enrichRun<T extends { runId: string }>(
  run: T,
  link: { projectId?: string; sourcePackId?: string } | undefined,
): T & { projectId?: string; sourcePackId?: string } {
  return link ? { ...run, projectId: link.projectId, sourcePackId: link.sourcePackId } : run;
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

function compareRunBundles(left: RunLike, right: RunLike) {
  const differences = [
    ...compareValue("runId", left.runId, right.runId),
    ...compareValue("question", left.question, right.question),
    ...compareValue("readiness.status", left.readiness.status, right.readiness.status),
    ...compareValue("trust.status", left.trust.status, right.trust.status),
    ...compareValue("agents.status", left.agents?.status, right.agents?.status),
    ...compareValue("agents.agentCount", left.agents?.agentCount, right.agents?.agentCount),
    ...compareValue("sourceWorkspace.sourceCount", left.sourceWorkspace?.sourceCount, right.sourceWorkspace?.sourceCount),
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
    trustMovement: Number((right.trust.confidence - left.trust.confidence).toFixed(2)),
    differences,
    summary: {
      differenceCount: differences.length,
      leftTrust: left.trust.status,
      rightTrust: right.trust.status,
      leftReadiness: left.readiness.status,
      rightReadiness: right.readiness.status,
    },
  };
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
