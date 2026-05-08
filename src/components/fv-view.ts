import { LitElement, html, css } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import type { ColumnConfig, SortChangeDetail, FilterChangeDetail, FvFilterChangeDetail, SortCriterion } from '../types.js';
import type { FilterItem } from '../utils/persistence.js';
import { applySort, applyFilters } from '../utils/sort-filter.js';
import { readState, writeState, writeFilterToUrl, clearFilterFromUrl, readFiltersFromUrl } from '../utils/persistence.js';
import { writeSortToUrl, readSortFromUrl } from '../utils/persistence.js';
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
  private _registers: T[] = [];

  @property({ attribute: false })
  private _fieldGrids: ColumnConfig<T>[] = [];
  @property({ attribute: false })
  private _fieldRows: ColumnConfig<T>[] = [];
  @property({ attribute: false })
  private _fieldCards: ColumnConfig<T>[] = [];

  @property({ reflect: true, type: String }) view: View = 'grid';
  @property({ attribute: 'storage-key' }) storageKey?: string;
  @property({ type: Boolean, attribute: 'sync-url' }) syncUrl = false;

  @property({ type: Boolean }) showSwitcher = true;
  @property({ type: Boolean, attribute: 'show-search' }) showSearch = true;

  // Public getters para que header-menu acceda a datos filtrados
  get filteredData(): T[] { return this._processedData; }
  get columnDefs(): ColumnConfig<T>[] { return this._fieldGrids; }
  get acceptedViews(): View[] {
    const views: View[] = [];
    if (this._fieldGrids.length > 0) views.push('grid');
    if (this._fieldRows.length > 0) views.push('list');
    if (this._fieldCards.length > 0) views.push('cards');
    return views;
  }

  get currentSorts(): SortCriterion[] { return this._sortCriteria; }
  get currentFilters(): Record<string, unknown> { return this._filters; }

  private _emitStateEvent(name: string, detail: unknown) {
    this.dispatchEvent(new CustomEvent(name, { detail, bubbles: true, composed: true }));
  }

  @state() private _activeView: View = 'grid';
  private _hashListener?: () => void;
  private _storagePoller?: number;
  private _lastStorageValue?: string;
  private _initialized = false;
  @state() private _filters: Record<string, unknown> = {};
  @state() private _sortCriteria: SortCriterion[] = [];

  private _headerMenu: HTMLElement | null = null;

  set registers(val: T[] | string) {
    if (typeof val === 'string') {
      try {
        this._registers = JSON.parse(val);
      } catch {
        this._registers = [];
      }
    } else {
      this._registers = val || [];
    }
    this.requestUpdate();
  }
  get registers(): T[] { return this._registers; }

  set fieldGrids(val: ColumnConfig<T>[] | string) {
    if (typeof val === 'string') {
      try {
        this._fieldGrids = JSON.parse(val);
      } catch {
        this._fieldGrids = [];
      }
    } else {
      this._fieldGrids = val || [];
    }
    this.requestUpdate();
  }
  get fieldGrids(): ColumnConfig<T>[] { return this._fieldGrids; }

  set fieldRows(val: ColumnConfig<T>[] | string) {
    if (typeof val === 'string') {
      try {
        this._fieldRows = JSON.parse(val);
      } catch {
        this._fieldRows = [];
      }
    } else {
      this._fieldRows = val || [];
    }
    this.requestUpdate();
  }
  get fieldRows(): ColumnConfig<T>[] { return this._fieldRows; }

  set fieldCards(val: ColumnConfig<T>[] | string) {
    if (typeof val === 'string') {
      try {
        this._fieldCards = JSON.parse(val);
      } catch {
        this._fieldCards = [];
      }
    } else {
      this._fieldCards = val || [];
    }
    this.requestUpdate();
  }
  get fieldCards(): ColumnConfig<T>[] { return this._fieldCards; }

  willUpdate(changedProperties: Map<string, unknown>) {
    if (changedProperties.has('view') && this.storageKey) {
      const newView = this.view;
      const filter: FilterItem[] | null = Object.keys(this._filters).length > 0
        ? Object.entries(this._filters).map(([field, value]) => ({ field, value }))
        : null;
      const sort = this._sortCriteria.length > 0 ? this._sortCriteria : null;
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
    this._sortCriteria = detail?.sorts ? [...detail.sorts] : [];
    if (this.syncUrl) writeSortToUrl(this._sortCriteria);
    this._emitStateEvent('fv-sort-change', { sorts: this._sortCriteria });
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
    this._emitStateEvent('fv-filter-change', { filters: this._filters } as FvFilterChangeDetail);
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
    const activeColumns = this.fieldGrids;
    const searchFields = activeColumns
      .filter(col => col.field != null)
      .map(col => String(col.field));

    if (value === '' || value == null) {
      const { __search: _, __searchFields: __, ...rest } = this._filters;
      this._filters = rest;
    } else {
      this._filters = { ...this._filters, __search: value, __searchFields: searchFields };
    }

    this._emitStateEvent('fv-filter-change', { filters: this._filters } as FvFilterChangeDetail);

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
      fieldGrids: ColumnConfig<T>[];
      registers: Record<string, unknown>;
      currentSorts: SortCriterion[];
      currentFilters: Record<string, unknown>;
      anchor: HTMLElement | null;
      open(): void;
      close(): void;
    };

    menu.column = column;
    menu.fieldGrids = this._fieldGrids;
    menu.registers = this._registers;
    menu.filteredData = this._processedData;
    menu.currentSorts = this._sortCriteria;
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
    const sort = this._sortCriteria.length > 0
      ? { field: this._sortCriteria[0].field, direction: this._sortCriteria[0].direction }
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

    if (urlView && ['grid', 'list', 'cards'].includes(urlView)) {
      const acceptedViews: View[] = [];
      if (this._fieldGrids && this._fieldGrids.length > 0) acceptedViews.push('grid');
      if (this._fieldRows && this._fieldRows.length > 0) acceptedViews.push('list');
      if (this._fieldCards && this._fieldCards.length > 0) acceptedViews.push('cards');

      let targetView: View;
      if (acceptedViews.length > 0 && !acceptedViews.includes(urlView as View)) {
        // URL view not accepted — fall back to first accepted view and rewrite hash
        targetView = acceptedViews[0];
        this._updateUrl(targetView);
      } else {
        targetView = urlView as View;
      }

      if (targetView !== this._activeView) {
        this._activeView = targetView;
        this.view = targetView;
        this.requestUpdate();
        if (this.storageKey) {
          writeState(this.storageKey, this._persistPayload);
        }
      }
    }
    const urlSorts = readSortFromUrl();
    if (urlSorts.length > 0) {
      this._sortCriteria = urlSorts;
      this._emitStateEvent('fv-sort-change', { sorts: this._sortCriteria });
    }
  };

  private _checkStorageChange = () => {
    if (!this.storageKey) return;
    const currentValue = localStorage.getItem(this.storageKey);

    // Determine acceptedViews from current field configurations
    const acceptedViews: string[] = [];
    if (this._fieldGrids && this._fieldGrids.length > 0) acceptedViews.push('grid');
    if (this._fieldRows && this._fieldRows.length > 0) acceptedViews.push('list');
    if (this._fieldCards && this._fieldCards.length > 0) acceptedViews.push('cards');

    if (currentValue !== this._lastStorageValue) {
      this._lastStorageValue = currentValue || '';
      if (!currentValue) {
        // Default to first accepted view or 'grid' as fallback
        const defaultView = acceptedViews.length > 0 ? acceptedViews[0] as View : 'grid';
        this._activeView = defaultView;
        this.view = defaultView;
        this._filters = {};
        this._sortCriteria = [];
        this._emitStateEvent('fv-sort-change', { sorts: [] });
        this._emitStateEvent('fv-filter-change', { filters: this._filters } as FvFilterChangeDetail);
        this.requestUpdate();
        return;
      }
      try {
        const saved = JSON.parse(currentValue);
        const currentPayload = JSON.stringify(this._persistPayload);
        if (currentValue !== currentPayload) {
          if (saved.views && ['grid', 'list', 'cards'].includes(saved.views)) {
            if (acceptedViews.includes(saved.views)) {
              this._activeView = saved.views as View;
              this.view = saved.views as View;
            } else if (acceptedViews.length > 0) {
              // Saved view not in acceptedViews, default to first accepted
              const defaultView = acceptedViews[0] as View;
              this._activeView = defaultView;
              this.view = defaultView;
            }
            // If acceptedViews is empty, keep current view (no valid views configured)
          }
          if (saved.filter && Array.isArray(saved.filter)) {
            const filters: Record<string, unknown> = {};
            for (const item of saved.filter) {
              filters[item.field] = item.value;
            }
            this._filters = filters;
            this._emitStateEvent('fv-filter-change', { filters: this._filters } as FvFilterChangeDetail);
          }
          if (saved.sort && typeof saved.sort === 'object') {
            const { field, direction } = saved.sort as { field: string; direction: 'asc' | 'desc' };
            if (field && (direction === 'asc' || direction === 'desc')) {
              this._sortCriteria = [{ field, direction }];
              this._emitStateEvent('fv-sort-change', { sorts: this._sortCriteria });
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

    // Determine acceptedViews from field configurations
    const acceptedViews: string[] = [];
    if (this._fieldGrids && this._fieldGrids.length > 0) acceptedViews.push('grid');
    if (this._fieldRows && this._fieldRows.length > 0) acceptedViews.push('list');
    if (this._fieldCards && this._fieldCards.length > 0) acceptedViews.push('cards');

    const urlView = this.syncUrl ? this._getUrlView() : null;
    let saved = readState(this.storageKey);

    if (this.storageKey && !saved) {
      const initialState = { views: null, sort: null, filter: null };
      writeState(this.storageKey, initialState);
      saved = initialState;
    }

    // Determine initial view with acceptedViews priority
    let initialView: View | null = null;

    if (urlView && acceptedViews.includes(urlView)) {
      initialView = urlView;
    } else if (saved?.views && acceptedViews.includes(saved.views as string)) {
      initialView = saved.views as View;
    } else {
      const attrView = this.getAttribute('view');
      if (attrView && acceptedViews.includes(attrView)) {
        initialView = attrView as View;
      }
    }

    // Default to first accepted view or 'grid' as fallback
    if (!initialView) {
      initialView = acceptedViews.length > 0 ? acceptedViews[0] as View : 'grid';
    }

    this._activeView = initialView;
    this.view = initialView;

    if (saved?.sort) {
      this._sortCriteria = [{ field: saved.sort.field, direction: saved.sort.direction as 'asc' | 'desc' }];
    }

    if (this.syncUrl) {
      const urlSorts = readSortFromUrl();
      if (urlSorts.length > 0) {
        this._sortCriteria = urlSorts;
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

    // Emit initial state so external action components can sync on connect
    this._emitStateEvent('fv-sort-change', { sorts: this._sortCriteria });
    this._emitStateEvent('fv-filter-change', { filters: this._filters } as FvFilterChangeDetail);

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
    return applySort(applyFilters(this._registers, this._filters), this._sortCriteria);
  }

  render() {
    const data = this._processedData;

    // Determine which views are available based on field configurations
    const acceptedViews: string[] = [];
    if (this._fieldGrids && this._fieldGrids.length > 0) acceptedViews.push('grid');
    if (this._fieldRows && this._fieldRows.length > 0) acceptedViews.push('list');
    if (this._fieldCards && this._fieldCards.length > 0) acceptedViews.push('cards');

    // Determine active view: default to first accepted view, or 'grid' as fallback
    let activeView: View;
    if (acceptedViews.length > 0) {
      activeView = acceptedViews.includes(this._activeView) ? this._activeView : acceptedViews[0] as View;
    } else {
      activeView = this._activeView && ['grid', 'list', 'cards'].includes(this._activeView) ? this._activeView : 'grid';
    }

    // Show switcher only when there are multiple accepted views
    const showSwitcher = this.showSwitcher && acceptedViews.length > 1;

    return html`
      ${this.showSearch || showSwitcher ? html`
        <div class="controls">
          ${this.showSearch ? html`<fv-search placeholder="Search..." debounce></fv-search>` : ''}
          ${showSwitcher ? html`<fv-switcher .activeView=${activeView} .targetFor=${this.id} .acceptedViews=${acceptedViews}></fv-switcher>` : ''}
        </div>
      ` : ''}
      ${this._renderView(data)}
    `;
  }

  private _renderView(data: T[]) {
    const fieldGrids = this._fieldGrids;
    const fieldRows = this._fieldRows;
    const fieldCards = this._fieldCards;
    switch (this._activeView) {
      case 'list':
        return html`<fv-list .registers=${data} .fieldRows=${fieldRows}></fv-list>`;
      case 'cards':
        return html`<fv-cards .registers=${data} .fieldCards=${fieldCards}></fv-cards>`;
      default:
        return html`<fv-grid
          .registers=${data}
          .fieldGrids=${fieldGrids}
          .currentSorts=${this._sortCriteria}
          .currentFilters=${this._filters}
        ></fv-grid>`;
    }
  }
}
