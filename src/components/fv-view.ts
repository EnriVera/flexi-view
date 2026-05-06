import { LitElement, html, css } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import type { ColumnConfig, SortChangeDetail, FilterChangeDetail } from '../types.js';
import type { FilterItem } from '../utils/persistence.js';
import { applySort, applyFilters } from '../utils/sort-filter.js';
import { readState, writeState, writeFilterToUrl, clearFilterFromUrl, readFiltersFromUrl } from '../utils/persistence.js';
import { writeSortToUrl, clearSortFromUrl } from '../utils/persistence.js';
import { getGridConfig } from '../registry.js';
import './fv-header-menu.js';

type View = 'grid' | 'list' | 'cards';

@customElement('fv-view')
export class FvView<T = Record<string, unknown>> extends LitElement {
  static styles = css`
    :host { display: block; }
    .controls {
      display: flex;
      flex-direction: row;
      gap: 1rem;
      margin-bottom: 1rem;
    }
  `;

  @property({ attribute: false })
  private _data: T[] = [];

  @property({ attribute: false })
  private _columns: ColumnConfig<T>[] = [];

  @property({ reflect: true, type: String }) view: View = 'grid';
  @property({ attribute: 'storage-key' }) storageKey?: string;
  @property({ type: Boolean, attribute: 'sync-url' }) syncUrl = false;

  @property({ type: Boolean }) showSwitcher = true;
  @property({ type: Boolean, attribute: 'show-search' }) showSearch = true;

  // Public getters para que header-menu acceda a datos filtrados
  get filteredData(): T[] { return this._filteredData; }
  get columnDefs(): ColumnConfig<T>[] { return this._columns; }

  @state() private _activeView: View = 'grid';
  private _hashListener?: () => void;
  private _storagePoller?: number;
  private _lastStorageValue?: string;
  private _initialized = false;
  @state() private _filters: Record<string, unknown> = {};
  @state() private _sortConfig: SortChangeDetail | null = null;

  private _headerMenu: HTMLElement | null = null;

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
    if (changedProperties.has('view') && this.storageKey) {
      const newView = this.view;
      const filter: FilterItem[] | null = Object.keys(this._filters).length > 0
        ? Object.entries(this._filters).map(([field, value]) => ({ field, value }))
        : null;
      const sort = this._sortConfig?.direction != null
        ? { field: this._sortConfig.field, direction: this._sortConfig.direction as 'asc' | 'desc' }
        : null;
      const payload = { views: newView, sort, filter };
      writeState(this.storageKey, payload);
      this._lastStorageValue = localStorage.getItem(this.storageKey) || '';
    }

    if (changedProperties.has('view') && this.syncUrl && this.view) {
      this._updateUrl(this.view);
    }

