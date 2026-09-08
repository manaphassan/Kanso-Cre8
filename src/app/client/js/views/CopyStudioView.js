/**
 * Copywriting & Script Studio View
 * Microsoft Fluent System SVG Icons Compliance (Zero Emojis)
 */

const CopyStudioView = {
  async render(container) {
    const svgs = window.SS_BRAND_SVGS || {};
    const getIcon = (name, size = 20, color = 'currentColor') => svgs.fluentIcon ? svgs.fluentIcon(name, size, color) : '';

    container.innerHTML = `
      <div style="display: flex; align-items: center; justify-content: center; height: 300px;">
        <div style="text-align: center; color: var(--text-secondary);">
          <div style="margin-bottom: 8px;">${getIcon('copy', 32, 'var(--brand-accent)')}</div>
          <div>Loading Copywriting Matrix...</div>
        </div>
      </div>
    `;

    try {
      const response = await ApiClient.getProjects();
      const projects = response.projects || [];

      container.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
          <div>
            <h1 style="font-size: 24px; font-weight: 800; color: var(--text-primary); margin: 0; display: flex; align-items: center; gap: 10px;">
              ${getIcon('copy', 24, 'var(--brand-accent)')}
              <span>Copywriting & Script Matrix</span>
            </h1>
            <p style="color: var(--text-secondary); font-size: 13px; margin-top: 4px;">
              Manage advertising scripts, marketing copy, and AI prompt templates across all campaign projects.
            </p>
          </div>
        </div>

        <!-- AI Copywriting Preset Templates Bar -->
        <div style="background: var(--surface-card); border: 1px solid var(--surface-card-border); border-radius: var(--radius-lg); padding: 14px 18px; margin-bottom: 20px; display: flex; align-items: center; justify-content: space-between; gap: 16px;">
          <div style="display: flex; align-items: center; gap: 8px;">
            <span class="badge badge-brand" style="font-size: 11px; padding: 3px 8px;">AI TEMPLATES</span>
            <span style="font-size: 12.5px; font-weight: 700; color: var(--text-primary);">Quick Creative Angles:</span>
          </div>
          <div style="display: flex; gap: 8px; flex-wrap: wrap;">
            <button class="btn btn-xs btn-secondary" onclick="CopyStudioView.copyTemplate('tiktok_hook')" title="Copy TikTok Viral Hook Template">
              📱 TikTok Hook
            </button>
            <button class="btn btn-xs btn-secondary" onclick="CopyStudioView.copyTemplate('fb_problem_solution')" title="Copy Facebook Problem/Solution Script">
              📘 FB Problem/Solution
            </button>
            <button class="btn btn-xs btn-secondary" onclick="CopyStudioView.copyTemplate('packaging_benefit')" title="Copy Packaging Claim Bullet Points">
              📦 Packaging Benefit Claims
            </button>
          </div>
        </div>

        <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(360px, 1fr)); gap: 20px;">
          ${projects.map(p => {
            const copy = p.copywriting || { status: 'draft' };
            const statusColor = copy.status === 'approved' ? '#10B981' : copy.status === 'revision_requested' ? '#EF4444' : copy.status === 'submitted' ? '#F59E0B' : '#64748B';

            return `
              <div class="card" style="display: flex; flex-direction: column; justify-content: space-between; gap: 14px;">
                <div>
                  <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 8px;">
                    <div>
                      <span style="font-family: var(--font-mono); font-weight: 800; font-size: 13px; color: var(--brand-accent);">${p.jobId}</span>
                      <h3 style="font-size: 15px; font-weight: 700; color: var(--text-primary); margin: 2px 0 0 0;">${p.title}</h3>
                    </div>
                    <span class="badge" style="background: ${statusColor}20; color: ${statusColor}; border: 1px solid ${statusColor}40;">
                      ${copy.status || 'draft'}
                    </span>
                  </div>

                  <div style="background: var(--surface-card-subtle); padding: 12px; border-radius: var(--radius-md); margin-bottom: 10px; border: 1px solid var(--surface-card-border);">
                    <div style="font-size: 11px; font-weight: 700; color: var(--text-secondary); margin-bottom: 4px; text-transform: uppercase;">Headline</div>
                    <div style="font-size: 13.5px; font-weight: 700; color: var(--text-primary); margin-bottom: 8px;">
                      ${copy.headline ? `"${copy.headline}"` : '<i style="color: var(--text-tertiary);">No headline drafted</i>'}
                    </div>

                    <div style="font-size: 11px; font-weight: 700; color: var(--text-secondary); margin-bottom: 4px; text-transform: uppercase;">Script / Body Excerpt</div>
                    <div style="font-size: 12.5px; color: var(--text-secondary); line-height: 1.4;">
                      ${copy.body_copy ? (copy.body_copy.length > 140 ? copy.body_copy.substring(0, 140) + '...' : copy.body_copy) : '<i style="color: var(--text-tertiary);">No body copy provided</i>'}
                    </div>
                  </div>

                  <div style="display: flex; justify-content: space-between; font-size: 11.5px; color: var(--text-secondary);">
                    <span>Designer: <b>${p.designer}</b></span>
                    <span>Brand: <b>${p.brand}</b></span>
                  </div>
                </div>

                <div style="padding-top: 10px; border-top: 1px solid var(--surface-card-border); display: flex; gap: 8px;">
                  <button class="btn btn-sm btn-ghost" style="flex: 1; display: inline-flex; align-items: center; justify-content: center; gap: 6px;" onclick="CopyStudioView.copyScriptText('${(copy.headline || '').replace(/'/g, "\\'")}', '${(copy.body_copy || '').replace(/'/g, "\\'")}')">
                    ${getIcon('copy', 14)}
                    <span>Copy Text</span>
                  </button>
                  <button class="btn btn-sm btn-primary" style="flex: 1.2;" onclick="window.AppRouter.navigate('project-detail', { id: '${p.id}', tab: 'copy' })">
                    Open Studio →
                  </button>
                </div>
              </div>
            `;
          }).join('')}
        </div>
      `;
    } catch (err) {
      container.innerHTML = `
        <div class="card" style="border-color: var(--color-danger);">
          <p style="color: var(--color-danger);">Failed to load copywriting data: ${err.message}</p>
        </div>
      `;
    }
  },

  copyScriptText(headline, body) {
    const fullText = [headline ? `Headline: ${headline}` : '', body ? `Body:\n${body}` : ''].filter(Boolean).join('\n\n');
    if (!fullText) {
      window.showToast('No script copy text available to copy.', 'warning');
      return;
    }
    navigator.clipboard.writeText(fullText).then(() => {
      window.showToast('Copywriting script copied to clipboard!', 'success');
    }).catch(() => {
      window.showToast('Failed to copy text to clipboard.', 'danger');
    });
  },

  copyTemplate(type) {
    const templates = {
      tiktok_hook: `[TikTok Viral 3s Hook]\n"Kalau korang masih hadapi masalah ini, stop skrol sekarang! Ramai tak tahu formula rahsia SuamiSihat ini..."`,
      fb_problem_solution: `[Facebook Ad Angle - Problem/Solution]\nHeadline: Solusi Lengkap Tenaga & Stamina Lelaki Modern\nBody: Penat kerja sepanjang hari? Dapatkan formula SuamiSihat dengan kelulusan KKM & ujian makmal. Beli harini percuma penghantaran!`,
      packaging_benefit: `[Product Packaging Claim Standard]\n• 100% Bahan Semula Jadi Terpilih\n• Diformulasi Khusus Untuk Tenaga Lelaki\n• Lulus Ujian Makmal & Kualiti Premium`
    };

    const text = templates[type] || '';
    if (text) {
      navigator.clipboard.writeText(text).then(() => {
        window.showToast('AI Script Template copied to clipboard!', 'success');
      });
    }
  }
};

window.CopyStudioView = CopyStudioView;
