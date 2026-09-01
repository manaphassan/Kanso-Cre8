#!/usr/bin/env bash
# ==============================================================================
# SS-CAM Linux Native Desktop Application Interactive Installer & Setup
# Version  : 4.6.0
# Supported: Fedora, Ubuntu, Debian, Pop!_OS, Arch Linux, RHEL, Manjaro, openSUSE
# Usage    : sudo bash install-linux.sh [OPTIONS]
# Curl pipe: bash <(curl -fsSL https://suamisihat.github.io/ss-cam/install.sh)
# ==============================================================================

main() {
    # ── do NOT use set -e — it breaks curl|bash pipes when sudo prompts appear ──
    local C_RESET="\033[0m"
    local C_BOLD="\033[1m"
    local C_CYAN="\033[1;36m"
    local C_BLUE="\033[1;34m"
    local C_GREEN="\033[1;32m"
    local C_YELLOW="\033[1;33m"
    local C_RED="\033[1;31m"
    local C_DIM="\033[2m"
    local C_MAGENTA="\033[1;35m"

    local APP_NAME="ss-cam"
    local DISPLAY_NAME="SuamiSihat Creative Assets Management"
    local VERSION="4.6.0"
    local DEFAULT_INSTALL_DIR="/opt/ss-cam"
    local INSTALL_DIR="$DEFAULT_INSTALL_DIR"
    local BIN_LINK="/usr/local/bin/ss-cam"
    local DESKTOP_DIR="/usr/share/applications"
    local ICON_SCALABLE_DIR="/usr/share/icons/hicolor/scalable/apps"
    local ICON_256_DIR="/usr/share/icons/hicolor/256x256/apps"
    local CONFIG_DIR="$HOME/.config/ss-cam"

    local RELEASE_BASE="https://github.com/SuamiSihat/ss_cam/releases/download/v${VERSION}"
    local RELEASE_TAR_URL="${RELEASE_BASE}/SS-CAM-v${VERSION}-linux-x64.tar.gz"
    local FALLBACK_TAR_URL="https://raw.githubusercontent.com/SuamiSihat/ss_cam/SS-Master/publish/ss-cam-linux-x64.tar.gz"
    local DIRECT_GIT_TAR_URL="https://github.com/SuamiSihat/ss_cam/raw/SS-Master/publish/ss-cam-linux-x64.tar.gz"
    local ICON_URL="https://raw.githubusercontent.com/SuamiSihat/ss_cam/SS-Master/installer/assets/ss-cam.svg"
    local CURL_INSTALL_URL="https://suamisihat.github.io/ss_cam/install.sh"

    # ── /dev/tty-safe prompt (works in curl|bash pipes) ──────────────────────
    prompt_input() {
        local msg="$1" def="$2" var="$3" inp=""
        if [ -c /dev/tty ]; then
            printf "%b" "$msg" >/dev/tty
            read -r inp </dev/tty 2>/dev/null || inp=""
        elif [ -t 0 ]; then
            printf "%b" "$msg"
            read -r inp || inp=""
        fi
        [ -z "$inp" ] && inp="$def"
        eval "${var}=\"\${inp}\""
    }

    # ── confirm yes/no (returns 0=yes 1=no) ──────────────────────────────────
    confirm() {
        local msg="$1" def="${2:-Y}" ans=""
        prompt_input "$msg" "$def" ans
        [[ "$ans" =~ ^[Yy]$ ]]
    }

    # ── spinner for long-running steps ───────────────────────────────────────
    spinner_pid=""
    start_spinner() {
        local frames=('⠋' '⠙' '⠹' '⠸' '⠼' '⠴' '⠦' '⠧' '⠇' '⠏')
        local msg="$1"
        (
            local i=0
            while true; do
                printf "\r  %s %s  " "${frames[$((i % 10))]}" "$msg"
                sleep 0.1
                ((i++))
            done
        ) &
        spinner_pid=$!
    }
    stop_spinner() {
        [ -n "$spinner_pid" ] && kill "$spinner_pid" 2>/dev/null && wait "$spinner_pid" 2>/dev/null
        spinner_pid=""
        printf "\r%80s\r" ""   # clear spinner line
    }

    # ── distro detection ─────────────────────────────────────────────────────
    detect_distro() {
        if [ -f /etc/os-release ]; then
            . /etc/os-release
            echo "${ID:-unknown}"
        elif command -v lsb_release &>/dev/null; then
            lsb_release -si | tr '[:upper:]' '[:lower:]'
        else
            echo "unknown"
        fi
    }

    # ── dependency installer ─────────────────────────────────────────────────
    ensure_dep() {
        local cmd="$1" pkg="${2:-$1}"
        if ! command -v "$cmd" &>/dev/null; then
            echo -e "  ${C_YELLOW}[*] Installing missing dependency: ${C_BOLD}${pkg}${C_RESET}"
            local distro; distro="$(detect_distro)"
            case "$distro" in
                ubuntu|debian|pop|linuxmint|raspbian)
                    apt-get install -y -q "$pkg" 2>/dev/null || true ;;
                fedora|rhel|centos|rocky|almalinux)
                    dnf install -y -q "$pkg" 2>/dev/null || \
                    yum install -y -q "$pkg" 2>/dev/null || true ;;
                arch|manjaro|endeavouros)
                    pacman -S --noconfirm --needed "$pkg" 2>/dev/null || true ;;
                opensuse*|sles)
                    zypper install -y "$pkg" 2>/dev/null || true ;;
                *)
                    echo -e "  ${C_RED}[-] Cannot auto-install '$pkg' on this distro. Please install it manually.${C_RESET}" ;;
            esac
        fi
    }

    # ── runtime dependencies check ───────────────────────────────────────────
    check_runtime_deps() {
        echo -e "\n${C_BOLD}Checking runtime dependencies...${C_RESET}"
        local missing=0

        # libICU (for .NET globalization)
        if ! ldconfig -p 2>/dev/null | grep -q "libicuuc\|libicu[0-9]"; then
            local distro; distro="$(detect_distro)"
            case "$distro" in
                ubuntu|debian|pop) ensure_dep "libicu-dev" "libicu-dev" ;;
                fedora|rhel*)      ensure_dep "" "libicu"    ;;
                arch|manjaro)      ensure_dep "" "icu"       ;;
                *)                 echo -e "  ${C_YELLOW}[!] libICU may be missing — .NET apps require it${C_RESET}" ;;
            esac
        else
            echo -e "  ${C_GREEN}✔ libICU (Unicode)${C_RESET}"
        fi

        # libX11 / OpenGL (Avalonia windowing)
        if ! ldconfig -p 2>/dev/null | grep -q "libX11"; then
            echo -e "  ${C_YELLOW}[!] libX11 not detected — may need x11 or libx11 package${C_RESET}"
        else
            echo -e "  ${C_GREEN}✔ libX11 (windowing)${C_RESET}"
        fi

        # mpv (optional — Focus Radio feature)
        if command -v mpv &>/dev/null; then
            echo -e "  ${C_GREEN}✔ mpv (Focus Radio)${C_RESET}"
        else
            echo -e "  ${C_DIM}  mpv not found — Focus Radio will be unavailable (optional)${C_RESET}"
            echo -e "  ${C_DIM}  Install with: sudo apt install mpv  / sudo dnf install mpv  / sudo pacman -S mpv${C_RESET}"
        fi
    }

    # ── parse CLI flags ──────────────────────────────────────────────────────
    local UNATTENDED=0
    local DO_UNINSTALL=0
    local FORCE_BUILD=0
    local CUSTOM_DIR=""
    local INSTALL_MODE=1
    local SETUP_DESKTOP="Y"
    local SETUP_CLI="Y"
    local SETUP_SYNOLOGY="Y"
    local LAUNCH_NOW="Y"

    while [[ $# -gt 0 ]]; do
        case "$1" in
            -y|--yes|--unattended|--silent)
                UNATTENDED=1; shift ;;
            -u|--uninstall)
                DO_UNINSTALL=1; shift ;;
            -b|--build)
                FORCE_BUILD=1; shift ;;
            -d|--dir)
                CUSTOM_DIR="$2"; shift 2 ;;
            -h|--help)
                cat <<HELP
