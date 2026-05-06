# Proposal: Global Config (Icons + Theme + Dark Mode)

## Intent

flexi-view components display text-only labels ("↑ Asc", "Filtrar...", "Export CSV") and hardcode color values (`#333`, `#1976d2`, `#d32f2f`) outside the CSS custom property system. Consumers cannot substitute icon libraries (Tabler Icons, Iconify, Font Awesome) or apply a design system palette without forking. Dark mode is entirely absent. This blocks adoption in any design-conscious or accessibility-minded product.

## Scope

### In Scope
- `FlexiView.configure({ icons, theme, darkMode })` — unified public API (bundler + CDN)
- `configure()` as user-facing alias for the existing `configureGrid()` — no breaking changes
- Reactive subscriber set in `registry.ts` — late `configure()` calls re-render mounted components
- CSS theme injection via `document.adoptedStyleSheets` — `:root { --fv-* }` inherits into Shadow DOM
- Dark mode: `'auto'` (media query), `'dark'` (forced), `'light'` (forced) — built-in light + dark defaults
- Tokenize all hardcoded colors across all components → CSS custom properties
- `unsafeHTML` icon rendering in 5 components (`fv-switcher`, `fv-sort-action`, `fv-filter-action`, `fv-export-action`, `fv-header-menu`)
- CDN-compatible `window.FlexiView` object with `.configure()` method
- Built-in SVG defaults for all 9 icon keys so the library works out-of-the-box

### Out of Scope
- Bundled UMD variant that includes Lit (Lit remains external — pre-existing constraint)
- Per-instance theme overrides (theme is global, not per-component)
- Runtime theme switching animation or transitions
- Icon slot API using `<slot>` — string-based API is sufficient and CDN-friendly
- CSS-in-JS or design token file formats (JSON/CSS output)
- Theming via `::part()` extensions (consumer can still use `::part()` manually)

## Capabilities

### New Capabilities
- `global-config`: Unified `FlexiView.configure()` API — icon substitution, theme token overrides, dark mode strategy, reactive updates after mount

### Modified Capabilities
- None — `configureGrid()` remains unchanged; `GridConfig` receives additive optional fields only

## Approach

Extend `registry.ts` as the single source of truth:

1. Add `icons?: Record<string, string>` and `theme?: Partial<ThemeTokens>` and `darkMode?: 'light' | 'dark' | 'auto'` to `GridConfig`
2. Add a `Set<() => void>` subscriber list; `configure()` calls all subscribers after merging config
3. On each `configure()` call: compute and adopt a `CSSStyleSheet` with `:root { --fv-*: value }` built from the merged token map. For `auto` dark mode, add a `@media (prefers-color-scheme: dark)` rule; for `dark`, toggle a class on `<html>` with `.fv-dark` overrides
4. Components that render icons: subscribe in `connectedCallback`, unsubscribe in `disconnectedCallback`, render with `unsafeHTML(config.icons?.key ?? defaultSvg)`
5. Export `const FlexiView = { configure, configureGrid, getGridConfig }` from `src/index.ts` — Vite UMD builds this as `window.FlexiView` automatically (name already set)

**Example — Tabler Icons via CDN:**
```js
window.FlexiView.configure({
  icons: {
    sortAsc:     '<i class="ti ti-sort-ascending"></i>',
    sortDesc:    '<i class="ti ti-sort-descending"></i>',
    filter:      '<i class="ti ti-filter"></i>',
    clearFilter: '<i class="ti ti-filter-off"></i>',
    close:       '<i class="ti ti-x"></i>',
    export:      '<i class="ti ti-file-export"></i>',
    gridView:    '<i class="ti ti-layout-grid"></i>',
    listView:    '<i class="ti ti-list"></i>',
    cardsView:   '<i class="ti ti-layout-cards"></i>',
  },
  theme: {
    primary:  '#6366f1',
    headerBg: '#1e293b',
    bg:       '#0f172a',
  },
  darkMode: 'dark',
});
```

**Example — bundler with Iconify:**
```js
import { FlexiView } from 'flexi-view';
FlexiView.configure({
  icons: { filter: '<iconify-icon icon="tabler:filter"/>' },
  darkMode: 'auto',
});
```

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `src/registry.ts` | Modified | Add `icons`/`theme`/`darkMode` to `GridConfig`; add `configure()`, subscriber set, `adoptedStyleSheets` injection |
| `src/types.ts` | Modified | Add `ThemeTokens` interface, `IconsConfig` type, `DarkMode` union |
| `src/index.ts` | Modified | Export `FlexiView` default object with `.configure()` |
| `src/components/fv-switcher.ts` | Modified | Replace hardcoded `ICONS` with registry lookup + subscription |
| `src/components/fv-sort-action.ts` | Modified | Replace unicode text with icon HTML from config |
| `src/components/fv-filter-action.ts` | Modified | Replace "Filtrar..." text with icon from config; wire color tokens |
| `src/components/fv-export-action.ts` | Modified | Replace "Export CSV/XLSX" label with icon from config |
| `src/components/fv-header-menu.ts` | Modified | Replace text labels with icons; replace hardcoded `#d32f2f` with `--fv-danger` |
| `src/components/fv-filter-modal.ts` | Modified | Replace hardcoded `#1976d2` with `--fv-primary`; fix backdrop color token |
| `src/components/fv-grid.ts` | Modified | Replace any hardcoded colors with CSS vars |
| `src/__tests__/` | Modified | Unit tests for `configure()`, subscriber cleanup, token injection, icon rendering |

## Token Map (light / dark defaults)

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

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| `unsafeHTML` XSS if DEV passes server-sourced HTML | Low | Document clearly: only DEV-controlled strings. Never pipe user data. |
| Hardcoded `:host` styles override inherited vars | Med | Audit all `static styles` — replace every hardcoded color with `var(--fv-*)` |
| Subscriber leak if component is destroyed without cleanup | Low | `disconnectedCallback` always calls `unsubscribe()`; covered by tests |
| `configure()` called before `document` is ready (SSR) | Low | Guard `adoptedStyleSheets` call with `typeof document !== 'undefined'` |
| `--fv-accent` vs `--fv-primary` token ambiguity | Med | `accent` = interactive highlights/text; `primary` = buttons/brand. Document the distinction clearly. |

## Rollback Plan

All new fields on `GridConfig` are optional. `configureGrid()` is unchanged. If `configure()` must be reverted: remove the alias from `registry.ts` and `src/index.ts`. Hardcoded colors can be restored from git history per component. No schema migration, no storage changes. `adoptedStyleSheets` is additive — removing it restores browser defaults.

## Dependencies

- `lit/directives/unsafe-html.js` — already a Lit sub-package, no new npm dependency
- `document.adoptedStyleSheets` — supported in all Chromium/Firefox/Safari modern (no polyfill needed for Lit v3 target browsers)

## Success Criteria

- [ ] `FlexiView.configure({ icons, theme, darkMode })` accepted by both bundler import and CDN `window.FlexiView`
- [ ] All 9 icon keys render custom HTML strings in the correct components
- [ ] All 12 token map entries wired as CSS custom properties; zero hardcoded colors remain in component `static styles`
- [ ] `darkMode: 'auto'` switches palette on `prefers-color-scheme` change without page reload
- [ ] Calling `configure()` after components are mounted triggers a re-render (subscriber mechanism works)
- [ ] Existing `configureGrid()` call sites continue to work unchanged
- [ ] Unit test coverage >= 80% for `registry.ts` config/subscribe/unsubscribe paths
- [ ] Library works out-of-the-box with no `configure()` call (built-in SVG defaults for all icons)
