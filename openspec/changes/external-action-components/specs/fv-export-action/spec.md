# fv-export-action Specification

## Purpose

`<fv-export-action>` is an export trigger component. It operates in two modes: **injected** (props-driven, orchestrated by `fv-header-menu`) and **external** (self-connecting via `for` attribute).

## Requirements

### Requirement: fv-export-action MUST support optional for attribute

`<fv-export-action>` SHALL accept an optional `for` attribute (string). When absent, injected mode MUST remain unchanged. When present, it activates external mode.

#### Scenario: for absent — injected mode unchanged

- GIVEN `<fv-export-action>` with no `for` attribute and `registers`, `fieldGrids` set as properties
- WHEN user triggers export
- THEN export SHALL execute using the injected properties exactly as before this change

---

### Requirement: fv-export-action MUST read registers and fieldGrids from fv-view when for is set

When in external mode, `<fv-export-action>` SHALL read `registers` and `fieldGrids` directly from the connected `<fv-view>` at export time. These properties MUST NOT be required as external props when `for` is set.

#### Scenario: export reads data from fv-view

- GIVEN `<fv-export-action for="my-view" format="csv">` and `<fv-view id="my-view">` with 5 records and `fieldGrids`
- WHEN user triggers export
- THEN component SHALL read `fv-view.registers` and `fv-view.fieldGrids` at trigger time
- AND SHALL execute CSV export with those values

#### Scenario: exportable columns respected

- GIVEN `<fv-export-action for="my-view">` and `<fv-view>` with `fieldGrids` containing columns where `exportable: false`
- WHEN user triggers export
- THEN export MUST exclude columns where `exportable` is `false`

---

### Requirement: fv-export-action MUST self-connect to target fv-view when for is set

When `for` is set, `<fv-export-action>` SHALL resolve the target via `document.getElementById(for)` on `firstUpdated`, with `requestAnimationFrame` retry on race.

#### Scenario: target found on firstUpdated

- GIVEN `<fv-export-action for="my-view">` and `<fv-view id="my-view">` already in DOM
- WHEN `firstUpdated` fires
- THEN component SHALL resolve and hold a reference to the target element

#### Scenario: mount race handled

- GIVEN `<fv-export-action for="my-view">` mounting before `<fv-view id="my-view">`
- WHEN `getElementById` returns `null`
- THEN component SHALL retry via `requestAnimationFrame`
- AND SHALL NOT fail on export trigger once target resolves

---

### Requirement: fv-export-action self-executing behavior MUST be unchanged

In both injected and external modes, `<fv-export-action>` SHALL continue to execute the export download directly (CSV or XLSX) without requiring the parent to handle `fv-export-request`.

#### Scenario: external mode triggers download directly

- GIVEN `<fv-export-action for="my-view" format="xlsx">`
- WHEN user triggers export
- THEN component SHALL call `exportXLSX` with data from fv-view
- AND SHALL initiate the file download without additional orchestration
