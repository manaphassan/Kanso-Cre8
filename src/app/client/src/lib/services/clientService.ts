/**
 * Kanso Cre8 — Client Management Service
 * Manages client profiles, brand palettes, and billing rates.
 */

import type { ClientProfile } from '../types/kanso';
import { ApiClient } from './api';

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
    currency: 'MYR',
    defaultHourlyRate: 180,
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
    currency: 'MYR',
    defaultHourlyRate: 150,
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
    currency: 'MYR',
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

  public async syncWithServer(): Promise<ClientProfile[]> {
    try {
      const res = await ApiClient.getClients();
      if (res && res.clients && Array.isArray(res.clients) && res.clients.length > 0) {
        this.clients = res.clients.map((c: any) => ({
          id: c.id || c.code.toLowerCase(),
          name: c.name,
          code: c.code,
          contactPerson: c.contactPerson || c.contact_person || '',
          email: c.email || '',
          phone: c.phone || '',
          billingAddress: c.billingAddress || c.billing_address || c.address || '',
          currency: c.currency || 'USD',
          defaultHourlyRate: c.defaultHourlyRate || c.default_hourly_rate || 150,
          paymentTermsDays: c.paymentTermsDays || c.payment_terms_days || 14,
          palette: c.palette || {
            primary: c.color || '#0284C7',
            secondary: '#0052CC',
            dark: '#0A0D14',
            light: '#F8FAFC',
            accent: '#00F0FF'
          },
          notes: c.notes || '',
          activeProjectsCount: c.activeProjectsCount || 0,
          totalInvoiced: c.totalInvoiced || 0
        }));
        return this.clients;
      }
    } catch (e) {
      console.warn('[ClientService] Server sync warning:', e);
    }
    return this.clients;
  }

  public getClients(): ClientProfile[] {
    if (this.clients.length === 0) {
      this.loadClients();
      this.syncWithServer().catch(() => {});
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
    ApiClient.saveClient({
      code: client.code,
      name: client.name,
      contactPerson: client.contactPerson,
      email: client.email,
      phone: client.phone,
      billingAddress: client.billingAddress,
      currency: client.currency,
      defaultHourlyRate: client.defaultHourlyRate,
      paymentTermsDays: client.paymentTermsDays,
      palette: client.palette,
      color: client.palette.primary,
      notes: client.notes
    }).catch(err => console.warn('[ClientService] Failed to save client to server:', err));
  }

  public updateClient(client: ClientProfile): void {
    const index = this.clients.findIndex(c => c.id === client.id);
    if (index !== -1) {
      this.clients[index] = client;
      this.saveClients();
      ApiClient.saveClient({
        code: client.code,
        name: client.name,
        contactPerson: client.contactPerson,
        email: client.email,
        phone: client.phone,
        billingAddress: client.billingAddress,
        currency: client.currency,
        defaultHourlyRate: client.defaultHourlyRate,
        paymentTermsDays: client.paymentTermsDays,
        palette: client.palette,
        color: client.palette.primary,
        notes: client.notes
      }).catch(err => console.warn('[ClientService] Failed to update client on server:', err));
    }
  }

  public deleteClient(id: string): void {
    const target = this.clients.find(c => c.id === id);
    this.clients = this.clients.filter(c => c.id !== id);
    this.saveClients();
    if (target) {
      ApiClient.deleteClient(target.code).catch(err => console.warn('[ClientService] Failed to delete client on server:', err));
    }
  }
}

export const clientService = ClientService.getInstance();
