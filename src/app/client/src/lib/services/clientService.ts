/**
 * Kanso Cre8 — Client Management Service
 * Manages client profiles, brand palettes, and billing rates.
 */

import type { ClientProfile } from '../types/kanso';

const STORAGE_KEY = 'kanso_cre8_clients';

export const DEFAULT_CLIENTS: ClientProfile[] = [
  {
    id: 'jomparking',
    name: 'JomParking™',
    code: 'JOM',
    contactPerson: 'Dharma Syahril',
    email: 'billing@jomparking.com',
    phone: '+60 3-7887 8899',
    billingAddress: 'Level 12, Menara LGB, Taman Tun Dr Ismail, 60000 Kuala Lumpur',
    currency: 'MYR',
    defaultHourlyRate: 180,
    paymentTermsDays: 14,
    palette: {
      primary: '#FF6600',   // JomParking Orange
      secondary: '#0A192F', // Deep Navy
      dark: '#111827',      // Slate Obsidian
      light: '#FFF7ED',     // Warm Papaya
      accent: '#00C2FF'     // Parking Bay Cyan
    },
    notes: 'Smart city urban parking, IoT mobility solutions, contactless QR street parking & merchant dashboards.',
    activeProjectsCount: 2,
    totalInvoiced: 8500
  },
  {
    id: 'govicle',
    name: 'Govicle®',
    code: 'GOV',
    contactPerson: 'Muhamad Hanif',
    email: 'accounts@govicle.com',
    phone: '+60 3-8322 6677',
    billingAddress: 'Tech Hub Cyberjaya, Block 3502, Jalan Teknokrat 5, 63000 Cyberjaya, Selangor',
    currency: 'MYR',
    defaultHourlyRate: 220,
    paymentTermsDays: 30,
    palette: {
      primary: '#1E40AF',   // Govicle Royal Blue
      secondary: '#0D9488', // Tech Teal Fleet
      dark: '#0F172A',      // Midnight Slate
      light: '#F0F9FF',     // Sky Tint
      accent: '#10B981'     // EV Emerald
    },
    notes: 'Enterprise fleet telematics, EV charging network UX, and automated road-tax compliance portals.',
    activeProjectsCount: 1,
    totalInvoiced: 12400
  },
  {
    id: 'suamisihat',
    name: 'SuamiSihat™',
    code: 'SS',
    contactPerson: 'Harusssani Manaphassan',
    email: 'creative@suamisihat.myds.me',
    phone: '+60 12-345 6789',
    billingAddress: 'Atelier 08, Bukit Damansara, 50490 Kuala Lumpur, Malaysia',
    currency: 'MYR',
    defaultHourlyRate: 160,
    paymentTermsDays: 15,
    palette: {
      primary: '#059669',   // Forest Emerald
      secondary: '#047857', // Deep Forest
      dark: '#09090B',      // Atelier Obsidian
      light: '#ECFDF5',     // Mint Silk
      accent: '#F59E0B'     // Amber Vitality
    },
    notes: 'Men\'s holistic wellness, nutritional health supplement branding, discreet telehealth portal UI.',
    activeProjectsCount: 1,
    totalInvoiced: 6800
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
          const hasJom = parsed.some((c: any) => c.code === 'JOM' || c.code === 'GOV');
          if (hasJom) {
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
