# Trace Log

## 2026-05-03T12:15:00+02:00 - Phase 20 Guided Remediation Execution

Intent:

- Implement the next productization phase under the required phase contract: full implementation, E2E-style workflow coverage, smoke validation, spec validation, durable artifacts, and next-phase handoff.
- Turn remediation-plan CTAs into guided execution flows that preserve action context and show whether the gate moved after the action started.
- Apply the Impeccable product UI lens: `IMPECCABLE_PREFLIGHT: context=pass product=pass command_reference=pass shape=not_required image_gate=skipped:Phase 20 extends an existing workbench panel with guided action execution, no separate visual concept or generated imagery is needed mutation=open`.

Implemented:

- Added active guided remediation state in the Studio web app.
- Added an inline `Guided remediation` panel with active action, priority, action type, start time, and gate-watch status.
- Routed source and evidence actions into source intake with prefilled source-pack name and evidence-gap context.
- Routed review actions into Claims, rerun actions into replay, comparison actions into the latest-run comparison flow, blocker actions into Sources or Diagnostics, and export actions through the existing dossier link.
- Added remediation plan signature comparison so the guide reports gate movement after a refreshed project state changes the plan.
- Cleared active guides on project change and added a manual clear action.
- Added focused web workflow tests for evidence guidance, gate movement, claim review routing, replay, and comparison.
- Added `docs/PHASE_20_GUIDED_REMEDIATION_EXECUTION_SPEC.md`.
- Updated README, changelog, product context, product spec, UX spec, architecture spec, demo guide, productization plan, and phase execution protocol.

Verification:

- Focused web workflow test passed: `pnpm --filter @crux-studio/web test -- src/App.test.tsx`.
- Focused web typecheck passed: `pnpm --filter @crux-studio/web check`.
- Full Studio verification passed: `pnpm verify`.
- Local smoke passed against the local Crux Harness provider: `pnpm smoke:local`.
- Final source-backed smoke job: `job-20260503100842-6b0a1143`.
- Final source-backed smoke run: `20260503T100842Z-how-should-a-support-team-reduce-first-response-`.
- Final evidence base run: `20260503T100842Z-what-evidence-would-make-the-support-first-respo`.
- Final evidence task: `task-d154e0b2-12-adversarial-scenario-remove-evidence`.
- Final evidence closure rerun job: `job-20260503100843-d59f3950`.
- Final evidence closure rerun: `20260503T100843Z-what-evidence-would-make-the-support-first-respo`.
- Final evidence closure result: task `resolved`, rerun source count `1`, delta direction `improved`, closed gap count `1`, remaining blocker count `0`, comparison differences `7`, delta package bytes `6439`, lineage event count `20`, lineage delta count `1`, dossier approved claims `1`, dossier source count `1`, dossier package bytes `6146`, acceptance status `needs_review`, acceptance score `0.91`, acceptance checks `6 pass`, `2 warn`, `0 fail`, remediation status `action_required`, remediation actions `2`, remediation blocking actions `0`, remediation warning actions `2`.
- Refreshed README screenshots:
  - `docs/assets/crux-studio-workbench.png`
  - `docs/assets/crux-studio-review-compare.png`

Result:

- Phase 20 is done.
- Next phase: Phase 21 Remediation Evidence Ledger.

## 2026-05-03T11:38:00+02:00 - Phase 19 Acceptance Gate Remediation Planner

Intent:

- Implement the next productization phase under the required phase contract: full implementation, E2E/smoke tests, spec validation, artifacts, and next-phase handoff.
- Turn acceptance-gate warnings and failures into a prioritized action plan that tells the user exactly how to move a dossier toward acceptance.

Implemented:

- Added `GET /api/projects/:projectId/remediation-plan`.
- Added `remediation-plan` to provider capability reporting.
- Added server-side remediation actions for source attachment, evidence closure, human review, rerun comparison, blocker resolution, run regeneration, and dossier export.
- Added deterministic remediation sorting by priority, status severity, and gate-check order.
- Added complete-state export guidance for accepted dossiers.
- Added Studio API types and fetch helper for project remediation plans.
- Added a Studio `Remediation plan` workbench section with status, action counts, priorities, rationale, evidence-gap context, and CTAs.
- Added the Plan navigation item.
- Refreshed remediation state after project selection and every project-changing action already used for lineage, dossiers, and acceptance gates.
- Hardened project decision-state loading so dossiers, gates, and remediation plans load directly from linked project run IDs instead of scanning every Harness run.
- Expanded local smoke to validate remediation status and action coverage after the real evidence-closure acceptance check.
- Added `docs/PHASE_19_ACCEPTANCE_GATE_REMEDIATION_PLANNER_SPEC.md`.
- Updated README, changelog, architecture spec, productization plan, and phase execution protocol.

Verification:

- Failing server, web, and smoke expectations were written first and passed after implementation.
- Focused server workflow test passed: `pnpm --filter @crux-studio/server test -- product-workflow`.
- Focused web workflow test passed: `pnpm --filter @crux-studio/web test -- App.test.tsx`.
- Project decision-state hardening passed focused server workflow and typecheck.
- Full Studio verification passed: `pnpm verify`.
- Local smoke passed after restarting the local stack on the final code: `pnpm smoke:local`.
- Final source-backed smoke job: `job-20260503093748-206e7146`.
- Final source-backed smoke run: `20260503T093748Z-how-should-a-support-team-reduce-first-response-`.
- Final evidence base run: `20260503T093748Z-what-evidence-would-make-the-support-first-respo`.
- Final evidence task: `task-fc885dd9-12-adversarial-scenario-remove-evidence`.
- Final evidence closure rerun job: `job-20260503093749-4f8d5203`.
- Final evidence closure rerun: `20260503T093749Z-what-evidence-would-make-the-support-first-respo`.
- Final evidence closure result: task `resolved`, rerun source count `1`, delta direction `improved`, closed gap count `1`, remaining blocker count `0`, comparison differences `7`, delta package bytes `6439`, lineage event count `20`, lineage delta count `1`, dossier approved claims `1`, dossier source count `1`, dossier package bytes `6146`, acceptance status `needs_review`, acceptance score `0.91`, acceptance checks `6 pass`, `2 warn`, `0 fail`, remediation status `action_required`, remediation actions `2`, remediation blocking actions `0`, remediation warning actions `2`.
- Refreshed README screenshots:
  - `docs/assets/crux-studio-workbench.png`
  - `docs/assets/crux-studio-review-compare.png`

