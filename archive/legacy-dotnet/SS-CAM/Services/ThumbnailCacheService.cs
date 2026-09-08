using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.IO;
using System.Security.Cryptography;
using System.Text;
using System.Threading.Tasks;
using System.Windows.Media;
using System.Windows.Media.Imaging;

namespace SS_CAM.Services
{
    /// <summary>
    /// High-performance asynchronous thumbnail generation and caching engine for deliverable assets.
    /// Eliminates UI thread freezing when rendering heavy 4K design images.
    /// </summary>
    public static class ThumbnailCacheService
    {
        private static readonly string CacheDirectory;
        private static readonly Dictionary<string, ImageSource> MemoryCache = new Dictionary<string, ImageSource>(StringComparer.OrdinalIgnoreCase);
        private static readonly object CacheLock = new object();
        private const int MaxMemoryCacheItems = 200;

        static ThumbnailCacheService()
        {
            try
            {
                string localAppData = Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData);
                CacheDirectory = Path.Combine(localAppData, "SS-CAM", "Thumbnails");
                if (!Directory.Exists(CacheDirectory))
                {
                    Directory.CreateDirectory(CacheDirectory);
                }
            }
            catch (Exception ex)
            {
                Debug.WriteLine(string.Format("[ThumbnailCacheService] Init error: {0}", ex.Message));
                CacheDirectory = Path.GetTempPath();
            }
        }

        public static Task<ImageSource> GetThumbnailAsync(string filePath, int targetWidth = 320)
        {
            return Task.Factory.StartNew<ImageSource>(delegate
            {
                return GetThumbnail(filePath, targetWidth);
            });
        }

        public static ImageSource GetThumbnail(string filePath, int targetWidth = 320)
        {
            if (string.IsNullOrWhiteSpace(filePath) || !File.Exists(filePath))
            {
                return null;
            }

            string cacheKey = string.Format("{0}_{1}", filePath, targetWidth);

            // 1. Check in-memory cache
            lock (CacheLock)
            {
                ImageSource cached;
                if (MemoryCache.TryGetValue(cacheKey, out cached))
                {
                    return cached;
                }
            }

            try
            {
                FileInfo fi = new FileInfo(filePath);
                string diskCachePath = GetDiskCachePath(filePath, fi.LastWriteTimeUtc.Ticks, targetWidth);

                // 2. Check disk cache
                if (File.Exists(diskCachePath))
                {
                    BitmapImage cachedBitmap = LoadDecodedBitmap(diskCachePath, targetWidth);
                    if (cachedBitmap != null)
                    {
                        AddToMemoryCache(cacheKey, cachedBitmap);
                        return cachedBitmap;
                    }
                }

                // 3. Generate thumbnail
                string ext = fi.Extension.ToLowerInvariant();
                if (IsImageExtension(ext))
                {
                    BitmapImage newThumb = CreateImageThumbnail(filePath, diskCachePath, targetWidth);
                    if (newThumb != null)
                    {
                        AddToMemoryCache(cacheKey, newThumb);
                        return newThumb;
                    }
                }
            }
            catch (Exception ex)
            {
                Debug.WriteLine(string.Format("[ThumbnailCacheService] GetThumbnail failed for '{0}': {1}", filePath, ex.Message));
            }

            return null;
        }

        private static bool IsImageExtension(string ext)
        {
            return ext == ".png" || ext == ".jpg" || ext == ".jpeg" || ext == ".webp" ||
                   ext == ".bmp" || ext == ".gif" || ext == ".tif" || ext == ".tiff";
        }

        private static BitmapImage LoadDecodedBitmap(string path, int targetWidth)
        {
            try
            {
                BitmapImage bmp = new BitmapImage();
                bmp.BeginInit();
                bmp.CacheOption = BitmapCacheOption.OnLoad;
                bmp.UriSource = new Uri(path, UriKind.Absolute);
                bmp.DecodePixelWidth = targetWidth;
                bmp.EndInit();
                bmp.Freeze();
                return bmp;
            }
            catch (Exception ex)
            {
                Debug.WriteLine(string.Format("[ThumbnailCacheService] LoadDecodedBitmap failed: {0}", ex.Message));
                return null;
            }
        }

        private static BitmapImage CreateImageThumbnail(string sourcePath, string diskCachePath, int targetWidth)
        {
            try
            {
                BitmapImage bmp = new BitmapImage();
                bmp.BeginInit();
                bmp.CacheOption = BitmapCacheOption.OnLoad;
                bmp.UriSource = new Uri(sourcePath, UriKind.Absolute);
                bmp.DecodePixelWidth = targetWidth;
                bmp.EndInit();
                bmp.Freeze();

                // Save to disk cache in background
                Task.Factory.StartNew(delegate
                {
                    try
                    {
                        JpegBitmapEncoder encoder = new JpegBitmapEncoder();
                        encoder.QualityLevel = 85;
                        encoder.Frames.Add(BitmapFrame.Create(bmp));
                        using (FileStream fs = new FileStream(diskCachePath, FileMode.Create, FileAccess.Write, FileShare.None))
                        {
                            encoder.Save(fs);
                        }
                    }
                    catch (Exception ex)
                    {
                        Debug.WriteLine(string.Format("[ThumbnailCacheService] Save disk cache error: {0}", ex.Message));
                    }
                });

                return bmp;
            }
            catch (Exception ex)
            {
                Debug.WriteLine(string.Format("[ThumbnailCacheService] CreateImageThumbnail error for '{0}': {1}", sourcePath, ex.Message));
                return null;
            }
        }

        private static string GetDiskCachePath(string sourcePath, long ticks, int targetWidth)
        {
            string raw = string.Format("{0}_{1}_{2}", sourcePath, ticks, targetWidth);
            using (MD5 md5 = MD5.Create())
            {
                byte[] hash = md5.ComputeHash(Encoding.UTF8.GetBytes(raw));
                StringBuilder sb = new StringBuilder();
                for (int i = 0; i < hash.Length; i++)
                {
                    sb.Append(hash[i].ToString("x2"));
                }
                return Path.Combine(CacheDirectory, sb.ToString() + ".thumb.jpg");
            }
        }

        private static void AddToMemoryCache(string key, ImageSource image)
        {
            lock (CacheLock)
            {
                if (MemoryCache.Count >= MaxMemoryCacheItems)
                {
                    MemoryCache.Clear(); // Evict on overflow
                }
                MemoryCache[key] = image;
            }
        }
    }
}
