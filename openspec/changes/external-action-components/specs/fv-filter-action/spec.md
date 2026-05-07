# fv-filter-action Specification

## Purpose

`<fv-filter-action>` is a filter control component. It operates in two modes: **injected** (props-driven, orchestrated by `fv-header-menu`) and **external** (self-connecting via `for` attribute).

## Requirements

### Requirement: fv-filter-action MUST support optional for attribute

`<fv-filter-action>` SHALL accept an optional `for` attribute (string). When absent, injected mode MUST remain unchanged. When present, it activates external mode.

#### Scenario: for absent — injected mode unchanged

- GIVEN `<fv-filter-action>` with no `for` attribute
- WHEN `fv-header-menu` sets `field`, `selected`, `options` as properties
- THEN component SHALL behave exactly as before this change

---

### Requirement: fv-filter-action MUST derive options from registers when for is set

When in external mode, `<fv-filter-action>` SHALL read unique values for its `field` from `fv-view.registers` (the full unfiltered dataset). Options MUST NOT be derived from filtered data.

#### Scenario: options computed from full registers

- GIVEN `<fv-filter-action for="my-view" field="status">` and `<fv-view>` with 10 records
- WHEN component connects
- THEN options SHALL be the unique values of `status` across all 10 records in `registers`
- AND SHALL NOT be limited to currently filtered records

---

### Requirement: fv-filter-action MUST self-connect and sync with target fv-view

When `for` is set, `<fv-filter-action>` SHALL resolve the target via `document.getElementById(for)` on `firstUpdated`, with `requestAnimationFrame` retry on race. It MUST subscribe to `fv-filter-change` on the target and update its selected state accordingly.

#### Scenario: target found and initial state read

- GIVEN `<fv-filter-action for="my-view" field="status">` and mounted `<fv-view id="my-view">`
- WHEN `firstUpdated` fires
- THEN component SHALL read `registers` to compute options
- AND SHALL read current filter state for its `field`

#### Scenario: fv-filter-change updates selected state

- GIVEN a connected `<fv-filter-action for="my-view" field="status">`
- WHEN `fv-filter-change` fires with `{ filters: { status: ['active'] } }`
- THEN component SHALL update its selected state to `['active']`

#### Scenario: mount race handled

- GIVEN `<fv-filter-action for="my-view">` mounting before `<fv-view id="my-view">`
- WHEN `getElementById` returns `null`
- THEN component SHALL retry via `requestAnimationFrame`
- AND SHALL NOT render in broken state

---

### Requirement: fv-filter-action MUST dispatch on self AND on target when for is set

On user action in external mode, `<fv-filter-action>` SHALL dispatch `filter-change` on itself (bubbles: true) AND SHALL redispatch directly on the target `fv-view` element.

#### Scenario: user toggles filter — event dispatched on both

- GIVEN a connected `<fv-filter-action for="my-view" field="status">`
- WHEN user selects value "active"
- THEN `filter-change` SHALL be dispatched on `fv-filter-action` itself
- AND `filter-change` SHALL be dispatched on `<fv-view id="my-view">` directly
- AND `fv-view` SHALL update its filter state and persist it
