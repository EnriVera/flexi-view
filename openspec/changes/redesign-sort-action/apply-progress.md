# Apply Progress: redesign-sort-action

**Status**: complete (post-verify fixes applied)
**Date**: 2026-05-07
**Tests**: 178 passed, 0 failed

---

## Phase 1: i18n — Foundation

- [x] 1.1 Add `sort.clear: 'Clear sort'` to `src/i18n/en.ts`
- [x] 1.2 Add `sort.clear: 'Quitar orden'` to `src/i18n/es.ts`
- [x] 1.3 TypeScript compilation verified — `Translations` type enforces `sort.clear` in `es.ts`

## Phase 2: Component Implementation

- [x] 2.1 Replace single-button template with two-button chip: `div.chip` → `button.main` + conditional `button.clear`
- [x] 2.2 Add `part="chip|main|clear"` to wrapper and both buttons
- [x] 2.3 Set `aria-pressed=${String(this.active)}` and `title=${dirLabel}` on `button.main`
- [x] 2.4 Set `aria-label=${clearLabel}` and `title=${clearLabel}` on `button.clear` with `?? 'Clear sort'` fallback
- [x] 2.5 Rename `_onClick` to `_onActivateOrCycle` with activate/cycle logic
- [x] 2.6 Add `_onClear` handler: optimistic `active=false`, emit `null`, focus main after `updateComplete`
- [x] 2.7 Verify `_emit` unchanged — keeps `bubbles/composed` on host, non-bubbling on `_target`
- [x] 2.8 Replace CSS block with chip CSS (`:host`, `.chip`, `button` base, `button.main`, `.label`, `[aria-pressed='true']`, hover states, `button.clear`, `button:focus-visible`)

## Phase 3: Test Rework and New Tests

- [x] 3.1 Rename all `_onClick()` → `_onActivateOrCycle()` in existing tests
- [x] 3.2 Rewrite "dispatches sort-change with asc direction" test
- [x] 3.3 Rewrite "dispatches sort-change with desc direction" test
- [x] 3.4 Add test — cycle asc → desc
- [x] 3.5 Add test — cycle desc → asc (two calls from desc, assert first=asc, second=desc)
- [x] 3.6 Add test — clear emits null direction and sets active=false
- [x] 3.7 Add test — clear forwards null event to target in external mode
- [x] 3.8 Add test — first activation honors direction property (desc stays desc)
- [x] 3.9 Add test — default direction on first activation is asc
- [x] 3.10 Add test — clear button absent when active=false
- [x] 3.11 Add test — i18n fallback (defensive `?? 'Clear sort'` expression validated)

## Phase 4: Post-Verify Warning Fixes

- [x] 4.1 (W-1) Replace always-nullish TS2871 expression with a proper partial-translation object test
- [x] 4.2 (W-2) Add end-to-end i18n test: import `t` statically, call `configure({ language: 'en' })`, assert `t().sort.clear === 'Clear sort'`
- [x] 4.3 (W-3) Update spec.md `sort.clear` Spanish value from `'Limpiar orden'` to `'Quitar orden'`; update Scenario 10 aria-label; add ADR-4 note
- [x] 4.4 (W-4) Add gap comment in clear test noting `updateComplete.then(() => focus())` requires integration test

---

## Notes

- `updateComplete` is a getter-only property on `LitElement`; tests that call `_onClear` assert synchronous state changes only (emit + active flag). Focus-move via `updateComplete.then` is async and not asserted in unit tests.
- Task 3.5 wording ("second event carries 'asc'") conflicts with the spec. Starting from `direction='desc'`: first call emits `'asc'` (desc→asc), second call emits `'desc'` (asc→desc). The test asserts what the spec dictates (REQ-2.3/2.4), not the task wording.

## Files Changed

- `src/i18n/en.ts` — added `sort.clear: 'Clear sort'`
- `src/i18n/es.ts` — added `sort.clear: 'Quitar orden'`
- `src/components/fv-sort-action.ts` — full rewrite: chip template, new handlers, new CSS
- `src/__tests__/components/fv-sort-action.test.ts` — updated + 9 new tests; W-1/W-2/W-4 fixes applied
- `openspec/changes/redesign-sort-action/spec.md` — W-3: corrected `sort.clear` Spanish value to `'Quitar orden'`
