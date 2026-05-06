# Tasks: Global Config (Icons + Theme + Dark Mode)

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | 550–700 (10 files modified + 6 test files) |
| 400-line budget risk | High |
| Chained PRs recommended | Yes |
| Suggested split | PR 1: Foundation (types + registry) → PR 2: Components → PR 3: Tests |
| Delivery strategy | ask-on-risk |
| Chain strategy | pending |

Decision needed before apply: Yes
Chained PRs recommended: Yes
Chain strategy: pending
400-line budget risk: High

### Suggested Work Units

| Unit | Goal | Likely PR | Notes |
|------|------|-----------|-------|
| 1 | Types + registry + CSS injection + CDN surface | PR 1 | No component changes; fully testable in isolation |
| 2 | All component subscriptions + hardcode removals | PR 2 | Depends on PR 1 (subscribeConfig, getFlexiConfig available) |
| 3 | All unit tests (registry + components) | PR 3 | Can ship tests after PR 2 merges or as part of PR 2 |

---

## Phase 1: Foundation — Types + Registry

- [x] 1.1 Add `DarkMode`, `FlexiViewIcons`, `FlexiViewTheme`, `FlexiViewConfig` types — `src/types.ts`
- [x] 1.2 Add `DEFAULT_ICONS` constant with 9 built-in SVG strings; extract `gridView`/`listView`/`cardsView` SVGs from existing `fv-switcher.ts` — `src/registry.ts`
- [x] 1.3 Add `LIGHT_TOKENS` and `DARK_TOKENS` maps for all 12 CSS vars — `src/registry.ts`
- [x] 1.4 Add `_flexiConfig` internal state (initialized to defaults) and `subscribers: Set<() => void>` — `src/registry.ts`
- [x] 1.5 Implement `buildStylesheet(config)`: emits `:root { --fv-* }` block; appends `@media (prefers-color-scheme: dark)` when `darkMode === 'auto'`; uses dark vars directly when `darkMode === 'dark'` — `src/registry.ts`
- [x] 1.6 Implement `configure(config: FlexiViewConfig)`: deep-merges into `_flexiConfig`, calls `buildStylesheet()`, assigns `document.adoptedStyleSheets` (with SSR guard), calls `notifySubscribers()` — `src/registry.ts`
- [x] 1.7 Implement `subscribeConfig(cb)`: adds cb to `subscribers`, returns unsubscribe fn — `src/registry.ts`
- [x] 1.8 Implement `getFlexiConfig()`: returns resolved config with defaults applied — `src/registry.ts`
- [x] 1.9 Extend `_resetRegistryForTesting()`: also resets `_flexiConfig`, clears `subscribers`, calls `sheet.replaceSync('')` — `src/registry.ts`

## Phase 2: CDN Surface

- [x] 2.1 Export `FlexiView = { configure, configureGrid, getGridConfig, version: '1.0.0' } as const` — `src/index.ts`
- [x] 2.2 Verify `window.FlexiView` is accessible in UMD build (check `vite.config.ts` for UMD entry; add `globalThis.FlexiView = FlexiView` if missing) — `src/index.ts` / `vite.config.ts`

## Phase 3: Component Migration

- [x] 3.1 `fv-sort-action`: import `unsafeHTML`, import `subscribeConfig`/`getFlexiConfig`; add `_unsubscribe` field; subscribe in `connectedCallback`, unsubscribe in `disconnectedCallback`; replace text sort labels with `unsafeHTML(icons.sortAsc/sortDesc)` — `src/components/fv-sort-action.ts`
- [x] 3.2 `fv-filter-action`: subscribe; replace hardcoded `#999` with `var(--fv-text-muted)`; no icon key needed — `src/components/fv-filter-action.ts`
- [x] 3.3 `fv-export-action`: subscribe; replace text label with `unsafeHTML(icons.export)` — `src/components/fv-export-action.ts`
- [x] 3.4 `fv-header-menu`: subscribe; replace `#d32f2f` with `var(--fv-danger)`, `#ffebee` with `var(--fv-danger-bg)` (`color-mix` derived), `#333` with `var(--fv-text)`; add `unsafeHTML(icons.clearFilter)` to clear button — `src/components/fv-header-menu.ts`
- [x] 3.5 `fv-filter-modal`: subscribe; replace `color: #666` on `.close-btn` with `var(--fv-text-muted)`; add `unsafeHTML(icons.close)` to close button — `src/components/fv-filter-modal.ts`
- [x] 3.6 `fv-switcher`: subscribe; remove local `ICONS` object; replace 3 SVG usages with `unsafeHTML(getFlexiConfig().icons.gridView/listView/cardsView)` — `src/components/fv-switcher.ts`

## Phase 4: Tests

- [x] 4.1 `registry.test.ts` — add `vi.stubGlobal('document', ...)` for `adoptedStyleSheets`; test `configure()` deep-merges (2nd call keeps prior fields) — `src/__tests__/unit/registry.test.ts`
- [x] 4.2 `registry.test.ts` — test `buildStylesheet()`: light mode emits correct `:root` block; dark mode does not emit `@media`; auto mode emits `@media (prefers-color-scheme: dark)` — `src/__tests__/unit/registry.test.ts`
- [x] 4.3 `registry.test.ts` — test `subscribeConfig()`: callback fires on `configure()`; does NOT fire after returned unsubscribe fn is called — `src/__tests__/unit/registry.test.ts`
- [x] 4.4 `registry.test.ts` — test SSR guard: when `document.adoptedStyleSheets` is `undefined`, `configure()` throws no error — `src/__tests__/unit/registry.test.ts`
- [x] 4.5 `registry.test.ts` — test `_resetRegistryForTesting()` clears `_flexiConfig`, `subscribers`, and the managed sheet — `src/__tests__/unit/registry.test.ts`
- [x] 4.6 `fv-sort-action.test.ts` — test default SVG renders without `configure()`; test subscribe/unsubscribe via config — `src/__tests__/components/fv-sort-action.test.ts`
- [x] 4.7 `fv-export-action.test.ts` — test default icon renders; test subscribe/unsubscribe via config — `src/__tests__/components/fv-export-action.test.ts`
- [x] 4.8 `fv-switcher.test.ts` — test each of the 3 view icons replaced by config; test fallback to default when not set — `src/__tests__/components/fv-switcher.test.ts`
- [x] 4.9 `fv-header-menu.test.ts` — test `.clear-btn` CSS uses `var(--fv-danger)` not a hardcoded hex; test `clearFilter` icon renders via `unsafeHTML` — `src/__tests__/components/fv-header-menu.test.ts`
- [x] 4.10 `fv-filter-modal.test.ts` — test `.close-btn` uses `var(--fv-text-muted)`; test `icons.close` renders via `unsafeHTML` — `src/__tests__/components/fv-filter-modal.test.ts`
- [x] 4.11 `fv-filter-action.test.ts` — test no hardcoded color; `--fv-text-muted` applied — `src/__tests__/components/fv-filter-action.test.ts`
