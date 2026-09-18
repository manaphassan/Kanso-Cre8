/**
 * Kanso Cre8 — Creative Discipline Scope Presets
 * Curated scope templates for professional freelance visual creators,
 * design engineers, brand architects, and copywriters.
 */

export interface ScopePresetItem {
  description: string;
  quantity: number; // default recommended hours or unit count
  unitPriceMultiplier: number; // multiplier against base hourly rate (1 = 1 hour, 0.5 = half hour, etc.)
}

export interface ScopeDisciplineTemplate {
  id: string;
  name: string;
  shortName: string;
  badge: string;
  icon: string;
  description: string;
  recommendedTerms: string;
  items: ScopePresetItem[];
}

export const CREATIVE_SCOPE_PRESETS: ScopeDisciplineTemplate[] = [
  {
    id: 'ui-ux-design',
    name: 'UI / UX & Product Design',
    shortName: 'UI/UX',
    badge: 'Product & Web App',
    icon: 'M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z',
    description: 'End-to-end digital product design package from wireframes to design system tokens and developer handoff.',
    recommendedTerms: '50% upfront deposit • Balance upon final Figma transfer • Includes 2 rounds of iterative usability feedback.',
    items: [
      {
        description: 'Discovery & Information Architecture: User personas, task flows, and low-fi wireframing',
        quantity: 15,
        unitPriceMultiplier: 1.0
      },
      {
        description: 'Atomic Design System: Typography scales, color tokens, responsive components & auto-layout specs',
        quantity: 25,
        unitPriceMultiplier: 1.0
      },
      {
        description: 'High-Fidelity UI Design: Responsive desktop & mobile views with interactive micro-interactions',
        quantity: 20,
        unitPriceMultiplier: 1.0
      },
      {
        description: 'Interactive Prototyping & Developer Handoff: Clickable prototype, edge cases & redline documentation',
        quantity: 12,
        unitPriceMultiplier: 1.0
      }
    ]
  },
  {
    id: 'brand-identity',
    name: 'Brand Identity & Visual System',
    shortName: 'Brand Identity',
    badge: 'Branding & Systems',
    icon: 'M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01',
    description: 'Comprehensive brand identity architecture including logomarks, typography hierarchy, swatches, and master style guide.',
    recommendedTerms: '50% initial retainer • 50% upon final master vector handover • 3 distinct concept routes • Full commercial IP transfer.',
    items: [
      {
        description: 'Brand Positioning & Visual Moodboard: Market audit, competitor landscape, and aesthetic direction',
        quantity: 10,
        unitPriceMultiplier: 1.0
      },
      {
        description: 'Logomark System: Primary logo, secondary lockup, responsive monograms, and favicon suite',
        quantity: 22,
        unitPriceMultiplier: 1.0
      },
      {
        description: 'Color & Typographic Architecture: Primary/secondary palettes, WCAG contrast verification, font pairing rules',
        quantity: 12,
        unitPriceMultiplier: 1.0
      },
      {
        description: 'Brand Guidelines Dossier: Comprehensive PDF rulebook, logo clearance zones, usage dos & don’ts, asset vault',
        quantity: 16,
        unitPriceMultiplier: 1.0
      }
    ]
  },
  {
    id: 'motion-3d',
    name: '3D & Motion Design',
    shortName: '3D & Motion',
    badge: 'Animation & CGI',
    icon: 'M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z',
    description: 'Hero 3D visual storytelling, product styleframes, realistic PBR material shading, and kinetic motion choreography.',
    recommendedTerms: 'Styleframe signoff required prior to final 4K rendering • 2 revision passes • Additional render farm passes billed at cost.',
    items: [
      {
        description: 'Creative Concept & 3D Styleframes: Treatment boards, camera compositions, and lighting blockout',
        quantity: 16,
        unitPriceMultiplier: 1.0
      },
      {
        description: '3D Modeling, PBR Texturing & Shading: High-poly asset creation, UV unwrapping, and physical materials',
        quantity: 24,
        unitPriceMultiplier: 1.0
      },
      {
        description: 'Kinetic Motion Choreography: Camera motion curves, kinetic typography, and synchronized sound design cues',
        quantity: 20,
        unitPriceMultiplier: 1.0
      },
      {
        description: 'Octane / Redshift 4K Multi-Pass Rendering: Color grading, beauty pass composite, and ProRes/H.265 master delivery',
        quantity: 18,
        unitPriceMultiplier: 1.0
      }
    ]
  },
  {
    id: 'commercial-photography',
    name: 'Commercial Photography & Retouching',
    shortName: 'Photography',
    badge: 'Studio & Art Direction',
    icon: 'M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9zM15 13a3 3 0 11-6 0 3 3 0 016 0z',
    description: 'On-location or studio commercial production, tethered capture, art direction, and frequency-separation retouching.',
    recommendedTerms: '50% booking deposit • Full worldwide commercial web & print licensing • 15 master TIFF selects • RAW files excluded.',
    items: [
      {
        description: 'Production Pre-Planning: Creative treatment, moodboards, talent & location scouting, and call sheet',
        quantity: 8,
        unitPriceMultiplier: 1.0
      },
      {
        description: 'Principal Studio Production: Full-day camera rig, professional strobe lighting, and creative art direction',
        quantity: 10,
        unitPriceMultiplier: 1.2
      },
      {
        description: 'Digital Capture Technician & Tethering: Instant color calibration, live client review, and raw curation',
        quantity: 8,
        unitPriceMultiplier: 1.0
      },
      {
        description: 'High-End Beauty & Commercial Retouching: Frequency separation, color grading, and print-ready 16-bit TIFFs',
        quantity: 16,
        unitPriceMultiplier: 1.0
      }
    ]
  },
  {
    id: 'copywriting-content',
    name: 'Copywriting & Content Strategy',
    shortName: 'Copywriting',
    badge: 'Editorial & Messaging',
    icon: 'M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z',
    description: 'Strategic messaging frameworks, high-converting website hero copy, product storytelling, and editorial polish.',
    recommendedTerms: 'Net 14 settlement • Includes 2 iterative feedback reviews within 14 days of draft delivery • Full copyright assignment.',
    items: [
      {
        description: 'Brand Voice & Messaging Framework: Value proposition pillars, audience empathy matrix, and tone guideline',
        quantity: 10,
        unitPriceMultiplier: 1.0
      },
      {
        description: 'Core Website Copywriting: Compelling hero headline, value drivers, product feature cards, and CTA hooks',
        quantity: 20,
        unitPriceMultiplier: 1.0
      },
      {
        description: 'Conversion Lead Magnet & Email Onboarding: 5-part nurture sequence with open-rate optimized subject lines',
        quantity: 14,
        unitPriceMultiplier: 1.0
      },
      {
        description: 'SEO Metadata, Social Proof & Microcopy: OpenGraph previews, tooltip microcopy, and editorial proofreading',
        quantity: 8,
        unitPriceMultiplier: 1.0
      }
    ]
  }
];
