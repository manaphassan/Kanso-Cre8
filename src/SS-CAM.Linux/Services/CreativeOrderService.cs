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
using SS_CAM.Linux.Models;

namespace SS_CAM.Linux.Services;

public static class CreativeOrderService
{
    private static readonly object _fileLock = new();
    private static readonly HttpClient _httpClient;
    private static string? _cachedJwtToken = null;
    private static DateTime _tokenExpiry = DateTime.MinValue;
    private const string DefaultApiBaseUrl = "https://creative.suamisihat.myds.me/";

    static CreativeOrderService()
    {
        var handler = new HttpClientHandler
        {
            ServerCertificateCustomValidationCallback = (_, _, _, _) => true
        };
        _httpClient = new HttpClient(handler) { Timeout = TimeSpan.FromSeconds(6) };
    }

    private class OrdersApiResponse
    {
        [JsonProperty("success")]
        public bool Success { get; set; }

        [JsonProperty("orders")]
        public List<CreativeOrder>? Orders { get; set; }
    }

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
                Debug.WriteLine($"[CreativeOrderService.Linux] workspace orders dir error: {ex.Message}");
            }
        }

        string userHome = Environment.GetFolderPath(Environment.SpecialFolder.UserProfile);
        string fallbackDir = Path.Combine(userHome, ".config", "ss-cam", "orders");
        try
        {
            if (!Directory.Exists(fallbackDir))
            {
                Directory.CreateDirectory(fallbackDir);
            }
            return Path.Combine(fallbackDir, "creative-orders.jsonl");
        }
        catch
        {
            return Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "creative-orders.jsonl");
        }
    }

    private static async Task<string?> GetAuthTokenAsync(string? username)
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

            using var content = new StringContent(json, Encoding.UTF8, "application/json");
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
        catch (Exception ex)
        {
            Debug.WriteLine($"[CreativeOrderService.Linux] GetAuthTokenAsync error: {ex.Message}");
        }

        return null;
    }

    public static async Task<List<CreativeOrder>?> FetchOrdersFromApiAsync(string? username = null)
    {
        try
        {
            string? token = await GetAuthTokenAsync(username).ConfigureAwait(false);
            if (string.IsNullOrEmpty(token)) return null;

            using var req = new HttpRequestMessage(HttpMethod.Get, DefaultApiBaseUrl + "api/orders");
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
        catch (Exception ex)
        {
            Debug.WriteLine($"[CreativeOrderService.Linux] FetchOrdersFromApiAsync error: {ex.Message}");
        }

        return null;
    }

    public static async Task<List<CreativeOrder>> LoadOrdersFromDiskAsync(string workspaceRoot)
    {
        return await Task.Run(() =>
        {
            var orders = new List<CreativeOrder>();
            string filePath = GetOrdersFilePath(workspaceRoot);

            lock (_fileLock)
            {
                try
                {
                    if (File.Exists(filePath))
                    {
                        using var fs = new FileStream(filePath, FileMode.Open, FileAccess.Read, FileShare.ReadWrite);
                        using var reader = new StreamReader(fs, Encoding.UTF8);
                        string? line;
                        while ((line = reader.ReadLine()) != null)
                        {
                            if (string.IsNullOrWhiteSpace(line)) continue;
                            try
                            {
                                var order = JsonConvert.DeserializeObject<CreativeOrder>(line);
                                if (order != null) orders.Add(order);
                            }
                            catch { }
                        }
                    }
                }
                catch (Exception ex)
                {
                    Debug.WriteLine($"[CreativeOrderService.Linux] LoadOrdersFromDiskAsync error: {ex.Message}");
                }
            }

            return orders.OrderByDescending(o => o.SubmittedAt).ToList();
        });
    }

    public static async Task<List<CreativeOrder>> LoadOrdersAsync(string workspaceRoot, string? designerUsername = null)
    {
        try
        {
            var liveOrders = await FetchOrdersFromApiAsync(designerUsername).ConfigureAwait(false);
            if (liveOrders != null && liveOrders.Count > 0)
            {
                string filePath = GetOrdersFilePath(workspaceRoot);
                await SaveOrdersAsync(workspaceRoot, liveOrders).ConfigureAwait(false);
                return liveOrders.OrderByDescending(o => o.SubmittedAt).ToList();
            }
        }
        catch (Exception ex)
        {
            Debug.WriteLine($"[CreativeOrderService.Linux] Live API fetch error: {ex.Message}");
        }

        return await LoadOrdersFromDiskAsync(workspaceRoot).ConfigureAwait(false);
    }

    public static async Task SaveOrdersAsync(string workspaceRoot, List<CreativeOrder> orders)
    {
        await Task.Run(() =>
        {
            string filePath = GetOrdersFilePath(workspaceRoot);
            lock (_fileLock)
            {
                try
                {
                    string? dir = Path.GetDirectoryName(filePath);
                    if (!string.IsNullOrEmpty(dir) && !Directory.Exists(dir))
                    {
                        Directory.CreateDirectory(dir);
                    }

                    string tempPath = filePath + ".tmp_" + DateTime.UtcNow.Ticks;
                    using (var fs = new FileStream(tempPath, FileMode.Create, FileAccess.Write, FileShare.None))
                    using (var writer = new StreamWriter(fs, Encoding.UTF8))
                    {
                        foreach (var order in orders)
                        {
                            writer.WriteLine(JsonConvert.SerializeObject(order));
                        }
                    }

                    if (File.Exists(filePath)) File.Delete(filePath);
                    File.Move(tempPath, filePath);
                }
                catch (Exception ex)
                {
                    Debug.WriteLine($"[CreativeOrderService.Linux] SaveOrdersAsync error: {ex.Message}");
                }
            }
        });
    }

    public static async Task<bool> UpdateOrderAsync(string workspaceRoot, string orderId, string newStatus, string? assignedTo = null, string? projectId = null, string? internalNote = null)
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

        try
        {
            string? token = await GetAuthTokenAsync(assignedTo).ConfigureAwait(false);
            if (!string.IsNullOrEmpty(token))
            {
                var patchDict = new Dictionary<string, string>();
                if (!string.IsNullOrWhiteSpace(newStatus)) patchDict["status"] = newStatus;
                if (assignedTo != null) patchDict["assignedTo"] = assignedTo;
                if (projectId != null) patchDict["projectId"] = projectId;
                if (internalNote != null) patchDict["internalNote"] = internalNote;

                using var req = new HttpRequestMessage(new HttpMethod("PATCH"), DefaultApiBaseUrl + "api/orders/" + orderId);
                req.Headers.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", token);
                req.Content = new StringContent(JsonConvert.SerializeObject(patchDict), Encoding.UTF8, "application/json");
                await _httpClient.SendAsync(req).ConfigureAwait(false);
            }
        }
        catch (Exception ex)
        {
            Debug.WriteLine($"[CreativeOrderService.Linux] Live API PATCH sync failed: {ex.Message}");
        }

        return target != null;
    }

    public static async Task<string> ConvertOrderToProjectAsync(
        CreativeOrder order,
        string workspaceRoot,
        string designerStaffId,
        string designerName)
    {
        if (order == null) throw new ArgumentNullException(nameof(order));
        if (string.IsNullOrWhiteSpace(workspaceRoot) || !Directory.Exists(workspaceRoot))
            throw new DirectoryNotFoundException("Workspace directory is not accessible.");

        return await Task.Run(async () =>
        {
            int nextId = AutoCalculateNextProjectId(workspaceRoot);
            string staffSuffix = "D";
            if (!string.IsNullOrWhiteSpace(designerStaffId))
            {
                string lastChar = designerStaffId.Trim().Substring(designerStaffId.Trim().Length - 1).ToUpperInvariant();
                if (Regex.IsMatch(lastChar, @"^[A-Z]$")) staffSuffix = lastChar;
            }
            string formattedProjectId = $"{nextId:D4}{staffSuffix}";

            string entityCode = !string.IsNullOrWhiteSpace(order.Entity) ? order.Entity.Trim().ToUpperInvariant() : "SSH";
            string cleanTitle = Regex.Replace(order.Title ?? "Creative_Project", @"[\\/:*?""<>|]", "_").Trim();
            cleanTitle = Regex.Replace(cleanTitle, @"\s+", "_");

            string datePrefix = DateTime.Now.ToString("yyyyMM");
            string folderName = $"{datePrefix}_{formattedProjectId}_{entityCode}_{cleanTitle}";

            string yearStr = DateTime.Now.Year.ToString();
            string monthFolder = DateTime.Now.ToString("yyyyMM") + "_" + DateTime.Now.ToString("MMMM", CultureInfo.InvariantCulture);
            string containerDir = Path.Combine(workspaceRoot, yearStr, monthFolder);

            if (!Directory.Exists(containerDir)) Directory.CreateDirectory(containerDir);
            string targetProjectDir = Path.Combine(containerDir, folderName);
            if (!Directory.Exists(targetProjectDir)) Directory.CreateDirectory(targetProjectDir);

            // Scaffold subfolders
            string briefDir = Path.Combine(targetProjectDir, "01_Brief_and_Copy");
            string sourceDir = Path.Combine(targetProjectDir, "02_Source_Assets");
            string artworkDir = Path.Combine(targetProjectDir, "03_Artwork_Design");
            string exportsDir = Path.Combine(targetProjectDir, "04_Final_Exports");

            Directory.CreateDirectory(briefDir);
            Directory.CreateDirectory(sourceDir);
            Directory.CreateDirectory(artworkDir);
            Directory.CreateDirectory(exportsDir);

            // Generate COPY.md
            string copyFilePath = Path.Combine(briefDir, "COPY.md");
            string copyContent = $@"# Copywriting & Script Studio — {order.SafeTitle}

- **Order ID**: {order.Id}
- **Entity**: {order.SafeEntity} ({order.EntityFullName})
- **Priority**: {order.PriorityLabel}
- **Target Format**: {order.FormatLabel}
- **Target Due Date**: {order.TargetDate}
- **Requester**: {order.Requester} ({order.RequesterRole})
- **Created**: {DateTime.Now:yyyy-MM-dd HH:mm}

---

## Approved Copy / Script Content

{(string.IsNullOrWhiteSpace(order.Copy) ? "_No copy script provided._" : order.Copy.Trim())}

---

## Production / Requester Notes
{(string.IsNullOrWhiteSpace(order.AttachmentNote) ? "_No special attachment notes._" : order.AttachmentNote.Trim())}
";
            File.WriteAllText(copyFilePath, copyContent, Encoding.UTF8);

            // Generate README.md
            string readmePath = Path.Combine(targetProjectDir, "README.md");
            string effectiveDeadline = !string.IsNullOrWhiteSpace(order.TargetDate) ? order.TargetDate : DateTime.Now.AddDays(3).ToString("yyyy-MM-dd");

            string readmeContent = $@"---
status: in_progress
designer: {designerStaffId}
client: {entityCode}
deadline: {effectiveDeadline}
priority: {order.PriorityBadge.ToLowerInvariant()}
order_id: {order.Id}
tags: [{entityCode}, {order.Format ?? "asset"}]
---

# {folderName}

- **Project ID**: {formattedProjectId}
- **Order ID**: {order.Id}
- **Designer**: {designerName} ({designerStaffId})
- **Brand / Entity**: {entityCode} - {order.EntityFullName}
- **Platform / Format**: {order.FormatLabel}
- **Target Deadline**: {effectiveDeadline}
- **Requester**: {order.Requester} ({order.RequesterRole})
- **Created**: {DateTime.Now:yyyy-MM-dd HH:mm}

## Deliverable Brief
{order.SafeTitle}

### Copywriting & Script Reference
The complete brief and approved script are maintained in [`01_Brief_and_Copy/COPY.md`](01_Brief_and_Copy/COPY.md).

### Requester Notes
{(string.IsNullOrWhiteSpace(order.AttachmentNote) ? "None." : order.AttachmentNote)}
";
            File.WriteAllText(readmePath, readmeContent, Encoding.UTF8);

            // Update order record
            await UpdateOrderAsync(workspaceRoot, order.Id, "in_progress", designerName, folderName);

            return targetProjectDir;
        });
    }

    private static int AutoCalculateNextProjectId(string workspaceRoot)
    {
        int maxId = 0;
        var regex = new Regex(@"^\d{6}_(\d{4})[A-Z]", RegexOptions.IgnoreCase);

        try
        {
            string year = DateTime.Now.Year.ToString();
            string yearDir = Path.Combine(workspaceRoot, year);
            if (Directory.Exists(yearDir))
            {
                foreach (var dir in Directory.GetDirectories(yearDir, "*", SearchOption.AllDirectories))
                {
                    var m = regex.Match(Path.GetFileName(dir));
                    if (m.Success && int.TryParse(m.Groups[1].Value, out int id) && id > maxId)
                    {
                        maxId = id;
                    }
                }
            }
        }
        catch (Exception ex)
        {
            Debug.WriteLine($"[CreativeOrderService.Linux] AutoCalculateNextProjectId error: {ex.Message}");
        }

        return maxId + 1;
    }
}
