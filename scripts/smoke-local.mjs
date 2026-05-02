const serverUrl = process.env.CRUX_STUDIO_SERVER_URL ?? "http://127.0.0.1:4318";
const webUrl = process.env.CRUX_STUDIO_WEB_URL ?? "http://127.0.0.1:5173";

async function getJson(url) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`${url} returned ${response.status}`);
  }
  return response.json();
}

async function postJson(url, body) {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    throw new Error(`${url} returned ${response.status}`);
  }
  return response.json();
}

async function waitForJob(jobId) {
  for (let attempt = 0; attempt < 60; attempt += 1) {
    const job = await getJson(`${serverUrl}/api/runs/jobs/${jobId}`);
    if (job.status === "succeeded") {
      return job;
    }

    if (job.status === "failed" || job.status === "cancelled") {
      throw new Error(`Lifecycle job ${jobId} ended with ${job.status}: ${job.error ?? "no error"}`);
    }

    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  throw new Error(`Lifecycle job ${jobId} did not finish in time.`);
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
  const stamp = new Date().toISOString().replace(/[-:.]/g, "").slice(0, 15);
  const project = await postJson(`${serverUrl}/api/projects`, {
    name: `Local smoke ${stamp}`,
  });
  const sourcePack = await postJson(`${serverUrl}/api/source-packs`, {
    projectId: project.id,
    name: `Source bridge smoke ${stamp}`,
    files: [
      {
        name: "queue-notes.md",
        content: "# Queue notes\n\nSupport tier handoffs create preventable first-response delays on Mondays.",
      },
      {
        name: "response-times.csv",
        content: "week,first_response_minutes\n1,82\n2,71\n3,64\n",
      },
    ],
  });
  const sourceBackedJob = await postJson(`${serverUrl}/api/runs/jobs`, {
    projectId: project.id,
    sourcePackId: sourcePack.id,
    question: "How should a support team reduce first-response time without hiring more agents this month?",
    context: "Use the attached queue notes and response-time sample as the source pack.",
    timeHorizon: "30 days",
    sourcePolicy: "offline",
  });
  const completedSourceBackedJob = await waitForJob(sourceBackedJob.jobId);
  const sourceBackedRun = completedSourceBackedJob.run;
  if (!sourceBackedRun?.runId) {
    throw new Error(`Lifecycle job ${sourceBackedJob.jobId} did not return a run.`);
  }
  const sourceBackedBundle = await getJson(`${serverUrl}/api/runs/${sourceBackedRun.runId}`);
  const sourceCount = sourceBackedBundle.sourceWorkspace?.sourceCount ?? 0;
  const sourceChunkCount = sourceBackedBundle.sourceWorkspace?.sourceChunkCount ?? 0;

  if (sourceCount < 2 || sourceChunkCount < 2) {
    throw new Error(`Source-backed run did not preserve source inventory/chunks: ${sourceCount}/${sourceChunkCount}`);
  }

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
    sourceBackedRun: {
      runId: sourceBackedRun.runId,
      jobId: sourceBackedJob.jobId,
      jobStatus: completedSourceBackedJob.status,
      readiness: sourceBackedRun.readiness?.status,
      sourceCount,
      sourceChunkCount,
    },
  }, null, 2));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
