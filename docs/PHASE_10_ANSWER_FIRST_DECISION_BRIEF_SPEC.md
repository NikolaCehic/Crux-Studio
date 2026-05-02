# Phase 10: Answer-First Decision Brief

## Goal

Make Studio open every run on a readable decision brief instead of forcing users to begin in raw artifacts or the full memo.

## Optimality Hypothesis

This is the most optimal next phase because source-backed arbitrary runs now work. The highest remaining product friction is first-read usability: a user should immediately see the practical answer, readiness, blockers, and next action, while still being one click from the full memo, claims, sources, agents, diagnostics, and trace.

## Scope

- Add a first artifact tab named `Brief`.
- Make `Brief` the default active tab for latest-run preload, new runs, replayed runs, and history selection.
- Render an answer-first decision brief with:
  - recommendation
  - optional executive summary
  - readiness state
  - trust confidence
  - source and chunk counts
  - next action
  - trust blockers
- Keep the full memo inspectable as a readable Markdown-like tab, not raw JSON text.
- Add direct actions from the brief to the full memo, claims, and sources.
- Keep review, replay, compare, export, and raw artifact inspection unchanged.

## Non-Goals

- No hosted run lifecycle.
- No streaming progress UI.
- No new provider contract fields.
- No model-generated rewrite of memo content.
- No hosted sharing or collaboration.

## Acceptance Criteria

- Returning users land on a useful answer-first workbench.
- New, replayed, and selected runs open on the `Brief` tab.
- The brief shows the recommendation before diagnostic detail.
- The brief shows readiness, trust, source, next-action, and blocker context.
- The full memo remains one click away and renders as readable content.
- Focused web workflow coverage proves the answer-first behavior.
- Full verification and local smoke gates pass.

## Validation

- Focused web E2E-style test: `pnpm --filter @crux-studio/web test -- src/App.test.tsx`.
- Product verification gate: `pnpm verify`.
- Local smoke gate: `pnpm smoke:local` against `CRUX_STUDIO_PROVIDER=local`.
- Spec validation by checking implemented behavior against this file.

## Artifacts

- `apps/web/src/App.tsx`
- `apps/web/src/App.test.tsx`
- `CHANGELOG.md`
- `README.md`
- `docs/assets/crux-studio-workbench.png`
- `docs/TRACE_LOG.md`
- `docs/PRODUCTIZATION_PLAN.md`
- `docs/PHASE_EXECUTION_PROTOCOL.md`
- `docs/PHASE_10_ANSWER_FIRST_DECISION_BRIEF_SPEC.md`

## Phase Result

Status: done.

Validation:

- `pnpm --filter @crux-studio/web test -- src/App.test.tsx` passed.
- `pnpm verify` passed.
- `pnpm smoke:local` passed against the local Harness provider.
- Primary README screenshot was refreshed from the running v0.7 Studio UI.

Next phase:

- Phase 11: Async Run Lifecycle.
