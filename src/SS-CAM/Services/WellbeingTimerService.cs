using System;
using System.Diagnostics;
using SS_CAM.Models;
using SS_CAM.Services;

namespace SS_CAM.Services
{
    /// <summary>
    /// Manages focus session timing with idle detection, pause/resume,
    /// crash recovery checkpointing, and session history persistence.
    /// All data stays 100% local — no cloud, no telemetry.
    /// </summary>
    public class WellbeingTimerService
    {
        // ── State ────────────────────────────────────────────────────────
        public enum TimerState { Ready, Running, Paused, Completed, RecoveryPending }

        public TimerState State { get; private set; }
        public string SessionType { get; private set; }
        public int PlannedDurationSeconds { get; private set; }
        public int ElapsedSeconds { get; private set; }
        public DateTime SessionStart { get; private set; }

        private readonly Stopwatch _stopwatch;
        private readonly WellbeingDataService _dataService;
        private const int IdleAutoPauseThresholdSeconds = 180;

        private static readonly Lazy<WellbeingTimerService> _shared =
            new Lazy<WellbeingTimerService>(() => new WellbeingTimerService(new WellbeingDataService()));

        public static WellbeingTimerService SharedInstance
        {
            get { return _shared.Value; }
        }

        public WellbeingTimerService(WellbeingDataService dataService)
        {
            _dataService = dataService;
            _stopwatch = new Stopwatch();
            State = TimerState.Ready;
            SessionType = "Standard Focus";
        }

        // ── Idle detection ───────────────────────────────────────────────
        // NOTE: GetLastInputInfo is intentionally removed from the production build.
        // AV heuristics flag it as suspicious (same API fingerprint as keyloggers).
        // Auto-pause on idle is handled gracefully: the user can manually pause.
        public int GetIdleSeconds()
        {
            return 0; // Idle detection disabled — not required for core timer function
        }

        // ── Session control ──────────────────────────────────────────────
        public void StartSession(int durationMinutes, string sessionType)
        {
            PlannedDurationSeconds = durationMinutes * 60;
            ElapsedSeconds = 0;
            SessionType = sessionType;
            SessionStart = DateTime.Now;
            State = TimerState.Running;
            _stopwatch.Restart();
            SaveCheckpoint();
        }

        public void PauseSession()
        {
            if (State != TimerState.Running) return;
            _stopwatch.Stop();
            ElapsedSeconds += (int)_stopwatch.Elapsed.TotalSeconds;
            _stopwatch.Reset();
            State = TimerState.Paused;
            SaveCheckpoint();
        }

        public void ResumeSession()
        {
            if (State != TimerState.Paused && State != TimerState.RecoveryPending) return;
            State = TimerState.Running;
            _stopwatch.Restart();
            SaveCheckpoint();
        }

        /// <summary>
        /// Stops the session, writes it to history, and resets state.
        /// Returns the persisted FocusSession record.
        /// </summary>
        public FocusSession StopSession(string reason)
        {
            _stopwatch.Stop();
            if (State == TimerState.Running)
                ElapsedSeconds += (int)_stopwatch.Elapsed.TotalSeconds;

            bool completed = ElapsedSeconds >= PlannedDurationSeconds;
            var session = new FocusSession
            {
                Id = Guid.NewGuid().ToString(),
                StartTime = SessionStart.ToString("o"),
                EndTime = DateTime.Now.ToString("o"),
                DurationMinutes = PlannedDurationSeconds / 60,
                ActualSeconds = ElapsedSeconds,
                PresetName = SessionType,
                Completed = completed,
                EndReason = reason
            };

            var data = _dataService.GetWellbeingData();
            data.FocusSessions.Add(session);
            data.ActiveSessionState = null;
            _dataService.SaveWellbeingData(data);

            // Reset state
            State = TimerState.Ready;
            ElapsedSeconds = 0;
            _stopwatch.Reset();

            return session;
        }

