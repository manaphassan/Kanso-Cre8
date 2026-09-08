/**
 * Kanso Cre8 — Client Management Service
 * Manages client profiles, brand palettes, and billing rates.
 */

import type { ClientProfile } from '../types/kanso';

const STORAGE_KEY = 'kanso_cre8_clients';

export const DEFAULT_CLIENTS: ClientProfile[] = [
  {
    id: 'govicle',
    name: 'Govicle Sdn Bhd',
    code: 'GOV',
    contactPerson: 'Amirul Haziq',
    email: 'amirul@govicle.my',
    phone: '+60 12-345 6789',
    billingAddress: 'Level 15, Menara Govicle, Bangsar South, 59200 Kuala Lumpur',
    currency: 'MYR',
    defaultHourlyRate: 120,
    paymentTermsDays: 14,
    palette: {
      primary: '#0EA5E9',   // Sky Blue
      secondary: '#0284C7', // Cobalt
      dark: '#0F172A',      // Slate Dark
      light: '#F8FAFC',     // Slate Light
      accent: '#38BDF8'     // Light Glow
    },
    notes: 'Tone: Modern, trustworthy, tech-forward B2B enterprise mobility. Deliver 4K PNGs & vector SVGs.',
    activeProjectsCount: 2,
    totalInvoiced: 4750
  },
  {
    id: 'jomparking',
    name: 'Jomparking Technologies',
    code: 'JOM',
    contactPerson: 'Stephanie Wong',
    email: 'steph@jomparking.com',
    phone: '+60 16-987 6543',
    billingAddress: 'Q Sentral, 2A, Jalan Stesen Sentral 2, KL Sentral, 50470 Kuala Lumpur',
    currency: 'MYR',
    defaultHourlyRate: 110,
    paymentTermsDays: 14,
    palette: {
      primary: '#10B981',   // Emerald Green
      secondary: '#047857', // Forest
      dark: '#1E293B',      // Charcoal
      light: '#F0FDF4',     // Emerald Wash
      accent: '#F59E0B'     // Amber Accent
    },
    notes: 'Smart parking app promotional campaigns, viral social ads, and outdoor banner collateral.',
    activeProjectsCount: 1,
    totalInvoiced: 2200
  },
  {
    id: 'suamisihat',
    name: 'SuamiSihat Holding',
    code: 'SSH',
    contactPerson: 'Harussani (Lead Art Director)',
    email: 'tech@suamisihat.com.my',
    phone: '+60 19-876 5432',
    billingAddress: 'SuamiSihat Creative HQ, Kuala Lumpur',
    currency: 'MYR',
    defaultHourlyRate: 150,
    paymentTermsDays: 30,
    palette: {
      primary: '#043388',   // Royal Navy
      secondary: '#21A1F7', // Azure Blue
      dark: '#022057',      // Deep Navy
      light: '#FAFAFA',     // Clean Slate
      accent: '#FCE53D'     // Gold
    },
    notes: 'Brand asset management, packaging box dielines, and corporate digital media retainer.',
    activeProjectsCount: 1,
    totalInvoiced: 3000
  }
];

export class ClientService {
  private static instance: ClientService;
  private clients: ClientProfile[] = [];

  private constructor() {
    this.loadClients();
  }

  public static getInstance(): ClientService {
    if (!ClientService.instance) {
      ClientService.instance = new ClientService();
    }
    return ClientService.instance;
  }

  public loadClients(): ClientProfile[] {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          this.clients = parsed;
          return this.clients;
        }
      }
    } catch (e) {
      console.warn('[ClientService] Error loading clients, falling back to defaults:', e);
    }
    this.clients = [...DEFAULT_CLIENTS];
    this.saveClients();
    return this.clients;
  }

  public saveClients(): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.clients));
    } catch (e) {
      console.error('[ClientService] Error saving clients:', e);
    }
  }

  public getClients(): ClientProfile[] {
    if (this.clients.length === 0) {
      this.loadClients();
    }
    return this.clients;
  }

  public getClientByCode(code: string): ClientProfile | undefined {
    return this.clients.find(c => c.code.toUpperCase() === code.toUpperCase());
  }

  public getClientById(id: string): ClientProfile | undefined {
    return this.clients.find(c => c.id === id);
  }

  public addClient(client: ClientProfile): void {
    this.clients.push(client);
    this.saveClients();
  }

  public updateClient(client: ClientProfile): void {
    const index = this.clients.findIndex(c => c.id === client.id);
    if (index !== -1) {
      this.clients[index] = client;
      this.saveClients();
    }
  }

  public deleteClient(id: string): void {
    this.clients = this.clients.filter(c => c.id !== id);
    this.saveClients();
  }
}

export const clientService = ClientService.getInstance();
