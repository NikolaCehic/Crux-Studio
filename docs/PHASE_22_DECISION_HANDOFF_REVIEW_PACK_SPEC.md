# Phase 22 Decision Handoff Review Pack Spec

## Goal

Create a final pre-export review surface that combines the decision record, acceptance gate, remediation plan, remediation evidence ledger, lineage, human review, source summary, and artifact links into one share-ready handoff pack.

Phase 21 made remediation accountable. Phase 22 makes the final handoff legible.

## Product Thesis

A serious decision workbench should not ask the user to mentally reconcile separate panels before sharing a decision. The handoff review pack is the final derived review state: it says whether the decision is ready, needs review, or is blocked, and it shows the evidence behind that status.

The pack is derived, not persisted. It does not create another source of truth. It is rebuilt from the current project state so it cannot drift from the decision record, gate, remediation evidence, lineage, review, source state, or artifacts.

## Scope

### Server

- Add `GET /api/projects/:projectId/handoff-review-pack`.
- Add `GET /api/projects/:projectId/export/handoff-review-pack`.
- Add `handoff-review-pack` to provider capability reporting.
- Build the pack from existing derived project objects:
  - decision record dossier
  - acceptance gate
  - remediation plan
  - remediation evidence ledger
  - decision lineage
  - human review summary
  - source summary
  - artifact links
- Return final status: `ready`, `needs_review`, or `blocked`.
- Return review sections for decision summary, acceptance, sources, human review, remediation evidence, lineage, and artifacts.
- Return export links for handoff pack, decision record dossier, decision package, and reviewed memo.
- Export the handoff review pack as Markdown.

### Web

- Fetch the handoff review pack when a project is selected.
- Refresh the handoff pack with the rest of the project decision state.
- Render a `Decision handoff review` panel in the workbench.
- Show final status, recommended action, acceptance score, open remediation count, completed remediation count, human review count, artifact count, section checks, and export links.
- Add a `Handoff` navigation item.

### Smoke

- Local smoke fetches the handoff review pack after remediation ledger validation.
- Local smoke validates the handoff status is not blocked after evidence closure.
- Local smoke validates section count and remediation evidence preservation.
- Local smoke validates the Markdown handoff export.

## Out Of Scope

- Hosted team approval.
- Digital signatures.
- Immutable archive snapshots.
- External sharing links.
- Notifications.
- Multi-user audit permissions.

## Acceptance Criteria

- Provider registry includes `handoff-review-pack`.
- Server exposes `GET /api/projects/:projectId/handoff-review-pack`.
- Server exposes `GET /api/projects/:projectId/export/handoff-review-pack`.
- Handoff pack JSON includes status, summary, sections, and export links.
- Handoff pack sections include acceptance, sources, human review, remediation evidence, lineage, and artifacts.
- Handoff Markdown export includes handoff status, review sections, remediation evidence, and export links.
- Studio renders the handoff review panel for the active project.
- Studio exposes the handoff pack export link.
- Focused server and web tests cover the pack.
- Full verification and local smoke pass.

## TDD And Validation

Red expectations:

- Server workflow tests first required the provider capability, handoff pack JSON endpoint, handoff pack Markdown export, summary fields, section coverage, and export links.
- Web workflow tests first required the `Decision handoff review` panel, ready handoff status, recommended action, and export link.
- Local smoke first required the handoff pack after remediation ledger validation.

Green implementation:

- The server derives the handoff pack from current project decision state.
- The web app fetches and renders the handoff pack with the other project decision surfaces.
- The smoke script validates the JSON and Markdown handoff artifacts in the real local provider workflow.

Validation commands:

```bash
pnpm --filter @crux-studio/server test -- product-workflow
pnpm --filter @crux-studio/web test -- src/App.test.tsx
pnpm verify
pnpm smoke:local
```

## Exit Condition

Phase 22 is complete when a user can open a project, see one final handoff review pack, understand whether the decision is ready, needs review, or is blocked, inspect the section evidence, and export the handoff pack as Markdown.
