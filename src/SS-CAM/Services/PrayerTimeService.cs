using System;
using System.IO;
using System.Net;
using Newtonsoft.Json.Linq;
using SS_CAM.Models;

namespace SS_CAM.Services
{
    /// <summary>
    /// Fetches Malaysian prayer times from the JAKIM e-Solat API via waktusolat.app,
    /// caches the response per zone per day, and computes live prayer state.
    /// </summary>
    public static class PrayerTimeService
    {
        // ── API ───────────────────────────────────────────────────────────────
        private const string ApiBase = "https://api.waktusolat.app/v2/solat/";

        // ── Cache ─────────────────────────────────────────────────────────────
        private static readonly string CacheDir = System.IO.Path.Combine(
            Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData),
            "SS-CAM", "prayertimes");

        // ── Adhan reminder ────────────────────────────────────────────────────
        /// <summary>Raised (on caller thread) when a prayer time is reached.</summary>
        public static event Action<string> AdhanDue;
        private static string _lastAdhanFired = null;
        private static DateTime _lastAdhanDate = DateTime.MinValue;

        // ── Zone catalogue ────────────────────────────────────────────────────
        public static readonly PrayerZoneInfo[] Zones = new[]
        {
            new PrayerZoneInfo { Code = "WLY01", Name = "WLY01 \u2012 Kuala Lumpur / Putrajaya" },
            new PrayerZoneInfo { Code = "WLY02", Name = "WLY02 \u2012 Labuan" },
            new PrayerZoneInfo { Code = "SGR01", Name = "SGR01 \u2012 Gombak, Hulu Langat, Sabak Bernam" },
            new PrayerZoneInfo { Code = "SGR02", Name = "SGR02 \u2012 Petaling, Klang, Sepang, Shah Alam" },
            new PrayerZoneInfo { Code = "SGR03", Name = "SGR03 \u2012 Hulu Selangor, Kuala Selangor" },
            new PrayerZoneInfo { Code = "JHR01", Name = "JHR01 \u2012 Pulau Aur, Pulau Pemanggil" },
            new PrayerZoneInfo { Code = "JHR02", Name = "JHR02 \u2012 Johor Bahru, Kota Tinggi, Mersing" },
            new PrayerZoneInfo { Code = "JHR03", Name = "JHR03 \u2012 Kluang, Pontian" },
            new PrayerZoneInfo { Code = "JHR04", Name = "JHR04 \u2012 Batu Pahat, Muar, Segamat" },
            new PrayerZoneInfo { Code = "KDH01", Name = "KDH01 \u2012 Kota Setar, Kubang Pasu, Pokok Sena" },
            new PrayerZoneInfo { Code = "KDH02", Name = "KDH02 \u2012 Kuala Muda, Yan, Sik" },
            new PrayerZoneInfo { Code = "KDH03", Name = "KDH03 \u2012 Kulim, Bandar Baharu" },
            new PrayerZoneInfo { Code = "KDH04", Name = "KDH04 \u2012 Baling" },
            new PrayerZoneInfo { Code = "KDH05", Name = "KDH05 \u2012 Padang Terap, Sik" },
            new PrayerZoneInfo { Code = "KDH06", Name = "KDH06 \u2012 Langkawi" },
            new PrayerZoneInfo { Code = "KTN01", Name = "KTN01 \u2012 Kota Bharu, Kelantan" },
            new PrayerZoneInfo { Code = "KTN03", Name = "KTN03 \u2012 Jeli, Ulu Kelantan" },
            new PrayerZoneInfo { Code = "MLK01", Name = "MLK01 \u2012 Melaka" },
            new PrayerZoneInfo { Code = "NSN01", Name = "NSN01 \u2012 Jempol, Tampin, Jelebu" },
            new PrayerZoneInfo { Code = "NSN02", Name = "NSN02 \u2012 Seremban, Kuala Pilah, Port Dickson" },
            new PrayerZoneInfo { Code = "PHG01", Name = "PHG01 \u2012 Pekan, Rompin" },
            new PrayerZoneInfo { Code = "PHG02", Name = "PHG02 \u2012 Jerantut, Kuala Lipis" },
            new PrayerZoneInfo { Code = "PHG03", Name = "PHG03 \u2012 Kuantan, Temerloh, Maran" },
            new PrayerZoneInfo { Code = "PNG01", Name = "PNG01 \u2012 Seberang Perai, Daerah Timur Laut, Barat Daya" },
            new PrayerZoneInfo { Code = "PLS01", Name = "PLS01 \u2012 Kangar, Perlis" },
            new PrayerZoneInfo { Code = "PRK01", Name = "PRK01 \u2012 Tapah, Slim River, Tanjung Malim" },
            new PrayerZoneInfo { Code = "PRK02", Name = "PRK02 \u2012 Ipoh, Batu Gajah, Kampar, Sg.Siput" },
            new PrayerZoneInfo { Code = "PRK03", Name = "PRK03 \u2012 Lenggong, Pengkalan Hulu, Gerik" },
            new PrayerZoneInfo { Code = "PRK04", Name = "PRK04 \u2012 Teluk Intan, Bagan Datuk, Seri Iskandar" },
            new PrayerZoneInfo { Code = "SBH01", Name = "SBH01 \u2012 Kota Kinabalu, Putatan, Tuaran, Penampang" },
            new PrayerZoneInfo { Code = "SBH02", Name = "SBH02 \u2012 Ranau, Kota Belud, Kota Marudu" },
            new PrayerZoneInfo { Code = "SBH05", Name = "SBH05 \u2012 Sandakan, Kinabatangan" },
            new PrayerZoneInfo { Code = "SBH06", Name = "SBH06 \u2012 Tawau, Lahad Datu, Semporna, Kunak" },
            new PrayerZoneInfo { Code = "SWK01", Name = "SWK01 \u2012 Kuching, Samarahan, Serian" },
            new PrayerZoneInfo { Code = "SWK02", Name = "SWK02 \u2012 Sri Aman, Sarikei, Betong" },
            new PrayerZoneInfo { Code = "SWK04", Name = "SWK04 \u2012 Sibu, Mukah" },
            new PrayerZoneInfo { Code = "SWK06", Name = "SWK06 \u2012 Miri, Marudi, Subis, Beluru" },
            new PrayerZoneInfo { Code = "SWK07", Name = "SWK07 \u2012 Limbang, Lawas, Sundar, Trusan" },
            new PrayerZoneInfo { Code = "TRG01", Name = "TRG01 \u2012 Kuala Terengganu, Marang" },
            new PrayerZoneInfo { Code = "TRG02", Name = "TRG02 \u2012 Besut, Setiu" },
            new PrayerZoneInfo { Code = "TRG03", Name = "TRG03 \u2012 Hulu Terengganu, Dungun, Kemaman" },
        };

