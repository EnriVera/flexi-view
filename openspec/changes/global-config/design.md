# Design: Global Config (Icons + Theme + Dark Mode)

## Technical Approach

Extend `registry.ts` as the single authoritative source of truth for UI configuration. A subscriber set drives reactivity: `configure()` merges new values, adopts a constructed `CSSStyleSheet` on `document`, and notifies all registered callbacks so mounted Lit components call `requestUpdate()`. Icons ship as raw HTML strings rendered via `unsafeHTML`. Types land in `types.ts`; the public `FlexiView` object is assembled in `index.ts`.

No new npm dependencies. `lit/directives/unsafe-html.js` is already a Lit sub-package.

## Architecture Decisions

### Decision: Subscriber set in registry (not a custom event / reactive store)

| Option | Tradeoff | Decision |
|--------|----------|----------|
| `Set<() => void>` in registry | Zero deps, no DOM coupling, trivially tested | **Chosen** |
| `CustomEvent` on `document` | Requires DOM in tests, listener leak risk | Rejected |
| Lit `@state` / MobX / signals | External dep or Lit-internal only | Rejected |

**Rationale**: The registry is already the singleton. Adding a `Set` of callbacks costs ~10 LOC and is easy to verify in unit tests without a DOM.

### Decision: CSS injection via `document.adoptedStyleSheets` (one managed sheet)

| Option | Tradeoff | Decision |
|--------|----------|----------|
| Single `CSSStyleSheet`, replaced on each `configure()` | Clean, no duplicate rules, Shadow DOM inherits vars | **Chosen** |
| Append new sheet on every call | Leaks sheets, specificity unpredictable | Rejected |
| `<style>` tag in `<head>` | Cannot replace cleanly, FOUC risk | Rejected |

**Rationale**: CSS custom properties defined on `:root` inherit into Shadow DOM by spec. A single managed sheet replaced via `sheet.replaceSync()` avoids duplicates and is synchronous.

### Decision: Dark mode via media query in the same sheet (`auto`) / direct vars (`dark`/`light`)

| Option | Tradeoff | Decision |
|--------|----------|----------|
| Inline `@media` in the sheet for `auto`; direct `:root` override for `dark` | One sheet, zero class toggling | **Chosen** |
| `.fv-dark` class on `<html>` | Requires DOM mutation, JS coupling | Rejected |
| Two separate sheets | More management code | Rejected |

**Rationale**: Keeping everything in one sheet makes `configure()` idempotent: each call rebuilds the string and calls `sheet.replaceSync()`. Works without `document.querySelector` or class manipulation.

### Decision: `fv-switcher` icons stay as Lit `svg` template results for active view; other components use `unsafeHTML`

| Option | Tradeoff | Decision |
|--------|----------|----------|
| Replace switcher's `svg` tagged template with `unsafeHTML` config lookup | Uniform pattern, consumer can override view icons | **Chosen** |
| Keep switcher's existing `ICONS` object unchanged | Zero risk but inconsistent | Rejected |

**Rationale**: Switcher exposes `gridView`, `listView`, `cardsView` icon keys. Migrating to `unsafeHTML` from config is 3 lines of change and gives consumers full control over view-toggle icons.

### Decision: `_resetRegistryForTesting()` extended, not replaced

Existing test infrastructure calls `_resetRegistryForTesting()`. The function is extended to also reset `_flexiConfig`, clear `subscribers`, and call `sheet.replaceSync('')` — preserving the existing API contract for all current tests.

## Data Flow

```
caller: FlexiView.configure({ icons, theme, darkMode })
          │
          ▼
    registry.configure()          ← merges into _flexiConfig
          │
          ├─→ buildStylesheet()   ← computes CSS string from token map + darkMode
          │       │
          │       └─→ sheet.replaceSync(css)
          │               └─→ document.adoptedStyleSheets (assigned once)
          │
          └─→ notifySubscribers() ← forEach cb in subscribers Set
                    │
                    └─→ component._onConfigChange()
                              └─→ this.requestUpdate()  ← Lit re-renders
```

