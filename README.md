# Crux Studio

Crux Studio is the product interface for Crux Harness.

It is not a chat wrapper. It is a run studio: a workspace for asking questions, inspecting agent reasoning, checking trust gates, reviewing claims and evidence, improving inputs, rerunning analysis, and comparing outputs over time.

The Studio codebase is separate from `crux-harness`. It consumes the harness through a provider adapter so the UI can support multiple harness backends later without copying harness logic into the frontend.

## Repository Shape

```text
crux-studio/
  apps/
    web/          # React UI
    server/       # Fastify BFF, owns harness provider adapters
  packages/
    crux-provider # Provider contract shared by server/UI types
  docs/
    PRODUCT_SPEC.md
    UX_SPEC.md
    ARCHITECTURE_SPEC.md
    PHASED_PLAN.md
```

## Current Implementation

```text
crux-studio/
  apps/
    web/
      src/App.tsx
      src/api.ts
      src/styles.css
    server/
      src/app.ts
      src/provider.ts
      src/providers/local-crux-provider.ts
  packages/
    crux-provider/
      src/types.ts
      src/mock.ts
```

## Best Integration Model

Crux Studio should not shell out to the CLI as the normal path.

The best integration is:

```text
Studio Web UI
-> Studio Server
-> CruxProvider interface
-> LocalCruxHarnessProvider
-> crux-harness package / SDK / public Node API
```

For local development, `crux-studio` can depend on:

```json
{
  "crux-harness": "file:../crux-harness"
}
```

For production, that provider can later point at a hosted Crux API or a packaged harness release.

## Run Locally

Install dependencies:

```bash
pnpm install
```

Run with the fast mock provider:

```bash
pnpm dev
```

Open:

```text
http://127.0.0.1:5173
```

Run with the real local harness provider:

```bash
CRUX_STUDIO_PROVIDER=local \
CRUX_HARNESS_ROOT=/Users/nikolacehic/Desktop/crux-harness \
pnpm --filter @crux-studio/server dev
```

In another terminal:

```bash
pnpm --filter @crux-studio/web dev
```

## Quality Commands

```bash
pnpm test
pnpm check
pnpm build
```

## Traceability

- Implementation trace: [docs/TRACE_LOG.md](docs/TRACE_LOG.md)
- Product changelog: [CHANGELOG.md](CHANGELOG.md)
- Product context: [PRODUCT.md](PRODUCT.md)
- Design context: [DESIGN.md](DESIGN.md)

## Core Product Loop

```text
Ask question
-> Add context and sources
-> Run Crux
-> Read memo
-> Check trust gate
-> Inspect claims, evidence, uncertainty, diagnostics, and trace
-> Review or annotate
-> Improve inputs
-> Rerun
-> Compare runs
-> Export final memo
```

## Specs

- [Product Spec](docs/PRODUCT_SPEC.md)
- [UX Spec](docs/UX_SPEC.md)
- [Architecture Spec](docs/ARCHITECTURE_SPEC.md)
- [Phased Plan](docs/PHASED_PLAN.md)
