package com.suamisihat.sscam.ui.components

import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.suamisihat.sscam.ui.theme.*

@Composable
fun FluentCard(
    modifier: Modifier = Modifier,
    containerColor: Color = LocalSscamColors.current.card,
    borderColor: Color = LocalSscamColors.current.border,
    cornerRadius: Dp = 12.dp,
    content: @Composable ColumnScope.() -> Unit
) {
    Card(
        colors = CardDefaults.cardColors(containerColor = containerColor),
        shape = RoundedCornerShape(cornerRadius),
        border = BorderStroke(1.dp, borderColor),
        modifier = modifier
    ) {
        Column(content = content)
    }
}

@Composable
fun FluentSegmentedPillControl(
    options: List<String>,
    selectedIndex: Int,
    onOptionSelected: (Int) -> Unit,
    modifier: Modifier = Modifier
) {
    FolderTabNavigation(
        options = options,
        selectedIndex = selectedIndex,
        onOptionSelected = onOptionSelected,
        modifier = modifier
    )
}

/**
 * Folder Tab / Trapezoid In-Page Top Navigation Tab Bar
 * Inspired by classic folder tab index aesthetic:
 * - Active Tab: Solid Jet Black (#000000 / #0F172A) with bold white uppercase text
 * - Inactive Tabs: Soft white/light-gray background with subtle border and muted bold uppercase text
 * - Trapezoid angled left/right edges with rounded top corners
 * - Continuous horizontal bottom baseline
 */
@Composable
fun FolderTabNavigation(
    options: List<String>,
    selectedIndex: Int,
    onOptionSelected: (Int) -> Unit,
    modifier: Modifier = Modifier
) {
    val colors = LocalSscamColors.current
    val haptic = androidx.compose.ui.platform.LocalHapticFeedback.current

    val activeFill = colors.folderTabActiveBg
    val activeTextColor = colors.folderTabActiveContent
    val inactiveFill = colors.folderTabInactiveBg
    val inactiveTextColor = colors.folderTabInactiveContent
    val borderColor = colors.border
    val baselineColor = colors.folderTabActiveBg

    Column(modifier = modifier.fillMaxWidth()) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .height(38.dp),
            horizontalArrangement = Arrangement.spacedBy((-6).dp)
        ) {
            options.forEachIndexed { index, title ->
                val isSelected = selectedIndex == index
                Box(
                    modifier = Modifier
                        .weight(1f)
                        .fillMaxHeight()
                        .clickable {
                            try {
                                haptic.performHapticFeedback(androidx.compose.ui.hapticfeedback.HapticFeedbackType.TextHandleMove)
                            } catch (e: Exception) {
                                // Haptic fallback
                            }
                            onOptionSelected(index)
                        }
                ) {
                    Canvas(modifier = Modifier.fillMaxSize()) {
                        val w = size.width
                        val h = size.height
                        val slant = 12.dp.toPx()
                        val r = 6.dp.toPx()

                        val path = androidx.compose.ui.graphics.Path().apply {
                            moveTo(0f, h)
                            lineTo(slant, r)
                            quadraticTo(slant + 1f, 0f, slant + r, 0f)
                            lineTo(w - slant - r, 0f)
                            quadraticTo(w - slant - 1f, 0f, w - slant, r)
                            lineTo(w, h)
                            close()
                        }

                        // Draw background
                        drawPath(
                            path = path,
                            color = if (isSelected) activeFill else inactiveFill
                        )

                        // Draw border for inactive tabs
                        if (!isSelected) {
                            val borderPath = androidx.compose.ui.graphics.Path().apply {
                                moveTo(0f, h)
                                lineTo(slant, r)
                                quadraticTo(slant + 1f, 0f, slant + r, 0f)
                                lineTo(w - slant - r, 0f)
                                quadraticTo(w - slant - 1f, 0f, w - slant, r)
                                lineTo(w, h)
                            }
                            drawPath(
                                path = borderPath,
                                color = borderColor,
                                style = Stroke(width = 1.dp.toPx())
                            )
                        }
                    }

                    // Text Content
                    Box(
                        modifier = Modifier
                            .fillMaxSize()
                            .padding(bottom = 2.dp),
                        contentAlignment = Alignment.Center
                    ) {
                        Text(
                            text = title.uppercase(),
                            fontSize = 11.sp,
                            fontWeight = if (isSelected) FontWeight.ExtraBold else FontWeight.Bold,
                            color = if (isSelected) activeTextColor else inactiveTextColor,
                            letterSpacing = 0.5.sp,
                            maxLines = 1
                        )
                    }
                }
            }
        }

        // Crisp continuous baseline
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .height(2.dp)
                .background(baselineColor)
        )
    }
}

