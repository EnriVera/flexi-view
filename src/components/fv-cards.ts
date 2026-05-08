import { LitElement, html, css } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import type { ColumnConfig, RowClickDetail } from '../types.js';
import { resolveControl } from '../registry.js';

@customElement('fv-cards')
export class FvCards<T = Record<string, unknown>> extends LitElement {
  static styles = css`
    :host { display: block; }
    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
      gap: 20px;
      padding: 4px;
    }
    .card {
      display: flex;
      flex-direction: column;
      padding: 20px;
      border: 1px solid var(--fv-border, #f0f0f0);
      border-radius: 8px;
      background: var(--fv-bg, #fff);
      cursor: pointer;
      font-size: 13px;
      transition: all 0.2s ease;
    }
    .card:hover {
      box-shadow: 0 2px 8px rgba(0,0,0,0.06);
      border-color: #e0e0e0;
    }
    .field {
      display: flex;
      justify-content: space-between;
      padding: 6px 0;
      border-bottom: 1px solid #fafafa;
    }
    .field:last-child { border-bottom: none; }
    .field-label {
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: #888;
      font-weight: 500;
    }
    .field-value {
      color: #333;
      font-weight: 400;
    }
  `;

  @property({ attribute: false }) registers: T[] = [];
  @property({ attribute: false }) fieldCards: ColumnConfig<T>[] = [];

  updated(changed: Map<string, unknown>) {
    if (changed.has('fieldCards')) {
      this.fieldCards.forEach(col => resolveControl(col.control || 'fv-text'));
    }
  }

  render() {
    return html`
      <div class="grid">
        ${this.registers.map(
          (row, i) => html`
            <div class="card" @click=${() => this._rowClick(row, i)}>
              ${this.fieldCards.map(col => this._renderField(row, col, i))}
            </div>
          `
        )}
      </div>
    `;
  }

  private _renderField(row: T, col: ColumnConfig<T>, index: number) {
    const visible =
      typeof col.visible === 'function'
        ? col.visible(row, index, this.registers)
        : col.visible !== false;
    if (!visible) return html``;

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
    
    return html`
      <div class="field">
        <span class="field-label">${col.title}</span>
        <span class="field-value">${displayValue}</span>
      </div>
    `;
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