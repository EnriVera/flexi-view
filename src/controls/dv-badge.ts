import { LitElement, html, css } from 'lit';
import { customElement, property } from 'lit/decorators.js';

@customElement('dv-badge')
export class DvBadge extends LitElement {
  static styles = css`
    :host { display: inline-block; }
    .badge {
      display: inline-block;
      padding: 2px 8px;
      border-radius: 12px;
      font-size: 12px;
      font-weight: 500;
      background: #e0e0e0;
      color: #333;
    }
  `;

  @property({ attribute: false }) item: Record<string, unknown> = {};
  @property({ attribute: false }) params: Record<string, unknown> & { field?: string; color?: string } = {};

  render() {
    const field = this.params.field as string;
    const value = field ? this.item[field] : '';
    const color = this.params.color as string;
    
    const style = color ? `background: ${color}; color: white;` : '';
    
    return html`<span class="badge" style="${style}">${String(value ?? '')}</span>`;
  }
}