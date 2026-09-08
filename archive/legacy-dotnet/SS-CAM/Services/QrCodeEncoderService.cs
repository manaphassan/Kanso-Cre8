using System;
using System.Collections.Generic;
using System.Drawing;
using System.Drawing.Drawing2D;
using System.Drawing.Imaging;
using System.IO;
using System.Text;
using System.Windows.Media.Imaging;

namespace SS_CAM.Services
{
    public enum QrErrorCorrectionLevel
    {
        L = 0, // ~7% recovery
        M = 1, // ~15% recovery
        Q = 2, // ~25% recovery
        H = 3  // ~30% recovery
    }

    public enum QrBodyShape
    {
        Square,
        Circle,
        Rounded,
        Dots,
        Diamond,
        Classy
    }

    public enum QrEyeFrameShape
    {
        Square,
        Circle,
        Rounded
    }

    public enum QrEyeDotShape
    {
        Square,
        Circle,
        Diamond,
        Dot
    }

    public class QrCodeOptions
    {
        public string Content { get; set; }
        public QrErrorCorrectionLevel ErrorCorrection { get; set; }
        
        // Colors
        public Color ForegroundColor { get; set; }
        public Color ForegroundColor2 { get; set; }
        public bool UseGradient { get; set; }
        public float GradientAngle { get; set; }
        public Color BackgroundColor { get; set; }
        
        public Color EyeFrameColor { get; set; }
        public Color EyeDotColor { get; set; }
        public bool CustomEyeColors { get; set; }

        // Shapes
        public QrBodyShape BodyShape { get; set; }
        public QrEyeFrameShape EyeFrameShape { get; set; }
        public QrEyeDotShape EyeDotShape { get; set; }

        // Logo
        public Bitmap LogoImage { get; set; }
        public float LogoScalePercent { get; set; }
        public bool DrawLogoBackground { get; set; }

        // Output Resolution
        public int PixelSize { get; set; }

        public QrCodeOptions()
        {
            Content = "https://suamisihat.com.my";
            ErrorCorrection = QrErrorCorrectionLevel.H;
            ForegroundColor = Color.FromArgb(255, 2, 32, 87);
            ForegroundColor2 = Color.FromArgb(255, 33, 161, 247);
            UseGradient = false;
            GradientAngle = 45f;
            BackgroundColor = Color.White;
            EyeFrameColor = Color.FromArgb(255, 2, 32, 87);
            EyeDotColor = Color.FromArgb(255, 33, 161, 247);
            CustomEyeColors = false;
            BodyShape = QrBodyShape.Square;
            EyeFrameShape = QrEyeFrameShape.Square;
            EyeDotShape = QrEyeDotShape.Square;
            LogoImage = null;
            LogoScalePercent = 0.15f;
            DrawLogoBackground = true;
            PixelSize = 600;
        }
    }

    public class QrCodeEncoderService
    {
        private static QrCodeEncoderService _instance;

        // Galois Field GF(256) Tables for Reed-Solomon
        private static readonly byte[] GfExp = new byte[512];
        private static readonly byte[] GfLog = new byte[256];

        static QrCodeEncoderService()
        {
            int x = 1;
            for (int i = 0; i < 255; i++)
            {
                GfExp[i] = (byte)x;
                GfExp[i + 255] = (byte)x;
                GfLog[x] = (byte)i;
                x <<= 1;
                if ((x & 256) != 0) x ^= 0x11D; // Primitive polynomial 285 (x^8 + x^4 + x^3 + x^2 + 1)
            }
        }

        public static QrCodeEncoderService Instance
        {
            get
            {
                if (_instance == null) _instance = new QrCodeEncoderService();
                return _instance;
            }
        }

        public double CalculateContrastRatio(Color c1, Color c2)
        {
            double l1 = GetLuminance(c1) + 0.05;
            double l2 = GetLuminance(c2) + 0.05;
            return l1 > l2 ? l1 / l2 : l2 / l1;
        }

        private static double GetLuminance(Color c)
        {
            double r = c.R / 255.0;
            double g = c.G / 255.0;
            double b = c.B / 255.0;
            r = r <= 0.03928 ? r / 12.92 : Math.Pow((r + 0.055) / 1.055, 2.4);
            g = g <= 0.03928 ? g / 12.92 : Math.Pow((g + 0.055) / 1.055, 2.4);
            b = b <= 0.03928 ? b / 12.92 : Math.Pow((b + 0.055) / 1.055, 2.4);
            return 0.2126 * r + 0.7152 * g + 0.0722 * b;
        }

        public Bitmap GenerateQrCodeBitmap(QrCodeOptions options)
        {
            if (options == null) options = new QrCodeOptions();
            if (string.IsNullOrWhiteSpace(options.Content)) options.Content = "https://suamisihat.com.my";
            bool[,] matrix = GenerateQrMatrix(options.Content, options.ErrorCorrection);

            int modules = matrix.GetLength(0);
            int quietZoneModules = 4;
            int totalModules = modules + (quietZoneModules * 2);
            int reqSize = Math.Max(200, options.PixelSize);

            int modulePixelSize = Math.Max(4, reqSize / totalModules);
            int targetSize = totalModules * modulePixelSize;
            int quietZoneOffset = quietZoneModules * modulePixelSize;

            Bitmap bmp = new Bitmap(targetSize, targetSize, PixelFormat.Format32bppArgb);

            using (Graphics g = Graphics.FromImage(bmp))
            {
                bool isSquareMode = options.BodyShape == QrBodyShape.Square && options.EyeFrameShape == QrEyeFrameShape.Square && options.EyeDotShape == QrEyeDotShape.Square;
                bool isSingleLayerMode = isSquareMode && !options.CustomEyeColors;

                if (isSquareMode)
                {
                    g.SmoothingMode = SmoothingMode.None;
                    g.InterpolationMode = InterpolationMode.NearestNeighbor;
                    g.PixelOffsetMode = PixelOffsetMode.None;
                }
                else
                {
                    g.SmoothingMode = SmoothingMode.HighQuality;
                    g.InterpolationMode = InterpolationMode.HighQualityBicubic;
                    g.PixelOffsetMode = PixelOffsetMode.HighQuality;
                }

                // 1. Draw Background
                using (SolidBrush bgBrush = new SolidBrush(options.BackgroundColor))
                {
                    g.FillRectangle(bgBrush, 0, 0, targetSize, targetSize);
                }

                // 2. Prepare Foreground Brush
                Brush fgBrush;
                if (options.UseGradient)
                {
                    fgBrush = new LinearGradientBrush(
                        new Rectangle(0, 0, targetSize, targetSize),
                        options.ForegroundColor,
                        options.ForegroundColor2,
                        options.GradientAngle);
                }
                else
                {
                    fgBrush = new SolidBrush(options.ForegroundColor);
                }

                Brush eyeFrameBrush = options.CustomEyeColors ? new SolidBrush(options.EyeFrameColor) : fgBrush;
                Brush eyeDotBrush = options.CustomEyeColors ? new SolidBrush(options.EyeDotColor) : fgBrush;
                Brush bgBrushSolid = new SolidBrush(options.BackgroundColor);

                // 3. Render QR Code (Single-Pass for Normal QR, Multi-Layer for Custom Shapes)
                if (isSingleLayerMode)
                {
                    for (int r = 0; r < modules; r++)
                    {
                        for (int c = 0; c < modules; c++)
                        {
                            if (!matrix[r, c]) continue;
                            int x = quietZoneOffset + c * modulePixelSize;
                            int y = quietZoneOffset + r * modulePixelSize;
                            g.FillRectangle(fgBrush, x, y, modulePixelSize, modulePixelSize);
                        }
                    }
                }
                else
                {
                    for (int r = 0; r < modules; r++)
                    {
                        for (int c = 0; c < modules; c++)
                        {
                            if (IsFinderPatternZone(r, c, modules)) continue;
                            if (!matrix[r, c]) continue;

                            int x = quietZoneOffset + c * modulePixelSize;
                            int y = quietZoneOffset + r * modulePixelSize;

                            RectangleF moduleRect = new RectangleF(x, y, modulePixelSize, modulePixelSize);
                            DrawBodyModule(g, fgBrush, moduleRect, options.BodyShape, modulePixelSize, matrix, r, c, modules);
                        }
                    }

                    DrawFinderEye(g, eyeFrameBrush, eyeDotBrush, quietZoneOffset, quietZoneOffset, modulePixelSize, options.EyeFrameShape, options.EyeDotShape, options.BackgroundColor);
                    DrawFinderEye(g, eyeFrameBrush, eyeDotBrush, quietZoneOffset + (modules - 7) * modulePixelSize, quietZoneOffset, modulePixelSize, options.EyeFrameShape, options.EyeDotShape, options.BackgroundColor);
                    DrawFinderEye(g, eyeFrameBrush, eyeDotBrush, quietZoneOffset, quietZoneOffset + (modules - 7) * modulePixelSize, modulePixelSize, options.EyeFrameShape, options.EyeDotShape, options.BackgroundColor);
                }

                // 4. Draw Central Logo Watermark if present
                if (options.LogoImage != null)
                {
                    DrawLogoOverlay(g, options.LogoImage, targetSize, options.LogoScalePercent, options.DrawLogoBackground, options.BackgroundColor);
                }

                fgBrush.Dispose();
                bgBrushSolid.Dispose();
                if (options.CustomEyeColors)
                {
                    eyeFrameBrush.Dispose();
                    eyeDotBrush.Dispose();
                }
            }

            return bmp;
        }

