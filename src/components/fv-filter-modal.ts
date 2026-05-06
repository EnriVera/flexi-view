import { LitElement, html, css } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { unsafeHTML } from 'lit/directives/unsafe-html.js';
import type { FilterChangeDetail } from '../types.js';
import { subscribeConfig, getFlexiConfig } from '../registry.js';
import { t } from '../i18n/index.js';

@customElement('fv-filter-modal')
export class FvFilterModal extends LitElement {
  static styles = css`
    :host { display: block; }

    .backdrop {
      position: fixed;
      inset: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      background: rgba(0, 0, 0, 0.5);
      z-index: 100000;
    }

    .modal {
      background: var(--fv-bg, #fff);
      border: 1px solid var(--fv-border, #e0e0e0);
      border-radius: 8px;
      width: min(320px, 90vw);
      max-height: min(400px, 80vh);
      display: flex;
      flex-direction: column;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
    }

    .header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 12px 16px;
      border-bottom: 1px solid var(--fv-border, #e0e0e0);
      font-weight: 600;
      font-size: 14px;
    }

    .close-btn {
      background: none;
      border: none;
      cursor: pointer;
      padding: 4px;
      font-size: 18px;
      line-height: 1;
      color: var(--fv-text-muted, #666);
      border-radius: 4px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
    }

    .close-btn:hover {
      background: var(--fv-row-hover, #f5f5f5);
    }

    .options {
      flex: 1;
      overflow-y: auto;
      padding: 8px 0;
    }

    .option {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 8px 16px;
      cursor: pointer;
      font-size: 13px;
      border-radius: 4px;
      user-select: none;
    }

    .option:hover {
      background: var(--fv-row-hover, #f5f5f5);
    }

    input[type='checkbox'] {
      cursor: pointer;
      accent-color: var(--fv-accent, #111);
    }

    .empty {
      font-size: 13px;
      color: var(--fv-text-muted, #666);
      padding: 16px;
      text-align: center;
    }

    .footer {
      display: flex;
      gap: 8px;
      padding: 12px 16px;
      border-top: 1px solid var(--fv-border, #e0e0e0);
      justify-content: flex-end;
    }

    .btn {
      padding: 6px 12px;
      border-radius: 4px;
      cursor: pointer;
      font-size: 13px;
      border: 1px solid var(--fv-border, #e0e0e0);
      background: var(--fv-bg, #fff);
      color: var(--fv-text, #333);
    }

    .btn:hover {
      background: var(--fv-row-hover, #f5f5f5);
    }

    .btn-primary {
      background: var(--fv-primary, #1976d2);
      color: #fff;
      border-color: var(--fv-primary, #1976d2);
    }

    .btn-primary:hover {
      opacity: 0.9;
    }
  `;

  @property() field = '';
  @property({ attribute: false }) options: string[] = [];
  @property({ attribute: false }) selected: string[] = [];
  @property({ attribute: false }) open = false;

  @state() private _selected: string[] = [];
  private _keydownHandler?: (e: KeyboardEvent) => void;
  private _unsubscribeConfig?: () => void;

  connectedCallback() {
    super.connectedCallback();
    this._unsubscribeConfig = subscribeConfig(() => this.requestUpdate());
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this._unsubscribeConfig?.();
    this._detachKeydownListener();
  }

  willUpdate(changedProperties: Map<string, unknown>) {
    if (changedProperties.has('open') && this.open) {
      this._selected = [...this.selected];
      this._attachKeydownListener();
    } else if (changedProperties.has('open') && !this.open) {
      this._detachKeydownListener();
    }
  }

  private _attachKeydownListener() {
    this._keydownHandler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') this._close();
    };
    document.addEventListener('keydown', this._keydownHandler, true);
  }

  private _detachKeydownListener() {
    if (this._keydownHandler) {
      document.removeEventListener('keydown', this._keydownHandler, true);
    }
  }

  render() {
    if (!this.open) return html``;

    const icons = getFlexiConfig().icons;

    const i18n = t();
    return html`
      <div class="backdrop" @click=${this._onBackdropClick}>
        <div class="modal" @click=${(e: Event) => e.stopPropagation()}>
          <div class="header">
            <span>${i18n.filter.title}: ${this.field}</span>
            <button class="close-btn" @click=${this._close}>${unsafeHTML(icons.close || '<span>✕</span>')}</button>
          </div>
          <div class="options">
            ${this.options.length === 0
              ? html`<p class="empty">${i18n.filter.noValues}</p>`
              : this.options.map(opt => html`
                  <label class="option">
                    <input
                      type="checkbox"
                      .checked=${this._selected.includes(opt)}
                      @change=${(e: Event) => this._onChange(opt, (e.target as HTMLInputElement).checked)}
                    />
                    ${opt}
                  </label>
                `)}
          </div>
          <div class="footer">
            <button class="btn" @click=${this._onClear}>${i18n.filter.clear}</button>
            <button class="btn btn-primary" @click=${this._onApply}>${i18n.filter.apply}</button>
          </div>
        </div>
      </div>
    `;
  }

  private _onChange(opt: string, checked: boolean) {
    this._selected = checked
      ? [...this._selected, opt]
      : this._selected.filter(v => v !== opt);
  }

  private _onClear() {
    this._selected = [];
    this._dispatchChange();
    this.open = false;
  }

  private _onApply() {
    this._dispatchChange();
    this._close();
  }

  private _dispatchChange() {
    const value = this._selected.length ? this._selected : null;
    this.dispatchEvent(
      new CustomEvent<FilterChangeDetail>('filter-change', {
        detail: { field: this.field, value },
        bubbles: true,
        composed: true,
      })
    );
  }

  private _onBackdropClick() {
    this._close();
  }

  private _close() {
    this.open = false;
    this.dispatchEvent(
      new CustomEvent('modal-close', {
        bubbles: true,
        composed: true,
      })
    );
  }
}
