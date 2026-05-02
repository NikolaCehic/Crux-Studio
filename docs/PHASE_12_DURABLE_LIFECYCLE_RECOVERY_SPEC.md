# Phase 12: Durable Lifecycle Recovery

## Goal

Make local lifecycle jobs recoverable across Studio server restarts and preserve completed, failed, cancelled, and retryable job history.

## Optimality Hypothesis

This is the most optimal next phase because Phase 11 made runs observable while the server process was alive. The next production risk was losing job state during a restart, especially when a long-running Harness call was queued or running. Durable local recovery protects trust in the workbench without introducing hosted background infrastructure too early.

## Scope

- Persist lifecycle jobs in the existing Studio file store.
- Save every job transition:
  - queued
  - running
  - succeeded
  - failed
  - cancelled
  - retry-created
- Recover persisted job history when the server starts.
- Resume queued jobs after restart.
- Mark interrupted running jobs as failed and retryable after restart.
- Preserve completed, failed, cancelled, and retry-created jobs across restart.
- Keep the existing lifecycle API contract stable.
- Show retryable restart failures clearly in Studio.
- Expand local smoke to verify completed jobs remain inspectable in lifecycle history.

## Non-Goals

- No hosted queue.
- No multi-process job locking.
- No distributed worker.
- No process-level cancellation of an already-running provider call.
- No hosted database, auth, teams, permissions, object storage, or audit logs.

## Acceptance Criteria

- Server tests prove lifecycle jobs persist across app rebuilds using the same file store.
- Server tests prove queued jobs resume after restart.
- Server tests prove running jobs interrupted by restart become failed and retryable.
- Server tests prove retry-created and completed jobs remain listed after restart.
- Existing lifecycle endpoints remain compatible.
- Studio shows the recovered failure note in retryable lifecycle rows.
- Local smoke verifies source-backed lifecycle jobs are durably inspectable in job history.

## Validation

- Focused server lifecycle recovery test: `pnpm --filter @crux-studio/server test -- src/app.test.ts`.
- Focused web lifecycle UX test: `pnpm --filter @crux-studio/web test -- src/App.test.tsx`.
- Server typecheck: `pnpm --filter @crux-studio/server check`.
- Product verification gate: `pnpm verify`.
- Local smoke gate: `pnpm smoke:local` against `CRUX_STUDIO_PROVIDER=local`.
- Spec validation by checking implemented behavior against this file.

## Artifacts

- `apps/server/src/studio-store.ts`
- `apps/server/src/app.ts`
- `apps/server/src/app.test.ts`
- `apps/web/src/App.tsx`
- `apps/web/src/App.test.tsx`
- `scripts/smoke-local.mjs`
- `CHANGELOG.md`
- `README.md`
- `docs/ARCHITECTURE_SPEC.md`
- `docs/TRACE_LOG.md`
- `docs/PRODUCTIZATION_PLAN.md`
- `docs/PHASE_EXECUTION_PROTOCOL.md`
- `docs/assets/crux-studio-workbench.png`
- `docs/PHASE_12_DURABLE_LIFECYCLE_RECOVERY_SPEC.md`

## Phase Result

Status: done.

Validation completed:

- `pnpm --filter @crux-studio/server test -- src/app.test.ts` passed.
- `pnpm --filter @crux-studio/web test -- src/App.test.tsx` passed.
- `pnpm --filter @crux-studio/server check` passed.
- `pnpm verify` passed.
- `pnpm smoke:local` passed against the local Harness provider.

Smoke artifact:

- Job: `job-20260502182035-2bdcd33e`
- Run: `20260502T182035Z-how-should-a-support-team-reduce-first-response-`
- Status: `succeeded`
- Durable job status: `succeeded`
- Durable job history count: `1`
- Source count: `2`
- Source chunk count: `4`

Next phase:

- Phase 13: Evidence Gap Closure Loop.