```
component lifecycle:
  connectedCallback()     → _unsubscribe = subscribeConfig(this._onConfigChange)
  disconnectedCallback()  → _unsubscribe?.()
  render()                → unsafeHTML(getFlexiConfig().icons.sortAsc ?? DEFAULT_ICONS.sortAsc)
```

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `src/types.ts` | Modify | Add `DarkMode`, `FlexiViewIcons`, `FlexiViewTheme`, `FlexiViewConfig` |
| `src/registry.ts` | Modify | Add `_flexiConfig`, `subscribers`, `configure()`, `subscribeConfig()`, `getFlexiConfig()`, CSS injection; extend `_resetRegistryForTesting()` |
| `src/index.ts` | Modify | Export `FlexiView = { configure, configureGrid, getGridConfig, version }` |
| `src/components/fv-sort-action.ts` | Modify | Subscribe to config; replace text labels with `unsafeHTML(icons.sortAsc/sortDesc)` |
| `src/components/fv-filter-action.ts` | Modify | Subscribe; replace `#999` hardcode with `--fv-text-muted`; no icon (checkboxes only) |
| `src/components/fv-export-action.ts` | Modify | Subscribe; replace text labels with `unsafeHTML(icons.export)` |
| `src/components/fv-header-menu.ts` | Modify | Subscribe; replace `#d32f2f` / `#ffebee` hardcodes with `var(--fv-danger)` / `var(--fv-danger-bg)`; replace `#333` with `var(--fv-text)`; add `icons.clearFilter` via `unsafeHTML` |
| `src/components/fv-filter-modal.ts` | Modify | Replace `color: #666` on `.close-btn` with `var(--fv-text-muted)`; subscribe and add `icons.close` via `unsafeHTML` |
| `src/components/fv-switcher.ts` | Modify | Subscribe; replace local `ICONS` object with `unsafeHTML(icons.gridView/listView/cardsView)` |
| `src/__tests__/unit/registry.test.ts` | Modify | Add tests for `configure()`, `subscribeConfig()`, token injection, `_resetRegistryForTesting()` reset |
| `src/__tests__/components/fv-sort-action.test.ts` | Modify | Tests for icon rendering via `unsafeHTML` |
| `src/__tests__/components/fv-export-action.test.ts` | Modify | Tests for icon rendering, fallback to default |
| `src/__tests__/components/fv-switcher.test.ts` | Modify | Tests for icon config override |
| `src/__tests__/components/fv-header-menu.test.ts` | Modify | Tests for `--fv-danger` token application |
| `src/__tests__/components/fv-filter-modal.test.ts` | Modify | Tests for `icons.close` rendering |

## Interfaces / Contracts

```ts
// src/types.ts additions

export type DarkMode = 'light' | 'dark' | 'auto';

export interface FlexiViewIcons {
  sortAsc?:     string;
  sortDesc?:    string;
  filter?:      string;
  clearFilter?: string;
  close?:       string;
  export?:      string;
  gridView?:    string;
  listView?:    string;
  cardsView?:   string;
}

export interface FlexiViewTheme {
  bg?:         string;
  headerBg?:   string;
  headerText?: string;
  text?:       string;
  textMuted?:  string;
  border?:     string;
  rowHover?:   string;
  accent?:     string;
  primary?:    string;
  danger?:     string;
  radius?:     string;
  fontSize?:   string;
}

export interface FlexiViewConfig {
  icons?:    FlexiViewIcons;
  theme?:    Partial<FlexiViewTheme>;
  darkMode?: DarkMode;
}
```

```ts
// src/registry.ts additions (public surface)

export function configure(config: FlexiViewConfig): void;
export function subscribeConfig(cb: () => void): () => void;  // returns unsubscribe fn
export function getFlexiConfig(): Required<{ icons: Required<FlexiViewIcons>; theme: Required<FlexiViewTheme>; darkMode: DarkMode }>;
```

```ts
// src/index.ts addition

export const FlexiView = {
  configure,       // from registry
  configureGrid,   // unchanged — backward compat
  getGridConfig,   // unchanged
  version: '1.0.0',
} as const;
```

### Token Map

