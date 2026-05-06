import type { ExportFormat, FlexiViewConfig, FlexiViewIcons, FlexiViewTheme, DarkMode, FlexiViewIconValue, Language } from './types.js';

type ControlLoader = () => Promise<unknown>;
type ExcelLibrary = unknown;

// Normalize icon value to HTML string for rendering
export function normalizeIcon(icon: FlexiViewIconValue | undefined): string {
  if (icon == null) return '';
  if (typeof icon === 'string') return icon;
  if (typeof icon === 'function') {
    const el = icon();
    if (el instanceof HTMLElement) {
      return el.outerHTML;
    }
    return '';
  }
  // Invalid type - return empty
  return '';
}

const registry = new Map<string, ControlLoader>();

export interface GridConfig {
  controls?: Record<string, ControlLoader>;
  headerMenu?: string;
  actions?: string[];
  export?: {
    formats?: ExportFormat[];
    excelLibrary?: () => Promise<ExcelLibrary>;
  };
}

let _gridConfig: GridConfig = {};

export function configureGrid(config: GridConfig): void {
  _gridConfig = { ..._gridConfig, ...config };
  if (!config.controls) return;
  for (const [tag, loader] of Object.entries(config.controls)) {
    registry.set(tag, loader);
  }
}

export function getGridConfig(): GridConfig {
  return _gridConfig;
}

export async function resolveControl(tag: string): Promise<void> {
  const loader = registry.get(tag);
  if (loader && !customElements.get(tag)) {
    await loader();
  }
  await customElements.whenDefined(tag);
}

// ─── Global Config ───────────────────────────────────────────────────────────

export const DEFAULT_ICONS: Required<FlexiViewIcons> = {
  sortAsc: '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 19V5"/><path d="m5 12 7-7 7 7"/></svg> Asc',
  sortDesc: '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14"/><path d="m19 12-7 7-7-7"/></svg> Desc',
  filter: '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg>',
  clearFilter: '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>',
  close: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>',
  export: '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>',
  gridView: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>',
  listView: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>',
  cardsView: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/></svg>',
};

export const LIGHT_TOKENS: Required<FlexiViewTheme> = {
  bg: '#ffffff',
  headerBg: '#fafafa',
  headerText: '#666666',
  text: '#333333',
  textMuted: '#666666',
  border: '#e0e0e0',
  rowHover: '#f5f5f5',
  accent: '#111111',
  primary: '#1976d2',
  danger: '#d32f2f',
  radius: '6px',
  fontSize: '13px',
};

export const DARK_TOKENS: Required<FlexiViewTheme> = {
  bg: '#1e1e2e',
  headerBg: '#181825',
  headerText: '#a6adc8',
  text: '#cdd6f4',
  textMuted: '#a6adc8',
  border: '#333333',
  rowHover: '#2a2a3e',
  accent: '#cdd6f4',
  primary: '#89b4fa',
  danger: '#f38ba8',
  radius: '6px',
  fontSize: '13px',
};

export const TOKEN_MAP: Record<keyof FlexiViewTheme, string> = {
  bg: '--fv-bg',
  headerBg: '--fv-header-bg',
  headerText: '--fv-header-text',
  text: '--fv-text',
  textMuted: '--fv-text-muted',
  border: '--fv-border',
  rowHover: '--fv-row-hover',
  accent: '--fv-accent',
  primary: '--fv-primary',
  danger: '--fv-danger',
  radius: '--fv-radius',
  fontSize: '--fv-font-size',
};

// Single managed stylesheet — replaced on each configure() call
const _sheet = (typeof CSSStyleSheet !== 'undefined') ? new CSSStyleSheet() : null;

const _subscribers = new Set<() => void>();

let _flexiConfig: FlexiViewConfig = {};

function _buildTokensBlock(tokens: Required<FlexiViewTheme>, consumerTheme: Partial<FlexiViewTheme>): string {
  const merged = { ...tokens, ...consumerTheme };
  return Object.entries(TOKEN_MAP)
    .map(([key, cssVar]) => `  ${cssVar}: ${merged[key as keyof FlexiViewTheme]};`)
    .join('\n');
}

