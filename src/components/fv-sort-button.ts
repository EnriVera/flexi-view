import { LitElement, html, css } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { unsafeHTML } from 'lit/directives/unsafe-html.js';
import type { SortChangeDetail, SortCriterion } from '../types.js';
import { subscribeConfig, getFlexiConfig } from '../registry.js';
import { t } from '../i18n/index.js';

@customElement('fv-sort-button')
export class FvSortButton extends LitElement {
  static styles = css`
    :host { display: inline-block; }

    .chip {
      display: inline-flex;
      align-items: stretch;
      border: 1px solid var(--fv-border, #e0e0e0);
      border-radius: 4px;
      overflow: hidden;
      background: var(--fv-bg, transparent);
    }

    button {
      background: none;
      border: none;
      padding: 4px 10px;
      cursor: pointer;
      font-size: 12px;
      color: var(--fv-text, #333);
      font: inherit;
    }

    button.main {
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .label { font-size: 12px; font-weight: 500; }

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

    button.clear:hover {
      background: var(--fv-row-hover, #f5f5f5);
      color: var(--fv-text, #333);
    }

    button.main[aria-pressed='true'] + button.clear {
      border-left-color: var(--fv-accent, #111);
    }

    button:focus-visible {
      outline: 2px solid var(--fv-accent, #111);
      outline-offset: -2px;
    }
  `;

  /** The data field this chip controls sorting for. */
  @property() field = '';
  @property() label = '';

  /**
   * Current sort direction. Acts as the preferred initial direction on first
   * activation. On direction cycle (active → active click), the component
   * mutates this property in place to track live state. On clear, this value
   * is left unchanged so the preferred default survives deactivation.
   */
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
      console.warn(`[fv-sort-button] Could not find element with id "${this.for}"`);
      return;
    }
    this._target = target;

    // Read initial sort state from target.currentSorts
    const currentSorts = (target as any).currentSorts as SortCriterion[] | undefined;
    const match = currentSorts?.find((s: SortCriterion) => s.field === this.field);
    if (match) {
      this.active = true;
      this.direction = match.direction ?? this.direction;
    }

    // Subscribe to outbound sort events from fv-view
    this._onSortChangeFromView = (e: Event) => {
      const detail = (e as CustomEvent<SortChangeDetail>).detail;
      const match = detail?.sorts?.find((s: SortCriterion) => s.field === this.field);
      if (match) {
        this.active = true;
        this.direction = match.direction ?? this.direction;
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

  private _displayName() {
    if (this.label) return this.label;
    return this.field.charAt(0).toUpperCase() + this.field.slice(1);
  }

  render() {
    const icons = getFlexiConfig().icons;
    const icon = this.direction === 'asc'
      ? '<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 19V5M5 12l7-7 7 7"/></svg>'
      : '<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 5v14M5 12l7 7 7-7"/></svg>';
    const safeIcon = icon;
    const dirLabel = this.direction === 'asc' ? t().sort.ascLabel : t().sort.descLabel;
    const clearLabel = t().sort.clear ?? 'Clear sort';
    const mainLabel = dirLabel;

    return html`
      <div class="chip" part="chip">
        <button
          class="main"
          part="main"
          aria-pressed=${String(this.active)}
          title=${mainLabel}
          @click=${this._onActivateOrCycle}
        >
          ${unsafeHTML(safeIcon)}
          <span class="label">${mainLabel}</span>
        </button>
        ${this.active ? html`
          <button
            class="clear"
            part="clear"
            aria-label=${clearLabel}
            title=${clearLabel}
            @click=${this._onClear}
          >×</button>
        ` : ''}
      </div>
    `;
  }

  private _onActivateOrCycle = () => {
    let nextDirection: 'asc' | 'desc';
    if (!this.active) {
      nextDirection = this.direction ?? 'asc';
    } else {
      nextDirection = this.direction === 'asc' ? 'desc' : 'asc';
      this.direction = nextDirection;
    }
    this.active = true;
    this._emit(this.field, nextDirection);
  };

  private _onClear = () => {
    this.active = false;
    this._emit(this.field, null);
    this.updateComplete.then(() => {
      const main = this.renderRoot.querySelector<HTMLButtonElement>('button.main');
      main?.focus();
    });
  };

  private _emit(field: string, direction: 'asc' | 'desc' | null) {
      const detail: SortChangeDetail = direction
        ? { sorts: [{ field, direction }] }
        : { sorts: [] };
      this.dispatchEvent(new CustomEvent<SortChangeDetail>('sort-change', {
        detail, bubbles: true, composed: true,
      }));
      if (this._target) {
        this._target.dispatchEvent(new CustomEvent<SortChangeDetail>('sort-change', {
          detail, bubbles: false, composed: false,
        }));
      }
    }
}
