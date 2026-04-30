# Trace Log

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
