# Crux Studio UX Spec

## UX Thesis

Crux Studio should feel like a workbench for serious analysis: calm, dense, inspectable, and fast.

The UI should not look like a marketing landing page, a generic SaaS dashboard, or a chat toy. It should expose the run clearly enough that a user can understand the state of the answer in under ten seconds.

## First Screen

The first screen is the product workflow itself.

No landing hero. No feature cards. No abstract onboarding page.

Default layout:

```text
left rail        center workspace                  right inspector
---------        ----------------                  ---------------
runs/projects    ask panel or memo                 trust gate
sources          answer sections                   diagnostics
reviews          next tests                        artifact nav
```

## Core Views

### 1. Ask View

Purpose: create a run from an arbitrary question.

Controls:

- Question input
- Context input
- Time horizon
- Source policy selector
- Optional source attachment
- Run button

States:

- empty
- ready
- running
- run completed
- failed validation

The ask view should show source policy clearly:

- `offline`: useful draft, no source trust
- `hybrid`: expects source material or connectors
- `web`: future connector mode

### 2. Run Overview

Purpose: understand the run quickly.

Above the memo:

- trust gate badge: `pass`, `warn`, `fail`
- original question
- answerability
- source count
- diagnostics count
- run timestamp
- actions: rerun, compare, export

Main content:

- memo preview
- next tests
- blocking issues if present

### 3. Inspector Tabs

Tabs:

- Memo
- Claims
- Evidence
- Contradictions
- Uncertainty
- Council
- Diagnostics
- Trace

Each tab must show actual artifacts, not rewritten summaries only.

### 4. Claims And Evidence

Claims should be scannable:

- claim text
- status
- confidence
- mapped evidence count
- challenged-by count

Evidence should show:

- summary
- source type
- reliability
- relevance
- cited source/chunk when present
- supported claims
- challenged claims

Clicking a claim should filter related evidence. Clicking evidence should reveal related claims.

### 5. Trust Gate And Diagnostics

The trust gate is always visible in the run view.

If trust is `fail`, the UI should answer:

- What blocked trust?
- Which stage caused it?
- What exact fix is recommended?
- Can the user add sources, edit context, or rerun?

Diagnostics should feel actionable, not alarming for its own sake.

### 6. Source Workspace

Purpose: improve a run.

Capabilities:

- upload Markdown, TXT, CSV
- import source pack
- show source inventory
- show source chunks
- rerun with sources

This is what turns a source-free draft into a stronger run.

### 7. Human Review

Purpose: turn machine output into accountable output.

Capabilities:

- approve claim
- reject claim
- annotate evidence
- request stage rerun
- export reviewed memo

Review state should be visible beside the memo and claims.

### 8. Run History And Compare

Purpose: make improvement visible.

Capabilities:

- list runs
- filter by project/question/status
- compare two runs
- show prompt/source/stage/artifact-contract differences
- show trust-score movement

### 9. Acceptance And Remediation

Purpose: move a decision record from draft or review state toward accountable handoff.

Capabilities:

- show a project acceptance gate
- explain which gate checks pass, warn, or fail
- turn non-passing checks into prioritized remediation actions
- launch guided source intake, claim review, replay, comparison, diagnostics, or export from each action
- preserve active action context while the user works
- show whether a refreshed gate changed after the action began
- show a remediation evidence ledger with action starts, workflow triggers, gate movement, completions, and dismissals

## Design Direction

Physical scene:

A decision owner is reviewing a run on a large monitor during focused work, with enough pressure that failure states must be obvious but not theatrical.

Theme:

Light workbench with tinted neutrals, restrained color, and sharp status affordances.

Palette intent:

- neutral surface for reading
- green for pass
- amber for warn
- red for fail
- one accent for active navigation and selected artifacts

Density:

Moderately dense. The product should support repeated work, not one-time spectacle.

Typography:

- clear sans-serif for UI
- monospace for artifact IDs, trace events, and file paths
- memo reading width capped around 70ch

Interaction Rules:

- No modal-first workflow.
- No nested cards.
- No decorative gradients or blobs.
- No giant empty hero section.
- No hiding trust status below the fold.
- Artifacts must remain copyable and inspectable.

## Empty States

Ask view empty state:

- one question box
- optional context
- short examples
- no marketing copy

Run history empty state:

- ask first question
- import source pack

Source workspace empty state:

- upload docs
- import folder
- continue draft-only

## v0.1 Acceptance

- User can create a run from the UI.
- User sees memo and trust gate.
- User can open claims, evidence, diagnostics, and trace.
- User can rerun with changed question/context/time horizon/source policy.
- User can open the generated HTML report or export the memo.
