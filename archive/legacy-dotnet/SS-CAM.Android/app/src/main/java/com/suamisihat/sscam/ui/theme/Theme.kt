package com.suamisihat.sscam.ui.theme

import androidx.compose.animation.animateColorAsState
import androidx.compose.animation.core.FastOutSlowInEasing
import androidx.compose.animation.core.tween
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Shapes
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.compositionLocalOf
import androidx.compose.runtime.getValue
import androidx.compose.runtime.staticCompositionLocalOf
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp

// Fluent 2 Geometry & Shape Scale
val FluentShapes = Shapes(
    extraSmall = RoundedCornerShape(4.dp),  // Badges & Micro-tags
    small = RoundedCornerShape(8.dp),       // Chips, Buttons & Inputs
    medium = RoundedCornerShape(12.dp),     // Canonical Fluent Cards & Dialogs
    large = RoundedCornerShape(16.dp),      // Hero Containers & Station Tiles
    extraLarge = RoundedCornerShape(24.dp)  // Pill Selectors & Segmented Bars
)

enum class AppThemeMode(
    val title: String,
    val subtitle: String,
    val primaryColor: Color,
    val containerColor: Color,
    val surfaceColor: Color,
    val cardColor: Color,
    val borderColor: Color,
    val accentColor: Color,
    val backgroundColor: Color,
    val isDark: Boolean = true,
    val textPrimary: Color = Color(0xFFF8FAFC),
    val textSecondary: Color = Color(0xFF94A3B8),
    val textMuted: Color = Color(0xFF64748B)
) {
    SS_LIGHT(
        title = "SS Light (Official)",
        subtitle = "Official SuamiSihat Royal Blue & Gold",
        primaryColor = SshRoyalBlue,
        containerColor = Color(0xFFE0EDFD),
        surfaceColor = Color(0xFFF1F5F9),
        cardColor = Color(0xFFFFFFFF),
        borderColor = Color(0xFFCBD5E1),
        accentColor = SshWarmGoldBright,
        backgroundColor = Color(0xFFF8FAFC),
        isDark = false,
        textPrimary = TextPrimaryLight,
        textSecondary = TextSecondaryLight,
        textMuted = TextDisabledLight
    ),
    SS_ROYAL(
        title = "SS Royal Navy",
        subtitle = "Canonical 60:30:10 Corporate",
        primaryColor = SshRoyalBlue,
        containerColor = SshRoyalBlue,
        surfaceColor = DarkSurface,
        cardColor = DarkSurfaceCard,
        borderColor = DarkBorder,
        accentColor = SshWarmGoldBright,
        backgroundColor = DarkBackground,
        isDark = true,
        textPrimary = TextPrimaryDark,
        textSecondary = TextSecondaryDark,
        textMuted = TextDisabledDark
    ),
    FALCONIA_GOLD(
        title = "Falconia Luxury",
        subtitle = "Imperial Gold & Warm Obsidian",
        primaryColor = Color(0xFFD4AF37),
        containerColor = Color(0xFF6B4E12),
        surfaceColor = Color(0xFF141009),
        cardColor = Color(0xFF1F1A0F),
        borderColor = Color(0xFF382E1A),
        accentColor = Color(0xFFFBBF24),
        backgroundColor = Color(0xFF0C0904),
        isDark = true,
        textPrimary = Color(0xFFF8FAFC),
        textSecondary = Color(0xFFCBD5E1),
        textMuted = Color(0xFF94A3B8)
    ),
    METAMORPHOSIS(
        title = "Metamorphosis",
        subtitle = "Holistic Wellness & Jade",
        primaryColor = Color(0xFF10B981),
        containerColor = Color(0xFF0A4F41),
        surfaceColor = Color(0xFF051E18),
        cardColor = Color(0xFF0A2B23),
        borderColor = Color(0xFF144D3F),
        accentColor = Color(0xFF34D399),
        backgroundColor = Color(0xFF03120E),
        isDark = true,
        textPrimary = Color(0xFFF8FAFC),
        textSecondary = Color(0xFF94A3B8),
        textMuted = Color(0xFF64748B)
    ),
    CYBERPUNK(
        title = "Cyberpunk Studio",
        subtitle = "High-Energy Violet & Neon",
        primaryColor = Color(0xFFEC4899),
        containerColor = Color(0xFF5B21B6),
        surfaceColor = Color(0xFF110B24),
        cardColor = Color(0xFF1A1236),
        borderColor = Color(0xFF2E1F5E),
        accentColor = Color(0xFF06B6D4),
        backgroundColor = Color(0xFF0A0617),
        isDark = true,
        textPrimary = Color(0xFFF8FAFC),
        textSecondary = Color(0xFFCBD5E1),
        textMuted = Color(0xFF94A3B8)
    ),
    EINK_MONO(
        title = "E-Ink Monochrome",
        subtitle = "Paper White, Slate & Pitch Black",
        primaryColor = Color(0xFF18181B),
        containerColor = Color(0xFFE4E4E7),
        surfaceColor = Color(0xFFF4F4F5),
        cardColor = Color(0xFFFFFFFF),
        borderColor = Color(0xFFD4D4D8),
        accentColor = Color(0xFF27272A),
        backgroundColor = Color(0xFFFAFAFA),
        isDark = false,
        textPrimary = Color(0xFF09090B),
        textSecondary = Color(0xFF52525B),
        textMuted = Color(0xFF71717A)
    );

    val isMonochrome: Boolean
        get() = this == EINK_MONO
}

