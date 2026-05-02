# Crux Studio Product Spec

## Product Definition

Crux Studio is a visual operating environment for auditable analysis-agent runs.

Its purpose is to make the harness understandable, trustworthy, and useful to humans. Users should be able to see not only the answer, but also the claims, evidence, uncertainty, diagnostics, and review trail behind the answer.

## Product Thesis

The correct UX for Crux is not a chat interface. Chat hides the thing Crux is best at: the run.

The correct UX is a Run Studio:

- ask a question
- generate a run
- inspect the run
- improve the run
- compare runs
- export reviewed output and decision records

## Primary Users

- Operators making practical decisions under uncertainty.
- Analysts who need inspectable reasoning artifacts.
- Product and strategy teams evaluating options.
- Technical teams building analysis agents on top of Crux.
- Reviewers who need to approve or reject claims before a memo is trusted.

## Jobs To Be Done

1. Ask an arbitrary question and get a readable memo.
2. Understand whether the output should be trusted.
3. Inspect why the harness produced the recommendation.
4. See which evidence supports or challenges each claim.
5. Add sources or context when the trust gate fails.
6. Review, annotate, and export the final memo.
7. Compare a newer run to an older run.
8. Assemble a decision record that can be shared without reconstructing separate tabs.

## Non-Goals

- Do not build a generic chatbot as the primary interface.
- Do not hide artifacts behind a single answer box.
- Do not copy Crux harness logic into the UI.
- Do not make source-free answers appear fully trusted.
- Do not start with multi-tenant SaaS complexity before the run workflow is excellent.

## Product Principles

1. The run is the unit of work.
2. Trust state must be visible before the answer feels final.
3. The memo is the doorway, not the whole product.
4. Claims and evidence must be navigable.
5. Review and rerun are first-class actions.
6. Source gaps are product information, not error noise.
7. The UI should help the user improve the analysis, not merely display it.

## Main Entities

- Project: a workspace for related runs and sources.
- Run: one execution of the harness.
- Query intake: how the raw question was interpreted.
- Memo: human-readable synthesis.
- Claim: atomic assertion in the analysis.
- Evidence: support or challenge mapped to claims.
- Source: uploaded or connected material.
- Diagnostic: actionable failure classification.
- Review: human decision on claims/evidence.
- Comparison: diff between two runs.
- Lineage: project-level chain of runs, evidence tasks, reruns, and deltas.
- Decision record: derived project dossier for the current recommendation, review state, source state, lineage, artifacts, and final memo.

## Success Criteria

Crux Studio v0.1 succeeds when a user can:

- ask an arbitrary question
- see a memo in the browser
- immediately understand `pass`, `warn`, or `fail`
- inspect claims and evidence
- open diagnostics and next fixes
- rerun with changed context
- export or copy the memo

## Final Product Direction

Crux Studio should become the control room for auditable analysis agents.

Research agents, source connectors, LLM providers, and vertical packs can plug into the harness. Studio should remain the human-facing place where runs are created, inspected, corrected, and trusted.
