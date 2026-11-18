<script lang="ts">
  /**
   * Fluorescent L/R level meter. Radio streams are cross-origin, so the audio
   * cannot be analysed; like the old VU needles, the level is a simulated
   * beat scaled by the volume. About 15 updates a second keeps it cheap.
   */
  interface Props {
    isPlaying: boolean;
    volume: number;
  }

  let { isPlaying, volume }: Props = $props();

  const SEGMENTS = 26;
  const HOT_FROM = 20; // segments at 0 dB and above
  const SCALE = ['-40', '-20', '-10', '-6', '-3', '0', '+3', '+6 dB'];

  let left = $state(0);
  let right = $state(0);

  $effect(() => {
    const gain = Math.max(0, Math.min(1, volume));
    const reduced = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!isPlaying || gain === 0) {
      left = right = 0;
      return;
    }
    if (reduced) {
      left = right = Math.round(SEGMENTS * 0.6 * gain);
      return;
    }
    let frame = 0;
    let last = 0;
    let peakL = 0;
    let peakR = 0;
    const tick = (t: number) => {
      frame = requestAnimationFrame(tick);
      if (t - last < 66) return;
      last = t;
      const beat = (Math.sin(t / 260) + 1) / 2;
      const off = (Math.sin(t / 310 + 1.3) + 1) / 2;
      const targetL = (0.45 + 0.4 * beat ** 3 + Math.random() * 0.15) * gain;
      const targetR = (0.42 + 0.4 * off ** 3 + Math.random() * 0.15) * gain;
      // Fast attack, slow release, as on a real meter.
      peakL = targetL > peakL ? targetL : peakL * 0.82 + targetL * 0.18;
      peakR = targetR > peakR ? targetR : peakR * 0.82 + targetR * 0.18;
      left = Math.round(Math.min(1, peakL) * SEGMENTS);
      right = Math.round(Math.min(1, peakR) * SEGMENTS);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  });

  const segs = Array.from({ length: SEGMENTS }, (_, i) => i);
</script>

<div class="meter" aria-hidden="true">
  {#each [['L', left], ['R', right]] as [ch, lit] (ch)}
    <div class="row">
      <span class="ch">{ch}</span>
      <div class="segs">
        {#each segs as i (i)}
          <span class="seg" class:hot={i >= HOT_FROM} class:on={i < Number(lit)}></span>
        {/each}
      </div>
    </div>
  {/each}
  <div class="scale">
    {#each SCALE as mark (mark)}<span>{mark}</span>{/each}
  </div>
</div>

<style>
  /* Fluorescent display artwork: fixed phosphor colours (hex allow-listed). */
  .meter {
    display: flex;
    flex-direction: column;
    gap: 3px;
  }

  .row {
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .ch {
    width: 8px;
    font-size: 9px;
  }

  .segs {
    flex: 1;
    display: flex;
    gap: 2px;
  }

  .seg {
    flex: 1;
    height: 6px;
    background: #0E2622;
  }

  .seg.on {
    background: #59F2DC;
    box-shadow: 0 0 5px #59F2DC;
  }

  .seg.hot {
    background: #3A1410;
  }

  .seg.hot.on {
    background: #FF6A4D;
    box-shadow: 0 0 5px #FF6A4D;
  }

  .scale {
    display: flex;
    justify-content: space-between;
    margin-left: 14px;
    font-size: 8px;
    opacity: 0.7;
  }
</style>
