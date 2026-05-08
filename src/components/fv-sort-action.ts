import { LitElement, html, css } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { unsafeHTML } from 'lit/directives/unsafe-html.js';
import type { SortChangeDetail, SortCriterion } from '../types.js';
import { subscribeConfig, getFlexiConfig } from '../registry.js';
import { t } from '../i18n/index.js';
import { writeSortToUrl, readSortFromUrl } from '../utils/persistence.js';

interface SortField { field: string; title: string; }

@customElement('fv-sort-action')
export class FvSortAction extends LitElement {
  static styles = css`
    :host { display: inline-block; }
    .chip { display: inline-flex; align-items: stretch; border: 1px solid var(--fv-border, #e0e0e0); border-radius: 4px; overflow: hidden; }
    button { background: none; border: none; cursor: pointer; font-size: 12px; color: var(--fv-text, #333); font: inherit; }
    button.main { display: flex; align-items: center; gap: 6px; padding: 4px 10px; font-weight: 500; }
    button.main[aria-pressed='true'] { background: var(--fv-accent, #111); color: #fff; }
    button.main:hover { background: var(--fv-row-hover, #f5f5f5); }
    button.main[aria-pressed='true']:hover { background: var(--fv-text-muted, #666); }
    button.clear { border-left: 1px solid var(--fv-border, #e0e0e0); padding: 4px 8px; line-height: 1; font-size: 14px; color: var(--fv-text-muted, #666); }
    button.main[aria-pressed='true'] + button.clear { border-left-color: var(--fv-accent, #111); color: rgba(255,255,255,0.8); background: var(--fv-accent, #111); }
    button.clear:hover { background: var(--fv-row-hover, #f5f5f5); color: var(--fv-text, #333); }
    button.main[aria-pressed='true'] + button.clear:hover { background: var(--fv-text-muted, #666); color: #fff; }
    button:focus-visible { outline: 2px solid var(--fv-accent, #111); outline-offset: -2px; }

    /* Modal */
    .backdrop { position: fixed; inset: 0; display: flex; align-items: center; justify-content: center; background: rgba(0,0,0,0.5); z-index: 100000; }
    .modal { background: var(--fv-bg, #fff); border: 1px solid var(--fv-border, #e0e0e0); border-radius: 8px; width: min(420px, 90vw); max-height: min(400px, 80vh); display: flex; flex-direction: column; box-shadow: 0 8px 32px rgba(0,0,0,0.2); }
    .modal-header { display: flex; justify-content: space-between; align-items: center; padding: 12px 16px; border-bottom: 1px solid var(--fv-border, #e0e0e0); font-weight: 600; font-size: 14px; }
    .close-btn { background: none; border: none; cursor: pointer; padding: 4px; font-size: 18px; line-height: 1; color: var(--fv-text-muted, #666); border-radius: 4px; display: inline-flex; align-items: center; justify-content: center; }
    .close-btn:hover { background: var(--fv-row-hover, #f5f5f5); }
    .modal-body { display: flex; flex: 1; overflow: hidden; min-height: 0; }
    .fields { flex: 0 0 160px; overflow-y: auto; padding: 8px 0; border-right: 1px solid var(--fv-border, #e0e0e0); }
    .field-item { display: flex; align-items: center; gap: 6px; width: 100%; text-align: left; padding: 8px 16px; font-size: 13px; border: none; background: none; cursor: pointer; color: var(--fv-text, #333); font: inherit; }
    .field-item:hover { background: var(--fv-row-hover, #f5f5f5); }
    .field-item[aria-pressed='true'] { background: var(--fv-accent, #111); color: #fff; font-weight: 600; }
    .badge { font-size: 10px; font-weight: 700; color: var(--fv-accent, #111); min-width: 16px; text-align: center; }
    .field-item[aria-pressed='true'] .badge { color: rgba(255,255,255,0.7); }
    .actions { flex: 1; display: flex; flex-direction: column; gap: 8px; padding: 16px; justify-content: center; }
    .dir-btn { display: flex; align-items: center; gap: 8px; padding: 8px 12px; border: 1px solid var(--fv-border, #e0e0e0); border-radius: 4px; cursor: pointer; font-size: 13px; background: none; color: var(--fv-text, #333); font: inherit; }
    .dir-btn:hover { background: var(--fv-row-hover, #f5f5f5); }
    .dir-btn[aria-pressed='true'] { background: var(--fv-accent, #111); color: #fff; border-color: var(--fv-accent, #111); }
    .dir-btn[aria-pressed='true']:hover { background: var(--fv-text-muted, #666); }
    .empty { font-size: 13px; color: var(--fv-text-muted, #666); text-align: center; padding: 16px; margin: 0; }
  `;

