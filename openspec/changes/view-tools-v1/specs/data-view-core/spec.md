# data-view-core Specification

## Purpose

The `<data-view>` wrapper component that owns state, coordinates sub-views, and handles persistence.

## Requirements

### Requirement: State Ownership

`<data-view>` MUST own the active view, applied filters, and sort config. It MUST pass processed data to the active sub-view. Sub-views MUST NOT mutate state directly.

#### Scenario: Default rendering

- GIVEN `data` and `columns` attributes are set and `view="grid"`
- WHEN the element connects to the DOM
- THEN the grid sub-view renders with the full unfiltered, unsorted data

#### Scenario: View switching

- GIVEN `<data-view view="grid">`
- WHEN `view` attribute changes to `"list"`
- THEN the list sub-view mounts and the grid sub-view unmounts

### Requirement: Persistence

`<data-view>` MUST NOT persist state unless `storage-key` is set. When set, it MUST restore view, filters, and sort from the configured storage on connect.

#### Scenario: Persist on change

- GIVEN `storage-key="users"` and `persist="localStorage"`
- WHEN the user changes the active view to `"cards"`
- THEN the new view is written to localStorage under key `"users"`

#### Scenario: No storage-key, no persist

- GIVEN `<data-view>` with no `storage-key`
- WHEN the page reloads
- THEN state is NOT restored from any storage
