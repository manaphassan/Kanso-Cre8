using System;
using System.Diagnostics;
using System.IO;
using System.Text;
using System.Text.RegularExpressions;

namespace SS_CAM.Linux.Services
{
    public static class CopywritingDesktopService
    {
        public static string? GetCopyFilePath(string projectPath)
        {
            if (string.IsNullOrWhiteSpace(projectPath) || !Directory.Exists(projectPath))
                return null;

            // Search priority: 01_BRIEFS/COPY.md -> 03_COPYWRITING/COPY.md -> COPY.md
            string path01 = Path.Combine(projectPath, "01_BRIEFS", "COPY.md");
            if (File.Exists(path01)) return path01;

            string path03 = Path.Combine(projectPath, "03_COPYWRITING", "COPY.md");
            if (File.Exists(path03)) return path03;

            string pathRoot = Path.Combine(projectPath, "COPY.md");
            if (File.Exists(pathRoot)) return pathRoot;

            // If none exists, default to 01_BRIEFS/COPY.md
            string dir01 = Path.Combine(projectPath, "01_BRIEFS");
            if (!Directory.Exists(dir01)) Directory.CreateDirectory(dir01);
            return path01;
        }

        public static string GetDefaultTemplate(string projectTitle)
        {
            if (string.IsNullOrWhiteSpace(projectTitle)) projectTitle = "Project Campaign";

            var sb = new StringBuilder();
            sb.AppendLine($"# ✍️ Copywriting & Script Studio: {projectTitle}");
            sb.AppendLine();
            sb.AppendLine("## 🎯 Target Audience & Hook Strategy");
            sb.AppendLine("- **Core Demographic**: Men aged 28-55 seeking high performance, energy, and vitality.");
            sb.AppendLine("- **Tone of Voice**: Masculine, Authoritative, Trustworthy, Premium Medical.");
            sb.AppendLine("- **Primary Angle**: Clinically proven vitality formulation with 100% pure authentic ingredients.");
            sb.AppendLine();
            sb.AppendLine("---");
            sb.AppendLine();
            sb.AppendLine("## 📢 Meta Ad Creative Copy Variants");
            sb.AppendLine();
            sb.AppendLine("### Angle 1: Direct Benefit & Authority");
            sb.AppendLine("> **Headline**: \"Rahsia Tenaga Lelaki Sejati Kini Terbongkar — 100% Asli Tanpa Kompromi.\"");
            sb.AppendLine("> **Primary Text**: Ramai lelaki alami keletihan selepas seharian bekerja keras. Jangan biarkan prestasi anda menurun. Diformulasikan khusus untuk mengembalikan stamina dan fokus puncak harian anda.");
            sb.AppendLine("> **CTA**: [ Tempah Sekarang — Penghantaran Percuma ]");
            sb.AppendLine();
            sb.AppendLine("### Angle 2: Social Proof & Urgency");
            sb.AppendLine("> **Headline**: \"Lebih 15,000+ Pelanggan Berpuas Hati — Stok Terhad!\"");
            sb.AppendLine("> **Primary Text**: Nikmati keyakinan diri tahap maksimum dengan ramuan herba terpilih SuamiSihat.");
            sb.AppendLine("> **CTA**: [ Dapatkan Tawaran Eksklusif Hari Ini ]");
            sb.AppendLine();
            sb.AppendLine("---");
            sb.AppendLine();
            sb.AppendLine("## 🎬 TikTok / Reels Video Script (9:16)");
            sb.AppendLine();
            sb.AppendLine("| Scene | Visual / On-Screen Action | Audio / Voiceover (Malay) |");
            sb.AppendLine("| :--- | :--- | :--- |");
            sb.AppendLine("| **00:00 - 00:03** | Close-up botol, pencahayaan dramatik, audio swoosh | *\"Bang, kalau selalu rasa lemau balik kerja, dengar ni kejap...\"* |");
            sb.AppendLine("| **00:03 - 00:07** | B-roll lelaki bertenaga bekerja & bersenam | *\"Rahsia stamina padu bukan kopi biasa, tapi khasiat herba gred premium.\"* |");
            sb.AppendLine("| **00:07 - 00:12** | Unboxing packaging premium SuamiSihat | *\"Lulus KKM, 100% bahan selamat dan terbukti berkesan.\"* |");
            sb.AppendLine("| **00:12 - 00:15** | CTA end card & promo link | *\"Klik beg kuning atau link di bio sekarang sebelum promosi tamat!\"* |");
            sb.AppendLine();
            sb.AppendLine("---");
            sb.AppendLine();
            sb.AppendLine("## 📦 Packaging & Label Compliance Claims");
            sb.AppendLine("- [x] Tiada bahan kimia terlarang / No banned substances");
            sb.AppendLine("- [x] Halal certified extraction process");
            sb.AppendLine("- [x] Standard dos harian: 1 sudu setiap pagi sebelum sarapan");
            return sb.ToString();
        }

