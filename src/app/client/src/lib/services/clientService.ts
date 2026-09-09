/**
 * Kanso Cre8 — Client Management Service
 * Manages client profiles, brand palettes, and billing rates.
 */

import type { ClientProfile } from '../types/kanso';

const STORAGE_KEY = 'kanso_cre8_clients';

export const DEFAULT_CLIENTS: ClientProfile[] = [
  {
    id: 'acmecorp',
    name: 'Acme Corporation',
    code: 'ACME',
    contactPerson: 'Sarah Jenkins',
    email: 'sarah.j@acmefintech.io',
    phone: '+1 (555) 234-5678',
    billingAddress: '100 Market St, Suite 400, San Francisco, CA 94105',
    currency: 'USD',
    defaultHourlyRate: 125,
    paymentTermsDays: 15,
    palette: {
      primary: '#0066FF',   // Electric Blue
      secondary: '#0052CC', // Deep Cobalt
      dark: '#0A0D14',      // Obsidian
      light: '#F8FAFC',     // Slate Light
      accent: '#00F0FF'     // Cyber Cyan
    },
    notes: 'Tone: Modern, trustworthy, tech-forward fintech. Deliver 4K PNGs & vector SVGs.',
    activeProjectsCount: 2,
    totalInvoiced: 4750
  },
  {
    id: 'nexusstudio',
    name: 'Nexus Studio',
    code: 'NEX',
    contactPerson: 'Marcus Vance',
    email: 'marcus@nexusstudio.io',
    phone: '+1 (555) 876-5432',
    billingAddress: '540 Arts District Blvd, Los Angeles, CA 90013',
    currency: 'USD',
    defaultHourlyRate: 110,
    paymentTermsDays: 14,
    palette: {
      primary: '#10B981',   // Emerald Green
      secondary: '#059669', // Forest
      dark: '#18181B',      // Zinc Dark
      light: '#F0FDF4',     // Emerald Wash
      accent: '#38BDF8'     // Sky Accent
    },
    notes: 'Gaming UI/UX, key visual artwork, and high-impact social media campaign collateral.',
    activeProjectsCount: 1,
    totalInvoiced: 2200
  },
  {
    id: 'luminalabs',
    name: 'Lumina Labs',
    code: 'LUM',
    contactPerson: 'Elena Rostova',
    email: 'elena@luminalabs.ai',
    phone: '+44 20 7946 0912',
    billingAddress: '74 Shoreditch High St, London E1 6JJ, United Kingdom',
    currency: 'USD',
    defaultHourlyRate: 140,
    paymentTermsDays: 30,
    palette: {
      primary: '#8B5CF6',   // Deep Purple
      secondary: '#6D28D9', // Violet
      dark: '#09090B',      // Matte Obsidian
      light: '#FAFAFA',     // Clean Porcelain
      accent: '#F59E0B'     // Amber Gold
    },
    notes: 'AI research visual brand system, 3D interactive hero illustrations, and investor decks.',
    activeProjectsCount: 1,
    totalInvoiced: 3500
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

  public getClientRate(code: string): number {
    const client = this.getClientByCode(code);
    return client?.defaultHourlyRate || 100;
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
