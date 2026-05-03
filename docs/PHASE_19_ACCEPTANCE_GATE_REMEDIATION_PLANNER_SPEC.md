# Phase 19 Acceptance Gate Remediation Planner Spec

## Goal

Turn every failed or warning acceptance-gate check into a prioritized next action that helps the user move the latest project dossier toward acceptance.

Phase 18 answered whether a dossier is ready, needs review, or is blocked. Phase 19 answers what to do next.

## Product Thesis

An acceptance gate is only half useful if the user must manually translate each warning into work. The remediation planner should make the next step explicit while staying traceable to the derived gate and decision record.

The planner is not a mutable task system yet. It is a deterministic, derived action plan. That keeps the work explainable, cheap to recompute, and aligned with the latest dossier state.

## Scope

### Server

- Add `GET /api/projects/:projectId/remediation-plan`.
- Add `remediation-plan` to provider capability reporting.
- Derive the plan from the existing decision record dossier and acceptance gate.
- Return 404 for unknown projects or projects without a run.
- Convert each non-passing gate check into one remediation action.
- Return one ready export action when all gate checks pass.

### Action Mapping

- `source_coverage` fail becomes `attach_sources` with critical priority.
- `missing_evidence` warn becomes `close_evidence_gap` with high priority.
- `human_review` warn or fail becomes `review_claims`.
- `lineage_delta` warn or fail becomes `compare_rerun`.
- `export_package` fail becomes `regenerate_run`.
- `readiness`, `trust_gate`, and `blockers` become either `close_evidence_gap` when source-related or `resolve_blocker` otherwise.
- Accepted dossiers produce one `export_dossier` ready action.

### Web

- Add a `Remediation plan` workbench section.
- Fetch the plan when a project is selected.
- Refresh the plan whenever project decision state can change.
- Show status, recommended action, blocking/warning/ready counts, action labels, rationale, priority, source gate check, and CTA.
- Keep the panel consistent with the existing shadcn-based Studio workbench.

### Smoke

- Extend local smoke to fetch the project remediation plan after acceptance-gate validation.
- Fail if a needs-review gate does not produce action-required remediation.
- Fail if the plan omits expected evidence and readiness actions.
- Include remediation status and action counts in the smoke JSON artifact.

## API Contract

```http
GET /api/projects/:projectId/remediation-plan
```

Response:

```json
{
  "projectId": "project-support-ops",
  "projectName": "Support Ops",
  "latestRunId": "latest-run",
  "status": "action_required",
  "recommendedAction": "Close the remaining evidence gaps.",
  "summary": {
    "totalActions": 2,
    "blockingActions": 0,
    "warningActions": 2,
    "readyActions": 0
  },
  "actions": [
    {
      "id": "missing_evidence-remediation",
      "gateCheckId": "missing_evidence",
      "label": "Close missing evidence",
      "status": "warn",
      "priority": "high",
      "actionType": "close_evidence_gap",
      "rationale": "1 evidence gap still needs attention.",
      "recommendedAction": "Attach source material for the missing evidence.",
      "ctaLabel": "Close evidence gap",
      "href": "#artifacts",
      "target": {
        "runId": "latest-run",
        "evidenceGap": "Attach source material for the missing evidence."
      }
    }
  ]
}
```

## Status Rules

- `complete`: no warning or failing gate checks remain.
- `action_required`: at least one warning action exists and no failing action exists.
- `blocked`: at least one failing action exists.

Actions sort by priority, then status severity, then gate-check order. Source coverage appears before other critical actions so a source-free dossier points users to the highest-leverage fix first.

## Out Of Scope

- Persisted remediation tasks.
- Task assignment.
- Multi-user workflow state.
- Hosted notifications.
- Automatic source discovery.
- Automatic execution of remediation actions.

## Acceptance Criteria

- Server exposes `GET /api/projects/:projectId/remediation-plan`.
- Provider registry includes `remediation-plan`.
- Draft source-free dossiers produce a blocked plan with source attachment and review actions.
- Accepted dossiers produce a complete plan with an export action.
- Studio renders a `Remediation plan` panel for the active project.
- Studio shows complete-state copy, action labels, priorities, rationale, and CTAs.
- Studio refreshes remediation after run, review, source, evidence, replay, and comparison state changes.
- Local smoke validates remediation status and action coverage against a real local evidence-closure flow.

## TDD And Validation

Red expectations:

- Server workflow tests first required provider capability reporting and `GET /api/projects/:projectId/remediation-plan`.
- Server workflow tests required blocked source-free remediation and complete accepted-dossier remediation.
- Web workflow tests first required the workbench to render `Remediation plan`, `Acceptance work is complete.`, and `Export accepted dossier`.
- Local smoke first required a remediation plan with actions after the real evidence-closure workflow.

Green implementation:

- The server derives remediation from the acceptance gate without storing duplicate task state.
- Project decision-state endpoints load linked project runs directly so UI refreshes do not depend on scanning every local Harness run.
- The web app fetches and renders the planner with shadcn primitives.
- Local smoke validates plan status and action counts after gate validation.

Validation commands:

```bash
pnpm --filter @crux-studio/server test -- product-workflow
pnpm --filter @crux-studio/web test -- App.test.tsx
pnpm verify
pnpm smoke:local
```

## Exit Condition

Phase 19 is complete when a user can see not only whether the latest dossier is accepted, blocked, or needs review, but also the exact prioritized action sequence required to move it forward.
