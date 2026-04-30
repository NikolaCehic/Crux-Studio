# Crux Studio Design Context

## Register

Product UI. The interface serves serious task work: asking, inspecting, improving, reviewing, and comparing analysis runs.

## Physical Scene

A decision owner is reviewing a Crux run on a laptop or large monitor during focused work. The room is bright enough for normal reading, the work is time-sensitive, and failure states must be clear without becoming theatrical.

## Design Direction

Crux Studio should feel like a calm analysis workbench: dense enough for repeated use, clear enough to understand trust state within seconds, and restrained enough that artifacts remain the center of attention.

## Layout

- First screen is the workflow itself, not a landing page.
- Use a three-zone app shell: left rail for runs and sections, center workspace for ask/memo, right inspector for trust, diagnostics, and artifact navigation.
- Avoid nested cards. Use panels, separators, lists, and tabs for structure.
- Keep memo reading width near 70 characters.
- Keep trust status visible above the fold in the run view.

## Color Strategy

Restrained product palette:

- Tinted neutral surfaces for reading and panels.
- One cool accent for current navigation, focus, and primary actions.
- Green, amber, and red only for pass, warn, and fail states.
- No decorative gradients, gradient text, or blob backgrounds.

Use OKLCH values in CSS where practical. Avoid pure black and pure white.

## Typography

- Use system sans-serif for all UI text.
- Use monospace for artifact IDs, trace events, run IDs, and file paths.
- Fixed font scale, not viewport-fluid type.
- Compact headings inside tool panels.

## Interaction

- Standard form controls for question, context, source policy, and horizon.
- Tabs for artifact views.
- Inline error states and validation.
- Skeleton states are preferable to centered loading spinners.
- Motion should communicate state change only and stay within 150 to 250 ms.

## Acceptance Feel

Within ten seconds, a user should know what was asked, what Crux recommends, whether the result passed trust checks, what blocked trust if it failed, and where to inspect deeper artifacts.

