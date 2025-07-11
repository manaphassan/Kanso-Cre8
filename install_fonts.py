#!/usr/bin/env python3
# Save this as install_fonts.py

import os
import platform
import shutil
import sys

FONT_FOLDER = "FontLibrary"

def install_fonts_windows(font_files):
    try:
        import ctypes
        from ctypes import wintypes
        import win32con
        import win32gui
        
        # Constants
        WM_FONTCHANGE = 0x001D
        HWND_BROADCAST = 0xFFFF
        
        # Load fonts
        GDI32 = ctypes.WinDLL('gdi32')
        GDI32.AddFontResourceW.argtypes = [wintypes.LPCWSTR]
        GDI32.AddFontResourceW.restype = wintypes.BOOL
        
        for font_path in font_files:
            if GDI32.AddFontResourceW(font_path):
                print(f"Installed: {os.path.basename(font_path)}")
                # Copy to Windows Fonts directory
                font_dest = os.path.join(os.environ['WINDIR'], 'Fonts', os.path.basename(font_path))
                shutil.copy2(font_path, font_dest)
            else:
                print(f"Failed to install: {os.path.basename(font_path)}")
        
        # Notify other applications
        win32gui.SendMessage(HWND_BROADCAST, WM_FONTCHANGE, 0, 0)
        
    except Exception as e:
        print(f"Error during font installation: {e}")
        return False
    return True

def install_fonts_mac(font_files):
    font_dest = os.path.expanduser("~/Library/Fonts")
    os.makedirs(font_dest, exist_ok=True)
    
    for font_path in font_files:
        try:
            shutil.copy2(font_path, os.path.join(font_dest, os.path.basename(font_path)))
            print(f"Installed: {os.path.basename(font_path)}")
        except Exception as e:
            print(f"Failed to install {os.path.basename(font_path)}: {e}")
    
    return True

def install_fonts_linux(font_files):
    font_dest = os.path.expanduser("~/.local/share/fonts")
    if not os.path.exists(font_dest):
        font_dest = os.path.expanduser("~/.fonts")
        os.makedirs(font_dest, exist_ok=True)
    
    for font_path in font_files:
        try:
            shutil.copy2(font_path, os.path.join(font_dest, os.path.basename(font_path)))
            print(f"Installed: {os.path.basename(font_path)}")
        except Exception as e:
            print(f"Failed to install {os.path.basename(font_path)}: {e}")
    
    # Update font cache
    if shutil.which("fc-cache"):
        os.system("fc-cache -fv")
    
    return True

def main():
    # Check if font folder exists
    if not os.path.isdir(FONT_FOLDER):
        print(f"Font folder not found: {FONT_FOLDER}")
        return 1
    
    # Find all font files
    font_extensions = ('.ttf', '.otf', '.fon')
    font_files = []
    for root, _, files in os.walk(FONT_FOLDER):
        for file in files:
            if file.lower().endswith(font_extensions):
                font_files.append(os.path.join(root, file))
    
    if not font_files:
        print(f"No font files found in {FONT_FOLDER}")
        return 1
    
    print(f"Found {len(font_files)} fonts to install")
    
    # Install based on OS
    system = platform.system().lower()
    if system == 'windows':
        if os.name != 'nt' or not sys.platform.startswith('win'):
            print("This script must be run on Windows for Windows font installation.")
            return 1
        success = install_fonts_windows(font_files)
    elif system == 'darwin':
        success = install_fonts_mac(font_files)
    elif system == 'linux':
        success = install_fonts_linux(font_files)
    else:
        print(f"Unsupported operating system: {system}")
        return 1
    
    if success:
        print(f"\nFont installation complete. {len(font_files)} fonts processed.")
        return 0
    else:
        print("\nFont installation encountered errors.")
        return 1

if __name__ == "__main__":
    sys.exit(main())
