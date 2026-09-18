<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import type { GraphNode, GraphEdge, GraphTopology, GraphNodeType } from '$lib/types/zettel';

  interface Props {
    topology: GraphTopology;
    activeNoteId?: string | null;
    onSelectNode?: (node: GraphNode) => void;
  }

  let {
    topology,
    activeNoteId = null,
    onSelectNode
  }: Props = $props();

  let canvasElem: HTMLCanvasElement | null = $state(null);
  let containerElem: HTMLDivElement | null = $state(null);

  // Simulation state (pure JS variables for 60fps canvas performance and zero reactive loops)
  let nodes: GraphNode[] = [];
  let edges: GraphEdge[] = [];
  let animFrameId: number | null = null;
  let isSimulating = true;

  // Camera Pan & Zoom (pure JS variables for smooth canvas transforms)
  let transform = { x: 0, y: 0, k: 1 };
  let isDraggingCanvas = false;
  let dragStart = { x: 0, y: 0 };
  let draggedNode: GraphNode | null = null;

  // Interactivity state
  let hoveredNode: GraphNode | null = $state(null);
  let mousePos = $state({ x: 0, y: 0 });

  // Filter state
  let searchQuery = $state('');
  let nodeCount = $state(0);
  let edgeCount = $state(0);
  let visibleTypes: Record<GraphNodeType, boolean> = $state({
    permanent: true,
    fleeting: true,
    literature: true,
    client: true,
    project: true
  });

  const TYPE_COLORS: Record<GraphNodeType, { fill: string; stroke: string; glow: string; label: string }> = {
    permanent: { fill: '#27272A', stroke: '#E4E4E7', glow: 'rgba(244, 244, 245, 0.3)', label: 'Permanent' },
    fleeting: { fill: '#064E3B', stroke: '#10B981', glow: 'rgba(16, 185, 129, 0.4)', label: 'Fleeting' },
    literature: { fill: '#78350F', stroke: '#F59E0B', glow: 'rgba(245, 158, 11, 0.4)', label: 'Literature' },
    client: { fill: '#0C4A6E', stroke: '#38BDF8', glow: 'rgba(56, 189, 248, 0.45)', label: 'Client' },
    project: { fill: '#581C87', stroke: '#C084FC', glow: 'rgba(192, 132, 252, 0.45)', label: 'Project' }
  };

  // Initialize simulation nodes with positions
  $effect(() => {
    const curTopo = topology;
    if (!curTopo) return;

    const rawNodes = curTopo.nodes || [];
    const rawEdges = curTopo.edges || [];

    const width = containerElem?.clientWidth || 800;
    const height = containerElem?.clientHeight || 600;

    // Preserve existing positions if available
    const existingMap = new Map(nodes.map(n => [n.id, n]));

    nodes = rawNodes.map((n, i) => {
      const existing = existingMap.get(n.id);
      const angle = (i / Math.max(1, rawNodes.length)) * 2 * Math.PI;
      const radiusDist = 80 + Math.random() * 180;
      return {
        ...n,
        x: existing?.x !== undefined ? existing.x : width / 2 + Math.cos(angle) * radiusDist,
        y: existing?.y !== undefined ? existing.y : height / 2 + Math.sin(angle) * radiusDist,
        vx: existing?.vx || 0,
        vy: existing?.vy || 0
      };
    });

    edges = [...rawEdges];
    nodeCount = nodes.length;
    edgeCount = edges.length;
    isSimulating = true;
    requestSimulation();
  });

  function requestSimulation() {
    if (animFrameId) cancelAnimationFrame(animFrameId);
    animFrameId = requestAnimationFrame(simulationStep);
  }

  function simulationStep() {
    if (!canvasElem || !containerElem) return;

    const width = canvasElem.width / (window.devicePixelRatio || 1);
    const height = canvasElem.height / (window.devicePixelRatio || 1);
    const cx = width / 2;
    const cy = height / 2;

    const kRepel = 2400;
    const kSpring = 0.045;
    const restLen = 95;
    const damping = 0.82;
    const centerGravity = 0.015;

    // 1. Repulsion between all nodes
    for (let i = 0; i < nodes.length; i++) {
      const na = nodes[i];
      if (!visibleTypes[na.type]) continue;

      for (let j = i + 1; j < nodes.length; j++) {
        const nb = nodes[j];
        if (!visibleTypes[nb.type]) continue;

        const dx = (nb.x || 0) - (na.x || 0);
        const dy = (nb.y || 0) - (na.y || 0);
        const distSq = dx * dx + dy * dy || 1;
        const dist = Math.sqrt(distSq);

        if (dist < 380) {
          const force = kRepel / distSq;
          const fx = (dx / dist) * force;
          const fy = (dy / dist) * force;

          if (draggedNode !== na) {
            na.vx = (na.vx || 0) - fx;
            na.vy = (na.vy || 0) - fy;
          }
          if (draggedNode !== nb) {
            nb.vx = (nb.vx || 0) + fx;
            nb.vy = (nb.vy || 0) + fy;
          }
        }
      }

      // Center gravity
      if (draggedNode !== na) {
        na.vx = (na.vx || 0) + (cx - (na.x || cx)) * centerGravity;
        na.vy = (na.vy || 0) + (cy - (na.y || cy)) * centerGravity;
      }
    }

    // 2. Spring attraction along edges
    const nodeMap = new Map(nodes.map(n => [n.id, n]));
    for (const edge of edges) {
      const s = nodeMap.get(edge.source);
      const t = nodeMap.get(edge.target);
      if (!s || !t) continue;
      if (!visibleTypes[s.type] || !visibleTypes[t.type]) continue;

      const dx = (t.x || 0) - (s.x || 0);
      const dy = (t.y || 0) - (s.y || 0);
      const dist = Math.sqrt(dx * dx + dy * dy) || 1;
      const displacement = dist - restLen;
      const force = displacement * kSpring;
      const fx = (dx / dist) * force;
      const fy = (dy / dist) * force;

      if (draggedNode !== s) {
        s.vx = (s.vx || 0) + fx;
        s.vy = (s.vy || 0) + fy;
      }
      if (draggedNode !== t) {
        t.vx = (t.vx || 0) - fx;
        t.vy = (t.vy || 0) - fy;
      }
    }

    // 3. Update positions with damping
    let totalVelocity = 0;
    for (const n of nodes) {
      if (draggedNode === n) continue;
      n.vx = (n.vx || 0) * damping;
      n.vy = (n.vy || 0) * damping;
      n.x = (n.x || 0) + (n.vx || 0);
      n.y = (n.y || 0) + (n.vy || 0);
      totalVelocity += Math.abs(n.vx || 0) + Math.abs(n.vy || 0);
    }

    // Render current frame
    draw();

    // Continue loop if energy remains or user is interacting
    if (totalVelocity > 0.08 || draggedNode !== null) {
      animFrameId = requestAnimationFrame(simulationStep);
    } else {
      isSimulating = false;
    }
  }

  function draw() {
    if (!canvasElem) return;
    const ctx = canvasElem.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const w = canvasElem.width;
    const h = canvasElem.height;

    ctx.save();
    ctx.clearRect(0, 0, w, h);

    // Apply Camera transform
    ctx.scale(dpr, dpr);
    ctx.translate(transform.x, transform.y);
    ctx.scale(transform.k, transform.k);

    const nodeMap = new Map(nodes.map(n => [n.id, n]));
    const isHoverActive = hoveredNode !== null;
    const isSearchActive = searchQuery.trim().length > 0;
    const qLower = searchQuery.toLowerCase().trim();

    // Helper: Determine node highlighting
    const isHighlighted = (n: GraphNode) => {
      if (hoveredNode) {
        if (n.id === hoveredNode.id) return true;
        return edges.some(e => 
          (e.source === hoveredNode?.id && e.target === n.id) ||
          (e.target === hoveredNode?.id && e.source === n.id)
        );
      }
      if (isSearchActive) {
        return n.label.toLowerCase().includes(qLower) || 
          (n.tags && n.tags.some(t => t.toLowerCase().includes(qLower)));
      }
      if (activeNoteId) {
        return n.id === activeNoteId;
      }
      return true;
    };

    // ─── 1. DRAW EDGES ───
    for (const edge of edges) {
      const s = nodeMap.get(edge.source);
      const t = nodeMap.get(edge.target);
      if (!s || !t) continue;
      if (!visibleTypes[s.type] || !visibleTypes[t.type]) continue;

      const sHigh = isHighlighted(s);
      const tHigh = isHighlighted(t);
      const edgeHigh = sHigh && tHigh;

      ctx.beginPath();
      ctx.moveTo(s.x || 0, s.y || 0);
      ctx.lineTo(t.x || 0, t.y || 0);

      if (isHoverActive || isSearchActive) {
        if (edgeHigh) {
          ctx.strokeStyle = 'rgba(56, 189, 248, 0.75)';
          ctx.lineWidth = 1.8;
        } else {
          ctx.strokeStyle = 'rgba(113, 113, 122, 0.08)';
          ctx.lineWidth = 0.8;
        }
      } else {
        ctx.strokeStyle = 'rgba(113, 113, 122, 0.22)';
        ctx.lineWidth = 1.0;
      }
      ctx.stroke();
    }

    // ─── 2. DRAW NODES ───
    for (const n of nodes) {
      if (!visibleTypes[n.type]) continue;

      const high = isHighlighted(n);
      const isCurrentActive = activeNoteId && n.id === activeNoteId;
      const isFocalHover = hoveredNode && n.id === hoveredNode.id;

      const palette = TYPE_COLORS[n.type] || TYPE_COLORS.permanent;
      const r = n.radius || 8;

      ctx.save();
      ctx.translate(n.x || 0, n.y || 0);

      // Glow on focal or active
      if (isFocalHover || isCurrentActive) {
        ctx.shadowColor = palette.stroke;
        ctx.shadowBlur = 14;
      }

      ctx.beginPath();
      ctx.arc(0, 0, r, 0, 2 * Math.PI);

      if (isHoverActive || isSearchActive) {
        if (high) {
          ctx.fillStyle = palette.fill;
          ctx.strokeStyle = palette.stroke;
          ctx.lineWidth = isFocalHover || isCurrentActive ? 2.5 : 1.5;
        } else {
          ctx.fillStyle = 'rgba(39, 39, 42, 0.3)';
          ctx.strokeStyle = 'rgba(113, 113, 122, 0.15)';
          ctx.lineWidth = 1;
        }
      } else {
        ctx.fillStyle = palette.fill;
        ctx.strokeStyle = isCurrentActive ? '#38BDF8' : palette.stroke;
        ctx.lineWidth = isCurrentActive ? 2.5 : 1.5;
      }

      ctx.fill();
      ctx.stroke();
      ctx.restore();

      // Node label
      if (high || !isHoverActive) {
        ctx.save();
        ctx.translate(n.x || 0, n.y || 0);
        ctx.font = isFocalHover || isCurrentActive ? '600 11.5px monospace' : '10px monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';

        if (isHoverActive && !high) {
          ctx.fillStyle = 'rgba(113, 113, 122, 0.2)';
        } else {
          ctx.fillStyle = high ? '#F4F4F5' : '#A1A1AA';
        }

        const labelText = n.label.length > 22 ? n.label.slice(0, 20) + '…' : n.label;
        ctx.fillText(labelText, 0, r + 4);
        ctx.restore();
      }
    }

    ctx.restore();
  }

  // ─── EVENT HANDLERS: PAN & ZOOM & DRAG ───

  function screenToWorld(sx: number, sy: number) {
    return {
      x: (sx - transform.x) / transform.k,
      y: (sy - transform.y) / transform.k
    };
  }

  function findNodeAt(worldX: number, worldY: number): GraphNode | null {
    for (let i = nodes.length - 1; i >= 0; i--) {
      const n = nodes[i];
      if (!visibleTypes[n.type]) continue;
      const dx = worldX - (n.x || 0);
      const dy = worldY - (n.y || 0);
      const r = (n.radius || 8) + 4;
      if (dx * dx + dy * dy <= r * r) {
        return n;
      }
    }
    return null;
  }

  function handleMouseDown(e: MouseEvent) {
    if (!canvasElem) return;
    const rect = canvasElem.getBoundingClientRect();
    const sx = e.clientX - rect.left;
    const sy = e.clientY - rect.top;
    const wpos = screenToWorld(sx, sy);

    const hit = findNodeAt(wpos.x, wpos.y);
    if (hit) {
      draggedNode = hit;
      dragStart = { x: sx, y: sy };
      requestSimulation();
    } else {
      isDraggingCanvas = true;
      dragStart = { x: sx - transform.x, y: sy - transform.y };
    }
  }

  function handleMouseMove(e: MouseEvent) {
    if (!canvasElem) return;
    const rect = canvasElem.getBoundingClientRect();
    const sx = e.clientX - rect.left;
    const sy = e.clientY - rect.top;
    mousePos = { x: e.clientX, y: e.clientY };

    if (draggedNode) {
      const wpos = screenToWorld(sx, sy);
      draggedNode.x = wpos.x;
      draggedNode.y = wpos.y;
      draggedNode.vx = 0;
      draggedNode.vy = 0;
      requestSimulation();
      return;
    }

    if (isDraggingCanvas) {
      transform.x = sx - dragStart.x;
      transform.y = sy - dragStart.y;
      draw();
      return;
    }

    // Hover inspection
    const wpos = screenToWorld(sx, sy);
    const hit = findNodeAt(wpos.x, wpos.y);
    if (hit !== hoveredNode) {
      hoveredNode = hit;
      draw();
    }
  }

  function handleMouseUp(e: MouseEvent) {
    if (!canvasElem) return;
    const rect = canvasElem.getBoundingClientRect();
    const sx = e.clientX - rect.left;
    const sy = e.clientY - rect.top;

    if (draggedNode) {
      const movedDist = Math.hypot(sx - dragStart.x, sy - dragStart.y);
      if (movedDist < 4 && onSelectNode) {
        onSelectNode(draggedNode);
      }
      draggedNode = null;
    }

    isDraggingCanvas = false;
    requestSimulation();
  }

  function handleWheel(e: WheelEvent) {
    e.preventDefault();
    if (!canvasElem) return;
    const rect = canvasElem.getBoundingClientRect();
    const sx = e.clientX - rect.left;
    const sy = e.clientY - rect.top;

    const zoomFactor = e.deltaY < 0 ? 1.12 : 0.88;
    const newK = Math.max(0.25, Math.min(3.5, transform.k * zoomFactor));

    transform.x = sx - (sx - transform.x) * (newK / transform.k);
    transform.y = sy - (sy - transform.y) * (newK / transform.k);
    transform.k = newK;

    draw();
  }

  function resetView() {
    if (!canvasElem) return;
    const w = canvasElem.width / (window.devicePixelRatio || 1);
    const h = canvasElem.height / (window.devicePixelRatio || 1);
    transform = { x: 0, y: 0, k: 1 };
    draw();
  }

  function zoomIn() {
    transform.k = Math.min(3.5, transform.k * 1.25);
    draw();
  }

  function zoomOut() {
    transform.k = Math.max(0.25, transform.k * 0.8);
    draw();
  }

  function resizeCanvas() {
    if (!canvasElem || !containerElem) return;
    const dpr = window.devicePixelRatio || 1;
    const w = containerElem.clientWidth;
    const h = containerElem.clientHeight;

    canvasElem.width = w * dpr;
    canvasElem.height = h * dpr;
    canvasElem.style.width = `${w}px`;
    canvasElem.style.height = `${h}px`;

    draw();
  }

  onMount(() => {
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
  });

  onDestroy(() => {
    if (typeof window !== 'undefined') {
      window.removeEventListener('resize', resizeCanvas);
    }
    if (animFrameId) cancelAnimationFrame(animFrameId);
  });
