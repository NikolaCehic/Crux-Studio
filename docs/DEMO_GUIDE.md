# Crux Studio Demo Guide

Use this guide to show the local-first Crux product loop without explaining implementation details first.

## Start The Product

Mock provider:

```bash
pnpm dev
```

Real local Harness provider:

```bash
CRUX_STUDIO_PROVIDER=local \
CRUX_HARNESS_ROOT=/Users/nikolacehic/Desktop/crux-harness \
pnpm dev
```

Open:

```text
http://127.0.0.1:5173
```

## Smoke Check

With Studio running:

```bash
pnpm smoke:local
```

The smoke check verifies:

- server health
- web app response
- provider registry
- demo question availability
- run indexing
- bounded-agent summary availability when agent-aware runs exist

## Canonical Demo Questions

Studio exposes these from `/api/demos` and the ask panel:

- How should I invest 10000 USD into a diversified portfolio?
- Which product bet should our team prioritize this quarter?
- How should a support team reduce first-response time without hiring more agents this month?
- Should we enter the German mid-market segment this year?
- Should we keep a modular monolith or split this product into services now?

## Demo Flow

1. Pick a demo question in the ask panel.
2. Run Crux.
3. Point to the readiness panel before reading the memo.
4. Open the Agents tab and show each bounded specialist reviewer.
5. Open Sources to show source count, chunks, and missing evidence.
6. Open Claims and approve one claim.
7. Open Evidence and add one annotation.
8. Export the decision package.
9. Replay the run.
10. Compare latest runs and show what changed.

## What To Emphasize

Crux Studio is not a chat UI. The product object is the run: memo, claims, evidence, source state, bounded agents, eval council, diagnostics, review, trace, replay, and export.