        private static bool IsFinderPatternZone(int r, int c, int modules)
        {
            // Top-Left (7x7)
            if (r < 7 && c < 7) return true;
            // Top-Right (7x7)
            if (r < 7 && c >= modules - 7) return true;
            // Bottom-Left (7x7)
            if (r >= modules - 7 && c < 7) return true;
            return false;
        }

        private void DrawBodyModule(Graphics g, Brush brush, RectangleF rect, QrBodyShape shape, float moduleSize, bool[,] matrix, int r, int c, int modules)
        {
            switch (shape)
            {
                case QrBodyShape.Circle:
                    // Full-size circle - touches adjacent module midpoints for better scannability
                    g.FillEllipse(brush, rect.X, rect.Y, rect.Width, rect.Height);
                    break;

                case QrBodyShape.Dots:
                    // Inset dot - discrete circular beads
                    float dotInset = moduleSize * 0.12f;
                    g.FillEllipse(brush, rect.X + dotInset, rect.Y + dotInset, rect.Width - dotInset * 2, rect.Height - dotInset * 2);
                    break;

                case QrBodyShape.Rounded:
                    bool hasTop = r > 0 && matrix[r - 1, c];
                    bool hasBottom = r < modules - 1 && matrix[r + 1, c];
                    bool hasLeft = c > 0 && matrix[r, c - 1];
                    bool hasRight = c < modules - 1 && matrix[r, c + 1];

                    bool roundTL = !hasTop && !hasLeft;
                    bool roundTR = !hasTop && !hasRight;
                    bool roundBR = !hasBottom && !hasRight;
                    bool roundBL = !hasBottom && !hasLeft;

                    if (!roundTL && !roundTR && !roundBR && !roundBL)
                    {
                        g.FillRectangle(brush, rect);
                    }
                    else
                    {
                        using (GraphicsPath path = CreateSelectiveRoundedRectPath(rect, moduleSize * 0.45f, roundTL, roundTR, roundBR, roundBL))
                        {
                            g.FillPath(brush, path);
                        }
                    }
                    break;
                default:
                    g.FillRectangle(brush, rect);
                    break;
            }
        }

        public BitmapImage GenerateBitmapImage(QrCodeOptions options)
        {
            using (Bitmap bmp = GenerateQrCodeBitmap(options))
            {
                using (MemoryStream ms = new MemoryStream())
                {
                    bmp.Save(ms, ImageFormat.Png);
                    ms.Position = 0;

                    BitmapImage bi = new BitmapImage();
                    bi.BeginInit();
                    bi.CacheOption = BitmapCacheOption.OnLoad;
                    bi.StreamSource = ms;
                    bi.EndInit();
                    bi.Freeze();
                    return bi;
                }
            }
        }

