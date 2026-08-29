<script lang="ts">
  interface SkillItem {
    label: string;
    target: number;
    actual: number;
  }

  interface Props {
    skills?: SkillItem[];
  }

  let {
    skills
  }: Props = $props();

  const defaultSkills: SkillItem[] = [
    { label: 'Packaging', target: 90, actual: 86 },
    { label: 'Graphic Design', target: 95, actual: 94 },
    { label: '3D & Motion', target: 80, actual: 78 },
    { label: 'Video Editing', target: 85, actual: 88 },
    { label: 'Copywriting', target: 75, actual: 72 },
    { label: 'Branding', target: 90, actual: 95 }
  ];

  const activeSkills = $derived(skills && skills.length > 0 ? skills : defaultSkills);

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
</script>

<div class="radar-wrapper">
  <svg viewBox="0 0 300 300" class="radar-svg">
    <!-- Concentric Grid Circles -->
    {#each [0.25, 0.5, 0.75, 1.0] as ring}
      <circle cx={cx} cy={cy} r={maxR * ring} fill="none" stroke="var(--surface-card-border)" stroke-dasharray="3 3" />
    {/each}

    <!-- Radial Axis Spoke Lines -->
    {#each activeSkills as _, i}
      {@const { x, y } = getCoords(i, 100)}
      <line x1={cx} y1={cy} x2={x} y2={y} stroke="var(--surface-card-border)" stroke-width="1" />
    {/each}

    <!-- Target Polygon (Benchmark) -->
    <polygon points={targetPolygon} fill="rgba(33, 161, 247, 0.15)" stroke="var(--brand-accent)" stroke-width="1.5" stroke-dasharray="4 2" />

    <!-- Actual Polygon (Studio Velocity) -->
    <polygon points={actualPolygon} fill="rgba(16, 185, 129, 0.25)" stroke="#10B981" stroke-width="2" />

    <!-- Skill Data Points & Labels -->
    {#each activeSkills as s, i}
      {@const act = getCoords(i, s.actual)}
      {@const lbl = getCoords(i, 118)}
      <circle cx={act.x} cy={act.y} r="3.5" fill="#10B981" />
      <text
        x={lbl.x}
        y={lbl.y}
        font-size="10.5"
        font-weight="700"
        fill="var(--text-secondary)"
        text-anchor="middle"
        dominant-baseline="central"
      >
        {s.label}
      </text>
    {/each}
  </svg>

  <div class="radar-legend">
    <div class="legend-item">
      <span class="legend-box" style="background: rgba(33, 161, 247, 0.2); border: 1px dashed var(--brand-accent);"></span>
      <span>Target Benchmark (Q3)</span>
    </div>
    <div class="legend-item">
      <span class="legend-box" style="background: rgba(16, 185, 129, 0.4); border: 1px solid #10B981;"></span>
      <span>Actual Studio Competency</span>
    </div>
  </div>
</div>

<style>
  .radar-wrapper {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    width: 100%;
  }

  .radar-svg {
    width: 100%;
    max-width: 280px;
    height: auto;
  }

  .radar-legend {
    display: flex;
    gap: 16px;
    margin-top: 8px;
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
</style>
