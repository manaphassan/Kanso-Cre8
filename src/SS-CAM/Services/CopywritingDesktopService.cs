using System;
using System.Diagnostics;
using System.IO;
using System.Text;
using System.Text.RegularExpressions;

namespace SS_CAM.Services
{
    /// <summary>
    /// Manages reading, writing, and metrics calculation for copywriting documents
    /// stored at &lt;ProjectFolder&gt;\03_COPYWRITING\COPY.md or fallback COPY.md.
    /// </summary>
    public static class CopywritingDesktopService
    {
        public static string GetCopyFilePath(string projectPath, string projectId, string workspaceRoot)
        {
            if (!string.IsNullOrWhiteSpace(projectPath) && Directory.Exists(projectPath))
            {
                string dir03 = Path.Combine(projectPath, "03_COPYWRITING");
                if (!Directory.Exists(dir03))
                {
                    try { Directory.CreateDirectory(dir03); }
                    catch (Exception ex)
                    {
                        Debug.WriteLine(string.Format("[CopywritingDesktopService] Create 03_COPYWRITING: {0}", ex.Message));
                        return Path.Combine(projectPath, "COPY.md");
                    }
                }
                return Path.Combine(dir03, "COPY.md");
            }

            if (!string.IsNullOrWhiteSpace(workspaceRoot) && Directory.Exists(workspaceRoot))
            {
                string teamDir = Path.Combine(workspaceRoot, "_Team", "copywriting");
                if (!Directory.Exists(teamDir))
                {
                    try { Directory.CreateDirectory(teamDir); }
                    catch (Exception ex)
                    {
                        Debug.WriteLine(string.Format("[CopywritingDesktopService] Create team copywriting dir: {0}", ex.Message));
                    }
                }
                if (!string.IsNullOrWhiteSpace(projectId))
                {
                    return Path.Combine(teamDir, string.Format("{0}.md", projectId));
                }
            }

            return null;
        }

