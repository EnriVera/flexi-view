import { LitElement, html, css } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import type { ColumnConfig, SortChangeDetail, FilterChangeDetail } from '../types.js';
import { resolveControl } from '../registry.js';

@customElement('data-grid')
export class DataGrid<T = Record<string, unknown>> extends LitElement {
  static styles = css`
    :host { display: block; overflow-x: auto; }
    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 13px;
      background: var(--dv-bg, #fff);
    }
    th {
      background: var(--dv-header-bg, #fafafa);
      border-bottom: 2px solid var(--dv-border, #f0f0f0);
      padding: 12px 16px;
      text-align: left;
      font-weight: 600;
      font-size: 12px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: #666;
    }
    th.sortable { cursor: pointer; user-select: none; }
    th.sortable:hover { background: #f5f5f5; }
    th.sorted { color: #111; }
    td {
      border-bottom: 1px solid var(--dv-border, #f5f5f5);
      padding: 12px 16px;
      color: #333;
    }
    tr:hover td { background: var(--dv-row-hover, #fafafa); }
    input[type='text'] {
      width: 100%;
      box-sizing: border-box;
      border: 1px solid var(--dv-border, #e0e0e0);
      border-radius: 4px;
      padding: 6px 10px;
      font-size: 12px;
      background: var(--dv-bg, #fff);
    }
    input[type='text']:focus {
      outline: none;
      border-color: #333;
    }
  `;

  @property({ attribute: false }) data: T[] = [];
  @property({ attribute: false }) columns: ColumnConfig<T>[] = [];

  private _sortField?: string;
  private _sortDir: 'asc' | 'desc' = 'asc';

  updated(changed: Map<string, unknown>) {
    if (changed.has('columns')) {
      this.columns.forEach(col => resolveControl(col.control));
    }
  }

  private get _hasFilterableColumns(): boolean {
    return this.columns.some(col => col.filterable);
  }

  render() {
    return html`
      <table>
        <thead>
          <tr>${this.columns.map(col => this._renderHeader(col))}</tr>
          ${this._hasFilterableColumns
            ? html`<tr>${this.columns.map(col => this._renderFilterCell(col))}</tr>`
            : ''}
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
    const isSorted = col.field != null && String(col.field) === this._sortField;
    const sortClass = isSorted ? 'sortable sorted' : (col.sortable ? 'sortable' : '');
    return html`
      <th class=${sortClass}>
        <span @click=${col.sortable ? () => this._sort(col) : undefined}>
          ${col.title}${isSorted ? (this._sortDir === 'asc' ? ' ↑' : ' ↓') : ''}
        </span>
      </th>
    `;
  }

  private _renderFilterCell(col: ColumnConfig<T>) {
    if (!col.filterable) return html`<th></th>`;
    return html`
      <th>
        <input
          type="text"
          placeholder="Filter…"
          @input=${(e: Event) =>
            this._emitFilter(col, (e.target as HTMLInputElement).value)}
        />
      </th>
    `;
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
    
    if (col.control === 'dv-date' && value) {
      const date = new Date(value as string);
      if (!isNaN(date.getTime())) {
        displayValue = date.toLocaleDateString();
      }
    } else if (col.control === 'dv-number' && value != null) {
      displayValue = Number(value).toLocaleString();
    }
    
    return html`<td>${displayValue}</td>`;
  }

  private _sort(col: ColumnConfig<T>) {
    const field = String(col.field ?? col.title);
    if (this._sortField === field) {
      this._sortDir = this._sortDir === 'asc' ? 'desc' : 'asc';
    } else {
      this._sortField = field;
      this._sortDir = 'asc';
    }
    this.requestUpdate();
    this.dispatchEvent(
      new CustomEvent<SortChangeDetail>('sort-change', {
        detail: { field, direction: this._sortDir },
        bubbles: true,
        composed: true,
      })
    );
  }

  private _emitFilter(col: ColumnConfig<T>, value: string) {
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