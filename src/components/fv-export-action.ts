import { LitElement, html, css } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { unsafeHTML } from 'lit/directives/unsafe-html.js';
import type { ColumnConfig, ExportFormat, ExportRequestDetail } from '../types.js';
import { exportCSV, exportXLSX } from '../lib/export.js';
import { getGridConfig, subscribeConfig, getFlexiConfig } from '../registry.js';

@customElement('fv-export-action')
export class FvExportAction extends LitElement {
  static styles = css`
    :host { display: block; }
    button {
      background: none;
      border: 1px solid var(--fv-border, #e0e0e0);
      border-radius: 4px;
      padding: 4px 10px;
      cursor: pointer;
      font-size: 12px;
      width: 100%;
      text-align: left;
      display: flex;
      align-items: center;
      gap: 6px;
      color: var(--fv-text, #333);
    }
    button:hover { background: var(--fv-row-hover, #f5f5f5); }
  `;

  @property() format: ExportFormat = 'csv';
  @property() filename = 'export';
  @property({ attribute: false }) registers: Record<string, unknown>[] = [];
  @property({ attribute: false }) fieldGrids: ColumnConfig[] = [];

  private _unsubscribeConfig?: () => void;

  connectedCallback() {
    super.connectedCallback();
    this._unsubscribeConfig = subscribeConfig(() => this.requestUpdate());
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this._unsubscribeConfig?.();
  }

  render() {
    const icons = getFlexiConfig().icons;
    const label = this.format === 'csv' ? 'Export CSV' : 'Export XLSX';
    return html`
      <button @click=${this._onClick}>
        ${unsafeHTML(icons.export || '<span>↓</span>')}
        ${label}
      </button>
    `;
  }

  private async _onClick() {
    const detail: ExportRequestDetail = {
      format: this.format,
      columns: this.fieldGrids,
      rows: this.registers,
    };

    this.dispatchEvent(
      new CustomEvent<ExportRequestDetail>('fv-export-request', {
        detail,
        bubbles: true,
        composed: true,
      })
    );

    try {
      if (this.format === 'csv') {
        exportCSV(this.registers, this.fieldGrids, this.filename);
      } else {
        const config = getGridConfig();
        const loader = config.export?.excelLibrary;
        if (!loader) throw new Error('No excelLibrary configured');
        await exportXLSX(this.registers, this.fieldGrids, this.filename, loader as Parameters<typeof exportXLSX>[3]);
      }

      this.dispatchEvent(
        new CustomEvent('fv-export-done', { bubbles: true, composed: true })
      );
    } catch (err) {
      this.dispatchEvent(
        new CustomEvent('fv-export-error', {
          detail: { error: err },
          bubbles: true,
          composed: true,
        })
      );
    }
  }
}