        /// <summary>
        /// Generates a resolution-independent native WPF vector DrawingImage for WPF Image controls.
        /// As recommended in StackOverflow & DevExpress WPF BarCodeEdit patterns.
        /// </summary>
        public System.Windows.Media.DrawingImage GenerateDrawingImage(QrCodeOptions options)
        {
            if (options == null) options = new QrCodeOptions();

            if (string.IsNullOrWhiteSpace(options.Content)) options.Content = "https://suamisihat.com.my";
            bool[,] matrix = GenerateQrMatrix(options.Content, options.ErrorCorrection);

            int modules = matrix.GetLength(0);
            int quietZoneModules = 4;
            int totalModules = modules + (quietZoneModules * 2);

            double targetSize = Math.Max(300, options.PixelSize);
            double moduleSize = targetSize / totalModules;
            double quietZoneOffset = quietZoneModules * moduleSize;

            System.Windows.Media.DrawingGroup group = new System.Windows.Media.DrawingGroup();

            // 1. Background Geometry
            System.Windows.Media.Color wpfBgColor = System.Windows.Media.Color.FromArgb(
                options.BackgroundColor.A, options.BackgroundColor.R, options.BackgroundColor.G, options.BackgroundColor.B);
            group.Children.Add(new System.Windows.Media.GeometryDrawing(
                new System.Windows.Media.SolidColorBrush(wpfBgColor),
                null,
                new System.Windows.Media.RectangleGeometry(new System.Windows.Rect(0, 0, targetSize, targetSize))));

            // 2. Foreground Geometry
            System.Windows.Media.Color wpfFg1 = System.Windows.Media.Color.FromArgb(
                options.ForegroundColor.A, options.ForegroundColor.R, options.ForegroundColor.G, options.ForegroundColor.B);
            System.Windows.Media.Color wpfFg2 = System.Windows.Media.Color.FromArgb(
                options.ForegroundColor2.A, options.ForegroundColor2.R, options.ForegroundColor2.G, options.ForegroundColor2.B);

            System.Windows.Media.Brush fgBrush;
            if (options.UseGradient)
            {
                fgBrush = new System.Windows.Media.LinearGradientBrush(
                    wpfFg1, wpfFg2, new System.Windows.Point(0, 0), new System.Windows.Point(1, 1));
            }
            else
            {
                fgBrush = new System.Windows.Media.SolidColorBrush(wpfFg1);
            }

            bool isSquareMode = options.BodyShape == QrBodyShape.Square && options.EyeFrameShape == QrEyeFrameShape.Square && options.EyeDotShape == QrEyeDotShape.Square;
            bool isSingleLayerMode = isSquareMode && !options.CustomEyeColors;

            System.Windows.Media.StreamGeometry bodyGeometry = new System.Windows.Media.StreamGeometry();
            using (System.Windows.Media.StreamGeometryContext ctx = bodyGeometry.Open())
            {
                for (int r = 0; r < modules; r++)
                {
                    for (int c = 0; c < modules; c++)
                    {
                        if (!isSingleLayerMode && IsFinderPatternZone(r, c, modules)) continue;
                        if (!matrix[r, c]) continue;

                        double x = quietZoneOffset + c * moduleSize;
                        double y = quietZoneOffset + r * moduleSize;

                        if (options.BodyShape == QrBodyShape.Rounded && !isSingleLayerMode)
                        {
                            bool hasTop = r > 0 && matrix[r - 1, c];
                            bool hasBottom = r < modules - 1 && matrix[r + 1, c];
                            bool hasLeft = c > 0 && matrix[r, c - 1];
                            bool hasRight = c < modules - 1 && matrix[r, c + 1];

                            bool roundTL = !hasTop && !hasLeft;
                            bool roundTR = !hasTop && !hasRight;
                            bool roundBR = !hasBottom && !hasRight;
                            bool roundBL = !hasBottom && !hasLeft;

                            double rx = moduleSize * 0.45;
                            if (!roundTL && !roundTR && !roundBR && !roundBL)
                            {
                                ctx.BeginFigure(new System.Windows.Point(x, y), true, true);
                                ctx.LineTo(new System.Windows.Point(x + moduleSize, y), true, false);
                                ctx.LineTo(new System.Windows.Point(x + moduleSize, y + moduleSize), true, false);
                                ctx.LineTo(new System.Windows.Point(x, y + moduleSize), true, false);
                            }
                            else
                            {
                                ctx.BeginFigure(new System.Windows.Point(x + (roundTL ? rx : 0), y), true, true);

                                // Top Edge -> Top-Right Corner
                                ctx.LineTo(new System.Windows.Point(x + moduleSize - (roundTR ? rx : 0), y), true, false);
                                if (roundTR) ctx.ArcTo(new System.Windows.Point(x + moduleSize, y + rx), new System.Windows.Size(rx, rx), 0, false, System.Windows.Media.SweepDirection.Clockwise, true, false);

                                // Right Edge -> Bottom-Right Corner
                                ctx.LineTo(new System.Windows.Point(x + moduleSize, y + moduleSize - (roundBR ? rx : 0)), true, false);
                                if (roundBR) ctx.ArcTo(new System.Windows.Point(x + moduleSize - rx, y + moduleSize), new System.Windows.Size(rx, rx), 0, false, System.Windows.Media.SweepDirection.Clockwise, true, false);

                                // Bottom Edge -> Bottom-Left Corner
                                ctx.LineTo(new System.Windows.Point(x + (roundBL ? rx : 0), y + moduleSize), true, false);
                                if (roundBL) ctx.ArcTo(new System.Windows.Point(x, y + moduleSize - rx), new System.Windows.Size(rx, rx), 0, false, System.Windows.Media.SweepDirection.Clockwise, true, false);

                                // Left Edge -> Top-Left Corner
                                ctx.LineTo(new System.Windows.Point(x, y + (roundTL ? rx : 0)), true, false);
                                if (roundTL) ctx.ArcTo(new System.Windows.Point(x + rx, y), new System.Windows.Size(rx, rx), 0, false, System.Windows.Media.SweepDirection.Clockwise, true, false);
                            }
                        }
                        else
                        {
                            ctx.BeginFigure(new System.Windows.Point(x, y), true, true);
                            ctx.LineTo(new System.Windows.Point(x + moduleSize, y), true, false);
                            ctx.LineTo(new System.Windows.Point(x + moduleSize, y + moduleSize), true, false);
                            ctx.LineTo(new System.Windows.Point(x, y + moduleSize), true, false);
                        }
                    }
                }
            }
            bodyGeometry.Freeze();
            group.Children.Add(new System.Windows.Media.GeometryDrawing(fgBrush, null, bodyGeometry));

            if (!isSingleLayerMode)
            {
                // 3. Vector Finder Eyes
                System.Windows.Media.Brush frameBrush = options.CustomEyeColors ?
                    new System.Windows.Media.SolidColorBrush(System.Windows.Media.Color.FromArgb(options.EyeFrameColor.A, options.EyeFrameColor.R, options.EyeFrameColor.G, options.EyeFrameColor.B)) : fgBrush;
                System.Windows.Media.Brush dotBrush = options.CustomEyeColors ?
                    new System.Windows.Media.SolidColorBrush(System.Windows.Media.Color.FromArgb(options.EyeDotColor.A, options.EyeDotColor.R, options.EyeDotColor.G, options.EyeDotColor.B)) : fgBrush;
                System.Windows.Media.Brush bgBrush = new System.Windows.Media.SolidColorBrush(wpfBgColor);

                AppendWpfFinderEye(group, quietZoneOffset, quietZoneOffset, moduleSize, options.EyeFrameShape, options.EyeDotShape, frameBrush, dotBrush, bgBrush);
                AppendWpfFinderEye(group, quietZoneOffset + (modules - 7) * moduleSize, quietZoneOffset, moduleSize, options.EyeFrameShape, options.EyeDotShape, frameBrush, dotBrush, bgBrush);
                AppendWpfFinderEye(group, quietZoneOffset, quietZoneOffset + (modules - 7) * moduleSize, moduleSize, options.EyeFrameShape, options.EyeDotShape, frameBrush, dotBrush, bgBrush);
            }

            group.Freeze();
            return new System.Windows.Media.DrawingImage(group);
        }

        private static void AppendWpfFinderEye(
            System.Windows.Media.DrawingGroup group,
            double originX,
            double originY,
            double moduleSize,
            QrEyeFrameShape frameShape,
            QrEyeDotShape dotShape,
            System.Windows.Media.Brush frameBrush,
            System.Windows.Media.Brush dotBrush,
            System.Windows.Media.Brush bgBrush)
        {
            double outerSize = moduleSize * 7.0;
            double innerMargin = moduleSize * 1.0;
            double innerSize = moduleSize * 5.0;
            double centerMargin = moduleSize * 2.0;
            double centerSize = moduleSize * 3.0;

            System.Windows.Rect outerRect = new System.Windows.Rect(originX, originY, outerSize, outerSize);
            System.Windows.Rect innerRect = new System.Windows.Rect(originX + innerMargin, originY + innerMargin, innerSize, innerSize);
            System.Windows.Rect centerRect = new System.Windows.Rect(originX + centerMargin, originY + centerMargin, centerSize, centerSize);

            // 1. Clear 7x7 outer bounds first to erase any underlying matrix pixels
            group.Children.Add(new System.Windows.Media.GeometryDrawing(bgBrush, null, new System.Windows.Media.RectangleGeometry(outerRect)));

            // 2. Outer Frame & Inner Hole
            if (frameShape == QrEyeFrameShape.Circle)
            {
                group.Children.Add(new System.Windows.Media.GeometryDrawing(frameBrush, null, new System.Windows.Media.EllipseGeometry(outerRect)));
                group.Children.Add(new System.Windows.Media.GeometryDrawing(bgBrush, null, new System.Windows.Media.EllipseGeometry(innerRect)));
            }
            else if (frameShape == QrEyeFrameShape.Rounded)
            {
                double rxOuter = moduleSize * 2.5;
                double rxInner = moduleSize * 1.5;
                group.Children.Add(new System.Windows.Media.GeometryDrawing(frameBrush, null, new System.Windows.Media.RectangleGeometry(outerRect, rxOuter, rxOuter)));
                group.Children.Add(new System.Windows.Media.GeometryDrawing(bgBrush, null, new System.Windows.Media.RectangleGeometry(innerRect, rxInner, rxInner)));
            }
            else
            {
                group.Children.Add(new System.Windows.Media.GeometryDrawing(frameBrush, null, new System.Windows.Media.RectangleGeometry(outerRect)));
                group.Children.Add(new System.Windows.Media.GeometryDrawing(bgBrush, null, new System.Windows.Media.RectangleGeometry(innerRect)));
            }

            // 3. Center Dot
            if (dotShape == QrEyeDotShape.Circle || dotShape == QrEyeDotShape.Dot)
            {
                group.Children.Add(new System.Windows.Media.GeometryDrawing(dotBrush, null, new System.Windows.Media.EllipseGeometry(centerRect)));
            }
            else if (dotShape == QrEyeDotShape.Diamond)
            {
                System.Windows.Media.StreamGeometry diamondGeo = new System.Windows.Media.StreamGeometry();
                using (var ctx = diamondGeo.Open())
                {
                    ctx.BeginFigure(new System.Windows.Point(centerRect.Left + centerRect.Width / 2.0, centerRect.Top), true, true);
                    ctx.LineTo(new System.Windows.Point(centerRect.Right, centerRect.Top + centerRect.Height / 2.0), true, false);
                    ctx.LineTo(new System.Windows.Point(centerRect.Left + centerRect.Width / 2.0, centerRect.Bottom), true, false);
                    ctx.LineTo(new System.Windows.Point(centerRect.Left, centerRect.Top + centerRect.Height / 2.0), true, false);
                }
                diamondGeo.Freeze();
                group.Children.Add(new System.Windows.Media.GeometryDrawing(dotBrush, null, diamondGeo));
            }
            else
            {
                group.Children.Add(new System.Windows.Media.GeometryDrawing(dotBrush, null, new System.Windows.Media.RectangleGeometry(centerRect)));
            }
        }

