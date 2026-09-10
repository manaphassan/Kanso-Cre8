/**
 * Kanso Cre8 — Studio Settings Store (Svelte 5 Runes)
 * Persists creator preferences, default rates, currency, and studio configuration.
 */

export interface StudioSettings {
  defaultHourlyRate: number;
  currency: 'USD' | 'MYR' | 'EUR' | 'GBP';
  currencySymbol: string;
  defaultLens: 'studio' | 'my-workspace';
  timerAutoLog: boolean;
  vaultAutoSave: boolean;
  soundEffects: boolean;
}

const STORAGE_KEY = 'kanso_studio_settings';

const DEFAULT_SETTINGS: StudioSettings = {
  defaultHourlyRate: 180,
  currency: 'MYR',
  currencySymbol: 'RM',
  defaultLens: 'studio',
  timerAutoLog: true,
  vaultAutoSave: true,
  soundEffects: true
};

const CURRENCY_SYMBOLS: Record<string, string> = {
  MYR: 'RM',
  USD: '$',
  EUR: '€',
  GBP: '£'
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
        this.settings = {
          ...DEFAULT_SETTINGS,
          ...parsed,
          currencySymbol: CURRENCY_SYMBOLS[parsed.currency] || '$'
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
      this.settings.currencySymbol = CURRENCY_SYMBOLS[this.settings.currency] || '$';
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.settings));
    } catch (e) {
      console.error('[SettingsStore] Error saving settings:', e);
    }
  }

  updateSettings(partial: Partial<StudioSettings>): void {
    this.settings = {
      ...this.settings,
      ...partial,
      currencySymbol: CURRENCY_SYMBOLS[partial.currency || this.settings.currency] || '$'
    };
    this.saveSettings();
  }

  formatMoney(amount: number): string {
    const symbol = this.settings.currencySymbol || '$';
    return `${symbol}${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }
}

export const settingsStore = new SettingsStore();
