<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { appState } from '$lib/stores/appState.svelte';
  import { Icon } from '$lib/components/ui';

  interface Props {
    onSprintComplete?: () => void;
  }

  let { onSprintComplete }: Props = $props();

  const POMODORO_DURATION = 25 * 60; // 25 minutes = 1500 seconds
  let timeLeft = $state(POMODORO_DURATION);
  let isRunning = $state(false);
  let intervalId: any = null;

  const minutes = $derived(Math.floor(timeLeft / 60).toString().padStart(2, '0'));
  const seconds = $derived((timeLeft % 60).toString().padStart(2, '0'));
  const progressPercent = $derived(((POMODORO_DURATION - timeLeft) / POMODORO_DURATION) * 100);

  function toggleTimer() {
    if (isRunning) {
      pauseTimer();
    } else {
      startTimer();
    }
  }

  function startTimer() {
    isRunning = true;
    intervalId = setInterval(() => {
      if (timeLeft > 0) {
        timeLeft--;
      } else {
        pauseTimer();
        appState.addToast('Pomodoro focus sprint complete! Take a mindful 5-minute break.', 'success', 'Sprint Finished');
        if (onSprintComplete) onSprintComplete();
      }
    }, 1000);
  }

  function pauseTimer() {
    isRunning = false;
    if (intervalId) {
      clearInterval(intervalId);
      intervalId = null;
    }
  }

  function resetTimer() {
    pauseTimer();
    timeLeft = POMODORO_DURATION;
  }

  onDestroy(() => {
    if (intervalId) clearInterval(intervalId);
  });
</script>

<div class="pomodoro-timer-card">
  <div class="timer-header">
    <div class="timer-title-row">
      <span class="timer-badge">POMODORO FOCUS</span>
      <h4 class="timer-title">25-Min Sprint</h4>
    </div>
    <span class="timer-status-dot" class:is-running={isRunning}></span>
  </div>

  <div class="timer-display-box">
    <span class="timer-digits font-mono">{minutes}:{seconds}</span>
  </div>

  <div class="timer-progress-track">
    <div class="timer-progress-fill" style="width: {progressPercent}%;"></div>
  </div>

  <div class="timer-actions-row">
    <button
      type="button"
      class="btn-timer-toggle"
      class:is-running={isRunning}
      onclick={toggleTimer}
    >
      <Icon name={isRunning ? 'pause' : 'play'} size={12} />
      <span>{isRunning ? 'Pause' : 'Start Sprint'}</span>
    </button>
    <button
      type="button"
      class="btn-timer-reset"
      onclick={resetTimer}
      title="Reset to 25 minutes"
    >
      <Icon name="refresh" size={12} />
    </button>
  </div>
</div>

<style>
  .pomodoro-timer-card {
    background: var(--kanso-canvas);
    border: 1px solid var(--kanso-border);
    border-radius: 6px;
    padding: 14px 16px;
    display: flex;
    flex-direction: column;
    gap: 10px;
  }
  .timer-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  .timer-title-row {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }
  .timer-badge {
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 0.05em;
    color: var(--kanso-accent);
  }
  .timer-title {
    margin: 0;
    font-size: 13px;
    font-weight: 700;
    color: var(--kanso-text-primary);
  }
  .timer-status-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: var(--kanso-text-muted);
  }
  .timer-status-dot.is-running {
    background: var(--kanso-accent);
    box-shadow: 0 0 6px var(--kanso-accent);
  }
  .timer-display-box {
    text-align: center;
    padding: 6px 0;
  }
  .timer-digits {
    font-size: 26px;
    font-weight: 800;
    color: var(--kanso-text-primary);
    letter-spacing: 0.05em;
  }
  .timer-progress-track {
    height: 4px;
    background: var(--kanso-surface);
    border-radius: 2px;
    overflow: hidden;
  }
  .timer-progress-fill {
    height: 100%;
    background: var(--kanso-accent);
    border-radius: 2px;
    transition: width 0.3s ease;
  }
  .timer-actions-row {
    display: flex;
    gap: 8px;
  }
  .btn-timer-toggle {
    flex: 1;
    height: 30px;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    background: var(--kanso-surface);
    border: 1px solid var(--kanso-border);
    border-radius: 4px;
    color: var(--kanso-text-primary);
    font-size: 12px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.15s ease;
  }
  .btn-timer-toggle.is-running {
    border-color: var(--kanso-accent);
    color: var(--kanso-accent);
  }
  .btn-timer-reset {
    width: 30px;
    height: 30px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--kanso-surface);
    border: 1px solid var(--kanso-border);
    border-radius: 4px;
    color: var(--kanso-text-muted);
    cursor: pointer;
  }
  .btn-timer-reset:hover {
    color: var(--kanso-text-primary);
  }
</style>
