# Delta for switch

## MODIFIED Requirements

### Requirement: Cambio de vista funciona sin sync-url

Cuando el usuario hace click en data-switch (sin sync-url), la vista DEBE cambiar correctamente.

(Previously: El switch solo funcionaba correctamente con sync-url habilitado)

#### Scenario: Cambio de vista sin sync-url

- GIVEN `<data-view id="my-data" storage-key="my-data">` sin sync-url
- AND `<data-switch for="my-data">` (sin sync-url)
- WHEN usuario hace click en el botón del switcher
- THEN la vista debe cambiar de "grid" a "list"

#### Scenario: Cambio de vista con sync-url

- GIVEN `<data-view id="my-data" sync-url>` con sync-url
- AND `<data-switch for="my-data" sync-url>`
- WHEN usuario hace click en el botón del switcher
- THEN la vista debe cambiar Y la URL debe actualizarse

## ADDED Requirements

### Requirement: Sincronización inicial del switch

Al cargar la página, si hay datos en localStorage, el switch externo DEBE mostrar la vista correcta.

#### Scenario: Switch se sincroniza con localStorage

- GIVEN localStorage tiene `{ views: "list", ... }`
- AND `<data-view id="my-data" storage-key="my-data">`
- AND `<data-switch for="my-data">`
- WHEN se carga la página
- THEN el switch debe mostrar el icono de "list"