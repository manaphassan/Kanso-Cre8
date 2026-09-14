using System;
using System.Runtime.InteropServices;
using System.IO;

public class PeResources
{
    [DllImport("kernel32.dll", SetLastError = true)]
    public static extern IntPtr LoadLibraryEx(string lpLibFileName, IntPtr hFile, uint dwFlags);

    [DllImport("kernel32.dll", SetLastError = true)]
    public static extern bool FreeLibrary(IntPtr hLibModule);

    public delegate bool EnumResNameDelegate(IntPtr hModule, IntPtr lpszType, IntPtr lpszName, IntPtr lParam);

    [DllImport("kernel32.dll", SetLastError = true)]
    public static extern bool EnumResourceNames(IntPtr hModule, IntPtr lpszType, EnumResNameDelegate lpEnumFunc, IntPtr lParam);

    [DllImport("kernel32.dll", SetLastError = true)]
    public static extern IntPtr FindResource(IntPtr hModule, IntPtr lpName, IntPtr lpType);

    [DllImport("kernel32.dll", SetLastError = true)]
    public static extern IntPtr LoadResource(IntPtr hModule, IntPtr hResInfo);

    [DllImport("kernel32.dll", SetLastError = true)]
    public static extern uint SizeofResource(IntPtr hModule, IntPtr hResInfo);

    [DllImport("kernel32.dll", SetLastError = true)]
    public static extern IntPtr LockResource(IntPtr hResData);

    public const uint LOAD_LIBRARY_AS_DATAFILE = 0x00000002;
    public static readonly IntPtr RT_ICON = (IntPtr)3;
    public static readonly IntPtr RT_GROUP_ICON = (IntPtr)14;

    public static void Main(string[] args)
    {
        string exePath = @"D:\HaNa_Innovation\kansoCre8\dist\windows\KansoCre8-v0.1.0-windows-x64\KansoCre8.exe";
        IntPtr hModule = LoadLibraryEx(exePath, IntPtr.Zero, LOAD_LIBRARY_AS_DATAFILE);
        if (hModule == IntPtr.Zero)
        {
            Console.WriteLine("Failed to load: " + exePath);
            return;
        }

        Console.WriteLine("Inspecting PE: " + exePath);

        EnumResourceNames(hModule, RT_GROUP_ICON, (h, type, name, param) =>
        {
            Console.WriteLine("Group Icon: " + name);
            IntPtr hRes = FindResource(h, name, type);
            uint sz = SizeofResource(h, hRes);
            IntPtr hData = LoadResource(h, hRes);
            IntPtr pData = LockResource(hData);
            byte[] buf = new byte[sz];
            Marshal.Copy(pData, buf, 0, (int)sz);
            int count = BitConverter.ToUInt16(buf, 4);
            Console.WriteLine("  Frames in group: " + count);
            for (int i = 0; i < count; i++)
            {
                int off = 6 + (i * 14);
                byte w = buf[off];
                byte hgt = buf[off + 1];
                ushort planes = BitConverter.ToUInt16(buf, off + 4);
                ushort bitCount = BitConverter.ToUInt16(buf, off + 6);
                uint bytesInRes = BitConverter.ToUInt32(buf, off + 8);
                ushort id = BitConverter.ToUInt16(buf, off + 12);
                Console.WriteLine(string.Format("    Frame {0}: ID={1}, {2}x{3}, {4}bpp, {5} bytes", i, id, (w == 0 ? 256 : w), (hgt == 0 ? 256 : hgt), bitCount, bytesInRes));
            }
            return true;
        }, IntPtr.Zero);

        EnumResourceNames(hModule, RT_ICON, (h, type, name, param) =>
        {
            IntPtr hRes = FindResource(h, name, type);
            uint sz = SizeofResource(h, hRes);
            IntPtr hData = LoadResource(h, hRes);
            IntPtr pData = LockResource(hData);
            byte[] header = new byte[Math.Min(16, (int)sz)];
            Marshal.Copy(pData, header, 0, header.Length);
            bool isPng = (header[0] == 0x89 && header[1] == 0x50 && header[2] == 0x4E && header[3] == 0x47);
            Console.WriteLine(string.Format("  RT_ICON ID={0}, size={1}, isPng={2}", name, sz, isPng));
            return true;
        }, IntPtr.Zero);

        FreeLibrary(hModule);
    }
}