/**
 * High-utility Circular Progress Ring inspired by the reference layout.
 */
@Composable
fun CircularProgressRing(
    progress: Float,
    percentageText: String,
    modifier: Modifier = Modifier,
    ringColor: Color = SshSuccessGreen,
    trackColor: Color = Color(0xFF1E293B),
    strokeWidth: Dp = 8.dp
) {
    val colors = LocalSscamColors.current
    val animatedProgress by animateFloatAsState(targetValue = progress, label = "progressAnim")
    val actualRingColor = if (colors.isMonochrome) Color(0xFF18181B) else ringColor
    val actualTrackColor = if (colors.isMonochrome) Color(0xFFE4E4E7) else trackColor

    Box(
        modifier = modifier.size(88.dp),
        contentAlignment = Alignment.Center
    ) {
        Canvas(modifier = Modifier.fillMaxSize()) {
            val strokePx = strokeWidth.toPx()
            val arcSize = size.minDimension - strokePx
            val topLeft = Offset(strokePx / 2, strokePx / 2)

            // Background Track
            drawArc(
                color = actualTrackColor,
                startAngle = -90f,
                sweepAngle = 360f,
                useCenter = false,
                topLeft = topLeft,
                size = Size(arcSize, arcSize),
                style = Stroke(width = strokePx, cap = StrokeCap.Round)
            )

            // Progress Arc
            drawArc(
                brush = Brush.sweepGradient(
                    listOf(actualRingColor.copy(alpha = 0.7f), actualRingColor, actualRingColor)
                ),
                startAngle = -90f,
                sweepAngle = 360f * animatedProgress,
                useCenter = false,
                topLeft = topLeft,
                size = Size(arcSize, arcSize),
                style = Stroke(width = strokePx, cap = StrokeCap.Round)
            )
        }

        Column(horizontalAlignment = Alignment.CenterHorizontally) {
            Text(
                text = percentageText,
                fontSize = 18.sp,
                fontWeight = FontWeight.Bold,
                color = if (colors.isMonochrome) colors.textPrimary else Color.White
            )
        }
    }
}

/**
 * Avatar stack representing assigned designers.
 */
@Composable
fun AvatarStack(
    initials: List<String> = listOf("H", "A", "F"),
    colorsList: List<Color> = listOf(SshAzureLight, Color(0xFF6366F1), Color(0xFF0F766E)),
    extraCount: Int = 0
) {
    val colors = LocalSscamColors.current
    val actualColors = if (colors.isMonochrome) {
        listOf(Color(0xFF18181B), Color(0xFF52525B), Color(0xFF71717A))
    } else {
        colorsList
    }

    Row(verticalAlignment = Alignment.CenterVertically) {
        Box(contentAlignment = Alignment.CenterStart) {
            initials.take(3).forEachIndexed { index, init ->
                Box(
                    modifier = Modifier
                        .padding(start = (index * 16).dp)
                        .size(24.dp)
                        .clip(CircleShape)
                        .background(actualColors.getOrElse(index) { Color(0xFF18181B) })
                        .border(1.5.dp, if (colors.isMonochrome) Color(0xFFD4D4D8) else Color(0xFF0F172A), CircleShape),
                    contentAlignment = Alignment.Center
                ) {
                    Text(init, fontSize = 9.sp, fontWeight = FontWeight.Bold, color = Color.White)
                }
            }
        }
        if (extraCount > 0) {
            Spacer(modifier = Modifier.width(4.dp))
            Box(
                modifier = Modifier
                    .size(20.dp)
                    .clip(CircleShape)
                    .background(if (colors.isMonochrome) Color(0xFF71717A) else Color(0xFF334155)),
                contentAlignment = Alignment.Center
            ) {
                Text("+$extraCount", fontSize = 8.sp, fontWeight = FontWeight.Bold, color = Color.White)
            }
        }
    }
}

/**
 * Date Capsule strip inspired by Center Screen in reference layout.
 */
