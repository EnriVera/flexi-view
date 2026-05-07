# Switch Component Specification

## Purpose

The `fv-switcher` component provides a view switching button that cycles through available view types (grid, list, cards). This specification adds the ability to control which view types are enabled/disabled via an `acceptedViews` array property.

## ADDED Requirements

### Requirement: acceptedViews Array Property

The `fv-switcher` component MUST accept an `acceptedViews` property that accepts an array of view type strings: `'grid' | 'list' | 'cards'`.

The property MUST default to `['grid', 'list', 'cards']` when not provided, enabling all views by default.

#### Scenario: Default accepts all views

- GIVEN no `acceptedViews` property is set on `fv-switcher`
- WHEN the component renders
- THEN all three view types (grid, list, cards) MUST be clickable and cycle normally

#### Scenario: Custom accepted views array

- GIVEN `acceptedViews={['grid', 'cards']}` is set on `fv-switcher`
- WHEN the component renders
- THEN only 'grid' and 'cards' views MUST be enabled
- AND 'list' view MUST be visually disabled

#### Scenario: Single accepted view

- GIVEN `acceptedViews={['list']}` is set on `fv-switcher`
- WHEN the user clicks the switcher button
- THEN the view MUST remain on 'list' (cycling to same view since it's the only one)

#### Scenario: Empty acceptedViews fallback

- GIVEN `acceptedViews={[]}` (empty array) is set on `fv-switcher`
- WHEN the component renders
- THEN it MUST fallback to default `['grid', 'list', 'cards']` to prevent infinite cycling

### Requirement: Disabled Views Do Not Emit Events

The `fv-switcher` component MUST NOT emit a `view-change` event when a disabled view is clicked.

#### Scenario: Click on disabled view ignored

- GIVEN `acceptedViews={['grid']}` is set, active view is 'grid'
- WHEN user clicks a disabled view button (list or cards, if rendered as buttons)
- THEN NO `view-change` event MUST be emitted

### Requirement: Visual Disabled State

Views not in the `acceptedViews` array MUST be rendered with a visually disabled appearance.

#### Scenario: Disabled views show reduced opacity

- GIVEN `acceptedViews={['grid']}` is set on `fv-switcher`
- WHEN the component renders
- THEN views not in `acceptedViews` (list, cards) MUST show reduced opacity or disabled styling
- AND the active view MUST remain fully visible

### Requirement: Cycle Skips Disabled Views

The internal `_cycle()` method MUST skip views that are not in the `acceptedViews` array when determining the next view.

#### Scenario: Cycle through only accepted views

- GIVEN `acceptedViews={['grid', 'cards']}`, active view is 'grid'
- WHEN user clicks the switcher
- THEN the next view MUST be 'cards' (skipping 'list')
- AND a `view-change` event MUST be emitted with detail `{ view: 'cards' }`

#### Scenario: Cycle wraps correctly with subset

- GIVEN `acceptedViews={['list', 'cards']}`, active view is 'cards'
- WHEN user clicks the switcher
- THEN the next view MUST be 'list' (wrapping from cards to list)
- AND 'grid' MUST be skipped as it's not in the accepted list