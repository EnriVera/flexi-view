# Proposal: Filtro de Columna en Modal

## Intent

Agregar un botón "Ver todos" en la sección de filtros del popup de header que levante un modal separado con TODOS los valores únicos de la columna, permitiendo filtrar mediante checkboxes multi-select con persistencia del filtro seleccionado.

## Scope

### In Scope
- Botón "Ver todos" en la sección de filtros del popup de header (`fv-header-menu`)
- Modal separado (`fv-filter-modal`) que muestre TODOS los valores únicos (sin límite)
- Checkbox multi-select para cada valor de la columna
- Persistencia del filtro seleccionado (mediante `filter-change` event)
- Scroll dentro del modal si hay muchos valores

### Out of Scope
- Filtrado por rango numérico o fechas (solo multi-select de valores)
- Búsqueda dentro del modal (funcionalidad futura)
- Guardado de filtros por defecto del usuario (persistencia a nivel de app)

## Capabilities

### New Capabilities
- `filter-modal`: Componente Lit que renderiza un modal con checkboxes multi-select para todos los valores únicos de una columna

### Modified Capabilities
- `fv-filter-action`: Agregar prop `showAllButton` y evento para abrir modal (o crear variante)
- `fv-header-menu`: Agregar botón "Ver todos" y manejar apertura del modal

## Approach

Crear nuevo componente `fv-filter-modal` que:
1. Accepta `field`, `selected`, `options` (igual que `fv-filter-action`)
2. Renderiza un overlay modal con todos los valores en scrollable list
3. Usa el mismo mecanismo de `filter-change` event para persistencia
4. Se abre desde un botón "Ver todos" en `fv-header-menu`

**Opción seleccionada**: Componente nuevo en lugar de expandir `fv-filter-action` porque:
- El popup actual tiene `min-width: 160px` - no es espacio suficiente
- El modal tiene comportamiento de interacción diferente (overlay, close on escape/outside click)
- Separación de responsabilidades clara

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `src/components/fv-filter-modal.ts` | New | Componente modal con checkboxes multi-select |
| `src/components/fv-filter-action.ts` | Modified | Agregar prop `showAllButton?: boolean` y eventos |
| `src/components/fv-header-menu.ts` | Modified | Agregar botón "Ver todos" y lógica de apertura del modal |
| `src/index.ts` | Modified | Exportar `fv-filter-modal` |
| `src/__tests__/components/` | New | Tests para `fv-filter-modal` |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Performance con muchas opciones (1000+) | Medium | Agregar virtual scroll si es necesario |
| UX: usuario no encuentra botón "Ver todos" | Low | Agregar tooltip "Ver todos los valores" |

## Rollback Plan

1. Revertir cambios en `src/components/fv-header-menu.ts` (quitar botón)
2. Eliminar `src/components/fv-filter-modal.ts`
3. Revertir exports en `src/index.ts`
4. Eliminar tests asociados

## Dependencies

- Ninguna dependencia externa nueva
- Requiere que `fv-filter-action` ya esté funcionando (confirmado)

## Success Criteria

- [ ] Botón "Ver todos" visible en sección de filtros del popup de header
- [ ] Modal abre al hacer click en el botón
- [ ] Modal muestra TODOS los valores únicos (sin límite)
- [ ] Checkboxes permiten multi-select
- [ ] `filter-change` event se dispara correctamente
- [ ] Filtro se persiste en el estado del grid
- [ ] Tests pasan