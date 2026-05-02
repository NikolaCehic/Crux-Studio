# Crux Studio

<p align="center">
  <strong>A workbench for turning agent analysis into inspectable, reviewable decisions.</strong>
</p>

<p align="center">
  <a href="#what-it-is">What it is</a>
  ·
  <a href="#how-it-works">How it works</a>
  ·
  <a href="#run-it">Run it</a>
  ·
  <a href="#architecture">Architecture</a>
</p>

<p align="center">
  <img src="docs/assets/crux-studio-workbench.png" alt="Crux Studio workbench with question input, decision brief, trust gate, artifacts, and review panels" />
</p>

Crux Studio is a product interface for serious agent analysis.

It is built for the moment after someone asks an AI system an important question and needs more than a fluent answer. Crux Studio turns the answer into a structured run with a memo, claims, evidence, uncertainty, diagnostics, review actions, and a trace of what happened.

The goal is simple: make agent output easier to trust, challenge, improve, and share.

## What It Is

Crux Studio is not a chat app.

It is a decision workbench. You ask a question, add context, attach source material, run Crux, then inspect the result like a real artifact instead of treating the model response as a black box.

Use it for questions such as:

- Should our support team introduce AI triage before hiring another agent?
- Which product bet should we prioritize this quarter?
- What are the risks in this rollout plan?
- How should we compare two technical approaches?
- What evidence would change this recommendation?

Crux Studio is useful when an answer needs judgment, provenance, and iteration.

## Why It Exists

Most AI tools optimize for producing an answer quickly.

Crux Studio optimizes for making the answer usable:

- What is the recommendation?
- What claims does it depend on?
- What evidence supports those claims?
- What is uncertain?
- What could be wrong?
- What should a human review before acting?
- What changed after better context was added?

That makes it a better fit for operational decisions, product strategy, technical tradeoffs, policy review, support workflows, market analysis, and internal planning.

## How It Works

```text
Ask a question
-> Add context and source material
-> Run Crux
-> Read the decision brief
-> Inspect claims, evidence, sources, uncertainty, bounded agents, diagnostics, council output, and trace
-> Review claims and annotate evidence
-> Replay with better inputs
-> Compare runs
-> Export a decision package
```

## Product Tour

### Ask A Decision-Grade Question

Start with a question, practical context, a time horizon, and an optional source pack. Studio keeps the input focused on the decision, not on prompt engineering.

### Read The Decision Brief

Every completed run opens on a short decision brief first: recommendation, readiness, confidence, source coverage, next action, and blockers. The full memo and artifact trail stay one click away.

### Inspect The Run

Every run produces a memo plus structured artifacts. You can inspect the trust gate, confidence, answerability, risk, blocking issues, artifact paths, claims, evidence, contradictions, uncertainty, council output, diagnostics, and trace.

### Review Claims And Evidence

Claims can be approved or rejected. Evidence can be annotated. The goal is to move from "the agent said this" to "we reviewed what this answer depends on."

<p align="center">
  <img src="docs/assets/crux-studio-claims-focus.png" alt="Crux Studio claim review screen" width="48%" />
  <img src="docs/assets/crux-studio-review-compare-focus.png" alt="Crux Studio reviewed memo and comparison screen" width="48%" />
</p>

### Improve And Compare

Studio supports replaying a run with the same question and context, comparing the latest runs, and exporting a reviewed memo once the analysis is strong enough to share.

<p align="center">
  <img src="docs/assets/crux-studio-review-compare.png" alt="Crux Studio run comparison screenshot" />
</p>

## Current Capabilities