@Composable
fun CapsuleDayPickerStrip(
    selectedDayIndex: Int = 2,
    onDaySelected: (Int) -> Unit = {}
) {
    val days = listOf(
        Pair("MON", "25"),
        Pair("TUE", "26"),
        Pair("WED", "27"),
        Pair("THU", "28"),
        Pair("FRI", "29"),
        Pair("SAT", "30"),
        Pair("SUN", "31")
    )
    val colors = LocalSscamColors.current

    LazyRow(
        horizontalArrangement = Arrangement.spacedBy(8.dp),
        modifier = Modifier.fillMaxWidth()
    ) {
        items(days.indices.toList()) { index ->
            val isSelected = selectedDayIndex == index
            val (dayOfWeek, dayNum) = days[index]
            val activeBg = if (colors.isDark) Color(0xFF022057) else colors.primary
            val activeText = Color.White
            val inactiveBg = if (colors.isDark) colors.card else Color(0xFFF1F5F9)

            Column(
                modifier = Modifier
                    .width(46.dp)
                    .clip(RoundedCornerShape(16.dp))
                    .background(if (isSelected) activeBg else inactiveBg)
                    .border(
                        1.dp,
                        if (isSelected) colors.primary else colors.border,
                        RoundedCornerShape(16.dp)
                    )
                    .clickable { onDaySelected(index) }
                    .padding(vertical = 10.dp),
                horizontalAlignment = Alignment.CenterHorizontally
            ) {
                Text(
                    dayOfWeek,
                    fontSize = 10.sp,
                    fontWeight = FontWeight.Bold,
                    color = if (isSelected) (if (colors.isDark) colors.primary else Color(0xFF93C5FD)) else colors.textMuted
                )
                Spacer(modifier = Modifier.height(4.dp))
                Text(
                    dayNum,
                    fontSize = 14.sp,
                    fontWeight = FontWeight.Bold,
                    color = if (isSelected) activeText else colors.textPrimary
                )
                if (isSelected) {
                    Spacer(modifier = Modifier.height(3.dp))
                    Box(
                        modifier = Modifier
                            .size(4.dp)
                            .clip(CircleShape)
                            .background(colors.accent)
                    )
                }
            }
        }
    }
}

/**
 * Interactive Deliverable Card matching the Left Screen in reference layout.
 */
@Composable
fun ReferenceStyleDeliverableCard(
    title: String,
    brand: String,
    designer: String,
    deadline: String,
    status: String,
    priority: String,
    onSignOff: () -> Unit = {},
    onCardClick: () -> Unit = {}
) {
    val colors = LocalSscamColors.current
    val (priorityDotColor, priorityLabel) = if (colors.isMonochrome) {
        when (priority.lowercase()) {
            "urgent" -> Color(0xFF18181B) to "Urgent Priority"
            "high" -> Color(0xFF52525B) to "High Priority"
            else -> Color(0xFF71717A) to "Standard Review"
        }
    } else {
        when (priority.lowercase()) {
            "urgent" -> Color(0xFFEF4444) to "Urgent Priority"
            "high" -> Color(0xFFF97316) to "High Priority"
            else -> SshWarmGoldBright to "Standard Review"
        }
    }

    FluentCard(
        cornerRadius = 16.dp,
        modifier = Modifier
            .fillMaxWidth()
            .clickable { onCardClick() }
    ) {
        Column(modifier = Modifier.padding(16.dp)) {
            // Top Row: Priority Pill + Link Icon
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Row(
                    modifier = Modifier
                        .clip(RoundedCornerShape(20.dp))
                        .background(if (colors.isMonochrome) Color(0xFFF4F4F5) else priorityDotColor.copy(alpha = 0.15f))
                        .border(0.5.dp, if (colors.isMonochrome) Color(0xFFD4D4D8) else priorityDotColor.copy(alpha = 0.3f), RoundedCornerShape(20.dp))
                        .padding(horizontal = 8.dp, vertical = 3.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Box(
                        modifier = Modifier
                            .size(6.dp)
                            .clip(CircleShape)
                            .background(priorityDotColor)
                    )
                    Spacer(modifier = Modifier.width(6.dp))
                    Text(
                        priorityLabel,
                        fontSize = 10.sp,
                        fontWeight = FontWeight.Bold,
                        color = if (colors.isMonochrome) Color(0xFF18181B) else priorityDotColor
                    )
                }

                Row(verticalAlignment = Alignment.CenterVertically) {
                    SubBrandBadge(brand)
                    Spacer(modifier = Modifier.width(8.dp))
                    Icon(
                        Icons.Default.ArrowOutward,
                        contentDescription = "Open",
                        tint = colors.textMuted,
                        modifier = Modifier.size(16.dp)
                    )
                }
            }

            Spacer(modifier = Modifier.height(10.dp))

            // Middle: Task Title
            Text(
                title,
                fontSize = 15.sp,
                fontWeight = FontWeight.Bold,
                color = colors.textPrimary,
                lineHeight = 20.sp
            )

            Spacer(modifier = Modifier.height(12.dp))

            // Bottom Row: Time / Deadline + Avatar Stack + Sign-Off Action
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Text("⏰ Due: $deadline", fontSize = 11.sp, color = colors.textSecondary)
                }

                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    AvatarStack(listOf(designer.take(1).uppercase()))
                    Button(
                        onClick = onSignOff,
                        colors = ButtonDefaults.buttonColors(containerColor = if (colors.isMonochrome) Color(0xFF18181B) else SshSuccessGreen),
                        shape = RoundedCornerShape(8.dp),
                        contentPadding = PaddingValues(horizontal = 10.dp, vertical = 2.dp),
                        modifier = Modifier.height(28.dp)
                    ) {
                        Text("✓ Sign-Off", fontSize = 10.sp, fontWeight = FontWeight.Bold, color = Color.White)
                    }
                }
            }
        }
    }
}

