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

## Next Phase

Phase 12: Durable Lifecycle Recovery.

Goal:

- Make local lifecycle jobs recoverable across server restarts and preserve completed, failed, cancelled, and retryable job history.

Why this is next:

- Studio now has a lifecycle layer while the server process is alive. The next reliability gap is durability: serious local workflows should not lose job history or retry context when the server restarts.
