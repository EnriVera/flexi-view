import { LitElement, html, css } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import type { ColumnConfig, SortChangeDetail, FilterChangeDetail } from '../types.js';
import { applySort, applyFilters } from '../utils/sort-filter.js';
import { readState, writeState } from '../utils/persistence.js';

type View = 'grid' | 'list' | 'cards';

@customElement('data-view')
export class DataView<T = Record<string, unknown>> extends LitElement {
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
    // Solo sincronizar después de inicializado (evitar que attribute sobreescriba URL)
    if (this._initialized && changedProperties.has('view') && this.view) {
      if (['grid', 'list', 'cards'].includes(this.view)) {
        this._activeView = this.view;
      }
    }
  }

  private _onSortChange = (e: Event) => {
    this._sortConfig = (e as CustomEvent<SortChangeDetail>).detail;
    writeState(this.storageKey, this._persistPayload);
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
    writeState(this.storageKey, this._persistPayload);
  };

  private _onViewChange = (e: Event) => {
    // Solo procesar eventos de data-switch con attribute 'for' (external)
    // que nos targetea directamente
    const target = e.composedPath()[0] as HTMLElement;
    if (!target || target.tagName?.toLowerCase() !== 'data-switch') return;
    
    // Solo procesar si este switcher nos tiene como target
    const forAttr = target.getAttribute('for');
    if (forAttr && forAttr !== this.id) return;
    
    const event = e as CustomEvent<{ view: View }>;
    const newView = event.detail.view;
    
    // Sincronizar AMBOS: property y state
    this.view = newView;
    this._activeView = newView;
    
    if (this.syncUrl) {
      this._updateUrl(newView);
    }
    
    writeState(this.storageKey, this._persistPayload);
  };

  private get _persistPayload() {
    return {
      activeView: this._activeView,
      filters: this._filters,
      sortConfig: this._sortConfig,
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
    }
  };

  connectedCallback() {
    super.connectedCallback();
    
    // PRIORIDAD: URL > localStorage > attribute > default
    const urlView = this.syncUrl ? this._getUrlView() : null;
    
    if (urlView) {
      this._activeView = urlView;
    } else {
      // Solo si NO hay URL, usar localStorage o attribute
      const saved = readState(this.storageKey);
      if (saved?.activeView) {
        this._activeView = saved.activeView as View;
      } else {
        // Fallback al attribute o default
        const attrView = this.getAttribute('view');
        if (attrView && ['grid', 'list', 'cards'].includes(attrView)) {
          this._activeView = attrView as View;
        }
        if (saved) {
          if (saved.filters) this._filters = saved.filters;
          if (saved.sortConfig !== undefined) this._sortConfig = saved.sortConfig ?? null;
        }
      }
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