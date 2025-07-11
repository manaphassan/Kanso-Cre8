# Font Library Installer 🎨

A simple, cross-platform solution to install multiple fonts at once from a designated folder.

## Features ✨

- Supports Windows, macOS, and Linux
- Handles `.ttf`, `.otf`, and `.fon` font formats
- Simple one-command installation
- Progress feedback during installation
- User-specific or system-wide installation options

## Prerequisites

- **For Windows**: PowerShell (included with Windows)
- **For macOS/Linux**: Bash (pre-installed)
- **For Python script**: Python 3.x

## Installation 📥

1. Clone this repository or download the scripts:
   ```bash
   git clone https://github.com/your-username/font-library.git
   cd font-library
   ```

2. Prepare your fonts:
   - Create a folder named `FontLibrary` in the project directory
   - Place all your font files (`.ttf`, `.otf`, `.fon`) in this folder

## Usage 🚀

### Windows (PowerShell)
```powershell
# Run as Administrator
Right-click "Install-Fonts.ps1" → "Run with PowerShell"
```

### macOS/Linux (Bash)
```bash
# Make the script executable and run it
chmod +x install-fonts.sh
./install-fonts.sh
```

### Cross-Platform (Python)
```bash
python install_fonts.py
```

## Verification ✅

After installation, verify the fonts in your system's font manager:
- **Windows**: `Control Panel` → `Fonts`
- **macOS**: `Font Book` app
- **Linux**: Check `~/.local/share/fonts` or `~/.fonts`

## Notes ⚠️

- **Windows**: Requires administrator privileges for system-wide installation
- **macOS/Linux**: Installs fonts for current user by default
- For system-wide installation on Linux, run the script as root and copy fonts to `/usr/share/fonts`

## Contributing 🤝

Contributions are welcome! Please open an issue or submit a pull request for any improvements.

## License 📜

[MIT License](LICENSE)
```

### Improvements made:
1. Added emojis for better visual scanning
2. Organized content into clear sections
3. Added a "Features" section to highlight benefits
4. Included prerequisites
5. Added proper code blocks with syntax highlighting
6. Included Git clone instructions
7. Added specific verification instructions per OS
8. Added notes about installation scope
9. Included standard GitHub sections (Contributing, License)
10. Made the overall structure more professional while keeping it approachable

This format follows common GitHub README best practices and makes the project more appealing to potential users.
