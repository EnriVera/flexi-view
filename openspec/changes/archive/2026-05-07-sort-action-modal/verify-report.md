# Verify Report: sort-action-modal

**Change**: sort-action-modal
**Mode**: Standard

---

## Completeness

| Metric | Value |
|--------|-------|
| Tasks total | 10 |
| Tasks complete | 10 |
| Tasks incomplete | 0 |

All 10 tasks marked [x] in apply-progress.

---

## Build and Tests

**Build (tsc --noEmit)**: WARNING - pre-existing type errors only. No new errors introduced by this change.

**Tests**: 222 passed / 0 failed / 0 skipped - exit code 0 (18 test files, 3.94s)

**Coverage**: Not available

---

## Spec Compliance Matrix

| Requirement | Scenario | Test | Result |
|---|---|---|---|
| §1 i18n sort.title | Sort in English | fv-sort-action.test.ts > i18n keys | COMPLIANT |
| §1 i18n sort.noField | added as sort.selectField per design ADR | fv-sort-action.test.ts > i18n keys | COMPLIANT |
| §1 i18n es.ts | same keys in Spanish | source verified | COMPLIANT |
| §2 fv-sort-button chip | dispatches sort-change | fv-sort-button.test.ts | COMPLIANT |
| §2 NOT exported | no fv-sort-button in barrel | src/index.ts confirmed | COMPLIANT |
| §2 active default | active=false | fv-sort-button.test.ts | COMPLIANT |
| §2 for attribute | connects to fv-view | fv-sort-button.test.ts > external mode | COMPLIANT |
| §2 direction cycle | asc-desc flip | fv-sort-button.test.ts | COMPLIANT |
| §2 clear button | dispatches direction null | fv-sort-button.test.ts | COMPLIANT |
| §3 fv-sort-modal separate file | file not present; modal inlined | none | PARTIAL |
| §4 Scenario 1 inactive | sort.title label, aria-pressed false | fv-sort-action.test.ts > Rendering inactive state | COMPLIANT |
| §4 Scenario 2 field+direction | modal opens, direction emitted | fv-sort-action.test.ts > Apply direction | COMPLIANT |
| §4 Scenario 3 toggle-to-clear | active direction click emits null | fv-sort-action.test.ts | COMPLIANT |
| §4 Scenario 4 clear button | emits field-empty direction-null | fv-sort-action.test.ts > Clear button | COMPLIANT |
| §4 Scenario 5 Escape | Escape closes modal | fv-sort-action.test.ts > Keyboard | COMPLIANT |
| §4 Scenario 6 backdrop | backdrop click closes | static analysis only, no direct test | PARTIAL |
| §4 Scenario 7 localStorage | hydrates from localStorage | fv-sort-action.test.ts > Persistence hydration | COMPLIANT |
| §4 Scenario 8 URL priority | URL beats localStorage | fv-sort-action.test.ts | COMPLIANT |
| §4 Scenario 9 write-back | storage+URL updated on sort | fv-sort-action.test.ts > Persistence write-back | COMPLIANT |
| §4 Scenario 10 inbound sync | fv-sort-change updates _activeSort | fv-sort-action.test.ts > Inbound sync | PARTIAL - no write-back on inbound |
| §4 Scenario 11 invalid JSON | console.warn + fallback [] | fv-sort-action.test.ts > registerOrder | COMPLIANT |
| §5 Scenario 12 header-menu | uses fv-sort-button | fv-header-menu.test.ts all pass | COMPLIANT |
| §9 Scenario 13 ArrowDown/Up | focus nav in field list | no test, not implemented | UNTESTED |
| §9 Scenario 14 no fv-view | warns + renders normally | fv-sort-action.test.ts > No target | COMPLIANT |
| §8 fv-sort-action exported | in barrel | src/index.ts line 40 | COMPLIANT |
| §8 internals NOT exported | fv-sort-button absent from barrel | confirmed | COMPLIANT |

**Compliance summary**: 21/26 scenarios compliant (3 PARTIAL, 1 UNTESTED)

---

## Correctness (Static)

| Requirement | Status | Notes |
|---|---|---|
| i18n keys | Implemented | en.ts and es.ts both have sort.title and sort.selectField |
| fv-sort-button chip | Implemented | Full chip with active, direction, for attr, clear, events |
| fv-sort-modal separate file | Partial | Modal inlined in fv-sort-action per design ADR |
| modal width min(420px,90vw) | Deviated | Implementation uses min(480px,90vw) |
| modal max-height min(400px,80vh) | Deviated | Implementation uses min(420px,80vh) |
| registerOrder JSON guard | Implemented | Warns on bad JSON, falls back to [] |
| warn message key name | Minor deviation | camelCase vs spec kebab-case |
| inbound sync write-back | Missing | _onSortChangeFromView does not call _writePersistence() |
| fv-header-menu import swap | Implemented | fv-sort-button.js imported, fv-sort-action removed |
| storage key contract | Implemented | {storageKey}-sort pattern correct |
| barrel exports | Compliant | fv-sort-action in index.ts; internals absent |

---

## Coherence (Design)

| Decision | Followed? | Notes |
|---|---|---|
| Modal inlined in fv-sort-action | Yes | Design ADR superseded spec separate file |
| _readSortFromUrl private inline | Yes | Design ADR-4 documented in apply-progress |
| registerOrder JSON guard in setter | Yes | Implemented |
| fv-header-menu uses fv-sort-button | Yes | Confirmed in template |
| _writePersistence guarded by _targetOwnsUrl | Yes | Guard present |

---

## Issues Found

### CRITICAL
None.

### WARNING

1. Inbound sync missing persistence write-back - _onSortChangeFromView does not call _writePersistence(). Spec §4 states that on receiving fv-sort-change from the target view the component should also write-back to persistence. If another component changes the view sort externally, localStorage and URL are not updated in fv-sort-action.

2. ArrowDown/ArrowUp keyboard navigation not implemented and untested - Scenario 13 specifies focus movement between field buttons via arrow keys. No keyboard handler for ArrowDown/ArrowUp exists in the component, and no test covers it.

3. Modal dimensions deviate from spec - Spec: width min(420px,90vw), max-height min(400px,80vh). Implementation: width min(480px,90vw), max-height min(420px,80vh).

4. Console warn message key name - Implementation logs Invalid registerOrder JSON (camelCase); spec says Invalid register-order JSON (kebab-case).

### SUGGESTION

1. Backdrop click close not directly tested - template binding confirmed by static analysis only.
2. Pre-existing TypeScript strict errors in es.ts - not introduced by this change but worth addressing before v1.

---

## Verdict

PASS WITH WARNINGS

All 222 tests pass (exit code 0). All 10 tasks complete. No critical issues block archive. Four warnings should be addressed post-archive or in a follow-up change, with the inbound-sync persistence gap and the missing ArrowDown/ArrowUp navigation being highest priority.
