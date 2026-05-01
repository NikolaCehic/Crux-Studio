# Changelog

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
