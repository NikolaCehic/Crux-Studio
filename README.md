# Crux Studio

Crux Studio is the product interface for Crux Harness.

It is not a chat wrapper. It is a run studio: a workspace for asking questions, inspecting agent reasoning, checking trust gates, reviewing claims and evidence, improving inputs, rerunning analysis, and comparing outputs over time.

The Studio codebase is separate from `crux-harness`. It consumes the harness through a provider adapter so the UI can support multiple harness backends later without copying harness logic into the frontend.

## Repository Shape

```text
crux-studio/
  docs/
    PRODUCT_SPEC.md
    UX_SPEC.md
    ARCHITECTURE_SPEC.md
    PHASED_PLAN.md
```

The planned implementation codebase:

```text
crux-studio/
  apps/
    web/          # React UI
    server/       # Node BFF, owns harness provider adapters
  packages/
    crux-provider # Provider contract shared by server/UI types
    ui            # Studio component system
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

