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
  
  // showSwitcher como property con converter - maneja React boolean
  @property({ converter: (value) => {
    if (value === true || value === 'true' || value === '') return true;
    if (value === false || value === 'false') return false;
    return value;
  }}) showSwitcher = true;

  @state() private _activeView: View = 'grid';
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
    // Sincronizar view attribute con _activeView
    if (changedProperties.has('view')) {
      const attrView = this.getAttribute('view') as View;
      if (attrView && ['grid', 'list', 'cards'].includes(attrView)) {
        this._activeView = attrView;
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
    this._activeView = (e as CustomEvent<{ view: View }>).detail.view;
    writeState(this.storageKey, this._persistPayload);
  };

  private get _persistPayload() {
    return {
      activeView: this._activeView,
      filters: this._filters,
      sortConfig: this._sortConfig,
    };
  }

  connectedCallback() {
    super.connectedCallback();
    
    // view desde attribute inicial
    const attrView = this.getAttribute('view');
    if (attrView && ['grid', 'list', 'cards'].includes(attrView)) {
      this._activeView = attrView as View;
    }
    
    const saved = readState(this.storageKey);
    if (saved) {
      if (saved.activeView) this._activeView = saved.activeView as View;
      if (saved.filters) this._filters = saved.filters;
      if (saved.sortConfig !== undefined) this._sortConfig = saved.sortConfig ?? null;
    }
    this.addEventListener('sort-change', this._onSortChange);
    this.addEventListener('filter-change', this._onFilterChange);
    this.addEventListener('view-change', this._onViewChange);
  }

  disconnectedCallback() {
    super.disconnectedCallback();
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