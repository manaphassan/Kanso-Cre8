using System;
using System.Collections.Generic;
using System.IO;
using System.Net;
using System.Net.Http;
using System.Threading.Tasks;
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

        private static readonly HttpClient _httpClient = new HttpClient { Timeout = TimeSpan.FromSeconds(9) };

        // ── Public API ────────────────────────────────────────────────────────

        public static PrayerTimeEntry FetchToday(string zone)
        {
            return Task.Run(() => FetchTodayAsync(zone)).GetAwaiter().GetResult();
        }

        public static async Task<PrayerTimeEntry> FetchTodayAsync(string zone)
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

                    using (var req = new HttpRequestMessage(HttpMethod.Get, url))
                    {
                        req.Headers.UserAgent.ParseAdd("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36");
                        req.Headers.Accept.ParseAdd("application/json");

                        var resp = await _httpClient.SendAsync(req).ConfigureAwait(false);
                        if (resp.IsSuccessStatusCode)
                        {
                            json = await resp.Content.ReadAsStringAsync().ConfigureAwait(false);
                            File.WriteAllText(cacheFile, json);
                        }
                    }
                }

                var entry = ParseEntry(zone, json);
                if (entry == null && File.Exists(cacheFile))
                {
                    try { File.Delete(cacheFile); } catch (Exception ex) { System.Diagnostics.Debug.WriteLine(ex); }
                }
                return entry;
            }
            catch (Exception ex)
            {
                try { File.WriteAllText(System.IO.Path.Combine(CacheDir, "error.log"), ex.ToString()); } catch (Exception logEx) { System.Diagnostics.Debug.WriteLine("[PrayerTimeService] Write error log: " + logEx.Message); }
                return null;
            }
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
            catch (Exception ex) { System.Diagnostics.Debug.WriteLine("[PrayerTimeService] ParseTime: " + ex.Message); return DateTime.MinValue; }
        }

        private static void FireAdhanIfNeeded(string prayerName)
        {
            if (_lastAdhanDate == DateTime.Today && _lastAdhanFired == prayerName) return;
            _lastAdhanDate = DateTime.Today;
            _lastAdhanFired = prayerName;
            if (AdhanDue != null) AdhanDue(prayerName);
        }

        // ── Islamic Events Engine ──────────────────────────────────────────────
        public static List<IslamicEvent> GetIslamicEvents()
        {
            var list = new List<IslamicEvent>();
            DateTime today = DateTime.Today;

            var events = new[]
            {
                new { Name = "Awal Muharram (Maal Hijrah)", Month = 6, Day = 16, Cat = "Awal Tahun Hijrah", IsHol = true },
                new { Name = "Maulidur Rasul SAW", Month = 8, Day = 25, Cat = "Hari Keputeraan Nabi", IsHol = true },
                new { Name = "Israk & Mikraj", Month = 1, Day = 16, Cat = "Peristiwa Sejarah", IsHol = false },
                new { Name = "Nisfu Syaaban", Month = 2, Day = 2, Cat = "Malam Berkat", IsHol = false },
                new { Name = "Awal Ramadan 1448H", Month = 2, Day = 17, Cat = "Ibadah Puasa", IsHol = true },
                new { Name = "Nuzul Al-Quran", Month = 3, Day = 5, Cat = "Penurunan Al-Quran", IsHol = true },
                new { Name = "Hari Raya Aidilfitri", Month = 3, Day = 20, Cat = "Perayaan Utama", IsHol = true },
                new { Name = "Hari Arafah", Month = 5, Day = 26, Cat = "Hari Kemuncak Haji", IsHol = false },
                new { Name = "Hari Raya Aidiladha", Month = 5, Day = 27, Cat = "Ibadah Korban", IsHol = true }
            };

            foreach (var ev in events)
            {
                DateTime evDate = new DateTime(today.Year, ev.Month, ev.Day);
                if (evDate < today) evDate = evDate.AddYears(1);

                int diff = (evDate - today).Days;
                list.Add(new IslamicEvent
                {
                    Name = ev.Name,
                    GregorianDate = evDate.ToString("d MMMM yyyy", new System.Globalization.CultureInfo("ms-MY")),
                    DaysRemaining = diff,
                    Category = ev.Cat,
                    IsHoliday = ev.IsHol
                });
            }

            list.Sort((a, b) => a.DaysRemaining.CompareTo(b.DaysRemaining));
            return list;
        }

        // ── Daily Hadith Collection ───────────────────────────────────────────
        public static List<HadithEntry> GetCuratedHadiths()
        {
            return new List<HadithEntry>
            {
                new HadithEntry
                {
                    Id = 1,
                    Title = "Niat & Keikhlasan Dalam Pekerjaan",
                    ArabicText = "\u0625\u0650\u0646\u0651\u064E\u0645\u064E\u0627 \u0627\u0644\u0623\u064E\u0639\u0651\u0645\u064E\u0627\u0644\u064F \u0628\u0650\u0627\u0644\u0646\u0651\u0650\u064A\u0651\u064E\u0627\u062A\u0650\u060C \u0648\u064E\u0625\u0650\u0646\u0651\u064E\u0645\u064E\u0627 \u0644\u0650\u064B\u0643\u064F\u0644\u0651\u0650 \u0627\u0645\u0651\u0631\u0650\u0626\u064D \u0645\u064E\u0627 \u0646\u064E\u0648\u064E\u0649",
                    MalayTranslation = "Sesungguhnya setiap amalan itu bergantung kepada niat, dan sesungguhnya setiap orang hanya akan mendapat apa yang diniatkannya.",
                    Source = "Sahih al-Bukhari #1 \u00B7 Hadis Arba'in #1",
                    Theme = "Niat & Keikhlasan"
                },
                new HadithEntry
                {
                    Id = 2,
                    Title = "Kecemerlangan & Ihsan Dalam Kerja",
                    ArabicText = "\u0625\u0650\u0646\u0651\u064E \u0627\u0644\u0644\u0651\u064E\u0647\u064E \u0643\u064E\u062A\u064E\u0628\u064E \u0627\u0644\u0625\u0650\u062D\u0651\u0633\u064E\u0627\u0646\u064E \u0639\u064E\u0644\u064E\u0649 \u0643\u064F\u0644\u0651\u0650 \u0634\u064E\u064A\u0651\u0621\u064D",
                    MalayTranslation = "Sesungguhnya Allah telah mewajibkan Ihsan (kebaikan & kecemerlangan) dalam setiap perkara.",
                    Source = "Sahih Muslim #1955",
                    Theme = "Work Ethics & Ihsan"
                },
                new HadithEntry
                {
                    Id = 3,
                    Title = "Menjaga Masa & Kesempatan",
                    ArabicText = "\u0646\u0650\u0639\u0651\u0645\u064E\u062A\u064E\u0627\u0646\u0650 \u0645\u064E\u063A\u0651\u0628\u064F\u0648\u0646\u064C \u0641\u0650\u064A\u0647\u0650\u0645\u064E\u0627 \u0643\u064E\u062B\u0650\u064A\u0631\u064C \u0645\u0650\u0646\u064E \u0627\u0644\u0646\u0651\u064E\u0627\u0633\u0650: \u0627\u0644\u0635\u0651\u0650\u062D\u0651\u064E\u0629\u064F \u0648\u064E\u0627\u0644\u0651\u0641\u064E\u0631\u064E\u0627\u063A\u064F",
                    MalayTranslation = "Dua nikmat yang ramai manusia terpedaya dengannya: Kesihatan dan masa lapang.",
                    Source = "Sahih al-Bukhari #6412",
                    Theme = "Pengurusan Masa"
                },
                new HadithEntry
                {
                    Id = 4,
                    Title = "Memberi Manfaat Kepada Manusia",
                    ArabicText = "\u062E\u064E\u064A\u0651\u0631\u064F \u0627\u0644\u0646\u0651\u064E\u0627\u0633\u0650 \u0625\u064E\u0646\u0651\u0641\u064E\u0639\u064F\u0647\u064F\u0645\u0651 \u0644\u0650\u0644\u0646\u0651\u064E\u0627\u0633\u0650",
                    MalayTranslation = "Sebaik-baik manusia adalah orang yang paling bermanfaat kepada manusia yang lain.",
                    Source = "Al-Mu'jam al-Awsat Al-Tabarani #5787",
                    Theme = "Manfaat Bersama"
                },
                new HadithEntry
                {
                    Id = 5,
                    Title = "Ketekunan Dalam Beramal",
                    ArabicText = "\u0623\u064E\u062D\u064E\u0628\u0651\u064F \u0627\u0644\u0623\u064E\u0639\u0651\u0645\u064E\u0627\u0644\u0650 \u0625\u0650\u0644\u064E\u0649 \u0627\u0644\u0644\u0651\u064E\u0647\u0650 \u0623\u064E\u062F\u0651\u0648\u064E\u0645\u064F\u0647\u064E\u0627 \u0648\u064E\u0625\u0650\u0646\u0651 \u0642\u064E\u0644\u0651\u064E",
                    MalayTranslation = "Amalan yang paling dicintai oleh Allah adalah amalan yang berterusan (istiqamah) walaupun sedikit.",
                    Source = "Sahih al-Bukhari #6465",
                    Theme = "Istiqamah"
                }
            };
        }

        // ── Sun Path Solar Trajectory ──────────────────────────────────────────
        public static SunPhaseInfo ComputeSunPhase(PrayerTimeEntry entry)
        {
            if (entry == null)
            {
                return new SunPhaseInfo
                {
                    PhaseName = "Memuatkan...",
                    SunProgressRatio = 0.5,
                    GradientStartColor = "#0284C7",
                    GradientEndColor = "#38BDF8",
                    IconGlyph = "\uE706"
                };
            }

            DateTime now = DateTime.Now;

            DateTime subuh   = entry.Subuh;
            DateTime syuruk  = entry.Syuruk;
            DateTime zohor   = entry.Zohor;
            DateTime asar    = entry.Asar;
            DateTime maghrib = entry.Maghrib;
            DateTime isyak   = entry.Isyak;

            if (now >= subuh && now < syuruk)
            {
                double ratio = Math.Min(1.0, Math.Max(0.0, (now - subuh).TotalMinutes / Math.Max(1, (syuruk - subuh).TotalMinutes)));
                return new SunPhaseInfo
                {
                    PhaseName = "Fajr / Subuh & Terbit Matahari",
                    SunProgressRatio = 0.05 + (ratio * 0.15),
                    GradientStartColor = "#0F172A",
                    GradientEndColor = "#D97706",
                    IconGlyph = "\uE706"
                };
            }
            else if (now >= syuruk && now < zohor)
            {
                double ratio = Math.Min(1.0, Math.Max(0.0, (now - syuruk).TotalMinutes / Math.Max(1, (zohor - syuruk).TotalMinutes)));
                return new SunPhaseInfo
                {
                    PhaseName = "Pagi / Dhuha",
                    SunProgressRatio = 0.20 + (ratio * 0.30),
                    GradientStartColor = "#0284C7",
                    GradientEndColor = "#38BDF8",
                    IconGlyph = "\uE706"
                };
            }
            else if (now >= zohor && now < asar)
            {
                double ratio = Math.Min(1.0, Math.Max(0.0, (now - zohor).TotalMinutes / Math.Max(1, (asar - zohor).TotalMinutes)));
                return new SunPhaseInfo
                {
                    PhaseName = "Tengah Hari / Zohor",
                    SunProgressRatio = 0.50 + (ratio * 0.20),
                    GradientStartColor = "#0369A1",
                    GradientEndColor = "#0EA5E9",
                    IconGlyph = "\uE706"
                };
            }
            else if (now >= asar && now < maghrib)
            {
                double ratio = Math.Min(1.0, Math.Max(0.0, (now - asar).TotalMinutes / Math.Max(1, (maghrib - asar).TotalMinutes)));
                return new SunPhaseInfo
                {
                    PhaseName = "Petang / Asar",
                    SunProgressRatio = 0.70 + (ratio * 0.18),
                    GradientStartColor = "#D97706",
                    GradientEndColor = "#F59E0B",
                    IconGlyph = "\uE706"
                };
            }
            else if (now >= maghrib && now < isyak)
            {
                double ratio = Math.Min(1.0, Math.Max(0.0, (now - maghrib).TotalMinutes / Math.Max(1, (isyak - maghrib).TotalMinutes)));
                return new SunPhaseInfo
                {
                    PhaseName = "Senja / Maghrib",
                    SunProgressRatio = 0.88 + (ratio * 0.07),
                    GradientStartColor = "#7C3AED",
                    GradientEndColor = "#E11D48",
                    IconGlyph = "\uE708"
                };
            }
            else
            {
                return new SunPhaseInfo
                {
                    PhaseName = "Malam / Isyak",
                    SunProgressRatio = 0.98,
                    GradientStartColor = "#090D16",
                    GradientEndColor = "#1E1B4B",
                    IconGlyph = "\uE708"
                };
            }
        }
    }
}

