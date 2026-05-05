import { LitElement, html, css, svg } from 'lit';
import { customElement, property } from 'lit/decorators.js';

const VIEWS = ['grid', 'list', 'cards'] as const;
type View = typeof VIEWS[number];

const ICONS = {
  grid: svg`<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>`,
  list: svg`<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>`,
  cards: svg`<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/></svg>`,
};

@customElement('data-switch')
export class DataSwitch extends LitElement {
  static styles = css`
    :host { display: inline-block; }
    button {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      padding: 8px;
      border: none;
      background: #f5f5f5;
      cursor: pointer;
      border-radius: 6px;
      color: #666;
      transition: all 0.15s ease;
    }
    button:hover {
      background: #eee;
      color: #333;
    }
    button.active {
      background: #fff;
      color: #111;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
    }
  `;

  @property() activeView: View = 'grid';
  @property({ attribute: 'for' }) targetFor?: string;
  @property({ type: Boolean, attribute: 'sync-url' }) syncUrl = false;

  private _hashListener?: () => void;

  firstUpdated() {
    this._syncWithTarget();
    if (this.syncUrl) {
      this._initFromUrl();
      this._hashListener = () => this._onUrlChange();
      window.addEventListener('hashchange', this._hashListener);
    }
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    if (this._hashListener) {
      window.removeEventListener('hashchange', this._hashListener);
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
    return html`
      <button 
        class="active"
        @click=${this._cycle}
        title="Cambiar vista"
      >
        ${ICONS[this.activeView]}
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