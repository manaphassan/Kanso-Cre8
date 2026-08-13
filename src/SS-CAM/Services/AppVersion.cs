using System;
using System.Reflection;

namespace SS_CAM.Services
{
    public static class AppVersion
    {
        public static Version AssemblyVersion
        {
            get
            {
                try
                {
                    return Assembly.GetExecutingAssembly().GetName().Version;
                }
                catch
                {
                    return new Version(3, 5, 0, 0);
                }
            }
        }

        /// <summary>
        /// Display version string formatted as "vX.Y.Z" (e.g. "v3.5.0")
        /// </summary>
        public static string DisplayVersion
        {
            get
            {
                var v = AssemblyVersion;
                return string.Format("v{0}.{1}.{2}", v.Major, v.Minor, v.Build);
            }
        }

        /// <summary>
        /// Version string formatted as "X.Y.Z" (e.g. "3.5.0")
        /// </summary>
        public static string VersionString
        {
            get
            {
                var v = AssemblyVersion;
                return string.Format("{0}.{1}.{2}", v.Major, v.Minor, v.Build);
            }
        }

        /// <summary>
        /// Full version string formatted as "X.Y.Z.W" (e.g. "3.5.0.0")
        /// </summary>
        public static string FullVersionString
        {
            get
            {
                var v = AssemblyVersion;
                return string.Format("{0}.{1}.{2}.{3}", v.Major, v.Minor, v.Build, v.Revision);
            }
        }
    }
}
