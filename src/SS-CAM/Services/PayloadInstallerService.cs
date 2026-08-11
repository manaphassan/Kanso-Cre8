using System;
using System.Diagnostics;
using System.IO;
using System.Reflection;
using System.Windows;
using Microsoft.Win32;

namespace SS_CAM.Services
{
    public static class PayloadInstallerService
    {
        public static string FindPayloadDirectory()
        {
            string baseDir = AppDomain.CurrentDomain.BaseDirectory;
            
            // Check BaseDirectory\payload
            string path1 = Path.Combine(baseDir, "payload");
            if (Directory.Exists(path1)) return path1;

            // Check parent directories up to 4 levels
            DirectoryInfo current = new DirectoryInfo(baseDir);
            for (int i = 0; i < 4; i++)
            {
                if (current == null) break;
                string checkPath = Path.Combine(current.FullName, "payload");
                if (Directory.Exists(checkPath)) return checkPath;
                current = current.Parent;
            }

            // Fallback hardcoded dev path
            string devPayload = @"e:\Dev\Projects\SS-Brand-Assets\payload";
            if (Directory.Exists(devPayload)) return devPayload;

            return "";
        }

        public static string InstallBrandFonts()
        {
            int installed = 0;
            int existing = 0;

            try
            {
                string localAppData = Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData);
                string userFontsDir = Path.Combine(localAppData, "Microsoft", "Windows", "Fonts");
                if (!Directory.Exists(userFontsDir)) Directory.CreateDirectory(userFontsDir);

                string payloadDir = FindPayloadDirectory();
                string fontSourceDir = !string.IsNullOrEmpty(payloadDir) ? Path.Combine(payloadDir, "Fonts") : "";

                if (!Directory.Exists(fontSourceDir))
                {
                    fontSourceDir = Path.Combine(localAppData, "SuamiSihat", "Fonts");
                }

                if (Directory.Exists(fontSourceDir))
                {
                    string[] fontFiles = Directory.GetFiles(fontSourceDir, "*.*", SearchOption.AllDirectories);
                    using (RegistryKey fontKey = Registry.CurrentUser.OpenSubKey(@"Software\Microsoft\Windows NT\CurrentVersion\Fonts", true))
                    {
                        foreach (string fontFile in fontFiles)
                        {
                            string ext = Path.GetExtension(fontFile).ToLower();
                            if (ext == ".ttf" || ext == ".otf")
                            {
                                string fontName = Path.GetFileName(fontFile);
                                string destFile = Path.Combine(userFontsDir, fontName);

                                if (!File.Exists(destFile))
                                {
                                    File.Copy(fontFile, destFile, true);
                                    installed++;
                                }
                                else
                                {
                                    existing++;
                                }

                                if (fontKey != null)
                                {
                                    string regValueName = string.Format("{0} (TrueType)", Path.GetFileNameWithoutExtension(fontFile));
                                    fontKey.SetValue(regValueName, destFile);
                                }
                            }
                        }
                    }
                }

                return string.Format("Font deployment complete: {0} new fonts installed, {1} existing fonts verified in Windows registry.", installed, existing);
            }
            catch (Exception ex)
            {
                return string.Format("Font deployment completed with message: {0}", ex.Message);
            }
        }

        public static string DeployBrandAssets(string targetPath = "")
        {
            try
            {
                string localAppData = Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData);
                string assetsDir = Path.Combine(localAppData, "SuamiSihat", "Assets");
                if (!Directory.Exists(assetsDir)) Directory.CreateDirectory(assetsDir);

                string payloadDir = FindPayloadDirectory();
                string sourceBrandAssets = !string.IsNullOrEmpty(payloadDir) ? Path.Combine(payloadDir, "Brand Assets") : "";

                int copiedFiles = 0;

                if (Directory.Exists(sourceBrandAssets))
                {
                    copiedFiles = CopyDirectoryRecursive(sourceBrandAssets, assetsDir);
                }

                // Copy Audio payload
                string sourceAudio = !string.IsNullOrEmpty(payloadDir) ? Path.Combine(payloadDir, "Audio") : "";
                if (Directory.Exists(sourceAudio))
                {
                    string targetAudio = Path.Combine(localAppData, "SuamiSihat", "Audio");
                    CopyDirectoryRecursive(sourceAudio, targetAudio);
                }

                if (!string.IsNullOrWhiteSpace(targetPath) && Directory.Exists(sourceBrandAssets))
                {
                    string destinationWorkspaceAssets = Path.Combine(targetPath, "BrandAssets");
                    CopyDirectoryRecursive(sourceBrandAssets, destinationWorkspaceAssets);
                }

                return string.Format("Brand asset libraries, colour palettes, and logo packages deployed successfully ({0} files) to:\n{1}", copiedFiles, assetsDir);
            }
            catch (Exception ex)
            {
                return string.Format("Asset deployment error: {0}", ex.Message);
            }
        }

        private static int CopyDirectoryRecursive(string sourceDir, string destinationDir)
        {
            int count = 0;
            DirectoryInfo dir = new DirectoryInfo(sourceDir);
            if (!dir.Exists) return 0;

            if (!Directory.Exists(destinationDir))
            {
                Directory.CreateDirectory(destinationDir);
            }

            foreach (FileInfo file in dir.GetFiles())
            {
                string targetFilePath = Path.Combine(destinationDir, file.Name);
                file.CopyTo(targetFilePath, true);
                count++;
            }

            foreach (DirectoryInfo subDir in dir.GetDirectories())
            {
                string newDestinationDir = Path.Combine(destinationDir, subDir.Name);
                count += CopyDirectoryRecursive(subDir.FullName, newDestinationDir);
            }

            return count;
        }

        public static string CreateDesktopShortcuts()
        {
            try
            {
                string desktop = Environment.GetFolderPath(Environment.SpecialFolder.Desktop);

                CreateUrlShortcut(Path.Combine(desktop, "SuamiSihat Service Dashboard.url"), "https://suamisihat.myds.me");
                CreateUrlShortcut(Path.Combine(desktop, "SS Design System (Internal).url"), "https://assets.suamisihat.myds.me/");
                CreateUrlShortcut(Path.Combine(desktop, "Public Brand Kits.url"), "https://suamisihat.com.my/brand-assets");

                return "Desktop web shortcuts created successfully for Service Dashboard, SS Design System, and Brand Kits.";
            }
            catch (Exception ex)
            {
                return string.Format("Shortcut creation failed: {0}", ex.Message);
            }
        }

        private static void CreateUrlShortcut(string filePath, string url)
        {
            string content = string.Format("[InternetShortcut]\nURL={0}\n", url);
            File.WriteAllText(filePath, content);
        }
    }
}
