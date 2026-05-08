import { LitElement, html, css, nothing } from 'lit';
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
    button:disabled {
      opacity: 0.4;
      cursor: not-allowed;
    }
    button:disabled:hover {
      background: var(--fv-row-hover, #f5f5f5);
      color: var(--fv-text-muted, #666);
    }
  `;

  @property() activeView: View = 'grid';
  @property({ attribute: 'for' }) targetFor?: string;
  @property({ type: Boolean, attribute: 'sync-url' }) syncUrl = false;
  @property({ type: Array }) acceptedViews: string[] = ['grid', 'list', 'cards'];

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

        const targetAccepted = (target as any).acceptedViews;
        if (Array.isArray(targetAccepted) && targetAccepted.length > 0) {
          this.acceptedViews = targetAccepted;
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
    if (this.acceptedViews.length <= 1) return nothing;

    const icons = getFlexiConfig().icons;
    const iconMap: Record<View, string> = {
      grid: icons.gridView,
      list: icons.listView,
      cards: icons.cardsView,
    };

    const currentView = this.acceptedViews.includes(this.activeView)
      ? this.activeView
      : (this.acceptedViews[0] as View);

    const currentIndex = this.acceptedViews.indexOf(currentView);
    const nextIndex = (currentIndex + 1) % this.acceptedViews.length;
    const nextView = this.acceptedViews[nextIndex] as View;
    const nextLabel = nextView.charAt(0).toUpperCase() + nextView.slice(1);

    return html`
      <button
        class="active"
        aria-label="Switch to ${nextLabel}"
        title=${t().view.switch}
        @click=${() => this._cycle()}
      >
        ${unsafeHTML(iconMap[currentView] ?? '')}
      </button>
    `;
  }

  private _cycleTo(view: View) {
    if (!this.acceptedViews.includes(view)) return;

    this.activeView = view;

    if (this.syncUrl) {
      this._updateUrl(view);
    }

    this._notifyChange(view);

    if (this.targetFor) {
      const target = document.getElementById(this.targetFor) as HTMLElement | null;
      if (target) {
        (target as any).view = view;
      }
    }
  }

  /**
   * Cycles to the next view in the acceptedViews sequence.
   * Wraps around to the beginning when reaching the end.
   */
  private _cycle() {
    const views = this.acceptedViews;
    if (views.length === 0) return;

    const currentIndex = views.indexOf(this.activeView);
    const nextIndex = (currentIndex + 1) % views.length;
    const nextView = views[nextIndex] as View;

    this._cycleTo(nextView);
  }
}
