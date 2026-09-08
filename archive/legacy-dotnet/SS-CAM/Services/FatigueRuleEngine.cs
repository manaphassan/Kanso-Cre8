using System;
using System.Collections.Generic;
using System.Linq;
using SS_CAM.Models;
using SS_CAM.Services;

namespace SS_CAM.Services
{
    /// <summary>
    /// Fatigue rule engine — analyses recent check-ins and session history
    /// to surface actionable, private recommendations.
    /// No cloud, no telemetry, no employee monitoring.
    /// </summary>
    public class FatigueRuleEngine
    {
        public enum RecommendationType { Action, Alert, Fatigue }

        public class Recommendation
        {
            public RecommendationType Type { get; set; }
            public int Level { get; set; }        // 1-3 for Fatigue, 0 for others
            public string Message { get; set; }
        }

        private readonly WellbeingDataService _dataService;

        public FatigueRuleEngine(WellbeingDataService dataService)
        {
            _dataService = dataService;
        }

        /// <summary>Analyses the local wellbeing store and returns recommendations.</summary>
        public List<Recommendation> Evaluate()
        {
            var results = new List<Recommendation>();
            var data = _dataService.GetWellbeingData();

            EvaluateCheckIns(data, results);
            EvaluateContinuousWork(data, results);

            return results;
        }

        // ── Rule Group 1: Recent check-in signals ────────────────────────
        private void EvaluateCheckIns(WellbeingData data, List<Recommendation> results)
        {
            if (data.CheckIns == null || data.CheckIns.Count == 0) return;

            var recent = data.CheckIns
                .OrderByDescending(c => c.Timestamp)
                .Take(2)
                .ToList();

            if (recent.Count >= 1)
            {
                var last = recent[0];
                int energy = last.EnergyScore;
                int pressure = last.PressureScore;
                int mood = last.MoodScore;

                if (energy <= 2 && pressure >= 4)
                    results.Add(new Recommendation { Type = RecommendationType.Action, Message = "A breathing reset is suggested before starting a Gentle Focus." });
                else if (energy <= 2)
                    results.Add(new Recommendation { Type = RecommendationType.Action, Message = "A gentler start may be easier today. Try a 15-minute focus session." });
                else if (pressure >= 4)
                    results.Add(new Recommendation { Type = RecommendationType.Action, Message = "Pressure is high. Consider defining one achievable outcome." });
                else if (energy >= 4 && pressure <= 3)
                    results.Add(new Recommendation { Type = RecommendationType.Action, Message = "You have good energy. Consider a Deep Flow session." });
                else if (mood >= 4 && energy >= 4)
                    results.Add(new Recommendation { Type = RecommendationType.Action, Message = "You're inspired and energised. Ready for a Deep Flow?" });
            }

            // Pattern: 2 consecutive low energy
            if (recent.Count >= 2 && recent[0].EnergyScore <= 2 && recent[1].EnergyScore <= 2)
                results.Add(new Recommendation { Type = RecommendationType.Alert, Message = "Low energy pattern noticed. Recommend shorter sessions for the rest of the day." });

            // Pattern: 2 consecutive high pressure
            if (recent.Count >= 2 && recent[0].PressureScore >= 4 && recent[1].PressureScore >= 4)
                results.Add(new Recommendation { Type = RecommendationType.Alert, Message = "High pressure pattern noticed. Consider breathing, Mind Drop, or a one-outcome session." });
        }

        // ── Rule Group 2: Continuous work without a meaningful break ─────
        private void EvaluateContinuousWork(WellbeingData data, List<Recommendation> results)
        {
            if (data.FocusSessions == null || data.FocusSessions.Count == 0) return;

            var today = DateTime.Now.ToString("yyyy-MM-dd");
            var todaySessions = data.FocusSessions
                .Where(s => s.StartTime != null && s.StartTime.StartsWith(today))
                .OrderBy(s => s.StartTime)
                .ToList();

            if (todaySessions.Count == 0) return;

            // Check the gap since the last session ended
            var last = todaySessions[todaySessions.Count - 1];
            if (string.IsNullOrEmpty(last.EndTime)) return;

            DateTime lastEnd;
            if (!DateTime.TryParse(last.EndTime, out lastEnd)) return;

            double gapSeconds = (DateTime.Now - lastEnd).TotalSeconds;
            int continuousWorkSeconds = 0;

            if (gapSeconds > 180)
            {
                // They took a break after the last session — no continuous fatigue to report
                continuousWorkSeconds = 0;
            }
            else
            {
                // Sum all actual focus seconds today
                foreach (var s in todaySessions)
                    continuousWorkSeconds += s.ActualSeconds;
            }

            if (continuousWorkSeconds >= 7200)
                results.Add(new Recommendation { Type = RecommendationType.Fatigue, Level = 3, Message = "You have been focused for over 2 hours without a break. Please consider resting." });
            else if (continuousWorkSeconds >= 5400)
                results.Add(new Recommendation { Type = RecommendationType.Fatigue, Level = 2, Message = "You have been working for a long time. Time for a 5-minute break?" });
            else if (continuousWorkSeconds >= 3000)
                results.Add(new Recommendation { Type = RecommendationType.Fatigue, Level = 1, Message = "You have been focused for a while. A one-minute visual reset is available whenever you are ready." });
        }
    }
}