        public string GenerateSvgXml(QrCodeOptions options)
        {
            if (options == null) options = new QrCodeOptions();
            
            if (string.IsNullOrWhiteSpace(options.Content)) options.Content = "https://suamisihat.com.my";
            bool[,] matrix = GenerateQrMatrix(options.Content, options.ErrorCorrection);

            int modules = matrix.GetLength(0);
            int quietZoneModules = 4;
            int totalModules = modules + (quietZoneModules * 2);
            int size = Math.Max(300, options.PixelSize);
            float moduleSize = (float)size / totalModules;
            float quietZoneOffset = quietZoneModules * moduleSize;

            string fgHex = ColorToHex(options.ForegroundColor);
            string fg2Hex = ColorToHex(options.ForegroundColor2);
            string bgHex = ColorToHex(options.BackgroundColor);

            StringBuilder svg = new StringBuilder();
            svg.AppendLine(string.Format("<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"{0}\" height=\"{1}\" viewBox=\"0 0 {0} {1}\">", size, size));
            
            if (options.UseGradient)
            {
                svg.AppendLine("  <defs>");
                svg.AppendLine("    <linearGradient id=\"qrGrad\" x1=\"0%\" y1=\"0%\" x2=\"100%\" y2=\"100%\">");
                svg.AppendLine(string.Format("      <stop offset=\"0%\" stop-color=\"{0}\"/>", fgHex));
                svg.AppendLine(string.Format("      <stop offset=\"100%\" stop-color=\"{0}\"/>", fg2Hex));
                svg.AppendLine("    </linearGradient>");
                svg.AppendLine("  </defs>");
            }

            svg.AppendLine(string.Format("  <rect width=\"100%\" height=\"100%\" fill=\"{0}\"/>", bgHex));

            string fillRef = options.UseGradient ? "url(#qrGrad)" : fgHex;
            string eyeFrameHex = options.CustomEyeColors ? ColorToHex(options.EyeFrameColor) : fillRef;
            string eyeDotHex = options.CustomEyeColors ? ColorToHex(options.EyeDotColor) : fillRef;

            // 1. Render Body Modules
            bool isSquareMode = options.BodyShape == QrBodyShape.Square && options.EyeFrameShape == QrEyeFrameShape.Square && options.EyeDotShape == QrEyeDotShape.Square;
            bool isSingleLayerMode = isSquareMode && !options.CustomEyeColors;

            if (options.BodyShape == QrBodyShape.Square)
            {
                // Compact SVG Path Method (like datalog/qrcode-svg)
                StringBuilder pathData = new StringBuilder();
                for (int r = 0; r < modules; r++)
                {
                    for (int c = 0; c < modules; c++)
                    {
                        if (!isSingleLayerMode && IsFinderPatternZone(r, c, modules)) continue;
                        if (!matrix[r, c]) continue;

                        float x = quietZoneOffset + c * moduleSize;
                        float y = quietZoneOffset + r * moduleSize;
                        pathData.Append(string.Format("M{0:F2},{1:F2}h{2:F2}v{2:F2}h-{2:F2}z ", x, y, moduleSize));
                    }
                }
                if (pathData.Length > 0)
                {
                    svg.AppendLine(string.Format("  <path d=\"{0}\" fill=\"{1}\"/>", pathData.ToString().TrimEnd(), fillRef));
                }
            }
            else
            {
                for (int r = 0; r < modules; r++)
                {
                    for (int c = 0; c < modules; c++)
                    {
                        if (IsFinderPatternZone(r, c, modules)) continue;
                        if (!matrix[r, c]) continue;

                        float x = quietZoneOffset + c * moduleSize;
                        float y = quietZoneOffset + r * moduleSize;

                        if (options.BodyShape == QrBodyShape.Circle || options.BodyShape == QrBodyShape.Dots)
                        {
                            float cx = x + moduleSize / 2f;
                            float cy = y + moduleSize / 2f;
                            float rRadius = moduleSize / 2.2f;
                            svg.AppendLine(string.Format("  <circle cx=\"{0:F2}\" cy=\"{1:F2}\" r=\"{2:F2}\" fill=\"{3}\"/>", cx, cy, rRadius, fillRef));
                        }
                        else if (options.BodyShape == QrBodyShape.Rounded)
                        {
                            float rx = moduleSize * 0.35f;
                            svg.AppendLine(string.Format("  <rect x=\"{0:F2}\" y=\"{1:F2}\" width=\"{2:F2}\" height=\"{2:F2}\" rx=\"{3:F2}\" ry=\"{3:F2}\" fill=\"{4}\"/>", x, y, moduleSize, rx, fillRef));
                        }
                        else
                        {
                            svg.AppendLine(string.Format("  <rect x=\"{0:F2}\" y=\"{1:F2}\" width=\"{2:F2}\" height=\"{2:F2}\" fill=\"{3}\"/>", x, y, moduleSize, fillRef));
                        }
                    }
                }
            }

            if (!isSingleLayerMode)
            {
                // 2. Render Finder Eye Patterns (Top-Left, Top-Right, Bottom-Left)
                AppendSvgFinderEye(svg, quietZoneOffset, quietZoneOffset, moduleSize, options.EyeFrameShape, options.EyeDotShape, eyeFrameHex, eyeDotHex, bgHex);
                AppendSvgFinderEye(svg, quietZoneOffset + (modules - 7) * moduleSize, quietZoneOffset, moduleSize, options.EyeFrameShape, options.EyeDotShape, eyeFrameHex, eyeDotHex, bgHex);
                AppendSvgFinderEye(svg, quietZoneOffset, quietZoneOffset + (modules - 7) * moduleSize, moduleSize, options.EyeFrameShape, options.EyeDotShape, eyeFrameHex, eyeDotHex, bgHex);
            }

            // 3. Render Circular Logo Background Pad if present
            if (options.LogoImage != null && options.DrawLogoBackground)
            {
                float logoSize = size * options.LogoScalePercent;
                float lx = (size - logoSize) / 2f;
                float ly = (size - logoSize) / 2f;
                float bgMargin = logoSize * 0.12f;
                float cx = lx + logoSize / 2f;
                float cy = ly + logoSize / 2f;
                float cr = (logoSize + bgMargin * 2) / 2f;
                svg.AppendLine(string.Format("  <circle cx=\"{0:F2}\" cy=\"{1:F2}\" r=\"{2:F2}\" fill=\"{3}\"/>", cx, cy, cr, bgHex));
            }

            svg.AppendLine("</svg>");
            return svg.ToString();
        }

