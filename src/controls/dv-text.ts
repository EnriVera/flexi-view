import { LitElement, html } from 'lit';
import { customElement, property } from 'lit/decorators.js';

@customElement('dv-text')
export class DvText extends LitElement {
  @property({ attribute: false }) item: Record<string, unknown> = {};
  @property({ attribute: false }) params: Record<string, unknown> & { field?: string } = {};

  render() {
    const val = this.params.field != null ? this.item[this.params.field] : '';
    return html`${String(val ?? '')}`;
  }
}
