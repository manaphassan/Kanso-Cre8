/**
 * Kanso Cre8 — Studio & Freelance Branding Service
 * Mindful, local-first master profile for client-facing stationery:
 * Invoices, Quotations, Letterheads, Approval Packages, and Email Footers.
 */
import { ApiClient } from './api';

export interface StudioProfile {
  // ─── 1. Studio & Principal Visual Identity ───
  studioName: string;
  principalName: string;
  professionalTitle: string;
  tagline: string;
  logo: string;
  brandColor: string;

  // ─── 2. Business Registration & Commercial Contact ───
  businessRegNo: string;
  billingEmail: string;
  studioAddress: string;
  website: string;
  phone: string;

  // ─── 3. Payment Remittance & Settlement Terms ───
  paymentBank: string;
  paymentAccountNo: string;
  paymentAccountName: string;
  paymentSwiftOrQr: string;
  defaultPaymentTerms: string;
  defaultCurrency: string;

  // ─── 4. Document Seal & Verification ───
  digitalSignature: string;
  footerNotice: string;
}

export const DEFAULT_STUDIO_PROFILE: StudioProfile = {
  studioName: 'HaNa Innovation',
  principalName: 'Harussani',
  professionalTitle: 'Principal Art Director & Brand Architect',
  tagline: 'Mindful Brand Systems & Digital Craft',
  businessRegNo: '202601004829 (LLP-9921)',
  billingEmail: 'harussani@hana-innovation.com',
  studioAddress: 'Kuala Lumpur, Malaysia',
  website: 'https://hana-innovation.com',
  phone: '+60 12-345 6789',
  paymentBank: 'Maybank (MBBEMYKL)',
  paymentAccountNo: '5140-1234-5678',
  paymentAccountName: 'HaNa Innovation',
  paymentSwiftOrQr: 'DuitNow / SWIFT: MBBEMYKL',
  defaultPaymentTerms: '50% Upfront Deposit • Net 14 Days • 2 Revision Rounds',
  defaultCurrency: 'USD',
  brandColor: '#0284C7',
  logo: '',
  digitalSignature: '',
  footerNotice: 'Crafted with mindful focus & precision in Kanso Cre8.'
};

class StudioService {
  private static readonly STORAGE_KEY = 'kanso_studio_branding_v1';
  profile = $state<StudioProfile>(this.loadInitial());

  private loadInitial(): StudioProfile {
    if (typeof localStorage === 'undefined') return { ...DEFAULT_STUDIO_PROFILE };
    try {
      const raw = localStorage.getItem(StudioService.STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        return { ...DEFAULT_STUDIO_PROFILE, ...parsed };
      }
    } catch {}
    return { ...DEFAULT_STUDIO_PROFILE };
  }

  async init(): Promise<StudioProfile> {
    try {
      const res = await ApiClient.getStudioProfile().catch(() => null);
      if (res && res.success && res.profile) {
        this.profile = { ...DEFAULT_STUDIO_PROFILE, ...res.profile };
        this.persistLocal();
      }
    } catch {}
    return this.profile;
  }

  persistLocal(): void {
    if (typeof localStorage !== 'undefined') {
      try {
        localStorage.setItem(StudioService.STORAGE_KEY, JSON.stringify(this.profile));
      } catch {}
    }
  }

  async saveProfile(updated: Partial<StudioProfile>): Promise<StudioProfile> {
    this.profile = { ...this.profile, ...updated };
    this.persistLocal();
    try {
      await ApiClient.updateStudioProfile(this.profile).catch(() => null);
    } catch {}
    return this.profile;
  }
}

export const studioService = new StudioService();