        private static void AppendSvgFinderEye(StringBuilder svg, float originX, float originY, float moduleSize, QrEyeFrameShape frameShape, QrEyeDotShape dotShape, string frameHex, string dotHex, string bgHex)
        {
            float outerSize = moduleSize * 7f;
            float innerMargin = moduleSize * 1.0f;
            float innerSize = moduleSize * 5f;
            float centerMargin = moduleSize * 2.0f;
            float centerSize = moduleSize * 3f;

            if (frameShape == QrEyeFrameShape.Circle)
            {
                float cx = originX + outerSize / 2f;
                float cy = originY + outerSize / 2f;
                svg.AppendLine(string.Format("  <circle cx=\"{0:F2}\" cy=\"{1:F2}\" r=\"{2:F2}\" fill=\"{3}\"/>", cx, cy, outerSize / 2f, frameHex));
                svg.AppendLine(string.Format("  <circle cx=\"{0:F2}\" cy=\"{1:F2}\" r=\"{2:F2}\" fill=\"{3}\"/>", cx, cy, innerSize / 2f, bgHex));
            }
            else if (frameShape == QrEyeFrameShape.Rounded)
            {
                float rx = moduleSize * 1.8f;
                float irx = moduleSize * 1.2f;
                svg.AppendLine(string.Format("  <rect x=\"{0:F2}\" y=\"{1:F2}\" width=\"{2:F2}\" height=\"{2:F2}\" rx=\"{3:F2}\" ry=\"{3:F2}\" fill=\"{4}\"/>", originX, originY, outerSize, rx, frameHex));
                svg.AppendLine(string.Format("  <rect x=\"{0:F2}\" y=\"{1:F2}\" width=\"{2:F2}\" height=\"{2:F2}\" rx=\"{3:F2}\" ry=\"{3:F2}\" fill=\"{4}\"/>", originX + innerMargin, originY + innerMargin, innerSize, irx, bgHex));
            }
            else
            {
                svg.AppendLine(string.Format("  <rect x=\"{0:F2}\" y=\"{1:F2}\" width=\"{2:F2}\" height=\"{2:F2}\" fill=\"{3}\"/>", originX, originY, outerSize, frameHex));
                svg.AppendLine(string.Format("  <rect x=\"{0:F2}\" y=\"{1:F2}\" width=\"{2:F2}\" height=\"{2:F2}\" fill=\"{3}\"/>", originX + innerMargin, originY + innerMargin, innerSize, bgHex));
            }

            if (dotShape == QrEyeDotShape.Circle || dotShape == QrEyeDotShape.Dot)
            {
                float cx = originX + outerSize / 2f;
                float cy = originY + outerSize / 2f;
                svg.AppendLine(string.Format("  <circle cx=\"{0:F2}\" cy=\"{1:F2}\" r=\"{2:F2}\" fill=\"{3}\"/>", cx, cy, centerSize / 2f, dotHex));
            }
            else
            {
                svg.AppendLine(string.Format("  <rect x=\"{0:F2}\" y=\"{1:F2}\" width=\"{2:F2}\" height=\"{2:F2}\" fill=\"{3}\"/>", originX + centerMargin, originY + centerMargin, centerSize, dotHex));
            }
        }

        private void DrawFinderEye(Graphics g, Brush frameBrush, Brush dotBrush, float originX, float originY, float moduleSize, QrEyeFrameShape frameShape, QrEyeDotShape dotShape, Color bgColor)
        {
            float outerSize = moduleSize * 7f;
            float innerMargin = moduleSize * 1.0f;
            float innerSize = moduleSize * 5f;
            float centerMargin = moduleSize * 2.0f;
            float centerSize = moduleSize * 3f;

            RectangleF outerRect = new RectangleF(originX, originY, outerSize, outerSize);
            RectangleF innerRect = new RectangleF(originX + innerMargin, originY + innerMargin, innerSize, innerSize);
            RectangleF centerRect = new RectangleF(originX + centerMargin, originY + centerMargin, centerSize, centerSize);

            using (SolidBrush innerBgBrush = new SolidBrush(bgColor))
            {
                // Clear 7x7 outer bounds first to prevent underlying matrix pixels from bleeding through
                g.FillRectangle(innerBgBrush, outerRect);

                // Outer Frame
                if (frameShape == QrEyeFrameShape.Circle)
                {
                    g.FillEllipse(frameBrush, outerRect);
                    g.FillEllipse(innerBgBrush, innerRect);
                }
                else if (frameShape == QrEyeFrameShape.Rounded)
                {
                    using (GraphicsPath pOuter = CreateRoundedRectPath(outerRect, moduleSize * 2.5f))
                    using (GraphicsPath pInner = CreateRoundedRectPath(innerRect, moduleSize * 1.5f))
                    {
                        g.FillPath(frameBrush, pOuter);
                        g.FillPath(innerBgBrush, pInner);
                    }
                }
                else
                {
                    g.FillRectangle(frameBrush, outerRect);
                    g.FillRectangle(innerBgBrush, innerRect);
                }

                // Inner Center Dot
                if (dotShape == QrEyeDotShape.Circle || dotShape == QrEyeDotShape.Dot)
                {
                    g.FillEllipse(dotBrush, centerRect);
                }
                else if (dotShape == QrEyeDotShape.Diamond)
                {
                    PointF[] diamond = new PointF[]
                    {
                        new PointF(centerRect.X + centerRect.Width / 2f, centerRect.Y),
                        new PointF(centerRect.Right, centerRect.Y + centerRect.Height / 2f),
                        new PointF(centerRect.X + centerRect.Width / 2f, centerRect.Bottom),
                        new PointF(centerRect.X, centerRect.Y + centerRect.Height / 2f)
                    };
                    g.FillPolygon(dotBrush, diamond);
                }
                else
                {
                    g.FillRectangle(dotBrush, centerRect);
                }
            }
        }

        private void DrawLogoOverlay(Graphics g, Bitmap logo, int targetSize, float scalePercent, bool drawBackground, Color bgColor)
        {
            float logoSize = targetSize * scalePercent;
            float x = (targetSize - logoSize) / 2f;
            float y = (targetSize - logoSize) / 2f;
            RectangleF logoRect = new RectangleF(x, y, logoSize, logoSize);

            if (drawBackground)
            {
                float bgMargin = logoSize * 0.12f;
                RectangleF bgRect = new RectangleF(x - bgMargin, y - bgMargin, logoSize + bgMargin * 2, logoSize + bgMargin * 2);
                using (SolidBrush brush = new SolidBrush(bgColor))
                {
                    g.FillEllipse(brush, bgRect);
                }
            }

            g.DrawImage(logo, logoRect);
        }

        private static GraphicsPath CreateRoundedRectPath(RectangleF rect, float cornerRadius)
        {
            GraphicsPath path = new GraphicsPath();
            float diameter = cornerRadius * 2f;
            if (diameter > rect.Width) diameter = rect.Width;
            if (diameter > rect.Height) diameter = rect.Height;

            path.AddArc(rect.X, rect.Y, diameter, diameter, 180, 90);
            path.AddArc(rect.Right - diameter, rect.Y, diameter, diameter, 270, 90);
            path.AddArc(rect.Right - diameter, rect.Bottom - diameter, diameter, diameter, 0, 90);
            path.AddArc(rect.X, rect.Bottom - diameter, diameter, diameter, 90, 90);
            path.CloseFigure();
            return path;
        }

        private static GraphicsPath CreateSelectiveRoundedRectPath(
            RectangleF rect,
            float cornerRadius,
            bool roundTL,
            bool roundTR,
            bool roundBR,
            bool roundBL)
        {
            GraphicsPath path = new GraphicsPath();
            float diameter = cornerRadius * 2f;
            if (diameter > rect.Width) diameter = rect.Width;
            if (diameter > rect.Height) diameter = rect.Height;

            // Top-Left Corner
            if (roundTL && diameter > 0)
                path.AddArc(rect.X, rect.Y, diameter, diameter, 180, 90);
            else
                path.AddLine(rect.X, rect.Y, rect.X + diameter / 2f, rect.Y);

            // Top-Right Corner
            if (roundTR && diameter > 0)
                path.AddArc(rect.Right - diameter, rect.Y, diameter, diameter, 270, 90);
            else
                path.AddLine(rect.Right, rect.Y, rect.Right, rect.Y + diameter / 2f);

            // Bottom-Right Corner
            if (roundBR && diameter > 0)
                path.AddArc(rect.Right - diameter, rect.Bottom - diameter, diameter, diameter, 0, 90);
            else
                path.AddLine(rect.Right, rect.Bottom, rect.Right - diameter / 2f, rect.Bottom);

            // Bottom-Left Corner
            if (roundBL && diameter > 0)
                path.AddArc(rect.X, rect.Bottom - diameter, diameter, diameter, 90, 90);
            else
                path.AddLine(rect.X, rect.Bottom, rect.X, rect.Bottom - diameter / 2f);

            path.CloseFigure();
            return path;
        }

