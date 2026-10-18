/**
 * Kanso Cre8 — Live Billable Timer Store (Svelte 5 Runes)
 * Tactile, millisecond-accurate billable time tracking, auto-calculated earnings,
 * session logging, and state persistence across app restarts.
 */

import { settingsStore } from './settingsStore.svelte';
import { ApiClient } from '../services/api';

export interface TimeSessionLog {
  id: string;
  projectId?: string;
  projectTitle?: string;
  clientCode: string;
  hourlyRate: number;
  durationSeconds: number;
  durationFormatted: string;
  earnedAmount: number;
  earnedFormatted: string;
  startedAt: string;
  endedAt: string;
  note?: string;
  appendedToInvoice?: boolean;
}

interface PersistedTimerState {
  isRunning: boolean;
  isPaused: boolean;
  startTime: number | null;
  accumulatedSeconds: number;
  projectId: string;
  projectTitle: string;
  clientCode: string;
  hourlyRate: number;
  sessionNote: string;
}

const TIMER_STORAGE_KEY = 'kanso_active_timer';
const LOGS_STORAGE_KEY = 'kanso_time_logs';

class TimerStore {
  // Reactive state
  isRunning = $state<boolean>(false);
  isPaused = $state<boolean>(false);
  startTime = $state<number | null>(null);
  accumulatedSeconds = $state<number>(0);
  currentTickerSeconds = $state<number>(0);

  projectId = $state<string>('');
  projectTitle = $state<string>('');
  clientCode = $state<string>('ACME');
  hourlyRate = $state<number>(150);
  sessionNote = $state<string>('');

  timeLogs = $state<TimeSessionLog[]>([]);

  private tickerInterval: any = null;
  private audioContext: AudioContext | null = null;

  // Derived values
  elapsedSeconds = $derived.by(() => {
    return this.accumulatedSeconds + this.currentTickerSeconds;
  });

  formattedTime = $derived.by(() => {
    const totalSecs = this.elapsedSeconds;
    const hrs = Math.floor(totalSecs / 3600);
    const mins = Math.floor((totalSecs % 3600) / 60);
    const secs = totalSecs % 60;
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  });

  earnedAmount = $derived.by(() => {
    const hours = this.elapsedSeconds / 3600;
    return hours * this.hourlyRate;
  });

  formattedEarned = $derived.by(() => {
    const symbol = settingsStore?.settings?.currencySymbol || 'RM';
    return `+${symbol}\u00A0${(this.earnedAmount || 0).toFixed(2)}`;
  });

  // Template aliases
  earnings = $derived.by(() => {
    return this.earnedAmount || 0;
  });

  elapsedFormatted = $derived.by(() => {
    return this.formattedTime || '00:00:00';
  });

  // Unbilled Atelier Derivations
  unbilledLogs = $derived.by(() => {
    return this.timeLogs.filter(l => !l.appendedToInvoice && l.durationSeconds >= 5);
  });

  unbilledSeconds = $derived.by(() => {
    return this.unbilledLogs.reduce((sum, l) => sum + l.durationSeconds, 0);
  });

  unbilledCount = $derived.by(() => {
    return this.unbilledLogs.length;
  });

  unbilledEarnings = $derived.by(() => {
    return Math.round(this.unbilledLogs.reduce((sum, l) => sum + l.earnedAmount, 0) * 100) / 100;
  });

  unbilledFormatted = $derived.by(() => {
    const totalSecs = this.unbilledSeconds;
    const hrs = Math.floor(totalSecs / 3600);
    const mins = Math.floor((totalSecs % 3600) / 60);
    if (hrs > 0) {
      return `${hrs}h ${mins}m`;
    }
    return `${Math.max(1, mins)}m`;
  });

  constructor() {
    this.loadTimeLogs();
    this.loadPersistedState();
    this.syncFromMachine();
  }

