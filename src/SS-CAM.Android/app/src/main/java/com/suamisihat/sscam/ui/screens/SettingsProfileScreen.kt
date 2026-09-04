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
import com.suamisihat.sscam.AuthPreferences
import com.suamisihat.sscam.data.models.ProjectItem
import com.suamisihat.sscam.data.models.StaffMember
import com.suamisihat.sscam.ui.components.*
import com.suamisihat.sscam.ui.theme.*

@Composable
fun SettingsProfileScreen(
    currentTheme: AppThemeMode = AppThemeMode.SS_ROYAL,
    currentUserProfile: StaffMember? = null,
    projects: List<ProjectItem> = emptyList(),
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
    val designerRole = currentUserProfile?.role?.ifBlank { "Admin, Designer" } ?: "Admin, Designer"
    val designerBrand = currentUserProfile?.defaultBrand?.ifBlank { "SSH" } ?: "SSH"
    val designerDept = currentUserProfile?.department?.ifBlank { "Creative Production" } ?: "Creative Production"
    val designerEmail = remember(currentUserProfile) {
        val em = currentUserProfile?.email
        if (!em.isNullOrBlank()) em else AuthPreferences.getSavedEmail(context).ifBlank { "harussani.suamisihat@gmail.com" }
    }

    var userBio by remember { mutableStateOf(AuthPreferences.getSavedBio(context)) }
    var isEditBioDialogOpen by remember { mutableStateOf(false) }
    var tempBio by remember { mutableStateOf(userBio) }
    var isConnectCardDialogOpen by remember { mutableStateOf(false) }

    val designerProjects = remember(projects, designerName, designerStaffId, designerUsername) {
        projects.filter { p ->
            val d = p.designer.orEmpty()
            d.contains(designerName, ignoreCase = true) ||
            d.contains(designerStaffId, ignoreCase = true) ||
            d.contains(designerUsername, ignoreCase = true) ||
            (d.isBlank() && designerRole.contains("Admin", ignoreCase = true))
        }
    }

    val assignedDeliverables = remember(currentUserProfile, designerProjects) {
        if (currentUserProfile?.totalAssignedCount != null && currentUserProfile.totalAssignedCount > 0) {
            currentUserProfile.totalAssignedCount
        } else if (currentUserProfile?.workload?.total != null && currentUserProfile.workload.total > 0) {
            currentUserProfile.workload.total
        } else {
            designerProjects.size.coerceAtLeast(1)
        }
    }

    val activeProjectsCount = remember(currentUserProfile, designerProjects) {
        if (currentUserProfile?.workload?.inProgress != null && currentUserProfile.workload.inProgress > 0) {
            currentUserProfile.workload.inProgress
        } else {
            val inProg = designerProjects.count {
                it.status.equals("in-progress", ignoreCase = true) ||
                it.status.equals("active", ignoreCase = true) ||
                it.status.equals("review", ignoreCase = true)
            }
            if (inProg > 0) inProg else 1
        }
    }

    val imageModel: Any? = remember(currentUserProfile?.profileImageUrl) {
        val url = currentUserProfile?.profileImageUrl
        if (url.isNullOrBlank()) null
        else if (url.startsWith("data:image/")) {
            try {
                val base64Data = url.substringAfter(",")
                val decodedBytes = android.util.Base64.decode(base64Data, android.util.Base64.DEFAULT)
                android.graphics.BitmapFactory.decodeByteArray(decodedBytes, 0, decodedBytes.size)
            } catch (_: Exception) {
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
        // 1. Editorial Header Bar (SETTINGS & PROFILE • v4.6.1)
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
                        text = "SETTINGS & PROFILE",
                        fontSize = 11.sp,
                        fontWeight = FontWeight.Bold,
                        letterSpacing = 1.8.sp,
                        color = if (colors.isDark) Color(0xFF94A3B8) else Color(0xFF1E293B)
                    )
                    Surface(
                        shape = RoundedCornerShape(4.dp),
                        color = colors.primary.copy(alpha = 0.12f),
                        border = androidx.compose.foundation.BorderStroke(1.dp, colors.primary.copy(alpha = 0.3f))
                    ) {
                        Text(
                            text = "v4.6.1",
                            fontSize = 10.sp,
                            fontWeight = FontWeight.Bold,
                            color = colors.primary,
                            modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp)
                        )
                    }
                }
                HorizontalDivider(
                    thickness = 0.8.dp,
                    color = if (colors.isDark) colors.border.copy(alpha = 0.6f) else Color(0xFFE2E8F0)
                )
            }
        }

        // 2. Hero Identity 2-Column Section (Square Portrait & Designer Badges)
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
                        shape = RoundedCornerShape(4.dp),
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

                    Spacer(modifier = Modifier.height(14.dp))

                    Text(
                        text = designerName,
                        fontSize = 28.sp,
                        fontWeight = FontWeight.SemiBold,
                        color = colors.textPrimary,
                        letterSpacing = (-0.5).sp
                    )

                    Spacer(modifier = Modifier.height(4.dp))

                    Text(
                        text = designerRole.uppercase(),
                        fontSize = 9.sp,
                        fontWeight = FontWeight.Bold,
                        letterSpacing = 1.2.sp,
                        color = if (colors.isDark) Color(0xFF94A3B8) else Color(0xFF64748B)
                    )

                    Spacer(modifier = Modifier.height(4.dp))

                    // Email with Tap-to-Copy
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        modifier = Modifier
                            .clickable {
                                val clipboard = context.getSystemService(android.content.Context.CLIPBOARD_SERVICE) as android.content.ClipboardManager
                                val clip = android.content.ClipData.newPlainText("Email", designerEmail)
                                clipboard.setPrimaryClip(clip)
                                Toast.makeText(context, "Email copied: $designerEmail", Toast.LENGTH_SHORT).show()
                            }
                    ) {
                        Icon(
                            imageVector = Icons.Default.Email,
                            contentDescription = "Email",
                            tint = colors.primary,
                            modifier = Modifier.size(13.dp)
                        )
                        Spacer(modifier = Modifier.width(4.dp))
                        Text(
                            text = designerEmail,
                            fontSize = 11.sp,
                            fontWeight = FontWeight.Medium,
                            color = colors.primary,
                            maxLines = 1
                        )
                    }

                    Spacer(modifier = Modifier.height(3.dp))

                    // Location
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        modifier = Modifier.clickable {
                            Toast.makeText(context, "Studio Station: Cyberjaya Studio HQ (Holding - $designerBrand)", Toast.LENGTH_SHORT).show()
                        }
                    ) {
                        Icon(
                            imageVector = Icons.Default.LocationOn,
                            contentDescription = "Location",
                            tint = if (colors.isDark) Color(0xFF94A3B8) else Color(0xFF64748B),
                            modifier = Modifier.size(13.dp)
                        )
                        Spacer(modifier = Modifier.width(4.dp))
                        Text(
                            text = "Cyberjaya, Selangor (HQ)",
                            fontSize = 11.sp,
                            fontWeight = FontWeight.Normal,
                            color = if (colors.isDark) Color(0xFF94A3B8) else Color(0xFF64748B)
                        )
                        Spacer(modifier = Modifier.width(3.dp))
                        Text(
                            text = "↗",
                            fontSize = 11.sp,
                            color = if (colors.isDark) Color(0xFF94A3B8) else Color(0xFF64748B)
                        )
                    }
                }

                // Right Column: Official Staff ID Badge & Display Numeral
                Column(
                    horizontalAlignment = Alignment.End,
                    modifier = Modifier.padding(start = 12.dp, top = 4.dp)
                ) {
                    Text(
                        text = "STAFF ID",
                        fontSize = 9.sp,
                        fontWeight = FontWeight.Bold,
                        letterSpacing = 1.4.sp,
                        color = if (colors.isDark) Color(0xFF94A3B8) else Color(0xFF64748B)
                    )

                    Surface(
                        shape = RoundedCornerShape(4.dp),
                        color = colors.primary.copy(alpha = 0.12f),
                        border = androidx.compose.foundation.BorderStroke(1.dp, colors.primary.copy(alpha = 0.35f)),
                        modifier = Modifier.padding(top = 2.dp, bottom = 4.dp)
                    ) {
                        Text(
                            text = designerStaffId,
                            fontSize = 11.sp,
                            fontWeight = FontWeight.Bold,
                            color = colors.primary,
                            modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp)
                        )
                    }

                    val displayNum = remember(designerStaffId) {
                        val digits = designerStaffId.filter { it.isDigit() }
                        if (digits.isNotEmpty()) String.format("%02d", digits.toIntOrNull() ?: 4) else "04"
                    }

                    Text(
                        text = displayNum,
                        fontSize = 64.sp,
                        fontWeight = FontWeight.Light,
                        color = colors.textPrimary,
                        letterSpacing = (-2).sp,
                        lineHeight = 64.sp
                    )

                    Spacer(modifier = Modifier.height(8.dp))

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
                                append(designerDept)
                            }
                        },
                        fontSize = 11.sp,
                        color = if (colors.isDark) Color(0xFF94A3B8) else Color(0xFF64748B)
                    )

                    Spacer(modifier = Modifier.height(2.dp))

                    Text(
                        text = buildAnnotatedString {
                            append("Holding: ")
                            withStyle(SpanStyle(fontWeight = FontWeight.Bold)) {
                                append(designerBrand)
                            }
                        },
                        fontSize = 11.sp,
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

        // 4. ABOUT & RESPONSIBILITIES Section
        item {
            Column(modifier = Modifier.fillMaxWidth()) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text(
                        text = "ABOUT & RESPONSIBILITIES",
                        fontSize = 9.sp,
                        fontWeight = FontWeight.Bold,
                        letterSpacing = 1.2.sp,
                        color = if (colors.isDark) Color(0xFF94A3B8) else Color(0xFF64748B)
                    )
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        modifier = Modifier.clickable {
                            tempBio = userBio
                            isEditBioDialogOpen = true
                        }
                    ) {
                        Icon(
                            Icons.Default.Edit,
                            contentDescription = "Edit Bio",
                            tint = colors.primary,
                            modifier = Modifier.size(11.dp)
                        )
                        Spacer(modifier = Modifier.width(3.dp))
                        Text(
                            text = "EDIT",
                            fontSize = 9.sp,
                            fontWeight = FontWeight.Bold,
                            letterSpacing = 0.8.sp,
                            color = colors.primary
                        )
                    }
                }
                Spacer(modifier = Modifier.height(6.dp))
                Text(
                    text = userBio,
                    fontSize = 13.sp,
                    lineHeight = 19.sp,
                    color = colors.textPrimary,
                    modifier = Modifier.clickable {
                        tempBio = userBio
                        isEditBioDialogOpen = true
                    }
                )
            }
        }

        // 5. CREATIVE SPECIALTIES & DISCIPLINES
        item {
            Column(modifier = Modifier.fillMaxWidth()) {
                Text(
                    text = "CREATIVE SPECIALTIES & DISCIPLINES",
                    fontSize = 9.sp,
                    fontWeight = FontWeight.Bold,
                    letterSpacing = 1.2.sp,
                    color = if (colors.isDark) Color(0xFF94A3B8) else Color(0xFF64748B)
                )
                Spacer(modifier = Modifier.height(8.dp))
                val row1 = listOf("Art Direction", "Packaging & Dielines", "Brand Identity")
                val row2 = listOf("Campaign Creative", "Print & POSM", "Asset Systems")

                Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        row1.forEach { tag ->
                            Surface(
                                shape = RoundedCornerShape(6.dp),
                                color = if (colors.isDark) Color(0xFF1E293B) else Color(0xFFF1F5F9),
                                border = androidx.compose.foundation.BorderStroke(
                                    0.8.dp,
                                    if (colors.isDark) colors.border.copy(alpha = 0.7f) else Color(0xFFCBD5E1)
                                )
                            ) {
                                Text(
                                    text = tag,
                                    fontSize = 11.sp,
                                    fontWeight = FontWeight.Medium,
                                    color = colors.textPrimary,
                                    modifier = Modifier.padding(horizontal = 9.dp, vertical = 5.dp)
                                )
                            }
                        }
                    }

                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        row2.forEach { tag ->
                            Surface(
                                shape = RoundedCornerShape(6.dp),
                                color = if (colors.isDark) Color(0xFF1E293B) else Color(0xFFF1F5F9),
                                border = androidx.compose.foundation.BorderStroke(
                                    0.8.dp,
                                    if (colors.isDark) colors.border.copy(alpha = 0.7f) else Color(0xFFCBD5E1)
                                )
                            ) {
                                Text(
                                    text = tag,
                                    fontSize = 11.sp,
                                    fontWeight = FontWeight.Medium,
                                    color = colors.textPrimary,
                                    modifier = Modifier.padding(horizontal = 9.dp, vertical = 5.dp)
                                )
                            }
                        }
                    }
                }
            }
        }

        // 6. CONNECT CARD (Studio NFC / Digital Card with Dot Matrix)
        item {
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .clip(RoundedCornerShape(8.dp))
                    .background(
                        if (colors.isMonochrome) Color(0xFFF4F4F5) else if (colors.isDark) Color(0xFF1E293B) else Color(0xFFDCD8D0)
                    )
                    .border(
                        1.dp,
                        if (colors.isMonochrome) Color(0xFFD4D4D8) else if (colors.isDark) colors.border.copy(alpha = 0.5f) else Color(0xFFCBD5E1),
                        RoundedCornerShape(8.dp)
                    )
                    .clickable {
                        val clipboard = context.getSystemService(android.content.Context.CLIPBOARD_SERVICE) as android.content.ClipboardManager
                        val vCard = """
                            BEGIN:VCARD
                            VERSION:3.0
                            FN:$designerName
                            ORG:SuamiSihat Creative Operations
                            TITLE:$designerRole
                            EMAIL:$designerEmail
                            NOTE:Staff ID: $designerStaffId | Dept: $designerDept
                            END:VCARD
                        """.trimIndent()
                        val clip = android.content.ClipData.newPlainText("vCard", vCard)
                        clipboard.setPrimaryClip(clip)
                        Toast.makeText(context, "Studio Card copied: $designerName ($designerStaffId)", Toast.LENGTH_SHORT).show()
                        isConnectCardDialogOpen = true
                    }
                    .padding(16.dp)
            ) {
                Column(modifier = Modifier.fillMaxWidth()) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text(
                            text = "STUDIO CONNECT CARD",
                            fontSize = 9.sp,
                            fontWeight = FontWeight.Bold,
                            letterSpacing = 1.2.sp,
                            color = if (colors.isMonochrome) Color(0xFF52525B) else if (colors.isDark) Color(0xFF94A3B8) else Color(0xFF475569)
                        )
                        Text(
                            text = designerStaffId,
                            fontSize = 10.sp,
                            fontWeight = FontWeight.Bold,
                            letterSpacing = 0.8.sp,
                            color = if (colors.isMonochrome) Color(0xFF52525B) else if (colors.isDark) Color(0xFF94A3B8) else Color(0xFF475569)
                        )
                    }

                    Spacer(modifier = Modifier.height(12.dp))

                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        // Left Text with actual user details
                        Column(modifier = Modifier.weight(1f)) {
                            Text(
                                text = designerName,
                                fontSize = 18.sp,
                                fontWeight = FontWeight.Bold,
                                color = if (colors.isMonochrome) Color(0xFF18181B) else if (colors.isDark) Color.White else Color(0xFF0F172A)
                            )
                            Spacer(modifier = Modifier.height(2.dp))
                            Text(
                                text = "$designerRole • $designerDept",
                                fontSize = 11.sp,
                                fontWeight = FontWeight.Medium,
                                color = if (colors.isMonochrome) Color(0xFF52525B) else if (colors.isDark) Color(0xFF94A3B8) else Color(0xFF475569)
                            )
                            Spacer(modifier = Modifier.height(4.dp))
                            Text(
                                text = designerEmail,
                                fontSize = 11.sp,
                                fontWeight = FontWeight.Normal,
                                color = if (colors.isMonochrome) Color(0xFF71717A) else if (colors.isDark) Color(0xFFCBD5E1) else Color(0xFF334155)
                            )
                            Spacer(modifier = Modifier.height(2.dp))
                            Text(
                                text = "SuamiSihat Holding • Cyberjaya HQ",
                                fontSize = 10.sp,
                                fontWeight = FontWeight.Normal,
                                color = if (colors.isMonochrome) Color(0xFF71717A) else if (colors.isDark) Color(0xFF94A3B8) else Color(0xFF64748B)
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
                                .width(85.dp)
                                .height(50.dp)
                        )
                    }

                    Spacer(modifier = Modifier.height(14.dp))

                    Row(
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text(
                            text = "TAP TO SHARE / COPY VCARD",
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

        // 7. Bottom Two-Column Metrics (DELIVERABLES • ACTIVE SPRINT)
        item {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(vertical = 4.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                // Left Metric: DELIVERABLES
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
                            Toast.makeText(context, "$assignedDeliverables deliverables assigned to $designerName", Toast.LENGTH_SHORT).show()
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

                // Right Metric: ACTIVE SPRINT
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
                            Toast.makeText(context, "$activeProjectsCount active sprint projects for $designerName", Toast.LENGTH_SHORT).show()
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
                                            } catch (_: Exception) {}
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

                            // Application Version & Environment
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Column {
                                    Text("Application Version", fontSize = 12.sp, fontWeight = FontWeight.SemiBold, color = colors.textPrimary)
                                    Text("Production Release • Build 463", fontSize = 10.sp, color = colors.textSecondary)
                                }
                                Surface(
                                    shape = RoundedCornerShape(6.dp),
                                    color = colors.primary.copy(alpha = 0.12f),
                                    border = androidx.compose.foundation.BorderStroke(1.dp, colors.primary.copy(alpha = 0.3f))
                                ) {
                                    Text(
                                        text = "v4.6.1",
                                        fontSize = 11.sp,
                                        fontWeight = FontWeight.Bold,
                                        color = colors.primary,
                                        modifier = Modifier.padding(horizontal = 8.dp, vertical = 3.dp)
                                    )
                                }
                            }

                            HorizontalDivider(color = colors.border)

                            // Sign Out / Switch Account Action Button
                            Button(
                                onClick = {
                                    try { haptic.performHapticFeedback(androidx.compose.ui.hapticfeedback.HapticFeedbackType.LongPress) } catch (_: Exception) {}
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
                horizontalAlignment = Alignment.CenterHorizontally,
                verticalArrangement = Arrangement.spacedBy(4.dp)
            ) {
                Text(
                    "SS-CAM Studio Companion • v4.6.1 (Build 463)",
                    fontSize = 11.sp,
                    fontWeight = FontWeight.Bold,
                    color = if (colors.isDark) Color(0xFF64748B) else Color(0xFF94A3B8)
                )
                Text(
                    "SuamiSihat Creative Operations • $designerStaffId",
                    fontSize = 10.sp,
                    fontWeight = FontWeight.Medium,
                    color = if (colors.isDark) Color(0xFF475569) else Color(0xFFCBD5E1)
                )
            }
        }
    }

    // Edit Bio Dialog
    if (isEditBioDialogOpen) {
        AlertDialog(
            onDismissRequest = { isEditBioDialogOpen = false },
            title = {
                Text(
                    "Edit Profile & Bio",
                    fontSize = 16.sp,
                    fontWeight = FontWeight.Bold,
                    color = colors.textPrimary
                )
            },
            text = {
                Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                    Text(
                        "Update your professional bio and responsibilities displayed on your studio profile:",
                        fontSize = 12.sp,
                        color = colors.textSecondary
                    )
                    OutlinedTextField(
                        value = tempBio,
                        onValueChange = { tempBio = it },
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(130.dp),
                        placeholder = { Text("Enter your bio...") },
                        textStyle = androidx.compose.ui.text.TextStyle(fontSize = 12.sp, color = colors.textPrimary)
                    )
                }
            },
            confirmButton = {
                Button(
                    onClick = {
                        userBio = tempBio.trim()
                        AuthPreferences.saveBio(context, userBio)
                        isEditBioDialogOpen = false
                        Toast.makeText(context, "Profile bio updated", Toast.LENGTH_SHORT).show()
                    },
                    colors = ButtonDefaults.buttonColors(containerColor = colors.primary)
                ) {
                    Text("Save", fontSize = 12.sp, fontWeight = FontWeight.Bold)
                }
            },
            dismissButton = {
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    TextButton(
                        onClick = {
                            val defaultBio = "Lead Art Director & Administrator for SuamiSihat Creative Operations. Directing multi-brand creative assets, packaging dielines, brand identities, and campaign deliverables across SSH, SSC, SSW, SSE, and SST."
                            tempBio = defaultBio
                            userBio = defaultBio
                            AuthPreferences.saveBio(context, defaultBio)
                            isEditBioDialogOpen = false
                            Toast.makeText(context, "Bio restored to default", Toast.LENGTH_SHORT).show()
                        }
                    ) {
                        Text("Reset Default", fontSize = 11.sp, color = colors.textSecondary)
                    }
                    TextButton(onClick = { isEditBioDialogOpen = false }) {
                        Text("Cancel", fontSize = 12.sp, color = colors.textPrimary)
                    }
                }
            },
            containerColor = colors.surface
        )
    }

    // Connect Card Studio Modal Dialog
    if (isConnectCardDialogOpen) {
        AlertDialog(
            onDismissRequest = { isConnectCardDialogOpen = false },
            title = {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text(
                        "Studio Digital Pass",
                        fontSize = 16.sp,
                        fontWeight = FontWeight.Bold,
                        color = colors.textPrimary
                    )
                    Surface(
                        shape = RoundedCornerShape(4.dp),
                        color = colors.primary.copy(alpha = 0.12f),
                        border = androidx.compose.foundation.BorderStroke(1.dp, colors.primary.copy(alpha = 0.3f))
                    ) {
                        Text(
                            text = designerStaffId,
                            fontSize = 10.sp,
                            fontWeight = FontWeight.Bold,
                            color = colors.primary,
                            modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp)
                        )
                    }
                }
            },
            text = {
                Column(
                    modifier = Modifier.fillMaxWidth(),
                    verticalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    Text(
                        designerName,
                        fontSize = 20.sp,
                        fontWeight = FontWeight.Bold,
                        color = colors.textPrimary
                    )
                    Text(
                        "$designerRole • $designerDept",
                        fontSize = 12.sp,
                        fontWeight = FontWeight.Medium,
                        color = colors.textSecondary
                    )
                    HorizontalDivider(color = colors.border)
                    Text(
                        "Email: $designerEmail",
                        fontSize = 12.sp,
                        color = colors.textPrimary
                    )
                    Text(
                        "Entity: SuamiSihat Holding ($designerBrand)",
                        fontSize = 12.sp,
                        color = colors.textPrimary
                    )
                    Text(
                        "Station: Cyberjaya Studio HQ, Selangor",
                        fontSize = 12.sp,
                        color = colors.textSecondary
                    )
                }
            },
            confirmButton = {
                Button(
                    onClick = {
                        val clipboard = context.getSystemService(android.content.Context.CLIPBOARD_SERVICE) as android.content.ClipboardManager
                        val clip = android.content.ClipData.newPlainText("Email", designerEmail)
                        clipboard.setPrimaryClip(clip)
                        Toast.makeText(context, "Copied email: $designerEmail", Toast.LENGTH_SHORT).show()
                        isConnectCardDialogOpen = false
                    },
                    colors = ButtonDefaults.buttonColors(containerColor = colors.primary)
                ) {
                    Text("Copy Email", fontSize = 12.sp, fontWeight = FontWeight.Bold)
                }
            },
            dismissButton = {
                TextButton(onClick = { isConnectCardDialogOpen = false }) {
                    Text("Close", fontSize = 12.sp, color = colors.textPrimary)
                }
            },
            containerColor = colors.surface
        )
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
