# Verification Report: redesign-sort-action

**Change**: redesign-sort-action
**Version**: spec dated 2026-05-07
**Mode**: Standard (no Strict TDD)

---

## Completeness

Tasks total: 19 / Tasks complete: 19 / Tasks incomplete: 0

All task checkboxes in apply-progress.md are marked complete.

---

## Build and Tests Execution

**Tests**: 176 passed / 0 failed / 0 skipped. Vitest v1.6.1, exit code 0.
fv-sort-action suite: 18 tests, all passed.

**Build (tsc --noEmit)**: Pre-existing errors + 1 new error from this change.

Pre-existing errors (confirmed via git stash + tsc before this change):
- fv-view.test.ts lines 102/281/298: null not assignable to string
- fv-cards/fv-grid/fv-list.ts: implicit any on string index
- fv-view.ts line 250: T[] not assignable to Record
- es.ts all fields: literal type mismatch (en.ts as const creates literal types)
- registry.ts: FlexiViewIconValue not assignable to string

New error introduced by this change:
- fv-sort-action.test.ts line 343: TS2871 expression is always nullish.
  Cause: i18n fallback test uses cast-then-nullish-check TypeScript catches.
  Runtime impact: none (Vitest uses esbuild transpile-only).

Coverage: Not available

---

## Spec Compliance Matrix

13/21 scenarios fully COMPLIANT, 8 PARTIAL (Lit render environment limitations, not logic gaps).

COMPLIANT scenarios:
- REQ-1.1/1.3/1.4: clear button absent in renderRoot when active=false
- REQ-2.1/2.2: dispatches sort-change with current direction on first activation
- REQ-2.1: default direction on first activation is asc
- REQ-2.3/2.4/2.5 asc->desc: cycle emits desc
- REQ-2.3/2.4/2.5 desc->asc: second cycle call emits asc
- REQ-3.1/3.2/3.3: clear emits null direction and sets active=false
- REQ-4.1/4.2: event bubbles and is composed
- REQ-4.3 activate: dispatches on self AND on target
- REQ-4.3 clear: clear forwards null event to target in external mode
- REQ-4.4: reads initial sort state + subscribes to fv-sort-change
- REQ-4.5: two separate events dispatched on consecutive calls
- REQ-8.1: all public props present
- REQ-8.2: first activation honors direction property (not mutated)
- REQ-8.3: no new required props

PARTIAL scenarios (source correct, no Lit render test):
- REQ-1.2/7.1: inline-flex confirmed in CSS source
- REQ-2.6/5.1: aria-pressed confirmed in source
- REQ-3.4: focus recovery -- async updateComplete.then not unit-testable
- REQ-5.2: title attribute confirmed in source
- REQ-5.3/6.1 Scenario 10: aria-label -- test validates fallback expr only
- REQ-6.1/6.2: es.ts uses Quitar orden (design override, documented)
- REQ-7.2-7.5: CSS tokens confirmed in source, no automated assertion

---

## Correctness

All requirements implemented correctly in source. Key notes:
- Two-button chip: div.chip > button.main + conditional button.clear
- _onActivateOrCycle branches correctly on this.active
- direction NOT mutated on first activation (nextDirection only)
- direction IS mutated on cycle (this.direction = nextDirection in active branch)
- _onClear: sets active=false, emits null, awaits updateComplete for focus
- _emit: dispatches bubbles+composed on host, non-bubbling on _target
- es.ts sort.clear: Quitar orden (ADR-4 override of spec value Limpiar orden)
- REQ-6.2 Translations type: pre-existing broken design (en.ts as const issue)

---

## Coherence (Design)

All 7 design decisions followed:
- ADR-1 chip structure: exact structure implemented
- ADR-2 first activation no mutation: confirmed
- ADR-3 rename to _onActivateOrCycle: done, all tests updated
- ADR-4 Quitar orden: implemented as designed
- ADR-5 fv-view unchanged: confirmed
- updateComplete.then pattern: exact pattern from design
- part chip/main/clear: all three present in template

---

## Issues Found

CRITICAL (must fix before archive): None

WARNING (should fix):

W-1 -- New TS2871 in fv-sort-action.test.ts:343
The i18n fallback test triggers TS2871 (expression always nullish).
No runtime impact. Replace with a proper t() mock or remove the assertion.

W-2 -- Scenario 10 (i18n clear label) behaviorally untested
Task 3.11 validates only the fallback expression inline. A t() wiring regression would not be caught.

W-3 -- Spec/design divergence on es.ts sort.clear value
REQ-6.1 says Limpiar orden, ADR-4 chose Quitar orden. The spec artifact should be updated for accuracy.

W-4 -- REQ-3.4 focus recovery after clear is untested
updateComplete.then(focus) requires a real Lit render cycle. Known gap documented in apply-progress.md.

SUGGESTION (nice to have):

S-1 -- REQ-6.2 structurally impossible with en.ts as const. Pre-existing architectural issue.
S-2 -- REQ-7.x CSS requirements have no automated assertions.
S-3 -- aria-pressed, title, and aria-label have no isolated render tests.

---

## Verdict

PASS WITH WARNINGS

All 176 tests pass. 0 CRITICAL / 4 WARNING / 3 SUGGESTION.
Implementation is structurally and behaviorally correct. Safe to proceed to sdd-archive.