Result:

- Phase 19 is done.
- Next phase: Phase 20 Guided Remediation Execution.

## 2026-05-03T10:51:00+02:00 - Phase 18 Decision Record Acceptance Gate

Intent:

- Implement the next productization phase under the required phase contract: full implementation, E2E/smoke tests, spec validation, artifacts, and next-phase handoff.
- Make the latest decision record explicitly actionable with a derived acceptance gate that says whether the dossier is ready to share, needs review, or is blocked.

Implemented:

- Added `GET /api/projects/:projectId/acceptance-gate`.
- Added `acceptance-gate` to provider capability reporting.
- Added server-side acceptance checks for trust gate, readiness, source coverage, missing evidence, human review, lineage movement, blockers, and export package availability.
- Added weighted gate scoring and recommended actions for `accepted`, `needs_review`, and `blocked` outcomes.
- Added Studio API types and fetch helper for project acceptance gates.
- Added a Studio `Acceptance gate` workbench section with gate label, score, pass totals, recommended action, and checklist details.
- Added the Gate navigation item.
- Refreshed project acceptance state after project selection and every project-changing action already used for lineage and dossiers.
- Hardened local file-store reads and writes with serialized transactions after smoke exposed a concurrent persistence race between project, source-pack, job, and evidence-task writes.
- Deferred evidence-closure job enqueueing until after the task stores its rerun job id, and added source-pack fallback matching for lineage rerun recovery.
- Expanded local smoke to validate the acceptance gate after the real evidence-closure dossier export.
- Added `docs/PHASE_18_DECISION_RECORD_ACCEPTANCE_GATE_SPEC.md`.
- Updated README, changelog, architecture spec, productization plan, and phase execution protocol.

Verification:

- Failing server and web expectations were written first and passed after implementation.
- Focused server workflow test passed: `pnpm --filter @crux-studio/server test -- product-workflow`.
- Focused web workflow test passed: `pnpm --filter @crux-studio/web test -- App.test.tsx`.
- Server persistence fix test and typecheck passed: `pnpm --filter @crux-studio/server test` and `pnpm --filter @crux-studio/server check`.
- Full Studio verification passed after the persistence fix: `pnpm verify`.
- Local smoke passed: `pnpm smoke:local`.
- Final source-backed smoke job: `job-20260503084446-e526aeb3`.
- Final source-backed smoke run: `20260503T084446Z-how-should-a-support-team-reduce-first-response-`.
- Final evidence base run: `20260503T084446Z-what-evidence-would-make-the-support-first-respo`.
- Final evidence task: `task-7b36a3fc-12-adversarial-scenario-remove-evidence`.
- Final evidence closure rerun job: `job-20260503084447-bb3a8773`.
- Final evidence closure rerun: `20260503T084447Z-what-evidence-would-make-the-support-first-respo`.
- Final evidence closure result: task `resolved`, rerun source count `1`, delta direction `improved`, closed gap count `1`, remaining blocker count `0`, comparison differences `7`, delta package bytes `6439`, lineage event count `20`, lineage delta count `1`, dossier approved claims `1`, dossier source count `1`, dossier package bytes `5976`, acceptance status `needs_review`, acceptance score `0.91`, acceptance checks `6 pass`, `2 warn`, `0 fail`.
- Refreshed README screenshots:
  - `docs/assets/crux-studio-workbench.png`
  - `docs/assets/crux-studio-review-compare.png`

Result:

- Phase 18 is done.
- Next phase: Phase 19 Acceptance Gate Remediation Planner.

## 2026-05-02T23:49:09+02:00 - Phase 17 Decision Record Dossier

Intent:

- Implement the next productization phase under the required phase contract: full implementation, E2E/smoke tests, spec validation, artifacts, and next-phase handoff.
- Turn the latest reviewed run, source summary, project lineage, latest decision delta, key artifacts, and memo into one canonical project-level dossier.

Implemented:

- Added `GET /api/projects/:projectId/decision-record`.
- Added `GET /api/projects/:projectId/export/decision-record-dossier`.
- Added dossier derivation from latest project run, stored human review, source workspace summary, project lineage, latest delta, key artifact paths, and final memo.
- Added Markdown export with final recommendation, decision state, human review, decision lineage, key artifacts, and final memo.
- Added `dossier` to provider capability reporting.
- Added Studio API types and fetch helper for project decision records.
- Added a `Decision record` workbench section with final recommendation, current state, human review, decision movement, next step, key artifacts, and `Export dossier`.
- Refreshed project dossier state after project selection, completed jobs, source-pack changes, evidence-task resolution, replay, and review actions.
- Hardened derived project-state refreshes with latest-request guards and retry-on-known-runs recovery so stale first-load responses cannot leave the dossier empty.
- Expanded local smoke to validate decision-record JSON and Markdown dossier export after a real local evidence-closure workflow.
- Added `docs/PHASE_17_DECISION_RECORD_DOSSIER_SPEC.md`.

Verification:

- Failing server and web expectations were written first and passed after implementation.
- Focused server workflow test passed: `pnpm --filter @crux-studio/server test -- --runInBand`.
- Focused web workflow test passed: `pnpm --filter @crux-studio/web test -- --runInBand`.
- Full Studio verification passed: `pnpm verify`.
- Local smoke passed: `pnpm smoke:local`.
- Final source-backed smoke job: `job-20260502214851-9e53f8e0`.
- Final source-backed smoke run: `20260502T214851Z-how-should-a-support-team-reduce-first-response-`.
- Final evidence base run: `20260502T214851Z-what-evidence-would-make-the-support-first-respo`.
- Final evidence task: `task-9686a7ac-12-adversarial-scenario-remove-evidence`.
- Final evidence closure rerun job: `job-20260502214852-63d93c86`.
- Final evidence closure rerun: `20260502T214852Z-what-evidence-would-make-the-support-first-respo`.
- Final evidence closure result: task `resolved`, rerun source count `1`, delta direction `improved`, closed gap count `1`, remaining blocker count `0`, comparison differences `7`, delta package bytes `6439`, lineage event count `20`, lineage delta count `1`, dossier approved claims `1`, dossier source count `1`, dossier package bytes `5976`.
- Refreshed README screenshots:
  - `docs/assets/crux-studio-workbench.png`
  - `docs/assets/crux-studio-review-compare.png`

