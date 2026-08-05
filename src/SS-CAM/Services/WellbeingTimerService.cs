using System;
using System.Diagnostics;
using System.Runtime.InteropServices;
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
        // ── P/Invoke for idle detection ──────────────────────────────────
        [StructLayout(LayoutKind.Sequential)]
        private struct LASTINPUTINFO
        {
            public uint cbSize;
            public uint dwTime;
        }

        [DllImport("user32.dll")]
        private static extern bool GetLastInputInfo(ref LASTINPUTINFO plii);

        // ── State ────────────────────────────────────────────────────────
        public enum TimerState { Ready, Running, Paused, Completed, RecoveryPending }

        public TimerState State { get; private set; }
        public string SessionType { get; private set; }
        public int PlannedDurationSeconds { get; private set; }
        public int ElapsedSeconds { get; private set; }
        public DateTime SessionStart { get; private set; }

        private readonly Stopwatch _stopwatch;
        private readonly WellbeingDataService _dataService;

        // Idle auto-pause threshold (3 minutes of no input)
        private const int IdleAutoPauseThresholdSeconds = 180;

        public WellbeingTimerService(WellbeingDataService dataService)
        {
            _dataService = dataService;
            _stopwatch = new Stopwatch();
            State = TimerState.Ready;
            SessionType = "Standard Focus";
        }

        // ── Idle detection ───────────────────────────────────────────────
        public int GetIdleSeconds()
        {
            try
            {
                var lii = new LASTINPUTINFO();
                lii.cbSize = (uint)Marshal.SizeOf(lii);
                if (!GetLastInputInfo(ref lii)) return 0;
                uint idleMs = (uint)Environment.TickCount - lii.dwTime;
                return (int)(idleMs / 1000u);
            }
            catch
            {
                return 0;
            }
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

        /// <summary>Returns remaining time as "MM:SS" string for UI display.</summary>
        public string GetFormattedRemaining()
        {
            if (State == TimerState.Ready) return string.Empty;
            int elapsed = ElapsedSeconds;
            if (State == TimerState.Running)
                elapsed += (int)_stopwatch.Elapsed.TotalSeconds;
            int remaining = PlannedDurationSeconds - elapsed;
            if (remaining < 0) remaining = 0;
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