@Composable
fun SubBrandBadge(brand: String, modifier: Modifier = Modifier) {
    val colors = LocalSscamColors.current
    val upper = brand.uppercase()
    val (bg, fg, label) = if (colors.isMonochrome) {
        Triple(Color(0xFF18181B), Color.White, if (brand.isNotBlank()) upper else "SS")
    } else {
        when {
            upper.contains("SSH") -> Triple(BrandSshPrimary, BrandSshAccent, "SSH")
            upper.contains("SSC") -> Triple(BrandSscPrimary.copy(alpha = 0.2f), BrandSscAccent, "SSC")
            upper.contains("SSW") -> Triple(BrandSswPrimary.copy(alpha = 0.2f), BrandSswAccent, "SSW")
            upper.contains("SSE") -> Triple(BrandSsePrimary.copy(alpha = 0.2f), BrandSseAccent, "SSE")
            upper.contains("SST") -> Triple(BrandSstPrimary.copy(alpha = 0.2f), BrandSstAccent, "SST")
            else -> Triple(SshRoyalBlue.copy(alpha = 0.2f), SshAzureLight, if (brand.isNotBlank()) upper else "SS")
        }
    }

    Box(
        modifier = modifier
            .clip(RoundedCornerShape(6.dp))
            .background(bg)
            .border(0.5.dp, if (colors.isMonochrome) Color(0xFFD4D4D8) else fg.copy(alpha = 0.4f), RoundedCornerShape(6.dp))
            .padding(horizontal = 6.dp, vertical = 2.dp)
    ) {
        Text(
            label,
            fontSize = 10.sp,
            fontWeight = FontWeight.Bold,
            color = fg
        )
    }
}

@Composable
fun FluentSectionHeader(title: String, trailingText: String? = null, modifier: Modifier = Modifier) {
    val colors = LocalSscamColors.current
    Row(
        modifier = modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically
    ) {
        Text(title.uppercase(), fontSize = 11.sp, fontWeight = FontWeight.Bold, color = colors.textMuted, letterSpacing = 0.5.sp)
        if (trailingText != null) {
            Text(trailingText, fontSize = 11.sp, color = colors.primary, fontWeight = FontWeight.SemiBold)
        }
    }
}

@Composable
fun StatCard(label: String, count: String, color: Color, modifier: Modifier = Modifier) {
    val colors = LocalSscamColors.current
    FluentCard(
        cornerRadius = 10.dp,
        modifier = modifier
    ) {
        Column(modifier = Modifier.padding(12.dp)) {
            Text(label.uppercase(), fontSize = 10.sp, fontWeight = FontWeight.Bold, color = colors.textMuted, letterSpacing = 0.4.sp)
            Spacer(modifier = Modifier.height(4.dp))
            Text(count, fontSize = 22.sp, fontWeight = FontWeight.Bold, color = if (colors.isMonochrome) colors.textPrimary else color)
        }
    }
}

@Composable
fun HoldingBrandTile(name: String, count: String, brandColor: Color, subBrandCode: String) {
    val colors = LocalSscamColors.current
    FluentCard(
        cornerRadius = 10.dp,
        modifier = Modifier.fillMaxWidth()
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(12.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Box(
                modifier = Modifier
                    .size(10.dp)
                    .clip(CircleShape)
                    .background(if (colors.isMonochrome) colors.textPrimary else brandColor)
            )
            Spacer(modifier = Modifier.width(10.dp))
            Column(modifier = Modifier.weight(1f)) {
                Text(name, fontWeight = FontWeight.SemiBold, color = colors.textPrimary, fontSize = 13.sp)
                Text(count, fontSize = 11.sp, color = colors.textSecondary)
            }
            SubBrandBadge(subBrandCode)
        }
    }
}

