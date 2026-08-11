using System;
using System.IO;
using System.Net;
using Newtonsoft.Json.Linq;
using SS_CAM.Models;
using SS_CAM.Utilities;

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
            AppPaths.AppDataFolder, "prayertimes");

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
                    foreach (var old in Directory.GetFiles(CacheDir, zone + "-*.json"))
                    {
                        try { File.Delete(old); } catch (Exception ex) { System.Diagnostics.Debug.WriteLine(ex); }
                    }

                    string url = ApiBase + zone + "?period=today";
                    ServicePointManager.SecurityProtocol = SecurityProtocolType.Tls12 | (SecurityProtocolType)768 | (SecurityProtocolType)192;
                    var req = (HttpWebRequest)WebRequest.Create(url);
                    req.Timeout = 9000;
                    req.Method = "GET";
                    req.Accept = "application/json";
                    req.UserAgent = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36";

                    using (var resp = (HttpWebResponse)req.GetResponse())
                    using (var reader = new StreamReader(resp.GetResponseStream()))
                    {
                        json = reader.ReadToEnd();
                    }

                    File.WriteAllText(cacheFile, json);
                }

                var entry = ParseEntry(zone, json);
                if (entry == null && File.Exists(cacheFile))
                {
                    try { File.Delete(cacheFile); } catch (Exception ex) { System.Diagnostics.Debug.WriteLine(ex); }
                }
                return entry;
            }
            catch (Exception ex) { File.WriteAllText(System.IO.Path.Combine(CacheDir, "error.log"), ex.ToString()); return null; }
        }

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

            int nextIdx = -1;
            for (int i = 0; i < prayers.Length; i++)
            {
                if (now < prayers[i].Time) { nextIdx = i; break; }
            }

            var state = new PrayerState();

            if (nextIdx < 0)
            {
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

        private static PrayerTimeEntry ParseEntry(string zone, string json)
        {
            try
            {
                var jObj = JObject.Parse(json);
                var arr = (jObj["prayers"] ?? jObj["prayerTime"]) as JArray;
                if (arr == null || arr.Count == 0) return null;

                int todayDay = DateTime.Today.Day;
                JToken item = null;
                foreach (var tok in arr)
                {
                    if (tok["day"] != null)
                    {
                        int d;
                        if (int.TryParse(tok["day"].ToString(), out d) && d == todayDay)
                        {
                            item = tok;
                            break;
                        }
                    }
                }
                if (item == null) item = arr[0];

                string hijri = item["hijri"] != null ? item["hijri"].ToString() : "";
                string day = item["day"] != null ? item["day"].ToString() : "";
                string dateStr = DateTime.Today.ToString("dd-MM-yyyy");

                var e = new PrayerTimeEntry
                {
                    Zone = zone,
                    Date = dateStr,
                    Hijri = hijri,
                    Day = day,
                    Imsak = ParseTime(item["imsak"]),
                    Subuh = ParseTime(item["fajr"]),
                    Syuruk = ParseTime(item["syuruk"]),
                    Zohor = ParseTime(item["dhuhr"]),
                    Asar = ParseTime(item["asr"]),
                    Maghrib = ParseTime(item["maghrib"]),
                    Isyak = ParseTime(item["isha"]),
                };
                return e;
            }
            catch (Exception ex) { File.WriteAllText(System.IO.Path.Combine(CacheDir, "error.log"), ex.ToString()); return null; }
        }

        private static DateTime ParseTime(JToken token)
        {
            if (token == null) return DateTime.MinValue;
            try
            {
                long seconds;
                if (long.TryParse(token.ToString(), out seconds))
                {
                    DateTime epoch = new DateTime(1970, 1, 1, 0, 0, 0, DateTimeKind.Utc);
                    return epoch.AddSeconds(seconds).ToLocalTime();
                }
                return DateTime.MinValue;
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

