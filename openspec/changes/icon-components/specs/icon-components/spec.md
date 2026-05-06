# Delta for Icon Components

## ADDED Requirements

### Requirement: React component icon support

The system SHALL accept a React component or icon library component as the value for any icon key in `FlexiView.configure({ icons: {...} })`.

The system SHALL normalize React components to renderable HTML before displaying them in the UI.

The system SHALL support icon components from `@tabler/icons-react`, `lucide-react`, and any React component that renders an SVG.

#### Scenario: Tabler icon component passed to configure

- GIVEN `IconArrowUp` is imported from '@tabler/icons-react'
- WHEN `FlexiView.configure({ icons: { sortAsc: IconArrowUp } })` is called
- THEN `fv-sort-action` renders an SVG icon equivalent to the imported component
- AND the icon appears in the sort ascending button

#### Scenario: Lucide icon component passed to configure

- GIVEN `Filter` is imported from 'lucide-react'
- WHEN `FlexiView.configure({ icons: { filter: Filter } })` is called
- THEN `fv-filter-action` renders the Filter icon
- AND the icon appears in the filter button

#### Scenario: Mixed icon types in single configure call

- GIVEN `IconArrowUp` and `<svg>...</svg>` are both available
- WHEN `FlexiView.configure({ icons: { sortAsc: IconArrowUp, filter: '<svg>...</svg>' } })` is called
- THEN `sortAsc` renders the React component as SVG
- AND `filter` renders the string SVG
- AND no errors occur

### Requirement: Render function support

The system SHALL accept a function that returns an `HTMLElement` as an icon value.

The function SHALL be called at render time to produce the icon element.

#### Scenario: Custom render function

- GIVEN a function `const myIcon = () => document.createElement('div')`
- WHEN `FlexiView.configure({ icons: { close: myIcon } })` is called
- THEN the returned element is inserted into the DOM
- AND no error is thrown

### Requirement: Backward compatibility with string icons

The system MUST continue to accept SVG strings for all icon keys.

The system MUST NOT break any existing code that passes string icons to `configure()`.

#### Scenario: String icon still works

- GIVEN `<svg xmlns="http://www.w3.org/2000/svg">...</svg>` is passed
- WHEN `FlexiView.configure({ icons: { export: '<svg>...</svg>' } })` is called
- THEN the SVG string is rendered unchanged
- AND no errors occur

### Requirement: TypeScript type support

The system SHALL expose TypeScript types that correctly infer `string | React.ComponentType | Function` for icon values.

The type system SHALL provide autocomplete for all 9 icon keys.

#### Scenario: TypeScript infers union type

- GIVEN TypeScript is configured with the flexi-view types
- WHEN `configure({ icons: { sortAsc: ... } })` is typed
- THEN the icon value accepts `string`, `React.ComponentType`, or `(props?: any) => HTMLElement`

---

## MODIFIED Requirements

### Requirement: Icon rendering (from global-config)

The system MUST render icons as raw HTML strings via `unsafeHTML`, React components, or render functions. The system MUST support any valid HTML string including inline SVG, `<i class="...">` elements, React components, and custom web component tags.
(Previously: string-only via unsafeHTML)

#### Scenario: React component icon renders correctly

- GIVEN `FlexiView.configure({ icons: { sortAsc: IconArrowUp } })` is called
- WHEN `fv-sort-action` renders the sort button
- THEN the rendered output contains an SVG element
- AND the SVG matches the visual output of IconArrowUp

---

## REMOVED Requirements

None.