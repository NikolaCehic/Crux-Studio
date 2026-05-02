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

## Next Phase

Phase 11: Async Run Lifecycle.

Goal:

- Make long-running local Harness work feel controlled and observable from Studio.

Why this is next:

- The answer-first workbench now makes completed runs usable. The next product risk is run lifecycle control: users need clear pending, running, completed, failed, retry, and cancellation states before Crux feels dependable for heavier real-world runs.
