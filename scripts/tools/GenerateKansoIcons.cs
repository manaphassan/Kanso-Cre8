using System;
using System.Collections.Generic;
using System.Drawing;
using System.Drawing.Drawing2D;
using System.Drawing.Imaging;
using System.Drawing.Text;
using System.IO;
using System.Runtime.InteropServices;

public class GenerateKansoIcons
{
    [DllImport("shell32.dll")]
    public static extern void SHChangeNotify(uint wEventId, uint uFlags, IntPtr dwItem1, IntPtr dwItem2);

    public static void Main(string[] args)
    {
        string repoRoot = Path.GetFullPath(Path.Combine(AppDomain.CurrentDomain.BaseDirectory, @"..\"));
        Console.WriteLine("Repo root: " + repoRoot);

        // 1. Render Master 1024x1024 Bitmap
        Console.WriteLine("Rendering Master 1024x1024 Zen Squircle...");
        using (Bitmap master = RenderZenSquircle(1024))
        {
            // Master PNG
            string masterPath = Path.Combine(repoRoot, @"src\app\client\public\brand\kanso-icon.png");
            EnsureDirectory(Path.GetDirectoryName(masterPath));
            master.Save(masterPath, ImageFormat.Png);
            Console.WriteLine("Saved: " + masterPath);

            // Copy to client dist if it exists
            string distBrandIcon = Path.Combine(repoRoot, @"src\app\client\dist\brand\kanso-icon.png");
            if (Directory.Exists(Path.GetDirectoryName(distBrandIcon)))
            {
                master.Save(distBrandIcon, ImageFormat.Png);
                Console.WriteLine("Saved: " + distBrandIcon);
            }

            // Tauri 512x512
            string tauriIcon512 = Path.Combine(repoRoot, @"src\app\src-tauri\icons\icon.png");
            EnsureDirectory(Path.GetDirectoryName(tauriIcon512));
            using (Bitmap b512 = ResizeBicubic(master, 512, 512))
            {
                b512.Save(tauriIcon512, ImageFormat.Png);
            }

            // Tauri 256x256 (128x128@2x.png)
            string tauri256 = Path.Combine(repoRoot, @"src\app\src-tauri\icons\128x128@2x.png");
            using (Bitmap b256 = ResizeBicubic(master, 256, 256))
            {
                b256.Save(tauri256, ImageFormat.Png);
            }

            // Tauri 128x128
            string tauri128 = Path.Combine(repoRoot, @"src\app\src-tauri\icons\128x128.png");
            using (Bitmap b128 = ResizeBicubic(master, 128, 128))
            {
                b128.Save(tauri128, ImageFormat.Png);
            }

            // Android Companion 192x192
            string androidIcon = Path.Combine(repoRoot, @"src\android\app\src\main\res\mipmap-xxxhdpi\ic_launcher.png");
            if (Directory.Exists(Path.GetDirectoryName(androidIcon)))
            {
                using (Bitmap b192 = ResizeBicubic(master, 192, 192))
                {
                    b192.Save(androidIcon, ImageFormat.Png);
                    Console.WriteLine("Saved Android icon: " + androidIcon);
                }
            }

            // Favicon 32x32
            string tauri32 = Path.Combine(repoRoot, @"src\app\src-tauri\icons\32x32.png");
            string publicFavicon = Path.Combine(repoRoot, @"src\app\client\public\favicon.png");
            string distFavicon = Path.Combine(repoRoot, @"src\app\client\dist\favicon.png");
            using (Bitmap b32 = ResizeBicubic(master, 32, 32))
            {
                b32.Save(tauri32, ImageFormat.Png);
                b32.Save(publicFavicon, ImageFormat.Png);
                if (Directory.Exists(Path.GetDirectoryName(distFavicon)))
                {
                    b32.Save(distFavicon, ImageFormat.Png);
                }
            }
            Console.WriteLine("Saved 32x32 favicons.");

            // 2. Build multi-resolution ICO file (16, 24, 32, 48, 64, 128, 256)
            // CRITICAL WIN32 RULE: Windows Explorer GDI icon parser requires uncompressed
            // 32-bit DIB (BITMAPINFOHEADER + bottom-up BGRA + 1bpp AND mask) for resolutions <= 128.
            // PNG compression is only supported for the 256x256 frame (Vista+).
            int[] icoSizes = new int[] { 16, 24, 32, 48, 64, 128, 256 };
            List<byte[]> frames = new List<byte[]>();

            foreach (int s in icoSizes)
            {
                if (s < 256)
                {
                    // Uncompressed 32bpp DIB for standard Win32 GDI compatibility
                    frames.Add(CreateDibFrame(master, s, s));
                }
                else
                {
                    // PNG compressed for 256x256 (Windows Vista+ format)
                    using (Bitmap b256 = ResizeBicubic(master, 256, 256))
                    using (MemoryStream ms = new MemoryStream())
                    {
                        b256.Save(ms, ImageFormat.Png);
                        frames.Add(ms.ToArray());
                    }
                }
            }

            byte[] icoBytes = AssembleIco(icoSizes, frames);

            // Write icon.ico to all target locations
            string[] icoTargets = new string[]
            {
                Path.Combine(repoRoot, @"src\app\src-tauri\icons\icon.ico"),
                Path.Combine(repoRoot, @"src\windows-launcher\icon.ico"),
                Path.Combine(repoRoot, @"dist\windows\KansoCre8-v0.1.0-windows-x64\app\icon.ico")
            };

            foreach (string target in icoTargets)
            {
                EnsureDirectory(Path.GetDirectoryName(target));
                File.WriteAllBytes(target, icoBytes);
                Console.WriteLine("Saved multi-res ICO: " + target + " (" + icoBytes.Length + " bytes)");
            }
        }

        // 3. Notify Windows Explorer of icon change with SHCNF_FLUSH
        try
        {
            SHChangeNotify(0x08000000, 0x1000, IntPtr.Zero, IntPtr.Zero); // SHCNE_ASSOCCHANGED, SHCNF_FLUSH
            Console.WriteLine("Sent SHChangeNotify (SHCNE_ASSOCCHANGED | SHCNF_FLUSH) to Windows Shell.");
        }
        catch (Exception ex)
        {
            Console.WriteLine("SHChangeNotify warning: " + ex.Message);
        }

        Console.WriteLine("\n[SUCCESS] All Kanso Cre8 icons generated and installed perfectly!");
    }

    private static void EnsureDirectory(string dir)
    {
        if (!Directory.Exists(dir))
        {
            Directory.CreateDirectory(dir);
        }
    }

    public static byte[] CreateDibFrame(Bitmap src, int width, int height)
    {
        using (Bitmap scaled = ResizeBicubic(src, width, height))
        {
            int andRowBytes = ((width + 31) / 32) * 4;
            int andMaskSize = andRowBytes * height;
            int xorSize = width * height * 4;
            int totalSize = 40 + xorSize + andMaskSize;

            byte[] data = new byte[totalSize];
            using (MemoryStream ms = new MemoryStream(data))
            using (BinaryWriter bw = new BinaryWriter(ms))
            {
                // BITMAPINFOHEADER (40 bytes)
                bw.Write((uint)40);          // biSize
                bw.Write((int)width);        // biWidth
                bw.Write((int)(height * 2)); // biHeight (doubled for XOR + AND masks per ICO spec)
                bw.Write((ushort)1);         // biPlanes
                bw.Write((ushort)32);        // biBitCount
                bw.Write((uint)0);           // biCompression = BI_RGB
                bw.Write((uint)xorSize);     // biSizeImage
                bw.Write((int)0);            // biXPelsPerMeter
                bw.Write((int)0);            // biYPelsPerMeter
                bw.Write((uint)0);           // biClrUsed
                bw.Write((uint)0);           // biClrImportant

                // Bottom-up 32bpp BGRA XOR Pixels
                BitmapData bd = scaled.LockBits(
                    new Rectangle(0, 0, width, height),
                    ImageLockMode.ReadOnly,
                    PixelFormat.Format32bppArgb);

                byte[] row = new byte[width * 4];
                for (int y = height - 1; y >= 0; y--)
                {
                    IntPtr rowPtr = new IntPtr(bd.Scan0.ToInt64() + (y * bd.Stride));
                    Marshal.Copy(rowPtr, row, 0, row.Length);
                    bw.Write(row);
                }
                scaled.UnlockBits(bd);

                // 1bpp AND Mask (all 0 for 32bpp alpha channel)
                byte[] andMask = new byte[andMaskSize];
                bw.Write(andMask);
            }

            return data;
        }
    }

    public static byte[] AssembleIco(int[] sizes, List<byte[]> frames)
    {
        using (MemoryStream ms = new MemoryStream())
        using (BinaryWriter bw = new BinaryWriter(ms))
        {
            // ICONDIR Header
            bw.Write((ushort)0);            // Reserved
            bw.Write((ushort)1);            // Type = 1 (ICO)
            bw.Write((ushort)sizes.Length); // Image count

            int offset = 6 + (16 * sizes.Length);
            for (int i = 0; i < sizes.Length; i++)
            {
                int s = sizes[i];
                bw.Write((byte)(s >= 256 ? 0 : s)); // Width (0 means 256)
                bw.Write((byte)(s >= 256 ? 0 : s)); // Height (0 means 256)
                bw.Write((byte)0);                  // Color count
                bw.Write((byte)0);                  // Reserved
                bw.Write((ushort)1);                // Planes
                bw.Write((ushort)32);               // Bit count
                bw.Write((uint)frames[i].Length);   // Bytes in res
                bw.Write((uint)offset);             // Offset
                offset += frames[i].Length;
            }

            // Payloads
            for (int i = 0; i < sizes.Length; i++)
            {
                bw.Write(frames[i]);
            }

            return ms.ToArray();
        }
    }

    public static Bitmap ResizeBicubic(Bitmap src, int width, int height)
    {
        Bitmap dest = new Bitmap(width, height, PixelFormat.Format32bppArgb);
        using (Graphics g = Graphics.FromImage(dest))
        {
            g.SmoothingMode = SmoothingMode.HighQuality;
            g.InterpolationMode = InterpolationMode.HighQualityBicubic;
            g.PixelOffsetMode = PixelOffsetMode.HighQuality;
            g.Clear(Color.Transparent);
            g.DrawImage(src, new Rectangle(0, 0, width, height), 0, 0, src.Width, src.Height, GraphicsUnit.Pixel);
        }
        return dest;
    }

    public static Bitmap RenderZenSquircle(int size)
    {
        Bitmap bmp = new Bitmap(size, size, PixelFormat.Format32bppArgb);
        using (Graphics g = Graphics.FromImage(bmp))
        {
            g.SmoothingMode = SmoothingMode.HighQuality;
            g.InterpolationMode = InterpolationMode.HighQualityBicubic;
            g.PixelOffsetMode = PixelOffsetMode.HighQuality;
            g.TextRenderingHint = TextRenderingHint.AntiAliasGridFit;
            g.Clear(Color.Transparent);

            // 1. Squircle geometry
            int radius = (int)(size * 0.22f);
            int m = Math.Max(2, (int)(size * 0.015f));
            int w = size - (m * 2);

            using (GraphicsPath path = CreateSquirclePath(m, m, w, w, radius))
            {
                // Dark Titanium Zen Canvas
                using (LinearGradientBrush bgBrush = new LinearGradientBrush(
                    new Point(0, 0), new Point(0, size),
                    Color.FromArgb(255, 23, 29, 26),
                    Color.FromArgb(255, 12, 16, 14)))
                {
                    g.FillPath(bgBrush, path);
                }

                // Tactile hairline border
                float borderWidth = Math.Max(1.5f, size * 0.018f);
                using (Pen borderPen = new Pen(Color.FromArgb(255, 45, 58, 50), borderWidth))
                {
                    g.DrawPath(borderPen, path);
                }
            }

            using (StringFormat sf = new StringFormat())
            {
                sf.Alignment = StringAlignment.Center;
                sf.LineAlignment = StringAlignment.Center;

                // 2. Kanji: 簡素 (\u7C21\u7D20)
                float kanjiSize = size * 0.44f;
                float kanjiCenterY = size * 0.42f;
                float offset = Math.Max(1.5f, size * 0.012f);

                using (Font kanjiFont = new Font("Yu Gothic", kanjiSize, FontStyle.Bold, GraphicsUnit.Pixel))
                {
                    // Cyan chromatic glitch layer (-offset, 0)
                    using (SolidBrush cyanBrush = new SolidBrush(Color.FromArgb(140, 0, 229, 255)))
                    {
                        g.DrawString("\u7C21\u7D20", kanjiFont, cyanBrush, (size / 2.0f) - offset, kanjiCenterY, sf);
                    }

                    // Red chromatic glitch layer (+offset, 0)
                    using (SolidBrush redBrush = new SolidBrush(Color.FromArgb(140, 255, 23, 68)))
                    {
                        g.DrawString("\u7C21\u7D20", kanjiFont, redBrush, (size / 2.0f) + offset, kanjiCenterY, sf);
                    }

                    // Foreground Kanji: Crisp Ivory/Off-White (#F4F3EE)
                    using (SolidBrush ivoryBrush = new SolidBrush(Color.FromArgb(255, 246, 245, 240)))
                    {
                        g.DrawString("\u7C21\u7D20", kanjiFont, ivoryBrush, size / 2.0f, kanjiCenterY, sf);
                    }
                }

                // 3. Wordmark: CRE8 with letter-tracking
                float creFontSize = size * 0.18f;
                float creCenterY = size * 0.77f;
                float letterSpacing = size * 0.024f;

                using (Font creFont = new Font("Segoe UI Black", creFontSize, FontStyle.Bold, GraphicsUnit.Pixel))
                {
                    DrawTrackedWord(g, "CRE8", creFont, size / 2.0f, creCenterY, letterSpacing,
                        Color.FromArgb(255, 255, 87, 34), // Coral #FF5722
                        Color.FromArgb(120, 0, 229, 255), // Cyan glitch
                        Color.FromArgb(120, 255, 23, 68),  // Red glitch
                        offset * 0.75f, sf);
                }
            }
        }
        return bmp;
    }

    private static void DrawTrackedWord(Graphics g, string word, Font font, float centerX, float centerY,
        float tracking, Color fgColor, Color cyanColor, Color redColor, float offset, StringFormat sf)
    {
        float[] charWidths = new float[word.Length];
        float totalWidth = 0;
        for (int i = 0; i < word.Length; i++)
        {
            SizeF sz = g.MeasureString(word[i].ToString(), font);
            charWidths[i] = sz.Width * 0.78f;
            totalWidth += charWidths[i];
            if (i < word.Length - 1) totalWidth += tracking;
        }

        float curX = centerX - (totalWidth / 2.0f);
        for (int i = 0; i < word.Length; i++)
        {
            string ch = word[i].ToString();
            float charMidX = curX + (charWidths[i] / 2.0f);

            if (!cyanColor.IsEmpty)
            {
                using (SolidBrush cb = new SolidBrush(cyanColor))
                {
                    g.DrawString(ch, font, cb, charMidX - offset, centerY, sf);
                }
            }

            if (!redColor.IsEmpty)
            {
                using (SolidBrush rb = new SolidBrush(redColor))
                {
                    g.DrawString(ch, font, rb, charMidX + offset, centerY, sf);
                }
            }

            using (SolidBrush fb = new SolidBrush(fgColor))
            {
                g.DrawString(ch, font, fb, charMidX, centerY, sf);
            }

            curX += charWidths[i] + tracking;
        }
    }

    private static GraphicsPath CreateSquirclePath(int x, int y, int width, int height, int radius)
    {
        GraphicsPath path = new GraphicsPath();
        int dia = radius * 2;
        path.AddArc(x, y, dia, dia, 180, 90);
        path.AddArc(x + width - dia, y, dia, dia, 270, 90);
        path.AddArc(x + width - dia, y + height - dia, dia, dia, 0, 90);
        path.AddArc(x, y + height - dia, dia, dia, 90, 90);
        path.CloseFigure();
        return path;
    }
}