@Composable
fun StatusChip(status: String) {
    val colors = LocalSscamColors.current
    val (bg, fg) = if (colors.isMonochrome) {
        when (status.lowercase()) {
            "done" -> Color(0xFF18181B) to Color.White
            "in_review", "review", "revision" -> Color(0xFFE4E4E7) to Color(0xFF18181B)
            "in_progress" -> Color(0xFFF4F4F5) to Color(0xFF27272A)
            else -> colors.surface to colors.textSecondary
        }
    } else {
        when (status.lowercase()) {
            "done" -> SshSuccessGreen.copy(alpha = 0.18f) to SshSuccessGreen
            "in_review", "review", "revision" -> SshWarmGold.copy(alpha = 0.18f) to (if (colors.isDark) SshWarmGoldBright else Color(0xFFB8860B))
            "in_progress" -> SshAzure.copy(alpha = 0.18f) to (if (colors.isDark) SshAzureLight else Color(0xFF0078D4))
            else -> colors.border to colors.textSecondary
        }
    }
    Box(
        modifier = Modifier
            .clip(RoundedCornerShape(4.dp))
            .background(bg)
            .border(0.5.dp, if (colors.isMonochrome) Color(0xFFD4D4D8) else fg.copy(alpha = 0.4f), RoundedCornerShape(4.dp))
            .padding(horizontal = 6.dp, vertical = 2.dp)
    ) {
        Text(status.replace('_', ' ').uppercase(), fontSize = 10.sp, fontWeight = FontWeight.Bold, color = fg)
    }
}

@Composable
fun PriorityChip(priority: String) {
    val colors = LocalSscamColors.current
    val (bg, fg) = if (colors.isMonochrome) {
        when (priority.lowercase()) {
            "urgent" -> Color(0xFF18181B) to Color.White
            "high" -> Color(0xFF52525B) to Color.White
            else -> Color(0xFFE4E4E7) to Color(0xFF18181B)
        }
    } else {
        val color = when (priority.lowercase()) {
            "urgent" -> StatusUrgent
            "high" -> Color(0xFFF97316)
            else -> SshAzureLight
        }
        color.copy(alpha = 0.18f) to color
    }
    Box(
        modifier = Modifier
            .clip(RoundedCornerShape(4.dp))
            .background(bg)
            .border(0.5.dp, if (colors.isMonochrome) Color(0xFFD4D4D8) else fg.copy(alpha = 0.4f), RoundedCornerShape(4.dp))
            .padding(horizontal = 6.dp, vertical = 2.dp)
    ) {
        Text(priority.uppercase(), fontSize = 10.sp, fontWeight = FontWeight.Bold, color = fg)
    }
}

@Composable
fun CompanionActionTile(
    title: String,
    subtitle: String,
    cardBg: Color,
    accentColor: Color,
    modifier: Modifier = Modifier,
    onClick: () -> Unit = {}
) {
    val colors = LocalSscamColors.current
    FluentCard(
        cornerRadius = 10.dp,
        containerColor = if (colors.isDark) cardBg.copy(alpha = 0.6f) else colors.card,
        borderColor = if (colors.isDark) accentColor.copy(alpha = 0.4f) else colors.border,
        modifier = modifier.clickable { onClick() }
    ) {
        Column(modifier = Modifier.padding(10.dp)) {
            Text(
                title,
                fontSize = 12.sp,
                fontWeight = FontWeight.Bold,
                color = if (colors.isDark) Color.White else colors.textPrimary,
                maxLines = 1
            )
            Spacer(modifier = Modifier.height(2.dp))
            Text(
                subtitle,
                fontSize = 10.sp,
                color = if (colors.isDark) accentColor else colors.textSecondary,
                fontWeight = FontWeight.Medium,
                maxLines = 1
            )
        }
    }
}

/**
 * User Profile Avatar with dynamic NAS / Web URL loading via Coil (supports HTTP & Base64)
 * and graceful fallback to styled monogram initials in user's brand color.
 */
