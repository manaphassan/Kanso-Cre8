/**
 * Kanso Cre8 — TimerService
 * Manages live billable chronometer state in the Machine tier (%APPDATA%/KansoCre8/app.json or ~/.config/kansocre8/app.json).
 * 
 * Rules:
 * - Persisting timer in the vault as _Team/_Config/timer.json is strictly forbidden (machine-local, updates continuously).
 * - Persisted in Machine tier with millisecond epoch timestamp startedAt.
 * - Elapsed seconds are computed on startup/restarts: Date.now() - startedAt + accumulatedSeconds.
 * - On stop, session is appended directly to the client's draft invoice in _Finance/Invoices/.
 */

const ConfigService = require('./ConfigService');
const FinanceVaultService = require('./FinanceVaultService');

function formatSeconds(totalSeconds) {
  const s = Math.max(0, Math.floor(totalSeconds || 0));
  const hrs = Math.floor(s / 3600);
  const mins = Math.floor((s % 3600) / 60);
  const secs = s % 60;
  return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

class TimerService {
  static getDefaultState() {
    return {
      isRunning: false,
      isPaused: false,
      startedAt: null, // Epoch ms timestamp
      accumulatedSeconds: 0,
      projectId: '',
      projectTitle: '',
      clientCode: 'ACME',
      hourlyRate: 150,
      sessionNote: ''
    };
  }

  /**
   * Retrieves current timer state from Machine tier, accurately computing elapsed seconds.
   */
  static getState() {
    const raw = ConfigService.machine.get('timer', this.getDefaultState());
    const state = { ...this.getDefaultState(), ...(raw || {}) };

    let elapsedSeconds = state.accumulatedSeconds || 0;
    if (state.isRunning && state.startedAt) {
      const liveSeconds = Math.max(0, Math.floor((Date.now() - state.startedAt) / 1000));
      elapsedSeconds += liveSeconds;
    }

    const earnedAmount = Math.round(((elapsedSeconds / 3600) * (state.hourlyRate || 150)) * 100) / 100;

    return {
      ...state,
      elapsedSeconds,
      formattedTime: formatSeconds(elapsedSeconds),
      earnedAmount
    };
  }

  /**
   * Starts the chronometer with epoch millisecond startedAt.
   */
  static start({
    projectId = '',
    projectTitle = '',
    clientCode = 'ACME',
    hourlyRate = 150,
    sessionNote = '',
    accumulatedSeconds = 0
  } = {}) {
    const now = Date.now();
    const state = {
      isRunning: true,
      isPaused: false,
      startedAt: now,
      accumulatedSeconds: Math.max(0, Number(accumulatedSeconds) || 0),
      projectId: String(projectId || ''),
      projectTitle: String(projectTitle || ''),
      clientCode: String(clientCode || 'ACME').toUpperCase(),
      hourlyRate: Math.max(0, Number(hourlyRate) || 150),
      sessionNote: String(sessionNote || '')
    };

    ConfigService.machine.set('timer', state);

    return {
      ...state,
      elapsedSeconds: state.accumulatedSeconds,
      formattedTime: formatSeconds(state.accumulatedSeconds),
      earnedAmount: Math.round(((state.accumulatedSeconds / 3600) * state.hourlyRate) * 100) / 100
    };
  }

  /**
   * Pauses the running chronometer, banking elapsed time into accumulatedSeconds.
   */
  static pause() {
    const current = this.getState();
    if (!current.isRunning) return current;

    const state = {
      ...current,
      isRunning: false,
      isPaused: true,
      startedAt: null,
      accumulatedSeconds: current.elapsedSeconds
    };

    ConfigService.machine.set('timer', state);
    return this.getState();
  }

  /**
   * Resumes a paused chronometer.
   */
  static resume() {
    const current = this.getState();
    if (!current.isPaused) return current;

    const state = {
      ...current,
      isRunning: true,
      isPaused: false,
      startedAt: Date.now()
    };

    ConfigService.machine.set('timer', state);
    return this.getState();
  }

  /**
   * Stops chronometer.
   * If appendToInvoice is true and elapsed duration >= 5 seconds, appends session to draft invoice.
   */
  static stop({ appendToInvoice = true, note = null } = {}) {
    const current = this.getState();
    const totalSeconds = current.elapsedSeconds;
    const finalNote = note !== null && note !== undefined ? note : current.sessionNote;

    let sessionLog = null;
    let invoice = null;

    if (totalSeconds >= 5) {
      const earned = Math.round(((totalSeconds / 3600) * (current.hourlyRate || 150)) * 100) / 100;
      sessionLog = {
        id: `log_${Date.now()}`,
        projectId: current.projectId,
        projectTitle: current.projectTitle || (current.projectId ? `Project ${current.projectId}` : 'Creative Work'),
        clientCode: current.clientCode || 'ACME',
        hourlyRate: current.hourlyRate || 150,
        durationSeconds: totalSeconds,
        durationFormatted: current.formattedTime,
        earnedAmount: earned,
        earnedFormatted: `USD ${earned.toFixed(2)}`,
        startedAt: current.startedAt ? new Date(current.startedAt).toISOString() : new Date(Date.now() - totalSeconds * 1000).toISOString(),
        endedAt: new Date().toISOString(),
        note: finalNote,
        appendedToInvoice: false
      };

      if (appendToInvoice) {
        try {
          invoice = FinanceVaultService.appendSessionToInvoice(sessionLog.clientCode, sessionLog);
          sessionLog.appendedToInvoice = true;
          sessionLog.invoiceDocumentNumber = invoice ? invoice.documentNumber : null;
        } catch (err) {
          console.warn('[TimerService] Failed to append session to draft invoice:', err.message);
        }
      }
    }

    // Reset machine state
    const resetState = {
      isRunning: false,
      isPaused: false,
      startedAt: null,
      accumulatedSeconds: 0,
      projectId: '',
      projectTitle: '',
      clientCode: current.clientCode || 'ACME',
      hourlyRate: current.hourlyRate || 150,
      sessionNote: ''
    };

    ConfigService.machine.set('timer', resetState);

    return {
      success: true,
      totalSeconds,
      sessionLog,
      invoice,
      state: this.getState()
    };
  }

  /**
   * Resets timer without logging.
   */
  static reset() {
    const current = this.getState();
    const resetState = {
      ...this.getDefaultState(),
      clientCode: current.clientCode,
      hourlyRate: current.hourlyRate
    };
    ConfigService.machine.set('timer', resetState);
    return this.getState();
  }
}

module.exports = TimerService;