  // --- AUDIO FEEDBACK (Tactile Mechanical Clicks) ---
  private playMechanicalClick(type: 'start' | 'stop' | 'tick') {
    if (!settingsStore.settings.soundEffects || typeof window === 'undefined') return;
    try {
      if (!this.audioContext) {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioCtx) this.audioContext = new AudioCtx();
      }
      if (!this.audioContext) return;
      if (this.audioContext.state === 'suspended') {
        this.audioContext.resume();
      }

      const osc = this.audioContext.createOscillator();
      const gain = this.audioContext.createGain();
      osc.connect(gain);
      gain.connect(this.audioContext.destination);

      const now = this.audioContext.currentTime;
      if (type === 'start') {
        osc.frequency.setValueAtTime(440, now);
        osc.frequency.exponentialRampToValueAtTime(880, now + 0.05);
        gain.gain.setValueAtTime(0.12, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);
        osc.start(now);
        osc.stop(now + 0.06);
      } else if (type === 'stop') {
        osc.frequency.setValueAtTime(660, now);
        osc.frequency.exponentialRampToValueAtTime(330, now + 0.08);
        gain.gain.setValueAtTime(0.14, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);
        osc.start(now);
        osc.stop(now + 0.09);
      }
    } catch (e) {
      /* non-critical audio */
    }
  }

  // --- TIMER CONTROLS ---

  start(
    optsOrProjectId?: string | { projectId?: string; projectTitle?: string; clientCode?: string; hourlyRate?: number; note?: string },
    projectTitleOrHourlyRate?: string | number,
    clientCodeArg?: string,
    hourlyRateArg?: number
  ) {
    let opts: { projectId?: string; projectTitle?: string; clientCode?: string; hourlyRate?: number; note?: string } = {};
    if (typeof optsOrProjectId === 'string') {
      if (typeof projectTitleOrHourlyRate === 'string') {
        opts = {
          projectId: optsOrProjectId,
          projectTitle: projectTitleOrHourlyRate,
          clientCode: clientCodeArg,
          hourlyRate: hourlyRateArg
        };
      } else {
        opts = {
          clientCode: optsOrProjectId,
          hourlyRate: typeof projectTitleOrHourlyRate === 'number' ? projectTitleOrHourlyRate : hourlyRateArg
        };
      }
    } else if (optsOrProjectId) {
      opts = optsOrProjectId;
    }
    if (opts) {
      if (opts.projectId !== undefined) this.projectId = opts.projectId;
      if (opts.projectTitle !== undefined) this.projectTitle = opts.projectTitle;
      if (opts.clientCode !== undefined) this.clientCode = opts.clientCode;
      if (opts.hourlyRate !== undefined) this.hourlyRate = opts.hourlyRate;
      if (opts.note !== undefined) this.sessionNote = opts.note;
    }

    if (!this.hourlyRate) {
      this.hourlyRate = settingsStore.settings.defaultHourlyRate || 120;
    }

    this.isRunning = true;
    this.isPaused = false;
    this.startTime = Date.now();
    this.currentTickerSeconds = 0;

    this.playMechanicalClick('start');
    this.startTicker();
    this.persistState();

    // Sync to Machine tier
    ApiClient.startTimer({
      projectId: this.projectId,
      projectTitle: this.projectTitle,
      clientCode: this.clientCode,
      hourlyRate: this.hourlyRate,
      sessionNote: this.sessionNote,
      accumulatedSeconds: this.accumulatedSeconds
    }).catch(() => {});
  }

  pause() {
    if (!this.isRunning) return;
    this.accumulatedSeconds += this.currentTickerSeconds;
    this.currentTickerSeconds = 0;
    this.isRunning = false;
    this.isPaused = true;
    this.startTime = null;

    if (this.tickerInterval) {
      clearInterval(this.tickerInterval);
      this.tickerInterval = null;
    }
    this.persistState();
    ApiClient.pauseTimer().catch(() => {});
  }

  resume() {
    if (!this.isPaused) return;
    this.start();
  }

  stop(): TimeSessionLog | null {
    if (!this.isRunning && !this.isPaused && this.elapsedSeconds === 0) return null;

    const totalSeconds = this.elapsedSeconds;
    if (this.tickerInterval) {
      clearInterval(this.tickerInterval);
      this.tickerInterval = null;
    }

    this.playMechanicalClick('stop');

    let log: TimeSessionLog | null = null;
    if (totalSeconds >= 5) { // Only log sessions >= 5 seconds to avoid noise
      const earned = (totalSeconds / 3600) * this.hourlyRate;
      const symbol = settingsStore.settings.currencySymbol || 'RM';
      log = {
        id: `log_${Date.now()}`,
        projectId: this.projectId,
        projectTitle: this.projectTitle || (this.projectId ? `Project ${this.projectId}` : 'Creative Work'),
        clientCode: this.clientCode || 'ACME',
        hourlyRate: this.hourlyRate,
        durationSeconds: totalSeconds,
        durationFormatted: this.formattedTime,
        earnedAmount: Math.round(earned * 100) / 100,
        earnedFormatted: `${symbol} ${earned.toFixed(2)}`,
        startedAt: this.startTime ? new Date(this.startTime).toISOString() : new Date().toISOString(),
        endedAt: new Date().toISOString(),
        note: this.sessionNote,
        appendedToInvoice: false
      };

      this.timeLogs = [log, ...this.timeLogs];
      this.saveTimeLogs();
    }

    // Reset timer
    this.isRunning = false;
    this.isPaused = false;
    this.startTime = null;
    this.accumulatedSeconds = 0;
    this.currentTickerSeconds = 0;
    this.sessionNote = '';

    this.clearPersistedState();
    ApiClient.stopTimer({ appendToInvoice: true, note: log ? log.note : '' }).catch(() => {});
    return log;
  }

  reset() {
    if (this.tickerInterval) {
      clearInterval(this.tickerInterval);
      this.tickerInterval = null;
    }
    this.isRunning = false;
    this.isPaused = false;
    this.startTime = null;
    this.accumulatedSeconds = 0;
    this.currentTickerSeconds = 0;
    this.sessionNote = '';
    this.clearPersistedState();
  }

  setRate(rate: number) {
    this.hourlyRate = Math.max(0, rate);
    this.persistState();
  }

  setHourlyRate(rate: number) {
    this.setRate(rate);
  }

  setClient(code: string, rate?: number) {
    this.clientCode = code;
    if (rate !== undefined && rate > 0) {
      this.hourlyRate = rate;
    }
    this.persistState();
  }

  // --- UNBILLED SESSION ACTIONS ---

  markSessionAppended(logId: string) {
    const log = this.timeLogs.find(l => l.id === logId);
    if (log) {
      log.appendedToInvoice = true;
      this.saveTimeLogs();
    }
  }

  markAllSessionsAppended() {
    for (const log of this.timeLogs) {
      log.appendedToInvoice = true;
    }
    this.saveTimeLogs();
  }

  dismissUnbilledSession(logId: string) {
    this.markSessionAppended(logId);
  }

  // --- TICKER & PERSISTENCE ---

  private startTicker() {
    if (this.tickerInterval) clearInterval(this.tickerInterval);
    this.tickerInterval = setInterval(() => {
      if (this.isRunning && this.startTime) {
        this.currentTickerSeconds = Math.floor((Date.now() - this.startTime) / 1000);
      }
    }, 1000);
  }

  private persistState() {
    if (typeof localStorage === 'undefined') return;
    try {
      const state: PersistedTimerState = {
        isRunning: this.isRunning,
        isPaused: this.isPaused,
        startTime: this.startTime,
        accumulatedSeconds: this.accumulatedSeconds + this.currentTickerSeconds,
        projectId: this.projectId,
        projectTitle: this.projectTitle,
        clientCode: this.clientCode,
        hourlyRate: this.hourlyRate,
        sessionNote: this.sessionNote
      };
      localStorage.setItem(TIMER_STORAGE_KEY, JSON.stringify(state));
    } catch (e) {
      console.warn('[TimerStore] Save timer state warning:', e);
    }
  }

  private loadPersistedState() {
    if (typeof localStorage === 'undefined') return;
    try {
      const stored = localStorage.getItem(TIMER_STORAGE_KEY);
      if (stored) {
        const parsed: PersistedTimerState = JSON.parse(stored);
        this.projectId = parsed.projectId || '';
        this.projectTitle = parsed.projectTitle || '';
        this.clientCode = parsed.clientCode || 'ACME';
        this.hourlyRate = parsed.hourlyRate || settingsStore.settings.defaultHourlyRate || 120;
        this.sessionNote = parsed.sessionNote || '';
        this.isPaused = parsed.isPaused || false;

        if (parsed.isRunning && parsed.startTime) {
          // Accurate time recovery: compute elapsed seconds elapsed while app was closed
          const additionalSeconds = Math.floor((Date.now() - parsed.startTime) / 1000);
          this.accumulatedSeconds = (parsed.accumulatedSeconds || 0) + additionalSeconds;
          this.startTime = Date.now();
          this.currentTickerSeconds = 0;
          this.isRunning = true;
          this.startTicker();
        } else {
          this.accumulatedSeconds = parsed.accumulatedSeconds || 0;
          this.isRunning = false;
        }
      }
    } catch (e) {
      console.warn('[TimerStore] Load timer state warning:', e);
    }
  }

  async syncFromMachine() {
    try {
      const res = await ApiClient.getTimerState();
      if (res && res.success && res.timer) {
        const t = res.timer;
        if (t.isRunning && t.startedAt) {
          const liveElapsed = Math.floor((Date.now() - t.startedAt) / 1000) + (t.accumulatedSeconds || 0);
          this.accumulatedSeconds = liveElapsed;
          this.startTime = Date.now();
          this.currentTickerSeconds = 0;
          this.projectId = t.projectId || '';
          this.projectTitle = t.projectTitle || '';
          this.clientCode = t.clientCode || 'ACME';
          this.hourlyRate = t.hourlyRate || 150;
          this.sessionNote = t.sessionNote || '';
          this.isPaused = false;
          this.isRunning = true;
          this.startTicker();
        } else if (t.isPaused) {
          this.accumulatedSeconds = t.accumulatedSeconds || 0;
          this.projectId = t.projectId || '';
          this.projectTitle = t.projectTitle || '';
          this.clientCode = t.clientCode || 'ACME';
          this.hourlyRate = t.hourlyRate || 150;
          this.sessionNote = t.sessionNote || '';
          this.isPaused = true;
          this.isRunning = false;
        }
      }
    } catch (_) {}
  }

  private clearPersistedState() {
    if (typeof localStorage === 'undefined') return;
    localStorage.removeItem(TIMER_STORAGE_KEY);
  }

  // --- LOGS STORAGE ---

  private loadTimeLogs() {
    if (typeof localStorage === 'undefined') return;
    try {
      const stored = localStorage.getItem(LOGS_STORAGE_KEY);
      if (stored) {
        this.timeLogs = JSON.parse(stored);
      } else {
        const symbol = settingsStore?.settings?.currencySymbol || 'RM';
        this.timeLogs = [
          {
            id: 'log_seed_01',
            projectId: '202609_0001_ACME_MobileAppIllustration',
            projectTitle: 'Mobile App Illustration',
            clientCode: 'ACME',
            hourlyRate: 150,
            durationSeconds: 2700,
            durationFormatted: '00:45:00',
            earnedAmount: 112.50,
            earnedFormatted: `${symbol} 112.50`,
            startedAt: new Date(Date.now() - 3600000 * 3).toISOString(),
            endedAt: new Date(Date.now() - 3600000 * 2.25).toISOString(),
            note: 'Mobile hero illustration wireframes and visual tokens',
            appendedToInvoice: false
          }
        ];
        this.saveTimeLogs();
      }
    } catch (e) {
      this.timeLogs = [];
    }
  }

  private saveTimeLogs() {
    if (typeof localStorage === 'undefined') return;
    try {
      localStorage.setItem(LOGS_STORAGE_KEY, JSON.stringify(this.timeLogs.slice(0, 100)));
    } catch (e) {
      console.warn('[TimerStore] Save time logs warning:', e);
    }
  }

  // --- ANALYTICS HELPERS ---

  getTodayHours(): number {
    const todayStr = new Date().toISOString().split('T')[0];
    const completedSeconds = this.timeLogs
      .filter(l => l.startedAt.startsWith(todayStr))
      .reduce((sum, l) => sum + l.durationSeconds, 0);
    const activeSeconds = this.isRunning ? this.elapsedSeconds : 0;
    return Math.round(((completedSeconds + activeSeconds) / 3600) * 10) / 10;
  }

  getTodayEarned(): number {
    const todayStr = new Date().toISOString().split('T')[0];
    const completedEarned = this.timeLogs
      .filter(l => l.startedAt.startsWith(todayStr))
      .reduce((sum, l) => sum + l.earnedAmount, 0);
    const activeEarned = this.isRunning ? this.earnedAmount : 0;
    return Math.round((completedEarned + activeEarned) * 100) / 100;
  }

  getWeekHours(): number {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const completedSeconds = this.timeLogs
      .filter(l => new Date(l.startedAt) >= sevenDaysAgo)
      .reduce((sum, l) => sum + l.durationSeconds, 0);
    const activeSeconds = this.isRunning ? this.elapsedSeconds : 0;
    return Math.round(((completedSeconds + activeSeconds) / 3600) * 10) / 10;
  }
}

export const timerStore = new TimerStore();
