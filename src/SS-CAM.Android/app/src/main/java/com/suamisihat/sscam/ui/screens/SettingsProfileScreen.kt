package com.suamisihat.sscam.ui.screens

import android.widget.Toast
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.Logout
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.SpanStyle
import androidx.compose.ui.text.buildAnnotatedString
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.withStyle
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.suamisihat.sscam.data.models.StaffMember
import com.suamisihat.sscam.ui.components.*
import com.suamisihat.sscam.ui.theme.*

@Composable
fun SettingsProfileScreen(
    currentTheme: AppThemeMode = AppThemeMode.SS_ROYAL,
    currentUserProfile: StaffMember? = null,
    onThemeSelected: (AppThemeMode) -> Unit = {},
    onSignOut: () -> Unit = {}
) {
    val context = LocalContext.current
    val colors = LocalSscamColors.current
    val haptic = androidx.compose.ui.platform.LocalHapticFeedback.current

    var keepAwake by remember { mutableStateOf(true) }
    var prayerAlerts by remember { mutableStateOf(true) }
    var deliverableAlerts by remember { mutableStateOf(true) }
    var nasServerUrl by remember { mutableStateOf("https://creative.suamisihat.myds.me") }
    var isPreferencesExpanded by remember { mutableStateOf(true) }

    val designerName = currentUserProfile?.name?.ifBlank { "Harussani" } ?: "Harussani"
    val designerUsername = currentUserProfile?.username?.ifBlank { "harussani" } ?: "harussani"
    val designerStaffId = currentUserProfile?.staffId?.ifBlank { "SS0004" } ?: "SS0004"
    val designerRole = currentUserProfile?.role?.ifBlank { "Designer" } ?: "Designer"
    val designerBrand = currentUserProfile?.defaultBrand?.ifBlank { "SSH" } ?: "SSH"

    val imageModel: Any? = remember(currentUserProfile?.profileImageUrl) {
        val url = currentUserProfile?.profileImageUrl
        if (url.isNullOrBlank()) null
        else if (url.startsWith("data:image/")) {
            try {
                val base64Data = url.substringAfter(",")
                val decodedBytes = android.util.Base64.decode(base64Data, android.util.Base64.DEFAULT)
                android.graphics.BitmapFactory.decodeByteArray(decodedBytes, 0, decodedBytes.size)
            } catch (e: Exception) {
                url
            }
        } else {
            url
        }
    }

    LazyColumn(
        modifier = Modifier
            .fillMaxSize()
            .background(colors.background)
            .padding(horizontal = 22.dp, vertical = 12.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        // 1. Editorial Header Bar (PROFILE • 01)
        item {
            Column(modifier = Modifier.fillMaxWidth()) {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(bottom = 8.dp),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text(
                        text = "PROFILE",
                        fontSize = 11.sp,
                        fontWeight = FontWeight.Bold,
                        letterSpacing = 1.8.sp,
                        color = if (colors.isDark) Color(0xFF94A3B8) else Color(0xFF1E293B)
                    )
                    Text(
                        text = designerStaffId.takeLast(2).ifBlank { "01" },
                        fontSize = 11.sp,
                        fontWeight = FontWeight.Bold,
                        color = if (colors.isDark) Color(0xFF94A3B8) else Color(0xFF1E293B)
                    )
                }
                HorizontalDivider(
                    thickness = 0.8.dp,
                    color = if (colors.isDark) colors.border.copy(alpha = 0.6f) else Color(0xFFE2E8F0)
                )
            }
        }

        // 2. Hero Identity 2-Column Section (Square Portrait & Huge Numeral)
        item {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(top = 4.dp),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.Top
            ) {
                // Left Column: Square Photo Portrait & Designer Title
                Column(modifier = Modifier.weight(1f)) {
                    Surface(
                        shape = RoundedCornerShape(2.dp),
                        color = if (colors.isDark) Color(0xFF1E293B) else Color(0xFFE2E8F0),
                        modifier = Modifier.size(135.dp)
                    ) {
                        if (imageModel != null) {
                            coil.compose.SubcomposeAsyncImage(
                                model = imageModel,
                                contentDescription = "Profile Photo",
                                contentScale = ContentScale.Crop,
                                colorFilter = if (colors.isMonochrome) androidx.compose.ui.graphics.ColorFilter.colorMatrix(androidx.compose.ui.graphics.ColorMatrix().apply { setToSaturation(0f) }) else null,
                                modifier = Modifier.fillMaxSize(),
                                loading = {
                                    Box(
                                        contentAlignment = Alignment.Center,
                                        modifier = Modifier.fillMaxSize().background(if (colors.isDark) Color(0xFF1E293B) else Color(0xFFE2E8F0))
                                    ) {
                                        Text(
                                            designerName.take(1).uppercase(),
                                            fontSize = 44.sp,
                                            fontWeight = FontWeight.Bold,
                                            color = colors.primary
                                        )
                                    }
                                },
                                error = {
                                    Box(
                                        contentAlignment = Alignment.Center,
                                        modifier = Modifier.fillMaxSize().background(if (colors.isDark) Color(0xFF1E293B) else Color(0xFFE2E8F0))
                                    ) {
                                        Text(
                                            designerName.take(1).uppercase(),
                                            fontSize = 44.sp,
                                            fontWeight = FontWeight.Bold,
                                            color = colors.primary
                                        )
                                    }
                                }
                            )
                        } else {
                            Box(
                                contentAlignment = Alignment.Center,
                                modifier = Modifier.fillMaxSize().background(if (colors.isDark) Color(0xFF1E293B) else Color(0xFFE2E8F0))
                            ) {
                                Text(
                                    designerName.take(1).uppercase(),
                                    fontSize = 44.sp,
                                    fontWeight = FontWeight.Bold,
                                    color = colors.primary
                                )
                            }
                        }
                    }

                    Spacer(modifier = Modifier.height(16.dp))

                    Text(
                        text = designerName,
                        fontSize = 28.sp,
                        fontWeight = FontWeight.SemiBold,
                        color = colors.textPrimary,
                        letterSpacing = (-0.5).sp
                    )

                    Spacer(modifier = Modifier.height(6.dp))

                    Text(
                        text = designerRole.uppercase(),
                        fontSize = 9.sp,
                        fontWeight = FontWeight.Bold,
                        letterSpacing = 1.2.sp,
                        color = if (colors.isDark) Color(0xFF94A3B8) else Color(0xFF64748B)
                    )

                    Spacer(modifier = Modifier.height(2.dp))

                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        modifier = Modifier.clickable {
                            Toast.makeText(context, "Location: Cyberjaya Studio HQ ($designerBrand)", Toast.LENGTH_SHORT).show()
                        }
                    ) {
                        Text(
                            text = "Cyberjaya, MY",
                            fontSize = 13.sp,
                            fontWeight = FontWeight.Normal,
                            color = colors.textPrimary
                        )
                        Spacer(modifier = Modifier.width(4.dp))
                        Text(
                            text = "↗",
                            fontSize = 13.sp,
                            color = if (colors.isDark) Color(0xFF94A3B8) else Color(0xFF64748B)
                        )
                    }
                }

                // Right Column: Big Display Numeral & Active Status
                Column(
                    horizontalAlignment = Alignment.End,
                    modifier = Modifier.padding(start = 12.dp, top = 4.dp)
                ) {
                    Text(
                        text = designerStaffId.takeLast(2).ifBlank { "01" },
                        fontSize = 72.sp,
                        fontWeight = FontWeight.Light,
                        color = colors.textPrimary,
                        letterSpacing = (-3).sp,
                        lineHeight = 72.sp
                    )

                    Spacer(modifier = Modifier.height(14.dp))

                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Box(
                            modifier = Modifier
                                .size(7.dp)
                                .clip(CircleShape)
                                .background(if (colors.isMonochrome) Color(0xFF18181B) else Color(0xFF2563EB))
                        )
                        Spacer(modifier = Modifier.width(6.dp))
                        Text(
                            text = "ACTIVE NOW",
                            fontSize = 9.sp,
                            fontWeight = FontWeight.Bold,
                            letterSpacing = 0.8.sp,
                            color = colors.textPrimary
                        )
                    }

                    Spacer(modifier = Modifier.height(4.dp))

                    Text(
                        text = buildAnnotatedString {
                            append("Dept: ")
                            withStyle(SpanStyle(fontWeight = FontWeight.Bold)) {
                                append(currentUserProfile?.department ?: "Creative")
                            }
                        },
                        fontSize = 12.sp,
                        color = if (colors.isDark) Color(0xFF94A3B8) else Color(0xFF64748B)
                    )
                }
            }
        }

        // 3. Hairline Divider
        item {
            HorizontalDivider(
                thickness = 0.8.dp,
                color = if (colors.isDark) colors.border.copy(alpha = 0.6f) else Color(0xFFE2E8F0)
            )
        }

        // 4. ABOUT Section
        item {
            Column(modifier = Modifier.fillMaxWidth()) {
                Text(
                    text = "ABOUT",
                    fontSize = 9.sp,
                    fontWeight = FontWeight.Bold,
                    letterSpacing = 1.2.sp,
                    color = if (colors.isDark) Color(0xFF94A3B8) else Color(0xFF64748B)
                )
                Spacer(modifier = Modifier.height(6.dp))
                Text(
                    text = "Product & creative designer focused on minimal systems, packaging dielines, thoughtful details, and human-centred design.",
                    fontSize = 13.sp,
                    lineHeight = 19.sp,
                    color = colors.textPrimary
                )
            }
        }

        // 5. INTERESTS / SKILLS Section
        item {
            Column(modifier = Modifier.fillMaxWidth()) {
                Text(
                    text = "INTERESTS",
                    fontSize = 9.sp,
                    fontWeight = FontWeight.Bold,
                    letterSpacing = 1.2.sp,
                    color = if (colors.isDark) Color(0xFF94A3B8) else Color(0xFF64748B)
                )
                Spacer(modifier = Modifier.height(8.dp))
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(16.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text("Architecture", fontSize = 13.sp, color = colors.textPrimary)
                    Text("Typography", fontSize = 13.sp, color = colors.textPrimary)
                    Text("Photography", fontSize = 13.sp, color = colors.textPrimary)
                    Text("Design", fontSize = 13.sp, color = colors.textPrimary)
                }
            }
        }

        // 6. CONNECT CARD (Warm Sand / Stone Surface with Dot Matrix)
        item {
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .clip(RoundedCornerShape(6.dp))
                    .background(
                        if (colors.isMonochrome) Color(0xFFF4F4F5) else if (colors.isDark) Color(0xFF1E293B) else Color(0xFFDCD8D0)
                    )
                    .border(
                        if (colors.isMonochrome) 1.dp else 0.dp,
                        if (colors.isMonochrome) Color(0xFFD4D4D8) else Color.Transparent,
                        RoundedCornerShape(6.dp)
                    )
                    .padding(16.dp)
            ) {
                Column(modifier = Modifier.fillMaxWidth()) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text(
                            text = "CONNECT CARD",
                            fontSize = 9.sp,
                            fontWeight = FontWeight.Bold,
                            letterSpacing = 1.2.sp,
                            color = if (colors.isMonochrome) Color(0xFF52525B) else if (colors.isDark) Color(0xFF94A3B8) else Color(0xFF475569)
                        )
                        Text(
                            text = "01",
                            fontSize = 9.sp,
                            fontWeight = FontWeight.Bold,
                            color = if (colors.isMonochrome) Color(0xFF52525B) else if (colors.isDark) Color(0xFF94A3B8) else Color(0xFF475569)
                        )
                    }

                    Spacer(modifier = Modifier.height(14.dp))

                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        // Left Text
                        Column(modifier = Modifier.weight(1f)) {
                            Text(
                                text = "Share your card\nto connect\nintentionally.",
                                fontSize = 14.sp,
                                fontWeight = FontWeight.Medium,
                                lineHeight = 20.sp,
                                color = if (colors.isMonochrome) Color(0xFF18181B) else if (colors.isDark) Color.White else Color(0xFF0F172A)
                            )
                        }

                        // Right: Dot Matrix Grid
                        DotMatrixGrid(
                            rows = 9,
                            cols = 15,
                            dotSize = 2.dp,
                            dotSpacing = 3.5.dp,
                            color = if (colors.isMonochrome) Color(0xFF71717A) else if (colors.isDark) Color(0xFF64748B) else Color(0xFF334155),
                            modifier = Modifier
                                .width(90.dp)
                                .height(52.dp)
                        )
                    }

                    Spacer(modifier = Modifier.height(14.dp))

                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        modifier = Modifier.clickable {
                            Toast.makeText(context, "Studio Connect Card: ${designerName} (${designerStaffId})", Toast.LENGTH_SHORT).show()
                        }
                    ) {
                        Text(
                            text = "TAP TO VIEW",
                            fontSize = 10.sp,
                            fontWeight = FontWeight.Bold,
                            letterSpacing = 1.2.sp,
                            color = if (colors.isMonochrome) Color(0xFF18181B) else if (colors.isDark) Color.White else Color(0xFF0F172A)
                        )
                        Spacer(modifier = Modifier.width(4.dp))
                        Text(
                            text = "↗",
                            fontSize = 11.sp,
                            color = if (colors.isMonochrome) Color(0xFF18181B) else if (colors.isDark) Color.White else Color(0xFF0F172A)
                        )
                    }
                }
            }
        }

        // 7. Bottom Two-Column Metrics (CONNECTIONS • MOMENTS)
        item {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(vertical = 4.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                // Left Metric: DELIVERABLES
                val assignedDeliverables = currentUserProfile?.totalAssignedCount ?: currentUserProfile?.workload?.total ?: 0
                val activeProjectsCount = currentUserProfile?.workload?.inProgress ?: 0

                Column(
                    modifier = Modifier
                        .weight(1f)
                        .padding(end = 12.dp)
                ) {
                    Text(
                        text = "DELIVERABLES",
                        fontSize = 9.sp,
                        fontWeight = FontWeight.Bold,
                        letterSpacing = 1.2.sp,
                        color = if (colors.isDark) Color(0xFF94A3B8) else Color(0xFF64748B)
                    )
                    Spacer(modifier = Modifier.height(6.dp))
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        modifier = Modifier.clickable {
                            Toast.makeText(context, "$assignedDeliverables Assigned Deliverables", Toast.LENGTH_SHORT).show()
                        }
                    ) {
                        Text(
                            text = String.format("%02d", assignedDeliverables),
                            fontSize = 24.sp,
                            fontWeight = FontWeight.SemiBold,
                            color = colors.textPrimary
                        )
                        Spacer(modifier = Modifier.width(4.dp))
                        Text(
                            text = "↗",
                            fontSize = 14.sp,
                            color = if (colors.isDark) Color(0xFF94A3B8) else Color(0xFF64748B)
                        )
                    }
                }

                // Vertical Hairline Divider
                Box(
                    modifier = Modifier
                        .height(36.dp)
                        .width(0.8.dp)
                        .background(if (colors.isDark) colors.border.copy(alpha = 0.6f) else Color(0xFFE2E8F0))
                )

                // Right Metric: PROJECTS
                Column(
                    modifier = Modifier
                        .weight(1f)
                        .padding(start = 16.dp)
                ) {
                    Text(
                        text = "ACTIVE SPRINT",
                        fontSize = 9.sp,
                        fontWeight = FontWeight.Bold,
                        letterSpacing = 1.2.sp,
                        color = if (colors.isDark) Color(0xFF94A3B8) else Color(0xFF64748B)
                    )
                    Spacer(modifier = Modifier.height(6.dp))
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        modifier = Modifier.clickable {
                            Toast.makeText(context, "$activeProjectsCount In-Progress Projects", Toast.LENGTH_SHORT).show()
                        }
                    ) {
                        Text(
                            text = String.format("%02d", activeProjectsCount),
                            fontSize = 24.sp,
                            fontWeight = FontWeight.SemiBold,
                            color = colors.textPrimary
                        )
                        Spacer(modifier = Modifier.width(4.dp))
                        Text(
                            text = "↗",
                            fontSize = 14.sp,
                            color = if (colors.isDark) Color(0xFF94A3B8) else Color(0xFF64748B)
                        )
                    }
                }
            }
        }

        // 8. Hairline Divider
        item {
            HorizontalDivider(
                thickness = 0.8.dp,
                color = if (colors.isDark) colors.border.copy(alpha = 0.6f) else Color(0xFFE2E8F0)
            )
        }

        // 9. Studio Preferences & Theme Switcher (Expandable Minimalist Container)
        item {
            Column(modifier = Modifier.fillMaxWidth()) {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .clip(RoundedCornerShape(8.dp))
                        .clickable { isPreferencesExpanded = !isPreferencesExpanded }
                        .padding(vertical = 8.dp),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Icon(
                            imageVector = Icons.Default.Tune,
                            contentDescription = "Preferences",
                            tint = if (colors.isMonochrome) Color(0xFF18181B) else colors.primary,
                            modifier = Modifier.size(16.dp)
                        )
                        Spacer(modifier = Modifier.width(8.dp))
                        Text(
                            text = "STUDIO PREFERENCES & THEMES",
                            fontSize = 10.sp,
                            fontWeight = FontWeight.Bold,
                            letterSpacing = 1.2.sp,
                            color = colors.textPrimary
                        )
                    }
                    Text(
                        text = if (isPreferencesExpanded) "▲" else "▼",
                        fontSize = 10.sp,
                        color = colors.textSecondary
                    )
                }

                if (isPreferencesExpanded) {
                    Spacer(modifier = Modifier.height(10.dp))

                    FluentCard(
                        cornerRadius = 12.dp,
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Column(
                            modifier = Modifier.padding(14.dp),
                            verticalArrangement = Arrangement.spacedBy(12.dp)
                        ) {
                            Text("Theme Preset", fontSize = 11.sp, fontWeight = FontWeight.Bold, color = colors.textSecondary)

                            AppThemeMode.entries.forEach { mode ->
                                val isSelected = currentTheme == mode
                                val itemBg = if (isSelected) {
                                    if (colors.isDark) mode.containerColor.copy(alpha = 0.3f) else mode.containerColor
                                } else {
                                    if (colors.isDark) colors.background else Color(0xFFF8FAFC)
                                }
                                Box(
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .clip(RoundedCornerShape(8.dp))
                                        .background(itemBg)
                                        .border(
                                            if (isSelected) 1.5.dp else 1.dp,
                                            if (isSelected) mode.primaryColor else colors.border,
                                            RoundedCornerShape(8.dp)
                                        )
                                        .clickable {
                                            try {
                                                haptic.performHapticFeedback(androidx.compose.ui.hapticfeedback.HapticFeedbackType.TextHandleMove)
                                            } catch (e: Exception) {}
                                            onThemeSelected(mode)
                                            Toast.makeText(context, "${mode.title} theme activated", Toast.LENGTH_SHORT).show()
                                        }
                                        .padding(10.dp)
                                 ) {
                                    Row(
                                        modifier = Modifier.fillMaxWidth(),
                                        horizontalArrangement = Arrangement.SpaceBetween,
                                        verticalAlignment = Alignment.CenterVertically
                                    ) {
                                        Row(verticalAlignment = Alignment.CenterVertically) {
                                            Row(horizontalArrangement = Arrangement.spacedBy(4.dp)) {
                                                Box(modifier = Modifier.size(12.dp).clip(CircleShape).background(mode.primaryColor))
                                                Box(modifier = Modifier.size(12.dp).clip(CircleShape).background(mode.surfaceColor).border(0.5.dp, colors.border, CircleShape))
                                                Box(modifier = Modifier.size(12.dp).clip(CircleShape).background(mode.accentColor))
                                            }
                                            Spacer(modifier = Modifier.width(10.dp))
                                            Text(
                                                mode.title,
                                                fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Medium,
                                                color = if (isSelected) mode.primaryColor else colors.textPrimary,
                                                fontSize = 12.sp
                                            )
                                        }
                                        if (isSelected) {
                                            Icon(Icons.Default.Check, contentDescription = "Active", tint = mode.primaryColor, modifier = Modifier.size(16.dp))
                                        }
                                    }
                                }
                            }

                            HorizontalDivider(color = colors.border)

                            // Keep Awake Switch
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Text("Desk Companion Keep-Awake", fontSize = 12.sp, color = colors.textPrimary)
                                Switch(
                                    checked = keepAwake,
                                    onCheckedChange = { keepAwake = it },
                                    colors = SwitchDefaults.colors(
                                        checkedThumbColor = Color.White,
                                        checkedTrackColor = if (colors.isMonochrome) Color(0xFF18181B) else colors.primary,
                                        uncheckedTrackColor = if (colors.isMonochrome) Color(0xFFE4E4E7) else colors.border
                                    )
                                )
                            }

                            // Prayer Alerts Switch
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Text("Prayer Schedule Audio Alerts", fontSize = 12.sp, color = colors.textPrimary)
                                Switch(
                                    checked = prayerAlerts,
                                    onCheckedChange = { prayerAlerts = it },
                                    colors = SwitchDefaults.colors(
                                        checkedThumbColor = Color.White,
                                        checkedTrackColor = if (colors.isMonochrome) Color(0xFF18181B) else SshSuccessGreen,
                                        uncheckedTrackColor = if (colors.isMonochrome) Color(0xFFE4E4E7) else colors.border
                                    )
                                )
                            }

                            // Deliverable Alerts Switch
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Text("Deliverable Sign-Off Pings", fontSize = 12.sp, color = colors.textPrimary)
                                Switch(
                                    checked = deliverableAlerts,
                                    onCheckedChange = { deliverableAlerts = it },
                                    colors = SwitchDefaults.colors(
                                        checkedThumbColor = Color.White,
                                        checkedTrackColor = if (colors.isMonochrome) Color(0xFF18181B) else colors.accent,
                                        uncheckedTrackColor = if (colors.isMonochrome) Color(0xFFE4E4E7) else colors.border
                                    )
                                )
                            }

                            HorizontalDivider(color = colors.border)

                            // Sign Out / Switch Account Action Button
                            Button(
                                onClick = {
                                    try { haptic.performHapticFeedback(androidx.compose.ui.hapticfeedback.HapticFeedbackType.LongPress) } catch (e: Exception) {}
                                    onSignOut()
                                },
                                shape = RoundedCornerShape(10.dp),
                                colors = ButtonDefaults.buttonColors(
                                    containerColor = if (colors.isMonochrome) Color(0xFFF4F4F5) else Color(0xFFEF4444).copy(alpha = 0.15f),
                                    contentColor = if (colors.isMonochrome) Color(0xFF18181B) else Color(0xFFEF4444)
                                ),
                                border = androidx.compose.foundation.BorderStroke(1.dp, if (colors.isMonochrome) Color(0xFFD4D4D8) else Color(0xFFEF4444).copy(alpha = 0.4f)),
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .height(42.dp)
                            ) {
                                Icon(
                                    Icons.AutoMirrored.Filled.Logout,
                                    contentDescription = "Sign Out",
                                    modifier = Modifier.size(16.dp)
                                )
                                Spacer(modifier = Modifier.width(8.dp))
                                Text(
                                    "Switch Account / Sign Out",
                                    fontSize = 12.sp,
                                    fontWeight = FontWeight.Bold
                                )
                            }
                        }
                    }
                }
            }
        }

        // 10. Minimalist Footer
        item {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(vertical = 12.dp),
                horizontalAlignment = Alignment.CenterHorizontally
            ) {
                Text(
                    "SS-CAM Studio Identity • $designerStaffId",
                    fontSize = 11.sp,
                    fontWeight = FontWeight.Medium,
                    color = if (colors.isDark) Color(0xFF64748B) else Color(0xFF94A3B8)
                )
            }
        }
    }
}

/**
 * Geometric Dot Matrix Pattern for NFC / Studio Card representation.
 */
@Composable
fun DotMatrixGrid(
    rows: Int = 9,
    cols: Int = 15,
    dotSize: Dp = 2.dp,
    dotSpacing: Dp = 3.5.dp,
    color: Color = Color(0xFF475569),
    modifier: Modifier = Modifier
) {
    Canvas(modifier = modifier) {
        val dSize = dotSize.toPx()
        val spacing = dotSpacing.toPx()
        val step = dSize + spacing

        for (r in 0 until rows) {
            for (c in 0 until cols) {
                drawCircle(
                    color = color.copy(alpha = 0.5f),
                    radius = dSize / 2f,
                    center = Offset(c * step + dSize / 2f, r * step + dSize / 2f)
                )
            }
        }
    }
}