        public static string LoadCopywriting(string projectPath, string projectTitle)
        {
            string? filePath = GetCopyFilePath(projectPath);
            if (string.IsNullOrWhiteSpace(filePath))
            {
                return GetDefaultTemplate(projectTitle);
            }

            if (File.Exists(filePath))
            {
                try
                {
                    string content = File.ReadAllText(filePath, Encoding.UTF8);
                    if (!string.IsNullOrWhiteSpace(content)) return content;
                }
                catch { }
            }

            string defaultTemplate = GetDefaultTemplate(projectTitle);
            try { File.WriteAllText(filePath, defaultTemplate, Encoding.UTF8); }
            catch { }
            return defaultTemplate;
        }

        public static bool SaveCopywriting(string projectPath, string content)
        {
            string? filePath = GetCopyFilePath(projectPath);
            if (string.IsNullOrWhiteSpace(filePath)) return false;

            try
            {
                File.WriteAllText(filePath, content ?? "", Encoding.UTF8);
                return true;
            }
            catch
            {
                return false;
            }
        }

        public static (int words, double readTimeMinutes, int emojis, string headline, string primaryText, string cta) ComputeMetrics(string markdown)
        {
            if (string.IsNullOrWhiteSpace(markdown))
                return (0, 0, 0, "No headline detected", "No ad body copy detected", "Order Now");

            // Strip Markdown formatting
            string plain = Regex.Replace(markdown, @"[#*`_>\[\]\(\)\|\-]", " ");
            string[] words = plain.Split(new[] { ' ', '\t', '\r', '\n' }, StringSplitOptions.RemoveEmptyEntries);
            int wordCount = words.Length;
            double readTime = Math.Max(0.5, Math.Round(wordCount / 180.0, 1));

            // Count emojis
            int emojiCount = Regex.Matches(markdown, @"[\uD83C-\uDBFF\uDC00-\uDFFF\u2600-\u26FF\u2700-\u27BF]").Count;

            // Extract Headline
            string headline = "🔥 Tawaran Eksklusif SuamiSihat — Stok Terhad!";
            var hlMatch = Regex.Match(markdown, @">\s*\*\*Headline\*\*:\s*""?([^""\r\n]+)""?", RegexOptions.IgnoreCase);
            if (hlMatch.Success) headline = hlMatch.Groups[1].Value.Trim();

            // Extract Primary Text
            string primaryText = "Diformulasikan secara klinikal untuk tenaga, stamina, dan keyakinan lelaki sejati sepanjang hari.";
            var ptMatch = Regex.Match(markdown, @">\s*\*\*Primary Text\*\*:\s*([^\r\n]+)", RegexOptions.IgnoreCase);
            if (ptMatch.Success) primaryText = ptMatch.Groups[1].Value.Trim();

            // Extract CTA
            string cta = "Tempah Sekarang";
            var ctaMatch = Regex.Match(markdown, @">\s*\*\*CTA\*\*:\s*\[?\s*([^\]\r\n]+)\s*\]?", RegexOptions.IgnoreCase);
            if (ctaMatch.Success) cta = ctaMatch.Groups[1].Value.Trim();

            return (wordCount, readTime, emojiCount, headline, primaryText, cta);
        }

        public static string FormatPlainTextForAd(string markdown)
        {
            if (string.IsNullOrWhiteSpace(markdown)) return "";
            string plain = markdown;
            // Remove markdown tables
            plain = Regex.Replace(plain, @"\|.*\|", "");
            // Remove markdown headers
            plain = Regex.Replace(plain, @"^#+\s+", "", RegexOptions.Multiline);
            // Remove bold/italics
            plain = Regex.Replace(plain, @"\*\*([^*]+)\*\*", "$1");
            plain = Regex.Replace(plain, @"\*([^*]+)\*", "$1");
            // Remove blockquotes
            plain = Regex.Replace(plain, @"^>\s+", "", RegexOptions.Multiline);
            return plain.Trim();
        }
    }
}
