<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import type { GraphNode, GraphEdge, GraphTopology, GraphNodeType } from '$lib/types/zettel';

  interface Props {
    focalNoteId: string;
    topology: GraphTopology;
    onSelectNode?: (node: GraphNode) => void;
  }

  let {
    focalNoteId,
    topology,
    onSelectNode
  }: Props = $props();

  let canvasElem: HTMLCanvasElement | null = $state(null);
  let containerElem: HTMLDivElement | null = $state(null);

  // Non-reactive simulation arrays for pure 2D Canvas rendering
  let localNodes: GraphNode[] = [];
  let localEdges: GraphEdge[] = [];
  let neighborCount = $state(0);
  let animId: number | null = null;
  let hoveredNode: GraphNode | null = $state(null);

  const TYPE_COLORS: Record<GraphNodeType, { fill: string; stroke: string }> = {
    permanent: { fill: '#27272A', stroke: '#E4E4E7' },
    fleeting: { fill: '#064E3B', stroke: '#10B981' },
    literature: { fill: '#78350F', stroke: '#F59E0B' },
    client: { fill: '#0C4A6E', stroke: '#38BDF8' },
    project: { fill: '#581C87', stroke: '#C084FC' }
  };

  $effect(() => {
    // Recompute local subgraph when focalNoteId or topology changes
    const curFocal = focalNoteId;
    const curTopo = topology;
    if (!curTopo) return;

    const allNodes = curTopo.nodes || [];
    const allEdges = curTopo.edges || [];

    const focal = allNodes.find(n => n.id === curFocal);
    if (!focal) {
      localNodes = [];
      localEdges = [];
      neighborCount = 0;
      draw();
      return;
    }

    const neighborIds = new Set<string>([curFocal]);
    for (const e of allEdges) {
      if (e.source === curFocal) neighborIds.add(e.target);
      if (e.target === curFocal) neighborIds.add(e.source);
    }

    const w = containerElem?.clientWidth || 240;
    const h = containerElem?.clientHeight || 180;
    const cx = w / 2;
    const cy = h / 2;

    const filtered = allNodes.filter(n => neighborIds.has(n.id));
    const otherNeighbors = filtered.filter(n => n.id !== curFocal);

    localNodes = filtered.map(n => {
      if (n.id === curFocal) {
        return { ...n, x: cx, y: cy, vx: 0, vy: 0, radius: 10 };
      }
      const idx = otherNeighbors.findIndex(o => o.id === n.id);
      const angle = (idx / Math.max(1, otherNeighbors.length)) * 2 * Math.PI;
      const r = Math.min(cx, cy) * 0.65;
      return {
        ...n,
        x: cx + Math.cos(angle) * r,
        y: cy + Math.sin(angle) * r,
        vx: 0,
        vy: 0,
        radius: 6.5
      };
    });

    localEdges = allEdges.filter(e => neighborIds.has(e.source) && neighborIds.has(e.target));
    neighborCount = Math.max(0, localNodes.length - 1);
    draw();
  });

  function draw() {
    if (!canvasElem) return;
    const ctx = canvasElem.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const w = canvasElem.width;
    const h = canvasElem.height;

    ctx.save();
    ctx.clearRect(0, 0, w, h);
    ctx.scale(dpr, dpr);

    const nodeMap = new Map(localNodes.map(n => [n.id, n]));

    // Draw edges
    for (const e of localEdges) {
      const s = nodeMap.get(e.source);
      const t = nodeMap.get(e.target);
      if (!s || !t) continue;

      ctx.beginPath();
      ctx.moveTo(s.x || 0, s.y || 0);
      ctx.lineTo(t.x || 0, t.y || 0);
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.4)';
      ctx.lineWidth = 1.2;
      ctx.stroke();
    }

    // Draw nodes
    for (const n of localNodes) {
      const isFocal = n.id === focalNoteId;
      const isHover = hoveredNode && n.id === hoveredNode.id;
      const palette = TYPE_COLORS[n.type] || TYPE_COLORS.permanent;

      ctx.save();
      ctx.translate(n.x || 0, n.y || 0);

      if (isFocal) {
        ctx.shadowColor = '#38BDF8';
        ctx.shadowBlur = 12;
      }

      ctx.beginPath();
      ctx.arc(0, 0, n.radius || 7, 0, 2 * Math.PI);
      ctx.fillStyle = palette.fill;
      ctx.strokeStyle = isFocal ? '#38BDF8' : isHover ? '#F4F4F5' : palette.stroke;
      ctx.lineWidth = isFocal ? 2.2 : 1.4;
      ctx.fill();
      ctx.stroke();

      // Label
      ctx.font = isFocal ? '600 10px monospace' : '9px monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.fillStyle = isFocal ? '#F4F4F5' : isHover ? '#38BDF8' : '#A1A1AA';
      const truncated = n.label.length > 14 ? n.label.slice(0, 12) + '…' : n.label;
      ctx.fillText(truncated, 0, (n.radius || 7) + 3);

      ctx.restore();
    }

    ctx.restore();
  }

  function handleMouseMove(e: MouseEvent) {
    if (!canvasElem) return;
    const rect = canvasElem.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;

    let hit: GraphNode | null = null;
    for (const n of localNodes) {
      const dx = mx - (n.x || 0);
      const dy = my - (n.y || 0);
      const r = (n.radius || 7) + 4;
      if (dx * dx + dy * dy <= r * r) {
        hit = n;
        break;
      }
    }

    if (hit !== hoveredNode) {
      hoveredNode = hit;
      draw();
    }
  }

  function handleClick(e: MouseEvent) {
    if (!canvasElem) return;
    const rect = canvasElem.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;

    for (const n of localNodes) {
      const dx = mx - (n.x || 0);
      const dy = my - (n.y || 0);
      const r = (n.radius || 7) + 4;
      if (dx * dx + dy * dy <= r * r) {
        if (onSelectNode) onSelectNode(n);
        break;
      }
    }
  }

  function resize() {
    if (!canvasElem || !containerElem) return;
    const dpr = window.devicePixelRatio || 1;
    const w = containerElem.clientWidth || 240;
    const h = containerElem.clientHeight || 180;
    canvasElem.width = w * dpr;
    canvasElem.height = h * dpr;
    canvasElem.style.width = `${w}px`;
    canvasElem.style.height = `${h}px`;
    draw();
  }

  onMount(() => {
    resize();
    window.addEventListener('resize', resize);
  });

  onDestroy(() => {
    if (typeof window !== 'undefined') {
      window.removeEventListener('resize', resize);
    }
  });
