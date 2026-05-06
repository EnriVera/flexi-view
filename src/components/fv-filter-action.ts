import { LitElement, html, css } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import type { FilterChangeDetail } from '../types.js';
import { subscribeConfig } from '../registry.js';

@customElement('fv-filter-action')
export class FvFilterAction extends LitElement {
  static styles = css`
    :host { display: block; }
    .option {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 4px 2px;
      cursor: pointer;
      font-size: 13px;
      border-radius: 4px;
      user-select: none;
    }
    .option:hover { background: var(--fv-row-hover, #f5f5f5); }
    input[type='checkbox'] { cursor: pointer; accent-color: var(--fv-accent, #111); }
    .empty { font-size: 12px; color: var(--fv-text-muted, #666); padding: 4px 0; }
  `;

  @property() field = '';
  @property({ attribute: false }) selected: string[] = [];
  @property({ attribute: false }) options: string[] = [];

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
    if (!this.options.length) return html`<p class="empty">No values</p>`;
    return html`
      ${this.options.map(opt => html`
        <label class="option">
          <input
            type="checkbox"
            .checked=${this.selected.includes(opt)}
            @change=${(e: Event) => this._onChange(opt, (e.target as HTMLInputElement).checked)}
          />
          ${opt}
        </label>
      `)}
    `;
  }

  private _onChange(opt: string, checked: boolean) {
    const next = checked
      ? [...this.selected, opt]
      : this.selected.filter(v => v !== opt);

    this.dispatchEvent(
      new CustomEvent<FilterChangeDetail>('filter-change', {
        detail: { field: this.field, value: next.length ? next : null },
        bubbles: true,
        composed: true,
      })
    );
  }
}