    if (this._initialized && changedProperties.has('view') && this.view) {
      if (['grid', 'list', 'cards'].includes(this.view)) {
        this._activeView = this.view;
      }
    }
  }

  private _onSortChange = (e: Event) => {
    const detail = (e as CustomEvent<SortChangeDetail>).detail;
    if (detail.direction === null) {
      this._sortConfig = null;
      if (this.syncUrl) clearSortFromUrl();
    } else {
      this._sortConfig = detail;
      if (this.syncUrl) writeSortToUrl(detail.field, detail.direction);
    }
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
      if (this.syncUrl) clearFilterFromUrl(field);
    } else {
      const filterValue = Array.isArray(value) ? value.join(',') : String(value);
      this._filters = { ...this._filters, [field]: value };
      if (this.syncUrl) writeFilterToUrl(field, filterValue);
    }
    if (this.storageKey) {
      writeState(this.storageKey, this._persistPayload);
      this._lastStorageValue = localStorage.getItem(this.storageKey) || '';
    }
  };

  private _onViewChange = (e: Event) => {
    const { view } = (e as CustomEvent<{ view: string }>).detail;
    if (view && ['grid', 'list', 'cards'].includes(view)) {
      this._activeView = view as View;
      this.view = view as View;
      this.requestUpdate();
    }
  };

  private _onSearch = (e: Event) => {
    const { value } = (e as CustomEvent<{ value: string }>).detail;
    const searchFields = this._columns
      .filter(col => col.field != null)
      .map(col => String(col.field));

    if (value === '' || value == null) {
      this._filters = {};
    } else {
      this._filters = { __search: value, __searchFields: searchFields };
    }

    if (this.storageKey) {
      writeState(this.storageKey, this._persistPayload);
      this._lastStorageValue = localStorage.getItem(this.storageKey) || '';
    }
  };

  private _onHeaderMenuOpen = (e: Event) => {
    e.stopPropagation();
    const { column, anchor } = (e as CustomEvent<{ column: ColumnConfig<T>; field: string; anchor: HTMLElement | null }>).detail;

    const config = getGridConfig();
    const menuTag = column.headerMenu !== undefined
      ? column.headerMenu
      : (config.headerMenu ?? 'fv-header-menu');

    if (menuTag === false) return;

    if (this._headerMenu) {
      (this._headerMenu as any).close?.();
      this._headerMenu.remove();
      this._headerMenu = null;
    }

    const menu = document.createElement(menuTag) as HTMLElement & {
      column: ColumnConfig<T>;
      columns: ColumnConfig<T>[];
      data: T[];
      filteredData: T[];
      currentSort: SortChangeDetail | null;
      currentFilters: Record<string, unknown>;
      anchor: HTMLElement | null;
      open(): void;
      close(): void;
    };

    menu.column = column;
    menu.columns = this._columns;
    menu.data = this._data;
    menu.filteredData = this._filteredData;
    menu.currentSort = this._sortConfig;
    menu.currentFilters = this._filters;
    menu.anchor = anchor;

    menu.addEventListener('sort-change', this._onSortChange);
    menu.addEventListener('filter-change', this._onFilterChange);
    menu.addEventListener('fv-export-request', this._onExportRequest);

    document.body.appendChild(menu);
    this._headerMenu = menu;
    menu.open();
  };

  private _onExportRequest = (_e: Event) => {
    // fv-export-action handles the actual export; this is informational only
  };

  private get _persistPayload() {
    const filter: FilterItem[] | null = Object.keys(this._filters).length > 0
      ? Object.entries(this._filters).map(([field, value]) => ({ field, value }))
      : null;
    const sort = this._sortConfig?.direction != null
      ? { field: this._sortConfig.field, direction: this._sortConfig.direction as 'asc' | 'desc' }
      : null;
    return {
      views: this._activeView,
      sort,
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
      if (this.storageKey) {
        writeState(this.storageKey, this._persistPayload);
      }
    }
    const urlSort = params.get('fv-sort');
    if (urlSort) {
      const [field, direction] = urlSort.split(':');
      if (field && (direction === 'asc' || direction === 'desc')) {
        this._sortConfig = { field, direction };
      }
    }
  };

  private _checkStorageChange = () => {
    if (!this.storageKey) return;
    const currentValue = localStorage.getItem(this.storageKey);
    if (currentValue !== this._lastStorageValue) {
      this._lastStorageValue = currentValue || '';
      if (!currentValue) {
        this._activeView = 'grid';
        this.view = 'grid';
        this._filters = {};
        this._sortConfig = null;
        this.requestUpdate();
        return;
      }
      try {
        const saved = JSON.parse(currentValue);
        const currentPayload = JSON.stringify(this._persistPayload);
        if (currentValue !== currentPayload) {
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
          if (saved.sort && typeof saved.sort === 'object') {
            const { field, direction } = saved.sort;
            if (field && (direction === 'asc' || direction === 'desc')) {
              this._sortConfig = { field, direction };
            }
          }
          this.requestUpdate();
        }
      } catch {
        // ignore parse errors
      }
    }
  };

  connectedCallback() {
    super.connectedCallback();

    const urlView = this.syncUrl ? this._getUrlView() : null;
    let saved = readState(this.storageKey);

    if (this.storageKey && !saved) {
      const initialState = { views: null, sort: null, filter: null };
      writeState(this.storageKey, initialState);
      saved = initialState;
    }

    if (urlView) {
      this._activeView = urlView;
      this.view = urlView;
    } else if (saved?.views) {
      this._activeView = saved.views as View;
      this.view = saved.views as View;
    } else {
      const attrView = this.getAttribute('view');
      if (attrView && ['grid', 'list', 'cards'].includes(attrView)) {
        this._activeView = attrView as View;
        this.view = attrView as View;
      }
    }

    if (saved?.sort) {
      this._sortConfig = { field: saved.sort.field, direction: saved.sort.direction };
    }

    const hash = window.location.hash.slice(1);
    const params = new URLSearchParams(hash);
    const urlSort = params.get('fv-sort');
    if (urlSort) {
      const [field, direction] = urlSort.split(':');
      if (field && (direction === 'asc' || direction === 'desc')) {
        this._sortConfig = { field, direction };
      }
    }

    if (saved?.filter && Array.isArray(saved.filter)) {
      const filters: Record<string, unknown> = {};
      for (const item of saved.filter) {
        filters[item.field] = item.value;
      }
      this._filters = filters;
    }

    // Leer filtros desde URL si syncUrl estáhabilitado
    if (this.syncUrl) {
      const urlFilters = readFiltersFromUrl();
      for (const [field, value] of Object.entries(urlFilters)) {
        this._filters[field] = value.split(',');
      }
    }

    if (this.syncUrl && !urlView) {
      this._updateUrl(this._activeView);
    }

    this.addEventListener('sort-change', this._onSortChange);
    this.addEventListener('filter-change', this._onFilterChange);
    this.addEventListener('view-change', this._onViewChange);
    this.addEventListener('fv-search', this._onSearch as EventListener);
    this.addEventListener('header-menu-open', this._onHeaderMenuOpen as EventListener);
    this.addEventListener('fv-export-request', this._onExportRequest);

    if (this.syncUrl) {
      this._hashListener = () => this._onHashChange();
      window.addEventListener('hashchange', this._hashListener);
    }

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
    if (this._headerMenu) {
      (this._headerMenu as any).close?.();
      this._headerMenu.remove();
      this._headerMenu = null;
    }
    this.removeEventListener('sort-change', this._onSortChange);
    this.removeEventListener('filter-change', this._onFilterChange);
    this.removeEventListener('view-change', this._onViewChange);
    this.removeEventListener('header-menu-open', this._onHeaderMenuOpen as EventListener);
    this.removeEventListener('fv-export-request', this._onExportRequest);
  }

  private get _processedData(): T[] {
    return applySort(applyFilters(this._data, this._filters), this._sortConfig);
  }

  render() {
    const data = this._processedData;
    return html`
      ${this.showSearch || this.showSwitcher ? html`
        <div class="controls">
          ${this.showSearch ? html`<fv-search placeholder="Search..." debounce></fv-search>` : ''}
          ${this.showSwitcher ? html`<fv-switcher .activeView=${this._activeView} .targetFor=${this.id}></fv-switcher>` : ''}
        </div>
      ` : ''}
      ${this._renderView(data)}
    `;
  }

  private _renderView(data: T[]) {
    switch (this._activeView) {
      case 'list':
        return html`<fv-list .data=${data} .columns=${this._columns}></fv-list>`;
      case 'cards':
        return html`<fv-cards .data=${data} .columns=${this._columns}></fv-cards>`;
      default:
        return html`<fv-grid
          .data=${data}
          .columns=${this._columns}
          .currentSort=${this._sortConfig}
          .currentFilters=${this._filters}
        ></fv-grid>`;
    }
  }
}
