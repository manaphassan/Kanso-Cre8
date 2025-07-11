#!/bin/bash
# Save this as install-fonts.sh

FONT_FOLDER="./FontLibrary"

# Check if folder exists
if [ ! -d "$FONT_FOLDER" ]; then
    echo "Font folder not found: $FONT_FOLDER"
    exit 1
fi

# Find all font files
FONT_FILES=$(find "$FONT_FOLDER" -type f \( -iname "*.ttf" -o -iname "*.otf" -o -iname "*.fon" \))

if [ -z "$FONT_FILES" ]; then
    echo "No font files found in $FONT_FOLDER"
    exit 1
fi

# Count font files
FONT_COUNT=$(echo "$FONT_FILES" | wc -l | tr -d ' ')

# Determine OS and install fonts
if [[ "$OSTYPE" == "darwin"* ]]; then
    # macOS
    FONT_DEST="$HOME/Library/Fonts"
    mkdir -p "$FONT_DEST"
    
    echo "Installing $FONT_COUNT fonts to $FONT_DEST"
    echo "$FONT_FILES" | while read -r font; do
        cp "$font" "$FONT_DEST/"
        echo "Installed: $(basename "$font")"
    done
elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
    # Linux
    if [ -d "$HOME/.local/share/fonts" ]; then
        FONT_DEST="$HOME/.local/share/fonts"
    else
        FONT_DEST="$HOME/.fonts"
        mkdir -p "$FONT_DEST"
    fi
    
    echo "Installing $FONT_COUNT fonts to $FONT_DEST"
    echo "$FONT_FILES" | while read -r font; do
        cp "$font" "$FONT_DEST/"
        echo "Installed: $(basename "$font")"
    done
    
    # Update font cache
    if command -v fc-cache >/dev/null; then
        fc-cache -fv
    fi
else
    echo "Unsupported operating system: $OSTYPE"
    exit 1
fi

echo "Font installation complete. $FONT_COUNT fonts processed."