@Composable
fun UserProfileAvatar(
    imageUrl: String?,
    initials: String,
    avatarColorHex: String = "#0078D4",
    size: Dp = 38.dp,
    onClick: (() -> Unit)? = null,
    modifier: Modifier = Modifier
) {
    val colors = LocalSscamColors.current
    val parsedColor = remember(avatarColorHex, colors.isMonochrome) {
        if (colors.isMonochrome) {
            Color(0xFF18181B)
        } else {
            try {
                Color(android.graphics.Color.parseColor(avatarColorHex))
            } catch (e: Exception) {
                Color(0xFF0078D4)
            }
        }
    }

    val displayLetter = remember(initials) {
        initials.ifBlank { "H" }.take(1).uppercase()
    }

    val imageModel: Any? = remember(imageUrl) {
        if (imageUrl.isNullOrBlank()) null
        else if (imageUrl.startsWith("data:image/")) {
            try {
                val base64Data = imageUrl.substringAfter(",")
                val decodedBytes = android.util.Base64.decode(base64Data, android.util.Base64.DEFAULT)
                android.graphics.BitmapFactory.decodeByteArray(decodedBytes, 0, decodedBytes.size)
            } catch (e: Exception) {
                imageUrl
            }
        } else {
            imageUrl
        }
    }

    val grayscaleColorFilter = remember(colors.isMonochrome) {
        if (colors.isMonochrome) {
            androidx.compose.ui.graphics.ColorFilter.colorMatrix(
                androidx.compose.ui.graphics.ColorMatrix().apply { setToSaturation(0f) }
            )
        } else null
    }

    if (onClick != null) {
        Surface(
            onClick = onClick,
            shape = CircleShape,
            color = parsedColor,
            border = BorderStroke(1.5.dp, if (colors.isMonochrome) Color(0xFFD4D4D8) else if (colors.isDark) Color(0xFFFBBF24) else Color.White),
            shadowElevation = 2.dp,
            modifier = modifier.size(size)
        ) {
            Box(contentAlignment = Alignment.Center, modifier = Modifier.fillMaxSize()) {
                if (imageModel != null) {
                    coil.compose.SubcomposeAsyncImage(
                        model = imageModel,
                        contentDescription = "Profile Picture",
                        contentScale = androidx.compose.ui.layout.ContentScale.Crop,
                        colorFilter = grayscaleColorFilter,
                        modifier = Modifier.fillMaxSize(),
                        loading = {
                            Box(
                                contentAlignment = Alignment.Center,
                                modifier = Modifier.fillMaxSize().background(parsedColor)
                            ) {
                                Text(
                                    text = displayLetter,
                                    fontSize = (size.value * 0.44f).sp,
                                    fontWeight = FontWeight.ExtraBold,
                                    color = Color.White
                                )
                            }
                        },
                        error = {
                            Box(
                                contentAlignment = Alignment.Center,
                                modifier = Modifier.fillMaxSize().background(parsedColor)
                            ) {
                                Text(
                                    text = displayLetter,
                                    fontSize = (size.value * 0.44f).sp,
                                    fontWeight = FontWeight.ExtraBold,
                                    color = Color.White
                                )
                            }
                        }
                    )
                } else {
                    Text(
                        text = displayLetter,
                        fontSize = (size.value * 0.44f).sp,
                        fontWeight = FontWeight.ExtraBold,
                        color = Color.White
                    )
                }
            }
        }
    } else {
        Surface(
            shape = CircleShape,
            color = parsedColor,
            border = BorderStroke(1.5.dp, if (colors.isMonochrome) Color(0xFFD4D4D8) else if (colors.isDark) Color(0xFFFBBF24) else Color.White),
            shadowElevation = 2.dp,
            modifier = modifier.size(size)
        ) {
            Box(contentAlignment = Alignment.Center, modifier = Modifier.fillMaxSize()) {
                if (imageModel != null) {
                    coil.compose.SubcomposeAsyncImage(
                        model = imageModel,
                        contentDescription = "Profile Picture",
                        contentScale = androidx.compose.ui.layout.ContentScale.Crop,
                        colorFilter = grayscaleColorFilter,
                        modifier = Modifier.fillMaxSize(),
                        loading = {
                            Box(
                                contentAlignment = Alignment.Center,
                                modifier = Modifier.fillMaxSize().background(parsedColor)
                            ) {
                                Text(
                                    text = displayLetter,
                                    fontSize = (size.value * 0.44f).sp,
                                    fontWeight = FontWeight.ExtraBold,
                                    color = Color.White
                                )
                            }
                        },
                        error = {
                            Box(
                                contentAlignment = Alignment.Center,
                                modifier = Modifier.fillMaxSize().background(parsedColor)
                            ) {
                                Text(
                                    text = displayLetter,
                                    fontSize = (size.value * 0.44f).sp,
                                    fontWeight = FontWeight.ExtraBold,
                                    color = Color.White
                                )
                            }
                        }
                    )
                } else {
                    Text(
                        text = displayLetter,
                        fontSize = (size.value * 0.44f).sp,
                        fontWeight = FontWeight.ExtraBold,
                        color = Color.White
                    )
                }
            }
        }
    }
}

/**
 * Canonical SuamiSihat Button Component (SSButton)
 * Standardizes 44px min touch target, 10dp corner radius, and official palette variants.
 */
