# Phase 21 Remediation Evidence Ledger Spec

## Goal

Persist a local audit trail for guided remediation so a decision record can explain which remediation actions were started, which workflows were triggered, whether the gate moved, and which actions were marked complete.

Phase 20 made remediation executable. Phase 21 makes remediation accountable.

## Product Thesis

A serious decision workbench should not only show the final answer. It should preserve the work that made the answer safer to share. The remediation evidence ledger turns guided remediation from transient UI state into a durable local record that can be inspected in Studio and exported with the dossier.

The ledger stays local-first. It is not a hosted task manager, assignment system, or notification engine. It records evidence of remediation activity inside the existing single-user workspace.

## Scope

### Server

- Add `GET /api/projects/:projectId/remediation-ledger`.
- Add `POST /api/projects/:projectId/remediation-ledger/events`.
- Persist remediation ledger events in the Studio store.
- Add `remediation-ledger` to provider capability reporting.
- Return a project-level ledger summary with event count, action count, gate movement count, completed action count, latest event timestamp, and recent events.
- Include remediation ledger summary and recent events in the decision record dossier.
- Include a `Remediation Evidence Ledger` section in the Markdown dossier export.

### Event Contract

Ledger events support:

- `action_started`
- `workflow_triggered`
- `gate_changed`
- `action_completed`
- `action_dismissed`

Each event records:

- project id
- actor
- event type
- remediation action identity and target
- remediation plan state and signature
- outcome status, detail, gate status, and optional before/after signatures
- created timestamp

### Web

- Fetch the remediation ledger when a project is selected.
- Render a `Remediation evidence ledger` section near the remediation plan.
- Show event, action, gate movement, and completed-action counts.
- Show the latest ledger events with event type, action label, outcome, detail, gate status, and timestamp.
- Record `action_started` and `workflow_triggered` when a guided remediation action starts.
- Record `gate_changed` when a refreshed remediation plan changes after a guide starts.
- Add a `Mark complete` action to record `action_completed`.
- Record `action_dismissed` when the guide is cleared without completion.

### Smoke

- Local smoke records remediation ledger start and completion events.
- Local smoke validates the ledger summary.
- Local smoke validates that the Markdown dossier export includes remediation ledger evidence.

## Out Of Scope

- Multi-user audit logs.
- Hosted task assignment.
- Notifications.
- Permissioned history.
- Tamper-proof signed audit logs.
- Automatic proof extraction from external systems.

## Acceptance Criteria

- Server persists remediation ledger events in memory and file-backed stores.
- Server exposes `GET /api/projects/:projectId/remediation-ledger`.
- Server exposes `POST /api/projects/:projectId/remediation-ledger/events`.
- Provider registry includes `remediation-ledger`.
- Decision record dossier JSON includes remediation ledger summary.
- Decision record dossier Markdown export includes a `Remediation Evidence Ledger` section.
- Studio renders a remediation ledger panel for the active project.
- Studio records guided action start, workflow trigger, gate movement, completion, and dismissal events.
- Focused server and web tests cover the ledger.
- Full verification and local smoke pass.

## TDD And Validation

Red expectations:

- Server workflow tests first required project remediation ledger POST and GET endpoints.
- Server workflow tests required ledger summary counts, decision record JSON inclusion, and Markdown dossier export inclusion.
- Web workflow tests first required a `Remediation evidence ledger` section and ledger event recording when guided remediation starts.
- Web workflow tests required gate movement and action completion to be recorded from the guided remediation UI.
- Local smoke first required ledger event persistence and dossier export evidence.

Green implementation:

- The Studio store persists remediation ledger events beside projects, source packs, jobs, evidence tasks, and reviews.
- The server builds a derived project ledger summary from stored events.
- The web app records ledger events from guided remediation without introducing a task-management system.
- The dossier export now includes the ledger summary and recent events.

Validation commands:

```bash
pnpm --filter @crux-studio/server test -- product-workflow
pnpm --filter @crux-studio/web test -- src/App.test.tsx
pnpm verify
pnpm smoke:local
```

## Exit Condition

Phase 21 is complete when a user can start a guided remediation action, see that action recorded in Studio, mark it complete, and export a decision record that preserves the remediation evidence trail.
