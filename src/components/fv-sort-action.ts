import { LitElement, html, css } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { unsafeHTML } from 'lit/directives/unsafe-html.js';
import type { SortChangeDetail } from '../types.js';
import { subscribeConfig, getFlexiConfig } from '../registry.js';
import { t } from '../i18n/index.js';

@customElement('fv-sort-action')
export class FvSortAction extends LitElement {
  static styles = css`
    :host { display: inline-block; }
    button {
      background: none;
      border: 1px solid var(--fv-border, #e0e0e0);
      border-radius: 4px;
      padding: 4px 10px;
      cursor: pointer;
      font-size: 12px;
      display: flex;
      align-items: center;
      gap: 6px;
      width: 100%;
      color: var(--fv-text, #333);
    }
    .label {
      font-size: 12px;
      font-weight: 500;
    }
    button[aria-pressed='true'] {
      background: var(--fv-accent, #111);
      color: #fff;
      border-color: var(--fv-accent, #111);
    }
    button:hover { background: var(--fv-row-hover, #f5f5f5); }
    button[aria-pressed='true']:hover { background: var(--fv-text-muted, #666); }
  `;

  @property() field = '';
  @property() direction: 'asc' | 'desc' = 'asc';
  @property({ type: Boolean }) active = false;

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
    const icon = this.direction === 'asc' ? icons.sortAsc : icons.sortDesc;
    const safeIcon = icon || '<span>↕</span>';
    const label = this.direction === 'asc' ? t().sort.asc : t().sort.desc;
    return html`
      <button
        aria-pressed=${String(this.active)}
        title=${label}
        @click=${this._onClick}
      >
        ${unsafeHTML(safeIcon)}
        <span class="label">${label}</span>
      </button>
    `;
  }

  private _onClick() {
    this.dispatchEvent(
      new CustomEvent<SortChangeDetail>('sort-change', {
        detail: { field: this.field, direction: this.active ? null : this.direction },
        bubbles: true,
        composed: true,
      })
    );
  }
}
