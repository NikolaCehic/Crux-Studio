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

## Next Phase

Phase 13: Evidence Gap Closure Loop.

Goal:

- Turn missing evidence, blockers, and agent next actions into explicit source tasks that can be resolved, rerun, and compared.

Why this is next:

- Studio can now survive the local run lifecycle. The next product gap is helping users close the evidence gaps that keep a decision at `usable_with_warnings` instead of ready.
