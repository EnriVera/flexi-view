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
  @property({ attribute: 'for' }) for?: string;

  private _unsubscribeConfig?: () => void;
  private _target: (HTMLElement & Record<string, unknown>) | null = null;
  private _onSortChangeFromView?: (e: Event) => void;

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
      console.warn(`[fv-sort-action] Could not find element with id "${this.for}"`);
      return;
    }
    this._target = target;

    // Read initial sort state
    const currentSort = (target as any).currentSort as SortChangeDetail | null;
    if (currentSort && currentSort.field === this.field) {
      this.active = true;
      this.direction = currentSort.direction ?? this.direction;
    }

    // Subscribe to outbound sort events from fv-view
    this._onSortChangeFromView = (e: Event) => {
      const detail = (e as CustomEvent<SortChangeDetail | null>).detail;
      if (detail && detail.field === this.field) {
        this.active = true;
        this.direction = detail.direction ?? this.direction;
      } else {
        this.active = false;
      }
      this.requestUpdate();
    };
    target.addEventListener('fv-sort-change', this._onSortChangeFromView);
  }

  private _disconnectExternal() {
    if (this._target && this._onSortChangeFromView) {
      this._target.removeEventListener('fv-sort-change', this._onSortChangeFromView);
    }
    this._target = null;
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this._unsubscribeConfig?.();
    this._disconnectExternal();
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
    const detail: SortChangeDetail = { field: this.field, direction: this.active ? null : this.direction };
    this.dispatchEvent(
      new CustomEvent<SortChangeDetail>('sort-change', {
        detail,
        bubbles: true,
        composed: true,
      })
    );
    if (this._target) {
      this._target.dispatchEvent(
        new CustomEvent<SortChangeDetail>('sort-change', {
          detail,
          bubbles: false,
          composed: false,
        })
      );
    }
  }
}