| Named token | CSS var | Light default | Dark default |
|-------------|---------|---------------|--------------|
| `bg` | `--fv-bg` | `#ffffff` | `#1e1e2e` |
| `headerBg` | `--fv-header-bg` | `#fafafa` | `#181825` |
| `headerText` | `--fv-header-text` | `#666666` | `#a6adc8` |
| `text` | `--fv-text` | `#333333` | `#cdd6f4` |
| `textMuted` | `--fv-text-muted` | `#666666` | `#a6adc8` |
| `border` | `--fv-border` | `#e0e0e0` | `#333333` |
| `rowHover` | `--fv-row-hover` | `#f5f5f5` | `#2a2a3e` |
| `accent` | `--fv-accent` | `#111111` | `#cdd6f4` |
| `primary` | `--fv-primary` | `#1976d2` | `#89b4fa` |
| `danger` | `--fv-danger` | `#d32f2f` | `#f38ba8` |
| `radius` | `--fv-radius` | `6px` | `6px` |
| `fontSize` | `--fv-font-size` | `13px` | `13px` |

Note: `--fv-danger-bg` (used in `.clear-btn:hover`) is derived as `color-mix(in srgb, var(--fv-danger) 10%, transparent)` in CSS — no extra token needed.

### Default Icons (built-in SVG strings)

Nine keys in `DEFAULT_ICONS` constant in `registry.ts`. All use `currentColor` stroke so they pick up the parent text color without extra CSS. Exact SVG strings sourced from the existing `fv-switcher.ts` `ICONS` object for `gridView`, `listView`, `cardsView`; minimal inline SVGs for the remaining six.

### `buildStylesheet(config)` internal shape

```
:root {
  --fv-bg: {theme.bg};
  ...all 12 tokens...
}
/* only when darkMode === 'auto' */
@media (prefers-color-scheme: dark) {
  :root { --fv-bg: {darkBg}; ... }
}
/* only when darkMode === 'dark' — appended directly to :root block instead of media */
```

## Sequence Diagram: `configure()` called after mount

```
User JS                registry.ts           CSSStyleSheet         FvSortAction
   │                       │                       │                     │
   │── configure({...}) ──►│                       │                     │
   │                       │── buildStylesheet() ──►                     │
   │                       │◄── css string ─────────                     │
   │                       │── sheet.replaceSync(css) ──►│               │
   │                       │── notifySubscribers() ─────────────────────►│
   │                       │                                             │── requestUpdate()
   │                       │                                             │── render() uses unsafeHTML
```

## Testing Strategy

| Layer | What to Test | Approach |
|-------|-------------|----------|
| Unit — registry | `configure()` merges, notifies, injects sheet; `subscribeConfig()` returns working unsubscribe; `_resetRegistryForTesting()` clears all state | Vitest, stub `document.adoptedStyleSheets` as writable array |
| Unit — registry | `buildStylesheet()` produces correct CSS for `light`, `dark`, `auto` modes | Pure string assertions, no DOM |
| Unit — components | `fv-sort-action` renders `unsafeHTML(icons.sortAsc)` after `configure()` | Lit test harness (`@open-wc/testing` or `testing-library`) |
| Unit — components | `fv-switcher` uses config icons; falls back to defaults when not set | Same |
| Unit — components | `fv-header-menu` `.clear-btn` uses `var(--fv-danger)` — no hardcoded hex | CSS assertion |
| Unit — registry | Subscriber called 0 times after `unsubscribe()` | `vi.fn()` call count |

Strict TDD: failing test first for each registry function, then implementation.

## Migration / Rollout

No migration required. All new fields on `GridConfig` / `FlexiViewConfig` are optional. `configureGrid()` remains unchanged. Consumers who call nothing get the built-in light defaults silently applied via the stylesheet on first `configure()` call, or no sheet at all if they never call `configure()` (existing CSS vars in component `static styles` already supply fallback values).

## Open Questions

- [ ] Should `version` in `FlexiView` object be injected by Vite (`__APP_VERSION__`) or hardcoded? Injecting from `package.json` via `vite.config.ts` define is cleaner but adds a config step — decision can be deferred to tasks phase.
- [ ] `fv-filter-action` has no icon (it renders checkboxes, not a trigger button). Confirm no icon key is needed for it — only color token cleanup (`--fv-text-muted` for `.empty` text, `--fv-accent` for checkbox `accent-color`).
