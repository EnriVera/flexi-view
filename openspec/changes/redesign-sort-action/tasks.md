# Tasks: redesign-sort-action

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | 220–300 |
| 400-line budget risk | Low |
| Chained PRs recommended | No |
| Suggested split | Single PR |
| Delivery strategy | single-pr |
| Chain strategy | size-exception |

Decision needed before apply: No
Chained PRs recommended: No
Chain strategy: size-exception
400-line budget risk: Low

### Suggested Work Units

| Unit | Goal | Likely PR | Notes |
|------|------|-----------|-------|
| 1 | i18n + component rewrite + test update | PR 1 | All within ~270 lines; single-pr fits comfortably |

---

## Phase 1: i18n — Foundation (unblocks component and tests)

- [ ] 1.1 Add `sort.clear: 'Clear sort'` to `src/i18n/en.ts` inside the `sort` object (after `desc`). Satisfies REQ-6.1, REQ-6.2.
- [ ] 1.2 Add `sort.clear: 'Quitar orden'` to `src/i18n/es.ts` inside the `sort` object (after `desc`). Satisfies REQ-6.1, REQ-6.2.
- [ ] 1.3 Verify TypeScript compilation after both files are updated — `Translations` (inferred from `en.ts`) must enforce `sort.clear` in `es.ts` with no errors. Satisfies REQ-6.2.

## Phase 2: Component Implementation

- [ ] 2.1 In `src/components/fv-sort-action.ts`, replace the single-button template with the two-button chip structure: `div.chip` wrapper → `button.main` (always present) + `button.clear` (conditional on `this.active`). Satisfies REQ-1.1, REQ-1.3, REQ-1.4.
- [ ] 2.2 Add `part="chip|main|clear"` attributes to the wrapper and both buttons in the template. Satisfies REQ-7.2 (downstream theming hook).
- [ ] 2.3 Set `aria-pressed=${String(this.active)}` and `title=${dirLabel}` on `button.main`. Satisfies REQ-2.6, REQ-5.1, REQ-5.2.
- [ ] 2.4 Set `aria-label=${clearLabel}` and `title=${clearLabel}` on `button.clear`, reading from `t().sort.clear ?? 'Clear sort'`. Satisfies REQ-5.3, REQ-6.1.
- [ ] 2.5 Rename `_onClick` to `_onActivateOrCycle`. Implement logic: when `!this.active`, set `active = true` and emit current `direction`; when `this.active`, flip `direction`, keep `active = true`, and emit new direction. Satisfies REQ-2.1, REQ-2.2, REQ-2.3, REQ-2.4, REQ-2.5.
- [ ] 2.6 Add `_onClear` handler: set `active = false` optimistically, emit `{ field, direction: null }`, then await `updateComplete` and `focus()` `button.main`. Satisfies REQ-3.1, REQ-3.2, REQ-3.3, REQ-3.4.
- [ ] 2.7 Update `_emit` private method: keep existing `bubbles: true, composed: true` dispatch on host; keep `_target` forwarding with `bubbles: false, composed: false`. No structural change needed — confirm it still satisfies REQ-4.1, REQ-4.2, REQ-4.3.
- [ ] 2.8 Replace existing CSS block with the chip CSS from the design: `:host`, `.chip` (`inline-flex`, `align-items: stretch`, border, radius, `overflow: hidden`), `button` base reset, `button.main`, `.label`, `[aria-pressed='true']` states, hover states, `button.clear` (`border-left` separator), `button:focus-visible`. Satisfies REQ-1.2, REQ-7.1, REQ-7.2, REQ-7.3, REQ-7.4, REQ-7.5.

## Phase 3: Test Rework and New Tests

- [ ] 3.1 In `src/__tests__/components/fv-sort-action.test.ts`, rename all `_onClick()` call sites to `_onActivateOrCycle()`. Affects tests: "dispatches sort-change with asc direction", "dispatches sort-change with desc direction", "event bubbles and is composed", "dispatches sort-change on self AND on target". Satisfies design test-strategy requirement.
- [ ] 3.2 Rewrite "dispatches sort-change with asc direction" test: set `active = false, direction = 'asc'`, call `_onActivateOrCycle`, assert `direction: 'asc'` in event detail and `el.active === true`. Satisfies Scenario 1, REQ-2.1, REQ-2.2.
- [ ] 3.3 Rewrite "dispatches sort-change with desc direction" test: set `active = false, direction = 'desc'`, call `_onActivateOrCycle`, assert `direction: 'desc'` in event and `active === true`. Satisfies Scenario 2 (default direction), REQ-2.1.
- [ ] 3.4 Add new test — cycle asc → desc: set `active = true, direction = 'asc'`, call `_onActivateOrCycle`, assert event `direction: 'desc'`, `el.direction === 'desc'`, `el.active === true`. Satisfies Scenario 3, REQ-2.3, REQ-2.4, REQ-2.5.
- [ ] 3.5 Add new test — cycle desc → asc: set `active = true, direction = 'desc'`, call `_onActivateOrCycle` twice, assert second event carries `'asc'`. Satisfies Scenario 4, REQ-4.5.
- [ ] 3.6 Add new test — clear emits null: set `active = true`, call `_onClear`, assert event `{ field, direction: null }` and `el.active === false`. Satisfies Scenario 5, REQ-3.1, REQ-3.2.
- [ ] 3.7 Add new test — clear forwards to target in external mode: connect with `for=`, call `_onClear`, assert both `selfSpy` and `target.dispatchEvent` called with `direction: null`. Satisfies REQ-3.1, REQ-4.3.
- [ ] 3.8 Add new test — first activation honors `direction` property: set `active = false, direction = 'desc'`, call `_onActivateOrCycle`, assert event `direction: 'desc'` and `el.direction` still `'desc'` (not mutated). Satisfies REQ-2.1, ADR-2.
- [ ] 3.9 Add new test — default direction on first activation: new `FvSortAction()` with no direction set, call `_onActivateOrCycle`, assert event `direction: 'asc'`. Satisfies Scenario 2, REQ-8.3.
- [ ] 3.10 Add new test — clear button absent when `active = false`: after `_onClear` or on fresh instance, assert `renderRoot.querySelector('button.clear')` is `null`. Satisfies Scenario 9, REQ-1.4.
- [ ] 3.11 Add new test — i18n fallback: mock `t()` to return object without `sort.clear`, assert `button.clear` renders with `aria-label="Clear sort"`. Satisfies REQ-5.3, ADR-4.