</script>

<div class="knowledge-graph-container" bind:this={containerElem}>
  <!-- Controls Overlay -->
  <div class="graph-toolbar">
    <!-- Search / Filter -->
    <div class="search-wrap">
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="11" cy="11" r="8"></circle>
        <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
      </svg>
      <input
        type="text"
        placeholder="Filter nodes..."
        bind:value={searchQuery}
        class="graph-search-input"
        oninput={() => draw()}
      />
      {#if searchQuery}
        <button type="button" class="clear-btn" onclick={() => { searchQuery = ''; draw(); }}>×</button>
      {/if}
    </div>

    <!-- Category Filter Chips -->
    <div class="filter-pills">
      {#each (['permanent', 'fleeting', 'literature', 'client', 'project'] as GraphNodeType[]) as type}
        <button
          type="button"
          class="pill-btn"
          class:active={visibleTypes[type]}
          onclick={() => { visibleTypes[type] = !visibleTypes[type]; requestSimulation(); }}
          style="--pill-color: {TYPE_COLORS[type].stroke}"
        >
          <span class="pill-dot"></span>
          <span>{TYPE_COLORS[type].label}</span>
        </button>
      {/each}
    </div>

    <!-- Zoom Controls -->
    <div class="zoom-actions">
      <button type="button" class="action-btn" onclick={zoomIn} title="Zoom In">+</button>
      <button type="button" class="action-btn" onclick={zoomOut} title="Zoom Out">−</button>
      <button type="button" class="action-btn" onclick={resetView} title="Reset View">⤢</button>
    </div>
  </div>

  <!-- Main Canvas -->
  <canvas
    bind:this={canvasElem}
    class="graph-canvas"
    onmousedown={handleMouseDown}
    onmousemove={handleMouseMove}
    onmouseup={handleMouseUp}
    onwheel={handleWheel}
  ></canvas>

  <!-- Node Hover Inspector Tooltip -->
  {#if hoveredNode}
    <div
      class="hover-card"
      style="left: {Math.min(window.innerWidth - 240, mousePos.x + 14)}px; top: {Math.min(window.innerHeight - 140, mousePos.y + 14)}px;"
    >
      <div class="card-header">
        <span class="type-badge" style="background: {TYPE_COLORS[hoveredNode.type]?.fill}; border-color: {TYPE_COLORS[hoveredNode.type]?.stroke}; color: {TYPE_COLORS[hoveredNode.type]?.stroke};">
          {TYPE_COLORS[hoveredNode.type]?.label || hoveredNode.type}
        </span>
        <span class="degree-badge">{hoveredNode.degree} links</span>
      </div>
      <h4 class="card-title">{hoveredNode.label}</h4>
      {#if hoveredNode.snippet}
        <p class="card-snippet">{hoveredNode.snippet}</p>
      {/if}
      <div class="card-footer">
        <span>Click node to open in Notes Canvas</span>
      </div>
    </div>
  {/if}

  <!-- Stats HUD Footer -->
  <div class="graph-hud-footer">
    <span class="hud-pill">{nodeCount} Nodes</span>
    <span class="hud-pill">{edgeCount} Connections</span>
    <span class="hud-pill zen-mode">Force 60fps</span>
  </div>
</div>

<style>
  .knowledge-graph-container {
    position: relative;
    width: 100%;
    height: 100%;
    min-height: 500px;
    background: var(--kanso-canvas, #09090B);
    border-radius: 8px;
    overflow: hidden;
    user-select: none;
  }

  .graph-canvas {
    display: block;
    width: 100%;
    height: 100%;
    cursor: grab;
  }

  .graph-canvas:active {
    cursor: grabbing;
  }

  /* ─── TOOLBAR ─── */
  .graph-toolbar {
    position: absolute;
    top: 14px;
    left: 14px;
    right: 14px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
    z-index: 10;
    pointer-events: none;
  }

  .search-wrap {
    pointer-events: auto;
    display: flex;
    align-items: center;
    gap: 6px;
    background: var(--kanso-surface, #18181B);
    border: 1px solid var(--kanso-border, #27272A);
    border-radius: 6px;
    padding: 4px 10px;
    color: var(--kanso-text-muted, #71717A);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.25);
  }

  .graph-search-input {
    background: transparent;
    border: none;
    outline: none;
    font-size: 12px;
    color: var(--kanso-text-primary, #F4F4F5);
    width: 130px;
  }

  .graph-search-input::placeholder {
    color: var(--kanso-text-muted, #71717A);
  }

  .clear-btn {
    background: transparent;
    border: none;
    color: var(--kanso-text-muted, #71717A);
    font-size: 14px;
    cursor: pointer;
    padding: 0 2px;
  }

  .filter-pills {
    pointer-events: auto;
    display: flex;
    align-items: center;
    gap: 6px;
    background: var(--kanso-surface, #18181B);
    border: 1px solid var(--kanso-border, #27272A);
    border-radius: 6px;
    padding: 4px 8px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.25);
  }

  .pill-btn {
    display: flex;
    align-items: center;
    gap: 5px;
    background: transparent;
    border: none;
    color: var(--kanso-text-muted, #71717A);
    font-size: 11px;
    font-weight: 500;
    padding: 3px 6px;
    border-radius: 4px;
    cursor: pointer;
    transition: all 120ms ease;
    opacity: 0.45;
  }

  .pill-btn.active {
    opacity: 1;
    color: var(--kanso-text-primary, #F4F4F5);
  }

  .pill-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: var(--pill-color, #38BDF8);
  }

  .zoom-actions {
    pointer-events: auto;
    display: flex;
    align-items: center;
    gap: 4px;
    background: var(--kanso-surface, #18181B);
    border: 1px solid var(--kanso-border, #27272A);
    border-radius: 6px;
    padding: 3px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.25);
  }

  .action-btn {
    width: 24px;
    height: 24px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: transparent;
    border: none;
    color: var(--kanso-text-primary, #F4F4F5);
    font-size: 13px;
    font-family: monospace;
    border-radius: 4px;
    cursor: pointer;
  }

  .action-btn:hover {
    background: var(--kanso-surface-hover, #27272A);
  }

  /* ─── HOVER CARD ─── */
  .hover-card {
    position: fixed;
    width: 230px;
    background: var(--kanso-surface, #18181B);
    border: 1px solid var(--kanso-border, #27272A);
    border-radius: 8px;
    padding: 10px 12px;
    box-shadow: 0 10px 25px rgba(0, 0, 0, 0.5);
    pointer-events: none;
    z-index: 100;
  }

  .card-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 6px;
  }

  .type-badge {
    font-size: 9.5px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    padding: 2px 6px;
    border-radius: 3px;
    border: 1px solid transparent;
  }

  .degree-badge {
    font-size: 10px;
    font-family: monospace;
    color: var(--kanso-text-muted, #71717A);
  }

  .card-title {
    font-size: 12.5px;
    font-weight: 700;
    color: var(--kanso-text-primary, #F4F4F5);
    margin: 0 0 4px 0;
    line-height: 1.35;
  }

  .card-snippet {
    font-size: 11px;
    color: var(--kanso-text-muted, #71717A);
    margin: 0 0 8px 0;
    line-height: 1.4;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }

  .card-footer {
    font-size: 9.5px;
    color: var(--kanso-accent, #38BDF8);
    font-family: monospace;
    border-top: 1px solid var(--kanso-border, #27272A);
    padding-top: 5px;
  }

  /* ─── HUD FOOTER ─── */
  .graph-hud-footer {
    position: absolute;
    bottom: 12px;
    left: 14px;
    display: flex;
    align-items: center;
    gap: 6px;
    z-index: 10;
    pointer-events: none;
  }

  .hud-pill {
    font-size: 10px;
    font-family: monospace;
    background: rgba(24, 24, 27, 0.85);
    backdrop-filter: blur(8px);
    border: 1px solid var(--kanso-border, #27272A);
    color: var(--kanso-text-muted, #71717A);
    padding: 3px 8px;
    border-radius: 4px;
  }

  .hud-pill.zen-mode {
    color: #10B981;
  }
</style>
