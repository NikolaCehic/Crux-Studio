# Crux Studio Product Context

register: product

## Product Purpose

Crux Studio is the visual operating environment for auditable analysis-agent runs. It exists so a user can ask an arbitrary question, generate a Crux run, inspect the memo, evaluate trust, inspect claims and evidence, improve weak inputs, rerun, compare, review, and export accountable output.

## Product Thesis

The run is the product unit. Studio should not behave like a generic chatbot because chat hides the artifacts that make Crux valuable. The interface should make the analysis run visible: memo, trust gate, claims, evidence, uncertainty, diagnostics, trace, and review state.

## Primary Users

- Operators making practical decisions under uncertainty.
- Analysts who need inspectable reasoning artifacts.
- Product and strategy teams evaluating options.
- Technical teams building analysis agents on top of Crux.
- Reviewers who approve or reject claims before a memo is trusted.

## Jobs To Be Done

1. Ask an arbitrary question and receive a readable memo.
2. Understand whether the output should be trusted before acting on it.
3. Inspect why the harness produced the recommendation.
4. See which evidence supports or challenges each claim.
5. Add sources or context when the trust gate fails.
6. Review, annotate, and export the final memo.
7. Compare a newer run to an older run.
8. Follow guided remediation actions until the decision record is ready to share.
9. Preserve a local evidence trail of remediation activity for accountable handoff.
10. Review one final handoff pack before sharing or exporting a decision.

## Product Principles

- Trust state must be visible before the answer feels final.
- The memo is the doorway, not the entire product.
- Claims and evidence must be navigable.
- Review and rerun are first-class actions.
- Source gaps are product information, not error noise.
- Studio should help the user improve the analysis, not merely display it.
- Remediation should launch the right workflow, not just describe the next task.
- Remediation evidence should be visible in the decision record, not lost as transient UI state.
- Handoff should be a derived review state, not another place for truth to drift.

## Non-Goals

- Do not build a generic chatbot as the primary interface.
- Do not hide artifacts behind a single answer box.
- Do not copy Crux Harness logic into the UI.
- Do not make source-free answers appear fully trusted.
- Do not start with multi-tenant SaaS complexity before the single-user run workflow is excellent.
