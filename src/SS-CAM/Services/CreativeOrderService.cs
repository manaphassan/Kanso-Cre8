using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Globalization;
using System.IO;
using System.Linq;
using System.Net.Http;
using System.Text;
using System.Text.RegularExpressions;
using System.Threading.Tasks;
using Newtonsoft.Json;
using SS_CAM.Models;

namespace SS_CAM.Services
{
    /// <summary>
    /// Service for loading, managing, and converting Creative Order Requests into
    /// official SS-CAM Projects on the Synology NAS / Local Workspace.
    /// Integrates seamlessly with Web Portal, Android Companion App, and Desktop.
    /// </summary>
    public static class CreativeOrderService
    {
        private static readonly object _fileLock = new object();
        private static readonly HttpClient _httpClient;
        private static string _cachedJwtToken = null;
        private static DateTime _tokenExpiry = DateTime.MinValue;
        private const string DefaultApiBaseUrl = "https://creative.suamisihat.myds.me/";

        static CreativeOrderService()
        {
            try
            {
                System.Net.ServicePointManager.SecurityProtocol |= System.Net.SecurityProtocolType.Tls12;
                System.Net.ServicePointManager.ServerCertificateValidationCallback = (sender, certificate, chain, sslPolicyErrors) => true;
            }
            catch (Exception ex)
            {
                Debug.WriteLine("[CreativeOrderService] SSL config warning: " + ex.Message);
            }

            var handler = new HttpClientHandler();
            _httpClient = new HttpClient(handler) { Timeout = TimeSpan.FromSeconds(6) };
        }

        private class OrdersApiResponse
        {
            [JsonProperty("success")]
            public bool Success { get; set; }

            [JsonProperty("orders")]
            public List<CreativeOrder> Orders { get; set; }
        }