- Ask arbitrary analysis and decision questions.
- Organize work into projects.
- Create source packs from pasted material or selected Markdown, TXT, and CSV files.
- Attach source packs to runs.
- Materialize attached source packs into real local Crux Harness source packs, inventories, and chunks.
- Reopen the latest run automatically when returning to the workspace.
- Land on an answer-first decision brief for every completed run.
- Start from canonical demo questions.
- Inspect the memo, claims, evidence, sources, contradictions, uncertainty, bounded agents, council output, diagnostics, and trace.
- See run readiness as ready, usable with warnings, or blocked.
- Review claims with approve and reject actions.
- Annotate evidence.
- Replay runs with the same context.
- Compare recent runs and see readiness, trust, agent, and source changes.
- Open raw Claims, Evidence, Agents, and Trace JSON.
- Export the memo as Markdown.
- Export a reviewed memo that includes human review state.
- Export a full decision package with readiness, trust, agents, sources, review, and memo content.

## Run It

Install dependencies:

```bash
pnpm install
```

Start Studio:

```bash
pnpm dev
```

Start against a local Crux Harness checkout:

```bash
pnpm dev:local
```

Open:

```text
http://127.0.0.1:5173
```

The API server runs at:

```text
http://127.0.0.1:4318
```

Studio state is written to `.studio/studio-state.json`. That file is ignored by git so local runs and pasted source material do not become repository changes.

## Use It With Crux Harness

Crux Studio is a separate codebase from `crux-harness`. The web app talks to a server-side provider interface instead of importing harness internals directly.

To run Studio against a local Crux Harness checkout:

```bash
CRUX_STUDIO_PROVIDER=local \
CRUX_HARNESS_ROOT=/Users/nikolacehic/Desktop/crux-harness \
pnpm --filter @crux-studio/server dev
```

Then run the web app in another terminal:

```bash
pnpm --filter @crux-studio/web dev
```

For fast UI and product work, the default mock provider is enough:

```bash
pnpm dev
```

## Architecture

```text
Studio Web UI
-> Studio Server
-> CruxProvider interface
-> MockCruxProvider or LocalCruxHarnessProvider
-> Crux Harness
```

Repository layout:

```text
crux-studio/
  apps/
    web/          React Studio interface
    server/       API, persistence, provider adapters
  packages/
    crux-provider Shared provider contract
  docs/
    Product, UX, architecture, plan, trace, and screenshot assets
```

Key files:

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

Run tests:

```bash
pnpm test
```

Run TypeScript checks:

```bash
pnpm check
```

Build the project:

```bash
pnpm build
```

Run the full verification gate:

```bash
pnpm verify
```

Smoke check a running local Studio:

```bash
pnpm smoke:local
```

The smoke check creates a source-backed local run and verifies that source inventory and source chunks survive the Studio-to-Harness bridge.

The project is developed with a TDD-first workflow. Product behavior is covered across the provider package, server API, and web app.

## Current Boundary

Crux Studio is currently focused on the workbench experience: asking, inspecting, reviewing, replaying, comparing, and exporting runs.

It is intentionally not a hosted team control plane yet. Authentication, teams, permissions, hosted database, object storage, background jobs, deployment observability, and audit logs are out of scope for this stage.

## Documentation

- [Product spec](docs/PRODUCT_SPEC.md)
- [UX spec](docs/UX_SPEC.md)
- [Architecture spec](docs/ARCHITECTURE_SPEC.md)
- [Phased plan](docs/PHASED_PLAN.md)
- [Productization plan](docs/PRODUCTIZATION_PLAN.md)
- [Phase execution protocol](docs/PHASE_EXECUTION_PROTOCOL.md)
- [Phase 10 answer-first brief spec](docs/PHASE_10_ANSWER_FIRST_DECISION_BRIEF_SPEC.md)
- [Demo guide](docs/DEMO_GUIDE.md)
- [Trace log](docs/TRACE_LOG.md)
- [Changelog](CHANGELOG.md)
- [Product context](PRODUCT.md)
- [Design context](DESIGN.md)

## Product Position

Crux Studio is for people who do not just want an answer.

They want to know why the answer exists, what evidence holds it up, what could break it, and what changed after better context was added.

That is the product: more usable agent judgment.
