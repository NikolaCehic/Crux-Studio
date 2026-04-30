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

  app.get<{ Params: { runId: string } }>("/api/runs/:runId", async (request, reply) => {
    try {
      return await provider.getRun(request.params.runId);
    } catch {
      return reply.code(404).send({ message: "Run not found." });
    }
  });

  return app;
}