Result:

- Phase 17 is done.
- Next phase: Phase 18 Decision Record Acceptance Gate.

## 2026-05-02T22:55:59+02:00 - Phase 16 Decision Lineage Timeline

Intent:

- Implement the next productization phase under the required phase contract: full implementation, E2E/smoke tests, spec validation, artifacts, and next-phase handoff.
- Make the path from original run to evidence task to source-backed rerun to decision delta visible as a project-level decision lineage.

Implemented:

- Added `GET /api/projects/:projectId/lineage`.
- Added lineage events for source-pack creation, run creation, evidence-task opening, evidence-task resolution, evidence-closure rerun completion, and decision-delta availability.
- Reused the existing decision delta engine inside lineage events so project history and compare output agree.
- Added project lineage summary counts for runs, source packs, evidence tasks, resolved/open tasks, deltas, latest run, latest readiness, latest trust, and next step.
- Added `lineage` to provider capability reporting.
- Added Studio API types and fetch helper for project lineage.
- Added a `Decision lineage` section to the workbench and a Lineage navigation item.
- Refreshed lineage after project-changing actions including source-pack creation, evidence-task resolution, and completed run jobs.
- Fixed async lifecycle source-pack durability by snapshotting source-pack files into queued jobs before provider execution.
- Expanded local smoke to validate lineage after evidence closure.
- Added `docs/PHASE_16_DECISION_LINEAGE_TIMELINE_SPEC.md`.

Verification:

- Failing server and web expectations were written first and passed after implementation.
- Focused server product workflow test passed: `pnpm --filter @crux-studio/server test -- src/product-workflow.test.ts`.
- Focused web workflow test passed: `pnpm --filter @crux-studio/web test -- src/App.test.tsx`.
- Source-pack snapshot regression test passed: `pnpm --filter @crux-studio/server test -- src/app.test.ts`.
- Full Studio verification passed: `pnpm verify`.
- Local smoke passed: `pnpm smoke:local`.
- Final source-backed smoke job: `job-20260502205159-0f75c609`.
- Final source-backed smoke run: `20260502T205159Z-how-should-a-support-team-reduce-first-response-`.
- Final evidence base run: `20260502T205200Z-what-evidence-would-make-the-support-first-respo`.
- Final evidence task: `task-92e33974-12-adversarial-scenario-remove-evidence`.
- Final evidence closure rerun job: `job-20260502205200-eb6a361e`.
- Final evidence closure rerun: `20260502T205200Z-what-evidence-would-make-the-support-first-respo-2`.
- Final evidence closure result: task `resolved`, rerun source count `1`, delta direction `improved`, closed gap count `1`, remaining blocker count `0`, comparison differences `7`, delta package bytes `6441`, lineage event count `20`, lineage delta count `1`.
- Refreshed README screenshots:
  - `docs/assets/crux-studio-workbench.png`
  - `docs/assets/crux-studio-review-compare.png`

Result:

- Phase 16 is done.
- Next phase: Phase 17 Decision Record Dossier.

## 2026-05-02T22:30:52+02:00 - Phase 15 Exportable Decision Delta Package

Intent:

- Implement the next productization phase under the required phase contract: full implementation, E2E/smoke tests, spec validation, artifacts, and next-phase handoff.
- Make the decision delta portable so a user can export a review-ready package instead of only inspecting the comparison inside Studio.

Implemented:

- Added `POST /api/runs/compare/export/decision-delta-package`.
- Reused the existing comparison engine so exported packages match the in-product Decision Delta report.
- Added Markdown package sections for verdict, next step, trust movement, readiness movement, source movement, closed evidence gaps, remaining evidence gaps, blocker movement, notable changes, human review summary, changed artifact paths, and the newer run decision memo.
- Added stable Markdown filename generation and download response headers.
- Added a Studio API helper for exporting decision delta packages.
- Added an `Export delta package` action beside the Decision Delta report.
- Added browser-side Markdown download handling.
- Expanded local smoke to export and validate a Markdown delta package after evidence closure comparison.
- Added `docs/PHASE_15_EXPORTABLE_DECISION_DELTA_PACKAGE_SPEC.md`.

Verification:

- Failing server and web expectations were written first and passed after implementation.
- Focused server product workflow test passed: `pnpm --filter @crux-studio/server test -- src/product-workflow.test.ts`.
- Focused web workflow test passed: `pnpm --filter @crux-studio/web test -- src/App.test.tsx`.
- Focused server and web typechecks passed.
- Full Studio verification passed: `pnpm verify`.
- Local smoke passed: `pnpm smoke:local`.
- Final source-backed smoke job: `job-20260502202902-6c2591ce`.
- Final source-backed smoke run: `20260502T202902Z-how-should-a-support-team-reduce-first-response-`.
- Final evidence base run: `20260502T202902Z-what-evidence-would-make-the-support-first-respo`.
- Final evidence task: `task-18e43523-12-adversarial-scenario-remove-evidence`.
- Final evidence closure rerun job: `job-20260502202903-94d04e29`.
- Final evidence closure rerun: `20260502T202903Z-what-evidence-would-make-the-support-first-respo`.
- Final evidence closure result: task `resolved`, rerun source count `1`, delta direction `improved`, closed gap count `1`, remaining blocker count `0`, comparison differences `7`, delta package bytes `6439`.
- Refreshed README screenshots:
  - `docs/assets/crux-studio-workbench.png`
  - `docs/assets/crux-studio-review-compare.png`

Result:

- Phase 15 is done.
- Next phase: Phase 16 Decision Lineage Timeline.

## 2026-05-02T21:12:07+02:00 - Phase 14 Decision Delta Report

Intent:

- Implement the next productization phase under the required phase contract: full implementation, E2E/smoke tests, spec validation, artifacts, and next-phase handoff.
- Make before and after run movement readable enough that a user can explain why the newer run is stronger, weaker, or comparable.

Implemented:

- Added a `delta` object to `POST /api/runs/compare`.
- Added deterministic verdict, trust movement label, readiness movement, source movement, evidence gap movement, blocker movement, notable changes, and next step.
- Expanded comparison differences to include agent blockers and source chunk movement.
- Used Studio evidence-task resolution provenance so resolved tasks appear as closed gaps even when the Harness missing-evidence strings change between runs.
- Saved evidence-task resolution before starting the rerun job to avoid local file-store race conditions between task provenance and job persistence.
- Sorted same-second reruns deterministically so Compare Latest compares the base run to the improved rerun in the expected direction.
- Replaced the Studio raw comparison panel with a readable Decision Delta report.
- Tightened the delta metric layout after screenshot audit so readiness/source labels do not overlap in the workbench column.
- Expanded local smoke to require a readable decision delta, source improvement, closed gap provenance, notable changes, direction, remaining blocker count, and next step.
- Added `docs/PHASE_14_DECISION_DELTA_REPORT_SPEC.md`.

Verification:

- Failing server and web expectations were written first and passed after implementation.
- Focused server product workflow test passed: `pnpm --filter @crux-studio/server test -- src/product-workflow.test.ts`.
- Focused web workflow test passed: `pnpm --filter @crux-studio/web test -- src/App.test.tsx`.
- Focused server and web typechecks passed.
- Full Studio verification passed: `pnpm verify`.
- Local smoke passed: `pnpm smoke:local`.
- Final source-backed smoke job: `job-20260502190935-9e968ffa`.
- Final source-backed smoke run: `20260502T190935Z-how-should-a-support-team-reduce-first-response-`.
- Final evidence base run: `20260502T190935Z-what-evidence-would-make-the-support-first-respo`.
- Final evidence task: `task-ed7e72e8-12-adversarial-scenario-remove-evidence`.
- Final evidence closure rerun job: `job-20260502190936-27ef713d`.
- Final evidence closure rerun: `20260502T190936Z-what-evidence-would-make-the-support-first-respo`.
- Final evidence closure result: task `resolved`, rerun source count `1`, delta direction `improved`, closed gap count `1`, remaining blocker count `0`, comparison differences `7`.
- Refreshed README screenshots:
  - `docs/assets/crux-studio-workbench.png`
  - `docs/assets/crux-studio-review-compare.png`

Result:

- Phase 14 is done.
- Next phase: Phase 15 Exportable Decision Delta Package.

## 2026-05-02T20:47:00+02:00 - Phase 13 Evidence Gap Closure Loop

Intent:

- Implement the next productization phase under the required phase contract: full implementation, E2E/smoke tests, spec validation, artifacts, and next-phase handoff.
- Make source gaps actionable instead of merely visible.

Implemented:

- Added durable evidence task state to the Studio store.
- Added task generation from missing evidence, trust blockers, agent blockers, and source-related agent next actions.
- Added evidence task endpoints for listing and resolving run tasks.
- Added task resolution that creates a source pack, marks the task resolved, starts a lifecycle rerun, and stores rerun-job provenance.
- Added `evidence-tasks` to provider capability reporting.
- Added Studio evidence gap closure panels in the decision brief, Sources tab, and right inspector.
- Added a Studio action to resolve an open task with the current source note.
- Expanded local smoke to generate an evidence task, resolve it with source material, rerun Crux, and compare the improved run.
- Added `docs/PHASE_13_EVIDENCE_GAP_CLOSURE_SPEC.md`.

Verification:

- Failing server and web workflow expectations were written first and passed after implementation.
- Focused server product workflow test passed: `pnpm --filter @crux-studio/server test -- src/product-workflow.test.ts`.
- Focused web workflow test passed: `pnpm --filter @crux-studio/web test -- src/App.test.tsx`.
- Focused server and web typechecks passed.
- Full Studio verification passed: `pnpm verify`.
- Local smoke passed: `pnpm smoke:local`.
- Final source-backed smoke job: `job-20260502184802-57219ed2`.
- Final source-backed smoke run: `20260502T184802Z-how-should-a-support-team-reduce-first-response-`.
- Final evidence base run: `20260502T184802Z-what-evidence-would-make-the-support-first-respo`.
- Final evidence task: `task-6c2039cd-12-adversarial-scenario-remove-evidence`.
- Final evidence closure rerun job: `job-20260502184803-5a02067b`.
- Final evidence closure rerun: `20260502T184803Z-what-evidence-would-make-the-support-first-respo`.
- Final evidence closure result: task `resolved`, rerun source count `1`, comparison differences `5`.
- Refreshed README workbench screenshot: `docs/assets/crux-studio-workbench.png`.

Result:

- Phase 13 is done.
- Next phase: Phase 14 Decision Delta Report.

## 2026-05-02T20:18:00+02:00 - Phase 12 Durable Lifecycle Recovery

Intent:

- Implement the next productization phase under the required phase contract: full implementation, E2E/smoke tests, spec validation, artifacts, and next-phase handoff.
- Make lifecycle jobs durable across local Studio server restarts.

Implemented:

- Added `runJobs` to the Studio store state.
- Added store methods for saving, listing, and fetching lifecycle jobs.
- Added state normalization so older `.studio/studio-state.json` files load without a `runJobs` key.
- Persisted every lifecycle transition from queued to terminal states.
- Recovered persisted job history when the server starts.
- Resumed queued jobs after restart.
- Marked interrupted running jobs as failed and retryable after restart.
- Preserved retry-created and completed jobs across a second restart.
- Updated Studio lifecycle rows to show recovered failure notes.
- Expanded local smoke to assert completed lifecycle jobs remain durably inspectable in job history.
- Added `docs/PHASE_12_DURABLE_LIFECYCLE_RECOVERY_SPEC.md`.

Verification:

- Failing server restart-recovery expectations were written first and passed after implementation.
- Focused server lifecycle recovery test passed: `pnpm --filter @crux-studio/server test -- src/app.test.ts`.
- Focused web lifecycle UX test passed: `pnpm --filter @crux-studio/web test -- src/App.test.tsx`.
- Server typecheck passed: `pnpm --filter @crux-studio/server check`.
- Full Studio verification passed: `pnpm verify`.
- Local lifecycle smoke passed: `pnpm smoke:local`.
- Final smoke job: `job-20260502182035-2bdcd33e`.
- Final smoke run: `20260502T182035Z-how-should-a-support-team-reduce-first-response-`.
- Final smoke result: `succeeded`, with durable job status `succeeded`, 2 sources, and 4 source chunks.
- Refreshed README workbench screenshot: `docs/assets/crux-studio-workbench.png`.