        public static string GetDefaultTemplate(string projectTitle)
        {
            if (string.IsNullOrWhiteSpace(projectTitle)) projectTitle = "Project Copywriting";

            StringBuilder sb = new StringBuilder();
            sb.AppendLine(string.Format("# ✍️ Copywriting & Script Studio: {0}", projectTitle));
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

        public static string LoadCopywriting(string projectPath, string projectId, string workspaceRoot, string projectTitle)
        {
            string filePath = GetCopyFilePath(projectPath, projectId, workspaceRoot);
            if (string.IsNullOrWhiteSpace(filePath))
            {
                return GetDefaultTemplate(projectTitle);
            }

            if (File.Exists(filePath))
            {
                try
                {
                    string content = File.ReadAllText(filePath, Encoding.UTF8);
                    if (!string.IsNullOrWhiteSpace(content))
                    {
                        return content;
                    }
                }
                catch (Exception ex)
                {
                    Debug.WriteLine(string.Format("[CopywritingDesktopService] LoadCopywriting error: {0}", ex.Message));
                }
            }

            // Return default template if file does not exist or is empty
            string defaultTemplate = GetDefaultTemplate(projectTitle);
            try
            {
                File.WriteAllText(filePath, defaultTemplate, Encoding.UTF8);
            }
            catch (Exception ex)
            {
                Debug.WriteLine(string.Format("[CopywritingDesktopService] Auto-scaffold error: {0}", ex.Message));
            }

            return defaultTemplate;
        }

        public static bool SaveCopywriting(string projectPath, string projectId, string workspaceRoot, string content)
        {
            string filePath = GetCopyFilePath(projectPath, projectId, workspaceRoot);
            if (string.IsNullOrWhiteSpace(filePath)) return false;

            try
            {
                string dir = Path.GetDirectoryName(filePath);
                if (!string.IsNullOrWhiteSpace(dir) && !Directory.Exists(dir))
                {
                    Directory.CreateDirectory(dir);
                }

                File.WriteAllText(filePath, content, Encoding.UTF8);
                return true;
            }
            catch (Exception ex)
            {
                Debug.WriteLine(string.Format("[CopywritingDesktopService] SaveCopywriting error: {0}", ex.Message));
                return false;
            }
        }

        public static void ComputeMetrics(string content, out int wordCount, out int charCount, out int lineCount, out int readingTimeSec)
        {
            if (string.IsNullOrEmpty(content))
            {
                wordCount = 0;
                charCount = 0;
                lineCount = 0;
                readingTimeSec = 0;
                return;
            }

            charCount = content.Length;

            string[] lines = content.Split(new[] { "\r\n", "\r", "\n" }, StringSplitOptions.None);
            lineCount = lines.Length;

            // Word count using regex whitespace splitting
            MatchCollection words = Regex.Matches(content, @"\b[\w'-]+\b");
            wordCount = words.Count;

            // Reading time estimated at 200 words per minute (approx 3.33 words per second)
            readingTimeSec = (int)Math.Ceiling(wordCount / 3.33);
            if (wordCount > 0 && readingTimeSec == 0) readingTimeSec = 1;
        }

        public static string GetPresetTemplate(string presetKey, string projectTitle)
        {
            if (string.IsNullOrWhiteSpace(projectTitle)) projectTitle = "Project";

            if (presetKey == "tiktok")
            {
                StringBuilder sb = new StringBuilder();
                sb.AppendLine("## 🎬 TikTok / Reels Video Script (9:16)");
                sb.AppendLine();
                sb.AppendLine("| Scene | Visual / On-Screen Action | Audio / Voiceover (Malay) |");
                sb.AppendLine("| :--- | :--- | :--- |");
                sb.AppendLine("| **00:00 - 00:03** | Hook visual pantas, ekspresi terkejut | *\"Ramai lelaki tak tahu petua mudah ni...\"* |");
                sb.AppendLine("| **00:03 - 00:08** | Product presentation / B-roll | *\"Guna formula herba semulajadi SuamiSihat setiap pagi.\"* |");
                sb.AppendLine("| **00:08 - 00:15** | Demo & CTA end card | *\"Komen 'NAK' atau klik beg kuning sekarang!\"* |");
                return sb.ToString();
            }
            else if (presetKey == "meta_pas")
            {
                StringBuilder sb = new StringBuilder();
                sb.AppendLine("## 📢 Meta Problem-Agitate-Solve (PAS) Ad Copy");
                sb.AppendLine();
                sb.AppendLine("### [Problem]");
                sb.AppendLine("Mudah letih dan hilang fokus waktu petang?");
                sb.AppendLine();
                sb.AppendLine("### [Agitate]");
                sb.AppendLine("Bila tenaga menurun, prestasi kerja dan masa berkualiti bersama keluarga terjejas.");
                sb.AppendLine();
                sb.AppendLine("### [Solve]");
                sb.AppendLine("Kembalikan tenaga maskulin anda dengan ramuan herba asli SuamiSihat. Terbukti selamat dan lulus KKM.");
                sb.AppendLine();
                sb.AppendLine("> **CTA**: [ Dapatkan Tawaran Kombo Istimewa ]");
                return sb.ToString();
            }
            else if (presetKey == "claims")
            {
                StringBuilder sb = new StringBuilder();
                sb.AppendLine("## 📦 Packaging & Product Compliance Claims");
                sb.AppendLine();
                sb.AppendLine("- [x] 100% Ekstrak Herba Asli Gred Premium");
                sb.AppendLine("- [x] Bebas Pengawet & Bahan Kimia Terlarang");
                sb.AppendLine("- [x] Dikilangkan di premis berstatus GMP & Halal");
                sb.AppendLine("- [x] No. Pendaftaran KKM: MALXXXXXXXXX");
                sb.AppendLine("- [x] Cara Pengambilan: 1 paket setiap pagi selepas sarapan");
                return sb.ToString();
            }

            return GetDefaultTemplate(projectTitle);
        }
    }
}
