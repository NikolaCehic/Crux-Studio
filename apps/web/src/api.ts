import type { AskInput, RunSummary } from "@crux-studio/crux-provider";

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

