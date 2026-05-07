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
  @property({ attribute: 'for' }) for?: string;

  private _unsubscribeConfig?: () => void;
  private _target: (HTMLElement & Record<string, unknown>) | null = null;

  connectedCallback() {
    super.connectedCallback();
    this._unsubscribeConfig = subscribeConfig(() => this.requestUpdate());
  }

  firstUpdated() {
    if (this.for) {
      this._connect();
    }
  }

  private async _connect() {
    await customElements.whenDefined('fv-view');
    let target = document.getElementById(this.for!) as (HTMLElement & Record<string, unknown>) | null;
    if (!target) {
      await new Promise<void>(resolve => requestAnimationFrame(() => resolve()));
      target = document.getElementById(this.for!) as (HTMLElement & Record<string, unknown>) | null;
    }
    if (!target) {
      console.warn(`[fv-export-action] Could not find element with id "${this.for}"`);
      return;
    }
    this._target = target;
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this._unsubscribeConfig?.();
    this._target = null;
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
    let rows: Record<string, unknown>[];
    let columns: ColumnConfig[];

    if (this._target) {
      rows = ((this._target as any).filteredData ?? []) as Record<string, unknown>[];
      const allColumns = ((this._target as any).columnDefs ?? []) as ColumnConfig[];
      // Respect exportable: false — only export columns where exportable is not explicitly false
      columns = allColumns.filter(col => col.exportable !== false);
    } else {
      rows = this.registers;
      columns = this.fieldGrids.filter(col => col.exportable !== false);
    }

    const detail: ExportRequestDetail = {
      format: this.format,
      columns,
      rows,
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
        exportCSV(rows, columns, this.filename);
      } else {
        const config = getGridConfig();
        const loader = config.export?.excelLibrary;
        if (!loader) throw new Error('No excelLibrary configured');
        await exportXLSX(rows, columns, this.filename, loader as Parameters<typeof exportXLSX>[3]);
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
