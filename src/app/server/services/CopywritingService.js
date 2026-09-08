const fs = require('fs');
const path = require('path');
const config = require('../config');
const AuditService = require('./AuditService');
const WorkspaceService = require('./WorkspaceService');

class CopywritingService {
  /**
   * Resolves the copywriting file path for a project.
   * Priority: <projectPath>/03_COPYWRITING/COPY.md -> fallback: <projectPath>/COPY.md -> fallback: _Team/copywriting/<id>.md
   */
  static getCopyFilePath(projectPath, projectId) {
    if (projectPath && fs.existsSync(projectPath)) {
      const dir03 = path.join(projectPath, '03_COPYWRITING');
      if (!fs.existsSync(dir03)) {
        try {
          fs.mkdirSync(dir03, { recursive: true });
        } catch (e) {
          // fallback to project root
          return path.join(projectPath, 'COPY.md');
        }
      }
      return path.join(dir03, 'COPY.md');
    }

    const teamDir = path.join(config.WORKSPACE_ROOT, '_Team', 'copywriting');
    if (!fs.existsSync(teamDir)) {
      try {
        fs.mkdirSync(teamDir, { recursive: true });
      } catch (e) {}
    }
    return path.join(teamDir, `${projectId}.md`);
  }

  /**
   * Default template for copywriting
   */
  static getDefaultTemplate(projectTitle = 'Project Copywriting') {
    return `# ✍️ Copywriting & Script Studio: ${projectTitle}

## 🎯 Target Audience & Hook Strategy
- **Core Demographic**: Men aged 28-55 seeking high performance, energy, and vitality.
- **Tone of Voice**: Masculine, Authoritative, Trustworthy, Premium Medical.
- **Primary Angle**: Clinically proven vitality formulation with 100% pure authentic ingredients.

---

## 📢 Meta Ad Creative Copy Variants

### Angle 1: Direct Benefit & Authority
> **Headline**: "Rahsia Tenaga Lelaki Sejati Kini Terbongkar — 100% Asli Tanpa Kompromi."
> **Primary Text**: Ramai lelaki alami keletihan selepas seharian bekerja keras. Jangan biarkan prestasi anda menurun. Diformulasikan khusus untuk mengembalikan stamina dan fokus puncak harian anda.
> **CTA**: [ Tempah Sekarang — Penghantaran Percuma ]

### Angle 2: Social Proof & Urgency
> **Headline**: "Lebih 15,000+ Pelanggan Berpuas Hati — Stok Terhad!"
> **Primary Text**: Nikmati keyakinan diri tahap maksimum dengan ramuan herba terpilih SuamiSihat.
> **CTA**: [ Dapatkan Tawaran Eksklusif Hari Ini ]

---

## 🎬 TikTok / Reels Video Script (9:16)

| Scene | Visual / On-Screen Action | Audio / Voiceover (Malay) |
| :--- | :--- | :--- |
| **00:00 - 00:03** | Close-up botol Rejal, pencahayaan dramatik, audio swoosh | *"Bang, kalau selalu rasa lemau balik kerja, dengar ni kejap..."* |
| **00:03 - 00:07** | B-roll lelaki bertenaga bekerja & bersenam | *"Rahsia stamina padu bukan kopi biasa, tapi khasiat herba gred premium."* |
| **00:07 - 00:12** | Unboxing packaging premium SuamiSihat | *"Lulus KKM, 100% bahan selamat dan terbukti berkesan."* |
| **00:12 - 00:15** | CTA end card & promo link | *"Klik beg kuning atau link di bio sekarang sebelum promosi tamat!"* |

---

## 📦 Packaging & Label Compliance Claims
- [x] Tiada bahan kimia terlarang / No banned substances
- [x] Halal certified extraction process
- [x] Standard dos harian: 1 sudu setiap pagi sebelum sarapan
`;
  }

  /**
   * Reads the project's copywriting Markdown file.
   */
  static getCopywriting(projectPath, projectId, projectTitle = '') {
    const filePath = this.getCopyFilePath(projectPath, projectId);
    let body = '';
    let lastUpdated = null;
    let updatedBy = 'Copywriter';

    if (fs.existsSync(filePath)) {
      try {
        body = fs.readFileSync(filePath, 'utf8');
        const stats = fs.statSync(filePath);
        lastUpdated = stats.mtime.toISOString();
      } catch (err) {
        console.error(`[CopywritingService] Read error for ${filePath}:`, err.message);
      }
    }

    if (!body.trim()) {
      body = this.getDefaultTemplate(projectTitle || projectId);
      // Auto-save the default template so the file is created on NAS
      try {
        fs.writeFileSync(filePath, body, 'utf8');
        lastUpdated = new Date().toISOString();
      } catch (err) {
        console.warn(`[CopywritingService] Auto-save default error:`, err.message);
      }
    }

    const words = body.trim().split(/\s+/).filter(Boolean).length;
    const chars = body.length;
    const readingTimeMin = Math.max(1, Math.ceil(words / 200));

    return {
      filePath,
      body,
      stats: {
        words,
        chars,
        readingTimeMin
      },
      lastUpdated,
      updatedBy
    };
  }

  /**
   * Updates copywriting markdown content for a project.
   */
  static updateCopywriting(projectPath, projectId, bodyContent = '', actor = 'Copywriter', role = 'Copywriter') {
    const filePath = this.getCopyFilePath(projectPath, projectId);
    
    try {
      fs.writeFileSync(filePath, bodyContent, 'utf8');

      AuditService.logEvent({
        actor,
        role,
        action: 'COPYWRITING_UPDATED',
        entityType: 'Project',
        entityId: projectId,
        details: {
          filePath,
          chars: bodyContent.length,
          snippet: bodyContent.length > 80 ? bodyContent.substring(0, 80) + '...' : bodyContent
        }
      });

      const words = bodyContent.trim().split(/\s+/).filter(Boolean).length;
      const chars = bodyContent.length;
      const readingTimeMin = Math.max(1, Math.ceil(words / 200));

      return {
        success: true,
        filePath,
        body: bodyContent,
        stats: {
          words,
          chars,
          readingTimeMin
        },
        lastUpdated: new Date().toISOString(),
        updatedBy: actor
      };
    } catch (err) {
      console.error(`[CopywritingService] Write error for ${filePath}:`, err.message);
      throw new Error(`Failed to save copywriting to NAS: ${err.message}`);
    }
  }
}

module.exports = CopywritingService;
