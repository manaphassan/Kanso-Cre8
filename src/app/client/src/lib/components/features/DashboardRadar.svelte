<script lang="ts">
  import FluentDialog from '../ui/FluentDialog.svelte';
  import FluentIcons from '../ui/FluentIcons.svelte';

  interface SkillItem {
    label: string;
    target: number;
    actual: number;
    projectCount?: number;
  }

  interface Props {
    skills?: SkillItem[];
  }

  interface SkillMeta {
    icon: string;
    category: string;
    whatItMeasures: string;
    whatIsGood: string;
    whatIsBad: string;
    actionAdvice: string;
  }

  let {
    skills
  }: Props = $props();

  const defaultSkills: SkillItem[] = [
    { label: 'Packaging', target: 90, actual: 86, projectCount: 14 },
    { label: 'Graphic Design', target: 95, actual: 94, projectCount: 38 },
    { label: '3D & Motion', target: 80, actual: 78, projectCount: 9 },
    { label: 'Video Editing', target: 85, actual: 88, projectCount: 27 },
    { label: 'Copywriting', target: 75, actual: 72, projectCount: 22 },
    { label: 'Branding', target: 90, actual: 95, projectCount: 16 }
  ];

  const SKILL_METADATA: Record<string, SkillMeta> = {
    'Packaging': {
      icon: '📦',
      category: 'Physical Print & Production',
      whatItMeasures: 'Die-cut accuracy, bleed/margin tolerances, box dielines, bottle/capsule labels, foil stamps, barcoding, and factory prepress readiness.',
      whatIsGood: 'Dielines pass factory prepress checks on the first attempt with 0 bleed/fold errors. Zero factory rejections or reprints.',
      whatIsBad: 'Misaligned fold creases, text cut off by die-cuts, incorrect CMYK/Pantone profile, or missing legal/cert labels requiring costly physical reprint.',
      actionAdvice: 'Require double-check on dieline template and physical mockup fold test before sending to manufacturing.'
    },
    'Graphic Design': {
      icon: '🎨',
      category: 'Visual Craftsmanship & Marketing',
      whatItMeasures: 'Visual hierarchy, typography scale, key visuals (KVs), social media carousels, POSM roll-ups, and promo poster composition.',
      whatIsGood: 'Crisp visual balance, high scroll-stopping aesthetic, clear typographic hierarchy, and instant brand recognition.',
      whatIsBad: 'Cluttered composition, low text contrast, inconsistent font weights, or amateur layout requiring multiple revision rounds.',
      actionAdvice: 'Adhere strictly to Fluent 2 spacing tokens and brand typography scales.'
    },
    '3D & Motion': {
      icon: '🎲',
      category: 'CGI, 3D Rendering & Animation',
      whatItMeasures: '3D product bottle/box modeling, photorealistic lighting, liquid physics simulation, and smooth motion graphics animation.',
      whatIsGood: 'Photorealistic textures, natural lighting reflections, smooth 60fps animations, handling premium product reveals internally.',
      whatIsBad: 'Flat plastic-looking textures, jerky animation curves, slow rendering bottlenecks, or reliance on expensive outside 3D agencies.',
      actionAdvice: 'Optimize lighting presets and maintain reusable master bottle/box 3D models.'
    },
    'Video Editing': {
      icon: '🎬',
      category: 'Direct-Response & Short-Form Video',
      whatItMeasures: 'TikTok / Reels 9:16 video ad pacing, first-3-second hook retention, UGC b-roll cuts, sound design, and subtitle safe zones.',
      whatIsGood: 'First 3s hook retention >30%, punchy cut transitions, crystal-clear audio voiceover mix, rapid testing variations.',
      whatIsBad: 'Slow intro hooks, audio clipping or unmixed background music, captions covered by platform UI icons, low viewer retention.',
      actionAdvice: 'Frontload strongest visual hook in seconds 0-3 and verify mobile TikTok safe-zone overlays.'
    },
    'Copywriting': {
      icon: '✍️',
      category: 'Direct Response & Messaging',
      whatItMeasures: 'Persuasive headlines, problem-agitation scripts, benefit hooks, advertising claims, and call-to-action (CTA) clarity.',
      whatIsGood: 'High click-through-rate (CTR) angles, emotionally resonant pain points, clear CTA, and 100% compliant with ad platform policies.',
      whatIsBad: 'Generic or unconvincing copy, weak hooks, or risky medical/sensational claims that cause Facebook/TikTok ad rejections or account bans.',
      actionAdvice: 'Test at least 3 distinct hook variations per brief and run through the ad policy safety checklist.'
    },
    'Branding': {
      icon: '✨',
      category: 'Brand Identity & Design System',
      whatItMeasures: 'Multi-brand cohesion across SuamiSihat entities (SSH, SSE, SSC, SST, SSW), logo protection zones, color palettes, and brand equity.',
      whatIsGood: 'Flawless brand consistency across packaging, web, and ads; zero off-palette colors; instant customer trust and brand recall.',
      whatIsBad: 'Stretched logos, wrong entity sub-brand color schemes, unapproved typography, or fragmented visual identity confusing customers.',
      actionAdvice: 'Pull colors and typography directly from the SS-CAM design tokens in Brand Hub.'
    }
  };

  const activeSkills = $derived(skills && skills.length > 0 ? skills : defaultSkills);

  let hoveredIndex = $state<number | null>(null);
  let selectedIndex = $state<number>(0);
  let showGuideModal = $state<boolean>(false);

  const cx = 150;
  const cy = 150;
  const maxR = 100;
  const total = $derived(activeSkills.length);

  function getCoords(index: number, value: number): { x: number; y: number } {
    const count = total || 1;
    const angle = (Math.PI * 2 / count) * index - Math.PI / 2;
    const r = (value / 100) * maxR;
    return {
      x: cx + r * Math.cos(angle),
      y: cy + r * Math.sin(angle)
    };
  }

  let targetPolygon = $derived.by(() => {
    return activeSkills.map((s, i) => {
      const { x, y } = getCoords(i, s.target);
      return `${x},${y}`;
    }).join(' ');
  });

  let actualPolygon = $derived.by(() => {
    return activeSkills.map((s, i) => {
      const { x, y } = getCoords(i, s.actual);
      return `${x},${y}`;
    }).join(' ');
  });

  const activeMetricIndex = $derived(hoveredIndex !== null ? hoveredIndex : selectedIndex);
  const activeMetric = $derived(activeSkills[activeMetricIndex] || activeSkills[0]);
  const activeMeta = $derived(
    SKILL_METADATA[activeMetric.label] || {
      icon: '🎯',
      category: 'Creative Discipline',
      whatItMeasures: 'Studio execution capability and output quality in this design domain.',
      whatIsGood: 'Output meets or exceeds benchmark quality with zero major revisions.',
      whatIsBad: 'Multiple revision cycles or delays required to reach production readiness.',
      actionAdvice: 'Focus on adherence to design guidelines and preflight checklists.'
    }
  );

  const activeDelta = $derived(activeMetric.actual - activeMetric.target);
  const isAhead = $derived(activeDelta >= 0);
  const isNear = $derived(activeDelta < 0 && activeDelta >= -4);
  const isGap = $derived(activeDelta < -4);

  const hoveredCoords = $derived(
    hoveredIndex !== null
      ? getCoords(hoveredIndex, activeSkills[hoveredIndex]?.actual || 80)
      : null
  );

  function getMeta(label: string): SkillMeta {
    return SKILL_METADATA[label] || {
      icon: '🎯',
      category: 'Creative Discipline',
      whatItMeasures: 'Studio execution capability in this domain.',
      whatIsGood: 'Meets quarterly benchmark with clean handoff.',
      whatIsBad: 'Trailing benchmark with revision risk.',
      actionAdvice: 'Follow standard preflight procedures.'
    };
  }