        // ── Public API ────────────────────────────────────────────────────────

        /// <summary>
        /// Returns today's prayer times for the given zone.
        /// Checks local cache first; fetches from JAKIM API if stale.
        /// Returns null if both cache and network fail.
        /// </summary>
        public static PrayerTimeEntry FetchToday(string zone)
        {
            try
            {
                if (!Directory.Exists(CacheDir))
                    Directory.CreateDirectory(CacheDir);

                string today     = DateTime.Today.ToString("yyyy-MM-dd");
                string cacheFile = System.IO.Path.Combine(CacheDir, zone + "-" + today + ".json");

                string json = null;

                if (File.Exists(cacheFile))
                {
                    json = File.ReadAllText(cacheFile);
                }
                else
                {
                    // Delete yesterday's cache for this zone
                    foreach (var old in Directory.GetFiles(CacheDir, zone + "-*.json"))
                    {
                        try { File.Delete(old); } catch { }
                    }

                    string url = ApiBase + zone + "?period=today";
                    var req = (HttpWebRequest)WebRequest.Create(url);
                    req.Timeout = 9000;
                    req.Method = "GET";
                    req.Accept = "application/json";
                    req.UserAgent = "SS-CAM/2.6.0";
                    ServicePointManager.SecurityProtocol = SecurityProtocolType.Tls12;

                    using (var resp = (HttpWebResponse)req.GetResponse())
                    using (var reader = new StreamReader(resp.GetResponseStream()))
                    {
                        json = reader.ReadToEnd();
                    }

                    File.WriteAllText(cacheFile, json);
                }

                return ParseEntry(zone, json);
            }
            catch
            {
                return null;
            }
        }

