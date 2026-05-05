# data-cards Specification

## Purpose

Cards sub-view rendering each data item as a card in a responsive grid layout.

## Requirements

### Requirement: Card Rendering

`<data-cards>` MUST render each item in `data` as a card. It MUST instantiate the configured `control` elements per visible column inside each card. It MUST emit `row-click` when a card is clicked.

#### Scenario: Basic render

- GIVEN `data` with 5 items and a `columns` config
- WHEN `<data-cards>` renders
- THEN 5 cards appear, each containing the correct control elements

#### Scenario: Card click

- GIVEN a rendered cards view
- WHEN the user clicks a card
- THEN `row-click` is emitted with `{ item, index }`