        private static string ColorToHex(Color c)
        {
            return string.Format("#{0:X2}{1:X2}{2:X2}", c.R, c.G, c.B);
        }

        #region ISO/IEC 18004 Standard QR Code Matrix Generator with Reed-Solomon & Mask 0

        private static byte GfMul(byte a, byte b)
        {
            if (a == 0 || b == 0) return 0;
            return GfExp[GfLog[a] + GfLog[b]];
        }

        private static byte[] RsGeneratorPoly(int degree)
        {
            byte[] poly = new byte[] { 1 };
            for (int i = 0; i < degree; i++)
            {
                byte[] next = new byte[poly.Length + 1];
                byte root = GfExp[i];

                next[0] = poly[0];
                for (int j = 1; j < poly.Length; j++)
                {
                    next[j] = (byte)(poly[j] ^ GfMul(poly[j - 1], root));
                }
                next[poly.Length] = GfMul(poly[poly.Length - 1], root);

                poly = next;
            }
            return poly;
        }

        private static byte[] CalculateReedSolomon(byte[] data, int eccCount)
        {
            byte[] gen = RsGeneratorPoly(eccCount);
            byte[] res = new byte[eccCount];

            foreach (byte b in data)
            {
                byte factor = (byte)(b ^ res[0]);
                Array.Copy(res, 1, res, 0, eccCount - 1);
                res[eccCount - 1] = 0;

                if (factor != 0)
                {
                    for (int i = 0; i < eccCount; i++)
                    {
                        res[i] ^= GfMul(gen[i + 1], factor);
                    }
                }
            }
            return res;
        }

        private bool[,] GenerateQrMatrix(string text, QrErrorCorrectionLevel ecLevel)
        {
            if (string.IsNullOrEmpty(text)) text = "https://suamisihat.com.my";

            try
            {
                QRCoder.QRCodeGenerator.ECCLevel ecc;
                switch (ecLevel)
                {
                    case QrErrorCorrectionLevel.L: ecc = QRCoder.QRCodeGenerator.ECCLevel.L; break;
                    case QrErrorCorrectionLevel.M: ecc = QRCoder.QRCodeGenerator.ECCLevel.M; break;
                    case QrErrorCorrectionLevel.Q: ecc = QRCoder.QRCodeGenerator.ECCLevel.Q; break;
                    case QrErrorCorrectionLevel.H: default: ecc = QRCoder.QRCodeGenerator.ECCLevel.H; break;
                }

                using (QRCoder.QRCodeGenerator qrGen = new QRCoder.QRCodeGenerator())
                using (QRCoder.QRCodeData qrData = qrGen.CreateQrCode(text, ecc))
                {
                    int modules = qrData.ModuleMatrix.Count;
                    bool[,] matrix = new bool[modules, modules];
                    for (int r = 0; r < modules; r++)
                    {
                        System.Collections.BitArray row = qrData.ModuleMatrix[r];
                        for (int c = 0; c < modules; c++)
                        {
                            matrix[r, c] = row[c];
                        }
                    }
                    return matrix;
                }
            }
            catch (Exception ex)
            {
                System.Diagnostics.Debug.WriteLine("[QrCodeEncoderService] GenerateQrMatrix: " + ex.Message);
                return new bool[21, 21];
            }
        }

        private static void PlaceFinderWithSeparator(bool[,] matrix, bool[,] reserved, int r, int c, int size)
        {
            // 7x7 Finder Pattern
            for (int dr = 0; dr < 7; dr++)
            {
                for (int dc = 0; dc < 7; dc++)
                {
                    bool isDark = (dr == 0 || dr == 6 || dc == 0 || dc == 6) || (dr >= 2 && dr <= 4 && dc >= 2 && dc <= 4);
                    matrix[r + dr, c + dc] = isDark;
                    reserved[r + dr, c + dc] = true;
                }
            }

            // 1-Module White Quiet Separator Border around Finder Pattern
            for (int dr = -1; dr <= 7; dr++)
            {
                for (int dc = -1; dc <= 7; dc++)
                {
                    if (dr >= 0 && dr < 7 && dc >= 0 && dc < 7) continue;
                    int nr = r + dr;
                    int nc = c + dc;
                    if (nr >= 0 && nr < size && nc >= 0 && nc < size)
                    {
                        matrix[nr, nc] = false;
                        reserved[nr, nc] = true;
                    }
                }
            }
        }

        public struct QrBlockSpec
        {
            public int Version;
            public QrErrorCorrectionLevel EcLevel;
            public int TotalData;
            public int TotalEcc;
            public int Group1Blocks;
            public int Group1DataPerBlock;
            public int Group2Blocks;
            public int Group2DataPerBlock;
            public int EccPerBlock;
        }

