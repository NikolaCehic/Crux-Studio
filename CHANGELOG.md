# Changelog

## 0.13.0 - 2026-05-02

- Added project-level decision lineage through `GET /api/projects/:projectId/lineage`.
- Lineage now connects source packs, runs, evidence tasks, resolved tasks, rerun jobs, and decision delta availability.
- Added a Studio `Decision lineage` workbench section with summary counts, latest readiness, next step, and recent timeline events.
- Added a Lineage navigation item.
- Expanded local smoke to verify lineage event types and improved delta preservation after evidence closure.
- Added the Phase 16 decision lineage timeline spec artifact.

## 0.12.0 - 2026-05-02

- Added a Markdown decision delta package export endpoint for run comparisons.
- Delta packages include verdict, next step, trust movement, readiness movement, source movement, closed gaps, blockers, notable changes, human review summaries, changed artifact paths, and the newer memo.
- Added a Studio `Export delta package` action to the Decision Delta panel.
- Added browser-side Markdown download handling for delta packages.
- Expanded local smoke to verify the exported package against a real local Harness evidence-closure rerun.
- Added the Phase 15 exportable decision delta package spec artifact.

## 0.11.0 - 2026-05-02

- Added a decision delta report to run comparison responses.
- Delta reports now explain verdict, trust movement, readiness movement, source movement, closed evidence gaps, remaining gaps, blocker movement, notable changes, and next step.
- Delta closed gaps now include Studio evidence-task resolution provenance when a rerun was created from a resolved task.
- Expanded comparison coverage to include agent blockers and source chunk movement.
- Sorted same-second reruns deterministically so Compare Latest reads base to improved run in the expected direction.
- Replaced the raw Studio compare panel with a readable Decision Delta surface.
- Expanded local smoke to fail when an evidence closure comparison lacks a readable delta.
- Added the Phase 14 decision delta report spec artifact.

## 0.10.0 - 2026-05-02

- Added evidence gap closure tasks generated from missing evidence, trust blockers, agent blockers, and source-related agent next actions.
- Added API endpoints to list run evidence tasks and resolve a task with source material.
- Resolution now creates a source pack, marks the task resolved, starts a lifecycle rerun, and preserves the rerun job ID.
- Added Studio evidence gap closure panels in the decision brief, Sources tab, and right inspector.
- Added UI support for resolving an evidence task with the current source note.
- Added product workflow tests proving evidence tasks can be resolved, rerun, and compared.
- Expanded local smoke to verify evidence task generation, source-backed resolution, lifecycle rerun, and comparison.
- Added the Phase 13 evidence gap closure loop spec artifact.

## 0.9.0 - 2026-05-02

- Added durable lifecycle persistence in the Studio store for every run-job transition.
- Recovered queued jobs after local server restart so unstarted work can continue.
- Marked interrupted running jobs as failed with a retryable restart message instead of losing them.
- Preserved completed, failed, cancelled, and retry-created jobs across Studio server restarts.
- Added server restart coverage for lifecycle persistence and recovery.
- Updated Studio lifecycle action rows to explain recovered retryable failures.
- Expanded local smoke to assert completed lifecycle jobs remain inspectable in durable job history.
- Added the Phase 12 durable lifecycle recovery spec artifact.

## 0.8.0 - 2026-05-02

- Added an async run lifecycle API with queued, running, completed, failed, cancelled, and retry states.
- Added server lifecycle endpoints for creating, listing, inspecting, cancelling, and retrying run jobs.
- Preserved the synchronous `/api/runs/ask` endpoint for compatibility.
- Added `lifecycle` to provider capability reporting.
- Updated Studio to submit new questions through lifecycle jobs, poll completion, and load the finished run automatically.
- Added lifecycle status UI in the ask panel and inspector, including cancel and retry controls.
- Updated local smoke to validate a source-backed local Harness run through the lifecycle API.
- Added the Phase 11 async run lifecycle spec artifact.

## 0.7.0 - 2026-05-02

- Added an answer-first `Brief` artifact tab as the default landing surface for latest, new, replayed, and selected runs.
- Added a decision brief with recommendation, summary, readiness, trust confidence, source counts, next action, and blockers.
- Kept full memo inspection available as a readable memo tab instead of raw string JSON.
- Added direct brief actions for opening the full memo, inspecting claims, and inspecting sources.
- Updated web workflow coverage to prove returning users land on the decision brief and can open the full memo.
- Refreshed the primary README workbench screenshot from the v0.7 answer-first UI.
- Added the Phase 10 answer-first decision brief spec artifact.

## 0.6.0 - 2026-05-02

- Added multi-file source attachment in the Studio ask panel for Markdown, TXT, and CSV source files.
- Displayed selected source file names and sizes before source-pack creation.
- Sent uploaded file names and contents through the existing source-pack API instead of forcing users to paste one source blob.
- Added UI workflow coverage proving selected files become source-pack API payloads.
- Added phase execution protocol and Phase 09 source-upload spec artifacts.

## 0.5.0 - 2026-05-02

