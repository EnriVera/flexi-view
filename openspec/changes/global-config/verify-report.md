# Verify Report: global-config

**Change**: global-config  
**Date**: 2026-05-05  
**Mode**: Standard  
**Verdict**: PASS WITH WARNINGS

---

## Completeness

| Metric | Value |
|--------|-------|
| Tasks total | 22 |
| Tasks complete | 22 |
| Tasks incomplete | 0 |

All 22 tasks marked complete in apply-progress.

---

## Build and Tests

- **Build**: PASS (vite build — ES + UMD bundles, 430ms)
- **Tests**: 123 passed / 0 failed (16 test files) — exit code 0
- **TypeScript tsc --noEmit**: FAIL — 2 type errors in scope of this change (see W2)
- **Coverage**: Not available — @vitest/coverage-v8 not installed

---

## Spec Compliance Matrix

| Requirement | Scenario | Test | Result |
|---|---|---|---|
| Configure API signature | First call partial options | registry.test.ts > deep-merges: second call keeps fields | COMPLIANT |
| Configure API signature | Second call merges with first | registry.test.ts > deep-merges icons: second call does not wipe | COMPLIANT |
| Configure API signature | No configure call at all | registry.test.ts > returns default icons and light tokens | COMPLIANT |
| Icon rendering | Consumer replaces single icon | fv-switcher.test.ts > configure() with view icon override | COMPLIANT |
| Icon rendering | Unknown icon key ignored | (none) | UNTESTED |
| Icon rendering | All 9 built-in icons render | fv-switcher + fv-header-menu + fv-filter-modal + fv-export-action | PARTIAL |
| Theme injection | Consumer overrides single token | registry.test.ts > consumer theme overrides a token in light mode | COMPLIANT |
| Theme injection | SSR guard | registry.test.ts > SSR guard: does not throw | COMPLIANT |
| Dark mode | Forced dark | registry.test.ts > dark mode: emits :root with dark tokens | COMPLIANT |
| Dark mode | Auto mode media query | registry.test.ts > auto mode: emits @media | PARTIAL |
| Dark mode | Runtime change | registry.test.ts > deep-merges | PARTIAL |
| Reactivity | configure() before mount | fv-export-action.test.ts > uses default export icon | PARTIAL |
| Reactivity | configure() after mount | fv-sort-action.test.ts > subscribeConfig fires requestUpdate | COMPLIANT |
| Reactivity | Unsubscribe on disconnect | fv-sort-action.test.ts > unsubscribe stops it | COMPLIANT |
| CDN compatibility | window.FlexiView.configure() | (structural only) | UNTESTED |

**Compliance summary**: 9/15 fully COMPLIANT, 4 PARTIAL, 2 UNTESTED

---

## Correctness (Static)

| Check | Status | Notes |
|---|---|---|
| FlexiView.configure() exported from index | PASS | src/index.ts:20 |
| subscribeConfig() + getFlexiConfig() in registry | PASS | src/registry.ts |
| Types: DarkMode, FlexiViewIcons, FlexiViewTheme, FlexiViewConfig | PASS | src/types.ts:43-76 |
| DEFAULT_ICONS — 9 built-in SVG strings | PASS | src/registry.ts:42-52 |
| LIGHT_TOKENS + DARK_TOKENS — 12 vars each | PASS | src/registry.ts:54-82 |
| adoptedStyleSheets injection + SSR guard | PASS | src/registry.ts:144 |
| Deep-merge on multiple configure() calls | PASS | src/registry.ts:137-141 |
| @media block for auto dark mode | PASS | src/registry.ts:121-124 |
| unsafeHTML icons — fv-sort-action | PASS | fv-sort-action.ts:57 |
| unsafeHTML icons — fv-export-action | PASS | fv-export-action.ts:51 |
| unsafeHTML icons — fv-header-menu | PASS | fv-header-menu.ts:189 |
| unsafeHTML icons — fv-filter-modal | PASS | fv-filter-modal.ts:179 |
| unsafeHTML icons — fv-switcher | PASS | getFlexiConfig().icons via render() |
| connectedCallback subscribes — all 6 components | PASS | Confirmed in source |
| disconnectedCallback unsubscribes — all 6 components | PASS | Confirmed in source |
| CSS vars — fv-sort-action | PASS | var(--fv-text), var(--fv-border), var(--fv-accent), etc. |
| CSS vars — fv-filter-action | PASS | var(--fv-text-muted, #666) |
| CSS vars — fv-export-action | PASS | var(--fv-border), var(--fv-text), var(--fv-row-hover) |
| CSS vars — fv-header-menu | PASS | var(--fv-danger), var(--fv-text), var(--fv-bg), etc. |
| CSS vars — fv-filter-modal | PASS | var(--fv-text-muted), var(--fv-primary), var(--fv-bg), etc. |
| CSS vars — fv-switcher | WARN | Bare hardcodes: color:#666 color:#333 color:#111 background:#f5f5f5/#eee/#fff |
| configureGrid() backward compat | PASS | Exported from index.ts; called inside configure() |
| FlexiView CDN surface with version 1.0.0 | PASS | src/index.ts:20-25 |
| UMD build | PASS | vite build produces flexi-view.umd.js |

---

## Issues Found

### CRITICAL
None.

### WARNING

**W1 — fv-switcher.ts: bare hardcoded colors in static styles**  
Lines: color:#666 (button), color:#333 (button:hover), color:#111 (button.active), background:#f5f5f5 (button), background:#eee (button:hover), background:#fff (button.active).  
These are raw values not wrapped in CSS custom properties. The spec requires all hardcoded colors replaced by CSS vars in the 6 affected components. Task 3.6 did not list it explicitly, but the spec requirement is clear.  
Impact: fv-switcher buttons do not respond to dark mode or consumer theme tokens.  
Fix: replace with var(--fv-text-muted), var(--fv-text), var(--fv-accent), var(--fv-row-hover), var(--fv-bg).

**W2 — fv-header-menu.ts: anchor property type mismatch**  
src/components/fv-header-menu.ts:69 — anchor typed as HTMLElement | null but HeaderMenuElement interface requires HTMLElement (non-nullable).  
tsc --noEmit reports TS2416. Vite build suppresses type checking and passes.  
Fix: either update interface to HTMLElement | null or change property default to satisfy non-null.

### SUGGESTION

**S1** — Install @vitest/coverage-v8 to validate the 80% coverage threshold declared in openspec/config.yaml.

**S2** — Add a test for unknown icon key scenario (spec: MUST ignore without error — currently untested).

**S3** — Add e2e test for window.FlexiView CDN surface behavioral validation.

---

## Verdict

**PASS WITH WARNINGS**

0 CRITICAL | 2 WARNING | 3 SUGGESTION

123/123 tests pass. Vite build succeeds. All 22 tasks complete.  
Resolve W1 (fv-switcher CSS vars) and W2 (anchor type) before archive.
