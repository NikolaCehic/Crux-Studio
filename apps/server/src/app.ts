import type { CruxProvider } from "@crux-studio/crux-provider";
import Fastify from "fastify";
import { z } from "zod";

const askSchema = z.object({
  question: z.string(),
  context: z.string().optional(),
  timeHorizon: z.string().optional(),
  sourcePolicy: z.enum(["offline", "hybrid", "web"]).optional(),
});

type BuildServerOptions = {
  provider: CruxProvider;
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

export function buildServer({ provider }: BuildServerOptions) {
  const app = Fastify({ logger: false });

  app.get("/health", async () => ({
    ok: true,
    service: "crux-studio-server",
  }));

  app.post("/api/runs/ask", async (request, reply) => {
    const parsed = askSchema.safeParse(request.body);

    if (!parsed.success || parsed.data.question.trim().length === 0) {
      return reply.code(400).send({ message: "Question is required." });
    }

    const run = await provider.ask({
      ...parsed.data,
      question: parsed.data.question.trim(),
      context: parsed.data.context?.trim(),
      timeHorizon: parsed.data.timeHorizon?.trim(),
    });

    return reply.code(201).send(run);
  });

  app.get("/api/runs", async () => provider.listRuns());

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
      return await provider.getRun(request.params.runId);
    } catch {
      return reply.code(404).send({ message: "Run not found." });
    }
  });

  return app;
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