${C_BOLD}SS-CAM Linux Installer v${VERSION}${C_RESET}

Usage: sudo bash install-linux.sh [OPTIONS]
       bash <(curl -fsSL ${CURL_INSTALL_URL})

Options:
  -y, --yes          Non-interactive / Unattended install (uses defaults)
  -u, --uninstall    Remove SS-CAM and all shortcuts cleanly
  -b, --build        Build from source via .NET SDK instead of downloading
  -d, --dir PATH     Custom installation directory  (default: /opt/ss-cam)
  -h, --help         Show this help

Modules installed: 14
  Dashboard · Project Creator · Search & Copy · Copywriting · Brand Assets
  Task Manager · Big Calendar · Quick Notes · Creative Wellbeing · Waktu Solat
  Focus Radio (mpv) · QR Code Studio · Workstation Health · Settings
HELP
                return 0 ;;
            *) shift ;;
        esac
    done

    # ── detect TTY availability ───────────────────────────────────────────────
    local IS_INTERACTIVE=0
    { [ -c /dev/tty ] || [ -t 0 ]; } && IS_INTERACTIVE=1

    # ── custom dir flag ───────────────────────────────────────────────────────
    [ -n "$CUSTOM_DIR" ] && INSTALL_DIR="$CUSTOM_DIR"

    # ── check root / acquire sudo ────────────────────────────────────────────
    if [ "$EUID" -ne 0 ]; then
        if command -v sudo &>/dev/null && [ $IS_INTERACTIVE -eq 1 ]; then
            echo -e "${C_YELLOW}[*] Root required — requesting sudo...${C_RESET}"
            # If running via pipe/process substitution, download to temporary file for clean sudo re-exec
            if [ ! -f "$0" ] || [[ "$0" =~ ^/dev/fd ]] || [ "$0" = "bash" ] || [ "$0" = "sh" ]; then
                local TMP_RUNNER="/tmp/ss-cam-install.sh"
                curl -fsSL "https://raw.githubusercontent.com/SuamiSihat/ss_cam/SS-Master/install.sh" -o "$TMP_RUNNER" 2>/dev/null || true
                chmod +x "$TMP_RUNNER" 2>/dev/null || true
                exec sudo bash "$TMP_RUNNER" "$@"
            else
                exec sudo bash "$0" "$@"
            fi
        else
            echo -e "${C_RED}[-] Error: Run with sudo: ${C_BOLD}sudo bash install-linux.sh${C_RESET}"
            return 1
        fi
    fi

    local TARGET_USER="${SUDO_USER:-$USER}"
    local TARGET_HOME
    TARGET_HOME="$(getent passwd "$TARGET_USER" 2>/dev/null | cut -d: -f6 || echo "$HOME")"

    # ── WELCOME BANNER ────────────────────────────────────────────────────────
    clear 2>/dev/null || true
    echo -e "${C_BLUE}══════════════════════════════════════════════════════════════${C_RESET}"
    echo -e "${C_CYAN}${C_BOLD}   ____ ____      ____    _    __  __ ${C_RESET}"
    echo -e "${C_CYAN}${C_BOLD}  / ___/ ___|    / ___|  / \\  |  \\/  |${C_RESET}"
    echo -e "${C_CYAN}${C_BOLD}  \\___ \\___ \\   | |     / _ \\ | |\\/| |${C_RESET}"
    echo -e "${C_CYAN}${C_BOLD}   ___) |__) |  | |___ / ___ \\| |  | |${C_RESET}"
    echo -e "${C_CYAN}${C_BOLD}  |____/____/    \\____/_/   \\_\\_|  |_|${C_RESET}"
    echo -e "${C_BLUE}══════════════════════════════════════════════════════════════${C_RESET}"
    echo -e "  ${C_BOLD}SuamiSihat(tm) Creative Assets Management${C_RESET} -- ${C_GREEN}v${VERSION} (Linux)${C_RESET}"
    echo -e "  ${C_DIM}Avalonia 11 Native UI -- Fedora / Ubuntu / Arch / Debian${C_RESET}"
    echo -e "${C_BLUE}══════════════════════════════════════════════════════════════${C_RESET}"
    echo -e "  Installing for user: ${C_CYAN}${C_BOLD}${TARGET_USER}${C_RESET}  (home: ${TARGET_HOME})"
    echo -e "  Distro: ${C_CYAN}$(detect_distro)${C_RESET}  |  Kernel: ${C_DIM}$(uname -r)${C_RESET}"
    echo ""

    # ── UNINSTALL FLOW ────────────────────────────────────────────────────────
    if [ $DO_UNINSTALL -eq 1 ]; then
        echo -e "${C_YELLOW}[*] Uninstalling SS-CAM...${C_RESET}"
        if [ $UNATTENDED -eq 0 ]; then
            confirm "${C_YELLOW}Remove SS-CAM from this system? [y/N]: ${C_RESET}" "n" || { echo -e "${C_DIM}Cancelled.${C_RESET}"; return 0; }
        fi
        rm -rf "$INSTALL_DIR"
        rm -f "$BIN_LINK" "$DESKTOP_DIR/ss-cam.desktop" \
              "$ICON_SCALABLE_DIR/ss-cam.svg" "$ICON_256_DIR/ss-cam.png"
        command -v update-desktop-database &>/dev/null && update-desktop-database "$DESKTOP_DIR" 2>/dev/null || true
        command -v gtk-update-icon-cache   &>/dev/null && gtk-update-icon-cache -f -t /usr/share/icons/hicolor 2>/dev/null || true
        echo -e "${C_GREEN}✔ SS-CAM cleanly removed.${C_RESET}"
        return 0
    fi

    # ── INTERACTIVE MENU ──────────────────────────────────────────────────────
    if [ $UNATTENDED -eq 0 ] && [ $FORCE_BUILD -eq 0 ] && [ $IS_INTERACTIVE -eq 1 ]; then

        echo -e "${C_BOLD}  Select Installation Mode:${C_RESET}\n"
        echo -e "  ${C_GREEN}${C_BOLD}[1]${C_RESET} ${C_BOLD}Express Install${C_RESET} (Recommended)"
        echo -e "      Download pre-compiled native binary from GitHub Releases"
        echo ""
        echo -e "  ${C_CYAN}${C_BOLD}[2]${C_RESET} ${C_BOLD}Custom Directory${C_RESET}"
        echo -e "      Choose a custom installation path (default: /opt/ss-cam)"
        echo ""
        echo -e "  ${C_YELLOW}${C_BOLD}[3]${C_RESET} ${C_BOLD}Build from Source${C_RESET}"
        echo -e "      Compile locally via .NET SDK (requires dotnet + git)"
        echo ""
        echo -e "  ${C_RED}${C_BOLD}[4]${C_RESET} ${C_BOLD}Uninstall SS-CAM${C_RESET}"
        echo -e "      Remove all files, shortcuts and CLI commands"
        echo ""
        echo -e "  ${C_DIM}[5] Exit${C_RESET}"
        echo ""

        local choice="1"
        prompt_input "  ${C_CYAN}Choice [1-5, default: 1]: ${C_RESET}" "1" choice

        case "$choice" in
            1) INSTALL_MODE=1 ;;
            2)
                INSTALL_MODE=2
                local user_dir=""
                echo ""
                prompt_input "  ${C_BOLD}Installation path [default: /opt/ss-cam]: ${C_RESET}" "$DEFAULT_INSTALL_DIR" user_dir
                INSTALL_DIR="${user_dir:-$DEFAULT_INSTALL_DIR}"
                ;;
            3) INSTALL_MODE=3 ;;
            4)
                rm -rf "$INSTALL_DIR"
                rm -f "$BIN_LINK" "$DESKTOP_DIR/ss-cam.desktop" \
                      "$ICON_SCALABLE_DIR/ss-cam.svg"
                echo -e "${C_GREEN}✔ SS-CAM uninstalled.${C_RESET}"
                return 0
                ;;
            5|q|Q)
                echo -e "${C_YELLOW}Cancelled.${C_RESET}"
                return 0
                ;;
            *) INSTALL_MODE=1 ;;
        esac

        # ── component preferences ─────────────────────────────────────────────
        echo ""
        echo -e "${C_BOLD}  Component Preferences:${C_RESET}\n"
        confirm "  ${C_DIM}[+]${C_RESET} Add ${C_BOLD}desktop application shortcut${C_RESET} (GNOME/KDE/XFCE)? [Y/n]: " "Y" && SETUP_DESKTOP="Y" || SETUP_DESKTOP="N"
        confirm "  ${C_DIM}[+]${C_RESET} Create ${C_BOLD}ss-cam${C_RESET} CLI command in /usr/local/bin? [Y/n]: " "Y" && SETUP_CLI="Y" || SETUP_CLI="N"
        confirm "  ${C_DIM}[+]${C_RESET} Initialise Synology Drive workspace directory? [Y/n]: " "Y" && SETUP_SYNOLOGY="Y" || SETUP_SYNOLOGY="N"
        echo ""

        # ── confirm summary before proceeding ─────────────────────────────────
        echo -e "${C_BLUE}──────────────────────────────────────────────────────────────${C_RESET}"
        echo -e "  ${C_BOLD}Install to     :${C_RESET} ${C_CYAN}${INSTALL_DIR}${C_RESET}"
        echo -e "  ${C_BOLD}Mode           :${C_RESET} $([ $INSTALL_MODE -eq 1 ] && echo 'Express (download)' || ([ $INSTALL_MODE -eq 2 ] && echo "Custom: $INSTALL_DIR" || echo 'Build from source'))"
        echo -e "  ${C_BOLD}Desktop entry  :${C_RESET} $SETUP_DESKTOP"
        echo -e "  ${C_BOLD}CLI command    :${C_RESET} $SETUP_CLI"
        echo -e "  ${C_BOLD}Synology dir   :${C_RESET} $SETUP_SYNOLOGY"
        echo -e "${C_BLUE}──────────────────────────────────────────────────────────────${C_RESET}\n"

        confirm "  ${C_CYAN}Proceed with installation? [Y/n]: ${C_RESET}" "Y" || { echo -e "${C_YELLOW}Cancelled.${C_RESET}"; return 0; }
        echo ""
    fi

    [ $FORCE_BUILD -eq 1 ] && INSTALL_MODE=3

    # ── STEP 1: INSTALL BINARY ────────────────────────────────────────────────
    echo -e "${C_YELLOW}[1/4] Installing application files to ${C_BOLD}${INSTALL_DIR}${C_RESET}${C_YELLOW}...${C_RESET}"
    mkdir -p "$INSTALL_DIR" "$ICON_SCALABLE_DIR" "$ICON_256_DIR" "$DESKTOP_DIR" "$CONFIG_DIR"

    local SCRIPT_DIR
    SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" 2>/dev/null && pwd || echo "")"
    local REPO_ROOT
    REPO_ROOT="$(cd "${SCRIPT_DIR}/.." 2>/dev/null && pwd || echo "")"
    local INSTALLED=0

    if [ $INSTALL_MODE -eq 3 ]; then
        # ── Build from source ──────────────────────────────────────────────
        if ! command -v dotnet &>/dev/null; then
            echo -e "  ${C_RED}[-] .NET SDK not found. Install from: https://dot.net${C_RESET}"
            echo -e "  ${C_YELLOW}    Falling back to pre-compiled download...${C_RESET}"
            INSTALL_MODE=1
        else
            local SRC="$REPO_ROOT/src/SS-CAM.Linux/SS-CAM.Linux.csproj"
            if [ ! -f "$SRC" ]; then
                # Clone repo to temp dir
                ensure_dep "git" "git"
                local TMP_BUILD="/tmp/ss-cam-build-$$"
                start_spinner "Cloning repository..."
                git clone --depth 1 https://github.com/SuamiSihat/ss_cam.git "$TMP_BUILD" &>/dev/null
                stop_spinner
                SRC="$TMP_BUILD/src/SS-CAM.Linux/SS-CAM.Linux.csproj"
                trap "rm -rf '$TMP_BUILD'" EXIT
            fi
            start_spinner "Building from source (this takes ~2 min)..."
            if dotnet publish "$SRC" -c Release -r linux-x64 \
                --self-contained true \
                -p:PublishSingleFile=true \
                -p:IncludeNativeLibrariesForSelfExtract=true \
                -o "$INSTALL_DIR" &>/dev/null; then
                stop_spinner
                echo -e "  ${C_GREEN}✔ Built and installed from source.${C_RESET}"
                INSTALLED=1
            else
                stop_spinner
                echo -e "  ${C_RED}[-] Build failed. Falling back to download.${C_RESET}"
                INSTALL_MODE=1
            fi
        fi
    fi

    if [ $INSTALLED -eq 0 ]; then
        # ── Check local dist/ archive first ───────────────────────────────
        local LOCAL_TAR="${REPO_ROOT}/dist/SS-CAM-v${VERSION}-linux-x64.tar.gz"
        if [ -f "$LOCAL_TAR" ]; then
            echo -e "  ${C_DIM}Using local archive: $LOCAL_TAR${C_RESET}"
            tar -xzf "$LOCAL_TAR" -C "$INSTALL_DIR" && INSTALLED=1
        else
            ensure_dep "curl" "curl"
            local TEMP_TAR="/tmp/ss-cam-linux-x64-$$.tar.gz"
            start_spinner "Downloading SS-CAM v${VERSION}..."
            if curl -fL --progress-bar --connect-timeout 20 --retry 2 -o "$TEMP_TAR" "$RELEASE_TAR_URL" 2>/dev/null; then
                stop_spinner
                echo -e "  ${C_GREEN}✔ Downloaded SS-CAM v${VERSION}.${C_RESET}"
            elif curl -fL --progress-bar --connect-timeout 20 --retry 2 -o "$TEMP_TAR" "$FALLBACK_TAR_URL" 2>/dev/null; then
                stop_spinner
                echo -e "  ${C_GREEN}✔ Downloaded (fallback mirror).${C_RESET}"
            elif curl -fL --progress-bar --connect-timeout 20 --retry 2 -o "$TEMP_TAR" "$DIRECT_GIT_TAR_URL" 2>/dev/null; then
                stop_spinner
                echo -e "  ${C_GREEN}✔ Downloaded (direct git mirror).${C_RESET}"
            else
                stop_spinner
                echo -e "  ${C_RED}[-] Download failed. Check your internet connection.${C_RESET}"
                rm -f "$TEMP_TAR"
                return 1
            fi

            if [ -f "$TEMP_TAR" ]; then
                tar -xzf "$TEMP_TAR" -C "$INSTALL_DIR" && INSTALLED=1
                rm -f "$TEMP_TAR"
            fi
        fi
    fi

    if [ $INSTALLED -eq 0 ]; then
        echo -e "${C_RED}[-] Installation failed — could not place binary.${C_RESET}"
        return 1
    fi

    # ── ensure executable ─────────────────────────────────────────────────
    if [ -f "$INSTALL_DIR/SS-CAM.Linux" ]; then
        chmod +x "$INSTALL_DIR/SS-CAM.Linux"
        echo -e "  ${C_GREEN}✔ Binary ready: ${C_BOLD}${INSTALL_DIR}/SS-CAM.Linux${C_RESET}"
    else
        echo -e "  ${C_RED}[-] Binary not found at $INSTALL_DIR/SS-CAM.Linux${C_RESET}"
        return 1
    fi

    # ── STEP 2: RUNTIME DEPS ─────────────────────────────────────────────────
    echo -e "\n${C_YELLOW}[2/4] Verifying runtime dependencies...${C_RESET}"
    check_runtime_deps

    # ── STEP 3: ICONS ────────────────────────────────────────────────────────
    echo -e "\n${C_YELLOW}[3/4] Installing application icons...${C_RESET}"
    local ICON_SRC=""
    [ -n "$REPO_ROOT" ] && [ -f "$REPO_ROOT/installer/assets/ss-cam.svg" ] && ICON_SRC="$REPO_ROOT/installer/assets/ss-cam.svg"
    [ -z "$ICON_SRC" ] && [ -f "$INSTALL_DIR/ss-cam.svg" ] && ICON_SRC="$INSTALL_DIR/ss-cam.svg"
    if [ -n "$ICON_SRC" ]; then
        cp -f "$ICON_SRC" "$ICON_SCALABLE_DIR/ss-cam.svg"
    else
        curl -fsSL "$ICON_URL" -o "$ICON_SCALABLE_DIR/ss-cam.svg" 2>/dev/null || true
    fi
    chmod 644 "$ICON_SCALABLE_DIR/ss-cam.svg" 2>/dev/null || true
    echo -e "  ${C_GREEN}✔ Icons installed.${C_RESET}"

    # ── STEP 4: LAUNCHERS & DESKTOP ENTRY ────────────────────────────────────
    echo -e "\n${C_YELLOW}[4/4] Configuring system launchers...${C_RESET}"

    if [[ "$SETUP_CLI" =~ ^[Yy]$ ]]; then
        cat >"$BIN_LINK" <<LAUNCHER
