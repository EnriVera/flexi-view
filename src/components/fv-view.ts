import { LitElement, html, css } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import type { ColumnConfig, SortChangeDetail, FilterChangeDetail } from '../types.js';
import type { FilterItem } from '../utils/persistence.js';
import { applySort, applyFilters } from '../utils/sort-filter.js';
import { readState, writeState } from '../utils/persistence.js';

type View = 'grid' | 'list' | 'cards';

@customElement('fv-view')
export class FvView<T = Record<string, unknown>> extends LitElement {
  static styles = css`
    :host { display: block; }
  `;

  @property({ attribute: false }) 
  private _data: T[] = [];
  
  @property({ attribute: false }) 
  private _columns: ColumnConfig<T>[] = [];
  
  @property({ reflect: true, type: String }) view: View = 'grid';
  @property({ attribute: 'storage-key' }) storageKey?: string;
  @property({ type: Boolean, attribute: 'sync-url' }) syncUrl = false;
  
  // showSwitcher como property - maneja React boolean y string
  @property({ type: Boolean }) showSwitcher = true;

  @state() private _activeView: View = 'grid';
  private _hashListener?: () => void;
  private _storagePoller?: number;
  private _lastStorageValue?: string;
  private _initialized = false;
  @state() private _filters: Record<string, unknown> = {};
  @state() private _sortConfig: SortChangeDetail | null = null;

  // API pública para data - acepta string (JSON) o array
  set data(val: T[] | string) {
    if (typeof val === 'string') {
      try {
        this._data = JSON.parse(val);
      } catch {
        this._data = [];
      }
    } else {
      this._data = val || [];
    }
    this.requestUpdate();
  }
  get data(): T[] { return this._data; }

  // API pública para columns - acepta string (JSON) o array
  set columns(val: ColumnConfig<T>[] | string) {
    if (typeof val === 'string') {
      try {
        this._columns = JSON.parse(val);
      } catch {
        this._columns = [];
      }
    } else {
      this._columns = val || [];
    }
    this.requestUpdate();
  }
  get columns(): ColumnConfig<T>[] { return this._columns; }

  willUpdate(changedProperties: Map<string, unknown>) {
    // Guardar en localStorage cuando cambia la propiedad 'view'
    if (changedProperties.has('view') && this.storageKey) {
      // Usar la nueva propiedad 'view' directamente, no el state interno
      const newView = this.view;
      
      // Convertir filtros y orden
      const filter: FilterItem[] | null = Object.keys(this._filters).length > 0
        ? Object.entries(this._filters).map(([field, value]) => ({ field, value }))
        : null;
      const order = this._sortConfig?.direction === 'asc' ? 'as' 
        : this._sortConfig?.direction === 'desc' ? 'des' 
        : null;
      
      const payload = { views: newView, order, filter };
      writeState(this.storageKey, payload);
      this._lastStorageValue = localStorage.getItem(this.storageKey) || '';
    }
    
    // Actualizar URL si syncUrl está habilitado
    if (changedProperties.has('view') && this.syncUrl && this.view) {
      this._updateUrl(this.view);
    }
    
    // Solo sincronizar después de inicializado (evitar que attribute sobreescriba URL)
    if (this._initialized && changedProperties.has('view') && this.view) {
      if (['grid', 'list', 'cards'].includes(this.view)) {
        this._activeView = this.view;
      }
    }
  }

  private _onSortChange = (e: Event) => {
    this._sortConfig = (e as CustomEvent<SortChangeDetail>).detail;
    if (this.storageKey) {
      writeState(this.storageKey, this._persistPayload);
      this._lastStorageValue = localStorage.getItem(this.storageKey) || '';
    }
  };

  private _onFilterChange = (e: Event) => {
    const { field, value } = (e as CustomEvent<FilterChangeDetail>).detail;
    if (value === '' || value == null) {
      const next = { ...this._filters };
      delete next[field];
      this._filters = next;
    } else {
      this._filters = { ...this._filters, [field]: value };
    }
    if (this.storageKey) {
      writeState(this.storageKey, this._persistPayload);
      this._lastStorageValue = localStorage.getItem(this.storageKey) || '';
    }
  };

  private _onViewChange = (e: Event) => {
    // El guardado ya se hace en willUpdate cuando cambia la property 'view'
    // Aquí solo necesitamos sincronizar el estado interno si no se actualizó por property
    // No hacemos nada porque el switcher también actualiza directamente this.view
  };

  private get _persistPayload() {
    // Convertir filters a array de FilterItem
    const filter: FilterItem[] | null = Object.keys(this._filters).length > 0
      ? Object.entries(this._filters).map(([field, value]) => ({ field, value }))
      : null;
    
    // Convertir direction: asc → as, desc → des
    const order = this._sortConfig?.direction === 'asc' ? 'as' 
      : this._sortConfig?.direction === 'desc' ? 'des' 
      : null;
    
    return {
      views: this._activeView,
      order,
      filter,
    };
  }

  private _onHashChange = () => {
    if (!this.syncUrl) return;
    const hash = window.location.hash.slice(1);
    const params = new URLSearchParams(hash);
    const urlView = params.get('view');
    if (urlView && ['grid', 'list', 'cards'].includes(urlView) && urlView !== this._activeView) {
      this._activeView = urlView as View;
      this.view = urlView as View;
      this.requestUpdate();
      // Guardar en localStorage cuando la URL cambia
      if (this.storageKey) {
        writeState(this.storageKey, this._persistPayload);
      }
    }
  };