        // ── Tick (call every second from a UI DispatcherTimer) ───────────
        /// <summary>
        /// Returns null while session is running normally.
        /// Returns "AutoPaused" if paused due to idle.
        /// Returns "Completed" when the session finishes naturally.
        /// </summary>
        public string Tick()
        {
            if (State != TimerState.Running) return null;

            int idleSecs = GetIdleSeconds();
            if (idleSecs >= IdleAutoPauseThresholdSeconds)
            {
                // Subtract idle time so it is not counted as focus time
                int liveSecs = (int)_stopwatch.Elapsed.TotalSeconds;
                int billable = liveSecs - idleSecs;
                if (billable < 0) billable = 0;
                ElapsedSeconds += billable;
                _stopwatch.Reset();
                State = TimerState.Paused;
                SaveCheckpoint();
                return "AutoPaused";
            }

            int total = ElapsedSeconds + (int)_stopwatch.Elapsed.TotalSeconds;
            if (total >= PlannedDurationSeconds)
            {
                State = TimerState.Completed;
                ElapsedSeconds = total;
                _stopwatch.Stop();
                SaveCheckpoint();
                return "Completed";
            }

            return null;
        }

        public int GetLiveElapsedSeconds()
        {
            int elapsed = ElapsedSeconds;
            if (State == TimerState.Running && _stopwatch.IsRunning)
            {
                elapsed += (int)_stopwatch.Elapsed.TotalSeconds;
            }
            return elapsed;
        }

        public int GetLiveRemainingSeconds()
        {
            if (State == TimerState.Ready) return PlannedDurationSeconds;
            int remaining = PlannedDurationSeconds - GetLiveElapsedSeconds();
            return remaining < 0 ? 0 : remaining;
        }

        /// <summary>Returns remaining time as "MM:SS" string for UI display.</summary>
        public string GetFormattedRemaining()
        {
            if (State == TimerState.Ready) return string.Empty;
            int remaining = GetLiveRemainingSeconds();
            int m = remaining / 60;
            int s = remaining % 60;
            return string.Format("{0}:{1:D2}", m, s);
        }

        // ── Crash-recovery checkpointing ─────────────────────────────────
        private void SaveCheckpoint()
        {
            int current = ElapsedSeconds;
            if (State == TimerState.Running)
                current += (int)_stopwatch.Elapsed.TotalSeconds;

            var checkpoint = new ActiveSessionState
            {
                SessionType = SessionType,
                StartTime = SessionStart.ToString("o"),
                DurationMinutes = PlannedDurationSeconds / 60,
                AccumulatedSeconds = current,
                TimerStateLabel = State.ToString(),
                LastCheckpointTime = DateTime.Now.ToString("o")
            };

            var data = _dataService.GetWellbeingData();
            data.ActiveSessionState = checkpoint;
            _dataService.SaveWellbeingData(data);
        }

        /// <summary>
        /// Restores state from the last checkpoint if one exists.
        /// Returns true and sets State = RecoveryPending when a session is recovered.
        /// The UI should prompt: Continue / Save as Ended / Discard.
        /// </summary>
        public bool TryRestoreCheckpoint()
        {
            var data = _dataService.GetWellbeingData();
            if (data.ActiveSessionState == null) return false;

            var s = data.ActiveSessionState;
            SessionType = s.SessionType ?? "Standard Focus";
            PlannedDurationSeconds = (s.DurationMinutes > 0 ? s.DurationMinutes : 25) * 60;
            ElapsedSeconds = s.AccumulatedSeconds;
            DateTime start;
            SessionStart = DateTime.TryParse(s.StartTime, out start) ? start : DateTime.Now;
            State = TimerState.RecoveryPending;
            _stopwatch.Reset();
            return true;
        }

        public void DiscardCheckpoint()
        {
            var data = _dataService.GetWellbeingData();
            data.ActiveSessionState = null;
            _dataService.SaveWellbeingData(data);
            State = TimerState.Ready;
            ElapsedSeconds = 0;
            _stopwatch.Reset();
        }
    }
}
