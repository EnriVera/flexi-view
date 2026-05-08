import { LitElement, html, css } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { unsafeHTML } from 'lit/directives/unsafe-html.js';
import type { ColumnConfig, ExportFormat, ExportRequestDetail } from '../types.js';
import { exportCSV, exportXLSX } from '../lib/export.js';
import { getGridConfig, subscribeConfig, getFlexiConfig } from '../registry.js';

@customElement('fv-export-action')
export class FvExportAction extends LitElement {
  static styles = css`
    :host { display: inline-block; }
    .chip {
      display: inline-flex;
      align-items: stretch;
      border: 1px solid var(--fv-border, #e0e0e0);
      border-radius: 4px;
      overflow: hidden;
    }
    button {
      background: none;
      border: none;
      cursor: pointer;
      font-size: 12px;
      color: var(--fv-text, #333);
      font: inherit;
    }
    button.main {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 4px 10px;
      font-weight: 500;
    }
    button.main:hover { background: var(--fv-row-hover, #f5f5f5); }
    button.clear {
      border-left: 1px solid var(--fv-border, #e0e0e0);
      padding: 4px 8px;
    }
    button.clear:hover { background: var(--fv-row-hover, #f5f5f5); }
    button:focus-visible { outline: 2px solid var(--fv-accent, #111); outline-offset: -2px; }

    /* Dropdown */
    .dropdown { position: relative; display: inline-block; }
    .dropdown-menu {
      position: absolute;
      top: 100%;
      right: 0;
      margin-top: 4px;
      background: var(--fv-bg, #fff);
      border: 1px solid var(--fv-border, #e0e0e0);
      border-radius: 4px;
      min-width: 100px;
      z-index: 1000;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }
    .dropdown-item {
      display: block;
      width: 100%;
      padding: 6px 12px;
      text-align: left;
      border: none;
      background: none;
      cursor: pointer;
      font-size: 12px;
      color: var(--fv-text, #333);
    }
    .dropdown-item:hover { background: var(--fv-row-hover, #f5f5f5); }
  `;

  @property() format: ExportFormat = 'csv';
  @property() filename = 'export';
  @property({ attribute: false }) registers: Record<string, unknown>[] = [];
  @property({ attribute: false }) fieldGrids: ColumnConfig[] = [];
  @property({ attribute: 'for' }) for?: string;
  @property({ type: Boolean, attribute: 'internal-mode' }) internalMode = false;

  @property({ attribute: false }) selectedFormat: ExportFormat = 'csv';

  private _unsubscribeConfig?: () => void;
  private _target: (HTMLElement & Record<string, unknown>) | null = null;
  @state() private _dropdownOpen = false;

  connectedCallback() {
    super.connectedCallback();
    this._unsubscribeConfig = subscribeConfig(() => this.requestUpdate());
  }

  firstUpdated() {
    if (this.for && !this.internalMode) {
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
    return html`
      <div class="chip" part="chip">
        <button class="main" part="main" @click=${this._toggleDropdown}>
          ${unsafeHTML(icons.export || '<span>↓</span>')}
          <span>Export</span>
        </button>
      </div>

      ${this._dropdownOpen ? html`
        <div class="dropdown-menu">
          <button class="dropdown-item" @click=${() => this._selectFormat('csv')}>CSV</button>
          <button class="dropdown-item" @click=${() => this._selectFormat('json')}>JSON</button>
          <button class="dropdown-item" @click=${() => this._selectFormat('xlsx')}>XLSX</button>
        </div>
      ` : ''}
    `;
  }

  private _toggleDropdown = (e: Event) => {
    e.stopPropagation();
    this._dropdownOpen = !this._dropdownOpen;
  };

  // Backward-compatible click handler (used by external/legacy code)
  private async _onClick() {
    await this._doExport(this.format);
  }

  private _selectFormat(format: string) {
    this.selectedFormat = format as ExportFormat;
    this._dropdownOpen = false;
    this._doExport(format);
  }

  private async _doExport(format: string) {
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
      format,
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
      if (format === 'csv') {
        exportCSV(rows, columns, this.filename);
      } else if (format === 'json') {
        // JSON export: serialize rows as JSON
        const json = JSON.stringify(rows, null, 2);
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${this.filename}.json`;
        a.click();
        URL.revokeObjectURL(url);
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
