/**
 * Kanso Cre8 — Client Management Service
 * Manages client profiles, brand palettes, and billing rates.
 */

import type { ClientProfile } from '../types/kanso';

const STORAGE_KEY = 'kanso_cre8_clients';

export const DEFAULT_CLIENTS: ClientProfile[] = [
  {
    id: 'acme',
    name: 'Acme Corporation',
    code: 'ACME',
    contactPerson: 'Sarah Jenkins',
    email: 'operations@acme.com',
    phone: '+1 555-0199',
    billingAddress: '100 Innovation Way, Suite 400, San Francisco, CA 94105',
    currency: 'USD',
    defaultHourlyRate: 150,
    paymentTermsDays: 14,
    palette: {
      primary: '#0284C7',   // Ocean Blue
      secondary: '#0369A1', // Deep Sky
      dark: '#0B192C',      // Obsidian Ink
      light: '#F0F9FF',     // Sky Tint
      accent: '#38BDF8'     // Electric Cyan
    },
    notes: 'Enterprise cloud infrastructure, design systems, and cross-platform creative operations.',
    activeProjectsCount: 2,
    totalInvoiced: 14200
  },
  {
    id: 'nexus',
    name: 'Nexus Studio',
    code: 'NEX',
    contactPerson: 'Alex Vance',
    email: 'hello@nexusstudio.io',
    phone: '+44 20-7946-0912',
    billingAddress: '42 Shoreditch High St, Hackney, London E1 6JJ, UK',
    currency: 'GBP',
    defaultHourlyRate: 140,
    paymentTermsDays: 30,
    palette: {
      primary: '#8B5CF6',   // Purple Haze
      secondary: '#6D28D9', // Deep Violet
      dark: '#18181B',      // Zinc Obsidian
      light: '#FAF5FF',     // Lavender Tint
      accent: '#A855F7'     // Electric Violet
    },
    notes: 'Multimedia motion design, 3D visual campaigns, and interactive digital experiences.',
    activeProjectsCount: 1,
    totalInvoiced: 9800
  },
  {
    id: 'lumina',
    name: 'Lumina Labs',
    code: 'LUM',
    contactPerson: 'Elena Rostova',
    email: 'contact@luminalabs.dev',
    phone: '+65 6789-0123',
    billingAddress: '71 Ayer Rajah Crescent, #03-01, Singapore 139951',
    currency: 'SGD',
    defaultHourlyRate: 160,
    paymentTermsDays: 15,
    palette: {
      primary: '#10B981',   // Emerald Mint
      secondary: '#047857', // Forest Deep
      dark: '#09090B',      // Kanso Canvas
      light: '#ECFDF5',     // Mint Silk
      accent: '#F59E0B'     // Amber Gold
    },
    notes: 'Biotech intelligence, generative research interfaces, and data visualization design.',
    activeProjectsCount: 1,
    totalInvoiced: 11500
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
          const hasLegacy = parsed.some((c: any) => ['JOM', 'GOV', 'SS', 'JP', 'GV'].includes(c.code));
          const hasCanonical = parsed.some((c: any) => ['ACME', 'NEX', 'LUM'].includes(c.code));
          if (hasCanonical && !hasLegacy) {
            this.clients = parsed;
            return this.clients;
          }
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
