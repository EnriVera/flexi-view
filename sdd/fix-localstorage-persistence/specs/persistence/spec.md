# Delta for persistence

## MODIFIED Requirements

### Requirement: Guardado de estado en localStorage

Cuando el usuario define `storage-key` en `<data-view>`, el sistema DEBE guardar el estado de la vista, orden y filtros en localStorage.

(Previously: El sistema debería guardar pero el flujo no funcionaba correctamente)

#### Scenario: Cambio de vista guarda en localStorage

- GIVEN `<data-view id="my-data" storage-key="my-data">` en la página
- AND localStorage tiene `{ views: null, order: null, filter: null }`
- WHEN usuario hace click en `data-switch` para cambiar de "grid" a "list"
- THEN localStorage debe contener `{ views: "list", order: null, filter: null }`

#### Scenario: Cambio de orden guarda en localStorage

- GIVEN `<data-view id="my-data" storage-key="my-data">` con datos
- AND localStorage tiene `{ views: "grid", order: null, filter: null }`
- WHEN usuario hace click en el header de una columna para ordenar
- THEN localStorage debe contener `{ views: "grid", order: "as", filter: null }`

#### Scenario: Cambio de filtro guarda en localStorage

- GIVEN `<data-view id="my-data" storage-key="my-data">` con datos
- AND localStorage tiene `{ views: "grid", order: null, filter: null }`
- WHEN usuario aplica un filtro a la columna "status" con valor "active"
- THEN localStorage debe contener `{ views: "grid", order: null, filter: [{ field: "status", value: "active" }] }`

### Requirement: Restauración de estado desde localStorage

Al cargar la página, si existe un registro en localStorage para el `storage-key` dado, el sistema DEBE restaurar la vista, orden y filtros guardados.

#### Scenario: Restauración de vista al hacer F5

- GIVEN `<data-view id="my-data" storage-key="my-data">` con localStorage `{ views: "list", order: null, filter: null }`
- WHEN usuario hace F5 (refresca la página)
- THEN la vista debe mostrar "list" (no "grid")

#### Scenario: Restauración de orden al hacer F5

- GIVEN `<data-view id="my-data" storage-key="my-data">` con localStorage `{ views: "grid", order: "des", filter: null }`
- WHEN usuario hace F5
- THEN la columna debe mostrar el indicador de orden descendente

#### Scenario: Restauración de filtros al hacer F5

- GIVEN `<data-view id="my-data" storage-key="my-data">` con localStorage `{ views: "grid", order: null, filter: [{ field: "status", value: "active" }] }`
- WHEN usuario hace F5
- THEN solo deben mostrarse los registros donde status = "active"

### Requirement: Inicialización de localStorage

Si el usuario define `storage-key` pero no existe un registro en localStorage, el sistema DEBE crear un registro inicial con todos los valores en null.

#### Scenario: Primer load inicializa registro

- GIVEN no existe "my-data" en localStorage
- WHEN se carga `<data-view id="my-data" storage-key="my-data">`
- THEN debe crearse el registro `{ views: null, order: null, filter: null }`