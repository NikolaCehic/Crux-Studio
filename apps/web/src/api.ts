import type { AskInput, RunBundle, RunSummary } from "@crux-studio/crux-provider";

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

export async function listRuns(): Promise<RunSummary[]> {
  const response = await fetch("/api/runs");

  if (!response.ok) {
    throw new Error("Run history failed to load.");
  }

  return (await response.json()) as RunSummary[];
}

export async function getRun(runId: string): Promise<RunBundle> {
  const response = await fetch(`/api/runs/${runId}`);

  if (!response.ok) {
    throw new Error("Run bundle failed to load.");
  }

  return (await response.json()) as RunBundle;
}