enum class SSButtonVariant {
    PRIMARY,    // Azure (#21A1F7) / Brand 80
    CTA,        // Banana Yellow (#FCE53D) with dark text
    SECONDARY,  // Surface with outline border
    DANGER,     // Critical Red (#DC2626)
    GHOST       // Transparent background with primary text
}

@Composable
fun SSButton(
    text: String,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    variant: SSButtonVariant = SSButtonVariant.PRIMARY,
    icon: ImageVector? = null,
    enabled: Boolean = true,
    fullWidth: Boolean = false
) {
    val colors = LocalSscamColors.current
    val (containerColor, contentColor, borderColor) = when (variant) {
        SSButtonVariant.PRIMARY -> Triple(
            if (colors.isMonochrome) Color(0xFF18181B) else colors.primary,
            Color.White,
            Color.Transparent
        )
        SSButtonVariant.CTA -> Triple(
            if (colors.isMonochrome) Color(0xFF18181B) else SshBanana,
            if (colors.isMonochrome) Color.White else SshNeutralBlack,
            Color.Transparent
        )
        SSButtonVariant.SECONDARY -> Triple(
            colors.surface,
            colors.textPrimary,
            colors.border
        )
        SSButtonVariant.DANGER -> Triple(
            StatusCritical,
            Color.White,
            Color.Transparent
        )
        SSButtonVariant.GHOST -> Triple(
            Color.Transparent,
            colors.primary,
            Color.Transparent
        )
    }

    Button(
        onClick = onClick,
        enabled = enabled,
        colors = ButtonDefaults.buttonColors(
            containerColor = containerColor,
            contentColor = contentColor,
            disabledContainerColor = colors.surface.copy(alpha = 0.5f),
            disabledContentColor = colors.textMuted
        ),
        shape = RoundedCornerShape(10.dp),
        border = if (borderColor != Color.Transparent) BorderStroke(1.dp, borderColor) else null,
        modifier = modifier
            .then(if (fullWidth) Modifier.fillMaxWidth() else Modifier)
            .heightIn(min = 44.dp)
    ) {
        Row(
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.Center
        ) {
            if (icon != null) {
                Icon(icon, contentDescription = null, modifier = Modifier.size(18.dp))
                Spacer(modifier = Modifier.width(8.dp))
            }
            Text(text, fontSize = 13.sp, fontWeight = FontWeight.Bold)
        }
    }
}

/**
 * Canonical SuamiSihat Notice Banner / Alert Component (SSAlert)
 */
enum class SSAlertType {
    INFO, SUCCESS, WARNING, ERROR
}

