# Global Config Specification

## Purpose

Defines the `FlexiView.configure()` API and all observable behaviors it introduces: icon substitution, CSS theme injection, dark mode strategy, and reactive updates to mounted components.

---

## Requirements

### Requirement: Configure API signature

The system MUST expose `FlexiView.configure(options)` where `options` is a partial object accepting `icons`, `theme`, and `darkMode`. All fields are optional.

Multiple calls to `configure()` MUST deep-merge with previously applied config; they MUST NOT reset fields that are absent in the new call.

The system MUST apply built-in defaults for all icon keys and all theme tokens before any consumer call, so the library works out-of-the-box without any `configure()` invocation.

#### Scenario: First configure call with partial options

- GIVEN no prior `configure()` call has been made
- WHEN `FlexiView.configure({ darkMode: 'dark' })` is called
- THEN dark mode is applied
- AND all built-in icon defaults and all built-in theme token defaults remain active

#### Scenario: Second configure call merges with first

- GIVEN `FlexiView.configure({ darkMode: 'dark' })` was called
- WHEN `FlexiView.configure({ icons: { export: '<i class="ti-download">' } })` is called
- THEN `darkMode` stays `'dark'`
- AND the `export` icon is replaced with the new value
- AND all other icon defaults remain unchanged

#### Scenario: No configure call at all

- GIVEN the library is imported without calling `configure()`
- WHEN a `fv-grid` component is rendered
- THEN built-in SVG icons are rendered
- AND light theme tokens are applied

---

### Requirement: Icon rendering

The system MUST render icons as raw HTML strings via `unsafeHTML`. The system MUST support any valid HTML string including inline SVG, `<i class="...">` elements, and custom web component tags.

The system MUST define built-in SVG defaults for all 9 icon keys: `sortAsc`, `sortDesc`, `filter`, `clearFilter`, `close`, `export`, `gridView`, `listView`, `cardsView`.

Unknown icon keys passed to `configure()` MUST be ignored without error.

#### Scenario: Consumer replaces a single icon

- GIVEN the built-in SVG for `filter` is active
- WHEN `FlexiView.configure({ icons: { filter: '<i class="ti-filter"></i>' } })` is called
- THEN `fv-filter-action` renders `<i class="ti-filter"></i>` where the icon appears
- AND all other icon keys continue to render their built-in SVGs

#### Scenario: Consumer passes unknown icon key

- GIVEN the valid icon keys are the 9 defined keys
- WHEN `FlexiView.configure({ icons: { unknownKey: '<svg/>' } })` is called
- THEN no error is thrown
- AND no component behavior changes

#### Scenario: All 9 built-in icons render without configure call

- GIVEN no `configure()` call has been made
- WHEN each of the 5 icon-rendering components is mounted
- THEN each renders its built-in SVG for the relevant key(s)

---

### Requirement: Theme injection via adoptedStyleSheets

The system MUST inject a `CSSStyleSheet` into `document.adoptedStyleSheets` containing `:root { --fv-*: value }` for all 12 token keys. Injected styles MUST override the component defaults.

The system MUST NOT inject styles if `document.adoptedStyleSheets` is unavailable (SSR guard).

Consumer-supplied `theme` values MUST override the active defaults (light or dark) for the tokens they specify. Unspecified tokens MUST retain their default values.

The 12 token keys are: `bg`, `headerBg`, `headerText`, `text`, `textMuted`, `border`, `rowHover`, `accent`, `primary`, `danger`, `radius`, `fontSize`.

#### Scenario: Consumer overrides a single token

- GIVEN light mode is active
- WHEN `FlexiView.configure({ theme: { primary: '#6200ea' } })` is called
- THEN `document.adoptedStyleSheets` contains `--fv-primary: #6200ea`
- AND all other tokens retain their light-mode defaults

#### Scenario: adoptedStyleSheets unavailable

- GIVEN `document.adoptedStyleSheets` is not available (SSR environment)
- WHEN `FlexiView.configure({ theme: { bg: '#fff' } })` is called
- THEN no exception is thrown
- AND the call completes silently

---

### Requirement: Dark mode strategy

The system MUST support three `darkMode` values: `'light'` (forced light), `'dark'` (forced dark), `'auto'` (follows `prefers-color-scheme`).

When `darkMode` is `'auto'`, the injected stylesheet MUST include a `@media (prefers-color-scheme: dark)` block that applies dark token defaults automatically.

When `darkMode` is `'dark'`, dark token defaults MUST be applied unconditionally.

When `darkMode` is `'light'` or omitted, light token defaults MUST be applied.

#### Scenario: Forced dark mode

- GIVEN `FlexiView.configure({ darkMode: 'dark' })` is called
- WHEN a component reads `--fv-bg`
- THEN it resolves to the dark default (`#1e1e2e`)

#### Scenario: Auto dark mode — dark OS preference

- GIVEN `FlexiView.configure({ darkMode: 'auto' })` is called
- AND the system `prefers-color-scheme` is `dark`
- WHEN a component reads `--fv-bg`
- THEN it resolves to the dark default (`#1e1e2e`)

#### Scenario: Auto dark mode — light OS preference

- GIVEN `FlexiView.configure({ darkMode: 'auto' })` is called
- AND the system `prefers-color-scheme` is `light`
- WHEN a component reads `--fv-bg`
- THEN it resolves to the light default (`#ffffff`)

#### Scenario: Dark mode changed at runtime

- GIVEN `FlexiView.configure({ darkMode: 'light' })` was called
- WHEN `FlexiView.configure({ darkMode: 'dark' })` is called
- THEN the adopted stylesheet is updated
- AND components re-render with dark token values

---

### Requirement: Reactivity — components mounted after configure

Components that subscribe to config updates MUST read the current config in `connectedCallback` and re-render whenever `configure()` is called while they are mounted.

Components MUST unsubscribe in `disconnectedCallback` to prevent memory leaks.

#### Scenario: configure() called before mount

- GIVEN `FlexiView.configure({ icons: { export: '<i class="x">' } })` was called
- WHEN `fv-export-action` is later mounted
- THEN it renders `<i class="x">` immediately without a second configure call

#### Scenario: configure() called after mount

- GIVEN `fv-sort-action` is already mounted with built-in icons
- WHEN `FlexiView.configure({ icons: { sortAsc: '<span>UP</span>' } })` is called
- THEN `fv-sort-action` re-renders with `<span>UP</span>` for the ascending icon

#### Scenario: Component unsubscribes on disconnect

- GIVEN `fv-filter-action` is mounted and subscribed
- WHEN the element is removed from the DOM
- AND `FlexiView.configure({ icons: { filter: '<i class="new">' } })` is called
- THEN no error is thrown
- AND the removed component is not updated

---

### Requirement: CDN compatibility

The system MUST expose a `window.FlexiView` object in UMD builds with a `.configure()` method that behaves identically to the ESM export.

#### Scenario: CDN usage via window.FlexiView

- GIVEN the UMD bundle is loaded via `<script src="..."></script>`
- WHEN `window.FlexiView.configure({ darkMode: 'dark' })` is called
- THEN dark tokens are applied
- AND mounted components re-render
