import { MockCruxProvider, type CruxProvider } from "@crux-studio/crux-provider";
import { access } from "node:fs/promises";
import path from "node:path";
import { LocalCruxHarnessProvider } from "./providers/local-crux-provider";

export async function createProvider(env: NodeJS.ProcessEnv = process.env): Promise<CruxProvider> {
  if (env.CRUX_STUDIO_PROVIDER === "local") {
    return LocalCruxHarnessProvider.fromHarnessRoot(await resolveHarnessRoot(env));
  }

  return new MockCruxProvider();
}

async function resolveHarnessRoot(env: NodeJS.ProcessEnv): Promise<string> {
  const candidates = [
    env.CRUX_HARNESS_ROOT,
    path.resolve(process.cwd(), "../crux-harness"),
    path.resolve(process.cwd(), "../../../crux-harness"),
    path.resolve(process.cwd(), "../../crux-harness"),
  ].filter((value): value is string => Boolean(value));

  for (const candidate of candidates) {
    if (await hasPackageJson(candidate)) {
      return candidate;
    }
  }

  return candidates[0] ?? path.resolve(process.cwd(), "../crux-harness");
}

async function hasPackageJson(candidate: string): Promise<boolean> {
  try {
    await access(path.join(candidate, "package.json"));
    return true;
  } catch {
    return false;
  }
}