- Materialized Studio source-pack files into real local Crux Harness source packs before running arbitrary questions.
- Used content-addressed materialized source-pack paths to avoid stale-file and repeat-run collisions.
- Passed the generated Harness source-pack path through the local provider so `source_inventory.json` and `source_chunks.json` become first-class run artifacts.
- Replaced source-file body injection in provider context with a compact source-pack summary to keep prompts cleaner and more auditable.
- Expanded local smoke verification to create a project, create a source pack, run a source-backed question, and assert preserved source inventory/chunks.

## 0.4.0 - 2026-05-02

- Implemented the remaining local-first productization plan surfaces across Studio.
- Added canonical demo questions through `/api/demos` and the ask panel.
- Added run readiness summaries with `ready`, `usable_with_warnings`, and `blocked` states.
- Added source workspace summaries, source inventory/chunk artifacts, and a Sources tab.
- Added decision package export with readiness, trust, agents, sources, review, and memo content.
- Expanded run comparison to include readiness, agent, source, and run identity movement.
- Added `docs/DEMO_GUIDE.md`, `pnpm dev:local`, `pnpm smoke:local`, and `pnpm verify`.
- Added local smoke verification for server health, web response, provider registry, demos, run indexing, and agent-aware runs.

## 0.3.0 - 2026-05-02

- Added `docs/PRODUCTIZATION_PLAN.md` with a Harness plus Studio productization roadmap.
- Added bounded-agent fields to the Studio provider contract.
- Mapped Harness `agent_manifest.json` and `agent_findings.json` into the local Studio provider.
- Added server support for `agent-manifest` and `agents` artifacts.
- Added agent capability reporting to the provider registry.
- Added an Agents tab and bounded-agent synthesis panel to the Studio UI.
- Updated mock provider, local provider, server, and web tests for the new agent-aware product surface.

## 0.2.3 - 2026-05-01

- Rewrote the README into a human-readable product introduction for sharing Crux Studio with others.
- Reframed the opening around the product promise, use cases, workflow, screenshots, local run instructions, architecture, and current non-hosted boundary.
- Kept setup and quality commands available without making the README feel like an internal implementation note.

## 0.2.2 - 2026-05-01

- Migrated the Studio web app onto shadcn UI primitives for buttons, cards, badges, fields, inputs, textareas, native selects, tabs, breadcrumbs, separators, skeletons, scroll areas, and item rows.
- Added Tailwind CSS v4 and shadcn configuration for the Vite app, including the `@/*` import alias and shared utility helper.
- Rebuilt the Studio shell with shadcn components while preserving the provider boundary, project/source workflow, review actions, replay, compare, exports, and artifact inspection.
- Added a returning-user behavior that automatically loads the latest run from history into the workbench.
- Hardened responsive artifact layouts so claim and evidence actions stack until there is enough width for side-by-side review controls.
- Rebalanced desktop workbench columns to give the memo and artifact inspector more usable reading width.
- Refreshed all README screenshots from the running shadcn-based Studio UI.
- Added TDD coverage for latest-run preload behavior and re-verified the full test, typecheck, build, and browser visual audit path.

## 0.2.1 - 2026-05-01

- Audited the app against the Desktop `Crux Studio_Design` reference and Impeccable product/design criteria.
- Reworked the Studio shell toward the reference workbench: brand lockup, workspace nav, status breadcrumb, segmented source policy, attachment-style source area, and denser inspector surfaces.
- Moved the web styling onto the Crux design tokens from the design folder.
- Fixed responsive clipping and cramped mobile navigation in narrow browser viewports.
- Made desktop side rails sticky and internally scrollable so trust, history, and current-run context stay available while the workbench scrolls.
- Hardened artifact-row layout so claim and evidence review actions cannot collide with long analysis text.
- Updated the primary README screenshot from the polished running app.

## 0.2.0 - 2026-05-01

- Added local Studio persistence for projects, source packs, run links, and human review state.
- Added project and source-pack APIs, including source file metadata and project-scoped run history.
- Added provider registry, reviewed memo export, replay, and run comparison APIs.
- Added source-pack-aware provider input and source-backed mock runs that improve trust status and confidence.
- Persisted pasted source content locally and passed it through the provider boundary for ask and replay flows.
- Added Studio UI controls for provider capabilities, project selection, source pack creation, source-backed runs, claim review, evidence annotation, replay, comparison, and reviewed memo export.
- Added TDD coverage for the complete product workflow across provider, server, and web layers.
- Added `.studio/` to ignored local runtime state.
- Reworked the README as a product showcase with real Studio screenshots.

## 0.1.0 - 2026-05-01

- Started the Crux Studio implementation with a TDD-first Phase 0 and Phase 1 slice.
- Added root product and design context for the Studio UI.
- Added pnpm workspace scaffolding for `apps/web`, `apps/server`, and `packages/crux-provider`.
- Added provider contract types plus deterministic `MockCruxProvider`.
- Added Fastify API endpoints for creating, listing, and fetching runs through the provider boundary.
- Added a React/Vite Ask-to-Memo Studio shell with trust gate, memo preview, blocking issues, and artifact paths.
- Added `LocalCruxHarnessProvider` for indexing and running the existing local Crux Harness through a server-only adapter.
- Added TDD coverage for provider, server routes, local harness mapping, and the UI ask workflow.
- Added run history loading, full run bundle fetching, artifact tabs, raw artifact endpoints, and memo export.
