/**
 * Kanso Cre8 — Studio Settings Store (Svelte 5 Runes)
 * Persists creator preferences, default rates, currency, and studio configuration.
 */

export interface StudioSettings {
  defaultHourlyRate: number;
  currency: 'MYR' | 'USD' | 'EUR' | 'GBP' | 'SGD' | 'AUD' | 'CAD' | 'JPY' | string;
  currencySymbol: string;
  defaultLens: 'studio' | 'my-workspace';
  timerAutoLog: boolean;
  vaultAutoSave: boolean;
  soundEffects: boolean;
}

const STORAGE_KEY = 'kanso_studio_settings';

export const CURRENCY_SYMBOLS: Record<string, string> = {
  MYR: 'RM',
  USD: '$',
  EUR: '€',
  GBP: '£',
  SGD: 'S$',
  AUD: 'A$',
  CAD: 'CA$',
  JPY: '¥'
};

export function getCurrencySymbol(code?: string): string {
  if (!code) return 'RM';
  const upper = code.trim().toUpperCase();
  return CURRENCY_SYMBOLS[upper] || upper || 'RM';
}

const DEFAULT_SETTINGS: StudioSettings = {
  defaultHourlyRate: 180,
  currency: 'MYR',
  currencySymbol: 'RM',
  defaultLens: 'studio',
  timerAutoLog: true,
  vaultAutoSave: true,
  soundEffects: true
};

class SettingsStore {
  settings = $state<StudioSettings>(DEFAULT_SETTINGS);

  constructor() {
    this.loadSettings();
  }

  loadSettings(): StudioSettings {
    if (typeof localStorage === 'undefined') return DEFAULT_SETTINGS;
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        const curr = parsed.currency || 'MYR';
        this.settings = {
          ...DEFAULT_SETTINGS,
          ...parsed,
          currency: curr,
          currencySymbol: getCurrencySymbol(curr)
        };
        return this.settings;
      }
    } catch (e) {
      console.warn('[SettingsStore] Error loading settings:', e);
    }
    this.settings = { ...DEFAULT_SETTINGS };
    return this.settings;
  }

  saveSettings(): void {
    if (typeof localStorage === 'undefined') return;
    try {
      this.settings.currencySymbol = getCurrencySymbol(this.settings.currency);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.settings));
    } catch (e) {
      console.error('[SettingsStore] Error saving settings:', e);
    }
  }

  updateSettings(partial: Partial<StudioSettings>): void {
    const updatedCurrency = partial.currency || this.settings.currency || 'MYR';
    this.settings = {
      ...this.settings,
      ...partial,
      currency: updatedCurrency,
      currencySymbol: getCurrencySymbol(updatedCurrency)
    };
    this.saveSettings();
  }

  formatMoney(amount: number, overrideCode?: string): string {
    const code = overrideCode || this.settings.currency || 'MYR';
    const symbol = getCurrencySymbol(code);
    const formatted = amount.toLocaleString('en-MY', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    return `${symbol} ${formatted}`;
  }
}

export const settingsStore = new SettingsStore();

