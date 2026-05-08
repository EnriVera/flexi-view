# Proposal: sort-action-modal

## Intent

### Problem
The current `fv-sort-action` is a per-field chip: each sortable field requires its own component instance, and the user toggles direction by re-clicking the chip. This forces consumers to render N chips for N sortable fields, eats horizontal space in the toolbar, and offers no clear "pick a field, then pick a direction" mental model. It also lacks persistence — the active sort is not retained across reloads via `storage-key`/`sync-url` like `fv-view` already supports for sort state.

### Why now
The toolbar pattern in `fv-view` consumers has grown to 4-6 sortable fields. The chip row is becoming visually noisy, and users have asked for a "Sort by…" affordance that mirrors the modal pattern already established by `fv-filter-action` + `fv-filter-modal`. Aligning sort with that pattern unifies the UX and reduces toolbar surface area to a single button.

### Success looks like
- One `<fv-sort-action for="view">` element replaces N chips and exposes all sortable fields via `registerOrder`.
- A two-column modal lets the user pick field (left) then direction (right) in a single, discoverable interaction.
- Active sort survives reload when `storage-key` and/or `sync-url` are set, matching the contract `fv-view` already implements.
- `fv-header-menu` (the in-grid sort UI) is untouched; both entry points produce identical `sort-change` events.
- Consumers migrate by replacing N tags with one tag — no event-shape changes.

## Scope

### In scope
- New component: `fv-sort-action` rewritten as a single-button + modal trigger.
- New child component: `fv-sort-modal` (two-column field/direction picker, mirroring `fv-filter-modal` styling and lifecycle).
- New attribute `registerOrder` on `fv-sort-action`: `Array<{ field: string; title: string }>` (set via property; serialized via JSON attribute for declarative HTML use).
- New attribute `storage-key` on `fv-sort-action`: persists `{field, direction}` to `localStorage` using the same key pattern as `fv-view`.
- New attribute `sync-url` on `fv-sort-action`: reads/writes `fv-sort=field:direction` to/from URL hash, same pattern as `fv-view`.
- Active-state button: shows `"<title> - <Ascending|Descending>"` plus an inline `×` clear control (preserves the visual language of the current chip).
- Toggle-to-clear semantics: clicking the currently active field+direction inside the modal clears the sort.
- Inbound sync: keep subscribing to the target view's `fv-sort-change` event so external sort changes update the button label.
- Outbound emit: keep dispatching `sort-change` (`SortChangeDetail`) bubbling+composed AND retargeted to the connected view (unchanged behavior).

### Out of scope
- Changes to `fv-header-menu` — it keeps its own dual-button sort UI rendered via two `fv-sort-action`-shaped emitters. We will preserve the event contract so it keeps working, but its internals are not touched in this change. (See "Risks" — the in-grid menu currently mounts `<fv-sort-action>` instances; that consumer must keep working.)
- Multi-field/composite sort. Single active sort only, matching today's `SortChangeDetail`.
- Changes to `SortChangeDetail` shape or to `fv-view`'s sort handling.
- Changes to filter components.
- New i18n keys beyond what already exists in `t().sort` (asc/desc/clear). A "Sort" placeholder label and "no field selected" empty state may need additions — to be confirmed in spec.

## Approach

### Shape
Two components, mirroring the filter trio (`fv-filter-action` + `fv-filter-modal`):

1. **`fv-sort-action`** (rewritten)
   - Single button. Inactive label: i18n `t().sort.title` (new) or fallback `"Sort"`. Active label: `"<title> - <direction>"`.
   - When active, renders an inline `×` clear button using the same chip CSS already in the file.
   - Click on main button → opens `fv-sort-modal`.
   - Holds canonical state: `currentField: string | null`, `currentDirection: 'asc' | 'desc' | null`, plus a `registerOrder` array.
   - Persistence: on first connection, hydrates from URL hash (if `sync-url`) → then localStorage (if `storage-key`) → then the connected view's `currentSort`. URL wins because it's user-shared. Writes back on every change.
   - External sync: subscribes to `fv-sort-change` on the target view, so programmatic sort changes (e.g. `fv-header-menu`) update the button label and the persisted state.