#!/usr/bin/env bash
# SS-CAM CLI launcher — auto-generated by install-linux.sh
if [ -f "${INSTALL_DIR}/SS-CAM.Linux" ]; then
    exec "${INSTALL_DIR}/SS-CAM.Linux" "\$@"
else
    echo "[-] Error: SS-CAM binary not found at ${INSTALL_DIR}/SS-CAM.Linux"
    exit 1
fi
LAUNCHER
        chmod +x "$BIN_LINK"
        echo -e "  ${C_GREEN}✔ CLI command: ${C_BOLD}ss-cam${C_RESET}"
    fi

    if [[ "$SETUP_DESKTOP" =~ ^[Yy]$ ]]; then
        cat >"$DESKTOP_DIR/ss-cam.desktop" <<DESKTOP
[Desktop Entry]
Name=${DISPLAY_NAME}
GenericName=Creative Assets Management
Comment=SuamiSihat Creative Team Desktop App for Linux
Exec=${BIN_LINK}
Icon=ss-cam
Terminal=false
Type=Application
Categories=Graphics;Office;Development;AudioVideo;
StartupWMClass=SS-CAM.Linux
Keywords=SuamiSihat;Creative;DAM;Synology;Assets;Design;
DESKTOP
        chmod 644 "$DESKTOP_DIR/ss-cam.desktop"
        echo -e "  ${C_GREEN}✔ Desktop entry: ${C_BOLD}ss-cam.desktop${C_RESET}"
    fi

    command -v update-desktop-database &>/dev/null && update-desktop-database "$DESKTOP_DIR" 2>/dev/null || true
    command -v gtk-update-icon-cache   &>/dev/null && gtk-update-icon-cache -f -t /usr/share/icons/hicolor 2>/dev/null || true

    # ── Synology workspace directory ──────────────────────────────────────
    if [[ "$SETUP_SYNOLOGY" =~ ^[Yy]$ ]] && [ -n "$TARGET_HOME" ]; then
        local SYN_DIR="$TARGET_HOME/SynologyDrive/Creative-Team"
        if [ ! -d "$SYN_DIR" ]; then
            mkdir -p "$SYN_DIR" 2>/dev/null || true
            chown -R "${TARGET_USER}:" "$TARGET_HOME/SynologyDrive" 2>/dev/null || true
            echo -e "  ${C_GREEN}✔ Workspace directory: ${C_BOLD}${SYN_DIR}${C_RESET}"
        else
            echo -e "  ${C_GREEN}✔ Existing workspace found: ${C_BOLD}${SYN_DIR}${C_RESET}"
        fi
    fi

    # Write config stub for workspace path
    local SETTINGS_FILE="$TARGET_HOME/.config/ss-cam/settings.json"
    if [ ! -f "$SETTINGS_FILE" ]; then
        mkdir -p "$TARGET_HOME/.config/ss-cam"
        printf '{"WorkspaceRoot":"%s","Theme":"Default"}\n' \
            "$TARGET_HOME/SynologyDrive/Creative-Team" >"$SETTINGS_FILE"
        chown "${TARGET_USER}:" "$SETTINGS_FILE" 2>/dev/null || true
        echo -e "  ${C_GREEN}✔ Config stub: ${C_DIM}${SETTINGS_FILE}${C_RESET}"
    fi

    # ── SUCCESS SUMMARY ───────────────────────────────────────────────────────
    echo ""
    echo -e "${C_GREEN}══════════════════════════════════════════════════════════════${C_RESET}"
    echo -e "${C_GREEN}${C_BOLD}  ✔  SS-CAM v${VERSION} Installed Successfully!${C_RESET}"
    echo -e "${C_GREEN}══════════════════════════════════════════════════════════════${C_RESET}"
    echo -e "  ${C_BOLD}Location    :${C_RESET}  ${INSTALL_DIR}/SS-CAM.Linux"
    echo -e "  ${C_BOLD}CLI command :${C_RESET}  ${C_CYAN}ss-cam${C_RESET}"
    echo -e "  ${C_BOLD}Desktop     :${C_RESET}  Applications > ${DISPLAY_NAME}"
    echo -e "  ${C_BOLD}Workspace   :${C_RESET}  ${TARGET_HOME}/SynologyDrive/Creative-Team"
    echo -e "  ${C_BOLD}Config      :${C_RESET}  ${TARGET_HOME}/.config/ss-cam/"
    echo ""
    echo -e "  ${C_DIM}Modules: Dashboard · Project Creator · Search & Copy · Copywriting${C_RESET}"
    echo -e "  ${C_DIM}         Brand Assets · Task Manager · Calendar · Quick Notes${C_RESET}"
    echo -e "  ${C_DIM}         Wellbeing · Waktu Solat · Radio · QR Code · Health · Settings${C_RESET}"
    echo -e "${C_GREEN}══════════════════════════════════════════════════════════════${C_RESET}"
    echo ""

    # ── offer to launch ───────────────────────────────────────────────────────
    if [ $UNATTENDED -eq 0 ] && [ $IS_INTERACTIVE -eq 1 ]; then
        confirm "  ${C_CYAN}Launch SS-CAM now? [Y/n]: ${C_RESET}" "Y" && {
            echo -e "${C_GREEN}  Launching SS-CAM...${C_RESET}"
            if [ -n "$SUDO_USER" ]; then
                sudo -u "$SUDO_USER" DISPLAY="${DISPLAY:-:0}" "${INSTALL_DIR}/SS-CAM.Linux" &>/dev/null &
            else
                DISPLAY="${DISPLAY:-:0}" "${INSTALL_DIR}/SS-CAM.Linux" &>/dev/null &
            fi
        }
    fi

    echo ""
    echo -e "  ${C_DIM}To reinstall: ${C_RESET}sudo bash <(curl -fsSL ${CURL_INSTALL_URL})"
    echo -e "  ${C_DIM}To uninstall: ${C_RESET}sudo bash install-linux.sh --uninstall"
    echo ""
}

main "$@"
