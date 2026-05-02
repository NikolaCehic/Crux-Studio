# Crux Studio Architecture Spec

## Architecture Thesis

Crux Studio must be a separate codebase that consumes Crux Harness through a provider boundary.

The UI should not import harness internals directly in browser code. The server should own harness integration, file-system access, source-pack creation, and run artifact loading.

## Recommended Stack

Frontend:

- React
- TypeScript
- Vite
- TanStack Query
- React Router
- Zustand or reducer state for local UI state
- CSS modules or Tailwind with strict design tokens

Server:

- Node.js
- Fastify
- TypeScript
- Zod for API validation
- File-system persistence for v0.1

Testing:

- Vitest for units
- Playwright for UI journeys
- Node test or Vitest for provider contract tests

Package manager:

- pnpm workspace

## Codebase Shape

```text
crux-studio/
  apps/
    web/
      src/
        app/
        routes/
        components/
        features/
        styles/
    server/
      src/
        index.ts
        routes/
        providers/
        services/
  packages/
    crux-provider/
      src/
        types.ts
        contract.ts
    ui/
      src/
        components/
        tokens/
  docs/
```

## Harness Integration

Best path:

```text
apps/server
-> packages/crux-provider
-> LocalCruxHarnessProvider
-> crux-harness package
```

Local development dependency:

```json
{
  "crux-harness": "file:../crux-harness"
}
```

Provider contract:

```ts
type CruxProvider = {
  ask(input: AskInput): Promise<RunSummary>;
  getRun(runId: string): Promise<RunBundle>;
  listRuns(): Promise<RunSummary[]>;
  getArtifact(runId: string, artifact: string): Promise<unknown>;
  createReport(runId: string): Promise<{ path: string }>;
  reviewClaim(input: ClaimReviewInput): Promise<ReviewSummary>;
  annotateEvidence(input: EvidenceAnnotationInput): Promise<ReviewSummary>;
  replay(runId: string): Promise<RunSummary>;
  compare(leftRunId: string, rightRunId: string): Promise<RunComparison>;
};
```

Why provider boundary:

- keeps harness code out of browser
- allows local package provider now
- allows hosted API provider later
- enables mocked provider for UI tests
- avoids coupling Studio to private harness file paths

## Required Harness Support

The cleanest implementation needs one small harness hardening slice:

- expose public package exports for:
  - `runQuery`
  - `inspectRun`
  - `loadRunArtifactBundle`
  - `writeRunReport`
  - review helpers
  - replay/diff helpers
- optionally add `POST /queries` to the Crux API

Until those exports exist, Studio can use a local adapter with carefully isolated imports. The adapter should be the only place allowed to touch harness internals.

## Studio Server API

Initial endpoints:

```text
POST   /api/runs/ask
POST   /api/runs/jobs
GET    /api/runs/jobs
GET    /api/runs/jobs/:jobId
POST   /api/runs/jobs/:jobId/cancel
POST   /api/runs/jobs/:jobId/retry
GET    /api/runs/:runId/evidence-tasks
POST   /api/runs/:runId/evidence-tasks/:taskId/resolve
GET    /api/runs
GET    /api/runs/:runId
GET    /api/runs/:runId/artifacts/:artifact
POST   /api/runs/:runId/report
POST   /api/runs/:runId/review/claim
POST   /api/runs/:runId/review/evidence
POST   /api/runs/:runId/replay
POST   /api/runs/compare
```

`POST /api/runs/compare` returns the raw changed paths plus a decision delta object with verdict, trust movement, readiness movement, source movement, evidence gap movement, blocker movement, notable changes, and next step.

## Run Bundle Shape For UI

The UI should request a normalized run bundle:

```ts
type StudioRunBundle = {
  run: RunSummary;
  queryIntake?: QueryIntake;
  memo: string;
  claims: ClaimsArtifact;
  evidence: EvidenceArtifact;
  contradictions: ContradictionsArtifact;
  uncertainty: UncertaintyArtifact;
  evalReport: EvalReport;
  trace: TraceEvent[];
  review?: ReviewArtifact;
  relationships: {
    evidenceByClaimId: Record<string, string[]>;
    claimsByEvidenceId: Record<string, string[]>;
  };
};
```

## Persistence

v0.1:

- use harness `runs/` folder as source of truth
- Studio server indexes run directories
- Studio state is persisted in `.studio/studio-state.json`
- projects, source packs, run links, review state, lifecycle job history, and evidence closure tasks are local durable state
- queued lifecycle jobs recover after local server restart
- interrupted running lifecycle jobs become failed and retryable after local server restart
- evidence closure task resolution creates a local source pack and starts a lifecycle rerun
- run comparison creates a decision delta report for before and after evidence closure movement
- no hosted database yet

v0.2:

- add SQLite for projects, run metadata, source pack metadata, and user annotations

Deferred beyond this Studio stage:

- hosted database
- external artifact storage
- queue-backed multi-user run execution

These are intentionally not part of the current Crux Studio roadmap.

## Security And Safety

Even for v0.1:

- server validates artifact names
- browser cannot request arbitrary file paths
- source uploads are constrained to project directories
- high-stakes query flags are surfaced visibly
- source-free runs keep `warn` or `fail` visible

## Optimal Architecture Decision

Do not start with Next.js unless server/UI co-location becomes essential.

Vite React plus Fastify gives clearer separation:

- web is pure product UI
- server is integration boundary
- harness remains independent
- provider adapters stay testable

This is the most optimal architecture because it preserves Crux Harness as the core engine while letting Studio become a real product surface.