Result:

- Phase 12 is done.
- Next phase: Phase 13 Evidence Gap Closure Loop.

## 2026-05-02T19:34:32+02:00 - Phase 11 Async Run Lifecycle

Intent:

- Implement the next productization phase under the required phase contract: full implementation, E2E/smoke tests, spec validation, artifacts, and next-phase handoff.
- Make long-running Harness runs observable and controllable from Studio.

Implemented:

- Added an in-process server run-job queue with queued, running, succeeded, failed, cancelled, and retry states.
- Added lifecycle endpoints for creating, listing, inspecting, cancelling, and retrying run jobs.
- Preserved the synchronous `/api/runs/ask` endpoint for compatibility.
- Added `lifecycle` to provider capability reporting.
- Updated Studio to submit new questions through lifecycle jobs and poll the active job to completion.
- Added lifecycle UI in the ask panel and right inspector with cancel and retry controls.
- Kept the previous completed run visible while a new job is queued or running.
- Updated local smoke to validate a source-backed local Harness run through the lifecycle API.
- Added `docs/PHASE_11_ASYNC_RUN_LIFECYCLE_SPEC.md`.

Verification:

- Failing server lifecycle and web workflow expectations were written first and passed after implementation.
- Focused server lifecycle test passed: `pnpm --filter @crux-studio/server test -- src/app.test.ts`.
- Focused web E2E-style test passed: `pnpm --filter @crux-studio/web test -- src/App.test.tsx`.
- Focused web check passed: `pnpm --filter @crux-studio/web check`.
- Full Studio verification passed: `pnpm verify`.
- Local lifecycle smoke passed: `pnpm smoke:local`.
- Final smoke job: `job-20260502174340-41838b6d`.
- Final smoke run: `20260502T174340Z-how-should-a-support-team-reduce-first-response-`.
- Final smoke result: `succeeded`, with 2 sources and 4 source chunks.
- Refreshed README workbench screenshot: `docs/assets/crux-studio-workbench.png`.

Result:

- Phase 11 is done.
- Next phase: Phase 12 Durable Lifecycle Recovery.

## 2026-05-02T19:14:25+02:00 - Phase 10 Answer-First Decision Brief

Intent:

- Implement the next productization phase under the required phase contract: full implementation, E2E/smoke tests, spec validation, artifacts, and next-phase handoff.
- Make Studio land on a readable decision answer first while preserving the full auditable run.

Implemented:

- Added a `Brief` artifact tab and made it the default tab for latest-run preload, new runs, replayed runs, and history selection.
- Added a decision brief surface with recommendation, optional executive summary, readiness, trust confidence, source counts, next action, and blockers.
- Added brief actions for opening the full memo, inspecting claims, and inspecting sources.
- Changed the full memo artifact from raw string JSON to a readable memo view.
- Tightened workbench copy so the page title and the decision brief do not repeat each other.
- Refreshed `docs/assets/crux-studio-workbench.png` from the running v0.7 Studio UI.
- Added `docs/PHASE_10_ANSWER_FIRST_DECISION_BRIEF_SPEC.md`.

Verification:

- Failing web workflow expectations were written first and passed after implementation.
- Focused web E2E-style test passed: `pnpm --filter @crux-studio/web test -- src/App.test.tsx`.
- Web TypeScript check passed: `pnpm --filter @crux-studio/web check`.
- Full Studio verification passed: `pnpm verify`.
- Local smoke passed against the real local Harness provider: `pnpm smoke:local`.
- Visual artifact refreshed with headless Chrome: `docs/assets/crux-studio-workbench.png`.
- Final smoke result: source-backed run `20260502T172025Z-how-should-a-support-team-reduce-first-response-`; readiness `usable_with_warnings`; 2 sources; 4 source chunks.

Result:

- Phase 10 is done.
- Next phase: Phase 11 Async Run Lifecycle.

## 2026-05-02T19:01:00+02:00 - Phase 09 Source File Upload Workspace

Intent:

- Implement the next productization phase under the required phase contract: full implementation, E2E/smoke tests, spec validation, artifacts, and next-phase handoff.
- Make source-pack creation work with real selected files instead of only pasted text.

Implemented:

- Added multi-file selection to the ask panel source-pack workflow.
- Added browser-side file reading for Markdown, TXT, and CSV source files.
- Added selected-file preview rows with file names and sizes.
- Preserved pasted-source fallback for quick source notes.
- Sent selected file names and contents through the existing source-pack API.
- Added `docs/PHASE_09_SOURCE_FILE_UPLOAD_SPEC.md`.

Verification:

- Failing web workflow test was written first and passed after implementation.
- Focused web E2E-style test passed: `pnpm --filter @crux-studio/web test -- src/App.test.tsx`.
- Full Studio verification passed: `pnpm verify`.
- Local smoke passed against the real local Harness provider: `pnpm smoke:local`.
- Final smoke result: source-backed run `20260502T170515Z-how-should-a-support-team-reduce-first-response-`; readiness `usable_with_warnings`; 2 sources; 4 source chunks.

Result:

- Phase 09 is done.
- Next phase: Phase 10 Answer-First Decision Brief.

## 2026-05-02T18:47:00+02:00 - Source-Backed Productization Bridge

Intent:

- Close the largest local-first product gap: Studio source packs must become real Harness source packs, not pasted prompt context.
- Preserve TDD, traceability, and local-only product boundaries.

Implemented:

- Updated the local Harness provider to materialize Studio source-pack files under `runs/studio-source-packs/<pack>/raw`.
- Routed the materialized files through Harness `importSources` into `runs/studio-source-packs/<pack>/pack`.
- Made materialized source-pack paths content-addressed to avoid stale-file and repeat-run collisions.
- Passed the generated source-pack directory into Harness arbitrary-query runs.
- Replaced source body injection in provider context with compact source-pack metadata.
- Expanded `pnpm smoke:local` to create a project, create a source pack, run a source-backed arbitrary question, and assert source inventory/chunk preservation.

