# Changelog

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
