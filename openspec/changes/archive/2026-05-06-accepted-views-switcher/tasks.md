# Tasks: accepted-views-switcher

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~60-80 |
| 400-line budget risk | Low |
| Chained PRs recommended | No |
| Suggested split | Single PR |

Decision needed before apply: No
Chained PRs recommended: No
Chain strategy: pending
400-line budget risk: Low

### Suggested Work Units

| Unit | Goal | Likely PR | Notes |
|------|------|-----------|-------|
| 1 | Implement acceptedViews in fv-switcher | PR 1 | Include tests |

## Phase 1: Core Implementation

- [ ] 1.1 Add `acceptedViews` property to `src/components/fv-switcher.ts` with default `['grid', 'list', 'cards']`
- [ ] 1.2 Update `render()` to show all three view buttons with disabled styling for views not in `acceptedViews`
- [ ] 1.3 Guard click handler to ignore clicks on disabled views (only emit view-change for accepted views)
- [ ] 1.4 Update `_cycle()` method to filter to only accepted views when finding next view

## Phase 2: Integration

- [ ] 2.1 Pass `acceptedViews` from `src/components/fv-view.ts` to `fv-switcher` based on which fieldXxx props have content (non-empty arrays)

## Phase 3: Testing

- [ ] 3.1 Run existing tests: `npm test`
- [ ] 3.2 Verify behavior matches spec scenarios (default accepts all, custom subset, empty fallback)

## Implementation Notes

- Current `fv-switcher` renders only ONE button (active view icon). Spec requires showing disabled state for non-accepted views — render all 3 buttons.
- When `acceptedViews` is empty, fallback to default `['grid', 'list', 'cards']` to prevent infinite cycling.
- Use CSS `opacity: 0.4` for disabled view buttons.
- Add `disabled` attribute to button element for accessibility and to prevent click.