Verification:

- Harness query-intake tests pass with source-pack attachment.
- Studio local-provider and server workflow tests pass.
- Full Harness `npm test` passed with 76 tests.
- Studio `pnpm verify` passed: provider tests, server tests, web tests, TypeScript checks, and production build.
- Follow-up server provider tests and TypeScript checks passed after content-addressed source-pack hardening.
- Strengthened `pnpm smoke:local` passed against the real local Harness provider.
- Final smoke result: provider `local`; source-backed run `20260502T165429Z-how-should-a-support-team-reduce-first-response-`; readiness `usable_with_warnings`; 2 sources; 4 source chunks.

Result:

- Source-backed Studio runs now produce real Harness `source_inventory.json` and `source_chunks.json` artifacts for arbitrary questions.

## 2026-05-02T18:38:00+02:00 - Local-First Productization Completion

Intent:

- Continue beyond the agent-aware bridge and implement the rest of the local-first productization plan.
- Keep hosted control-plane work deferred.
- Preserve TDD, provider boundary discipline, and a traceable changelog.

Implemented:

- Added canonical demo questions at `/api/demos`.
- Added demo question controls in the ask panel.
- Added `ReadinessSummary` and `SourceWorkspaceSummary` to the provider contract.
- Mapped Harness version, source inventory, source chunks, eval report, source gaps, and readiness through the local provider.
- Added a Readiness inspector card and a Sources inspector card.
- Added a Sources artifact tab with source/chunk summaries and missing evidence.
- Added source inventory, source chunks, and eval report artifact endpoints.
- Added full decision package Markdown export.
- Expanded comparison output with readiness, agent, source, and run identity differences.
- Added `docs/DEMO_GUIDE.md`.
- Added `pnpm dev:local`, `pnpm smoke:local`, and `pnpm verify`.

Verification:

- Focused provider tests passed.
- Focused server tests passed.
- Focused web tests passed after adjusting assertions for intentionally repeated source-copy surfaces.
- `pnpm check` passed after exporting the new provider summary types.
- `pnpm verify` passed: provider tests, server tests, web tests, TypeScript checks, and production build.
- `pnpm smoke:local` passed against `CRUX_STUDIO_PROVIDER=local` and `/Users/nikolacehic/Desktop/crux-harness`.
- Smoke result: provider `local`, capabilities `ask`, `inspect`, `sources`, `review`, `replay`, `compare`, `agents`, `demos`, `readiness`, `export`; 5 demo questions; latest agent-aware run had 6 agents.

Result:

- The Studio now covers the full local-first product loop: demo, ask, inspect readiness, inspect agents, inspect sources, review, replay, compare, export, and smoke verify.

## 2026-05-02T18:16:00+02:00 - Productization Plan And Agent-Aware Studio Integration

Intent:

- Convert the Harness plus Studio productization direction into a concrete phased plan.
- Start implementation with the highest-leverage bridge: expose the new Crux Harness bounded agents in Studio.
- Preserve TDD, provider boundary discipline, and traceability.

Context checked:

- Loaded Impeccable product and design context from `PRODUCT.md` and `DESIGN.md`.
- Reviewed current Studio docs, provider types, local Harness provider, server API, web app, and tests.
- Confirmed Crux Harness now emits `agent_manifest.json` and `agent_findings.json`.

TDD state:

- Updated provider, server, local provider, and web tests to require agent-aware contract behavior.
- Ran focused tests while implementing and fixed the UI query collision caused by agent next actions and diagnostics sharing similar copy.

Implemented:

- Added `docs/PRODUCTIZATION_PLAN.md` with the phased Harness plus Studio roadmap.
- Added `AgentSummary` and agent artifact fields to the shared provider contract.
- Updated `MockCruxProvider` to emit bounded-agent summaries and findings.
- Updated `LocalCruxHarnessProvider` to map Harness `agent_manifest` and `agent_findings` into Studio bundles.
- Added server artifact support for `agent-manifest` and `agents`.
- Added `agents` to provider capability reporting.
- Added an Agents tab to the web artifact inspector.
- Added a right-rail Bounded agents synthesis panel.
- Added raw Agents JSON link in the artifact panel.
- Updated README, changelog, and package versions for the v0.3 productization start.

Verification:

- `pnpm --filter @crux-studio/crux-provider test` passed.
- `pnpm --filter @crux-studio/server test` passed.
- `pnpm --filter @crux-studio/web test -- --runInBand` passed.
- `pnpm check` passed.
- `pnpm test` passed.
- `pnpm build` passed.
- Local Harness provider smoke passed against `/Users/nikolacehic/Desktop/crux-harness`, returning an agent-aware run with 6 bounded agents and `research_scout` as the first finding.

Result:

- Studio now treats bounded agents as a first-class trust surface instead of leaving them buried in raw Harness artifacts.

## 2026-05-01T11:58:00+02:00 - Human-Readable README Rewrite

Intent:

- Make the repository README easier to share with people who have not followed the full Crux Studio build.
- Explain the product in plain language before the technical details.
- Preserve practical setup, architecture, quality, and documentation links.

Context checked:

- Verified the running Studio app responds at `http://127.0.0.1:5173`.
- Reviewed existing README content and screenshot assets under `docs/assets/`.

Implemented:

- Rewrote `README.md` around the product promise: turning agent analysis into inspectable, reviewable decisions.
- Added clearer sections for what Crux Studio is, why it exists, how it works, product tour, capabilities, local run commands, Crux Harness integration, architecture, quality commands, current boundary, and docs.
- Kept existing screenshot assets embedded so the README remains visual and shareable.

Verification:

- `git diff --check` passed.
- Screenshot asset paths referenced by the README exist.

Result:

- The README now reads as a public-facing product overview instead of an internal build note.

## 2026-05-01T11:46:00+02:00 - shadcn Studio Migration And Final UI Polish

Intent:

- Replace the custom-feeling Studio UI with shadcn UI primitives across the product surface.
- Preserve the non-hosted product boundary and existing Crux provider workflow.
- Keep the implementation TDD-first, visually audited, and fully traceable.

Reference material read:

- Official shadcn Vite installation docs at `https://ui.shadcn.com/docs/installation/vite`.
- Impeccable product, audit, polish, and critique guidance.
- Existing `PRODUCT.md`, `DESIGN.md`, and Desktop `Crux Studio_Design` reference material from the prior audit pass.

TDD state:

- Added a web test proving that Studio preloads the latest run so returning users land on an inspectable workbench instead of an empty memo surface.
- Updated existing run-history selectors to account for the same run id appearing in both history and current-run status after preload.

Implemented:

- Installed Tailwind CSS v4, the shadcn CLI/runtime dependencies, Radix-backed primitives, lucide icons, and Geist font assets for the web app.
- Added Vite/Tailwind/shadcn setup:
  - `apps/web/components.json`
  - `apps/web/src/lib/utils.ts`
  - `apps/web/vite.config.ts` Tailwind plugin and `@/*` alias
  - `apps/web/tsconfig.json` `baseUrl` and path alias
- Generated shadcn UI components under `apps/web/src/components/ui/`.
- Rebuilt `apps/web/src/App.tsx` around shadcn `Button`, `Card`, `Badge`, `Field`, `Input`, `Textarea`, `NativeSelect`, `Tabs`, `Breadcrumb`, `Separator`, `Skeleton`, `ScrollArea`, and `Item` primitives.
- Replaced the old bespoke stylesheet with a Tailwind v4/shadcn token bridge using OKLCH Crux colors and reduced-motion handling.
- Changed the app label from `local` to `workspace` for a more product-grade chrome.
- Added latest-run preload on initial history load.
- Tightened desktop workbench columns and delayed side-by-side artifact actions until `2xl` so claims and evidence stay readable at 1440px.
- Refreshed all README screenshots from the running app:
  - `docs/assets/crux-studio-workbench.png`
  - `docs/assets/crux-studio-claims.png`
  - `docs/assets/crux-studio-claims-focus.png`
  - `docs/assets/crux-studio-claims-detail.png`
  - `docs/assets/crux-studio-review-compare.png`
  - `docs/assets/crux-studio-review-compare-focus.png`
  - `docs/assets/crux-studio-review-compare-detail.png`

Verification:

- `pnpm test -- --runInBand` passed.
- `pnpm check` passed.
- `pnpm build` passed.
- Live browser smoke passed through latest-run preload, sample arbitrary run, Claims tab, claim approval controls, and responsive narrow viewport screenshots.
- Desktop 1440px screenshot audit passed after correcting artifact-row breakpoints and recapturing the README assets.

Result:

- Crux Studio now presents as a shadcn-based product workbench with clearer structure, stronger component consistency, better responsive behavior, and traceable verification.

## 2026-05-01T11:02:00+02:00 - Impeccable Design Audit And Polish

Intent:

- Audit the running Studio against the Desktop `Crux Studio_Design` reference.
- Apply the Impeccable product/design/polish criteria without changing the provider boundary or hosted-control-plane scope.
- Keep every change traceable and verified.

Reference material read:

- `/Users/nikolacehic/Desktop/Crux Studio_Design/tokens.css`
- `/Users/nikolacehic/Desktop/Crux Studio_Design/studio-app.jsx`
- `/Users/nikolacehic/Desktop/Crux Studio_Design/studio-atoms.jsx`
- `/Users/nikolacehic/Desktop/Crux Studio_Design/studio-views-1.jsx`
- `/Users/nikolacehic/Desktop/Crux Studio_Design/studio-views-2.jsx`
- `/Users/nikolacehic/Desktop/Crux Studio_Design/screenshots/studio-ask.png`

Audit findings:

- Current implementation worked but did not yet match the reference workbench shell, breadcrumb/status treatment, or token discipline.
- Source policy behaved like a basic select instead of the expected segmented control.
- Artifact rows could crowd claim/evidence text and action buttons in narrow columns.
- Mobile/narrow browser rendering clipped because the document enforced a 320px minimum width.
- Desktop side rails could drift below the first viewport when the central workbench was taller than the viewport.

Implemented:

- Added the reference-style brand lockup, workspace navigation labels, status breadcrumb, and active provider handling.
- Replaced the source-policy select with an accessible segmented fieldset.
- Ported the core Crux design tokens into the app stylesheet and rebalanced surfaces, borders, badges, form controls, memo copy, inspector sections, and tabs around them.
- Reworked artifact rows into stable grid layouts with mobile-safe action stacking.
- Added responsive fixes for narrow rail navigation, wrapping breadcrumbs, and body overflow.
- Made desktop side rails sticky with internal scrolling, resetting to normal document flow on tablet/mobile layouts.
- Updated the web workflow test to assert the project selector and status surface explicitly.
- Refreshed `docs/assets/crux-studio-workbench.png` from the running polished app.

Verification:

- `pnpm test -- --runInBand` passed.
- `pnpm check` passed.
- `pnpm build` passed.
- Browser visual check passed on the narrow in-app viewport.
- Browser sample run passed through memo, Claims tab, claim review controls, and review summary without overlap.
- 1440px Chrome screenshot captured and reviewed for desktop layout, sticky rails, tokenized shell, and readable first viewport.

Result:

- The Studio UI now aligns with the approved design reference as a calm, dense, auditable analysis workbench.

## 2026-05-01T01:35:49+02:00 - Phase 0/1 Start

Intent:

- Start Crux Studio from the approved phased plan.
- Preserve the provider boundary so the web UI never imports Crux Harness internals.
- Build a minimal Ask-to-Memo product loop using TDD.

Changes planned:

- Add pnpm workspace scaffolding.
- Add `packages/crux-provider` with tests before implementation.
- Add `apps/server` Fastify route tests before implementation.
- Add `apps/web` React workflow tests before implementation.
- Implement only the smallest vertical slice needed to pass those tests.

Quality constraints:

- TDD is mandatory.
- Trace updates and changelog updates are mandatory.
- The first implementation must remain compatible with later real `crux-harness` integration.

## 2026-05-01T01:37:15+02:00 - Red Baseline Captured

Command:

- `pnpm test`

Result:

- Expected failure.
- `packages/crux-provider/src/mock.test.ts` could not import `./mock` because implementation files have not been created yet.

TDD state:

- Provider contract test is red.
- Server and web tests are present but not reached because the provider package fails first.

## 2026-05-01T01:41:59+02:00 - Local Provider Red Step

