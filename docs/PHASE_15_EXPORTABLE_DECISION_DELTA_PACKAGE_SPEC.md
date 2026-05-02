# Phase 15 Exportable Decision Delta Package Spec

## Goal

Make the before and after decision delta shareable as a Markdown package.

Studio already explains what changed between two runs. Phase 15 turns that explanation into a portable artifact that can be attached to a decision record, sent to a reviewer, or kept beside the final memo.

## Product Thesis

A delta report is useful inside Studio, but a decision owner also needs to carry the reasoning outside Studio.

The export should not be a raw diff. It should read like a concise review packet: verdict, next step, trust movement, readiness movement, source movement, closed gaps, blockers, human review state, changed artifact paths, and the newer memo.

## Scope

### Server

- Add `POST /api/runs/compare/export/decision-delta-package`.
- Reuse the same comparison inputs as `POST /api/runs/compare`.
- Reuse the Phase 14 decision delta calculation.
- Include Studio evidence-task resolution provenance in closed gaps.
- Include human review summaries for both the older and newer run.
- Return `text/markdown` with a download-friendly content disposition.

### Web

- Add an inline `Export delta package` action to the Decision Delta panel.
- Export via the server package endpoint.
- Download the returned Markdown using the server-provided filename.
- Keep the action visually quiet and consistent with existing export controls.

### Smoke

- Extend local smoke to export the evidence-closure decision delta package.
- Fail if the Markdown package misses the title, verdict, closed evidence gaps, resolved task title, changed artifact paths, or newer memo.

## Out Of Scope

- PDF export.
- Hosted sharing links.
- Persistent export registry.
- Multi-run timeline.
- Editing exported Markdown inside Studio.

## API Contract

Request:

```http
POST /api/runs/compare/export/decision-delta-package
Content-Type: application/json

{
  "leftRunId": "older-run",
  "rightRunId": "newer-run"
}
```

Response:

```http
200 OK
Content-Type: text/markdown; charset=utf-8
Content-Disposition: attachment; filename="newer-run-decision-delta-package.md"
```

Markdown sections:

- `# Crux Decision Delta Package`
- `## Verdict`
- `## Next Step`
- `## Trust Movement`
- `## Readiness Movement`
- `## Source Movement`
- `## Closed Evidence Gaps`
- `## Remaining Evidence Gaps`
- `## Blocker Movement`
- `## Notable Changes`
- `## Human Review Summary`
- `## Changed Artifact Paths`
- `## Newer Run Decision Memo`

## Acceptance Criteria

- Server export returns Markdown for any valid run comparison.
- Server export includes both run IDs and the newer run question.
- Server export includes human review summaries for left and right runs.
- Server export includes resolved evidence-task titles as closed evidence gaps when applicable.
- Studio renders an `Export delta package` action after comparison.
- Studio downloads the Markdown package from the export endpoint.
- Local smoke validates the exported package against a real local Harness evidence-closure rerun.

## TDD And Validation

Red expectations:

- Server workflow tests first required the export endpoint, Markdown title, review summary, changed paths, newer memo, and closed evidence gap provenance.
- Web workflow tests first required the Decision Delta panel to expose `Export delta package` and call the export endpoint.

Green implementation:

- The server now renders a portable Markdown package from the same delta object used by the UI.
- The web app now downloads the package from the Decision Delta panel.
- Local smoke now validates the Markdown package in the real local provider flow.

Validation commands:

```bash
pnpm --filter @crux-studio/server test -- src/product-workflow.test.ts
pnpm --filter @crux-studio/web test -- src/App.test.tsx
pnpm verify
pnpm smoke:local
```

## Exit Condition

Phase 15 is complete when a user can compare two runs, read the decision delta in Studio, and export the same decision movement as a Markdown package that includes the memo and review context.
