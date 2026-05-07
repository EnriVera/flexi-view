# fv-sort-action Specification

## Purpose

`<fv-sort-action>` is a sort control component. It operates in two modes: **injected** (props-driven, orchestrated by `fv-header-menu`) and **external** (self-connecting via `for` attribute).

## Requirements

### Requirement: fv-sort-action MUST support optional for attribute

`<fv-sort-action>` SHALL accept an optional `for` attribute (string). When absent, component behavior MUST remain unchanged (injected mode). When present, it activates external mode.

#### Scenario: for absent — injected mode unchanged

- GIVEN `<fv-sort-action>` with no `for` attribute
- WHEN `fv-header-menu` sets `field`, `direction`, `active` as properties
- THEN component SHALL behave exactly as before this change

---

### Requirement: fv-sort-action MUST self-connect to target fv-view when for is set

When `for` is set, `<fv-sort-action>` SHALL resolve the target element via `document.getElementById(for)` on `firstUpdated`. If the element is not yet available, it MUST retry via `requestAnimationFrame` until found. Component MUST read initial sort state from target's public getters on connect.

#### Scenario: target found on firstUpdated

- GIVEN `<fv-sort-action for="my-view">` and `<fv-view id="my-view">` already in DOM
- WHEN `firstUpdated` fires
- THEN component SHALL resolve target and read current sort state

#### Scenario: mount race — target not yet in DOM

- GIVEN `<fv-sort-action for="my-view">` mounting before `<fv-view id="my-view">`
- WHEN `getElementById` returns `null`
- THEN component SHALL retry via `requestAnimationFrame` until target is found
- AND SHALL NOT throw or render in broken state

---

### Requirement: fv-sort-action MUST stay in sync with fv-view sort state

When in external mode, `<fv-sort-action>` SHALL subscribe to `fv-sort-change` events on the target element. On each event, it MUST update its own display to reflect the current `{ field, direction }` payload.

#### Scenario: fv-view sort changes externally

- GIVEN a connected `<fv-sort-action for="my-view">` for field "name"
- WHEN another component sorts by "name" asc via `fv-view`
- THEN `fv-sort-action` SHALL reflect `direction: 'asc'` in its display

#### Scenario: fv-sort-change for different field ignored

- GIVEN a connected `<fv-sort-action for="my-view">` for field "name"
- WHEN `fv-sort-change` fires with `{ field: 'email', direction: 'asc' }`
- THEN component MAY ignore or reset its active state (it is not the active sort field)

---

### Requirement: fv-sort-action MUST dispatch on self AND on target when for is set

On user action in external mode, `<fv-sort-action>` SHALL dispatch `sort-change` on itself (bubbles: true) AND SHALL redispatch the same event directly on the target `fv-view` element.

#### Scenario: user clicks sort — event dispatched on both

- GIVEN a connected `<fv-sort-action for="my-view">` for field "name"
- WHEN user clicks to sort ascending
- THEN `sort-change` SHALL be dispatched on `fv-sort-action` itself
- AND `sort-change` SHALL be dispatched on the `<fv-view id="my-view">` element directly
- AND `fv-view` SHALL update its sort state and persist it
