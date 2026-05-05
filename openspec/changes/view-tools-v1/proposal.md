# Proposal: view-tools-v1

## Intent

Developers need a framework-agnostic data visualization library that renders records in multiple views (Grid, List, Cards) without coupling them to a specific framework. Today no lightweight, Web Components-based solution exists that lets devs plug their own cell renderers via a simple tag-name contract while handling sort, filter, and persistence out of the box.

## Scope

### In Scope
- `<data-view>` wrapper — state management (view, filters, sort) + array processing + persistence
- `<data-grid>` — table sub-view with column headers, sort UI, filter UI
- `<data-list>` — list sub-view
- `<data-cards>` — cards sub-view
- `<view-switcher>` — optional view switcher element
- Control contract: `{ control: "tag-name", params: {}, title: "..." }` + built-ins (text, number, date, badge)
- Lazy loading opt-in: `configureGrid({ controls: { "tag": () => import(...) } })`
- Client-side sort + filter with event emission (`filter-change`, `sort-change`, etc.)
- Persistence: `storage-key` attribute → localStorage / url / session / none
- Theming: CSS Custom Properties (`--dv-*`) + `::part()`
- TypeScript types for full type-safety

### Out of Scope
- Pagination, row selection, global search — v1.x
- Kanban view — v2
- Server-side sort/filter — consumers handle via events
- SSR/hydration helpers — document as known limitation if Lit SSR incompatible

## Capabilities

### New Capabilities
- `data-view-core`: wrapper component, view switching, state, persistence
- `data-grid`: grid/table sub-view with headers, sort UI, filter UI
- `data-list`: list sub-view rendering
- `data-cards`: cards sub-view rendering
- `control-contract`: tag name string contract, built-in controls, lazy registry
- `sort-filter`: client-side sort and filter logic inside the wrapper

### Modified Capabilities
None — greenfield library.

## Approach

Web Components (Custom Elements) + Lit ~5KB as internal base. Shadow DOM on all components for CSS isolation. Sub-views are dumb renderers that emit DOM events; `<data-view>` processes the array and owns all state. Built-in controls auto-register on import. Lazy loading via `customElements.whenDefined()`.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `src/components/` | New | All 5 Web Components |
| `src/controls/` | New | 4 built-in cell controls |
| `src/types.ts` | New | ColumnConfig, DataViewOptions, event payloads |
| `src/registry.ts` | New | configureGrid() lazy loading API |
| `src/index.ts` | New | Library entry point, auto-registers built-ins |
| `package.json` | New | lit, typescript, vitest, build tool TBD |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Lit SSR incompatibility (Astro) | Med | Verify @lit-labs/ssr early; document limitation if needed |
| Shadow DOM blocks form participation | Low | Add `formAssociated` to input controls in design phase |
| Bundle size creep | Low | Add size-limit from day one, track per release |
| 10 open design decisions | Med | Close all in /sdd-design before /sdd-tasks |

## Rollback Plan

Library is a new npm package — no existing consumers. Any breaking change during v1 development is safe to revert via git. No database migrations or deployed infra involved.

## Dependencies

- `lit` ~5KB — Web Components base
- `typescript` — types and compilation
- Build tool, test stack, distribution format — TBD in /sdd-design

## Success Criteria

- [ ] `<data-view data="..." columns="..." view="grid">` renders a functional grid with no additional config
- [ ] Developer can register any Web Component as a cell control via tag name string
- [ ] Sort and filter work client-side out of the box
- [ ] `storage-key` persists view + filters + sort across page reloads
- [ ] Library imports cleanly in React, Vue, Astro, and vanilla HTML+JS
- [ ] Bundle size ≤ 20KB gzipped (including Lit)
- [ ] All 6 capabilities have passing specs
