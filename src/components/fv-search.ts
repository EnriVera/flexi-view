import { LitElement, html, css } from 'lit';
import { customElement, property } from 'lit/decorators.js';

@customElement('fv-search')
export class FvSearch extends LitElement {
  static styles = css`
    :host { display: block; }
    .search-container {
      position: relative;
      display: inline-block;
      width: 100%;
      max-width: 300px;
    }
    .search-icon {
      position: absolute;
      left: 12px;
      top: 50%;
      transform: translateY(-50%);
      color: #888;
      pointer-events: none;
    }
    input {
      width: 100%;
      box-sizing: border-box;
      padding: 8px 12px 8px 36px;
      border: 1px solid var(--fv-border, #e0e0e0);
      border-radius: var(--fv-radius, 6px);
      font-size: 14px;
      background: var(--fv-bg, #fff);
      color: #333;
      transition: border-color 0.2s ease, box-shadow 0.2s ease;
    }
    input:focus {
      outline: none;
      border-color: var(--fv-primary, #6200ea);
      box-shadow: 0 0 0 2px rgba(98, 0, 234, 0.1);
    }
    input::placeholder {
      color: #999;
    }
  `;

  @property({ type: String }) placeholder = 'Search...';
  @property({ type: String }) value = '';
  @property({ type: Boolean, attribute: 'debounce' }) debounce = false;
  @property({ type: Number }) debounceMs = 300;
  @property({ attribute: 'for' }) for?: string;

  private _debounceTimer?: number;
  private _target?: HTMLElement;

  connectedCallback() {
    super.connectedCallback();
    if (this.for) {
      this._findTarget();
    }
  }

  private _findTarget() {
    const target = document.getElementById(this.for!);
    if (target) {
      this._target = target as HTMLElement;
    }
  }

  updated(changed: Map<string, unknown>) {
    if (changed.has('for') && this.for) {
      this._findTarget();
    }
  }

  private _handleInput(e: Event) {
    const input = e.target as HTMLInputElement;
    this.value = input.value;

    if (this.debounce) {
      this._debouncedEmit();
    } else {
      this._emit();
    }
  }

  private _debouncedEmit() {
    if (this._debounceTimer) {
      clearTimeout(this._debounceTimer);
    }
    this._debounceTimer = window.setTimeout(() => {
      this._emit();
    }, this.debounceMs);
  }

  private _emit() {
    const event = new CustomEvent('fv-search', {
      detail: { value: this.value },
      bubbles: true,
      composed: true,
    });
    
    this.dispatchEvent(event);
    
    // Si tiene "for", enviar también directamente al target
    if (this._target) {
      this._target.dispatchEvent(event);
    }
  }

  render() {
    return html`
      <div class="search-container">
        <svg class="search-icon" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="11" cy="11" r="8"></circle>
          <path d="m21 21-4.35-4.35"></path>
        </svg>
        <input
          type="text"
          placeholder=${this.placeholder}
          .value=${this.value}
          @input=${this._handleInput}
        />
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'fv-search': FvSearch;
  }
}