data class SscamColors(
    val background: Color,
    val surface: Color,
    val card: Color,
    val border: Color,
    val primary: Color,
    val container: Color,
    val accent: Color,
    val isDark: Boolean,
    val isMonochrome: Boolean = false,
    val textPrimary: Color,
    val textSecondary: Color,
    val textMuted: Color,
    // Semantic Tokens
    val activePillBg: Color,
    val activePillTint: Color,
    val folderTabActiveBg: Color,
    val folderTabActiveContent: Color,
    val folderTabInactiveBg: Color,
    val folderTabInactiveContent: Color,
    val dividerSubtle: Color,
    val badgeSuccess: Color,
    val badgeWarning: Color,
    val badgeError: Color,
    val badgeInfo: Color
)

val LocalSscamColors = compositionLocalOf {
    SscamColors(
        background = Color(0xFFF8FAFC),
        surface = Color(0xFFF1F5F9),
        card = Color(0xFFFFFFFF),
        border = Color(0xFFCBD5E1),
        primary = SshRoyalBlue,
        container = Color(0xFFE0EDFD),
        accent = SshWarmGoldBright,
        isDark = false,
        isMonochrome = false,
        textPrimary = Color(0xFF0F172A),
        textSecondary = Color(0xFF475569),
        textMuted = Color(0xFF94A3B8),
        activePillBg = SshRoyalBlue,
        activePillTint = Color.White,
        folderTabActiveBg = SshRoyalBlue,
        folderTabActiveContent = Color.White,
        folderTabInactiveBg = Color.White,
        folderTabInactiveContent = Color(0xFF475569),
        dividerSubtle = Color(0xFFE2E8F0),
        badgeSuccess = SshSuccessGreen,
        badgeWarning = Color(0xFFD97706),
        badgeError = Color(0xFFDC2626),
        badgeInfo = SshRoyalBlue
    )
}

object ThemePreferences {
    private const val PREFS_NAME = "sscam_companion_prefs"
    private const val KEY_THEME = "key_app_theme"

    fun getSavedTheme(context: android.content.Context): AppThemeMode {
        val prefs = context.getSharedPreferences(PREFS_NAME, android.content.Context.MODE_PRIVATE)
        val name = prefs.getString(KEY_THEME, AppThemeMode.SS_LIGHT.name) ?: AppThemeMode.SS_LIGHT.name
        return try {
            AppThemeMode.valueOf(name)
        } catch (e: Exception) {
            AppThemeMode.SS_LIGHT
        }
    }

    fun saveTheme(context: android.content.Context, themeMode: AppThemeMode) {
        val prefs = context.getSharedPreferences(PREFS_NAME, android.content.Context.MODE_PRIVATE)
        prefs.edit().putString(KEY_THEME, themeMode.name).apply()
    }
}

