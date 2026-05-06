import { LitElement, html, css } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { unsafeHTML } from 'lit/directives/unsafe-html.js';
import { subscribeConfig, getFlexiConfig } from '../registry.js';
import { t } from '../i18n/index.js';

const VIEWS = ['grid', 'list', 'cards'] as const;
type View = typeof VIEWS[number];

@customElement('fv-switcher')
export class FvSwitcher extends LitElement {
  static styles = css`
    :host { display: inline-block; }
    button {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      padding: 8px;
      border: none;
      background: var(--fv-row-hover, #f5f5f5);
      cursor: pointer;
      border-radius: 6px;
      color: var(--fv-text-muted, #666);
      transition: all 0.15s ease;
    }
    button:hover {
      background: var(--fv-border, #e0e0e0);
      color: var(--fv-text, #333);
    }
    button.active {
      background: var(--fv-bg, #fff);
      color: var(--fv-accent, #111);
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
    }
  `;

  @property() activeView: View = 'grid';
  @property({ attribute: 'for' }) targetFor?: string;
  @property({ type: Boolean, attribute: 'sync-url' }) syncUrl = false;

  private _hashListener?: () => void;
  private _unsubscribeConfig?: () => void;

  connectedCallback() {
    super.connectedCallback();
    this._unsubscribeConfig = subscribeConfig(() => this.requestUpdate());
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this._unsubscribeConfig?.();
    if (this._hashListener) {
      window.removeEventListener('hashchange', this._hashListener);
    }
  }

  firstUpdated() {
    this._syncWithTarget();
    if (this.syncUrl) {
      this._initFromUrl();
      this._hashListener = () => this._onUrlChange();
      window.addEventListener('hashchange', this._hashListener);
    }
  }

  private _syncWithTarget() {
    if (this.targetFor) {
      const target = document.getElementById(this.targetFor) as HTMLElement | null;
      if (target) {
        const view = (target as any).view;
        if (view && VIEWS.includes(view as View)) {
          this.activeView = view as View;
        }

        target.addEventListener('view-change', ((e: CustomEvent) => {
          this.activeView = e.detail.view;
          this.requestUpdate();
        }) as EventListener);
      }
    }
  }

  private _initFromUrl() {
    const hash = window.location.hash.slice(1);
    const params = new URLSearchParams(hash);
    const view = params.get('view');
    if (view && VIEWS.includes(view as View)) {
      this.activeView = view as View;
      this._notifyChange(this.activeView);
    }
  }

  private _onUrlChange() {
    const hash = window.location.hash.slice(1);
    const params = new URLSearchParams(hash);
    const view = params.get('view');
    if (view && VIEWS.includes(view as View) && view !== this.activeView) {
      this.activeView = view as View;
      this._notifyChange(this.activeView);
    }
  }

  private _updateUrl(view: View) {
    const hash = window.location.hash.slice(1);
    const params = new URLSearchParams(hash);
    params.set('view', view);
    window.location.hash = params.toString();
  }

  private _notifyChange(view: View) {
    this.dispatchEvent(
      new CustomEvent('view-change', {
        detail: { view },
        bubbles: true,
        composed: true,
      })
    );
  }

  render() {
    const icons = getFlexiConfig().icons;
    const iconMap: Record<View, string> = {
      grid: icons.gridView,
      list: icons.listView,
      cards: icons.cardsView,
    };
    return html`
      <button
        class="active"
        @click=${this._cycle}
        title=${t().view.switch}
      >
        ${unsafeHTML(iconMap[this.activeView])}
      </button>
    `;
  }

  private _cycle() {
    const currentIndex = VIEWS.indexOf(this.activeView);
    const nextIndex = (currentIndex + 1) % VIEWS.length;
    const nextView = VIEWS[nextIndex];

    this.activeView = nextView;

    if (this.syncUrl) {
      this._updateUrl(nextView);
    }

    // 1. Dispara evento para sincronización general
    this._notifyChange(nextView);

    // 2. Actualiza directamente el target (fallback seguro)
    if (this.targetFor) {
      const target = document.getElementById(this.targetFor) as HTMLElement | null;
      if (target) {
        (target as any).view = nextView;
      }
    }
  }
}
