import { buildServer } from "./app";
import { createProvider } from "./provider";

const port = Number(process.env.CRUX_STUDIO_PORT ?? 4318);
const host = process.env.CRUX_STUDIO_HOST ?? "127.0.0.1";

const app = buildServer({
  provider: await createProvider(),
});

await app.listen({ host, port });

console.log(`Crux Studio server listening on http://${host}:${port}`);
