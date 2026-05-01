# Crux Studio

<p align="center">
  <strong>A decision workbench for inspecting, improving, and trusting agent analysis.</strong>
</p>

<p align="center">
  <a href="#run-locally">Run locally</a>
  ·
  <a href="#product-tour">Product tour</a>
  ·
  <a href="#architecture">Architecture</a>
  ·
  <a href="#quality">Quality</a>
</p>

<p align="center">
  <img src="docs/assets/crux-studio-workbench.png" alt="Crux Studio workbench with ask form, decision memo, trust gate, artifacts, and review panel" />
</p>

Crux Studio is the product interface for Crux Harness. It is not a chat wrapper. It is a run studio: a structured workspace where teams ask arbitrary questions, attach source context, inspect the resulting analysis, review claims and evidence, rerun with stronger inputs, compare outputs, and export a reviewed memo.

The goal is simple: make agent analysis auditable enough to use in real operational decisions.

## What It Does

Crux Studio turns an agent run into a product workflow:

```text
Ask a question
-> Attach context and source packs
-> Run Crux
-> Read the decision memo
-> Inspect trust, claims, evidence, uncertainty, council, diagnostics, and trace
-> Review claims and annotate evidence
-> Replay with improved context
-> Compare runs
-> Export a reviewed memo
```

It is built for analysis that needs judgment, provenance, and iteration. Product strategy, operations, support workflows, internal tooling decisions, technical tradeoffs, market scans, policy reviews, and implementation planning all fit naturally.

## Product Tour

### Ask, Read, Inspect

Studio starts with the real working surface: question, context, source policy, source pack, memo, trust gate, and run artifacts in one view.

### Review Claims And Evidence

Every run exposes claims, evidence, contradictions, uncertainty, council output, diagnostics, and trace. Claims can be approved or rejected, and evidence can be annotated before a memo is treated as reviewed.

<p align="center">
  <img src="docs/assets/crux-studio-claims-focus.png" alt="Crux Studio claim review controls" width="48%" />
  <img src="docs/assets/crux-studio-review-compare-focus.png" alt="Crux Studio reviewed memo and run comparison controls" width="48%" />
</p>

### Improve And Compare

Studio keeps the work iterative. Add source material, replay a run, compare the latest outputs, and export the reviewed memo once the analysis is strong enough to share.

<p align="center">
  <img src="docs/assets/crux-studio-review-compare.png" alt="Crux Studio run comparison screenshot" />
</p>

## Current Capabilities

- Ask arbitrary analysis and decision questions from the Studio UI.
- Organize work into projects.
- Create source packs from pasted Markdown, TXT, or CSV-style evidence.
- Persist local source content and pass it through the provider boundary.
- Attach source packs to runs.
- See memo preview, trust gate, confidence, answerability, risk, blocking issues, and artifact paths.
- Load run history from the server.
- Fetch full run bundles after creating or selecting a run.
- Inspect Memo, Claims, Evidence, Contradictions, Uncertainty, Council, Diagnostics, and Trace tabs.
- Approve or reject claims during human review.
- Annotate evidence from the artifact inspector.
- Replay a run with the same question and attached source context.
- Compare the two latest runs and inspect trust movement plus changed fields.
- Open raw Claims, Evidence, and Trace JSON.
- Export the memo as Markdown.
- Export a reviewed memo with human review summary included.

## Run Locally

Install dependencies:

```bash
pnpm install
```

Run Studio with the fast mock provider:

```bash
pnpm dev
```

Open the app:

```text
http://127.0.0.1:5173
```

The API server runs at:

```text
http://127.0.0.1:4318
```

Local Studio state, including pasted source content, is written to `.studio/studio-state.json` by the server and is intentionally ignored by git.

## Use The Real Harness

Crux Studio is a separate codebase from `crux-harness`. The web app does not import harness internals. It talks to a server-side provider boundary.

Run the server with the local harness provider:

```bash
CRUX_STUDIO_PROVIDER=local \
CRUX_HARNESS_ROOT=/Users/nikolacehic/Desktop/crux-harness \
pnpm --filter @crux-studio/server dev
```

In another terminal, run the web app:

```bash
pnpm --filter @crux-studio/web dev
```

## Architecture

```text
Studio Web UI
-> Studio Server
-> CruxProvider interface
-> MockCruxProvider or LocalCruxHarnessProvider
-> Crux Harness package / SDK / public Node API
```

Repository shape:

```text
crux-studio/
  apps/
    web/          React workbench
    server/       Fastify API and provider adapters
  packages/
    crux-provider Shared provider contract
  docs/
    PRODUCT_SPEC.md
    UX_SPEC.md
    ARCHITECTURE_SPEC.md
    PHASED_PLAN.md
    TRACE_LOG.md
```

Important files:

```text
apps/web/src/App.tsx
apps/web/src/api.ts
apps/web/src/styles.css
apps/server/src/app.ts
apps/server/src/studio-store.ts
apps/server/src/providers/local-crux-provider.ts
packages/crux-provider/src/types.ts
packages/crux-provider/src/mock.ts
```

## Quality

Run the full test suite:

```bash
pnpm test
```

Run TypeScript checks:

```bash
pnpm check
```

Build the app:

```bash
pnpm build
```

The implementation is TDD-first. Product workflow coverage exists across the provider, server, and web layers.

## Non-Hosted Boundary

This stage is intentionally not a hosted control plane. Authentication, teams, permissions, hosted database, object storage, background jobs, deployment observability, and audit logs are out of scope for the current product stage.

## Traceability

- Implementation trace: [docs/TRACE_LOG.md](docs/TRACE_LOG.md)
- Product changelog: [CHANGELOG.md](CHANGELOG.md)
- Product context: [PRODUCT.md](PRODUCT.md)
- Design context: [DESIGN.md](DESIGN.md)
- Product spec: [docs/PRODUCT_SPEC.md](docs/PRODUCT_SPEC.md)
- UX spec: [docs/UX_SPEC.md](docs/UX_SPEC.md)
- Architecture spec: [docs/ARCHITECTURE_SPEC.md](docs/ARCHITECTURE_SPEC.md)
- Phased plan: [docs/PHASED_PLAN.md](docs/PHASED_PLAN.md)

## Product Position

Crux Studio is for people who do not just want an answer. They want to see why an answer exists, what evidence holds it up, what could break it, and what changed after better context was added.

That is the product: not more agent output, but more usable agent judgment.