        private static QrBlockSpec GetBlockSpec(int byteCount, QrErrorCorrectionLevel ecLevel)
        {
            // Table of ISO/IEC 18004 Block Specs for Versions 1..10
            // Format: Version, Level, TotalData, TotalEcc, G1Blocks, G1Data, G2Blocks, G2Data, EccPerBlock
            QrBlockSpec[] table = new QrBlockSpec[]
            {
                // Version 1
                new QrBlockSpec { Version=1, EcLevel=QrErrorCorrectionLevel.L, TotalData=19, TotalEcc=7,   Group1Blocks=1, Group1DataPerBlock=19, Group2Blocks=0, Group2DataPerBlock=0,  EccPerBlock=7 },
                new QrBlockSpec { Version=1, EcLevel=QrErrorCorrectionLevel.M, TotalData=16, TotalEcc=10,  Group1Blocks=1, Group1DataPerBlock=16, Group2Blocks=0, Group2DataPerBlock=0,  EccPerBlock=10 },
                new QrBlockSpec { Version=1, EcLevel=QrErrorCorrectionLevel.Q, TotalData=13, TotalEcc=13,  Group1Blocks=1, Group1DataPerBlock=13, Group2Blocks=0, Group2DataPerBlock=0,  EccPerBlock=13 },
                new QrBlockSpec { Version=1, EcLevel=QrErrorCorrectionLevel.H, TotalData=9,  TotalEcc=17,  Group1Blocks=1, Group1DataPerBlock=9,  Group2Blocks=0, Group2DataPerBlock=0,  EccPerBlock=17 },

                // Version 2
                new QrBlockSpec { Version=2, EcLevel=QrErrorCorrectionLevel.L, TotalData=34, TotalEcc=10,  Group1Blocks=1, Group1DataPerBlock=34, Group2Blocks=0, Group2DataPerBlock=0,  EccPerBlock=10 },
                new QrBlockSpec { Version=2, EcLevel=QrErrorCorrectionLevel.M, TotalData=28, TotalEcc=16,  Group1Blocks=1, Group1DataPerBlock=28, Group2Blocks=0, Group2DataPerBlock=0,  EccPerBlock=16 },
                new QrBlockSpec { Version=2, EcLevel=QrErrorCorrectionLevel.Q, TotalData=22, TotalEcc=22,  Group1Blocks=1, Group1DataPerBlock=22, Group2Blocks=0, Group2DataPerBlock=0,  EccPerBlock=22 },
                new QrBlockSpec { Version=2, EcLevel=QrErrorCorrectionLevel.H, TotalData=16, TotalEcc=28,  Group1Blocks=1, Group1DataPerBlock=16, Group2Blocks=0, Group2DataPerBlock=0,  EccPerBlock=28 },

                // Version 3
                new QrBlockSpec { Version=3, EcLevel=QrErrorCorrectionLevel.L, TotalData=55, TotalEcc=15,  Group1Blocks=1, Group1DataPerBlock=55, Group2Blocks=0, Group2DataPerBlock=0,  EccPerBlock=15 },
                new QrBlockSpec { Version=3, EcLevel=QrErrorCorrectionLevel.M, TotalData=44, TotalEcc=26,  Group1Blocks=1, Group1DataPerBlock=44, Group2Blocks=0, Group2DataPerBlock=0,  EccPerBlock=26 },
                new QrBlockSpec { Version=3, EcLevel=QrErrorCorrectionLevel.Q, TotalData=34, TotalEcc=36,  Group1Blocks=2, Group1DataPerBlock=17, Group2Blocks=0, Group2DataPerBlock=0,  EccPerBlock=18 },
                new QrBlockSpec { Version=3, EcLevel=QrErrorCorrectionLevel.H, TotalData=26, TotalEcc=44,  Group1Blocks=2, Group1DataPerBlock=13, Group2Blocks=0, Group2DataPerBlock=0,  EccPerBlock=22 },

                // Version 4
                new QrBlockSpec { Version=4, EcLevel=QrErrorCorrectionLevel.L, TotalData=80, TotalEcc=20,  Group1Blocks=1, Group1DataPerBlock=80, Group2Blocks=0, Group2DataPerBlock=0,  EccPerBlock=20 },
                new QrBlockSpec { Version=4, EcLevel=QrErrorCorrectionLevel.M, TotalData=64, TotalEcc=36,  Group1Blocks=2, Group1DataPerBlock=32, Group2Blocks=0, Group2DataPerBlock=0,  EccPerBlock=18 },
                new QrBlockSpec { Version=4, EcLevel=QrErrorCorrectionLevel.Q, TotalData=48, TotalEcc=52,  Group1Blocks=2, Group1DataPerBlock=24, Group2Blocks=0, Group2DataPerBlock=0,  EccPerBlock=26 },
                new QrBlockSpec { Version=4, EcLevel=QrErrorCorrectionLevel.H, TotalData=36, TotalEcc=64,  Group1Blocks=4, Group1DataPerBlock=9,  Group2Blocks=0, Group2DataPerBlock=0,  EccPerBlock=16 },

                // Version 5
                new QrBlockSpec { Version=5, EcLevel=QrErrorCorrectionLevel.L, TotalData=108,TotalEcc=26,  Group1Blocks=1, Group1DataPerBlock=108,Group2Blocks=0, Group2DataPerBlock=0,  EccPerBlock=26 },
                new QrBlockSpec { Version=5, EcLevel=QrErrorCorrectionLevel.M, TotalData=86, TotalEcc=48,  Group1Blocks=2, Group1DataPerBlock=43, Group2Blocks=0, Group2DataPerBlock=0,  EccPerBlock=24 },
                new QrBlockSpec { Version=5, EcLevel=QrErrorCorrectionLevel.Q, TotalData=62, TotalEcc=72,  Group1Blocks=2, Group1DataPerBlock=15, Group2Blocks=2, Group2DataPerBlock=16, EccPerBlock=18 },
                new QrBlockSpec { Version=5, EcLevel=QrErrorCorrectionLevel.H, TotalData=46, TotalEcc=88,  Group1Blocks=2, Group1DataPerBlock=11, Group2Blocks=2, Group2DataPerBlock=12, EccPerBlock=22 },

                // Version 6
                new QrBlockSpec { Version=6, EcLevel=QrErrorCorrectionLevel.L, TotalData=136,TotalEcc=36,  Group1Blocks=2, Group1DataPerBlock=68, Group2Blocks=0, Group2DataPerBlock=0,  EccPerBlock=18 },
                new QrBlockSpec { Version=6, EcLevel=QrErrorCorrectionLevel.M, TotalData=108,TotalEcc=64,  Group1Blocks=4, Group1DataPerBlock=27, Group2Blocks=0, Group2DataPerBlock=0,  EccPerBlock=16 },
                new QrBlockSpec { Version=6, EcLevel=QrErrorCorrectionLevel.Q, TotalData=76, TotalEcc=96,  Group1Blocks=4, Group1DataPerBlock=19, Group2Blocks=0, Group2DataPerBlock=0,  EccPerBlock=24 },
                new QrBlockSpec { Version=6, EcLevel=QrErrorCorrectionLevel.H, TotalData=60, TotalEcc=112, Group1Blocks=4, Group1DataPerBlock=15, Group2Blocks=0, Group2DataPerBlock=0,  EccPerBlock=28 },

                // Version 7
                new QrBlockSpec { Version=7, EcLevel=QrErrorCorrectionLevel.L, TotalData=156,TotalEcc=40,  Group1Blocks=2, Group1DataPerBlock=78, Group2Blocks=0, Group2DataPerBlock=0,  EccPerBlock=20 },
                new QrBlockSpec { Version=7, EcLevel=QrErrorCorrectionLevel.M, TotalData=124,TotalEcc=72,  Group1Blocks=4, Group1DataPerBlock=31, Group2Blocks=0, Group2DataPerBlock=0,  EccPerBlock=18 },
                new QrBlockSpec { Version=7, EcLevel=QrErrorCorrectionLevel.Q, TotalData=88, TotalEcc=120, Group1Blocks=2, Group1DataPerBlock=14, Group2Blocks=4, Group2DataPerBlock=15, EccPerBlock=20 },
                new QrBlockSpec { Version=7, EcLevel=QrErrorCorrectionLevel.H, TotalData=66, TotalEcc=130, Group1Blocks=4, Group1DataPerBlock=11, Group2Blocks=1, Group2DataPerBlock=12, EccPerBlock=26 },

                // Version 8
                new QrBlockSpec { Version=8, EcLevel=QrErrorCorrectionLevel.L, TotalData=194,TotalEcc=48,  Group1Blocks=2, Group1DataPerBlock=97, Group2Blocks=0, Group2DataPerBlock=0,  EccPerBlock=24 },
                new QrBlockSpec { Version=8, EcLevel=QrErrorCorrectionLevel.M, TotalData=154,TotalEcc=96,  Group1Blocks=2, Group1DataPerBlock=38, Group2Blocks=2, Group2DataPerBlock=39, EccPerBlock=24 },
                new QrBlockSpec { Version=8, EcLevel=QrErrorCorrectionLevel.Q, TotalData=110,TotalEcc=152, Group1Blocks=4, Group1DataPerBlock=13, Group2Blocks=2, Group2DataPerBlock=14, EccPerBlock=26 },
                new QrBlockSpec { Version=8, EcLevel=QrErrorCorrectionLevel.H, TotalData=86, TotalEcc=166, Group1Blocks=4, Group1DataPerBlock=11, Group2Blocks=2, Group2DataPerBlock=12, EccPerBlock=30 },

                // Version 9
                new QrBlockSpec { Version=9, EcLevel=QrErrorCorrectionLevel.L, TotalData=232,TotalEcc=56,  Group1Blocks=2, Group1DataPerBlock=116,Group2Blocks=0, Group2DataPerBlock=0,  EccPerBlock=28 },
                new QrBlockSpec { Version=9, EcLevel=QrErrorCorrectionLevel.M, TotalData=182,TotalEcc=120, Group1Blocks=3, Group1DataPerBlock=36, Group2Blocks=2, Group2DataPerBlock=37, EccPerBlock=30 },
                new QrBlockSpec { Version=9, EcLevel=QrErrorCorrectionLevel.Q, TotalData=132,TotalEcc=184, Group1Blocks=4, Group1DataPerBlock=14, Group2Blocks=4, Group2DataPerBlock=15, EccPerBlock=28 },
                new QrBlockSpec { Version=9, EcLevel=QrErrorCorrectionLevel.H, TotalData=100,TotalEcc=200, Group1Blocks=4, Group1DataPerBlock=12, Group2Blocks=4, Group2DataPerBlock=13, EccPerBlock=25 },

                // Version 10
                new QrBlockSpec { Version=10,EcLevel=QrErrorCorrectionLevel.L, TotalData=274,TotalEcc=68,  Group1Blocks=2, Group1DataPerBlock=68, Group2Blocks=2, Group2DataPerBlock=69, EccPerBlock=17 },
                new QrBlockSpec { Version=10,EcLevel=QrErrorCorrectionLevel.M, TotalData=216,TotalEcc=144, Group1Blocks=4, Group1DataPerBlock=43, Group2Blocks=1, Group2DataPerBlock=44, EccPerBlock=24 },
                new QrBlockSpec { Version=10,EcLevel=QrErrorCorrectionLevel.Q, TotalData=154,TotalEcc=216, Group1Blocks=6, Group1DataPerBlock=19, Group2Blocks=2, Group2DataPerBlock=20, EccPerBlock=28 },
                new QrBlockSpec { Version=10,EcLevel=QrErrorCorrectionLevel.H, TotalData=122,TotalEcc=240, Group1Blocks=6, Group1DataPerBlock=15, Group2Blocks=2, Group2DataPerBlock=16, EccPerBlock=30 }
            };

            // Payload length includes Mode (4 bits) + Length (8 bits) + payload bytes
            int payloadCodewords = byteCount + 2;

            foreach (var s in table)
            {
                if (s.EcLevel == ecLevel && payloadCodewords <= s.TotalData)
                {
                    return s;
                }
            }

            return table[table.Length - 1]; // Fallback to V10-H
        }

