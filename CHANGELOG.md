# Changelog

## 0.2.0 - 2026-05-01

- Added local Studio persistence for projects, source packs, run links, and human review state.
- Added project and source-pack APIs, including source file metadata and project-scoped run history.
- Added provider registry, reviewed memo export, replay, and run comparison APIs.
- Added source-pack-aware provider input and source-backed mock runs that improve trust status and confidence.
- Added Studio UI controls for provider capabilities, project selection, source pack creation, source-backed runs, claim review, evidence annotation, replay, comparison, and reviewed memo export.
- Added TDD coverage for the complete product workflow across provider, server, and web layers.
- Added `.studio/` to ignored local runtime state.

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
