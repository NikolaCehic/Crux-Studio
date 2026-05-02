# Phase 09: Source File Upload Workspace

## Goal

Make the local source workspace usable with real files, not only pasted text.

## Optimality Hypothesis

This is the most optimal next phase because the Harness now accepts materialized source packs from Studio. The highest-friction remaining step is user input: a real product must let users select existing Markdown, TXT, and CSV files and turn them into source-backed runs without manual copy/paste.

## Scope

- Add multi-file selection to the ask panel source-pack workflow.
- Support Markdown, TXT, and CSV file selection.
- Read selected file contents in the browser.
- Show selected file names and sizes before creation.
- Send selected files through the existing `/api/source-packs` API.
- Preserve the pasted-source fallback for quick notes.
- Keep the UI inside the existing workbench, without adding hosted storage or auth.

## Non-Goals

- No PDF parsing in this phase.
- No drag-and-drop styling in this phase.
- No hosted object storage.
- No connector sync.

## Acceptance Criteria

- A user can select multiple local source files in Studio.
- Studio displays the selected files before source-pack creation.
- Creating a source pack sends the selected file names and contents to the server.
- Existing pasted-source behavior still works.
- Studio verification passes.
- Local smoke still proves source-backed Harness runs preserve source inventory and chunks.

## Validation

- Web E2E-style workflow test: `pnpm --filter @crux-studio/web test -- src/App.test.tsx`.
- Product verification gate: `pnpm verify`.
- Local smoke gate: `pnpm smoke:local` against `CRUX_STUDIO_PROVIDER=local`.

## Artifacts

- `apps/web/src/App.tsx`
- `apps/web/src/App.test.tsx`
- `CHANGELOG.md`
- `README.md`
- `docs/TRACE_LOG.md`
- `docs/PRODUCTIZATION_PLAN.md`

## Phase Result

Status: done.

Validation:

- `pnpm --filter @crux-studio/web test -- src/App.test.tsx` passed.
- `pnpm verify` passed.
- `pnpm smoke:local` passed against the local Harness provider.

Next phase:

- Phase 10: Answer-First Decision Brief.
