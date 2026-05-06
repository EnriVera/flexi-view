# Delta for data-view-core

## MODIFIED Requirements

### Requirement: State Ownership

`<fv-view>` MUST own the active view, applied filters, and sort config (including sort field). It MUST pass processed data AND `currentSort`/`currentFilters` props to the active sub-view. Sub-views MUST NOT mutate state directly. `<fv-view>` MUST handle `sort-change`, `filter-change`, and `fv-export` events from all header components (built-in and custom).

(Previously: sort state was split — fv-view tracked direction, fv-grid tracked field internally; export event not handled)

#### Scenario: Default rendering

- GIVEN `data` and `columns` attributes are set and `view="grid"`
- WHEN the element connects to the DOM
- THEN the grid sub-view renders with the full unfiltered, unsorted data

#### Scenario: View switching

- GIVEN `<fv-view view="grid">`
- WHEN `view` attribute changes to `"list"`
- THEN the list sub-view mounts and the grid sub-view unmounts

#### Scenario: fv-view handles fv-export

- GIVEN `fv-view` with data loaded
- WHEN `fv-export` fires with `{ format: "csv", columns, rows }`
- THEN `fv-view` triggers the corresponding export handler (CSV download or XLSX)

### Requirement: Persistence

`<fv-view>` MUST NOT persist state unless `storage-key` is set. When set, it MUST restore view, filters, and sort (field + direction) from the configured storage on connect. Sort state in `PersistedState` MUST be `{ field, direction } | null` — the old shape (direction-only) MUST be silently dropped on read (no recovery possible; field name was never stored).

(Previously: `PersistedState.order` stored direction only, not field; URL sync did not include sort params)

#### Scenario: Persist on change

- GIVEN `storage-key="users"` and `persist="localStorage"`
- WHEN the user changes the active view to `"cards"`
- THEN the new view is written to localStorage under key `"users"`

#### Scenario: No storage-key, no persist

- GIVEN `<fv-view>` with no `storage-key`
- WHEN the page reloads
- THEN state is NOT restored from any storage

#### Scenario: Sort field persisted and restored

- GIVEN `storage-key="users"` and sort `{ field: "age", direction: "desc" }` applied
- WHEN the page reloads
- THEN sort is restored as `{ field: "age", direction: "desc" }` — field included

#### Scenario: Old persistence shape silently dropped

- GIVEN localStorage contains `order: "asc"` (old format, no field)
- WHEN `fv-view` connects and reads storage
- THEN the old value is ignored and sort state initializes as `null` (no sort applied)

## ADDED Requirements

### Requirement: URL Sort Sync

When `syncUrl: true`, `<fv-view>` MUST reflect the current sort in the URL as a `?sort=field:direction` query parameter. Removing the sort MUST remove the parameter. The URL sync MUST NOT interfere with `#view=` hash-based view routing.

#### Scenario: Sort added to URL

- GIVEN `syncUrl: true` and no current sort in URL
- WHEN sort `{ field: "name", direction: "asc" }` is applied
- THEN the URL updates to include `?sort=name:asc`

#### Scenario: Sort removed from URL

- GIVEN `?sort=name:asc` in URL and sort cleared
- WHEN `sort-change` fires with `{ field: "name", direction: null }`
- THEN `?sort` parameter is removed from the URL

#### Scenario: URL sort restored on load

- GIVEN URL contains `?sort=age:desc` on page load
- WHEN `fv-view` connects with `syncUrl: true`
- THEN sort `{ field: "age", direction: "desc" }` is applied immediately
