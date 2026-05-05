import { LitElement, html, css } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import type { ColumnConfig, RowClickDetail } from '../types.js';
import { resolveControl } from '../registry.js';

@customElement('fv-list')
export class FvList<T = Record<string, unknown>> extends LitElement {
  static styles = css`
    :host { display: block; }
    ul { list-style: none; margin: 0; padding: 0; }
    li {
      display: flex;
      align-items: center;
      padding: 14px 20px;
      border-bottom: 1px solid var(--fv-border, #f0f0f0);
      cursor: pointer;
      font-size: 13px;
      background: var(--fv-bg, #fff);
      transition: background 0.15s ease;
    }
    li:hover { background: var(--fv-row-hover, #fafafa); }
    .cell {
      flex: 1;
      color: #333;
      padding: 0 8px;
    }
    .cell:first-child { padding-left: 0; }
    .cell:last-child { padding-right: 0; }
  `;

  @property({ attribute: false }) data: T[] = [];
  @property({ attribute: false }) columns: ColumnConfig<T>[] = [];

  updated(changed: Map<string, unknown>) {
    if (changed.has('columns')) {
      this.columns.forEach(col => resolveControl(col.control));
    }
  }

  render() {
    return html`
      <ul>
        ${this.data.map(
          (row, i) => html`
            <li @click=${() => this._rowClick(row, i)}>
              ${this.columns.map(col => this._renderCell(row, col, i))}
            </li>
          `
        )}
      </ul>
    `;
  }

  private _renderCell(row: T, col: ColumnConfig<T>, index: number) {
    const visible =
      typeof col.visible === 'function'
        ? col.visible(row, index, this.data)
        : col.visible !== false;
    if (!visible) return html``;

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
    
    return html`<span class="cell">${displayValue}</span>`;
  }

  private _rowClick(item: T, index: number) {
    this.dispatchEvent(
      new CustomEvent<RowClickDetail<T>>('row-click', {
        detail: { item, index },
        bubbles: true,
        composed: true,
      })
    );
  }
}