  @property({ attribute: false })
  set registerOrder(val: SortField[] | string) {
    if (typeof val === 'string') {
      try { this._registerOrder = JSON.parse(val); }
      catch { console.warn('[fv-sort-action] Invalid register-order JSON'); this._registerOrder = []; }
    } else {
      this._registerOrder = val ?? [];
    }
    this.requestUpdate('registerOrder');
  }
  get registerOrder(): SortField[] { return this._registerOrder; }
  private _registerOrder: SortField[] = [];

  @property({ attribute: 'for' }) for?: string;
  @property({ attribute: 'storage-key' }) storageKey?: string;
  @property({ type: Boolean, attribute: 'sync-url' }) syncUrl = false;

  @state() private _modalOpen = false;
  @state() private _selectedField: string | null = null;
  @state() private _activeSorts: SortCriterion[] = [];

  private _unsubscribeConfig?: () => void;
  private _target: (HTMLElement & Record<string, unknown>) | null = null;
  private _onSortChangeFromView?: (e: Event) => void;
  private _targetOwnsUrl = false;
  private _keydownHandler?: (e: KeyboardEvent) => void;

  connectedCallback() {
    super.connectedCallback();
    this._unsubscribeConfig = subscribeConfig(() => this.requestUpdate());
    if (this.for) this._connect();
  }

  private async _connect() {
    await customElements.whenDefined('fv-view');
    let target = document.getElementById(this.for!) as (HTMLElement & Record<string, unknown>) | null;
    if (!target) {
      await new Promise<void>(resolve => requestAnimationFrame(() => resolve()));
      target = document.getElementById(this.for!) as (HTMLElement & Record<string, unknown>) | null;
    }
    if (!target) { console.warn(`[fv-sort-action] Could not find element with id "${this.for}"`); return; }
    this._target = target;
    this._targetOwnsUrl = target.hasAttribute('sync-url');

    // Hydration priority: URL > localStorage > target.currentSorts
    const urlSorts = readSortFromUrl();
    const stored = this._readStorage();
    const viewSorts = (target as any).currentSorts as SortCriterion[] | undefined;

    if (urlSorts.length > 0) {
      this._activeSorts = urlSorts;
    } else if (stored.length > 0) {
      this._activeSorts = stored;
    } else if (viewSorts && viewSorts.length > 0) {
      this._activeSorts = [...viewSorts];
    }

    if (this._activeSorts.length > 0) {
      this._emit(this._activeSorts);
    }

    this._onSortChangeFromView = (e: Event) => {
      const detail = (e as CustomEvent<SortChangeDetail>).detail;
      if (detail?.sorts) {
        this._activeSorts = [...detail.sorts];
      } else {
        this._activeSorts = [];
      }
      this.requestUpdate();
      this._writePersistence();
    };
    target.addEventListener('fv-sort-change', this._onSortChangeFromView);
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this._unsubscribeConfig?.();
    this._detachKeydown();
    if (this._target && this._onSortChangeFromView) {
      this._target.removeEventListener('fv-sort-change', this._onSortChangeFromView);
    }
    this._target = null;
  }

