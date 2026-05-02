const serverUrl = process.env.CRUX_STUDIO_SERVER_URL ?? "http://127.0.0.1:4318";
const webUrl = process.env.CRUX_STUDIO_WEB_URL ?? "http://127.0.0.1:5173";

async function getJson(url) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`${url} returned ${response.status}`);
  }
  return response.json();
}

async function main() {
  const [health, providers, demos, runs] = await Promise.all([
    getJson(`${serverUrl}/health`),
    getJson(`${serverUrl}/api/providers`),
    getJson(`${serverUrl}/api/demos`),
    getJson(`${serverUrl}/api/runs`),
    fetch(webUrl).then((response) => {
      if (!response.ok) {
        throw new Error(`${webUrl} returned ${response.status}`);
      }
      return response.text();
    }),
  ]);

  const provider = providers.providers?.[0];
  const latestAgentRun = runs.find((run) => run.agents);

  console.log(JSON.stringify({
    ok: health.ok === true,
    provider: provider?.id ?? "unknown",
    capabilities: provider?.capabilities ?? [],
    demoCount: demos.demos?.length ?? 0,
    runCount: runs.length,
    latestAgentRun: latestAgentRun
      ? {
          runId: latestAgentRun.runId,
          readiness: latestAgentRun.readiness?.status,
          agents: latestAgentRun.agents?.agentCount,
        }
      : null,
  }, null, 2));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
