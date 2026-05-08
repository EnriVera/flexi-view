import { LitElement, html, css } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import type { FilterChangeDetail } from '../types.js';
import { subscribeConfig } from '../registry.js';
import { t } from '../i18n/index.js';
import './fv-filter-modal.js';

@customElement('fv-filter-action')
export class FvFilterAction extends LitElement {
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

    button.main[aria-pressed='true'] {
      background: var(--fv-accent, #111);
      color: #fff;
    }

    button.main:hover { background: var(--fv-row-hover, #f5f5f5); }
    button.main[aria-pressed='true']:hover { background: var(--fv-text-muted, #666); }

    button.clear {
      border-left: 1px solid var(--fv-border, #e0e0e0);
      padding: 4px 8px;
      line-height: 1;
      font-size: 14px;
      color: var(--fv-text-muted, #666);
    }

    button.main[aria-pressed='true'] + button.clear {
      border-left-color: var(--fv-accent, #111);
      color: rgba(255,255,255,0.8);
      background: var(--fv-accent, #111);
    }

    button.clear:hover { background: var(--fv-row-hover, #f5f5f5); color: var(--fv-text, #333); }
    button.main[aria-pressed='true'] + button.clear:hover { background: var(--fv-text-muted, #666); color: #fff; }

    button:focus-visible {
      outline: 2px solid var(--fv-accent, #111);
      outline-offset: -2px;
    }
  `;

  @property() field = '';
  @property() label = '';
  @property({ attribute: false }) selected: string[] = [];
  @property({ attribute: false }) options: string[] = [];
  @property({ attribute: 'for' }) for?: string;

  @state() private _modalOpen = false;

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

    const registers = ((target as any).registers ?? []) as Record<string, unknown>[];
    const uniqueValues = [...new Set(
      registers
        .map(r => r[this.field])
        .filter(v => v != null)
        .map(String)
    )];
    this.options = uniqueValues;

    const currentFilters = ((target as any).currentFilters ?? {}) as Record<string, unknown>;
    const initial = currentFilters[this.field];
    if (Array.isArray(initial)) {
      this.selected = initial.map(String);
    } else if (initial != null) {
      this.selected = [String(initial)];
    }

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

  private _displayName() {
    if (this.label) return this.label;
    return this.field.charAt(0).toUpperCase() + this.field.slice(1);
  }

  render() {
    const i18n = t();
    const hasFilter = this.selected.length > 0;
    const displayName = this._displayName();
    const buttonLabel = `${i18n.filter.title}: ${displayName}`;
    const clearLabel = i18n.common.close ?? 'Clear filter';

    return html`
      <div class="chip" part="chip">
        <button
          class="main"
          part="main"
          aria-pressed=${String(hasFilter)}
          title=${buttonLabel}
          @click=${this._openModal}
        >
          <span>${buttonLabel}</span>
        </button>
        ${hasFilter ? html`
          <button
            class="clear"
            part="clear"
            aria-label=${clearLabel}
            title=${clearLabel}
            @click=${this._onClear}
          >×</button>
        ` : ''}
      </div>

      <fv-filter-modal
        .field=${this.field}
        .options=${this.options}
        .selected=${this.selected}
        .open=${this._modalOpen}
        @filter-change=${this._onModalFilterChange}
        @modal-close=${this._onModalClose}
      ></fv-filter-modal>
    `;
  }

  private _openModal = () => {
    this._modalOpen = true;
  };

  private _onModalClose = () => {
    this._modalOpen = false;
    this.updateComplete.then(() => {
      this.renderRoot.querySelector<HTMLButtonElement>('button.main')?.focus();
    });
  };

  private _onModalFilterChange = (e: Event) => {
    e.stopPropagation();
    const { value } = (e as CustomEvent<FilterChangeDetail>).detail;
    this.selected = Array.isArray(value) ? value : (value != null ? [String(value)] : []);
    this._modalOpen = false;
    this._dispatch({ field: this.field, value: this.selected.length ? this.selected : null });
  };

  private _onClear = () => {
    this.selected = [];
    this._dispatch({ field: this.field, value: null });
    this.updateComplete.then(() => {
      this.renderRoot.querySelector<HTMLButtonElement>('button.main')?.focus();
    });
  };

  private _dispatch(detail: FilterChangeDetail) {
    this.dispatchEvent(new CustomEvent<FilterChangeDetail>('filter-change', {
      detail, bubbles: true, composed: true,
    }));
    if (this._target) {
      this._target.dispatchEvent(new CustomEvent<FilterChangeDetail>('filter-change', {
        detail, bubbles: false, composed: false,
      }));
    }
  }
}
