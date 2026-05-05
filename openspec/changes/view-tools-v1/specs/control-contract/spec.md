# control-contract Specification

## Purpose

Defines how cell renderers are registered and instantiated. Covers the tag-name string contract, built-in controls, and lazy loading opt-in.

## Requirements

### Requirement: Tag Name Contract

A column's `control` field MUST be a valid custom element tag name string. The library MUST instantiate the control via `document.createElement(control)` and MUST wait for `customElements.whenDefined(control)` before rendering.

#### Scenario: Custom control renders

- GIVEN `customElements.define("my-cell", MyCell)` is called before render
- WHEN a column with `control: "my-cell"` is rendered
- THEN `<my-cell>` elements appear in the view with `item` and `params` set

#### Scenario: Control not defined yet

- GIVEN a column with `control: "lazy-cell"` not yet defined
- WHEN the view renders
- THEN the cell waits until `customElements.whenDefined("lazy-cell")` resolves before mounting

### Requirement: Built-in Controls

Importing the library entry point MUST auto-register `<dv-text>`, `<dv-number>`, `<dv-date>`, and `<dv-badge>` controls. No extra import or define call MUST be required.

#### Scenario: Built-ins available immediately

- GIVEN `import "@view-tools/core"` in the app
- WHEN a column uses `control: "dv-text"`
- THEN the cell renders without any additional setup
