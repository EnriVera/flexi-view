import { LitElement, html, css } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { unsafeHTML } from 'lit/directives/unsafe-html.js';
import type { ColumnConfig, SortChangeDetail, FilterChangeDetail, HeaderMenuElement } from '../types.js';
import { subscribeConfig, getFlexiConfig } from '../registry.js';
import { t } from '../i18n/index.js';
import './fv-sort-button.js';
import './fv-filter-action.js';
import './fv-filter-modal.js';
import './fv-export-action.js';

@customElement('fv-header-menu')
export class FvHeaderMenu<T = Record<string, unknown>>
  extends LitElement
  implements HeaderMenuElement<T>
{
static styles = css`
    :host { display: block; }
    [popover] {
      position: fixed;
      margin: 0;
      padding: 8px;
      border: 1px solid var(--fv-border, #e0e0e0);
      border-radius: 6px;
      background: var(--fv-bg, #fff);
      box-shadow: 0 4px 16px rgba(0,0,0,0.12);
      min-width: 160px;
      z-index: 9999;
    }
    .menu-section {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }
    .menu-section + .menu-section {
      margin-top: 8px;
      padding-top: 8px;
      border-top: 1px solid var(--fv-border, #f0f0f0);
    }
    .see-all-btn {
      padding: 6px 12px;
      border-radius: 4px;
      cursor: pointer;
      font-size: 13px;
      border: 1px solid var(--fv-border, #e0e0e0);
      background: var(--fv-bg, #fff);
      color: var(--fv-text, #333);
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .see-all-btn:hover {
      background: var(--fv-row-hover, #f5f5f5);
    }
    .clear-btn {
      color: var(--fv-danger, #d32f2f);
      border-color: var(--fv-danger, #d32f2f);
    }
    .clear-btn:hover {
      background: color-mix(in srgb, var(--fv-danger, #d32f2f) 10%, transparent);
    }
  `;

  @property({ attribute: false }) column: ColumnConfig<T> = { title: '' };
  @property({ attribute: false }) fieldGrids: ColumnConfig<T>[] = [];
  @property({ attribute: false }) registers: T[] = [];
  @property({ attribute: false }) filteredData: T[] = [];
  @property({ attribute: false }) currentSort: SortChangeDetail | null = null;
  @property({ attribute: false }) currentFilters: Record<string, unknown> = {};
  @property({ attribute: false }) anchor: HTMLElement | null = null;

  @state() private _isOpen = false;
  private _filterModalEl: HTMLElement & { close(): void } | null = null;

  private _popoverEl: HTMLElement | null = null;
  private _outsideClickHandler?: (e: MouseEvent) => void;
  private _keydownHandler?: (e: KeyboardEvent) => void;
  private _unsubscribeConfig?: () => void;

  connectedCallback() {
    super.connectedCallback();
    this._unsubscribeConfig = subscribeConfig(() => this.requestUpdate());
  }

  open() {
    if (this._isOpen) return;
    this._isOpen = true;
    this.requestUpdate();
    this.updateComplete.then(() => {
      this._positionMenu();
      this._attachOutsideListeners();
    });
  }

  close() {
    if (!this._isOpen) return;
    this._filterModalEl?.close();
    this._filterModalEl = null;
    this._isOpen = false;
    this._detachOutsideListeners();
    this.requestUpdate();
  }

  private _openFilterModal() {
    if (this._filterModalEl) return;

    const field = this.column.field != null ? String(this.column.field) : this.column.title;
    const currentSelected = (this.currentFilters[field] as string[] | undefined) ?? [];
    const uniqueOptions = [...new Set(
      (this.registers as Record<string, unknown>[]).map(row => String(row[field] ?? ''))
    )].filter(v => v !== '').sort();

    const modal = document.createElement('fv-filter-modal') as HTMLElement & {
      field: string;
      options: string[];
      selected: string[];
      open: boolean;
      close(): void;
    };

    modal.field = field;
    modal.options = uniqueOptions;
    modal.selected = currentSelected;
    modal.open = true;

    const handleFilterChange = (e: Event) => {
      this._onFilterChange(e);
    };
    const handleModalClose = () => {
      modal.removeEventListener('filter-change', handleFilterChange);
      modal.removeEventListener('modal-close', handleModalClose);
      this._filterModalEl = null;
    };

    modal.addEventListener('filter-change', handleFilterChange);
    modal.addEventListener('modal-close', handleModalClose);

    document.body.appendChild(modal);
    this._filterModalEl = modal;
  }

  private get _allColumns(): ColumnConfig<T>[] {
    return this.fieldGrids?.length > 0 ? this.fieldGrids : [this.column];
  }

  private get _dataForExport(): T[] {
    return this.filteredData?.length > 0 ? this.filteredData : this.registers;
  }

  render() {
    if (!this._isOpen) return html``;

    const icons = getFlexiConfig().icons;
    const field = this.column.field != null ? String(this.column.field) : this.column.title;
    const currentSelected = (this.currentFilters[field] as string[] | undefined) ?? [];
    const uniqueOptions = [...new Set(
      (this.registers as Record<string, unknown>[]).map(row => String(row[field] ?? ''))
    )].filter(v => v !== '').sort();
    const isAscActive =
      this.currentSort?.field === field && this.currentSort?.direction === 'asc';
    const isDescActive =
      this.currentSort?.field === field && this.currentSort?.direction === 'desc';

    return html`
      <div
        popover="manual"
        ${this._refPopover()}
        @click=${(e: Event) => e.stopPropagation()}
      >
        <div class="menu-section">
          <fv-sort-button
            field=${field}
            direction="asc"
            ?active=${isAscActive}
            @sort-change=${this._onSortChange}
          ></fv-sort-button>
          <fv-sort-button
            field=${field}
            direction="desc"
            ?active=${isDescActive}
            @sort-change=${this._onSortChange}
          ></fv-sort-button>
        </div>
        <div class="menu-section">
          <button class="see-all-btn" @click=${this._openFilterModal}>
            ${t().filter.title}...
          </button>
          ${currentSelected.length > 0 ? html`
            <button class="see-all-btn clear-btn" @click=${this._clearFilter}>
              ${unsafeHTML(icons.clearFilter || '<span>✕</span>')}
              ${t().filter.clear} ${t().filter.title}
            </button>
          ` : ''}
        </div>
        <div class="menu-section">
          <fv-export-action
            format="csv"
            filename="data"
            .registers=${this._dataForExport as Record<string, unknown>[]}
            .fieldGrids=${this._allColumns as ColumnConfig[]}
            @fv-export-request=${this._onExportRequest}
          ></fv-export-action>
        </div>
      </div>
    `;
  }

  private _refPopover() {
    return {
      __directive: true,
      render: (part: unknown) => {
        const el = (part as { element?: HTMLElement }).element;
        if (el) this._popoverEl = el;
      },
    };
  }

  updated() {
    const popover = this.shadowRoot?.querySelector('[popover]') as HTMLElement | null;
    if (popover) this._popoverEl = popover;
    if (this._isOpen && this._popoverEl) {
      if ('showPopover' in this._popoverEl) {
        try { (this._popoverEl as any).showPopover(); } catch { /* unsupported */ }
      }
      this._positionMenu();
    }
  }

  private _positionMenu() {
    const popover = this._popoverEl;
    if (!popover || !this.anchor) return;

    const rect = this.anchor.getBoundingClientRect();
    popover.style.top = `${rect.bottom + 4}px`;
    popover.style.left = `${rect.left}px`;
  }

  private _attachOutsideListeners() {
    this._outsideClickHandler = (e: MouseEvent) => {
      if (!this.shadowRoot?.contains(e.target as Node) && e.target !== this.anchor) {
        this.close();
      }
    };
    this._keydownHandler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') this.close();
    };
    document.addEventListener('click', this._outsideClickHandler, true);
    document.addEventListener('keydown', this._keydownHandler, true);
  }

  private _detachOutsideListeners() {
    if (this._outsideClickHandler) {
      document.removeEventListener('click', this._outsideClickHandler, true);
    }
    if (this._keydownHandler) {
      document.removeEventListener('keydown', this._keydownHandler, true);
    }
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this._unsubscribeConfig?.();
    this._detachOutsideListeners();
    this._filterModalEl?.remove();
  }

  private _onSortChange(e: Event) {
    this.dispatchEvent(
      new CustomEvent('sort-change', {
        detail: (e as CustomEvent).detail,
        bubbles: true,
        composed: true,
      })
    );
    this.close();
  }

  private _onFilterChange(e: Event) {
    this.dispatchEvent(
      new CustomEvent('filter-change', {
        detail: (e as CustomEvent).detail,
        bubbles: true,
        composed: true,
      })
    );
  }

  private _clearFilter() {
    const field = this.column.field != null ? String(this.column.field) : this.column.title;
    this.dispatchEvent(
      new CustomEvent('filter-change', {
        detail: { field, value: null },
        bubbles: true,
        composed: true,
      })
    );
  }

  private _onExportRequest(e: Event) {
    this.dispatchEvent(
      new CustomEvent('fv-export-request', {
        detail: (e as CustomEvent).detail,
        bubbles: true,
        composed: true,
      })
    );
    this.close();
  }
}
