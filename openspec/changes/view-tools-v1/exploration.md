# Exploration: view-tools-v1

## Current State

Brand new project at `E:\new-view`. No source files exist yet. All architectural decisions were made in a prior planning session and are confirmed by the user. This exploration documents those decisions as the foundation for proposal and spec phases.

**What we're building**: A framework-agnostic npm library for rendering data in multiple views (Grid, List, Cards). Developers pass an array of data + column configs with a `control` field pointing to a Web Component tag name. The library renders the correct view and handles sort/filter state.

## Affected Areas

Files that WILL need to exist (none exist yet):

- `package.json` — package config, dependencies (lit, typescript), devDependencies (vitest, playwright, vite/tsup)
- `src/components/data-view.ts` — main wrapper Web Component (`<data-view>`)
- `src/components/data-grid.ts` — grid sub-view (`<data-grid>`)
- `src/components/data-list.ts` — list sub-view (`<data-list>`)
- `src/components/data-cards.ts` — cards sub-view (`<data-cards>`)
- `src/components/view-switcher.ts` — optional view switcher (`<view-switcher>`)
- `src/controls/text-cell.ts` — built-in text control
- `src/controls/number-cell.ts` — built-in number control
- `src/controls/date-cell.ts` — built-in date control
- `src/controls/badge-cell.ts` — built-in badge control
- `src/types.ts` — TypeScript types (ColumnConfig, DataViewConfig, etc.)
- `src/registry.ts` — configureGrid() lazy loading opt-in
- `src/index.ts` — library entry point (auto-registers built-in controls)

## Approach

Single confirmed approach — no comparison needed. All decisions made and validated:

1. **Web Components + Lit** — Lit ~5KB for reactive templating. Shadow DOM on all components. CSS Custom Properties (`--dv-*`) + `::part()` for theming.
2. **Control contract** — `control` field is a tag name string. Dev registers once with `customElements.define()`. Library uses `document.createElement(tagName)`.
3. **Wrapper pattern** — `<data-view>` owns state (active view, filters, sort), processes array, delegates rendering to active sub-view.
4. **Dumb sub-views** — `<data-grid>`, `<data-list>`, `<data-cards>` render only. They display filter/sort UI but emit events. No array processing.
5. **Lazy loading opt-in** — `configureGrid({ controls: { "tag": () => import("...") } })` uses `customElements.whenDefined()`. Default is simple import + define.
6. **Persistence** — `storage-key` attribute required to activate. Modes: `localStorage` (default), `url`, `session`, `none`. `persist-fields` controls granularity.

## Open Questions (to resolve in /sdd-design)

These are deferred decisions, not blockers for proposal/spec:

| Question | Impact |
|----------|--------|
| `visible`/`disable` as Function — what args? `(row, index, allData)`? | Column config contract |
| Monorepo (pnpm workspaces + `@view-tools/*`) vs single package with tree-shaking? | Package structure |
| Build tool: Vite library mode vs tsup vs rolldown? | Build pipeline |
| ESM only vs + UMD for CDN? | Distribution |
| Testing: Vitest + Playwright vs other WC testing approach? | Testing stack |
| Storybook for visual development? | DX tooling |
| Event payload shape and bubbling strategy? | Public API |
| CSS Custom Properties naming (`--dv-*` convention confirmed, list TBD)? | Theming API |
| Filter defaults per control type (text → contains, number → range, date → range)? | UX behavior |
| Row selection — v1 or v1.x? | Scope |

## Recommendation

Architecture is confirmed. Proceed directly to proposal phase. The proposal should formalize:
- Exact public API surface (HTML attributes, JS properties, events, CSS vars)
- Package structure decision
- Milestone breakdown for v1 implementation

## Risks

1. **Lit + SSR (Astro)** — `@lit-labs/ssr` required for server-side rendering. Must verify compatibility before v1 release. If incompatible, document as known limitation.
2. **Shadow DOM + form participation** — built-in controls (text, number, date) may need `static formAssociated = true` if they participate in HTML forms. Decide in design phase.
3. **Bundle size** — goal is lightweight. Must add `size-limit` from day one to prevent creep.
4. **Open questions** — 10 unresolved design decisions above. They don't block proposal/spec but MUST be closed in `/sdd-design` before tasks are created.

## Ready for Proposal

Yes. Architecture is fully defined. Open questions are scoped to the design phase and don't affect the proposal's ability to describe intent, scope, and approach.
