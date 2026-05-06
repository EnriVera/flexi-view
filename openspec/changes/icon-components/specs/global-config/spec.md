# Delta for Global Config

## MODIFIED Requirements

### Requirement: Icon rendering

The system MUST render icons as raw HTML strings via `unsafeHTML`, React icon components, or render functions. The system MUST support SVG strings, `<i class="...">` elements, React components from icon libraries, and custom render functions that return HTMLElement.

The system MUST define built-in SVG defaults for all 9 icon keys: `sortAsc`, `sortDesc`, `filter`, `clearFilter`, `close`, `export`, `gridView`, `listView`, `cardsView`.

Unknown icon keys passed to `configure()` MUST be ignored without error.
(Previously: string-only via unsafeHTML)

#### Scenario: React component icon renders correctly

- GIVEN `FlexiView.configure({ icons: { sortAsc: IconArrowUp } })` is called
- WHEN `fv-sort-action` renders the sort button
- THEN the rendered output contains an SVG element matching the IconArrowUp visual

#### Scenario: Render function icon

- GIVEN a function `const getIcon = () => { const d = document.createElement('div'); d.innerHTML = '<svg></svg>'; return d; }`
- WHEN `FlexiView.configure({ icons: { filter: getIcon } })` is called
- THEN the returned element is inserted in place of the filter icon

#### Scenario: Mixed icon types

- GIVEN `IconArrowUp` and a string icon are both provided
- WHEN `FlexiView.configure({ icons: { sortAsc: IconArrowUp, filter: '<i class="icon"></i>' } })` is called
- THEN both icon types render correctly
- AND no errors occur