        /// <summary>Computes real-time prayer state from a loaded entry.</summary>
        public static PrayerState ComputeState(PrayerTimeEntry entry)
        {
            if (entry == null) return null;

            DateTime now = DateTime.Now;

            var prayers = new[]
            {
                new { Name = "Subuh",   Time = entry.Subuh   },
                new { Name = "Syuruk",  Time = entry.Syuruk  },
                new { Name = "Zohor",   Time = entry.Zohor   },
                new { Name = "Asar",    Time = entry.Asar    },
                new { Name = "Maghrib", Time = entry.Maghrib },
                new { Name = "Isyak",   Time = entry.Isyak   },
            };

            // Find next prayer
            int nextIdx = -1;
            for (int i = 0; i < prayers.Length; i++)
            {
                if (now < prayers[i].Time) { nextIdx = i; break; }
            }

            var state = new PrayerState();

            if (nextIdx < 0)
            {
                // Past Isyak
                state.CurrentPrayer    = "Isyak";
                state.CurrentPrayerKey = "Isyak";
                state.NextPrayer       = "Subuh (Esok)";
                state.NextPrayerTime   = entry.Subuh.AddDays(1);
                state.TimeRemaining    = state.NextPrayerTime - now;
                var total = state.NextPrayerTime - entry.Isyak;
                var elapsed = now - entry.Isyak;
                state.ProgressPercent  = total.TotalSeconds > 0
                    ? Math.Min(100, elapsed.TotalSeconds / total.TotalSeconds * 100) : 0;
            }
            else if (nextIdx == 0)
            {
                // Before Subuh
                state.CurrentPrayer    = "Isyak (Semalam)";
                state.CurrentPrayerKey = "";
                state.NextPrayer       = "Subuh";
                state.NextPrayerTime   = entry.Subuh;
                state.TimeRemaining    = entry.Subuh - now;
                var total   = entry.Subuh - DateTime.Today;
                var elapsed = now - DateTime.Today;
                state.ProgressPercent = total.TotalSeconds > 0
                    ? Math.Min(100, elapsed.TotalSeconds / total.TotalSeconds * 100) : 0;
            }
            else
            {
                state.NextPrayer       = prayers[nextIdx].Name;
                state.NextPrayerTime   = prayers[nextIdx].Time;
                state.CurrentPrayer    = prayers[nextIdx - 1].Name;
                state.CurrentPrayerKey = prayers[nextIdx - 1].Name;
                state.TimeRemaining    = state.NextPrayerTime - now;
                var last    = prayers[nextIdx - 1].Time;
                var total   = state.NextPrayerTime - last;
                var elapsed = now - last;
                state.ProgressPercent = total.TotalSeconds > 0
                    ? Math.Min(100, elapsed.TotalSeconds / total.TotalSeconds * 100) : 0;
            }

            // Adhan alert window: within 45 seconds of any prayer
            state.IsPrayerTime = false;
            foreach (var p in prayers)
            {
                double diff = Math.Abs((now - p.Time).TotalSeconds);
                if (diff <= 45)
                {
                    state.IsPrayerTime = true;
                    FireAdhanIfNeeded(p.Name);
                    break;
                }
            }

            return state;
        }

        // ── Private helpers ───────────────────────────────────────────────────

        private static PrayerTimeEntry ParseEntry(string zone, string json)
        {
            try
            {
                var jObj = JObject.Parse(json);
                var arr  = jObj["prayerTime"] as JArray;
                if (arr == null || arr.Count == 0) return null;
                var item = arr[0];

                string dateStr = item["date"]  != null ? item["date"].ToString()  : DateTime.Today.ToString("dd-MM-yyyy");
                string hijri   = item["hijri"] != null ? item["hijri"].ToString() : "";
                string day     = item["day"]   != null ? item["day"].ToString()   : "";

                var e = new PrayerTimeEntry
                {
                    Zone    = zone,
                    Date    = dateStr,
                    Hijri   = hijri,
                    Day     = day,
                    Imsak   = ParseTime(dateStr, item["imsak"]),
                    Subuh   = ParseTime(dateStr, item["fajr"]),
                    Syuruk  = ParseTime(dateStr, item["syuruk"]),
                    Zohor   = ParseTime(dateStr, item["dhuhr"]),
                    Asar    = ParseTime(dateStr, item["asr"]),
                    Maghrib = ParseTime(dateStr, item["maghrib"]),
                    Isyak   = ParseTime(dateStr, item["isha"]),
                };
                return e;
            }
            catch { return null; }
        }

        private static DateTime ParseTime(string dateStr, JToken token)
        {
            if (token == null) return DateTime.MinValue;
            try
            {
                // dateStr = "10-08-2026"
                var dp = dateStr.Split('-');
                int d = int.Parse(dp[0]), m = int.Parse(dp[1]), y = int.Parse(dp[2]);
                var tp = token.ToString().Split(':');
                int h = int.Parse(tp[0]), min = int.Parse(tp[1]);
                return new DateTime(y, m, d, h, min, 0);
            }
            catch { return DateTime.MinValue; }
        }

        private static void FireAdhanIfNeeded(string prayerName)
        {
            if (_lastAdhanDate == DateTime.Today && _lastAdhanFired == prayerName) return;
            _lastAdhanDate = DateTime.Today;
            _lastAdhanFired = prayerName;
            if (AdhanDue != null) AdhanDue(prayerName);
        }
    }
}
