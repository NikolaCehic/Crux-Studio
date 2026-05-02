# Crux Productization Plan

This plan treats Crux Harness as the analysis engine and Crux Studio as the primary product surface. The goal is a local-first product that can become hosted later without diluting the core trust loop.

Product thesis:

```text
Ask a hard question
-> Crux Harness creates an auditable run
-> Crux Studio exposes the memo, claims, evidence, agents, evals, diagnostics, and trace
-> The user fixes sources or review issues
-> Crux produces a trusted decision artifact
```

## Phase 1: Product Contract And Demo Spine

Goal:

- Make the product explainable in one minute and demonstrable in ten minutes.

Scope:

- Finalize product positioning around auditable decision analysis.
- Define the first user profile: operators, analysts, product and strategy teams, technical decision owners.
- Create five canonical demo questions:
  - diversified investment allocation
  - product roadmap prioritization
  - support first-response reduction
  - market-entry decision
  - technical architecture choice
- Add demo scripts that show the full Studio loop.

Acceptance:

- A new user understands what Crux is before touching the CLI.
- Studio can show a polished demo with a run, trust state, artifacts, and export.

Optimality:

- This is the correct first productization phase because the product must be legible before it is made broader.

## Phase 2: Harness-Studio Integration Hardening

Goal:

- Make Studio consume the Harness through a stable, typed, version-aware provider boundary.

Scope:

- Keep browser code free of harness internals.
- Normalize all run artifacts into Studio provider types.
- Surface harness version, artifact support, provider status, and missing-capability errors.
- Add first-class support for bounded agents from `agent_manifest.json` and `agent_findings.json`.
- Keep local and mock providers contract-compatible.

Acceptance:

- Studio can create, list, fetch, inspect, and export real Harness runs.
- Studio displays bounded agent status and findings without raw JSON-only fallback.
- Provider tests prove local Harness bundles map to the Studio contract.

Optimality:

- This is the highest-leverage engineering phase because it turns the engine into a product backend without coupling the UI to engine internals.

## Phase 3: Studio Trust Workbench

Goal:

- Make Studio the best way to understand whether a run is usable.

Scope:

- Improve the trust gate with agent, council, diagnostics, and source quality summary.
- Add a dedicated Agents artifact tab and right-rail agent synthesis.
- Add clear "ready", "usable with warnings", and "blocked" states.
- Group blockers by source, claim, evidence, agent, council, and memo faithfulness.

Acceptance:

- Within ten seconds, a user can see what was asked, what Crux recommends, whether it is usable, and what blocks trust.

Optimality:

- This phase turns Studio from a viewer into a trust cockpit, which is the core product distinction.

## Phase 4: Source And Evidence Workspace

Goal:

- Let users improve weak runs by adding real source material.

Scope:

- Improve source pack creation and preview.
- Support Markdown, TXT, CSV, and PDF ingestion when the Harness supports it.
- Show source inventory and chunks in Studio.
- Let missing evidence generate source tasks.
- Rerun with selected source packs and compare trust movement.

Acceptance:

- Users can attach real documents, rerun, and see evidence become source-backed.

Optimality:

- Most trust failures are source failures, so this phase creates the most practical user value after inspection.

## Phase 5: Human Review And Export

Goal:

- Turn Crux output into accountable decision artifacts.

Scope:

- Improve claim approval and rejection flows.
- Improve evidence annotation and review summaries.
- Add reviewed-memo export states.
- Add reviewer notes to compare output.
- Preserve original machine artifacts.

Acceptance:

- A user can produce a reviewed memo that clearly separates machine output from human judgment.

Optimality:

- This makes Crux useful in real organizational workflows where accountability matters.

## Phase 6: Replay, Diff, And Iteration

Goal:

- Make improvement measurable.

Scope:

- Add richer run history.
- Compare source, prompt, stage, artifact contract, agent findings, eval scores, and trust movement.
- Add replay controls tied to agent next actions and missing evidence.
- Show before and after movement in a compact comparison view.

Acceptance:

- Users can see exactly what changed between runs and whether trust improved.

Optimality:

- This completes the loop: ask, inspect, improve, rerun, compare.

## Phase 7: Packaging And Shareable Product

Goal:

- Make Crux easy to install, try, and share.

Scope:

- One-command local setup.
- Seeded demo data.
- Better error states when Harness is missing or outdated.
- Public screenshots and demo walkthroughs.
- Release checklist across Harness and Studio.

Acceptance:

- A new user can run Crux Studio locally in under ten minutes and understand the first demo.

Optimality:

- Packaging should happen after the trust loop is strong enough to be worth sharing.

## Phase 8: Real-World Hardening

Goal:

- Make the local product reliable for serious users.

Scope:

- Larger source packs.
- More adversarial UI and provider tests.
- Performance checks for large bundles.
- Backward compatibility with older Harness runs.
- Security review for local file and artifact access.
- Optional model-provider and connector adapters.

Acceptance:

- Crux can handle real local workflows without brittle setup or fragile run inspection.

Optimality:

- This phase makes the product robust before hosted-team complexity is introduced.

## Deferred Hosted Control Plane

The following remain intentionally out of scope for this stage:

- auth
- teams
- permissions
- hosted database
- object storage
- background jobs
- deployment observability
- audit logs

These are valuable later, but they should not distract from the local-first trust loop yet.

## Implementation Start

The first implementation slice is Phase 2 plus the first part of Phase 3:

- add bounded-agent fields to the shared provider contract
- map Harness `agent_manifest.json` and `agent_findings.json` in the local provider
- expose agent artifacts from the Studio server
- show an Agents tab in Studio
- show bounded-agent synthesis in the right inspector
- keep mock and local providers contract-compatible through tests

