/**
 * The 25-minute Pomodoro focus timer on the cassette deck. A store, not
 * component state, so a running sprint survives closing the radio drawer.
 */

import { appState } from './appState.svelte';

export const FOCUS_SECONDS = 25 * 60;

class FocusTimer {
  timeLeft = $state(FOCUS_SECONDS);
  isRunning = $state(false);
  private intervalId: ReturnType<typeof setInterval> | null = null;

  get formatted(): string {
    const m = Math.floor(this.timeLeft / 60).toString().padStart(2, '0');
    const s = (this.timeLeft % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  }

  /** 0 at the start of a sprint, 1 when it is done. */
  get progress(): number {
    return (FOCUS_SECONDS - this.timeLeft) / FOCUS_SECONDS;
  }

  start(): void {
    if (this.isRunning) return;
    if (this.timeLeft <= 0) this.timeLeft = FOCUS_SECONDS;
    this.isRunning = true;
    this.intervalId = setInterval(() => {
      if (this.timeLeft > 1) {
        this.timeLeft--;
        return;
      }
      this.timeLeft = 0;
      this.pause();
      appState.addToast('Focus sprint complete. Take a mindful 5-minute break.', 'success', 'Sprint finished');
    }, 1000);
  }

  pause(): void {
    this.isRunning = false;
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  toggle(): void {
    if (this.isRunning) this.pause();
    else this.start();
  }

  reset(): void {
    this.pause();
    this.timeLeft = FOCUS_SECONDS;
  }
}

export const focusTimer = new FocusTimer();
