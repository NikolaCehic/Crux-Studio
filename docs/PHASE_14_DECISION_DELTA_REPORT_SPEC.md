# Phase 14 Decision Delta Report Spec

## Goal

Make before and after run comparison readable as a decision delta.

When a user closes an evidence gap, reruns Crux, and compares the newer run against the older run, Studio must explain:

- what changed
- why trust moved
- which evidence gaps closed
- which blockers remain
- what the next action should be

## Product Thesis

Run comparison should not feel like a raw JSON diff.

The useful product object is a short decision movement report that lets a user explain whether the newer run is stronger, weaker, or merely comparable.

## Scope

### Server

- Extend `POST /api/runs/compare` with a `delta` object.
- Preserve the existing `leftRunId`, `rightRunId`, `trustMovement`, `differences`, and `summary` fields.
- Compare trust status, trust confidence, readiness status, source counts, source chunks, missing evidence, trust blockers, and agent blockers.
- Calculate closed evidence gaps, new evidence gaps, remaining evidence gaps, closed blockers, new blockers, and remaining blockers.
- Include Studio evidence-task resolution provenance when the newer run was created by resolving a task from the older run.
- Sort same-second reruns deterministically so the improved rerun is treated as newer than the base run.
- Generate deterministic human-readable verdict, notable changes, trust movement label, and next step.

### Web

- Replace the raw compare panel with a Decision Delta panel.
- Show verdict, trust movement, readiness movement, source movement, closed evidence gap count, closed gaps, remaining blockers, next step, and changed artifact paths.
- Keep the panel compact enough to live inside the existing Studio workbench.

### Smoke

- Extend local smoke to compare an evidence closure rerun and assert the delta report exists.
- Log the delta verdict, direction, closed gap count, remaining blocker count, and next step.

## Out Of Scope

- Hosted comparison history.
- Multi-run timeline visualization.
- Exporting a standalone delta report.
- LLM-generated delta prose.
- Replacing the existing raw artifact diff.

## API Contract

`POST /api/runs/compare` returns:

```ts
type RunComparison = {
  leftRunId: string;
  rightRunId: string;
  trustMovement: number;
  differences: Array<{ path: string; left: unknown; right: unknown }>;
  summary: {
    differenceCount: number;
    leftTrust: string;
    rightTrust: string;
    leftReadiness: string;
    rightReadiness: string;
  };
  delta: {
    verdict: string;
    trustMovementLabel: string;
    readinessMovement: {
      from: string;
      to: string;
      changed: boolean;
    };
    trustMovement: {
      fromStatus: string;
      toStatus: string;
      fromConfidence: number;
      toConfidence: number;
      points: number;
      direction: "improved" | "regressed" | "unchanged";
    };
    sourceMovement: {
      sourceCountDelta: number;
      sourceChunkDelta: number;
      closedGaps: string[];
      newGaps: string[];
      remainingGaps: string[];
    };
    blockerMovement: {
      closedBlockers: string[];
      newBlockers: string[];
      remainingBlockers: string[];
    };
    notableChanges: string[];
    nextStep: string;
  };
};
```

## Acceptance Criteria

- A source-backed replay comparison returns a stable delta even when trust and readiness are unchanged.
- An evidence closure comparison reports readiness movement from warning to ready when source closure clears the gap.
- Closed missing evidence and resolved evidence task titles appear under `delta.sourceMovement.closedGaps`.
- Cleared trust and agent blockers appear under `delta.blockerMovement.closedBlockers`.
- Studio renders a readable Decision Delta panel after Compare Latest.
- The panel includes the human verdict, trust movement label, readiness movement, source movement, closed gap count, remaining blockers, next step, and changed artifact paths.
- Local smoke fails if comparison lacks a readable delta report.
- Compare Latest uses the newer rerun as the right-hand side even when the base run and rerun share a second-level timestamp.

## TDD And Validation

Red expectations:

- Server workflow tests first expected `delta` on replay and evidence closure comparisons.
- Web workflow tests first expected Studio to render `Decision delta`, the verdict, trust label, closed gap count, changed artifact paths, and next step.

Green implementation:

- Server compare now builds deterministic delta movement.
- Web compare now renders the decision delta surface.
- Local smoke now validates the delta shape against the real local Harness provider.

Validation commands:

```bash
pnpm --filter @crux-studio/server test -- src/product-workflow.test.ts
pnpm --filter @crux-studio/web test -- src/App.test.tsx
pnpm verify
pnpm smoke:local
```

## Exit Condition

Phase 14 is complete when a user can close an evidence gap, rerun Crux, compare the older and newer runs, and understand in one panel whether the newer run is stronger and what still blocks readiness.