        private static int GetTotalDataCodewords(int version, QrErrorCorrectionLevel ecLevel)
        {
            int[,] dataCaps = {
                { 19, 34, 55, 80, 108, 136, 156, 194, 232, 274 }, // L
                { 16, 28, 44, 64, 86,  108, 124, 154, 182, 216 }, // M
                { 13, 22, 34, 48, 62,  76,  88,  110, 132, 154 }, // Q
                { 9,  16, 26, 36, 46,  60,  66,  86,  100, 122 }  // H
            };
            return dataCaps[(int)ecLevel, Math.Min(version, 10) - 1];
        }

        private static int GetEccCodewordsCount(int version, QrErrorCorrectionLevel ecLevel)
        {
            int[,] eccCaps = {
                { 7,  10, 15, 20, 26, 18, 20, 24, 30, 18 }, // L
                { 10, 16, 26, 36, 48, 36, 40, 48, 56, 68 }, // M
                { 13, 22, 36, 52, 72, 54, 56, 68, 78, 96 }, // Q
                { 17, 28, 44, 64, 88, 68, 78, 102, 116, 132 } // H
            };
            return eccCaps[(int)ecLevel, Math.Min(version, 10) - 1];
        }

        private byte[] BuildDataCodewords(byte[] data, int maxCodewords)
        {
            List<bool> bits = new List<bool>();

            // Byte Mode = 0100
            bits.AddRange(ToBits(4, 4));

            // Character count (8 bits)
            bits.AddRange(ToBits(data.Length, 8));

            // Payload
            foreach (byte b in data)
            {
                bits.AddRange(ToBits(b, 8));
            }

            // Terminator
            int totalBits = maxCodewords * 8;
            int needed = Math.Min(4, totalBits - bits.Count);
            for (int i = 0; i < needed; i++) bits.Add(false);

            // Byte boundary
            while (bits.Count % 8 != 0) bits.Add(false);

            // Pad bytes 0xEC, 0x11
            byte[] padBytes = { 0xEC, 0x11 };
            int padIdx = 0;
            while (bits.Count < totalBits)
            {
                bits.AddRange(ToBits(padBytes[padIdx % 2], 8));
                padIdx++;
            }

            byte[] codewords = new byte[maxCodewords];
            for (int i = 0; i < maxCodewords; i++)
            {
                byte val = 0;
                for (int b = 0; b < 8; b++)
                {
                    if (bits[i * 8 + b]) val |= (byte)(1 << (7 - b));
                }
                codewords[i] = val;
            }
            return codewords;
        }

        private static void PlaceAlignmentPattern(bool[,] matrix, bool[,] reserved, int r, int c)
        {
            for (int dr = 0; dr < 5; dr++)
            {
                for (int dc = 0; dc < 5; dc++)
                {
                    bool isDark = (dr == 0 || dr == 4 || dc == 0 || dc == 4) || (dr == 2 && dc == 2);
                    matrix[r + dr, c + dc] = isDark;
                    reserved[r + dr, c + dc] = true;
                }
            }
        }

        private static int[] GetAlignmentPositions(int version)
        {
            if (version == 1) return new int[0];
            if (version <= 6) return new int[] { 6, 6 + version * 4 };
            return new int[] { 6, 18, 22 };
        }

        private static void PlaceDataBits(bool[,] matrix, bool[,] reserved, List<bool> bits, int size)
        {
            int bitIdx = 0;
            int right = size - 1;
            bool upward = true;

            while (right > 0)
            {
                if (right == 6) right--; // Skip vertical timing column

                for (int vertical = 0; vertical < size; vertical++)
                {
                    int r = upward ? (size - 1 - vertical) : vertical;
                    for (int col = 0; col < 2; col++)
                    {
                        int c = right - col;
                        if (!reserved[r, c])
                        {
                            bool val = (bitIdx < bits.Count) ? bits[bitIdx++] : false;
                            matrix[r, c] = val;
                        }
                    }
                }
                upward = !upward;
                right -= 2;
            }
        }

        private static void ApplyFormatInfo(bool[,] matrix, QrErrorCorrectionLevel ecLevel, int maskPattern, int size)
        {
            int formatVal = GetFormatInfoBits(ecLevel, maskPattern);

            // Format Placement 1: Top-Left Finder Area
            for (int i = 0; i < 6; i++) matrix[8, i] = ((formatVal >> (14 - i)) & 1) == 1;
            matrix[8, 7] = ((formatVal >> 8) & 1) == 1;
            matrix[8, 8] = ((formatVal >> 7) & 1) == 1;
            matrix[7, 8] = ((formatVal >> 6) & 1) == 1;
            for (int i = 0; i < 6; i++) matrix[5 - i, 8] = ((formatVal >> (5 - i)) & 1) == 1;

            // Format Placement 2: Bottom-Left (bits 0..6) & Top-Right (bits 7..14)
            for (int i = 0; i < 7; i++) matrix[size - 1 - i, 8] = ((formatVal >> i) & 1) == 1;
            for (int i = 0; i < 8; i++) matrix[8, size - 8 + i] = ((formatVal >> (7 + i)) & 1) == 1;
        }

        private static int GetFormatInfoBits(QrErrorCorrectionLevel ecLevel, int maskPattern)
        {
            int ecBits = 0;
            switch (ecLevel)
            {
                case QrErrorCorrectionLevel.L: ecBits = 1; break; // 01
                case QrErrorCorrectionLevel.M: ecBits = 0; break; // 00
                case QrErrorCorrectionLevel.Q: ecBits = 3; break; // 11
                case QrErrorCorrectionLevel.H: ecBits = 2; break; // 10
            }

            int data = (ecBits << 3) | (maskPattern & 7);
            int rem = data << 10;
            for (int i = 4; i >= 0; i--)
            {
                if ((rem & (1 << (i + 10))) != 0)
                {
                    rem ^= 0x537 << i; // BCH Generator polynomial 1010011011 (0x537)
                }
            }
            int result = (data << 10) | rem;
            return result ^ 0x537D; // Mask format bits with 0x537D
        }

        private static List<bool> ToBits(int value, int bitCount)
        {
            List<bool> bits = new List<bool>(bitCount);
            for (int i = bitCount - 1; i >= 0; i--)
            {
                bits.Add(((value >> i) & 1) == 1);
            }
            return bits;
        }

        #endregion
    }
}
