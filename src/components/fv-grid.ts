import { LitElement, html, css } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import type { ColumnConfig, SortChangeDetail, FilterChangeDetail } from '../types.js';
import { resolveControl } from '../registry.js';

@customElement('fv-grid')
export class FvGrid<T = Record<string, unknown>> extends LitElement {
  static styles = css`
    :host { display: block; overflow-x: auto; }
    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 13px;
      background: var(--fv-bg, #fff);
    }
    th {
      background: var(--fv-header-bg, #fafafa);
      border-bottom: 2px solid var(--fv-border, #f0f0f0);
      padding: 12px 16px;
      text-align: left;
      font-weight: 600;
      font-size: 12px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: #666;
      position: relative;
    }
    th.sorted { color: #111; }
    .fv-header-trigger {
      background: none;
      border: none;
      cursor: pointer;
      padding: 0;
      font: inherit;
      font-weight: 600;
      font-size: 12px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: inherit;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 4px;
      width: 100%;
    }
    .fv-header-trigger:hover { color: #111; }
    .header-indicators {
      display: flex;
      align-items: center;
      gap: 4px;
    }
    .sort-indicator {
      font-size: 12px;
      color: #666;
    }
    .filter-indicator {
      color: #1976d2;
      font-size: 10px;
    }
    td {
      border-bottom: 1px solid var(--fv-border, #f5f5f5);
      padding: 12px 16px;
      color: #333;
    }
    tr:hover td { background: var(--fv-row-hover, #fafafa); }
  `;

  @property({ attribute: false }) data: T[] = [];
  @property({ attribute: false }) columns: ColumnConfig<T>[] = [];
  @property({ attribute: false }) currentSort: SortChangeDetail | null = null;
  @property({ attribute: false }) currentFilters: Record<string, unknown> = {};

  updated(changed: Map<string, unknown>) {
    if (changed.has('columns')) {
      this.columns.forEach(col => resolveControl(col.control || 'fv-text'));
    }
  }

  render() {
    return html`
      <table>
        <thead>
          <tr>${this.columns.map(col => this._renderHeader(col))}</tr>
        </thead>
        <tbody>
          ${this.data.map((row, i) => html`
            <tr>${this.columns.map(col => this._renderCell(row, col, i))}</tr>
          `)}
        </tbody>
      </table>
    `;
  }

  private _renderHeader(col: ColumnConfig<T>) {
    const field = col.field != null ? String(col.field) : col.title;
    const isSorted = this.currentSort?.field === field && this.currentSort?.direction != null;
    const hasFilter = this.currentFilters[field] != null && this.currentFilters[field] !== undefined;

    const sortClass = isSorted ? 'sorted' : '';
    const sortIndicator = isSorted
      ? (this.currentSort!.direction === 'asc' ? '↑' : '↓')
      : '';
    const filterIndicator = hasFilter ? '●' : '';

    return html`
      <th class=${sortClass}>
        <button
          class="fv-header-trigger"
          @click=${() => this._onHeaderClick(col)}
          data-field=${field}
        >
          <span class="header-label">${col.title}</span>
          <span class="header-indicators">
            ${sortIndicator ? html`<span class="sort-indicator">${sortIndicator}</span>` : ''}
            ${filterIndicator ? html`<span class="filter-indicator">${filterIndicator}</span>` : ''}
          </span>
        </button>
      </th>
    `;
  }

  private _onHeaderClick(col: ColumnConfig<T>) {
    const field = col.field != null ? String(col.field) : col.title;
    this.dispatchEvent(
      new CustomEvent('header-menu-open', {
        detail: { column: col, field, anchor: this._getHeaderButton(field) },
        bubbles: true,
        composed: true,
      })
    );
  }

  private _getHeaderButton(field: string): HTMLElement | null {
    return this.shadowRoot?.querySelector(`button[data-field="${field}"]`) ?? null;
  }

  private _renderCell(row: T, col: ColumnConfig<T>, index: number) {
    const visible =
      typeof col.visible === 'function'
        ? col.visible(row, index, this.data)
        : col.visible !== false;
    if (!visible) return html`<td></td>`;

    const field = col.field as string;
    const value = field ? row[field] : '';

    let displayValue = String(value ?? '');

    const control = col.control || 'fv-text';
    if (control === 'fv-date' && value) {
      const date = new Date(value as string);
      if (!isNaN(date.getTime())) {
        displayValue = date.toLocaleDateString();
      }
    } else if (control === 'fv-number' && value != null) {
      displayValue = Number(value).toLocaleString();
    }

    return html`<td>${displayValue}</td>`;
  }

  _emitFilter(col: ColumnConfig<T>, value: string) {
    const field = String(col.field ?? col.title);
    this.dispatchEvent(
      new CustomEvent<FilterChangeDetail>('filter-change', {
        detail: { field, value },
        bubbles: true,
        composed: true,
      })
    );
  }
}
