import { LitElement, html, css } from 'lit';
import { customElement, property } from 'lit/decorators.js';

const VIEWS = ['grid', 'list', 'cards'] as const;
type View = typeof VIEWS[number];

@customElement('data-switch')
export class DataSwitch extends LitElement {
  static styles = css`
    :host { display: inline-block; }
    .switcher {
      display: inline-flex;
      background: #f5f5f5;
      border-radius: 6px;
      padding: 3px;
    }
    button {
      padding: 6px 14px;
      border: none;
      background: transparent;
      cursor: pointer;
      font-size: 12px;
      font-weight: 500;
      color: #666;
      border-radius: 4px;
      transition: all 0.15s ease;
    }
    button:hover { color: #333; }
    button.active {
      background: #fff;
      color: #111;
      box-shadow: 0 1px 2px rgba(0,0,0,0.08);
    }
  `;

  @property() activeView: View = 'grid';
  @property({ attribute: 'for' }) targetFor?: string;

  firstUpdated() {
    this._syncWithTarget();
  }

  private _syncWithTarget() {
    if (this.targetFor) {
      const target = document.getElementById(this.targetFor) as HTMLElement | null;
      if (target) {
        // Sincronizar estado inicial desde data-view
        const view = (target as any).view;
        if (view && VIEWS.includes(view as View)) {
          this.activeView = view as View;
        }
        
        // Escuchar cambios del data-view para mantener sincronizado
        target.addEventListener('view-change', ((e: CustomEvent) => {
          this.activeView = e.detail.view;
          this.requestUpdate();
        }) as EventListener);
      }
    }
  }

  render() {
    return html`
      <div class="switcher">
        ${VIEWS.map(
          v => html`
            <button
              class=${this.activeView === v ? 'active' : ''}
              @click=${() => this._select(v)}
            >${v}</button>
          `
        )}
      </div>
    `;
  }

  private _select(view: View) {
    this.activeView = view;
    
    // Dispatch evento
    this.dispatchEvent(
      new CustomEvent('view-change', {
        detail: { view },
        bubbles: true,
        composed: true,
      })
    );
    
    // Actualizar data-view target directamente
    if (this.targetFor) {
      const target = document.getElementById(this.targetFor) as HTMLElement | null;
      if (target) {
        (target as any).view = view;
      }
    }
  }
}