@Composable
fun SSAlert(
    message: String,
    modifier: Modifier = Modifier,
    type: SSAlertType = SSAlertType.INFO,
    title: String? = null,
    onDismiss: (() -> Unit)? = null
) {
    val colors = LocalSscamColors.current
    val bg: Color
    val fg: Color
    val icon: ImageVector
    when (type) {
        SSAlertType.INFO -> {
            bg = if (colors.isDark) Color(0xFF043388).copy(alpha = 0.25f) else Color(0xFFE0EDFD)
            fg = if (colors.isDark) SshAzureLight else SshRoyalBlue
            icon = Icons.Default.Notifications
        }
        SSAlertType.SUCCESS -> {
            bg = if (colors.isDark) SshSuccessGreen.copy(alpha = 0.25f) else Color(0xFFDCFCE7)
            fg = SshSuccessGreen
            icon = Icons.Default.Check
        }
        SSAlertType.WARNING -> {
            bg = if (colors.isDark) Color(0xFFD97706).copy(alpha = 0.25f) else Color(0xFFFEF3C7)
            fg = Color(0xFFD97706)
            icon = Icons.Default.Warning
        }
        SSAlertType.ERROR -> {
            bg = if (colors.isDark) StatusCritical.copy(alpha = 0.25f) else Color(0xFFFEE2E2)
            fg = StatusCritical
            icon = Icons.Default.Close
        }
    }

    Surface(
        color = bg,
        shape = RoundedCornerShape(10.dp),
        border = BorderStroke(1.dp, fg.copy(alpha = 0.4f)),
        modifier = modifier.fillMaxWidth()
    ) {
        Row(
            modifier = Modifier.padding(12.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Icon(icon, contentDescription = null, tint = fg, modifier = Modifier.size(20.dp))
            Spacer(modifier = Modifier.width(10.dp))
            Column(modifier = Modifier.weight(1f)) {
                if (title != null) {
                    Text(title, fontSize = 12.sp, fontWeight = FontWeight.Bold, color = fg)
                }
                Text(message, fontSize = 11.sp, color = colors.textPrimary, lineHeight = 15.sp)
            }
            if (onDismiss != null) {
                IconButton(onClick = onDismiss, modifier = Modifier.size(28.dp)) {
                    Icon(Icons.Default.Close, contentDescription = "Dismiss", tint = colors.textMuted, modifier = Modifier.size(16.dp))
                }
            }
        }
    }
}

/**
 * Authentic 4-Point Metallic Hardware Screw Cap
 */
@Composable
fun TactileScrewCap(
    modifier: Modifier = Modifier.size(7.dp),
    isDark: Boolean = false
) {
    Box(
        modifier = modifier
            .clip(CircleShape)
            .background(if (isDark) TactileScrewDark else TactileScrewMetallic)
            .border(0.5.dp, Color.Black.copy(alpha = 0.25f), CircleShape),
        contentAlignment = Alignment.Center
    ) {
        Canvas(modifier = Modifier.fillMaxSize()) {
            val cx = size.width / 2
            val cy = size.height / 2
            val r = size.width * 0.35f
            // Cross slot
            drawLine(
                color = Color.Black.copy(alpha = 0.45f),
                start = Offset(cx - r, cy),
                end = Offset(cx + r, cy),
                strokeWidth = 1.dp.toPx()
            )
            drawLine(
                color = Color.Black.copy(alpha = 0.45f),
                start = Offset(cx, cy - r),
                end = Offset(cx, cy + r),
                strokeWidth = 1.dp.toPx()
            )
        }
    }
}

/**
 * Tactile Skeuomorphic Card Chassis
 * Features elevated physical bevels, specular top edge highlight, and optional corner screws.
 */
@Composable
fun TactileCard(
    modifier: Modifier = Modifier,
    containerColor: Color = LocalSscamColors.current.card,
    borderColor: Color = LocalSscamColors.current.border,
    cornerRadius: Dp = 14.dp,
    showCornerScrews: Boolean = false,
    content: @Composable ColumnScope.() -> Unit
) {
    val colors = LocalSscamColors.current
    Surface(
        color = containerColor,
        shape = RoundedCornerShape(cornerRadius),
        border = BorderStroke(1.2.dp, borderColor),
        shadowElevation = if (colors.isMonochrome) 0.dp else 3.dp,
        modifier = modifier
    ) {
        Box(modifier = Modifier.fillMaxWidth()) {
            // Top specular highlight sheen
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .height(2.dp)
                    .background(TactileBevelLight)
            )

            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(if (showCornerScrews) 14.dp else 12.dp),
                content = content
            )

            if (showCornerScrews) {
                // Top Left Screw
                Box(modifier = Modifier.padding(6.dp).align(Alignment.TopStart)) {
                    TactileScrewCap(isDark = colors.isDark)
                }
                // Top Right Screw
                Box(modifier = Modifier.padding(6.dp).align(Alignment.TopEnd)) {
                    TactileScrewCap(isDark = colors.isDark)
                }
                // Bottom Left Screw
                Box(modifier = Modifier.padding(6.dp).align(Alignment.BottomStart)) {
                    TactileScrewCap(isDark = colors.isDark)
                }
                // Bottom Right Screw
                Box(modifier = Modifier.padding(6.dp).align(Alignment.BottomEnd)) {
                    TactileScrewCap(isDark = colors.isDark)
                }
            }
        }
    }
}

/**
 * Tactile Physical Button with Pressed-Depth Haptics
 */
@Composable
fun TactileButton(
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    buttonColor: Color = LocalSscamColors.current.primary,
    textColor: Color = Color.White,
    icon: ImageVector? = null,
    text: String,
    height: Dp = 44.dp
) {
    val colors = LocalSscamColors.current
    Surface(
        color = buttonColor,
        shape = RoundedCornerShape(10.dp),
        border = BorderStroke(1.dp, if (colors.isMonochrome) Color(0xFF27272A) else buttonColor.copy(alpha = 0.8f)),
        shadowElevation = if (colors.isMonochrome) 0.dp else 4.dp,
        modifier = modifier
            .height(height)
            .clickable { onClick() }
    ) {
        Box(
            modifier = Modifier
                .fillMaxSize()
                .padding(horizontal = 16.dp),
            contentAlignment = Alignment.Center
        ) {
            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.Center
            ) {
                if (icon != null) {
                    Icon(
                        imageVector = icon,
                        contentDescription = null,
                        tint = textColor,
                        modifier = Modifier.size(17.dp)
                    )
                    Spacer(modifier = Modifier.width(6.dp))
                }
                Text(
                    text = text,
                    fontSize = 12.sp,
                    fontWeight = FontWeight.Bold,
                    color = textColor
                )
            }
        }
    }
}