  private _readStorage(): SortCriterion[] {
    if (!this.storageKey) return [];
    try {
      const raw = localStorage.getItem(`${this.storageKey}-sort`);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed.filter((s: unknown) =>
          s != null && typeof (s as Record<string, unknown>).field === 'string' &&
          ((s as Record<string, unknown>).direction === 'asc' || (s as Record<string, unknown>).direction === 'desc')
        ) as SortCriterion[];
      }
      // Legacy single-object format
      if (parsed && typeof parsed.field === 'string' && (parsed.direction === 'asc' || parsed.direction === 'desc')) {
        return [parsed as SortCriterion];
      }
    } catch { /* ignore */ }
    return [];
  }

  private _writeStorage() {
    if (!this.storageKey) return;
    if (this._activeSorts.length > 0) {
      localStorage.setItem(`${this.storageKey}-sort`, JSON.stringify(this._activeSorts));
    } else {
      localStorage.removeItem(`${this.storageKey}-sort`);
    }
  }

  private _writePersistence() {
    this._writeStorage();
    if (this.syncUrl && !this._targetOwnsUrl) {
      writeSortToUrl(this._activeSorts);
    }
  }

  private _attachKeydown() {
    this._keydownHandler = (e: KeyboardEvent) => {
      if (!this._modalOpen) return;
      if (e.key === 'Escape') { e.stopPropagation(); this._closeModal(); return; }
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        const items = Array.from(this.renderRoot.querySelectorAll<HTMLButtonElement>('.field-item'));
        if (items.length === 0) return;
        const focused = this.renderRoot.activeElement as HTMLButtonElement | null;
        const idx = focused ? items.indexOf(focused) : -1;
        const next = e.key === 'ArrowDown'
          ? (idx + 1) % items.length
          : (idx - 1 + items.length) % items.length;
        items[next]?.focus();
      }
    };
    document.addEventListener('keydown', this._keydownHandler, true);
  }

  private _detachKeydown() {
    if (this._keydownHandler) document.removeEventListener('keydown', this._keydownHandler, true);
  }

  // Chip label per spec: 0 sorts → title, 1 sort → "field - dir", N>=2 → "firstField +N-1"
  private _chipLabel(): string {
    const i18n = t();
    const count = this._activeSorts.length;
    if (count === 0) return i18n.sort.title ?? 'Sort';
    if (count === 1) {
      const s = this._activeSorts[0];
      const fieldTitle = this._registerOrder.find(f => f.field === s.field)?.title ?? s.field;
      const dirLabel = s.direction === 'asc' ? (i18n.sort.asc ?? 'Ascending') : (i18n.sort.desc ?? 'Descending');
      return `${fieldTitle} - ${dirLabel}`;
    }
    // N >= 2
    const firstTitle = this._registerOrder.find(f => f.field === this._activeSorts[0].field)?.title ?? this._activeSorts[0].field;
    return `${firstTitle} +${count - 1}`;
  }

  private _chipAriaPressed(): string {
    return String(this._activeSorts.length > 0);
  }

  render() {
    const i18n = t();
    const icons = getFlexiConfig().icons;
    const hasSort = this._activeSorts.length > 0;
    const label = this._chipLabel();

    return html`
      <div class="chip" part="chip">
        <button class="main" part="main" aria-pressed=${this._chipAriaPressed()} title=${label} @click=${this._openModal}>
          <span class="label">${label}</span>
        </button>
        ${hasSort ? html`
          <button class="clear" part="clear" aria-label=${i18n.sort.clear ?? 'Clear sort'} title=${i18n.sort.clear ?? 'Clear sort'} @click=${this._onClear}>×</button>
        ` : ''}
      </div>

      ${this._modalOpen ? html`
        <div class="backdrop" @click=${this._closeModal}>
          <div class="modal" role="dialog" aria-modal="true" aria-labelledby="sort-modal-title" @click=${(e: Event) => e.stopPropagation()}>
            <div class="modal-header">
              <span id="sort-modal-title">${i18n.sort.title ?? 'Sort'}</span>
              <button class="close-btn" @click=${this._closeModal}>${unsafeHTML(icons.close || '✕')}</button>
            </div>
            <div class="modal-body">
              <div class="fields">
                ${this._registerOrder.length === 0
                  ? html`<p class="empty">—</p>`
                  : this._registerOrder.map(f => {
                    const idx = this._activeSorts.findIndex(s => s.field === f.field);
                    const isActive = idx !== -1;
                    const badge = isActive ? `[${idx + 1}]` : '';
                    return html`
                      <button
                        class="field-item"
                        aria-pressed=${String(this._selectedField === f.field)}
                        @click=${() => this._selectField(f.field)}
                      >
                        ${badge ? html`<span class="badge">${badge}</span>` : ''}
                        ${f.title}
                      </button>
                    `;
                  })
                }
              </div>
              <div class="actions">
                ${this._selectedField ? html`
                  <button
                    class="dir-btn asc"
                    part="dir-asc"
                    aria-pressed=${String(this._activeSorts.some(s => s.field === this._selectedField && s.direction === 'asc'))}
                    @click=${() => this._onApply('asc')}
                  >
                    ${unsafeHTML(icons.sortAsc || '↑')} ${i18n.sort.asc}
                  </button>
                  <button
                    class="dir-btn desc"
                    part="dir-desc"
                    aria-pressed=${String(this._activeSorts.some(s => s.field === this._selectedField && s.direction === 'desc'))}
                    @click=${() => this._onApply('desc')}
                  >
                    ${unsafeHTML(icons.sortDesc || '↓')} ${i18n.sort.desc}
                  </button>
                ` : html`<p class="empty">${i18n.sort.selectField ?? 'Select a field to sort'}</p>`}
              </div>
            </div>
          </div>
        </div>
      ` : ''}
    `;
  }

  private _openModal = () => {
    if (this._modalOpen) return;
    this._selectedField = this._activeSorts[0]?.field ?? null;
    this._modalOpen = true;
    this._attachKeydown();
  };

  private _closeModal = () => {
    this._modalOpen = false;
    this._detachKeydown();
  };

  private _selectField(field: string) {
    this._selectedField = field;
  }

  // Append/toggle/replace per spec ADR-6:
  // - Field NOT in _activeSorts → APPEND at end
  // - Field in _activeSorts, SAME direction → REMOVE (toggle off)
  // - Field in _activeSorts, DIFFERENT direction → REPLACE direction, preserve position
  private _onApply(direction: 'asc' | 'desc') {
    if (!this._selectedField) return;

    const existingIdx = this._activeSorts.findIndex(s => s.field === this._selectedField);

    if (existingIdx === -1) {
      // APPEND new sort
      this._activeSorts = [...this._activeSorts, { field: this._selectedField, direction }];
    } else if (this._activeSorts[existingIdx].direction === direction) {
      // TOGGLE OFF — same direction, remove it
      this._activeSorts = this._activeSorts.filter((_, i) => i !== existingIdx);
    } else {
      // REPLACE direction, preserve position
      this._activeSorts = this._activeSorts.map((s, i) =>
        i === existingIdx ? { ...s, direction } : s
      );
    }

    this._emit(this._activeSorts);
    this._writePersistence();
    // Modal stays open — ADR-6
  }

  private _onClear = () => {
    this._activeSorts = [];
    this._emit([]);
    this._writePersistence();
    this.updateComplete.then(() => {
      this.renderRoot.querySelector<HTMLButtonElement>('button.main')?.focus();
    });
  };

  private _emit(sorts: SortCriterion[]) {
    const detail: SortChangeDetail = { sorts };
    this.dispatchEvent(new CustomEvent<SortChangeDetail>('sort-change', { detail, bubbles: true, composed: true }));
    if (this._target) {
      this._target.dispatchEvent(new CustomEvent<SortChangeDetail>('sort-change', { detail, bubbles: false, composed: false }));
    }
  }
}
