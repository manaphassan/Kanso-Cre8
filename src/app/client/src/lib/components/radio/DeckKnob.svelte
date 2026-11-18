<script lang="ts">
  /**
   * Knurled rotary knob (0..1). Accessible as a slider: arrow keys, Page
   * Up/Down, Home/End, mouse wheel, or drag up and down.
   */
  interface Props {
    label: string;
    value: number;
    onchange: (v: number) => void;
  }

  let { label, value, onchange }: Props = $props();

  const clamp = (v: number) => Math.max(0, Math.min(1, Math.round(v * 100) / 100));
  // -135 deg (min) to +135 deg (max), as on a hi-fi pot.
  const angle = $derived(-135 + clamp(value) * 270);

  function onKeydown(e: KeyboardEvent) {
    const steps: Record<string, number> = { ArrowUp: 0.05, ArrowRight: 0.05, ArrowDown: -0.05, ArrowLeft: -0.05, PageUp: 0.2, PageDown: -0.2 };
    if (e.key in steps) onchange(clamp(value + steps[e.key]));
    else if (e.key === 'Home') onchange(0);
    else if (e.key === 'End') onchange(1);
    else return;
    e.preventDefault();
  }

  function onWheel(e: WheelEvent) {
    e.preventDefault();
    onchange(clamp(value - Math.sign(e.deltaY) * 0.05));
  }

  function onPointerDown(e: PointerEvent) {
    const el = e.currentTarget as HTMLElement;
    el.setPointerCapture(e.pointerId);
    const startY = e.clientY;
    const start = value;
    const move = (ev: PointerEvent) => onchange(clamp(start + (startY - ev.clientY) / 150));
    const up = () => {
      el.removeEventListener('pointermove', move);
      el.removeEventListener('pointerup', up);
      el.removeEventListener('pointercancel', up);
    };
    el.addEventListener('pointermove', move);
    el.addEventListener('pointerup', up);
    el.addEventListener('pointercancel', up);
  }
</script>

<div class="knob-wrap">
  <div
    class="knob"
    role="slider"
    tabindex="0"
    aria-label={label}
    aria-valuemin="0"
    aria-valuemax="100"
    aria-valuenow={Math.round(clamp(value) * 100)}
    style="--angle: {angle}deg"
    onkeydown={onKeydown}
    onwheel={onWheel}
    onpointerdown={onPointerDown}
  ></div>
  <span class="label" aria-hidden="true">{label.toUpperCase()}</span>
</div>

<style>
  .knob-wrap {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4px;
  }

  .knob {
    width: 36px;
    height: 36px;
    border-radius: 50%;
    position: relative;
    background: var(--dk-knob);
    box-shadow: var(--dk-knob-edge);
    cursor: ns-resize;
    touch-action: none;
  }

  /* Pointer line: knob artwork colour (hex allow-listed). */
  .knob::after {
    content: '';
    position: absolute;
    left: 50%;
    top: 4px;
    width: 2px;
    height: 10px;
    margin-left: -1px;
    border-radius: 1px;
    background: #FF6A4D;
    transform-origin: 1px 14px;
    transform: rotate(var(--angle));
  }

  .knob:focus-visible {
    outline: 2px solid var(--kanso-accent);
    outline-offset: 3px;
  }

  .label {
    font-size: 8.5px;
    letter-spacing: 0.1em;
  }
</style>
