<script lang="ts">
  interface Props {
    rotationAngle?: number;
    isSpinning?: boolean;
    size?: number;
    wheelColor?: string;
    holeColor?: string;
    showSpindle?: boolean;
  }

  let {
    rotationAngle = 0,
    isSpinning = false,
    size = 28,
    wheelColor = '#FFFFFF',
    holeColor = '#09090B',
    showSpindle = true
  }: Props = $props();

  const center = $derived(size / 2);
  const outerR = $derived(size / 2);
  const spokeR = $derived(outerR * 0.72);
  const toothR = $derived(outerR * 0.16);
  const spindleR = $derived(outerR * 0.42);
  const spindleBossR = $derived(spindleR * 0.70);
  const spindlePinR = $derived(spindleR * 0.30);
  const toothLength = $derived(spindleR * 0.95);
  const toothWidth = $derived(Math.max(1.5, size * 0.045));

  // 6 spoke gear teeth cutouts around the outer hub
  const spokes = $derived(
    [0, 60, 120, 180, 240, 300].map(deg => {
      const rad = (deg * Math.PI) / 180;
      return {
        cx: center + Math.cos(rad) * spokeR,
        cy: center + Math.sin(rad) * spokeR,
        r: toothR
      };
    })
  );

  // 3 mechanical drive spindle splines / locking fins (120 degrees apart)
  const splines = $derived(
    [0, 120, 240].map(deg => {
      const rad = (deg * Math.PI) / 180;
      return {
        x1: center,
        y1: center,
        x2: center + Math.cos(rad) * toothLength,
        y2: center + Math.sin(rad) * toothLength,
        deg
      };
    })
  );
</script>

<div
  class="spool-wheel-container"
  class:spool-spinning={isSpinning}
  style="width: {size}px; height: {size}px; {isSpinning ? '' : `transform: rotate(${rotationAngle}deg);`} will-change: transform;"
  aria-hidden="true"
>
  <svg
    width={size}
    height={size}
    viewBox="0 0 {size} {size}"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <!-- Outer Molded Plastic Gear Wheel Body (White Hub) -->
    <circle cx={center} cy={center} r={outerR - 0.5} fill={wheelColor} stroke="rgba(0,0,0,0.25)" stroke-width="1" />
    <circle cx={center} cy={center} r={outerR - 1.5} stroke="rgba(255,255,255,0.7)" stroke-width="0.75" />

    <!-- 6 Mechanical Spoke Cutout Holes -->
    {#each spokes as spoke}
      <circle cx={spoke.cx} cy={spoke.cy} r={spoke.r} fill={holeColor} stroke="rgba(0,0,0,0.3)" stroke-width="0.5" />
    {/each}

    <!-- Center Spindle Core Hole (Recessed Deck Bay) -->
    <circle cx={center} cy={center} r={spindleR} fill={holeColor} stroke="rgba(0,0,0,0.5)" stroke-width="1" />

    {#if showSpindle}
      <!-- Cassette Deck Mechanical Drive Spindle Boss (Gunmetal Rotor) -->
      <circle
        cx={center}
        cy={center}
        r={spindleBossR}
        fill="#27272A"
        stroke="#52525B"
        stroke-width="1"
      />
      <!-- Inner Spindle Chamfer Ring -->
      <circle
        cx={center}
        cy={center}
        r={spindleBossR * 0.72}
        fill="#18181B"
        stroke="rgba(255,255,255,0.18)"
        stroke-width="0.5"
      />

      <!-- 3 Mechanical Drive Splines / Locking Fins -->
      {#each splines as s}
        <line
          x1={s.x1}
          y1={s.y1}
          x2={s.x2}
          y2={s.y2}
          stroke="#F4F4F5"
          stroke-width={toothWidth}
          stroke-linecap="round"
        />
        <circle
          cx={s.x2}
          cy={s.y2}
          r={toothWidth * 0.75}
          fill="#FFFFFF"
        />
      {/each}

      <!-- Center Axle Pivot Pin (Polished Steel Axle) -->
      <circle
        cx={center}
        cy={center}
        r={spindlePinR}
        fill="#E4E4E7"
        stroke="#71717A"
        stroke-width="0.5"
      />
      <!-- Center Axle Bore Dimple -->
      <circle
        cx={center}
        cy={center}
        r={spindlePinR * 0.45}
        fill="#09090B"
      />
    {:else}
      <!-- Fallback Internal Gripper Ribs -->
      <rect x={center - 1} y={center - spindleR} width="2" height={spindleR * 2} fill={wheelColor} opacity="0.6" />
      <rect
        x={center - 1}
        y={center - spindleR}
        width="2"
        height={spindleR * 2}
        fill={wheelColor}
        opacity="0.6"
        transform="rotate(60 {center} {center})"
      />
      <rect
        x={center - 1}
        y={center - spindleR}
        width="2"
        height={spindleR * 2}
        fill={wheelColor}
        opacity="0.6"
        transform="rotate(120 {center} {center})"
      />
    {/if}
  </svg>
</div>

<style>
  .spool-wheel-container {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    user-select: none;
    flex-shrink: 0;
    line-height: 0;
    position: relative;
    z-index: 5;
    filter: drop-shadow(0 2px 5px rgba(0, 0, 0, 0.6));
  }

  @keyframes spool-rotate-33rpm {
    from {
      transform: rotate(0deg);
    }
    to {
      transform: rotate(360deg);
    }
  }

  .spool-spinning {
    animation: spool-rotate-33rpm 1.818s linear infinite;
  }
</style>
