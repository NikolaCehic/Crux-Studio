# Phase 13: Evidence Gap Closure Loop

## Goal

Turn missing evidence, trust blockers, and source-related agent next actions into explicit tasks that can be resolved with source material, rerun through the lifecycle queue, and compared against the original run.

## Optimality Hypothesis

This is the most optimal next phase because Phase 12 made lifecycle execution reliable across restarts. The next user-value gap was practical improvement: Studio could show that a run needed evidence, but it did not yet convert that warning into a concrete source task and rerun path. Evidence closure makes the trust loop actionable.

## Scope

- Add durable evidence task state to the Studio store.
- Generate evidence tasks from:
  - source workspace missing evidence
  - trust blocking issues
  - agent blocking issues
  - source-related agent next actions
- Add evidence task API endpoints:
  - `GET /api/runs/:runId/evidence-tasks`
  - `POST /api/runs/:runId/evidence-tasks/:taskId/resolve`
- Resolve an evidence task by creating a source pack from supplied source content.
- Mark the task resolved with source-pack and rerun-job provenance.
- Start a lifecycle rerun using the new source pack.
- Let Studio show open and resolved evidence tasks in the decision brief, Sources tab, and right inspector.
- Let Studio resolve an open task with the current source note from the ask panel.
- Expand smoke to close a real evidence task, rerun, and compare the improved run.

## Non-Goals

- No hosted task assignment.
- No team workflow.
- No model-generated source fetching.
- No automatic web research.
- No multi-source task planner beyond the current source-note resolution path.

## Acceptance Criteria

- Server tests prove evidence gaps become durable tasks.
- Server tests prove task resolution creates a source pack.
- Server tests prove resolution starts a lifecycle rerun.
- Server tests prove the improved run can be compared against the original run.
- Web tests prove users can see evidence tasks and invoke task resolution from Studio.
- Local smoke proves evidence closure works against the local Harness provider.

## Validation

- Focused server product workflow test: `pnpm --filter @crux-studio/server test -- src/product-workflow.test.ts`.
- Focused web workflow test: `pnpm --filter @crux-studio/web test -- src/App.test.tsx`.
- Focused typechecks:
  - `pnpm --filter @crux-studio/server check`
  - `pnpm --filter @crux-studio/web check`
- Product verification gate: `pnpm verify`.
- Local smoke gate: `pnpm smoke:local` against `CRUX_STUDIO_PROVIDER=local`.
- Spec validation by checking implemented behavior against this file.

## Artifacts

- `apps/server/src/studio-store.ts`
- `apps/server/src/app.ts`
- `apps/server/src/product-workflow.test.ts`
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
- `docs/PHASE_13_EVIDENCE_GAP_CLOSURE_SPEC.md`

## Phase Result

Status: done.

Validation completed:

- `pnpm --filter @crux-studio/server test -- src/product-workflow.test.ts` passed.
- `pnpm --filter @crux-studio/web test -- src/App.test.tsx` passed.
- `pnpm --filter @crux-studio/server check` passed.
- `pnpm --filter @crux-studio/web check` passed.
- `pnpm verify` passed.
- `pnpm smoke:local` passed against the local Harness provider.

Smoke artifacts:

- Source-backed job: `job-20260502184802-57219ed2`
- Source-backed run: `20260502T184802Z-how-should-a-support-team-reduce-first-response-`
- Evidence base run: `20260502T184802Z-what-evidence-would-make-the-support-first-respo`
- Evidence task: `task-6c2039cd-12-adversarial-scenario-remove-evidence`
- Evidence closure rerun job: `job-20260502184803-5a02067b`
- Evidence closure rerun: `20260502T184803Z-what-evidence-would-make-the-support-first-respo`
- Resolved task status: `resolved`
- Rerun source count: `1`
- Comparison differences: `5`

Next phase:

- Phase 14: Decision Delta Report.
