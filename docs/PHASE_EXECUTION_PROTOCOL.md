# Crux Product Phase Execution Protocol

This protocol is now the operating rule for every remaining Crux productization phase.

## Required Phase Loop

Every phase must complete these steps before it is considered done:

1. Implement the phase fully within its stated scope.
2. Test the phase with focused tests, E2E-style workflow coverage, and smoke tests where applicable.
3. Validate the implementation against the phase spec.
4. Generate durable artifacts: spec, trace log, changelog, and any user-facing documentation.
5. Report the phase as done and name the next phase.

## Current Phase Status

- Phase 09: Source File Upload Workspace, implemented in Studio v0.6.
- Phase 10: Answer-First Decision Brief, implemented in Studio v0.7.
- Phase 11: Async Run Lifecycle, implemented in Studio v0.8.
- Phase 12: Durable Lifecycle Recovery, implemented in Studio v0.9.
- Phase 13: Evidence Gap Closure Loop, implemented in Studio v0.10.
- Phase 14: Decision Delta Report, implemented in Studio v0.11.
- Phase 15: Exportable Decision Delta Package, implemented in Studio v0.12.
- Phase 16: Decision Lineage Timeline, implemented in Studio v0.13.
- Phase 17: Decision Record Dossier, implemented in Studio v0.14.
- Phase 18: Decision Record Acceptance Gate, implemented in Studio v0.15.
- Phase 19: Acceptance Gate Remediation Planner, implemented in Studio v0.16.
- Phase 20: Guided Remediation Execution, implemented in Studio v0.17.
- Phase 21: Remediation Evidence Ledger, implemented in Studio v0.18.

## Next Phase

Phase 22: Decision Handoff Review Pack.

Goal:

- Create a final pre-export review surface that combines the decision record, acceptance gate, remediation evidence ledger, lineage, human review, source summary, and artifact links into a share-ready handoff pack.

Why this is next:

- Studio now records what the user did to remediate the decision. The next product gap is handoff clarity: before a decision leaves Studio, the user should see one final review pack that explains readiness, evidence, remediation, review status, and exportable artifacts.
- This phase stays local-first and single-user. It does not introduce hosted auth, teams, permissions, hosted storage, or notifications.
