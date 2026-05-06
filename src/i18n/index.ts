import { en } from './en.js';
import { es } from './es.js';
import type { Translations } from './en.js';
import { getFlexiConfig } from '../registry.js';

const translations: Record<string, Translations> = {
  en,
  es,
};

/**
 * Get translations for the current configured language
 */
export function t(): Translations {
  const language = getFlexiConfig().language;
  return translations[language] ?? translations.en;
}

export type { Translations };
export { en, es };