</script>

<div class="local-graph-box" bind:this={containerElem}>
  <div class="local-graph-header">
    <span class="graph-title">LOCAL CONSTELLATION</span>
    <span class="neighbor-count">{neighborCount} neighbors</span>
  </div>
  <canvas
    bind:this={canvasElem}
    class="local-graph-canvas"
    onmousemove={handleMouseMove}
    onclick={handleClick}
  ></canvas>
</div>

<style>
  .local-graph-box {
    width: 100%;
    height: 190px;
    background: var(--kanso-surface, #18181B);
    border: 1px solid var(--kanso-border, #27272A);
    border-radius: 6px;
    overflow: hidden;
    display: flex;
    flex-direction: column;
    margin-bottom: 12px;
  }

  .local-graph-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 6px 10px;
    border-bottom: 1px solid var(--kanso-border, #27272A);
    background: rgba(0, 0, 0, 0.15);
  }

  .graph-title {
    font-size: 9.5px;
    font-weight: 700;
    letter-spacing: 0.05em;
    color: var(--kanso-text-muted, #71717A);
    font-family: monospace;
  }

  .neighbor-count {
    font-size: 9px;
    font-family: monospace;
    color: var(--kanso-accent, #38BDF8);
  }

  .local-graph-canvas {
    width: 100%;
    flex: 1;
    cursor: pointer;
    display: block;
  }
</style>
