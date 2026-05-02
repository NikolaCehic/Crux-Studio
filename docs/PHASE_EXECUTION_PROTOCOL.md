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

## Next Phase

Phase 10: Answer-First Decision Brief.

Goal:

- Make Studio show a clean, normal-user decision answer first while keeping the full run, claims, evidence, agents, sources, council, diagnostics, trace, review, replay, and export surfaces inspectable.

Why this is next:

- Source-backed runs now work. The highest-leverage product gap is readability for non-operators: a user should immediately see the practical answer, then inspect why Crux believes it.
