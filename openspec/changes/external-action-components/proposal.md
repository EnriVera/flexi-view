# Proposal: External Action Components

## Intent

`fv-sort-action`, `fv-filter-action`, and `fv-export-action` exist as dumb presentational components driven by `fv-header-menu`. Consumers cannot mount them outside `fv-view` (e.g. in an app toolbar) because they have no way to discover the target view, read current state, or push changes back. We need to make these three action components self-connecting via a `for="view-id"` attribute — the same opt-in pattern already used by `fv-switcher` and `fv-search` — so they can live anywhere in the DOM while keeping in-menu usage unchanged.

## Scope

### In Scope
- Add `for` attribute support to `fv-sort-action`, `fv-filter-action`, `fv-export-action`.
- Make each action component self-connect to the target `fv-view` and stay in sync with its sort/filter state.
- `fv-view` emits two new outbound events: `fv-sort-change` and `fv-filter-change`.
- `fv-filter-action` (external mode) auto-derives options from `fv-view.registers` (full domain, not filteredData).
- `fv-export-action` (external mode) auto-reads `registers` and `fieldGrids` from `fv-view`.
- Add `exportable?: boolean` to `ColumnConfig` in `src/types.ts`.
- Add JSX types for the three action components in `src/index.d.ts`.
- Preserve localStorage and URL persistence — external components route through `fv-view`'s existing event handlers.

### Out of Scope
- Programmatic imperative API on `fv-view` (e.g. `view.sort(...)`).
- Shared store/registry pattern (Option C from exploration).
- Changes to `fv-header-menu` orchestration or in-menu prop wiring.
- Multiple targets per action component (`for` accepts a single id).

## Capabilities

### New Capabilities
- None.

### Modified Capabilities
- `fv-view`: add public outbound events `fv-sort-change` and `fv-filter-change` emitted whenever internal sort/filter state changes; document `for`-based connection contract for external action components.

## Approach

Apply the proven `fv-switcher`/`fv-search` hybrid pattern (Option B from exploration):

1. `fv-view` emits `fv-sort-change` (payload: current `sortConfig`) and `fv-filter-change` (payload: current `filters`) whenever internal state mutates.
2. Each action component, when `for` is set, resolves the target via `document.getElementById` in `firstUpdated`, reads initial state from public getters (`registers`, `columnDefs`, sort/filter state), and subscribes to the new outbound events.
3. On user action, the component dispatches its event on itself (bubbles) AND redispatches it directly on the target `fv-view` — same belt-and-suspenders technique as `fv-search` — to guarantee delivery regardless of DOM placement.
4. `fv-export-action` keeps its current self-executing behavior; in external mode it pulls `registers` and `fieldGrids` from `fv-view` automatically.
5. Persistence (localStorage/URL) requires no changes — `fv-view` already handles it inside its existing event handlers.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `src/components/fv-sort-action.ts` | Modified | Add `for`, connect to fv-view, sync via `fv-sort-change`. |
| `src/components/fv-filter-action.ts` | Modified | Add `for`, derive options from `registers`, sync via `fv-filter-change`. |
| `src/components/fv-export-action.ts` | Modified | Add `for`, auto-read `registers` and `fieldGrids`. |
| `src/components/fv-view.ts` | Modified | Emit `fv-sort-change`, `fv-filter-change`. |
| `src/types.ts` | Modified | Add `exportable?: boolean` to `ColumnConfig`; new event detail types. |
| `src/index.d.ts` | Modified | JSX types for the three action components. |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Mount race: `getElementById` returns null when component connects before `fv-view`. | Med | Defer connection to `firstUpdated`; if target missing, retry on next microtask and warn once. |
| New outbound events become public API and constrain future refactors. | Med | Document payload shape in `fv-view` spec; treat as semver-stable. |
| In-menu usage regresses if event names collide. | Low | New events are namespaced (`fv-sort-change`, `fv-filter-change`) and distinct from menu's `sort-change`/`filter-change`. |
| `exportable` typing change reveals existing miswritten configs. | Low | Field is optional; no runtime change. |

## Rollback Plan

Each component change is isolated and additive (`for` is opt-in). To revert: remove `for` handling from the three action components, drop `fv-sort-change`/`fv-filter-change` emissions in `fv-view`, revert `types.ts` and `index.d.ts`. In-menu usage is untouched throughout, so rollback cannot break existing consumers.

## Dependencies

- None.

## Success Criteria

- [ ] `<fv-sort-action for="my-view" field="name">` mounted outside `fv-view` updates sort and reflects current direction.
- [ ] `<fv-filter-action for="my-view" field="status">` shows options derived from `registers` and toggles filters correctly.
- [ ] `<fv-export-action for="my-view" format="csv">` exports using `registers` and `fieldGrids` from the target view.
- [ ] localStorage and URL state continue to persist when changes originate from external action components.
- [ ] In-menu (`fv-header-menu`) usage of all three components is unchanged — no regressions.
- [ ] `ColumnConfig.exportable` is typed; TS consumers no longer get implicit-any on that field.
- [ ] JSX consumers get full intellisense for the three action components.
