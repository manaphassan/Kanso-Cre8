/**
 * Kanso Cre8 — Studio Settings Store (Svelte 5 Runes)
 * Persists creator preferences, default rates, currency, and studio configuration.
 */

export interface StudioSettings {
  defaultHourlyRate: number;
  currency: 'MYR' | 'USD' | 'EUR' | 'GBP' | 'SGD' | 'AUD' | 'CAD' | 'JPY' | 'CHF' | string;
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
  JPY: '¥',
  CHF: 'CHF'
};

export const SUPPORTED_CURRENCIES = [
  { code: 'MYR', label: 'MYR — Malaysian Ringgit (RM)', symbol: 'RM' },
  { code: 'USD', label: 'USD — US Dollar ($)', symbol: '$' },
  { code: 'EUR', label: 'EUR — Euro (€)', symbol: '€' },
  { code: 'GBP', label: 'GBP — British Pound (£)', symbol: '£' },
  { code: 'SGD', label: 'SGD — Singapore Dollar (S$)', symbol: 'S$' },
  { code: 'AUD', label: 'AUD — Australian Dollar (A$)', symbol: 'A$' },
  { code: 'CAD', label: 'CAD — Canadian Dollar (CA$)', symbol: 'CA$' },
  { code: 'JPY', label: 'JPY — Japanese Yen (¥)', symbol: '¥' },
  { code: 'CHF', label: 'CHF — Swiss Franc (CHF)', symbol: 'CHF' }
];

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
    const code = (overrideCode || this.settings.currency || 'MYR').toUpperCase();
    const symbol = getCurrencySymbol(code);
    const fractionDigits = code === 'JPY' ? 0 : 2;
    const formatted = (Number(amount) || 0).toLocaleString('en-US', {
      minimumFractionDigits: fractionDigits,
      maximumFractionDigits: fractionDigits
    });
    return `${symbol} ${formatted}`;
  }
}

export const settingsStore = new SettingsStore();

