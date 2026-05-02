# Phase 11: Async Run Lifecycle

## Goal

Make Crux Studio submit and monitor runs through a visible lifecycle instead of making the workbench feel blocked while the Harness runs.

## Optimality Hypothesis

This is the most optimal next phase because the answer-first brief made completed runs readable. The next serious product risk is the period before completion: real Harness work can take long enough that users need queued, running, completed, failed, cancelled, and retry states that are visible and actionable.

## Scope

- Add an in-process server run-job queue.
- Add lifecycle API endpoints:
  - `POST /api/runs/jobs`
  - `GET /api/runs/jobs`
  - `GET /api/runs/jobs/:jobId`
  - `POST /api/runs/jobs/:jobId/cancel`
  - `POST /api/runs/jobs/:jobId/retry`
- Preserve `POST /api/runs/ask` for compatibility.
- Report provider capability `lifecycle`.
- Make Studio submit new questions through lifecycle jobs.
- Poll active jobs until they succeed, fail, or are cancelled.
- Load the completed run bundle automatically after job success.
- Show lifecycle state in the ask panel and inspector.
- Expose cancel for queued/running jobs.
- Expose retry for failed/cancelled jobs.
- Update local smoke to run the source-backed verification through the lifecycle API.

## Non-Goals

- No hosted background workers.
- No durable queue recovery after server restart.
- No true process-level cancellation of an already-running Harness provider call.
- No multi-user job permissions.
- No hosted audit log.

## Acceptance Criteria

- Server tests prove queued, running, succeeded, cancelled, failed, and retry states.
- Web workflow tests prove new runs submit through `/api/runs/jobs`.
- Users can see the active job status without losing the previous completed run.
- Successful jobs load the completed run into the answer-first workbench.
- Failed and cancelled jobs are retryable from the UI.
- The synchronous ask endpoint still works.
- Local smoke validates a real source-backed local Harness run through async lifecycle jobs.

## Validation

- Focused server lifecycle test: `pnpm --filter @crux-studio/server test -- src/app.test.ts`.
- Focused web workflow test: `pnpm --filter @crux-studio/web test -- src/App.test.tsx`.
- Product verification gate: `pnpm verify`.
- Local smoke gate: `pnpm smoke:local` against `CRUX_STUDIO_PROVIDER=local`.
- Spec validation by checking implemented behavior against this file.

## Artifacts

- `apps/server/src/app.ts`
- `apps/server/src/app.test.ts`
- `apps/web/src/api.ts`
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
- `docs/PHASE_11_ASYNC_RUN_LIFECYCLE_SPEC.md`

## Phase Result

Status: done.

Validation completed:

- `pnpm --filter @crux-studio/server test -- src/app.test.ts` passed.
- `pnpm --filter @crux-studio/web test -- src/App.test.tsx` passed.
- `pnpm --filter @crux-studio/web check` passed.
- `pnpm verify` passed.
- `pnpm smoke:local` passed against the local Harness provider.

Smoke artifact:

- Job: `job-20260502174340-41838b6d`
- Run: `20260502T174340Z-how-should-a-support-team-reduce-first-response-`
- Status: `succeeded`
- Source count: `2`
- Source chunk count: `4`

Next phase:

- Phase 12: Durable Lifecycle Recovery.
