import { LitElement, html } from 'lit';
import { customElement, property } from 'lit/decorators.js';

@customElement('dv-date')
export class DvDate extends LitElement {
  @property({ attribute: false }) item: Record<string, unknown> = {};
  @property({ attribute: false }) params: Record<string, unknown> & {
    field?: string;
    locale?: string;
  } = {};

  render() {
    const raw = this.params.field != null ? this.item[this.params.field] : undefined;
    if (raw == null || raw === '') return html``;
    const d = new Date(raw as string | number);
    if (isNaN(d.getTime())) return html`${String(raw)}`;
    const formatted = d.toLocaleDateString(this.params.locale);
    return html`${formatted}`;
  }
}
