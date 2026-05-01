import type { CruxProvider } from "@crux-studio/crux-provider";
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

const artifactNames = [
  "memo",
  "query-intake",
  "claims",
  "evidence",
  "contradictions",
  "uncertainty",
  "council",
  "diagnostics",
  "trace",
] as const;

type ArtifactName = (typeof artifactNames)[number];

const artifactNameSet = new Set<string>(artifactNames);

export function buildServer({
  provider,
  store = createMemoryStudioStore(),
  providerId = "mock",
}: BuildServerOptions) {
  const app = Fastify({ logger: false });

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
          "sources",
          "review",
          "replay",
          "compare",
          "export",
        ],
      },
    ],
  }));

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
    const parsed = askSchema.safeParse(request.body);

    if (!parsed.success || parsed.data.question.trim().length === 0) {
      return reply.code(400).send({ message: "Question is required." });
    }

    const sourcePack = parsed.data.sourcePackId
      ? await store.getSourcePack(parsed.data.sourcePackId)
      : undefined;

    const run = await provider.ask({
      ...parsed.data,
      question: parsed.data.question.trim(),
      context: parsed.data.context?.trim(),
      timeHorizon: parsed.data.timeHorizon?.trim(),
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

    if (parsed.data.projectId || parsed.data.sourcePackId) {
      await store.linkRun({
        runId: run.runId,
        projectId: parsed.data.projectId,
        sourcePackId: parsed.data.sourcePackId,
      });
    }

    return reply.code(201).send(enrichRun(run, await store.getRunLink(run.runId)));
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

function compareRunBundles(left: RunLike, right: RunLike) {
  const differences = [
    ...compareValue("question", left.question, right.question),
    ...compareValue("trust.status", left.trust.status, right.trust.status),
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
    case "council":
      return bundle.artifacts.council;
    case "diagnostics":
      return bundle.artifacts.diagnostics;
    case "trace":
      return bundle.artifacts.trace;
  }
}
