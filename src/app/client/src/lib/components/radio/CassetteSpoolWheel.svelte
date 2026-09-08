<script lang="ts">
  interface Props {
    rotationAngle?: number;
    size?: number;
    wheelColor?: string;
    holeColor?: string;
  }

  let {
    rotationAngle = 0,
    size = 28,
    wheelColor = '#FFFFFF',
    holeColor = '#0F172A'
  }: Props = $props();

  const center = $derived(size / 2);
  const outerR = $derived(size / 2);
  const spokeR = $derived(outerR * 0.72);
  const toothR = $derived(outerR * 0.16);
  const spindleR = $derived(outerR * 0.40);

  // Calculate 6 spoke gear teeth offsets
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
</script>

<div
  class="inline-flex items-center justify-center select-none"
  style="width: {size}px; height: {size}px; transform: rotate({rotationAngle}deg); will-change: transform;"
  aria-hidden="true"
>
  <svg
    width={size}
    height={size}
    viewBox="0 0 {size} {size}"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <!-- Outer Plastic Gear Wheel Body -->
    <circle cx={center} cy={center} r={outerR - 0.5} fill={wheelColor} stroke="rgba(0,0,0,0.15)" stroke-width="1" />

    <!-- 6 Mechanical Gear Teeth Cutouts -->
    {#each spokes as spoke}
      <circle cx={spoke.cx} cy={spoke.cy} r={spoke.r} fill={holeColor} />
    {/each}

    <!-- Center Spindle Core Hole -->
    <circle cx={center} cy={center} r={spindleR} fill={holeColor} />

    <!-- 3 Internal Spindle Gripper Teeth -->
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
  </svg>
</div>
