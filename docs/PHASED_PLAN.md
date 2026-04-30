# Crux Studio Phased Plan

## Phase 0: Codebase And Provider Boundary

Goal: create the separate Studio codebase and the harness integration seam.

Scope:

- pnpm workspace
- `apps/web`
- `apps/server`
- `packages/crux-provider`
- local `file:../crux-harness` dependency
- provider contract tests
- mocked provider for UI development

Acceptance:

- server can call harness through one provider module
- UI never imports harness internals
- mocked provider can return a fake run bundle

Optimality:

This phase is the correct first move because it prevents the UI from becoming tangled with harness internals. I do not know a better foundation.

## Phase 1: Ask To Memo MVP

Goal: make the main product loop visible.

Scope:

- ask screen
- question, context, time horizon, source policy
- run creation
- run status
- memo preview
- trust gate
- blocking issues
- generated input and artifact links

Acceptance:

- user can ask an arbitrary question from the browser
- user sees a readable memo
- user sees pass/warn/fail before trusting the memo
- user can open the run report or raw artifacts

Optimality:

This is the smallest slice that makes Crux Studio real. Anything less is a shell. Anything more risks building inspector complexity before the primary run loop is proven.

## Phase 2: Artifact Inspector

Goal: expose why the memo says what it says.

Scope:

- tabs for memo, claims, evidence, contradictions, uncertainty, council, diagnostics, trace
- claim-to-evidence navigation
- evidence-to-claim navigation
- diagnostic stage grouping
- trace timeline

Acceptance:

- user can inspect every core artifact in the browser
- user can click a claim and see supporting/challenging evidence
- user can see the council reason for trust gate status

Optimality:

This is the phase that differentiates Crux Studio from chat. It reveals the run.

## Phase 3: Source Workspace

Goal: let users fix source-free or weak runs.

Scope:

- upload Markdown/TXT/CSV
- create project source pack
- show source inventory and chunks
- rerun with selected source pack
- compare trust gate before/after sources

Acceptance:

- user can attach sources
- rerun uses those sources
- source-backed evidence appears in the inspector
- trust gate changes are visible

Optimality:

This is the highest-leverage upgrade after inspection because most real trust failures come from missing sources.

## Phase 4: Review Workflow

Goal: support accountable human review.

Scope:

- approve/reject claims
- annotate evidence
- show review summary
- export reviewed memo
- preserve original machine memo

Acceptance:

- human review state is visible
- reviewed memo can be exported
- original artifacts remain unchanged

Optimality:

This phase turns Studio from an inspection tool into a collaborative decision workflow.

## Phase 5: Run History, Replay, And Diff

Goal: make iteration measurable.

Scope:

- run history
- run detail pages
- replay button
- compare two runs
- show source/prompt/stage/artifact-contract changes
- show trust gate movement

Acceptance:

- user can compare runs from the UI
- user can understand what changed between runs
- rerun loops become visible

Optimality:

This phase completes the harness loop: ask, inspect, improve, rerun, compare.

## Phase 6: Projects And Persistent Workspace

Goal: organize real work.

Scope:

- projects
- project source packs
- project runs
- SQLite persistence
- tags/statuses
- saved exports

Acceptance:

- runs are grouped by project
- source packs are reusable within a project
- run metadata remains searchable

Optimality:

Projects become necessary once the single-run experience works. Before that, they are premature information architecture.

## Phase 7: Agent And Connector Platform

Goal: expand Studio into a platform.

Scope:

- provider registry
- research agent adapters
- web/source connectors
- drive/notion/github connectors
- stage plugin metadata
- provider health checks

Acceptance:

- new agent/provider adapters can be registered
- runs record which provider generated which stage
- connector outputs become inspectable sources

Optimality:

This is the platform expansion point. It should happen after the Studio proves the core run UX. It keeps expansion focused on better runs and better sources, not hosted team administration.

## Explicitly Out Of Scope For This Stage

Crux Studio should not include a hosted control plane in this roadmap stage.

Deferred:

- auth
- teams
- permissions
- hosted database
- object storage
- background jobs
- deployment observability
- audit logs

Reason:

Those features make Studio team-ready, but they do not improve the core run loop yet. The current priority is a great single-user/product workflow around asking, inspecting, sourcing, reviewing, rerunning, and comparing Crux runs.

## Final Convergence

The best first build is:

1. Phase 0: provider boundary
2. Phase 1: ask to memo MVP
3. Phase 2: artifact inspector
4. Phase 3: source workspace

That sequence gives Crux Studio a real product spine before expanding into connectors or deeper agent integrations.

I do not know a better phased plan because this order follows the actual trust loop of the harness: create a run, understand it, fix it, then scale it.
