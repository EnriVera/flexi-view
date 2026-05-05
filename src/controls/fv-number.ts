import { LitElement, html } from 'lit';
import { customElement, property } from 'lit/decorators.js';

@customElement('fv-number')
export class FvNumber extends LitElement {
  @property({ attribute: false }) item: Record<string, unknown> = {};
  @property({ attribute: false }) params: Record<string, unknown> & {
    field?: string;
    locale?: string;
    maximumFractionDigits?: number;
  } = {};

  render() {
    const raw = this.params.field != null ? this.item[this.params.field] : undefined;
    if (raw == null || raw === '') return html``;
    const n = Number(raw);
    if (isNaN(n)) return html`${String(raw)}`;
    const formatted = new Intl.NumberFormat(this.params.locale, {
      maximumFractionDigits: this.params.maximumFractionDigits ?? 2,
    }).format(n);
    return html`${formatted}`;
  }
}
