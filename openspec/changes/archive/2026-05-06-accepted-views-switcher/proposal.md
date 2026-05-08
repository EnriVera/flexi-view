# Proposal: accepted-views-switcher

## Intent

Allow `fv-view` to control which view buttons are enabled/clickable in `fv-switcher` by passing an `acceptedViews` array. This prevents users from switching to views that have no columns configured (empty fieldGrids/fieldRows/fieldCards), avoiding UX confusion when a view renders with no content.

## Scope

### In Scope
- Add `acceptedViews` property to `fv-switcher.ts`
- Modify `_cycle()` to skip views not in `acceptedViews` when finding next view
- Render disabled visual state for views not in `acceptedViews`
- Emit `view-change` only for accepted views

### Out of Scope
- Changes to `fv-view` component (parent passes prop only)
- URL sync logic modifications
- Backwards compatibility with undefined `acceptedViews`

## Capabilities

### New Capabilities
- `accepted-views-control`: Allow fv-switcher to receive and enforce an allowed-views array

### Modified Capabilities
- None — this adds new behavior without changing existing spec requirements

## Approach

Add `acceptedViews` array property defaulting to all views (`['grid', 'list', 'cards']`). In `_cycle()`:
1. Filter `VIEWS` to only those in `acceptedViews`
2. Cycle through filtered list instead of full `VIEWS` array
3. In render, apply `disabled` attribute/class to view buttons not in `acceptedViews`

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `src/components/fv-switcher.ts` | Modified | Add prop, modify cycle logic, render disabled state |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Empty acceptedViews array causes infinite loop | Low | Validate at least one view exists, fallback to all views |

## Rollback Plan

Remove the `acceptedViews` property and revert `_cycle()` to use original `VIEWS` array. Revert render to original button structure. All changes confined to single file.

## Dependencies

- None — self-contained feature

## Success Criteria

- [ ] `acceptedViews` prop accepts array of view names
- [ ] Click on disabled view does NOT emit `view-change` event
- [ ] Views not in `acceptedViews` render with disabled visual styling
- [ ] Empty/undefined `acceptedViews` defaults to all views enabled