2. **`fv-sort-modal`** (new)
   - Same backdrop + centered modal shell as `fv-filter-modal` (copy the CSS structure for visual consistency).
   - Body is two flex columns separated by a 1px vertical divider.
   - Left column: scrollable list of `registerOrder` entries rendered as buttons with `aria-pressed` for the selected field.
   - Right column: only renders when a field is selected. Shows two stacked buttons: `↑ Ascending` and `↓ Descending`, using the same icon system as today's `fv-sort-action` (`getFlexiConfig().icons.sortAsc/sortDesc`). Buttons are `aria-pressed` when matching the currently active sort — clicking an already-active one emits a clear.
   - Emits `sort-change` (with `SortChangeDetail` — `direction: 'asc' | 'desc' | null`) and a `modal-close` event, exactly like the filter modal pattern.
   - Closes on backdrop click, Escape, or after applying a direction.

### Why this shape (rationale)
- **Mirror, don't reinvent.** `fv-filter-action`/`fv-filter-modal` already establish: state lives in the action component, modal is a dumb child driven by `.open` + props, modal emits change events that the parent forwards. Reusing this pattern keeps the codebase coherent and lowers reviewer load.
- **Two-column instead of nested submenu.** A single screen that shows both axes (field + direction) at once is faster than a two-step drill-down and avoids needing back navigation. It also scales to many fields without becoming an overflow popover.
- **Single canonical state, dual persistence.** Storing `{field, direction}` in one place (URL > localStorage > view) avoids the three-way drift bugs `fv-view` already fixed (commit `bff4955` — "preserve filters on search, sync acceptedViews externally, guard URL sort read"). We adopt the same hierarchy.
- **Preserve event contract.** `SortChangeDetail` and the retargeted dispatch to the connected view stay byte-identical, so `fv-view` and `fv-header-menu` need no changes.
- **Declarative `registerOrder`.** Accepting both an attribute (JSON-serialized) and a property keeps the API friendly to plain-HTML consumers and to framework wrappers that pass arrays directly — same dual-mode pattern Lit components in this repo already use for `fieldGrids`.

### Migration
- Old: `<fv-sort-action for="v" field="name" label="Name"></fv-sort-action> × N`
- New: `<fv-sort-action for="v" .registerOrder=${[{field:'name',title:'Name'}, ...]}></fv-sort-action>`
- A short migration note in the change spec; no codemod needed (low usage surface).

## Risks / Open Questions

1. **`fv-header-menu` mounts `<fv-sort-action>` per direction.** Lines 171-182 of `fv-header-menu.ts` instantiate two `<fv-sort-action>` elements with `field`/`direction`/`active` to render the in-grid Asc/Desc buttons. Rewriting `fv-sort-action` as a single-button modal trigger BREAKS that usage. **Resolution options to decide in design phase:**
   - (a) Extract the current chip into a new internal component (e.g. `fv-sort-direction-button`) used by both the old call sites in `fv-header-menu` and as a building block elsewhere — preferred.
   - (b) Keep legacy `fv-sort-action` behavior when `field` attribute is present and no `registerOrder`, and switch to modal mode when `registerOrder` is set — dual-mode, more compat but more code.
   - (c) Inline the two buttons directly inside `fv-header-menu` and delete the per-field chip path entirely.
   - This is the most important decision for the design phase.
2. **Attribute vs property for `registerOrder`.** JSON-in-attribute is ergonomic for HTML but error-prone (parse failures). Need to spec the parse + warning behavior.
3. **i18n.** Need new keys for the inactive button label (`"Sort"`), the modal title, and the "no field selected" right-column empty state. Need to confirm whether existing `t().sort` namespace can absorb these without breaking existing locales.
4. **Storage-key collision with `fv-view`.** If both `fv-view` and `fv-sort-action` write a sort key to the same localStorage namespace, last-writer-wins. Spec should define a distinct sub-key (e.g. `${storage-key}:sort`) or explicitly document that they share.
5. **URL hash collision.** If `fv-view` already owns `fv-sort=` in the hash and `fv-sort-action` also writes it, we must guarantee a single owner. Options: action defers writes when it has a `for` target that itself has `sync-url` enabled; or only the action writes and `fv-view` reads. Decide in design.
6. **Accessibility.** Two-column picker needs sane keyboard model: arrow keys to traverse left list, Tab/Right-arrow to jump to direction buttons, Enter/Space to apply, Escape to close. To be specified in spec.

## Next Phases
- `sdd-spec`: precise API (attributes, properties, events, persistence keys, i18n keys), accessibility contract, edge cases (invalid `registerOrder`, missing target, hydration order).
- `sdd-design`: resolve the `fv-header-menu` compatibility question (the three options above), decide URL/storage ownership rules, define the internal component split if any.
