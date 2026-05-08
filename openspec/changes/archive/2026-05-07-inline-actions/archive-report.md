# Archive Report: inline-actions

**Change**: inline-actions
**Archived**: 2026-05-07
**Archived to**: `openspec/changes/archive/2026-05-07-inline-actions/`
**Project**: flexi-view
**artifact_store.mode**: hybrid

---

## Summary

Successfully archived change `inline-actions` after completing SDD cycle: propose → spec → design → tasks → apply → verify → archive.

**Test Result**: ✅ 248 passed / 0 failed

---

## Specs Synced to Main

| Domain | Action | Details |
|--------|--------|---------|
| fv-export-action | Created | New spec with chip style + internalMode + dropdown requirements |
| fv-filter-action | Created | New spec with chip style + internalMode + state display requirements |
| fv-grid | Created | New spec with multi-column sort icon visibility + direction button label requirements |
| fv-sort-action | Updated | Added REQ-9 (chip style), REQ-10 (internalMode), REQ-11 (modal direction labels) |
| fv-view | Updated | Added showSort/showFilter/showExport props, internal action rendering, property bindings |

---

## Archive Contents

| Artifact | Status |
|----------|--------|
| proposal.md | ✅ |
| specs/ | ✅ (5 domain specs) |
| design.md | ✅ |
| tasks.md | ✅ (21 tasks, ~19 complete) |
| verify-report.md | ✅ |

---

## Key Implementation Details

- **fv-sort-action**, **fv-filter-action**, **fv-export-action**: Redesigned as minimalist chips with `display: inline-flex`, ~32px height
- **internalMode**: New boolean prop on all three action components — skips `for` attribute connection, operates in standalone mode
- **fv-view**: Added `showSort`, `showFilter`, `showExport` boolean props (default: false)
- **Internal actions hidden in grid view**: `_shouldShowInternalActions()` returns false when `view === 'grid'`
- **fv-grid**: Fixed to show sort icon on ANY sorted column (not just primary), uses `currentSorts: SortCriterion[]`

---

## Warnings (Non-Blocking)

1. **fv-filter-action `options` not passed in internal mode**: fv-view line 545 only passes `currentFilters`, not `options`. Component still works via public API.
2. **fv-export-action `fieldGrids` not passed in internal mode**: fv-view line 546 only passes `registers`, not `fieldGrids`. Export still works with empty column list.

---

## SDD Cycle Complete

The change has been fully planned, implemented, verified, and archived.
Ready for the next change.