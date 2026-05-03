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

## Local-First Implementation Status

Implemented in Studio v0.4 through v0.18:

- Phase 1: canonical demo questions are exposed through `/api/demos` and the ask panel.
- Phase 2: the provider boundary carries readiness, Harness version, source summaries, bounded agents, source inventory, source chunks, and eval reports.
- Phase 3: Studio shows readiness, bounded-agent synthesis, source state, agent findings, and source artifacts as first-class trust surfaces.
- Phase 4: source packs are createable from the UI, source inventories and chunks are inspectable, and missing evidence is surfaced.
- Phase 5: reviewed memo export remains available and decision package export now combines readiness, trust, agents, sources, review, and memo content.
- Phase 6: compare now includes readiness, trust, agent, source, and run identity movement.
- Phase 7: `pnpm dev:local`, `pnpm smoke:local`, `pnpm verify`, and `docs/DEMO_GUIDE.md` make the product easier to run and share.
- Phase 8: artifact access remains whitelisted and the local smoke check verifies server health, web response, provider registry, demos, run indexing, and agent-aware run availability.
- Productization bridge: Studio v0.5 now materializes uploaded source-pack files into local Harness source packs before asking, so arbitrary-question runs produce real `source_inventory.json` and `source_chunks.json` instead of relying on pasted context.
- Phase 09: Studio v0.6 adds multi-file Markdown, TXT, and CSV selection for source-pack creation while preserving the pasted-source fallback.
- Phase 10: Studio v0.7 adds an answer-first decision brief as the default run surface, while keeping the full memo and structured artifacts one click away.
- Phase 11: Studio v0.8 adds an async lifecycle layer for new runs, including queued, running, completed, failed, cancelled, and retry states.
- Phase 12: Studio v0.9 persists lifecycle job history, resumes queued jobs after local restart, and makes interrupted running jobs retryable.
- Phase 13: Studio v0.10 turns source gaps into evidence tasks that can create source packs, rerun Crux, and compare the improved run.
- Phase 14: Studio v0.11 turns run comparison into a decision delta report with verdict, trust movement, source movement, closed gaps, blockers, notable changes, and next step.
- Phase 15: Studio v0.12 exports the decision delta as a Markdown package with memo, review, source movement, blocker movement, and changed artifact paths.
- Phase 16: Studio v0.13 adds a project-level decision lineage timeline that connects source packs, runs, evidence tasks, reruns, and decision deltas.
- Phase 17: Studio v0.14 adds a project-level decision record dossier that combines final recommendation, review state, source summary, lineage, latest delta, key artifacts, and Markdown export.
- Phase 18: Studio v0.15 adds a project-level acceptance gate that scores whether the latest dossier is ready to share, needs review, or is blocked.
- Phase 19: Studio v0.16 adds a project-level remediation planner that turns non-passing acceptance checks into prioritized next actions.
- Phase 20: Studio v0.17 turns remediation actions into guided execution flows that prefill source intake, route claim review, trigger replay and comparison, and watch for gate movement.
- Phase 21: Studio v0.18 adds a local remediation evidence ledger that records guided action starts, workflow triggers, gate movement, completions, and dismissals inside the decision record.

Still deferred:

- hosted auth, teams, permissions, hosted database, object storage, background jobs, deployment observability, and hosted audit logs.
