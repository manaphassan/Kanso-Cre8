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

        public static void ComputeMetrics(string content, out int wordCount, out int charCount, out int lineCount, out int readingTimeSec, out int speakingTimeSec)
        {
            if (string.IsNullOrEmpty(content))
            {
                wordCount = 0;
                charCount = 0;
                lineCount = 0;
                readingTimeSec = 0;
                speakingTimeSec = 0;
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

            // Speaking voiceover tempo estimated at 130 words per minute (~2.16 words per second)
            speakingTimeSec = (int)Math.Ceiling(wordCount / 2.16);
            if (wordCount > 0 && speakingTimeSec == 0) speakingTimeSec = 1;
        }

        public static void ComputeMetrics(string content, out int wordCount, out int charCount, out int lineCount, out int readingTimeSec)
        {
            int speakingTimeSec;
            ComputeMetrics(content, out wordCount, out charCount, out lineCount, out readingTimeSec, out speakingTimeSec);
        }

        public static string StripMarkdownToPlainText(string markdown)
        {
            if (string.IsNullOrWhiteSpace(markdown)) return string.Empty;

            string text = markdown;
            // Remove headers #
            text = Regex.Replace(text, @"^#{1,6}\s*", "", RegexOptions.Multiline);
            // Remove bold/italic ** or * or _
            text = Regex.Replace(text, @"\*\*([^*]+)\*\*", "$1");
            text = Regex.Replace(text, @"\*([^*]+)\*", "$1");
            text = Regex.Replace(text, @"__([^_]+)__", "$1");
            text = Regex.Replace(text, @"_([^_]+)_", "$1");
            // Remove markdown links [text](url) -> text (url)
            text = Regex.Replace(text, @"\[([^\]]+)\]\(([^)]+)\)", "$1 ($2)");
            // Remove blockquotes >
            text = Regex.Replace(text, @"^>\s*", "", RegexOptions.Multiline);
            // Clean table delimiters |
            text = Regex.Replace(text, @"^\|?\s*:?-+:?\s*\|.*$", "", RegexOptions.Multiline);
            text = Regex.Replace(text, @"\|", " ");
            // Remove list checkboxes
            text = Regex.Replace(text, @"-\s*\[[ xX]\]\s*", "• ");
            text = Regex.Replace(text, @"^-\s+", "• ", RegexOptions.Multiline);
            // Remove consecutive blank lines
            text = Regex.Replace(text, @"\n{3,}", "\n\n");

            return text.Trim();
        }

        public static void SaveSnapshot(string projectPath, string projectId, string workspaceRoot, string content)
        {
            if (string.IsNullOrWhiteSpace(content)) return;

            try
            {
                string snapshotDir = null;
                if (!string.IsNullOrWhiteSpace(projectPath) && Directory.Exists(projectPath))
                {
                    snapshotDir = Path.Combine(projectPath, "03_COPYWRITING", ".snapshots");
                }
                else if (!string.IsNullOrWhiteSpace(workspaceRoot) && Directory.Exists(workspaceRoot))
                {
                    snapshotDir = Path.Combine(workspaceRoot, "_Team", "copywriting", ".snapshots");
                }

                if (!string.IsNullOrWhiteSpace(snapshotDir))
                {
                    if (!Directory.Exists(snapshotDir)) Directory.CreateDirectory(snapshotDir);
                    string safeId = !string.IsNullOrWhiteSpace(projectId) ? projectId : "draft";
                    string stamp = DateTime.Now.ToString("yyyyMMdd_HHmmss");
                    string snapFile = Path.Combine(snapshotDir, string.Format("{0}_{1}.md", safeId, stamp));
                    File.WriteAllText(snapFile, content, Encoding.UTF8);

                    // Keep maximum 10 latest snapshots
                    string[] files = Directory.GetFiles(snapshotDir, string.Format("{0}_*.md", safeId));
                    if (files.Length > 10)
                    {
                        Array.Sort(files);
                        for (int i = 0; i < files.Length - 10; i++)
                        {
                            try { File.Delete(files[i]); }
                            catch (Exception ex) { Debug.WriteLine("[CopywritingDesktopService] Snapshot purge error: " + ex.Message); }
                        }
                    }
                }
            }
            catch (Exception ex)
            {
                Debug.WriteLine(string.Format("[CopywritingDesktopService] SaveSnapshot error: {0}", ex.Message));
            }
        }

        public static string GetPresetTemplate(string presetKey, string projectTitle)
        {
            if (string.IsNullOrWhiteSpace(projectTitle)) projectTitle = "Project";

            if (presetKey == "tiktok" || presetKey == "tiktok_3hooks")
            {
                StringBuilder sb = new StringBuilder();
                sb.AppendLine("## 🎬 TikTok / Reels Video Script & 3-Hook Matrix (9:16)");
                sb.AppendLine();
                sb.AppendLine("### 🪝 Hook Variations (First 3 Seconds)");
                sb.AppendLine("> **Hook A (Curiosity)**: *\"Ramai lelaki ingat punca badan cepat lesu sebab umur... padahal bukan!\"*");
                sb.AppendLine("> **Hook B (Direct Benefit)**: *\"Bang, kalau nak kekal bertenaga sampai malam tanpa rasa letih, cuba tips ni.\"*");
                sb.AppendLine("> **Hook C (Common Mistake)**: *\"Elakkan minum kopi berlebihan bila rasa lemau, ini cara semulajadi yang lebih berkesan.\"*");
                sb.AppendLine();
                sb.AppendLine("### 📋 Video Scene Blueprint");
                sb.AppendLine("| Timecode | Visual & On-Screen Direction | Audio & Voiceover Script (Malay) |");
                sb.AppendLine("| :--- | :--- | :--- |");
                sb.AppendLine("| **00:00 - 00:03** | Hook visual pantas (Hook A/B/C) + text overlay | *[Pilih Hook A/B/C]* |");
                sb.AppendLine("| **00:03 - 00:08** | Product presentation / B-roll bertenaga | *\"Guna formula herba semulajadi SuamiSihat setiap pagi.\"* |");
                sb.AppendLine("| **00:08 - 00:12** | Unboxing packaging eksklusif & info KKM | *\"100% ekstrak herba gred premium dan lulus KKM.\"* |");
                sb.AppendLine("| **00:12 - 00:15** | Demo penggunaan & CTA end card | *\"Komen 'NAK' atau klik beg kuning sekarang sebelum stok habis!\"* |");
                return sb.ToString();
            }
            else if (presetKey == "meta_pas")
            {
                StringBuilder sb = new StringBuilder();
                sb.AppendLine("## 📢 Meta Problem-Agitate-Solve (PAS) Direct-Response Copy");
                sb.AppendLine();
                sb.AppendLine("### [Problem]");
                sb.AppendLine("Mudah letih, hilang fokus, dan kurang bertenaga selepas seharian bekerja keras?");
                sb.AppendLine();
                sb.AppendLine("### [Agitate]");
                sb.AppendLine("Bila stamina menurun, bukan sahaja produktiviti kerja merosot, malah masa berharga bersama isteri dan keluarga turut terjejas. Jangan biarkan keletihan berlarutan.");
                sb.AppendLine();
                sb.AppendLine("### [Solve]");
                sb.AppendLine("Kembalikan tenaga maskulin dan keyakinan puncak anda dengan formulasi herba premium SuamiSihat. Dihasilkan khusus untuk kesihatan optimum lelaki moden.");
                sb.AppendLine();
                sb.AppendLine("> **Headline**: \"Rahsia Stamina Padu Lelaki Sejati — 100% Asli & Lulus KKM.\"");
                sb.AppendLine("> **CTA**: [ Tempah Sekarang — Penghantaran Percuma Seluruh Malaysia ]");
                return sb.ToString();
            }
            else if (presetKey == "whatsapp_broadcast")
            {
                StringBuilder sb = new StringBuilder();
                sb.AppendLine("## 💬 WhatsApp Direct Broadcast & Follow-Up Template");
                sb.AppendLine();
                sb.AppendLine("Assalamualaikum & Salam Sejahtera Tuan [Nama],");
                sb.AppendLine();
                sb.AppendLine("🔥 *TAWARAN KHAS UNTUK PELANGGAN SETIA SUAMISIHAT* 🔥");
                sb.AppendLine();
                sb.AppendLine("Kami sedar cabaran harian kaum lelaki yang bekerja keras demi keluarga tercinta. Untuk bantu Tuan kekal berstamina tinggi setiap hari:");
                sb.AppendLine();
                sb.AppendLine("✅ *100% Ekstrak Herba Tradisional Gred Premium*");
                sb.AppendLine("✅ *Lulus KKM & Halal JAKIM*");
                sb.AppendLine("✅ *Penghantaran Pantas & Bungkusan Privasi*");
                sb.AppendLine();
                sb.AppendLine("🎁 *PROMOSI BULAN INI*: Diskaun sehingga 35% + Free Gift Eksklusif!");
                sb.AppendLine();
                sb.AppendLine("👉 Balas mesej ini dengan kod **\"NAK\"** atau klik link pantas:");
                sb.AppendLine("🔗 https://suamisihat.clinic/promo");
                return sb.ToString();
            }
            else if (presetKey == "neubrutalist_hook")
            {
                StringBuilder sb = new StringBuilder();
                sb.AppendLine("## ⚡ NEUBRUTALIST HIGH-CTR AD HOOK (RAW & PUNCHY)");
                sb.AppendLine();
                sb.AppendLine("### 💥 ULTRA-BOLD HEADLINE (HIGH CONTRAST)");
                sb.AppendLine("> **\"LELAKI UMUR 30-AN KE ATAS JANGAN BACA NI KALAU TAK NAK STAMINA NAIK 2X GANDA!\"**");
                sb.AppendLine();
                sb.AppendLine("### 🎯 3 RAW HARD-HITTING FACTS");
                sb.AppendLine("- 🛑 **FAKTA 1**: Minum 3 cawan kopi sehari bukan selesaikan masalah — ia cuma pinjam tenaga esok.");
                sb.AppendLine("- 🛑 **FAKTA 2**: 78% lelaki rasa cepat lemau sebab hormon & nutrient mikro tak seimbang.");
                sb.AppendLine("- 🛑 **FAKTA 3**: 1 sachet herba pekat SuamiSihat setiap pagi cukup untuk reboot stamina dari akar umbi.");
                sb.AppendLine();
                sb.AppendLine("### 📦 THE OFFER (UNAPOLOGETIC & DIRECT)");
                sb.AppendLine("- **Formula**: 100% Ekstrak Tongkat Ali Hitam + Maca Premium.");
                sb.AppendLine("- **Status**: Lulus KKM, 0% Bahan Terlarang.");
                sb.AppendLine("- **Jaminan**: Tak berkesan? Kami pulangkan wang 100%.");
                sb.AppendLine();
                sb.AppendLine("> **CTA BUTTON**: 👉 [ KLIK SINI & DAPATKAN DISKAUN 40% HARI INI ] 👈");
                return sb.ToString();
            }
            else if (presetKey == "retro_story")
            {
                StringBuilder sb = new StringBuilder();
                sb.AppendLine("## 🕹️ RETRO-FUTURISTIC NOSTALGIC STORY HOOK");
                sb.AppendLine();
                sb.AppendLine("### 📼 Level 1: Flashback Nostalgia (Tahun 90-an)");
                sb.AppendLine("Ingat lagi zaman kita boleh main bola 2 jam tanpa henti, lepak sampai pagi, esoknya bangun masih bertenaga macam bateri baru?");
                sb.AppendLine();
                sb.AppendLine("### 🕹️ Level 2: The Modern Boss Fight");
                sb.AppendLine("Sekarang, baru pukul 3 petang duduk depan laptop mata dah berat. Naik tangga dua tingkat dah mengah. Mana hilangnya stamina 'Champion' kita dulu?");
                sb.AppendLine();
                sb.AppendLine("### 🔋 Level 3: Retro Power-Up Item");
                sb.AppendLine("SuamiSihat ialah 'Power-Up Potion' moden berasaskan khazanah herba nusantara purba yang dinaiktaraf dengan sains formulasi abad ke-21.");
                sb.AppendLine();
                sb.AppendLine("> **Insert Coin / Unlock Power**: 🪙 [ PRESS START — CLAIM YOUR BOOST PACK ]");
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
