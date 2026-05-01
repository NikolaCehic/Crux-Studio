# Trace Log

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
