# Tasks: fix-localstorage-persistence

## Phase 1: Implementation

- [x] 1.1 En `src/components/data-view.ts`, modificar `willUpdate` para que detecte cambios en la property `view` y llame `writeState(this.storageKey, this._persistPayload)`
- [x] 1.2 Simplificar `_onViewChange` - remover writeState ya que willUpdate lo maneja
- [x] 1.3 Verificar que el `connectedCallback` sigue inicializando el registro en localStorage si no existe

## Phase 2: Verification

- [x] 2.1 Build del paquete: `npm run build`
- [ ] 2.2 Instalar en proyecto de prueba: `cd E:\prueba-new-view\vite-project && pnpm install`
- [ ] 2.3 Testear cambio de vista y verificar localStorage
- [ ] 2.4 Testear F5 y verificar restauración de vista