export function _buildStylesheet(config: FlexiViewConfig): string {
  const darkMode: DarkMode = config.darkMode ?? 'light';
  const consumerTheme = config.theme ?? {};

  if (darkMode === 'dark') {
    return `:root {\n${_buildTokensBlock(DARK_TOKENS, consumerTheme)}\n}`;
  }

  if (darkMode === 'auto') {
    const lightBlock = `:root {\n${_buildTokensBlock(LIGHT_TOKENS, consumerTheme)}\n}`;
    const darkBlock = `@media (prefers-color-scheme: dark) {\n  :root {\n${_buildTokensBlock(DARK_TOKENS, consumerTheme)}\n  }\n}`;
    return `${lightBlock}\n${darkBlock}`;
  }

  // 'light' (default)
  return `:root {\n${_buildTokensBlock(LIGHT_TOKENS, consumerTheme)}\n}`;
}

function _notifySubscribers(): void {
  _subscribers.forEach(cb => cb());
}

export function configure(config: FlexiViewConfig): void {
  // Deep-merge icons, theme, and language; replace darkMode
  _flexiConfig = {
    language: config.language ?? _flexiConfig.language,
    darkMode: config.darkMode ?? _flexiConfig.darkMode,
    icons: { ..._flexiConfig.icons, ...config.icons },
    theme: { ..._flexiConfig.theme, ...config.theme },
  };

  // CSS injection (SSR guard)
  if (_sheet && typeof document !== 'undefined' && Array.isArray(document.adoptedStyleSheets)) {
    _sheet.replaceSync(_buildStylesheet(_flexiConfig));
    if (!document.adoptedStyleSheets.includes(_sheet)) {
      document.adoptedStyleSheets = [...document.adoptedStyleSheets, _sheet];
    }
  }

  _notifySubscribers();

  // Backward compat: keep configureGrid accessible via configure
  configureGrid({});
}

export function subscribeConfig(cb: () => void): () => void {
  _subscribers.add(cb);
  return () => { _subscribers.delete(cb); };
}

export function getFlexiConfig(): {
  language: Language;
  icons: {
    sortAsc: string;
    sortDesc: string;
    filter: string;
    clearFilter: string;
    close: string;
    export: string;
    gridView: string;
    listView: string;
    cardsView: string;
  };
  theme: Required<FlexiViewTheme>;
  darkMode: DarkMode;
} {
  const language: Language = _flexiConfig.language ?? 'en';
  const darkMode: DarkMode = _flexiConfig.darkMode ?? 'light';
  const baseTokens = darkMode === 'dark' ? DARK_TOKENS : LIGHT_TOKENS;
  const mergedIcons = { ...DEFAULT_ICONS, ..._flexiConfig.icons };
  // Normalize all icons to HTML strings for safe rendering
  const normalizedIcons: Required<FlexiViewIcons> = {
    sortAsc: normalizeIcon(mergedIcons.sortAsc),
    sortDesc: normalizeIcon(mergedIcons.sortDesc),
    filter: normalizeIcon(mergedIcons.filter),
    clearFilter: normalizeIcon(mergedIcons.clearFilter),
    close: normalizeIcon(mergedIcons.close),
    export: normalizeIcon(mergedIcons.export),
    gridView: normalizeIcon(mergedIcons.gridView),
    listView: normalizeIcon(mergedIcons.listView),
    cardsView: normalizeIcon(mergedIcons.cardsView),
  };
  return {
    language,
    icons: normalizedIcons,
    theme: { ...baseTokens, ..._flexiConfig.theme },
    darkMode,
  };
}

export function _resetRegistryForTesting(): void {
  registry.clear();
  _gridConfig = {};
  _flexiConfig = {};
  _subscribers.clear();
  if (_sheet) {
    _sheet.replaceSync('');
  }
  if (typeof document !== 'undefined' && Array.isArray(document.adoptedStyleSheets)) {
    document.adoptedStyleSheets = document.adoptedStyleSheets.filter(s => s !== _sheet);
  }
}
