# Phase 18 Decision Record Acceptance Gate Spec

## Goal

Make the decision record explicitly actionable by adding a derived acceptance gate that tells the user whether the latest project dossier is ready to share, needs review, or is blocked.

Phase 17 assembled the dossier. Phase 18 answers the next operational question: can someone act on this dossier now?

## Product Thesis

A dossier is useful only when its actionability is visible. Users should not have to mentally combine trust, readiness, source coverage, review state, blockers, lineage movement, and export availability before deciding what to do next.

The acceptance gate is not a new approval database. It is a derived checklist built from the latest project decision record. That keeps the gate explainable, repeatable, and aligned with the artifacts users already inspect.

## Scope

### Server

- Add `GET /api/projects/:projectId/acceptance-gate`.
- Add `acceptance-gate` to provider capability reporting.
- Derive the gate from the existing decision record dossier.
- Return 404 for unknown projects or projects without a run.
- Score checks with pass, warn, and fail states.
- Return one of `accepted`, `needs_review`, or `blocked`.

### Checks

- `trust_gate`: trust status and confidence.
- `readiness`: latest run readiness status and next action.
- `source_coverage`: source inventory and source chunks.
- `missing_evidence`: remaining source evidence gaps.
- `human_review`: approved and rejected claim state.
- `lineage_delta`: latest decision movement.
- `blockers`: trust, readiness, and lineage blockers.
- `export_package`: memo availability for dossier export.

### Web

- Add an `Acceptance gate` workbench section.
- Fetch the gate when a project is selected.
- Refresh the gate whenever project decision state can change.
- Show overall label, score, recommended action, pass totals, and all checks.
- Keep the panel consistent with the existing shadcn-based Studio workbench.

### Smoke

- Extend local smoke to fetch the project acceptance gate after the dossier export.
- Fail if the real local evidence-closure flow leaves the gate blocked.
- Fail if required checks do not pass after source-backed evidence closure and human review.
- Include acceptance status, score, and check counts in the smoke JSON artifact.

## API Contract

```http
GET /api/projects/:projectId/acceptance-gate
```

Response:

```json
{
  "projectId": "project-support-ops",
  "projectName": "Support Ops",
  "latestRunId": "newer-run",
  "status": "accepted",
  "label": "Ready to share",
  "score": 1,
  "recommendedAction": "Export dossier and share with the decision owner.",
  "checks": [
    {
      "id": "trust_gate",
      "label": "Trust gate",
      "status": "pass",
      "detail": "The latest run passed with 86% confidence.",
      "nextAction": "Keep trust evidence attached to the dossier.",
      "weight": 2
    }
  ],
  "summary": {
    "passCount": 8,
    "warnCount": 0,
    "failCount": 0,
    "requiredPassCount": 4,
    "totalCount": 8
  }
}
```

## Status Rules

- `accepted`: all checks pass.
- `needs_review`: no check fails, but at least one check warns.
- `blocked`: any check fails.

Score uses weighted check value:

- pass: full weight
- warn: half weight
- fail: zero

## Out Of Scope

- Multi-user approval workflows.
- Signed acceptance events.
- Hosted audit logs.
- Editable checklist state.
- PDF export.

## Acceptance Criteria

- Server exposes `GET /api/projects/:projectId/acceptance-gate`.
- Provider registry includes `acceptance-gate`.
- Gate derives from the latest project decision record.
- Gate includes the eight scoped checks.
- Gate returns `accepted` for a fully reviewed, source-backed, improved dossier.
- Studio renders an `Acceptance gate` panel for the active project.
- Studio shows label, score, recommendation, and checklist details.
- Studio refreshes the gate after run, review, source, evidence, replay, and comparison state changes.
- Local smoke validates the gate against a real local evidence-closure flow.

## TDD And Validation

Red expectations:

- Server workflow tests first required provider capability reporting and `GET /api/projects/:projectId/acceptance-gate`.
- Server workflow tests required an accepted gate after source-backed rerun, human review, improved lineage, and dossier export availability.
- Web workflow tests first required the workbench to render `Acceptance gate`, `Ready to share`, the recommended action, and `Human review`.

Green implementation:

- The server derives gate checks from the decision record dossier.
- The web app fetches and renders the gate with shadcn primitives.
- Local file-store writes are serialized so project, source, job, and evidence-task state remains durable while smoke and UI preload requests run concurrently.
- Local smoke validates gate status, required passing checks, score, and summary counts.

Validation commands:

```bash
pnpm --filter @crux-studio/server test -- src/product-workflow.test.ts
pnpm --filter @crux-studio/web test -- src/App.test.tsx
pnpm verify
pnpm smoke:local
```

## Exit Condition

Phase 18 is complete when a user can open a project dossier and immediately see whether it is ready to share, needs review, or is blocked, with every reason traceable to the underlying run artifacts.
