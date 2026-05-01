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

export type RunComparison = {
  leftRunId: string;
  rightRunId: string;
  trustMovement: number;
  differences: Array<{ path: string; left: unknown; right: unknown }>;
};

export type ProviderRegistry = {
  providers: Array<{
    id: string;
    status: string;
    capabilities: string[];
  }>;
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