</script>

<div class="radar-container">
  <!-- Top Action & Guide Header -->
  <div class="radar-top-bar">
    <div class="radar-legend">
      <div class="legend-item">
        <span class="legend-box benchmark"></span>
        <span class="legend-text">Target Benchmark (Q3)</span>
      </div>
      <div class="legend-item">
        <span class="legend-box actual"></span>
        <span class="legend-text">Actual Studio Competency</span>
      </div>
    </div>

    <button
      type="button"
      class="guide-trigger-btn"
      onclick={() => (showGuideModal = true)}
      title="How to read this radar competency matrix"
    >
      <FluentIcons name="info" size={13} color="var(--brand-accent)" />
      <span>How to Read Matrix</span>
    </button>
  </div>

  <!-- Radar Visualization Wrapper -->
  <div class="radar-wrapper">
    <svg viewBox="0 0 300 300" class="radar-svg">
      <defs>
        <!-- Gradients & Glow Filters -->
        <linearGradient id="actualGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#10B981" stop-opacity="0.38" />
          <stop offset="100%" stop-color="#059669" stop-opacity="0.18" />
        </linearGradient>
        <filter id="nodeGlow" x="-50%" y="-50%" width="200%" height="200%">
          <feDropShadow dx="0" dy="0" stdDeviation="3" flood-color="#10B981" flood-opacity="0.8" />
        </filter>
        <filter id="activeGlow" x="-50%" y="-50%" width="200%" height="200%">
          <feDropShadow dx="0" dy="0" stdDeviation="4" flood-color="#21A1F7" flood-opacity="0.9" />
        </filter>
      </defs>

      <!-- Concentric Grid Circles with Percentage Annotations -->
      {#each [0.25, 0.5, 0.75, 1.0] as ring}
        <circle
          cx={cx}
          cy={cy}
          r={maxR * ring}
          fill="none"
          stroke="var(--surface-card-border)"
          stroke-dasharray="3 3"
          stroke-width="0.8"
        />
        <text
          x={cx + 3}
          y={cy - maxR * ring - 2}
          font-size="8"
          fill="var(--text-secondary)"
          opacity="0.6"
          font-family="monospace"
        >
          {ring * 100}%
        </text>
      {/each}

      <!-- Radial Axis Spoke Lines -->
      {#each activeSkills as s, i}
        {@const { x, y } = getCoords(i, 100)}
        {@const isHighlighted = i === activeMetricIndex}
        <line
          x1={cx}
          y1={cy}
          x2={x}
          y2={y}
          stroke={isHighlighted ? 'var(--brand-accent)' : 'var(--surface-card-border)'}
          stroke-width={isHighlighted ? '2' : '1'}
          stroke-opacity={isHighlighted ? '0.9' : '0.6'}
        />
      {/each}

      <!-- Target Benchmark Polygon (Dashed Blue) -->
      <polygon
        points={targetPolygon}
        fill="rgba(33, 161, 247, 0.12)"
        stroke="var(--brand-accent)"
        stroke-width="1.8"
        stroke-dasharray="4 2.5"
      />

      <!-- Actual Competency Polygon (Solid Green) -->
      <polygon
        points={actualPolygon}
        fill="url(#actualGrad)"
        stroke="#10B981"
        stroke-width="2.2"
      />

      <!-- Skill Data Points, Labels, and Interactive Hit Areas -->
      {#each activeSkills as s, i}
        {@const act = getCoords(i, s.actual)}
        {@const tgt = getCoords(i, s.target)}
        {@const lbl = getCoords(i, 122)}
        {@const isSelected = i === selectedIndex}
        {@const isHovered = i === hoveredIndex}
        {@const isCurrent = i === activeMetricIndex}

        <!-- Target Marker Dot on spoke -->
        <circle
          cx={tgt.x}
          cy={tgt.y}
          r="2.5"
          fill="var(--brand-accent)"
          opacity={isCurrent ? '0.9' : '0.4'}
        />

        <!-- Active Outer Ring Glow for Current Metric -->
        {#if isCurrent}
          <circle
            cx={act.x}
            cy={act.y}
            r="8"
            fill="none"
            stroke="#10B981"
            stroke-width="1.5"
            opacity="0.75"
            filter="url(#nodeGlow)"
          />
        {/if}

        <!-- Actual Data Point -->
        <circle
          cx={act.x}
          cy={act.y}
          r={isCurrent ? '4.5' : '3.5'}
          fill={s.actual >= s.target ? '#10B981' : '#F59E0B'}
          stroke="#FFFFFF"
          stroke-width="1"
          style="transition: r 0.2s ease;"
        />

        <!-- Text Label with Interactive Style -->
        <!-- svelte-ignore a11y_click_events_have_key_events -->
        <!-- svelte-ignore a11y_no_static_element_interactions -->
        <text
          x={lbl.x}
          y={lbl.y}
          font-size={isCurrent ? '11' : '10'}
          font-weight={isCurrent ? '800' : '600'}
          fill={isCurrent ? 'var(--text-primary)' : 'var(--text-secondary)'}
          text-anchor="middle"
          dominant-baseline="central"
          class="radar-label-text"
          class:active={isCurrent}
          onclick={() => (selectedIndex = i)}
          onmouseenter={() => (hoveredIndex = i)}
          onmouseleave={() => (hoveredIndex = null)}
        >
          {s.label}
        </text>

        <!-- Invisible Broad Touch/Hover Hit Area -->
        <!-- svelte-ignore a11y_click_events_have_key_events -->
        <!-- svelte-ignore a11y_no_static_element_interactions -->
        <circle
          cx={act.x}
          cy={act.y}
          r="16"
          fill="transparent"
          class="radar-hit-target"
          onclick={() => (selectedIndex = i)}
          onmouseenter={() => (hoveredIndex = i)}
          onmouseleave={() => (hoveredIndex = null)}
          aria-label="{s.label}: Actual {s.actual}%, Target {s.target}%"
        />
      {/each}
    </svg>

    <!-- Floating Tooltip on Node Hover -->
    {#if hoveredIndex !== null && hoveredCoords}
      {@const hSkill = activeSkills[hoveredIndex]}
      {@const hDelta = hSkill.actual - hSkill.target}
      {@const hMeta = getMeta(hSkill.label)}
      {@const isHigh = hoveredCoords.y < 90}
      <div
        class="radar-hover-tooltip"
        class:float-below={isHigh}
        style="left: {((hoveredCoords.x / 300) * 100).toFixed(1)}%; top: {((hoveredCoords.y / 300) * 100).toFixed(1)}%;"
      >
        <div class="tooltip-header">
          <span class="tooltip-icon">{hMeta.icon}</span>
          <span class="tooltip-title">{hSkill.label}</span>
          <span class="tooltip-badge" class:ahead={hDelta >= 0} class:gap={hDelta < 0}>
            {hDelta >= 0 ? `+${hDelta}% Lead` : `${hDelta}% Gap`}
          </span>
        </div>
        <div class="tooltip-scores">
          <div>Actual: <strong>{hSkill.actual}%</strong></div>
          <span class="sep">•</span>
          <div>Target: <strong>{hSkill.target}%</strong></div>
        </div>
        <div class="tooltip-desc">{hMeta.whatItMeasures}</div>
        <div class="tooltip-footer">
          {#if hSkill.actual >= hSkill.target}
            <span class="status-good">✓ Good: Fast sign-off, zero dieline/script delays.</span>
          {:else}
            <span class="status-gap">⚠ Attention: Revision risk; Art Director preflight advised.</span>
          {/if}
        </div>
      </div>
    {/if}
  </div>

  <!-- Interactive Skill Selector Chips -->
  <div class="skill-chips-row">
    {#each activeSkills as s, i}
      {@const meta = getMeta(s.label)}
      {@const delta = s.actual - s.target}
      {@const isSelected = i === activeMetricIndex}
      <button
        type="button"
        class="skill-chip"
        class:selected={isSelected}
        onclick={() => (selectedIndex = i)}
        onmouseenter={() => (hoveredIndex = i)}
        onmouseleave={() => (hoveredIndex = null)}
      >
        <span class="chip-icon">{meta.icon}</span>
        <span class="chip-name">{s.label}</span>
        <span class="chip-score" class:ahead={delta >= 0} class:gap={delta < 0}>
          {s.actual}%
        </span>
        <span
          class="chip-status-dot"
          class:dot-green={delta >= 0}
          class:dot-amber={delta < 0 && delta >= -4}
          class:dot-red={delta < -4}
          title={delta >= 0 ? 'Ahead of Q3 Benchmark' : 'Below Target Benchmark'}
        ></span>
      </button>
    {/each}
  </div>

  <!-- Active Metric Diagnosis & Guidance Card -->
  <div class="metric-detail-card">
    <div class="detail-card-header">
      <div class="detail-title-col">
        <div class="detail-category-label">
          <span>{activeMeta.icon}</span>
          <span>{activeMeta.category}</span>
          {#if activeMetric.projectCount}
            <span class="project-count-pill">{activeMetric.projectCount} Audited Projects</span>
          {/if}
        </div>
        <h3 class="detail-title">{activeMetric.label}</h3>
      </div>

      <div class="detail-scores-col">
        <div class="scores-comparison">
          <div class="score-box actual">
            <span class="score-label">Actual Competency</span>
            <span class="score-value green">{activeMetric.actual}%</span>
          </div>
          <div class="score-vs">vs</div>
          <div class="score-box target">
            <span class="score-label">Target (Q3)</span>
            <span class="score-value blue">{activeMetric.target}%</span>
          </div>
        </div>

        <div class="delta-pill" class:ahead={isAhead} class:near={isNear} class:gap={isGap}>
          {#if isAhead}
            <FluentIcons name="checkCircle" size={12} color="#10B981" />
            <span>+{activeDelta}% Ahead of Benchmark</span>
          {:else if isNear}
            <FluentIcons name="warning" size={12} color="#F59E0B" />
            <span>{activeDelta}% Slight Gap (Manageable)</span>
          {:else}
            <FluentIcons name="warning" size={12} color="#EF4444" />
            <span>{activeDelta}% Competency Gap (Action Required)</span>
          {/if}
        </div>
      </div>
    </div>

    <!-- Comparative Progress Track -->
    <div class="progress-track-wrapper">
      <div class="progress-track">
        <div
          class="progress-fill actual"
          style="width: {activeMetric.actual}%;"
        ></div>
        <!-- Target Marker Line -->
        <div
          class="progress-target-marker"
          style="left: {activeMetric.target}%;"
          title="Q3 Benchmark Target: {activeMetric.target}%"
        >
          <div class="marker-flag">{activeMetric.target}% Target</div>
        </div>
      </div>
    </div>

    <!-- Concrete Guidance: What it measures, What is Good, What is Bad -->
    <div class="guidance-grid">
      <div class="guidance-col measure">
        <div class="guidance-heading">
          <FluentIcons name="target" size={13} color="var(--brand-accent)" />
          <span>What It Measures</span>
        </div>
        <p class="guidance-text">{activeMeta.whatItMeasures}</p>
      </div>

      <div class="guidance-col good">
        <div class="guidance-heading">
          <span class="indicator-badge good">🟢 Good (≥ {activeMetric.target}%)</span>
        </div>
        <p class="guidance-text">{activeMeta.whatIsGood}</p>
      </div>

      <div class="guidance-col bad">
        <div class="guidance-heading">
          <span class="indicator-badge bad">🔴 Needs Attention (&lt; {activeMetric.target}%)</span>
        </div>
        <p class="guidance-text">{activeMeta.whatIsBad}</p>
      </div>
    </div>

    <!-- Action Tip -->
    <div class="action-tip-banner">
      <FluentIcons name="sparkle" size={14} color="var(--brand-accent)" />
      <span class="action-tip-text"><strong>Art Director Action:</strong> {activeMeta.actionAdvice}</span>
    </div>
  </div>
</div>

<!-- "How to Read This Matrix" Deep Dive Modal Dialog -->
<FluentDialog
  open={showGuideModal}
  title="Art Director Skill Competency Matrix Guide"
  confirmText="Got It"
  onClose={() => (showGuideModal = false)}
  onConfirm={() => (showGuideModal = false)}
>
  <div class="guide-modal-content">
    <div class="guide-lead-banner">
      <p>
        The <strong>Art Director Skill Competency Matrix</strong> visualizes the creative studio's real-world
        execution readiness across 6 core commercial disciplines. It contrasts audited performance against quarterly
        management targets to spot capability bottlenecks before they affect launch dates.
      </p>
    </div>

    <!-- Section 1: The Geometry -->
    <div class="guide-section">
      <h4>1. How to Read the Radar Geometry</h4>
      <div class="rings-explainer-grid">
        <div class="ring-card">
          <div class="ring-tag">4 Concentric Rings</div>
          <ul>
            <li><strong>25%</strong>: Foundational knowledge / basic support only.</li>
            <li><strong>50%</strong>: Operational competency; requires regular supervision.</li>
            <li><strong>75%</strong>: Production-ready standard; independent designer execution.</li>
            <li><strong>100%</strong>: Master craftsman level / zero-defect velocity.</li>
          </ul>
        </div>

        <div class="ring-card">
          <div class="ring-tag">2 Overlay Polygons</div>
          <ul>
            <li>
              <span class="swatch blue"></span>
              <strong>Target Benchmark (Q3)</strong>: Dashed blue line representing the studio's quarterly SLA quality objective.
            </li>
            <li>
              <span class="swatch green"></span>
              <strong>Actual Studio Competency</strong>: Solid green filled polygon derived from real project volume and First-Time-Right (0-revision) output.
            </li>
          </ul>
        </div>
      </div>
    </div>

    <!-- Section 2: The Golden Rule -->
    <div class="guide-section">
      <h4>2. The Golden Rule: Good vs Bad at a Glance</h4>
      <div class="rule-box-grid">
        <div class="rule-box green">
          <div class="rule-header">🟢 Green Outside Blue (Outperforming / Healthy)</div>
          <p>
            When the solid green polygon extends <strong>outside or touches</strong> the dashed blue line, the studio is
            at peak readiness. Outputs are approved with minimal iterations and can be shipped with high confidence.
          </p>
        </div>
        <div class="rule-box red">
          <div class="rule-header">🔴 Green Inside Blue (Skill Gap / Bottleneck)</div>
          <p>
            When the solid green polygon is <strong>visibly inside</strong> the dashed blue boundary, this discipline is an
            operational bottleneck. Expect higher revision cycles, delay risks, or required Art Director preflight reviews.
          </p>
        </div>
      </div>
    </div>

    <!-- Section 3: Metric Cheat Sheet Table -->
    <div class="guide-section">
      <h4>3. Creative Discipline Cheat Sheet</h4>
      <div class="table-responsive">
        <table class="guide-table">
          <thead>
            <tr>
              <th>Discipline</th>
              <th>Target</th>
              <th>What It Measures</th>
              <th>What "Good" Looks Like</th>
              <th>What "Bad" Looks Like</th>
            </tr>
          </thead>
          <tbody>
            {#each activeSkills as s}
              {@const m = getMeta(s.label)}
              <tr>
                <td class="discipline-cell">
                  <strong>{m.icon} {s.label}</strong>
                  <span class="sub-cat">{m.category}</span>
                </td>
                <td class="target-cell">{s.target}%</td>
                <td>{m.whatItMeasures}</td>
                <td class="good-cell">✓ {m.whatIsGood}</td>
                <td class="bad-cell">✕ {m.whatIsBad}</td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    </div>
  </div>
</FluentDialog>

<style>
  .radar-container {
    display: flex;
    flex-direction: column;
    align-items: center;
    width: 100%;
    gap: 12px;
  }

  /* Top Bar */
  .radar-top-bar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    width: 100%;
    flex-wrap: wrap;
    gap: 8px;
    padding-bottom: 4px;
  }

  .radar-legend {
    display: flex;
    gap: 16px;
    font-size: 11px;
    color: var(--text-secondary);
  }

  .legend-item {
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .legend-box {
    width: 12px;
    height: 12px;
    border-radius: 2px;
  }

  .legend-box.benchmark {
    background: rgba(33, 161, 247, 0.2);
    border: 1px dashed var(--brand-accent);
  }

  .legend-box.actual {
    background: rgba(16, 185, 129, 0.4);
    border: 1px solid #10B981;
  }

  .legend-text {
    font-weight: 500;
  }

  .guide-trigger-btn {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    background: rgba(33, 161, 247, 0.08);
    border: 1px solid rgba(33, 161, 247, 0.25);
    color: var(--brand-accent);
    padding: 3px 9px;
    border-radius: 12px;
    font-size: 11px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .guide-trigger-btn:hover {
    background: rgba(33, 161, 247, 0.16);
    border-color: var(--brand-accent);
    transform: translateY(-1px);
  }

  /* Radar SVG Canvas Wrapper */
  .radar-wrapper {
    position: relative;
    display: flex;
    justify-content: center;
    align-items: center;
    width: 100%;
    max-width: 290px;
    margin: 4px 0;
  }

  .radar-svg {
    width: 100%;
    height: auto;
    overflow: visible;
  }

  .radar-label-text {
    cursor: pointer;
    transition: all 0.18s ease;
    user-select: none;
  }

  .radar-label-text:hover,
  .radar-label-text.active {
    fill: var(--brand-accent) !important;
  }

  .radar-hit-target {
    cursor: pointer;
  }

  /* Floating SVG Hover Tooltip */
  .radar-hover-tooltip {
    position: absolute;
    transform: translate(-50%, -100%);
    margin-top: -10px;
    width: 230px;
    background: var(--surface-card-background, #FFFFFF);
    border: 1px solid var(--surface-card-border, #E2E8F0);
    border-radius: 8px;
    box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.25), 0 8px 10px -6px rgba(0, 0, 0, 0.15);
    padding: 9px 11px;
    font-size: 11px;
    z-index: 40;
    pointer-events: none;
    transition: opacity 0.15s ease, transform 0.15s ease;
    backdrop-filter: blur(12px);
  }

  .radar-hover-tooltip.float-below {
    transform: translate(-50%, 14px);
    margin-top: 0;
  }

  .tooltip-header {
    display: flex;
    align-items: center;
    gap: 6px;
    font-weight: 700;
    color: var(--text-primary);
  }

  .tooltip-icon {
    font-size: 13px;
  }

  .tooltip-title {
    flex: 1;
    font-size: 11.5px;
  }

  .tooltip-badge {
    font-size: 9.5px;
    padding: 1px 5px;
    border-radius: 4px;
    font-weight: 700;
  }

  .tooltip-badge.ahead {
    background: rgba(16, 185, 129, 0.15);
    color: #10B981;
  }

  .tooltip-badge.gap {
    background: rgba(245, 158, 11, 0.15);
    color: #D97706;
  }

  .tooltip-scores {
    display: flex;
    align-items: center;
    gap: 6px;
    margin: 4px 0 3px 0;
    font-size: 10.5px;
    color: var(--text-secondary);
  }

  .tooltip-scores strong {
    color: var(--text-primary);
  }

  .tooltip-desc {
    font-size: 10px;
    line-height: 1.35;
    color: var(--text-secondary);
    margin-bottom: 4px;
  }

  .tooltip-footer {
    border-top: 1px solid var(--surface-card-border);
    padding-top: 4px;
    font-size: 9.5px;
    font-weight: 600;
  }

  .status-good {
    color: #10B981;
  }

  .status-gap {
    color: #D97706;
  }

  /* Skill Selector Chips */
  .skill-chips-row {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    justify-content: center;
    width: 100%;
  }

  .skill-chip {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    background: var(--surface-card-background, #FFFFFF);
    border: 1px solid var(--surface-card-border, #E2E8F0);
    border-radius: 16px;
    padding: 4px 9px;
    font-size: 11px;
    color: var(--text-primary);
    cursor: pointer;
    transition: all 0.18s ease;
  }

  .skill-chip:hover {
    border-color: var(--brand-accent);
    background: rgba(33, 161, 247, 0.05);
    transform: translateY(-1px);
  }

  .skill-chip.selected {
    border-color: var(--brand-accent);
    background: rgba(33, 161, 247, 0.12);
    font-weight: 700;
    box-shadow: 0 0 0 1px var(--brand-accent);
  }

  .chip-icon {
    font-size: 12px;
  }

  .chip-name {
    font-size: 11px;
  }

  .chip-score {
    font-size: 10px;
    font-weight: 700;
    padding: 0 4px;
    border-radius: 4px;
  }

  .chip-score.ahead {
    background: rgba(16, 185, 129, 0.15);
    color: #10B981;
  }

  .chip-score.gap {
    background: rgba(245, 158, 11, 0.15);
    color: #D97706;
  }

  .chip-status-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
  }

  .dot-green {
    background: #10B981;
  }

  .dot-amber {
    background: #F59E0B;
  }

  .dot-red {
    background: #EF4444;
  }

  /* Metric Detail & Guidance Card */
  .metric-detail-card {
    display: flex;
    flex-direction: column;
    width: 100%;
    background: var(--surface-card-background, #FFFFFF);
    border: 1px solid var(--surface-card-border, #E2E8F0);
    border-radius: 10px;
    padding: 14px 16px;
    gap: 12px;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
  }

  .detail-card-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    flex-wrap: wrap;
    gap: 10px;
  }

  .detail-category-label {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 11px;
    color: var(--text-secondary);
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  .project-count-pill {
    background: rgba(33, 161, 247, 0.1);
    color: var(--brand-accent);
    padding: 1px 6px;
    border-radius: 8px;
    font-size: 9.5px;
    font-weight: 700;
    text-transform: none;
  }

  .detail-title {
    margin: 2px 0 0 0;
    font-size: 16px;
    font-weight: 800;
    color: var(--text-primary);
  }

  .detail-scores-col {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 4px;
  }

  .scores-comparison {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .score-box {
    display: flex;
    flex-direction: column;
    align-items: center;
  }

  .score-label {
    font-size: 9px;
    color: var(--text-secondary);
    text-transform: uppercase;
    font-weight: 600;
  }

  .score-value {
    font-size: 15px;
    font-weight: 800;
  }

  .score-value.green {
    color: #10B981;
  }

  .score-value.blue {
    color: var(--brand-accent);
  }

  .score-vs {
    font-size: 10px;
    color: var(--text-secondary);
    font-weight: 600;
  }

  .delta-pill {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 2px 8px;
    border-radius: 12px;
    font-size: 10.5px;
    font-weight: 700;
  }

  .delta-pill.ahead {
    background: rgba(16, 185, 129, 0.15);
    color: #10B981;
  }

  .delta-pill.near {
    background: rgba(245, 158, 11, 0.15);
    color: #D97706;
  }

  .delta-pill.gap {
    background: rgba(239, 68, 68, 0.15);
    color: #EF4444;
  }

  /* Progress Track */
  .progress-track-wrapper {
    position: relative;
    width: 100%;
    margin-top: 2px;
  }

  .progress-track {
    position: relative;
    height: 8px;
    background: var(--surface-card-border, #E2E8F0);
    border-radius: 4px;
    overflow: visible;
  }

  .progress-fill.actual {
    height: 100%;
    background: linear-gradient(90deg, #10B981, #059669);
    border-radius: 4px;
    transition: width 0.3s ease;
  }

  .progress-target-marker {
    position: absolute;
    top: -3px;
    bottom: -3px;
    width: 2px;
    background: var(--brand-accent);
    transform: translateX(-50%);
  }

  .marker-flag {
    position: absolute;
    bottom: 12px;
    left: 50%;
    transform: translateX(-50%);
    background: var(--brand-accent);
    color: #FFFFFF;
    font-size: 8.5px;
    font-weight: 700;
    padding: 1px 4px;
    border-radius: 3px;
    white-space: nowrap;
  }

  /* Guidance Columns */
  .guidance-grid {
    display: grid;
    grid-template-columns: 1fr;
    gap: 8px;
  }

  @media (min-width: 640px) {
    .guidance-grid {
      grid-template-columns: 1fr 1fr 1fr;
    }
  }

  .guidance-col {
    background: rgba(0, 0, 0, 0.02);
    border: 1px solid var(--surface-card-border);
    border-radius: 6px;
    padding: 8px 10px;
    font-size: 11px;
  }

  .guidance-heading {
    display: flex;
    align-items: center;
    gap: 5px;
    font-weight: 700;
    color: var(--text-primary);
    margin-bottom: 4px;
  }

  .indicator-badge {
    font-size: 10.5px;
    font-weight: 700;
  }

  .indicator-badge.good {
    color: #10B981;
  }

  .indicator-badge.bad {
    color: #EF4444;
  }

  .guidance-text {
    margin: 0;
    line-height: 1.4;
    color: var(--text-secondary);
    font-size: 10.5px;
  }

  .action-tip-banner {
    display: flex;
    align-items: center;
    gap: 8px;
    background: rgba(33, 161, 247, 0.07);
    border-left: 3px solid var(--brand-accent);
    padding: 6px 10px;
    border-radius: 0 4px 4px 0;
    font-size: 11px;
    color: var(--text-primary);
  }

  /* Modal Content Styles */
  .guide-modal-content {
    display: flex;
    flex-direction: column;
    gap: 16px;
    max-height: 70vh;
    overflow-y: auto;
    padding-right: 4px;
  }

  .guide-lead-banner {
    background: rgba(33, 161, 247, 0.08);
    border: 1px solid rgba(33, 161, 247, 0.2);
    border-radius: 8px;
    padding: 10px 14px;
    font-size: 12.5px;
    line-height: 1.5;
    color: var(--text-primary);
  }

  .guide-section h4 {
    margin: 0 0 8px 0;
    font-size: 13.5px;
    font-weight: 700;
    color: var(--text-primary);
  }

  .rings-explainer-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px;
  }

  .ring-card {
    background: var(--surface-card-background);
    border: 1px solid var(--surface-card-border);
    border-radius: 8px;
    padding: 10px 12px;
    font-size: 11.5px;
  }

  .ring-tag {
    font-weight: 700;
    color: var(--brand-accent);
    margin-bottom: 6px;
    text-transform: uppercase;
    font-size: 10.5px;
  }

  .ring-card ul {
    margin: 0;
    padding-left: 16px;
    line-height: 1.5;
    color: var(--text-secondary);
  }

  .swatch {
    display: inline-block;
    width: 10px;
    height: 10px;
    border-radius: 2px;
    margin-right: 4px;
    vertical-align: middle;
  }

  .swatch.blue {
    background: rgba(33, 161, 247, 0.4);
    border: 1px dashed var(--brand-accent);
  }

  .swatch.green {
    background: rgba(16, 185, 129, 0.6);
    border: 1px solid #10B981;
  }

  .rule-box-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 10px;
  }

  .rule-box {
    border-radius: 8px;
    padding: 10px 12px;
    font-size: 11.5px;
    line-height: 1.45;
  }

  .rule-box.green {
    background: rgba(16, 185, 129, 0.08);
    border: 1px solid rgba(16, 185, 129, 0.3);
  }

  .rule-box.red {
    background: rgba(239, 68, 68, 0.08);
    border: 1px solid rgba(239, 68, 68, 0.3);
  }

  .rule-header {
    font-weight: 700;
    margin-bottom: 4px;
  }

  .rule-box.green .rule-header {
    color: #10B981;
  }

  .rule-box.red .rule-header {
    color: #EF4444;
  }

  .table-responsive {
    overflow-x: auto;
  }

  .guide-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 11px;
  }

  .guide-table th {
    text-align: left;
    padding: 8px 10px;
    background: rgba(0, 0, 0, 0.04);
    border-bottom: 2px solid var(--surface-card-border);
    color: var(--text-primary);
    font-weight: 700;
  }

  .guide-table td {
    padding: 8px 10px;
    border-bottom: 1px solid var(--surface-card-border);
    vertical-align: top;
    line-height: 1.4;
    color: var(--text-secondary);
  }

  .discipline-cell strong {
    color: var(--text-primary);
    display: block;
  }

  .discipline-cell .sub-cat {
    font-size: 9.5px;
    opacity: 0.7;
  }

  .target-cell {
    font-weight: 700;
    color: var(--brand-accent);
  }

  .good-cell {
    color: #10B981;
  }

  .bad-cell {
    color: #D97706;
  }
</style>
