# Phase 20 Guided Remediation Execution Spec

## Goal

Turn remediation-plan CTAs into guided in-product execution flows that carry action context into the right Studio workflow and show whether the project gate changed afterward.

Phase 19 answered what to do next. Phase 20 makes those actions executable from the same workbench.

## Product Thesis

A remediation plan is useful only if the user can act on it without translating the plan into separate UI steps. Studio should make each remediation action behave like a workflow launcher: sources open source intake, reviews open claims, reruns replay the run, comparisons run the delta path, and exports keep the handoff available.

This phase still avoids hosted task persistence. The guide is local UI state derived from the current plan and current project state. That keeps the interaction explainable while making the product feel much closer to an operating workbench.

## Scope

### Web

- Add an active guided remediation state for the current project.
- Preserve the action label, priority, action type, start time, and starting plan signature.
- Render an inline `Guided remediation` panel above the remediation plan summary while a guide is active.
- Show the current action, priority, action type, and gate-watch status.
- Clear the guide when the selected project changes.
- Let users clear the guide manually.

### Action Routing

- `attach_sources` and `close_evidence_gap` prefill the source-pack name, prefill the source draft with evidence-gap context, select the Sources tab, and scroll toward the ask/source workflow.
- `review_claims` selects the Claims tab and scrolls toward the memo artifacts.
- `compare_rerun` selects the Brief tab, scrolls toward lineage, and runs the latest-run comparison when at least two runs are available.
- `regenerate_run` selects the Brief tab and replays the current run.
- `resolve_blocker` selects Sources when the blocker includes an evidence gap, otherwise selects Diagnostics.
- `export_dossier` keeps the dossier export link behavior while still activating the guide.

### Gate Movement

- Capture the remediation plan signature when an action begins.
- Compare the active guide signature against the current remediation plan.
- Show `Watching gate: no gate change yet.` when the plan has not changed.
- Show `Gate changed after this action.` when the latest plan differs from the starting signature.
- Treat the action as cleared when the original action no longer exists in the refreshed plan.

### Out Of Scope

- Persisted remediation task history.
- Task assignment.
- Hosted notifications.
- Automatic background execution of every remediation action.
- Replacing the existing evidence-task closure loop.

## Acceptance Criteria

- Each remediation action CTA is clickable unless it is an export link that should retain normal link behavior.
- Source and evidence actions prefill source intake with the action context.
- Claim-review actions select the Claims tab.
- Rerun actions replay the active run.
- Comparison actions call the existing run comparison flow.
- Export actions preserve dossier export navigation.
- The guide panel shows the active action and gate-watch state.
- The guide reports gate movement after a project-state refresh changes the remediation plan.
- Focused web tests cover source guidance, gate movement, claim review routing, replay, and comparison.
- Full verification and local smoke pass after implementation.

## TDD And Validation

Red expectations:

- Web workflow tests first required a remediation action to open `Guided remediation`, select the correct surface, prefill source-pack input, and show the initial gate-watch status.
- Web workflow tests required a source-pack action followed by a refreshed remediation plan to show gate movement.
- Web workflow tests required claim-review routing, replay, and comparison routing from action CTAs.

Green implementation:

- The web app now tracks one active remediation guide per selected project.
- Remediation actions route to existing Studio workflows instead of adding a new task system.
- The guide panel compares the active action's initial plan signature against the latest plan to surface movement.

Validation commands:

```bash
pnpm --filter @crux-studio/web test -- src/App.test.tsx
pnpm --filter @crux-studio/web check
pnpm verify
pnpm smoke:local
```

## Exit Condition

Phase 20 is complete when a user can click a remediation action and immediately land in the right workflow with context carried forward, then see whether that action moved the acceptance gate.