        /// <summary>
        /// Resolves the canonical file path for the creative orders ledger file.
        /// Primary location: &lt;workspaceRoot&gt;\_Team\Orders\creative-orders.jsonl
        /// </summary>
        public static string GetOrdersFilePath(string workspaceRoot)
        {
            if (!string.IsNullOrWhiteSpace(workspaceRoot) && Directory.Exists(workspaceRoot))
            {
                string ordersDir = Path.Combine(workspaceRoot, "_Team", "Orders");
                try
                {
                    if (!Directory.Exists(ordersDir))
                    {
                        Directory.CreateDirectory(ordersDir);
                    }
                    return Path.Combine(ordersDir, "creative-orders.jsonl");
                }
                catch (Exception ex)
                {
                    Debug.WriteLine("[CreativeOrderService] GetOrdersFilePath workspace mkdir failed: " + ex.Message);
                }
            }

            // Fallback 1: Local AppData
            string appDataDir = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData), "SS-CAM", "Orders");
            try
            {
                if (!Directory.Exists(appDataDir))
                {
                    Directory.CreateDirectory(appDataDir);
                }
                return Path.Combine(appDataDir, "creative-orders.jsonl");
            }
            catch (Exception ex)
            {
                Debug.WriteLine("[CreativeOrderService] GetOrdersFilePath appdata mkdir failed: " + ex.Message);
                return Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "creative-orders.jsonl");
            }
        }

        private static async Task<string> GetAuthTokenAsync(string username)
        {
            if (!string.IsNullOrEmpty(_cachedJwtToken) && DateTime.UtcNow < _tokenExpiry)
            {
                return _cachedJwtToken;
            }

            try
            {
                string uname = !string.IsNullOrWhiteSpace(username) ? username.Trim() : "harussani";
                var payload = new { username = uname };
                string json = JsonConvert.SerializeObject(payload);

                using (var content = new StringContent(json, Encoding.UTF8, "application/json"))
                {
                    var res = await _httpClient.PostAsync(DefaultApiBaseUrl + "api/auth/login", content).ConfigureAwait(false);
                    if (res.IsSuccessStatusCode)
                    {
                        string body = await res.Content.ReadAsStringAsync().ConfigureAwait(false);
                        var dict = JsonConvert.DeserializeObject<Dictionary<string, object>>(body);
                        if (dict != null && dict.ContainsKey("token") && dict["token"] != null)
                        {
                            _cachedJwtToken = dict["token"].ToString();
                            _tokenExpiry = DateTime.UtcNow.AddHours(12);
                            return _cachedJwtToken;
                        }
                    }
                }
            }
            catch (Exception ex)
            {
                Debug.WriteLine("[CreativeOrderService] GetAuthTokenAsync error: " + ex.Message);
            }

            return null;
        }

        public static async Task<List<CreativeOrder>> FetchOrdersFromApiAsync(string username = null)
        {
            try
            {
                string token = await GetAuthTokenAsync(username).ConfigureAwait(false);
                if (string.IsNullOrEmpty(token)) return null;

                using (var req = new HttpRequestMessage(HttpMethod.Get, DefaultApiBaseUrl + "api/orders"))
                {
                    req.Headers.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", token);
                    var res = await _httpClient.SendAsync(req).ConfigureAwait(false);
                    if (res.IsSuccessStatusCode)
                    {
                        string json = await res.Content.ReadAsStringAsync().ConfigureAwait(false);
                        var apiRes = JsonConvert.DeserializeObject<OrdersApiResponse>(json);
                        if (apiRes != null && apiRes.Success && apiRes.Orders != null)
                        {
                            return apiRes.Orders;
                        }
                    }
                }
            }
            catch (Exception ex)
            {
                Debug.WriteLine("[CreativeOrderService] FetchOrdersFromApiAsync error: " + ex.Message);
            }

            return null;
        }

        /// <summary>
        /// Loads orders from local NAS ledger file with fallbacks.
        /// </summary>
        public static async Task<List<CreativeOrder>> LoadOrdersFromDiskAsync(string workspaceRoot)
        {
            return await Task.Run(() =>
            {
                List<CreativeOrder> orders = new List<CreativeOrder>();
                string filePath = GetOrdersFilePath(workspaceRoot);

                lock (_fileLock)
                {
                    try
                    {
                        if (File.Exists(filePath))
                        {
                            using (FileStream fs = new FileStream(filePath, FileMode.Open, FileAccess.Read, FileShare.ReadWrite))
                            using (StreamReader reader = new StreamReader(fs, Encoding.UTF8))
                            {
                                string line;
                                while ((line = reader.ReadLine()) != null)
                                {
                                    if (string.IsNullOrWhiteSpace(line)) continue;
                                    try
                                    {
                                        CreativeOrder order = JsonConvert.DeserializeObject<CreativeOrder>(line);
                                        if (order != null)
                                        {
                                            orders.Add(order);
                                        }
                                    }
                                    catch (Exception parseEx)
                                    {
                                        Debug.WriteLine("[CreativeOrderService] JSON line parse error: " + parseEx.Message);
                                    }
                                }
                            }
                        }
                    }
                    catch (Exception ex)
                    {
                        Debug.WriteLine("[CreativeOrderService] LoadOrdersFromDiskAsync error: " + ex.Message);
                    }
                }

                // If still empty, return seed default orders
                if (orders.Count == 0)
                {
                    orders = GetInitialSeedOrders();
                    SaveOrdersInternal(filePath, orders);
                }

                return orders.OrderByDescending(o => o.SubmittedAt).ToList();
            });
        }

        /// <summary>
        /// Asynchronously loads all creative orders. Attempts live synchronization with Web Portal / Cloud API,
        /// falling back to the local Synology NAS ledger file if offline.
        /// </summary>
        public static async Task<List<CreativeOrder>> LoadOrdersAsync(string workspaceRoot, string designerUsername = null)
        {
            // 1. Attempt live API synchronization with Web Portal / Android backend
            try
            {
                var liveOrders = await FetchOrdersFromApiAsync(designerUsername).ConfigureAwait(false);
                if (liveOrders != null && liveOrders.Count > 0)
                {
                    // Cache to local NAS ledger file for offline resilience and local tool integration
                    string filePath = GetOrdersFilePath(workspaceRoot);
                    SaveOrdersInternal(filePath, liveOrders);
                    return liveOrders.OrderByDescending(o => o.SubmittedAt).ToList();
                }
            }
            catch (Exception ex)
            {
                Debug.WriteLine("[CreativeOrderService] Live API fetch failed, falling back to disk: " + ex.Message);
            }

            // 2. Fallback to local NAS ledger
            return await LoadOrdersFromDiskAsync(workspaceRoot).ConfigureAwait(false);
        }

        /// <summary>
        /// Saves all creative orders back to the ledger file atomically.
        /// </summary>
        public static async Task SaveOrdersAsync(string workspaceRoot, List<CreativeOrder> orders)
        {
            await Task.Run(() =>
            {
                string filePath = GetOrdersFilePath(workspaceRoot);
                SaveOrdersInternal(filePath, orders);
            });
        }

        private static void SaveOrdersInternal(string filePath, List<CreativeOrder> orders)
        {
            lock (_fileLock)
            {
                try
                {
                    string dir = Path.GetDirectoryName(filePath);
                    if (!Directory.Exists(dir))
                    {
                        Directory.CreateDirectory(dir);
                    }

                    string tempPath = filePath + ".tmp_" + DateTime.UtcNow.Ticks;
                    using (FileStream fs = new FileStream(tempPath, FileMode.Create, FileAccess.Write, FileShare.None))
                    using (StreamWriter writer = new StreamWriter(fs, Encoding.UTF8))
                    {
                        foreach (var order in orders)
                        {
                            string json = JsonConvert.SerializeObject(order);
                            writer.WriteLine(json);
                        }
                    }

                    if (File.Exists(filePath))
                    {
                        File.Delete(filePath);
                    }
                    File.Move(tempPath, filePath);
                }
                catch (Exception ex)
                {
                    Debug.WriteLine("[CreativeOrderService] SaveOrdersInternal error: " + ex.Message);
                }
            }
        }

        /// <summary>
        /// Updates the status or details of a single creative order on local ledger and syncs to Web Portal API.
        /// </summary>
        public static async Task<bool> UpdateOrderAsync(string workspaceRoot, string orderId, string newStatus, string assignedTo = null, string projectId = null, string internalNote = null)
        {
            var orders = await LoadOrdersFromDiskAsync(workspaceRoot).ConfigureAwait(false);
            var target = orders.FirstOrDefault(o => string.Equals(o.Id, orderId, StringComparison.OrdinalIgnoreCase));
            if (target != null)
            {
                if (!string.IsNullOrWhiteSpace(newStatus)) target.Status = newStatus;
                if (assignedTo != null) target.AssignedTo = assignedTo;
                if (projectId != null) target.ProjectId = projectId;
                if (internalNote != null) target.InternalNote = internalNote;
                target.UpdatedAt = DateTime.UtcNow.ToString("yyyy-MM-ddTHH:mm:ssZ");

                await SaveOrdersAsync(workspaceRoot, orders).ConfigureAwait(false);
            }

            // Sync update to Web Portal / Cloud API
            try
            {
                string token = await GetAuthTokenAsync(assignedTo).ConfigureAwait(false);
                if (!string.IsNullOrEmpty(token))
                {
                    var patchDict = new Dictionary<string, string>();
                    if (!string.IsNullOrWhiteSpace(newStatus)) patchDict["status"] = newStatus;
                    if (assignedTo != null) patchDict["assignedTo"] = assignedTo;
                    if (projectId != null) patchDict["projectId"] = projectId;
                    if (internalNote != null) patchDict["internalNote"] = internalNote;

                    using (var req = new HttpRequestMessage(new HttpMethod("PATCH"), DefaultApiBaseUrl + "api/orders/" + orderId))
                    {
                        req.Headers.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", token);
                        req.Content = new StringContent(JsonConvert.SerializeObject(patchDict), Encoding.UTF8, "application/json");
                        await _httpClient.SendAsync(req).ConfigureAwait(false);
                    }
                }
            }
            catch (Exception ex)
            {
                Debug.WriteLine("[CreativeOrderService] Live API PATCH sync failed: " + ex.Message);
            }

            return target != null;
        }

        /// <summary>
        /// Converts a Creative Order into a fully scaffolded SS-CAM Project folder on the NAS.
        /// Creates canonical monthly containers, standard subfolders, COPY.md with the order script,
        /// and README.md with YAML frontmatter linking the order ID.
        /// </summary>
        public static async Task<string> ConvertOrderToProjectAsync(
            CreativeOrder order,
            string workspaceRoot,
            string designerStaffId,
            string designerName,
            string templateExtension = ".af")
        {
            if (order == null) throw new ArgumentNullException("order");
            if (string.IsNullOrWhiteSpace(workspaceRoot) || !Directory.Exists(workspaceRoot))
            {
                throw new DirectoryNotFoundException("Workspace directory is invalid or not accessible.");
            }

            return await Task.Run(async () =>
            {
                // 1. Calculate Next Project ID
                int nextIdNum = AutoCalculateNextProjectId(workspaceRoot);
                string staffSuffix = "D";
                if (!string.IsNullOrWhiteSpace(designerStaffId))
                {
                    string trimmed = designerStaffId.Trim();
                    string lastChar = trimmed.Substring(trimmed.Length - 1).ToUpperInvariant();
                    if (Regex.IsMatch(lastChar, @"^[A-Z]$"))
                    {
                        staffSuffix = lastChar;
                    }
                }
                string formattedProjectId = string.Format("{0:D4}{1}", nextIdNum, staffSuffix);

                // 2. Clean entity and title
                string entityCode = !string.IsNullOrWhiteSpace(order.Entity) ? order.Entity.Trim().ToUpperInvariant() : "SSH";
                string cleanTitle = Regex.Replace(order.Title ?? "Creative_Project", @"[\\/:*?""<>|]", "_").Trim();
                cleanTitle = Regex.Replace(cleanTitle, @"\s+", "_");

                // 3. Build Canonical Folder Name: {YYYYMM}_{ProjectID}_{Entity}_{CleanTitle}
                string datePrefix = DateTime.Now.ToString("yyyyMM");
                string folderName = string.Format("{0}_{1}_{2}_{3}", datePrefix, formattedProjectId, entityCode, cleanTitle);

                // 4. Resolve Monthly Container: {WorkspaceRoot}\{Year}\{YYYYMM}_{MonthName}
                string yearStr = DateTime.Now.Year.ToString();
                string monthFolder = DateTime.Now.ToString("yyyyMM") + "_" + DateTime.Now.ToString("MMMM", CultureInfo.InvariantCulture);
                string containerDir = Path.Combine(workspaceRoot, yearStr, monthFolder);

                if (!Directory.Exists(containerDir))
                {
                    Directory.CreateDirectory(containerDir);
                }

                string targetProjectDir = Path.Combine(containerDir, folderName);
                if (!Directory.Exists(targetProjectDir))
                {
                    Directory.CreateDirectory(targetProjectDir);
                }

                // 5. Scaffold Subfolders
                string briefDir = Path.Combine(targetProjectDir, "01_Brief_and_Copy");
                string sourceDir = Path.Combine(targetProjectDir, "02_Source_Assets");
                string artworkDir = Path.Combine(targetProjectDir, "03_Artwork_Design");
                string exportsDir = Path.Combine(targetProjectDir, "04_Final_Exports");

                Directory.CreateDirectory(briefDir);
                Directory.CreateDirectory(sourceDir);
                Directory.CreateDirectory(artworkDir);
                Directory.CreateDirectory(exportsDir);

                // 6. Generate COPY.md with Order's Exact Copy Script
                string copyFilePath = Path.Combine(briefDir, "COPY.md");
                string copyContent = string.Format(
@"# Copywriting & Script Studio — {0}

- **Order ID**: {1}
- **Entity**: {2} ({3})
- **Priority**: {4}
- **Target Format**: {5}
- **Target Due Date**: {6}
- **Requester**: {7} ({8})
- **Created**: {9:yyyy-MM-dd HH:mm}

---

## Approved Copy / Script Content

{10}

---

## Production / Requester Notes
{11}
",
                    order.SafeTitle,
                    order.Id,
                    order.SafeEntity,
                    order.EntityFullName,
                    order.PriorityLabel,
                    order.FormatLabel,
                    order.TargetDate,
                    order.Requester,
                    order.RequesterRole,
                    DateTime.Now,
                    string.IsNullOrWhiteSpace(order.Copy) ? "_No copy script provided._" : order.Copy.Trim(),
                    string.IsNullOrWhiteSpace(order.AttachmentNote) ? "_No special attachment notes._" : order.AttachmentNote.Trim()
                );

                File.WriteAllText(copyFilePath, copyContent, Encoding.UTF8);

                // 7. Generate README.md with YAML Frontmatter
                string readmePath = Path.Combine(targetProjectDir, "README.md");
                string effectiveDeadline = !string.IsNullOrWhiteSpace(order.TargetDate) ? order.TargetDate : DateTime.Now.AddDays(3).ToString("yyyy-MM-dd");

                string readmeContent = string.Format(
@"---
status: in_progress
designer: {0}
client: {1}
deadline: {2}
priority: {3}
order_id: {4}
tags: [{1}, {5}]
---

# {6}

- **Project ID**: {7}
- **Order ID**: {8}
- **Designer**: {9} ({0})
- **Brand / Entity**: {1} - {10}
- **Platform / Format**: {11}
- **Target Deadline**: {2}
- **Requester**: {12} ({13})
- **Created**: {14:yyyy-MM-dd HH:mm}

## Deliverable Brief
{15}

### Copywriting & Script Reference
The complete brief and approved script are maintained in [`01_Brief_and_Copy/COPY.md`](01_Brief_and_Copy/COPY.md).

### Requester Notes
{16}
",
                    designerStaffId ?? "0001D",
                    entityCode,
                    effectiveDeadline,
                    order.PriorityBadge.ToLowerInvariant(),
                    order.Id,
                    order.Format ?? "asset",
                    folderName,
                    formattedProjectId,
                    order.Id,
                    designerName ?? "Designer",
                    order.EntityFullName,
                    order.FormatLabel,
                    order.Requester,
                    order.RequesterRole,
                    DateTime.Now,
                    order.SafeTitle,
                    string.IsNullOrWhiteSpace(order.AttachmentNote) ? "None." : order.AttachmentNote
                );

                File.WriteAllText(readmePath, readmeContent, Encoding.UTF8);

                // 8. Update the order record in ledger
                await UpdateOrderAsync(
                    workspaceRoot,
                    order.Id,
                    "in_progress",
                    designerName,
                    folderName,
                    string.Format("Converted to project {0} by {1} on {2:yyyy-MM-dd HH:mm}", folderName, designerName, DateTime.Now)
                );

                // 9. Append to Audit Log if _Team/audit-log.jsonl exists
                AppendAuditLog(workspaceRoot, designerName, "order_convert", "Order", order.Id, new
                {
                    orderId = order.Id,
                    projectId = folderName,
                    designer = designerName,
                    entity = entityCode,
                    folderPath = targetProjectDir
                });

                return targetProjectDir;
            });
        }

        private static int AutoCalculateNextProjectId(string workspaceRoot)
        {
            int maxId = 0;
            Regex regex = new Regex(@"^\d{6}_(\d{4})[A-Z]", RegexOptions.IgnoreCase);

            try
            {
                string year = DateTime.Now.Year.ToString();
                string yearDir = Path.Combine(workspaceRoot, year);
                if (Directory.Exists(yearDir))
                {
                    ScanDirForMaxId(yearDir, regex, ref maxId);
                }

                // Also scan legacy or subdirs
                List<DesignerFolderItem> recent = WorkspaceScanner.ListDesignerFolders(workspaceRoot, "", "", 100);
                if (recent != null)
                {
                    foreach (var item in recent)
                    {
                        if (item != null && !string.IsNullOrWhiteSpace(item.Project))
                        {
                            Match m = regex.Match(item.Project);
                            if (m.Success)
                            {
                                int val;
                                if (int.TryParse(m.Groups[1].Value, out val) && val > maxId)
                                {
                                    maxId = val;
                                }
                            }
                        }
                    }
                }
            }
            catch (Exception ex)
            {
                Debug.WriteLine("[CreativeOrderService] AutoCalculateNextProjectId error: " + ex.Message);
            }

            return maxId + 1;
        }

        private static void ScanDirForMaxId(string dir, Regex regex, ref int maxId)
        {
            try
            {
                foreach (string sub in Directory.GetDirectories(dir))
                {
                    string name = Path.GetFileName(sub);
                    Match m = regex.Match(name);
                    if (m.Success)
                    {
                        int val;
                        if (int.TryParse(m.Groups[1].Value, out val) && val > maxId)
                        {
                            maxId = val;
                        }
                    }
                    else if (name.Length == 6 && name.StartsWith("202"))
                    {
                        // YearMonth directory like 202609_September
                        ScanDirForMaxId(sub, regex, ref maxId);
                    }
                }
            }
            catch (Exception ex)
            {
                Debug.WriteLine("[CreativeOrderService] ScanDirForMaxId error: " + ex.Message);
            }
        }

        private static void AppendAuditLog(string workspaceRoot, string actor, string action, string entityType, string entityId, object details)
        {
            try
            {
                string teamDir = Path.Combine(workspaceRoot, "_Team");
                if (!Directory.Exists(teamDir)) Directory.CreateDirectory(teamDir);
                string logFile = Path.Combine(teamDir, "audit-log.jsonl");

                var entry = new
                {
                    id = "aud_" + DateTime.UtcNow.Ticks + "_" + Guid.NewGuid().ToString("N").Substring(0, 4),
                    timestamp = DateTime.UtcNow.ToString("yyyy-MM-ddTHH:mm:ssZ"),
                    actor = actor ?? "Designer",
                    role = "Designer",
                    action = action,
                    entityType = entityType,
                    entityId = entityId,
                    details = details
                };

                lock (_fileLock)
                {
                    File.AppendAllText(logFile, JsonConvert.SerializeObject(entry) + Environment.NewLine, Encoding.UTF8);
                }
            }
            catch (Exception ex)
            {
                Debug.WriteLine("[CreativeOrderService] AppendAuditLog error: " + ex.Message);
            }
        }

        private static List<CreativeOrder> GetInitialSeedOrders()
        {
            return new List<CreativeOrder>
            {
                new CreativeOrder
                {
                    Id = "ORD-260904-1001",
                    Title = "Men Clinic Awareness POSM Poster",
                    Entity = "SSC",
                    Priority = "tier_1",
                    Format = "print_posm",
                    Copy = "# Kempen Kesedaran Kesihatan Lelaki 2026\n\n## Headline\nKekal Bertenaga, Sihat & Berkeyakinan Setiap Hari.\n\n## Subhead\nKonsultasi professional & rawatan berperingkat daripada doktor bertauliah SuamiSihat Clinic.\n\n## Key Message Points\n- Ujian saringan pantas 15 minit tanpa rasa bimbang\n- Privasi pelanggan 100% terjaga rapi\n- Khidmat nasihat gaya hidup sihat dan suplemen semula jadi\n\n## Call to Action (CTA)\nImbas kod QR di kaunter untuk tempahan slot konsultasi percuma minggu ini.",
                    TargetDate = DateTime.Now.AddDays(14).ToString("yyyy-MM-dd"),
                    AttachmentNote = "Sila gunakan logo SuamiSihat Clinic (SSC) rasmi dan palet warna Medical Teal & Deep Slate.",
                    Requester = "Dr. Danial",
                    RequesterRole = "Medical Operations Lead",
                    Status = "pending",
                    SubmittedAt = DateTime.UtcNow.AddHours(-4).ToString("yyyy-MM-ddTHH:mm:ssZ"),
                    UpdatedAt = DateTime.UtcNow.AddHours(-4).ToString("yyyy-MM-ddTHH:mm:ssZ"),
                    AssignedTo = null,
                    ProjectId = null
                },
                new CreativeOrder
                {
                    Id = "ORD-260904-1002",
                    Title = "Kopi Pahlawan TikTok Reels 9:16 Promo",
                    Entity = "SSE",
                    Priority = "tier_2",
                    Format = "9_16_video",
                    Copy = "# Script Hook TikTok / Reels: Kopi Pahlawan\n\n## Scene 1 (0-3s) - The Pattern Interrupt\nVisual: Close-up buih kopi panas berkrim dituang ke cawan kaca berwap.\nVO: \"Bro, jangan biar petang kau lemau tak bertenaga...\"\nText on Screen: TENAGA PETANG PADU!\n\n## Scene 2 (3-8s) - Problem & Solution\nVisual: Lelaki aktif bekerja fokus depan komputer, senyum yakin.\nVO: \"Secawan Kopi Pahlawan dengan herba premium Tongkat Ali & Maca asli. Halal & bertenaga.\"\n\n## Scene 3 (8-15s) - CTA\nVisual: Kotak Kopi Pahlawan & badge Promosi Kombo Jimat.\nVO: \"Tekan beg kuning sekarang untuk harga pengenalan sebelum stok licin!\"",
                    TargetDate = DateTime.Now.AddDays(7).ToString("yyyy-MM-dd"),
                    AttachmentNote = "Format vertikal 1080x1920 60fps. Margin selamat untuk UI TikTok bawah & kanan.",
                    Requester = "Sarah Amin",
                    RequesterRole = "E-Commerce Marketing Lead",
                    Status = "pending",
                    SubmittedAt = DateTime.UtcNow.AddHours(-8).ToString("yyyy-MM-ddTHH:mm:ssZ"),
                    UpdatedAt = DateTime.UtcNow.AddHours(-8).ToString("yyyy-MM-ddTHH:mm:ssZ"),
                    AssignedTo = null,
                    ProjectId = null
                },
                new CreativeOrder
                {
                    Id = "ORD-260904-1003",
                    Title = "SuamiSihat Annual Leadership Summit Backdrop",
                    Entity = "SSH",
                    Priority = "tier_3",
                    Format = "16_9_landscape",
                    Copy = "# SuamiSihat Leadership Summit 2026\n\n## Theme\n\"Transformasi Kesihatan & Inovasi Lestari Menuju 2030\"\n\n## Key Details\n- Tarikh: 28 Oktober 2026\n- Lokasi: Grand Ballroom, Putrajaya\n- Penganjur: SuamiSihat Holding Sdn. Bhd.\n\n## Visual Direction\nElegance, minimalis korporat, sentuhan gradien Falconia Gold dan Deep Obsidian Navy.",
                    TargetDate = DateTime.Now.AddDays(4).ToString("yyyy-MM-dd"),
                    AttachmentNote = "Resolusi tinggi untuk LED Screen 4K panggung utama.",
                    Requester = "Harussani",
                    RequesterRole = "Creative Director",
                    Status = "pending",
                    SubmittedAt = DateTime.UtcNow.AddHours(-20).ToString("yyyy-MM-ddTHH:mm:ssZ"),
                    UpdatedAt = DateTime.UtcNow.AddHours(-20).ToString("yyyy-MM-ddTHH:mm:ssZ"),
                    AssignedTo = null,
                    ProjectId = null
                }
            };
        }
    }
}
