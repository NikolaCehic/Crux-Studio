import type { AskInput, RunBundle, RunSummary } from "@crux-studio/crux-provider";

export type StudioProject = {
  id: string;
  name: string;
  runIds: string[];
  sourcePackIds: string[];
};

export type StudioSourcePack = {
  id: string;
  projectId: string;
  name: string;
  sourceCount: number;
  files: Array<{ id: string; name: string; content?: string; contentHash?: string }>;
};

export type StudioReview = {
  runId: string;
  summary: {
    approvedClaims: string[];
    rejectedClaims: string[];
    evidenceAnnotations: Array<{ evidenceId: string; noteCount: number }>;
  };
};

export type StudioEvidenceTask = {
  taskId: string;
  runId: string;
  projectId?: string;
  status: "open" | "resolved";
  kind: "missing_evidence" | "trust_blocker" | "agent_blocker" | "agent_next_action";
  title: string;
  detail: string;
  createdAt: string;
  updatedAt: string;
  resolvedAt?: string;
  resolvedBySourcePackId?: string;
  rerunJobId?: string;
  resolutionNote?: string;
};

export type EvidenceTaskResolution = {
  task: StudioEvidenceTask;
  sourcePack: StudioSourcePack;
  job: RunJob;
};

export type RunComparison = {
  leftRunId: string;
  rightRunId: string;
  trustMovement: number;
  differences: Array<{ path: string; left: unknown; right: unknown }>;
  delta: DecisionDeltaReport;
  summary?: {
    differenceCount: number;
    leftTrust: string;
    rightTrust: string;
    leftReadiness?: string;
    rightReadiness?: string;
  };
};

export type DecisionDeltaReport = {
  verdict: string;
  trustMovementLabel: string;
  readinessMovement: {
    from: string;
    to: string;
    changed: boolean;
  };
  trustMovement: {
    fromStatus: string;
    toStatus: string;
    fromConfidence: number;
    toConfidence: number;
    points: number;
    direction: "improved" | "regressed" | "unchanged";
  };
  sourceMovement: {
    sourceCountDelta: number;
    sourceChunkDelta: number;
    closedGaps: string[];
    newGaps: string[];
    remainingGaps: string[];
  };
  blockerMovement: {
    closedBlockers: string[];
    newBlockers: string[];
    remainingBlockers: string[];
  };
  notableChanges: string[];
  nextStep: string;
};

export type ProviderRegistry = {
  providers: Array<{
    id: string;
    status: string;
    capabilities: string[];
  }>;
};

export type DemoQuestion = {
  id: string;
  title: string;
  question: string;
  context: string;
  timeHorizon: string;
  sourcePolicy: "offline" | "hybrid" | "web";
};

export type RunJobStatus = "queued" | "running" | "succeeded" | "failed" | "cancelled";

export type RunJob = {
  jobId: string;
  status: RunJobStatus;
  createdAt: string;
  updatedAt: string;
  startedAt?: string;
  finishedAt?: string;
  retryOf?: string;
  input: AskInput;
  run?: RunSummary;
  error?: string;
};

export async function askCrux(input: AskInput): Promise<RunSummary> {
  const response = await fetch("/api/runs/ask", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as { message?: string } | null;
    throw new Error(body?.message ?? "Crux run failed.");
  }

  return (await response.json()) as RunSummary;
}

export async function startRunJob(input: AskInput): Promise<RunJob> {
  return postJson("/api/runs/jobs", input, "Run job failed to start.");
}

export async function listRunJobs(): Promise<RunJob[]> {
  return getJson("/api/runs/jobs", "Run lifecycle failed to load.");
}

export async function getRunJob(jobId: string): Promise<RunJob> {
  return getJson(`/api/runs/jobs/${jobId}`, "Run job failed to load.");
}

export async function cancelRunJob(jobId: string): Promise<RunJob> {
  return postJson(`/api/runs/jobs/${jobId}/cancel`, {}, "Run job cancellation failed.");
}

export async function retryRunJob(jobId: string): Promise<RunJob> {
  return postJson(`/api/runs/jobs/${jobId}/retry`, {}, "Run job retry failed.");
}

export async function listProjects(): Promise<StudioProject[]> {
  return getJson("/api/projects", "Projects failed to load.");
}

export async function createProject(name: string): Promise<StudioProject> {
  return postJson("/api/projects", { name }, "Project creation failed.");
}

export async function listSourcePacks(projectId?: string): Promise<StudioSourcePack[]> {
  const query = projectId ? `?projectId=${encodeURIComponent(projectId)}` : "";
  return getJson(`/api/source-packs${query}`, "Source packs failed to load.");
}

export async function createSourcePack(input: {
  projectId: string;
  name: string;
  files: Array<{ name: string; content: string }>;
}): Promise<StudioSourcePack> {
  return postJson("/api/source-packs", input, "Source pack creation failed.");
}

export async function listProviders(): Promise<ProviderRegistry> {
  return getJson("/api/providers", "Provider registry failed to load.");
}

export async function listDemos(): Promise<DemoQuestion[]> {
  const result = await getJson<{ demos: DemoQuestion[] }>("/api/demos", "Demo questions failed to load.");
  return result.demos;
}

export async function reviewClaim(
  runId: string,
  input: {
    claimId: string;
    status: "approved" | "rejected";
    reviewer: string;
    rationale: string;
  },
): Promise<StudioReview> {
  return postJson(`/api/runs/${runId}/review/claims`, input, "Claim review failed.");
}

export async function annotateEvidence(
  runId: string,
  input: {
    evidenceId: string;
    reviewer: string;
    note: string;
  },
): Promise<StudioReview> {
  return postJson(`/api/runs/${runId}/review/evidence`, input, "Evidence annotation failed.");
}

export async function listEvidenceTasks(runId: string): Promise<StudioEvidenceTask[]> {
  return getJson(`/api/runs/${runId}/evidence-tasks`, "Evidence tasks failed to load.");
}

export async function resolveEvidenceTask(
  runId: string,
  taskId: string,
  input: {
    sourcePackName?: string;
    sourceName?: string;
    sourceContent: string;
    note?: string;
  },
): Promise<EvidenceTaskResolution> {
  return postJson(
    `/api/runs/${runId}/evidence-tasks/${taskId}/resolve`,
    input,
    "Evidence task resolution failed.",
  );
}

export async function replayRun(runId: string): Promise<RunSummary> {
  return postJson(`/api/runs/${runId}/replay`, {}, "Replay failed.");
}

export async function compareRuns(leftRunId: string, rightRunId: string): Promise<RunComparison> {
  return postJson(
    "/api/runs/compare",
    { leftRunId, rightRunId },
    "Run comparison failed.",
  );
}

export async function listRuns(): Promise<RunSummary[]> {
  const response = await fetch("/api/runs");

  if (!response.ok) {
    throw new Error("Run history failed to load.");
  }

  return (await response.json()) as RunSummary[];
}

export async function getRun(runId: string): Promise<RunBundle> {
  return getJson(`/api/runs/${runId}`, "Run bundle failed to load.");
}

async function getJson<T>(url: string, failureMessage: string): Promise<T> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(failureMessage);
  }

  return (await response.json()) as T;
}

async function postJson<T>(url: string, body: unknown, failureMessage: string): Promise<T> {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    throw new Error(failureMessage);
  }

  return (await response.json()) as T;
}