Command:

- `pnpm --filter @crux-studio/server test`

Result:

- Expected failure.
- `apps/server/src/providers/local-crux-provider.test.ts` could not import `./local-crux-provider` because the adapter did not exist yet.

Reason:

- Phase 0 needs the UI-safe provider boundary and a server-only path toward the real local harness.

## 2026-05-01T01:44:45+02:00 - Phase 0/1 Green Slice

Implemented:

- Root pnpm workspace with TypeScript, Vitest, React, Vite, and Fastify.
- Root `PRODUCT.md` and `DESIGN.md` derived from the accepted Studio specs.
- Provider package with `CruxProvider`, run summary types, run bundle types, and deterministic `MockCruxProvider`.
- Server API with provider injection:
  - `POST /api/runs/ask`
  - `GET /api/runs`
  - `GET /api/runs/:runId`
- Server-only `LocalCruxHarnessProvider` that dynamically imports the local harness `dist/src` modules.
- Provider factory with `CRUX_STUDIO_PROVIDER=mock` default and `CRUX_STUDIO_PROVIDER=local` support.
- React Ask-to-Memo UI shell with question, context, horizon, source policy, memo preview, trust gate, blocking issues, and artifact paths.

Verification:

- `pnpm test` passed.
- `pnpm check` passed.
- `pnpm build` passed.
- Local provider smoke check passed with `CRUX_STUDIO_PROVIDER=local CRUX_HARNESS_ROOT=/Users/nikolacehic/Desktop/crux-harness`.

Notes:

- The UI defaults to the mock provider for fast product iteration.
- The local provider can index existing Crux Harness runs and can run new analyses through the server adapter.
- Browser code still imports only shared contract types, never harness internals.

## 2026-05-01T02:00:24+02:00 - Inspector Acceptance Red Step

Command:

- `pnpm test`

Result:

- Expected failure.
- Server acceptance test failed because `/api/runs/:runId/artifacts/:artifact` and `/api/runs/:runId/export/memo` are not implemented yet.

Acceptance target:

- User can inspect core run artifacts in the browser.
- User can export the memo.
- UI can load run history and fetch full run bundles after run creation.

## 2026-05-01T02:05:22+02:00 - Inspector Acceptance Green Slice

Implemented:

- Added `memo` to the normalized `RunBundle` contract.
- Added safe server routes:
  - `GET /api/runs/:runId/artifacts/:artifactName`
  - `GET /api/runs/:runId/export/memo`
- Added raw artifact whitelist for memo, query intake, claims, evidence, contradictions, uncertainty, council, diagnostics, and trace.
- Added web API helpers for listing runs and fetching full run bundles.
- Added run history in the left rail.
- Added artifact tabs for Memo, Claims, Evidence, Contradictions, Uncertainty, Council, Diagnostics, and Trace.
- Added memo export action and raw Claims/Evidence/Trace JSON links.

Verification:

- `pnpm test` passed.
- `pnpm check` passed.
- `pnpm build` passed.
- Live API smoke passed after restarting the dev server:
  - `POST /api/runs/ask`
  - `GET /api/runs/:runId/artifacts/claims`
  - `GET /api/runs/:runId/export/memo`

Result:

- Crux Studio now satisfies the core v0.1 inspection acceptance loop for mock-provider development and the same UI contract is backed by the local harness provider.

## 2026-05-01T02:12:47+02:00 - Full Product Workflow Red Step

Command:

- `pnpm test`

Result:

- Expected failure.
- Mock provider does not yet strengthen runs with source-pack context.
- Server product workflow tests require projects, source packs, review, replay, compare, and provider registry endpoints that do not exist yet.

Acceptance target:

- User can improve weak runs with sources.
- User can review claims and annotate evidence.
- User can replay and compare runs.
- User can organize runs and sources by project.
- User can see provider capabilities.

## 2026-05-01T02:24:36+02:00 - Full Product Workflow Green Slice

Implemented:

- Added persistent Studio store abstractions with memory and local file backends.
- Added project workspace APIs and project-run linking.
- Added source pack APIs with hashed source file metadata.
- Extended provider input with project and source-pack context.
- Strengthened mock-provider runs when source-pack context is attached.
- Routed local harness runs through source-pack context in the server adapter.
- Added provider registry, source-backed ask, review, reviewed-memo export, replay, and compare endpoints.
- Added Studio UI controls for provider capabilities, projects, source packs, claim approval/rejection, evidence notes, replay, run comparison, and reviewed memo export.
- Added product workflow tests before implementation for the server and UI.
- Added visual polish for the new workbench controls, preserving the inspection-first product layout.

Verification:

- `pnpm test` passed.
- `pnpm check` passed.
- `pnpm build` passed.

Result:

- Crux Studio now supports the non-hosted product loop: ask, attach source context, inspect artifacts, review claims and evidence, replay, compare, and export a reviewed memo.

## 2026-05-01T02:28:24+02:00 - Source Content Boundary Hardening

Reason:

- A final product review found that source packs were preserving metadata but not the source content needed by providers.

TDD state:

- Added failing provider, server, and local-provider tests proving source-pack content must cross the provider boundary.

Implemented:

- Added source-pack file content to the provider contract.
- Persisted pasted source content in the local Studio store.
- Passed source file content through server ask and replay paths.
- Added source-pack file content to mock-provider query intake artifacts.
- Appended source-pack file excerpts to local harness provider context.

Verification:

- `pnpm test` passed.
- `pnpm check` passed.
- `pnpm build` passed.

Result:

- Source packs are now real local analysis inputs, not just labels or metadata.

## 2026-05-01T02:36:58+02:00 - README Product Showcase

Intent:

- Turn the README into a clear product showcase with real screenshots from the running Studio.

Implemented:

- Captured desktop screenshots of the Studio workbench, claim review surface, reviewed memo area, and run comparison surface.
- Added screenshot assets under `docs/assets/`.
- Rewrote `README.md` with product positioning, product tour, workflow, capabilities, local run instructions, architecture, quality commands, non-hosted boundary, and traceability links.

Verification:

- Loaded Studio in the browser and verified the screenshot state before capture.
- Verified generated image dimensions and file metadata.

Result:

- The repository now presents Crux Studio as a visible product, not just an implementation scaffold.
