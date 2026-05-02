# Phase 17 Decision Record Dossier Spec

## Goal

Create one canonical project-level decision record that combines the latest run, human review state, source summary, decision lineage, latest decision delta, key artifact paths, and an exportable Markdown dossier.

Studio already lets a user inspect a run, close evidence gaps, compare improved runs, export a delta package, and read the decision lineage. Phase 17 turns those pieces into a single portable record that answers: what is the current recommendation, why is it ready or not ready, what changed, what did a human review, and what should happen next?

## Product Thesis

A decision workbench becomes product-grade when the final output is not scattered across tabs. The user needs a concise record they can read, export, and hand to another person without reconstructing the story from memo, review, lineage, and comparison panels.

The decision record dossier is that output. It is not a new source of truth. It is a derived project artifact built from the same durable Studio state as runs, reviews, source packs, evidence tasks, jobs, and lineage.

## Scope

### Server

- Add `GET /api/projects/:projectId/decision-record`.
- Add `GET /api/projects/:projectId/export/decision-record-dossier`.
- Derive the record from the latest project run, stored review, source workspace summary, project lineage, latest decision delta, and key run artifact paths.
- Reuse the existing lineage builder and comparison-derived delta data so the dossier agrees with `GET /api/projects/:projectId/lineage`.
- Return 404 for unknown projects or projects without any run.
- Add `dossier` to provider capability reporting.

### Web

- Add a `Decision record` workbench section.
- Fetch the project decision record when a project is selected.
- Refresh the record after completed jobs, source-pack changes, evidence-task resolution, replay, claim review, and evidence annotation.
- Show the final recommendation, readiness, trust, source count, human review summary, latest decision movement, next step, and key artifact paths.
- Add a direct `Export dossier` action.

### Smoke

- Extend local smoke to approve a claim on the latest evidence-closure rerun.
- Fetch the project decision record after lineage validation.
- Fail if the dossier loses latest run, recommendation, next step, source coverage, human review, improved delta, or key artifact paths.
- Export the Markdown dossier and fail if required sections are missing.

## Out Of Scope

- Hosted storage for dossier versions.
- Multi-user approvals.
- Signed audit trails.
- Editing decision records.
- PDF export.

## API Contract

### Read Decision Record

```http
GET /api/projects/:projectId/decision-record
```

Response:

```json
{
  "projectId": "project-support-ops",
  "projectName": "Support Ops",
  "title": "Decision Record Dossier",
  "latestRunId": "newer-run",
  "question": "How should support reduce first-response time?",
  "createdAt": "2026-05-02T21:35:00.000Z",
  "recommendation": "Use a staged approach...",
  "nextStep": "Review claims and export the decision package.",
  "readiness": {
    "status": "ready",
    "label": "Ready for review",
    "reason": "The run is source-backed and inspectable.",
    "blockerCount": 0,
    "nextAction": "Review claims and export the decision package."
  },
  "trust": {
    "status": "pass",
    "confidence": 0.78,
    "blockingIssues": []
  },
  "sourceSummary": {
    "sourceCount": 1,
    "sourceChunkCount": 2,
    "missingEvidence": [],
    "sourcePackName": "Evidence closure notes"
  },
  "review": {
    "approvedClaims": ["claim-1"],
    "rejectedClaims": [],
    "evidenceAnnotations": []
  },
  "lineage": {
    "eventCount": 5,
    "deltaCount": 1,
    "latestDelta": {
      "title": "Decision delta ready",
      "detail": "The newer run is stronger because trust improved.",
      "direction": "improved",
      "label": "+10 pts",
      "nextStep": "Review claims and export the decision package.",
      "closedGapCount": 1,
      "remainingBlockerCount": 0,
      "sourceCountDelta": 1
    }
  },
  "keyArtifacts": {
    "input": "runs/query-inputs/newer-run.yaml",
    "memo": "runs/newer-run/decision_memo.md",
    "report": "runs/newer-run/run_report.html"
  }
}
```

### Export Decision Record Dossier

```http
GET /api/projects/:projectId/export/decision-record-dossier
```

Response:

- `Content-Type: text/markdown; charset=utf-8`
- `Content-Disposition: attachment; filename="<project>-decision-record-dossier.md"`

Required Markdown sections:

- `# Crux Decision Record Dossier`
- `## Final Recommendation`
- `## Decision State`
- `## Human Review`
- `## Decision Lineage`
- `## Key Artifacts`
- `## Final Memo`

## Acceptance Criteria

- Server returns a decision record for a project with at least one run.
- Server record uses the latest project run as the current decision state.
- Server record preserves stored human review state for the latest run.
- Server record includes source counts, missing evidence, key artifact paths, lineage counts, latest delta, recommendation, and next step.
- Markdown export includes final recommendation, decision state, human review, lineage, artifacts, and final memo.
- Studio renders a `Decision record` panel for the active project.
- Studio exposes an `Export dossier` action.
- Studio refreshes the record after user actions that can change review state or project state.
- Local smoke validates the dossier after a real local evidence-closure workflow.

## TDD And Validation

Red expectations:

- Server workflow tests first required `GET /api/projects/:projectId/decision-record`, `GET /api/projects/:projectId/export/decision-record-dossier`, review preservation, source coverage, latest delta, and Markdown sections.
- Web workflow tests first required the workbench to render `Decision record`, `Decision Record Dossier`, `Final recommendation`, human review text, and an export link.

Green implementation:

- The server derives the dossier from the latest run, stored review, project lineage, source summary, latest delta, and run paths.
- The web app fetches and renders a compact dossier panel with shadcn primitives and a direct export action.
- Local smoke validates decision-record JSON and Markdown export in the real local provider workflow.

Validation commands:

```bash
pnpm --filter @crux-studio/server test -- src/product-workflow.test.ts
pnpm --filter @crux-studio/web test -- src/App.test.tsx
pnpm verify
pnpm smoke:local
```

## Exit Condition

Phase 17 is complete when a user can open a project, see the current decision record, verify the recommendation, review state, lineage movement, source state, and next step, then export the dossier as a readable Markdown package.
