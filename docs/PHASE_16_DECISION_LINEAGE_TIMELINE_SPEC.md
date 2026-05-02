# Phase 16 Decision Lineage Timeline Spec

## Goal

Make the path from original run to evidence task to source-backed rerun to decision delta visible as a project-level lineage.

Studio already supports evidence closure, reruns, comparisons, and delta package export. Phase 16 connects those pieces so a user can see how a decision matured over time without reconstructing the story from separate panels.

## Product Thesis

A trusted decision is rarely a single run. It is a chain of improvement: an initial answer, visible gaps, added evidence, a rerun, a stronger or weaker delta, and a next action.

The lineage timeline should make that chain legible at a glance. It should answer: what changed, what evidence was added, what rerun resulted, and what decision movement became available.

## Scope

### Server

- Add `GET /api/projects/:projectId/lineage`.
- Return project-level lineage events from durable Studio state.
- Include source-pack creation, run creation, evidence-task opening, evidence-task resolution, evidence-closure rerun completion, and decision-delta availability.
- Reuse the same comparison logic as `POST /api/runs/compare` for lineage delta summaries.
- Include a concise project summary with run count, source pack count, task counts, delta count, latest run, latest readiness, latest trust, and next step.

### Web

- Add a `Decision lineage` section to the workbench.
- Fetch lineage when a project is selected.
- Refresh lineage after source-pack creation, evidence-task resolution, and completed runs.
- Show events as a compact chronological timeline with event type, detail, IDs, delta movement, and next step.
- Add a Lineage navigation item.

### Smoke

- Extend local smoke to fetch project lineage after evidence closure.
- Fail if the lineage does not include run creation, task opening, task resolution, rerun completion, and decision-delta events.
- Fail if the lineage delta does not preserve the improved decision movement.

## Out Of Scope

- Hosted audit logs.
- Multi-user activity attribution.
- Branching graph visualization.
- Exporting the lineage timeline.
- Editing lineage events.

## API Contract

Request:

```http
GET /api/projects/:projectId/lineage
```

Response:

```json
{
  "projectId": "project-support-ops",
  "projectName": "Support Ops",
  "summary": {
    "runCount": 2,
    "sourcePackCount": 1,
    "evidenceTaskCount": 4,
    "resolvedTaskCount": 1,
    "openTaskCount": 3,
    "deltaCount": 1,
    "latestRunId": "newer-run",
    "latestReadiness": "ready",
    "latestTrust": "pass",
    "nextStep": "Review claims and export the decision package."
  },
  "events": [
    {
      "id": "older-run-created",
      "type": "run_created",
      "timestamp": "2026-05-02T20:45:05.000Z",
      "title": "Run created",
      "detail": "How should support reduce first-response time this month?",
      "runId": "older-run",
      "status": "usable_with_warnings",
      "trustStatus": "warn",
      "readinessStatus": "usable_with_warnings"
    },
    {
      "id": "older-run-to-newer-run-delta",
      "type": "decision_delta_available",
      "timestamp": "2026-05-02T20:45:06.000Z",
      "title": "Decision delta ready",
      "detail": "The newer run is stronger because trust improved.",
      "leftRunId": "older-run",
      "rightRunId": "newer-run",
      "delta": {
        "direction": "improved",
        "label": "+18 pts",
        "nextStep": "Review claims and export the decision package.",
        "closedGapCount": 2,
        "remainingBlockerCount": 0,
        "sourceCountDelta": 1
      }
    }
  ]
}
```

## Acceptance Criteria

- Server returns 404 for unknown projects.
- Server lineage includes durable project source packs, project runs, stored evidence tasks, resolved-task provenance, rerun jobs, and delta summaries.
- Server lineage is chronologically ordered with stable event priority for same-timestamp events.
- Studio renders a `Decision lineage` section for the active project.
- Studio shows summary counts, latest readiness, next step, and recent lineage events.
- Studio refreshes lineage after actions that change project history.
- Local smoke validates lineage through a real source-backed evidence closure workflow.

## TDD And Validation

Red expectations:

- Server workflow tests first required `GET /api/projects/:projectId/lineage`, summary counts, event types, rerun provenance, and improved delta metadata.
- Web workflow tests first required the workbench to render `Decision lineage`, `Decision delta ready`, the run pair, and the lineage next step.

Green implementation:

- The server now derives lineage from project runs, source packs, durable evidence tasks, run jobs, and the existing comparison engine.
- The web app now fetches and renders a project timeline with shadcn primitives and lucide icons.
- Local smoke now validates the lineage chain in the real local provider flow.

Validation commands:

```bash
pnpm --filter @crux-studio/server test -- src/product-workflow.test.ts
pnpm --filter @crux-studio/web test -- src/App.test.tsx
pnpm verify
pnpm smoke:local
```

## Exit Condition

Phase 16 is complete when a user can open a project and see a readable timeline connecting the original run, evidence gaps, source-backed rerun, and resulting decision delta.
