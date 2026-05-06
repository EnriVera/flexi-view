# Delta for Theme Object

## ADDED Requirements

### Requirement: Theme object configuration

The system SHALL accept a `theme` object in `FlexiView.configure({ theme: {...} })` where the object keys match the 12 token names: `bg`, `headerBg`, `headerText`, `text`, `textMuted`, `border`, `rowHover`, `accent`, `primary`, `danger`, `radius`, `fontSize`.

Each value SHALL be a CSS-valid string value (color, size, etc.).

The system SHALL convert the theme object to CSS custom properties (`--fv-{key}: value`) automatically.

#### Scenario: Theme object overrides single token

- GIVEN `FlexiView.configure({ theme: { primary: '#ff0000' } })` is called
- WHEN a component uses `var(--fv-primary)`
- THEN it resolves to `#ff0000`
- AND all other tokens retain their default values

#### Scenario: Theme object overrides multiple tokens

- GIVEN `FlexiView.configure({ theme: { primary: '#ff0000', radius: '12px', fontSize: '16px' } })` is called
- WHEN the CSS custom properties are read
- THEN `--fv-primary: #ff0000`
- AND `--fv-radius: 12px`
- AND `--fv-font-size: 16px`
- AND all other tokens unchanged

#### Scenario: Theme object with dark mode

- GIVEN `FlexiView.configure({ darkMode: 'dark', theme: { primary: '#00ff00' } })` is called
- WHEN CSS custom properties are read
- THEN dark mode defaults are applied first
- AND the theme object overrides only the specified keys
- AND `--fv-primary: #00ff00` overrides the dark default

### Requirement: Theme object type safety

The system SHALL expose TypeScript types that enforce valid token keys.

Invalid token keys SHALL produce a TypeScript error.

#### Scenario: Invalid token key type error

- GIVEN TypeScript is configured with flexi-view types
- WHEN `configure({ theme: { invalidKey: '#fff' } })` is typed
- THEN TypeScript reports an error
- AND valid keys show no error

### Requirement: Theme object merge behavior

Multiple `configure()` calls with theme objects SHALL deep-merge.

New theme values SHALL override previous values.

Omitted keys SHALL retain their previous values.

#### Scenario: Theme object merge on second configure

- GIVEN `FlexiView.configure({ theme: { primary: '#f00', radius: '8px' } })` was called
- WHEN `FlexiView.configure({ theme: { fontSize: '14px' } })` is called
- THEN `--fv-primary: #f00` remains
- AND `--fv-radius: 8px` remains
- AND `--fv-font-size: 14px` is added

---

## MODIFIED Requirements

None.

---

## REMOVED Requirements

None.