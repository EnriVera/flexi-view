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
  @property({ attribute: 'for' }) for?: string;

  private _unsubscribeConfig?: () => void;
  private _target: (HTMLElement & Record<string, unknown>) | null = null;
  private _onFilterChangeFromView?: (e: Event) => void;

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
      console.warn(`[fv-filter-action] Could not find element with id "${this.for}"`);
      return;
    }
    this._target = target;

    // Compute options from full registers dataset (one-shot at connect — v1 limitation)
    const registers = ((target as any).registers ?? []) as Record<string, unknown>[];
    const uniqueValues = [...new Set(
      registers
        .map(r => r[this.field])
        .filter(v => v != null)
        .map(String)
    )];
    this.options = uniqueValues;

    // Read initial selected from currentFilters
    const currentFilters = ((target as any).currentFilters ?? {}) as Record<string, unknown>;
    const initial = currentFilters[this.field];
    if (Array.isArray(initial)) {
      this.selected = initial.map(String);
    } else if (initial != null) {
      this.selected = [String(initial)];
    }

    // Subscribe to outbound filter events from fv-view
    this._onFilterChangeFromView = (e: Event) => {
      const { filters } = (e as CustomEvent<{ filters: Record<string, unknown> }>).detail;
      const value = filters[this.field];
      if (Array.isArray(value)) {
        this.selected = value.map(String);
      } else if (value != null) {
        this.selected = [String(value)];
      } else {
        this.selected = [];
      }
      this.requestUpdate();
    };
    target.addEventListener('fv-filter-change', this._onFilterChangeFromView);
  }

  private _disconnectExternal() {
    if (this._target && this._onFilterChangeFromView) {
      this._target.removeEventListener('fv-filter-change', this._onFilterChangeFromView);
    }
    this._target = null;
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this._unsubscribeConfig?.();
    this._disconnectExternal();
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

    const detail: FilterChangeDetail = { field: this.field, value: next.length ? next : null };
    this.dispatchEvent(
      new CustomEvent<FilterChangeDetail>('filter-change', {
        detail,
        bubbles: true,
        composed: true,
      })
    );
    if (this._target) {
      this._target.dispatchEvent(
        new CustomEvent<FilterChangeDetail>('filter-change', {
          detail,
          bubbles: false,
          composed: false,
        })
      );
    }
  }
}