@Composable
fun SscamTheme(
    themeMode: AppThemeMode = AppThemeMode.SS_LIGHT,
    content: @Composable () -> Unit
) {
    val animSpec = androidx.compose.animation.core.tween<Color>(durationMillis = 350, easing = androidx.compose.animation.core.FastOutSlowInEasing)

    val targetActivePillBg = when (themeMode) {
        AppThemeMode.EINK_MONO -> Color(0xFF18181B)
        AppThemeMode.SS_LIGHT -> SshRoyalBlue
        AppThemeMode.SS_ROYAL -> SshRoyalBlue
        AppThemeMode.FALCONIA_GOLD -> Color(0xFF2A200B)
        AppThemeMode.METAMORPHOSIS -> Color(0xFF0F3D32)
        AppThemeMode.CYBERPUNK -> Color(0xFF3B104F)
    }

    val targetActivePillTint = when (themeMode) {
        AppThemeMode.EINK_MONO -> Color(0xFFFFFFFF)
        AppThemeMode.SS_LIGHT -> Color(0xFFFFFFFF)
        AppThemeMode.SS_ROYAL -> Color(0xFFFFFFFF)
        AppThemeMode.FALCONIA_GOLD -> Color(0xFFFBBF24)
        AppThemeMode.METAMORPHOSIS -> Color(0xFF34D399)
        AppThemeMode.CYBERPUNK -> Color(0xFFF472B6)
    }

    val targetFolderTabActiveBg = when (themeMode) {
        AppThemeMode.EINK_MONO -> Color(0xFF18181B)
        AppThemeMode.SS_LIGHT -> SshRoyalBlue
        AppThemeMode.SS_ROYAL -> SshRoyalBlue
        AppThemeMode.FALCONIA_GOLD -> Color(0xFF6B4E12)
        AppThemeMode.METAMORPHOSIS -> Color(0xFF0A4F41)
        AppThemeMode.CYBERPUNK -> Color(0xFF5B21B6)
    }

    val targetFolderTabInactiveBg = when (themeMode) {
        AppThemeMode.EINK_MONO -> Color(0xFFFFFFFF)
        AppThemeMode.SS_LIGHT -> Color(0xFFFFFFFF)
        else -> themeMode.surfaceColor
    }

    val animBg by androidx.compose.animation.animateColorAsState(themeMode.backgroundColor, animSpec, label = "bg")
    val animSurface by androidx.compose.animation.animateColorAsState(themeMode.surfaceColor, animSpec, label = "surface")
    val animCard by androidx.compose.animation.animateColorAsState(themeMode.cardColor, animSpec, label = "card")
    val animBorder by androidx.compose.animation.animateColorAsState(themeMode.borderColor, animSpec, label = "border")
    val animPrimary by androidx.compose.animation.animateColorAsState(themeMode.primaryColor, animSpec, label = "primary")
    val animContainer by androidx.compose.animation.animateColorAsState(themeMode.containerColor, animSpec, label = "container")
    val animAccent by androidx.compose.animation.animateColorAsState(themeMode.accentColor, animSpec, label = "accent")
    val animTextPrimary by androidx.compose.animation.animateColorAsState(themeMode.textPrimary, animSpec, label = "textPrimary")
    val animTextSecondary by androidx.compose.animation.animateColorAsState(themeMode.textSecondary, animSpec, label = "textSecondary")
    val animTextMuted by androidx.compose.animation.animateColorAsState(themeMode.textMuted, animSpec, label = "textMuted")

    val animActivePillBg by androidx.compose.animation.animateColorAsState(targetActivePillBg, animSpec, label = "activePillBg")
    val animActivePillTint by androidx.compose.animation.animateColorAsState(targetActivePillTint, animSpec, label = "activePillTint")
    val animFolderTabActiveBg by androidx.compose.animation.animateColorAsState(targetFolderTabActiveBg, animSpec, label = "folderTabActiveBg")
    val animFolderTabInactiveBg by androidx.compose.animation.animateColorAsState(targetFolderTabInactiveBg, animSpec, label = "folderTabInactiveBg")

    val colorScheme = if (themeMode.isDark) {
        darkColorScheme(
            primary = animPrimary,
            onPrimary = animTextPrimary,
            primaryContainer = animContainer,
            onPrimaryContainer = animTextPrimary,
            secondary = animAccent,
            onSecondary = animBg,
            secondaryContainer = animCard,
            onSecondaryContainer = animAccent,
            background = animBg,
            onBackground = animTextPrimary,
            surface = animSurface,
            onSurface = animTextPrimary,
            surfaceVariant = animCard,
            onSurfaceVariant = animTextSecondary,
            outline = animBorder,
            outlineVariant = DarkBorderSubtle
        )
    } else {
        lightColorScheme(
            primary = animPrimary,
            onPrimary = Color.White,
            primaryContainer = animContainer,
            onPrimaryContainer = Color(0xFF022057),
            secondary = animAccent,
            onSecondary = Color.White,
            secondaryContainer = animCard,
            onSecondaryContainer = animAccent,
            background = animBg,
            onBackground = animTextPrimary,
            surface = animSurface,
            onSurface = animTextPrimary,
            surfaceVariant = animCard,
            onSurfaceVariant = animTextSecondary,
            outline = animBorder,
            outlineVariant = Color(0xFFCBD5E1)
        )
    }

    val sscamColors = SscamColors(
        background = animBg,
        surface = animSurface,
        card = animCard,
        border = animBorder,
        primary = animPrimary,
        container = animContainer,
        accent = animAccent,
        isDark = themeMode.isDark,
        isMonochrome = themeMode.isMonochrome,
        textPrimary = animTextPrimary,
        textSecondary = animTextSecondary,
        textMuted = animTextMuted,
        activePillBg = animActivePillBg,
        activePillTint = animActivePillTint,
        folderTabActiveBg = animFolderTabActiveBg,
        folderTabActiveContent = Color.White,
        folderTabInactiveBg = animFolderTabInactiveBg,
        folderTabInactiveContent = animTextSecondary,
        dividerSubtle = if (themeMode.isDark) DarkBorderSubtle else Color(0xFFE2E8F0),
        badgeSuccess = SshSuccessGreen,
        badgeWarning = Color(0xFFD97706),
        badgeError = Color(0xFFDC2626),
        badgeInfo = animPrimary
    )

    CompositionLocalProvider(
        LocalSscamColors provides sscamColors
    ) {
        MaterialTheme(
            colorScheme = colorScheme,
            shapes = FluentShapes,
            content = content
        )
    }
}