  private _checkStorageChange = () => {
    if (!this.storageKey) return;
    
    const currentValue = localStorage.getItem(this.storageKey);
    
    // Solo reaccionar si el valor cambió Y es diferente de lo que tenemos en memoria
    // Esto detecta cuando el usuario borra desde DevTools (no cuando guardamos nosotros mismos)
    if (currentValue !== this._lastStorageValue) {
      this._lastStorageValue = currentValue || '';
      
      // Si el valor es null o vacío, el usuario borró el storage
      if (!currentValue) {
        // Restaurar a valores por defecto
        this._activeView = 'grid';
        this.view = 'grid';
        this._filters = {};
        this._sortConfig = null;
        this.requestUpdate();
        return;
      }
      
      // Si hay datos, verificar si son diferentes a nuestro estado actual
      try {
        const saved = JSON.parse(currentValue);
        
        // Solo actualizar si los datos son distintos a nuestro estado interno
        const currentPayload = JSON.stringify(this._persistPayload);
        if (currentValue !== currentPayload) {
          // Restaurar desde localStorage
          if (saved.views && ['grid', 'list', 'cards'].includes(saved.views)) {
            this._activeView = saved.views as View;
            this.view = saved.views as View;
          }
          
          if (saved.filter && Array.isArray(saved.filter)) {
            const filters: Record<string, unknown> = {};
            for (const item of saved.filter) {
              filters[item.field] = item.value;
            }
            this._filters = filters;
          }
          
          if (saved.order) {
            const direction = (saved.order === 'as' ? 'asc' : 'desc') as 'asc' | 'desc';
            this._sortConfig = { field: '', direction };
          }
          
          this.requestUpdate();
        }
      } catch {
        // Ignore parse errors
      }
    }
  };

  connectedCallback() {
    super.connectedCallback();
    
    // PRIORIDAD: URL > localStorage > attribute > default
    const urlView = this.syncUrl ? this._getUrlView() : null;
    let saved = readState(this.storageKey);
    
    // Si hay storage-key pero no hay datos en localStorage, inicializar con null
    if (this.storageKey && !saved) {
      const initialState = { views: null, order: null, filter: null };
      writeState(this.storageKey, initialState);
      saved = initialState;
    }
    
    if (urlView) {
      // URL tiene prioridad máxima
      this._activeView = urlView;
      this.view = urlView;
    } else if (saved?.views) {
      // localStorage tiene prioridad sobre attribute
      this._activeView = saved.views as View;
      this.view = saved.views as View;
    } else {
      // Fallback al attribute o default
      const attrView = this.getAttribute('view');
      if (attrView && ['grid', 'list', 'cards'].includes(attrView)) {
        this._activeView = attrView as View;
        this.view = attrView as View;
      }
    }
    
    // Restaurar order desde localStorage
    if (saved?.order) {
      const direction = (saved.order === 'as' ? 'asc' : 'desc') as 'asc' | 'desc';
      this._sortConfig = { field: '', direction };
    }
    
    // Restaurar filter desde localStorage
    if (saved?.filter && Array.isArray(saved.filter)) {
      const filters: Record<string, unknown> = {};
      for (const item of saved.filter) {
        filters[item.field] = item.value;
      }
      this._filters = filters;
    }
    
    // Actualizar URL para que esté sincronizada con el estado inicial
    if (this.syncUrl && !urlView) {
      this._updateUrl(this._activeView);
    }
    
    this.addEventListener('sort-change', this._onSortChange);
    this.addEventListener('filter-change', this._onFilterChange);
    this.addEventListener('view-change', this._onViewChange);
    
    if (this.syncUrl) {
      this._hashListener = () => this._onHashChange();
      window.addEventListener('hashchange', this._hashListener);
    }
    
    // Polling para detectar cambios en localStorage (el evento 'storage' no funciona en la misma página)
    if (this.storageKey) {
      this._lastStorageValue = localStorage.getItem(this.storageKey) || '';
      this._storagePoller = window.setInterval(() => this._checkStorageChange(), 500);
    }
    
    this._initialized = true;
  }
  
  private _getUrlView(): View | null {
    const hash = window.location.hash.slice(1);
    const params = new URLSearchParams(hash);
    const view = params.get('view');
    if (view && ['grid', 'list', 'cards'].includes(view)) {
      return view as View;
    }
    return null;
  }
  
  private _updateUrl(view: View) {
    const hash = window.location.hash.slice(1);
    const params = new URLSearchParams(hash);
    params.set('view', view);
    window.location.hash = params.toString();
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    if (this._hashListener) {
      window.removeEventListener('hashchange', this._hashListener);
    }
    if (this._storagePoller) {
      window.clearInterval(this._storagePoller);
    }
    this.removeEventListener('sort-change', this._onSortChange);
    this.removeEventListener('filter-change', this._onFilterChange);
    this.removeEventListener('view-change', this._onViewChange);
  }

  private get _processedData(): T[] {
    return applySort(applyFilters(this._data, this._filters), this._sortConfig);
  }

  render() {
    const data = this._processedData;
    // Mostrar switcher solo si showSwitcher es true
    return html`
      ${this.showSwitcher ? html`<data-switch .activeView=${this._activeView}></data-switch>` : ''}
      ${this._renderView(data)}
    `;
  }

  private _renderView(data: T[]) {
    switch (this._activeView) {
      case 'list':
        return html`<data-list .data=${data} .columns=${this._columns}></data-list>`;
      case 'cards':
        return html`<data-cards .data=${data} .columns=${this._columns}></data-cards>`;
      default:
        return html`<data-grid .data=${data} .columns=${this._columns}></data-grid>`;
    }
  }
}