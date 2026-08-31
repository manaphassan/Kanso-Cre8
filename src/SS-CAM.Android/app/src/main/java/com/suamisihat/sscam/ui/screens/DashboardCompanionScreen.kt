package com.suamisihat.sscam.ui.screens

import androidx.compose.animation.core.*
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
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
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.platform.LocalHapticFeedback
import androidx.compose.ui.hapticfeedback.HapticFeedbackType
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.suamisihat.sscam.data.models.ProjectItem
import com.suamisihat.sscam.ui.components.*
import com.suamisihat.sscam.ui.theme.*

data class QuickStatItem(
    val title: String,
    val count: String,
    val icon: ImageVector,
    val iconBg: Color
)

data class TodayTaskItem(
    val title: String,
    val brand: String,
    val progressText: String,
    val progressVal: Float,
    val dateText: String,
    val durationText: String,
    val nasUrl: String,
    val bannerGradient: List<Color>
)

@Composable
fun DashboardCompanionScreen(
    projects: List<ProjectItem>,
    syncMessage: String,
    isLiveSync: Boolean,
    onNavigateDestination: (String, Int) -> Unit = { _, _ -> },
    onSignOff: (ProjectItem) -> Unit = {}
) {
    val colors = LocalSscamColors.current
    val haptic = LocalHapticFeedback.current
    var searchQuery by remember { mutableStateOf("") }
    var selectedTimeframe by remember { mutableStateOf("Weekly") }
    var isTimeframeMenuExpanded by remember { mutableStateOf(false) }
    var activeQuickStatFilter by remember { mutableStateOf("All") }

    val filteredProjects = remember(projects, searchQuery) {
        if (searchQuery.isBlank()) projects
        else projects.filter {
            (it.title?.contains(searchQuery, ignoreCase = true) == true) ||
            (it.brand?.contains(searchQuery, ignoreCase = true) == true) ||
            (it.designer?.contains(searchQuery, ignoreCase = true) == true) ||
            (it.client?.contains(searchQuery, ignoreCase = true) == true) ||
            (it.status?.contains(searchQuery, ignoreCase = true) == true)
        }
    }

    val doneCount = remember(filteredProjects) {
        filteredProjects.count { it.normalizedStatus.equals("done", true) || it.normalizedStatus.equals("completed", true) }
    }
    val inReviewCount = remember(filteredProjects) {
        filteredProjects.count { (it.normalizedStatus.equals("in_review", true) || it.normalizedStatus.equals("revision", true)) && !(it.normalizedStatus.equals("done", true) || it.normalizedStatus.equals("completed", true)) }
    }
    val stuckCount = remember(filteredProjects) {
        filteredProjects.count { it.normalizedStatus.equals("stuck", true) }
    }
    val inProgressCount = remember(filteredProjects) {
        filteredProjects.count { 
            !it.normalizedStatus.equals("done", true) && 
            !it.normalizedStatus.equals("completed", true) &&
            !it.normalizedStatus.equals("in_review", true) && 
            !it.normalizedStatus.equals("revision", true) &&
            !it.normalizedStatus.equals("stuck", true)
        }
    }
    val activeBrandsCount = remember(filteredProjects) {
        filteredProjects.map { it.safeBrand.uppercase() }.distinct().count()
    }
    val nasAssetsCount = remember(filteredProjects) {
        filteredProjects.sumOf { it.safeDeliverableCount }
    }

    val quickStats = listOf(
        QuickStatItem("Active Tasks", "${filteredProjects.size} tasks", Icons.Default.Description, Color(0xFFEFF6FF)),
        QuickStatItem("Due Projects", "${inProgressCount + inReviewCount} projects", Icons.Default.HourglassBottom, Color(0xFFFEF3C7)),
        QuickStatItem("Active Brands", "$activeBrandsCount brands", Icons.Default.Storefront, Color(0xFFF3E8FF)),
        QuickStatItem("NAS Assets", "$nasAssetsCount files", Icons.Default.FolderZip, Color(0xFFECFDF5))
    )

    LazyColumn(
        modifier = Modifier
            .fillMaxSize()
            .padding(horizontal = 16.dp, vertical = 8.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        // 1. Search Bar (Full Width)
        item {
            Surface(
                color = if (colors.isDark) Color(0xFF1E293B) else Color(0xFFF1F5F9),
                shape = RoundedCornerShape(20.dp),
                border = androidx.compose.foundation.BorderStroke(1.dp, colors.border),
                modifier = Modifier
                    .fillMaxWidth()
                    .height(44.dp)
            ) {
                Row(
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(horizontal = 14.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Icon(
                        Icons.Default.Search,
                        contentDescription = "Search",
                        tint = colors.textMuted,
                        modifier = Modifier.size(18.dp)
                    )
                    Spacer(modifier = Modifier.width(8.dp))
                    Box(
                        modifier = Modifier.weight(1f),
                        contentAlignment = Alignment.CenterStart
                    ) {
                        if (searchQuery.isEmpty()) {
                            Text(
                                text = "Search projects, deliverables, or brand codes...",
                                fontSize = 13.sp,
                                color = colors.textMuted
                            )
                        }
                        androidx.compose.foundation.text.BasicTextField(
                            value = searchQuery,
                            onValueChange = { searchQuery = it },
                            textStyle = androidx.compose.ui.text.TextStyle(
                                fontSize = 13.sp,
                                color = colors.textPrimary,
                                fontWeight = FontWeight.Normal
                            ),
                            cursorBrush = androidx.compose.ui.graphics.SolidColor(colors.primary),
                            singleLine = true,
                            modifier = Modifier.fillMaxWidth()
                        )
                    }
                    if (searchQuery.isNotEmpty()) {
                        Icon(
                            Icons.Default.Close,
                            contentDescription = "Clear Search",
                            tint = colors.textMuted,
                            modifier = Modifier
                                .size(16.dp)
                                .clickable { searchQuery = "" }
                        )
                    }
                }
            }
        }

        // 2. 4 Quick Stat Summary Cards (Interactive Filtering)
        item {
            LazyRow(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(10.dp)
            ) {
                items(quickStats) { stat ->
                    val isSelected = activeQuickStatFilter == stat.title
                    Surface(
                        color = if (isSelected) (if (colors.isDark) colors.surface else Color(0xFFEFF6FF)) else colors.card,
                        shape = RoundedCornerShape(16.dp),
                        border = androidx.compose.foundation.BorderStroke(
                            if (isSelected) 1.8.dp else 1.dp,
                            if (isSelected) colors.primary else colors.border
                        ),
                        modifier = Modifier
                            .width(135.dp)
                            .height(105.dp)
                            .clickable {
                                haptic.performHapticFeedback(HapticFeedbackType.TextHandleMove)
                                activeQuickStatFilter = if (activeQuickStatFilter == stat.title) "All" else stat.title
                            }
                    ) {
                        Column(
                            modifier = Modifier
                                .fillMaxSize()
                                .padding(12.dp),
                            verticalArrangement = Arrangement.SpaceBetween
                        ) {
                            Box(
                                modifier = Modifier
                                .size(32.dp)
                                .clip(RoundedCornerShape(8.dp))
                                .background(if (colors.isMonochrome) Color(0xFFF4F4F5) else if (colors.isDark) colors.surface else stat.iconBg),
                                contentAlignment = Alignment.Center
                            ) {
                                Icon(
                                    stat.icon,
                                    contentDescription = null,
                                    tint = if (colors.isMonochrome) Color(0xFF18181B) else if (colors.isDark) colors.primary else Color(0xFF0F172A),
                                    modifier = Modifier.size(16.dp)
                                )
                            }

                            Column {
                                Text(
                                    text = stat.title,
                                    fontSize = 11.sp,
                                    fontWeight = FontWeight.Bold,
                                    color = if (isSelected) colors.primary else colors.textPrimary
                                )
                                Text(
                                    text = stat.count,
                                    fontSize = 10.sp,
                                    color = colors.textSecondary
                                )
                            }
                        }
                    }
                }
            }
        }

        // 3. Productivity KPIs Ring Donut Chart Section
        item {
            Column(modifier = Modifier.fillMaxWidth()) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text(
                        text = "Productivity Overview",
                        fontSize = 17.sp,
                        fontWeight = FontWeight.Bold,
                        color = colors.textPrimary
                    )

                    Box {
                        Surface(
                            color = colors.surface,
                            shape = RoundedCornerShape(8.dp),
                            border = androidx.compose.foundation.BorderStroke(1.dp, colors.border),
                            modifier = Modifier.clickable { isTimeframeMenuExpanded = true }
                        ) {
                            Row(
                                modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp),
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Text(
                                    text = selectedTimeframe,
                                    fontSize = 11.sp,
                                    fontWeight = FontWeight.SemiBold,
                                    color = colors.textPrimary
                                )
                                Spacer(modifier = Modifier.width(4.dp))
                                Icon(
                                    Icons.Default.KeyboardArrowDown,
                                    contentDescription = "Change Timeframe",
                                    tint = colors.textSecondary,
                                    modifier = Modifier.size(14.dp)
                                )
                            }
                        }

                        DropdownMenu(
                            expanded = isTimeframeMenuExpanded,
                            onDismissRequest = { isTimeframeMenuExpanded = false }
                        ) {
                            listOf("Weekly", "Monthly", "Today", "All Time").forEach { tf ->
                                DropdownMenuItem(
                                    text = { Text(tf, fontSize = 12.sp, fontWeight = if (selectedTimeframe == tf) FontWeight.Bold else FontWeight.Normal) },
                                    onClick = {
                                        selectedTimeframe = tf
                                        isTimeframeMenuExpanded = false
                                    }
                                )
                            }
                        }
                    }
                }

                Spacer(modifier = Modifier.height(10.dp))

                // KPI Card Container
                Surface(
                    color = colors.card,
                    shape = RoundedCornerShape(16.dp),
                    border = androidx.compose.foundation.BorderStroke(1.dp, colors.border),
                    modifier = Modifier.fillMaxWidth()
                ) {
                    val totalKpi = stuckCount + inProgressCount + inReviewCount + doneCount
                    val completionPct = if (totalKpi > 0) ((doneCount.toFloat() / totalKpi) * 100).toInt() else 0

                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(16.dp),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.SpaceBetween
                    ) {
                        // Left: Elevated Donut Ring Chart with Center Typography
                        Box(
                            modifier = Modifier.size(140.dp),
                            contentAlignment = Alignment.Center
                        ) {
                            Canvas(modifier = Modifier.size(130.dp)) {
                                val strokeWidth = 12.dp.toPx()
                                val arcSize = Size(size.width - strokeWidth, size.height - strokeWidth)
                                val topLeft = Offset(strokeWidth / 2, strokeWidth / 2)

                                // Base track
                                drawArc(
                                    color = if (colors.isDark) Color(0xFF334155) else Color(0xFFF1F5F9),
                                    startAngle = 0f,
                                    sweepAngle = 360f,
                                    useCenter = false,
                                    topLeft = topLeft,
                                    size = arcSize,
                                    style = Stroke(width = strokeWidth)
                                )

                                if (totalKpi > 0) {
                                    val stuckSweep = (stuckCount.toFloat() / totalKpi * 360f)
                                    val inProgressSweep = (inProgressCount.toFloat() / totalKpi * 360f)
                                    val inReviewSweep = (inReviewCount.toFloat() / totalKpi * 360f)
                                    val doneSweep = (doneCount.toFloat() / totalKpi * 360f)

                                    val segments = if (colors.isMonochrome) {
                                        listOf(
                                            Pair(Color(0xFFE4E4E7), stuckSweep),
                                            Pair(Color(0xFFA1A1AA), inProgressSweep),
                                            Pair(Color(0xFF52525B), inReviewSweep),
                                            Pair(Color(0xFF18181B), doneSweep)
                                        )
                                    } else {
                                        listOf(
                                            Pair(Color(0xFFF87171), stuckSweep),
                                            Pair(Color(0xFFFBBF24), inProgressSweep),
                                            Pair(Color(0xFF38BDF8), inReviewSweep),
                                            Pair(Color(0xFF4ADE80), doneSweep)
                                        )
                                    }

                                    var startAngle = -90f
                                    val activeCount = listOf(stuckCount, inProgressCount, inReviewCount, doneCount).count { it > 0 }

                                    segments.forEach { (color, sweep) ->
                                        if (sweep > 0f) {
                                            val effectiveSweep = if (activeCount > 1) (sweep - 4f).coerceAtLeast(3f) else sweep
                                            drawArc(
                                                color = color,
                                                startAngle = startAngle,
                                                sweepAngle = effectiveSweep,
                                                useCenter = false,
                                                topLeft = topLeft,
                                                size = arcSize,
                                                style = Stroke(width = strokeWidth, cap = StrokeCap.Round)
                                            )
                                            startAngle += sweep
                                        }
                                    }
                                }
                            }

                            // Clean Center Typography Lockup (Fluent 2 Style)
                            Column(
                                horizontalAlignment = Alignment.CenterHorizontally,
                                verticalArrangement = Arrangement.Center
                            ) {
                                Text(
                                    text = if (totalKpi > 0) "$completionPct%" else "0%",
                                    fontSize = 20.sp,
                                    fontWeight = FontWeight.Black,
                                    color = colors.textPrimary,
                                    letterSpacing = (-0.5).sp
                                )
                                Text(
                                    text = if (doneCount > 0) "$doneCount/$totalKpi Done" else "$totalKpi tasks",
                                    fontSize = 9.sp,
                                    fontWeight = FontWeight.SemiBold,
                                    color = colors.textSecondary
                                )
                            }
                        }

                        // Right: KPI Breakdown List
                        Column(
                            verticalArrangement = Arrangement.spacedBy(8.dp),
                            modifier = Modifier.padding(start = 12.dp)
                        ) {
                            val (stuckCol, inProgCol, inRevCol, doneCol) = if (colors.isMonochrome) {
                                listOf(Color(0xFFE4E4E7), Color(0xFFA1A1AA), Color(0xFF52525B), Color(0xFF18181B))
                            } else {
                                listOf(Color(0xFFF87171), Color(0xFFFBBF24), Color(0xFF38BDF8), Color(0xFF4ADE80))
                            }
                            KpiBreakdownRow(color = stuckCol, label = "Stuck", count = stuckCount, total = totalKpi)
                            KpiBreakdownRow(color = inProgCol, label = "In Progress", count = inProgressCount, total = totalKpi)
                            KpiBreakdownRow(color = inRevCol, label = "In Review", count = inReviewCount, total = totalKpi)
                            KpiBreakdownRow(color = doneCol, label = "Done", count = doneCount, total = totalKpi)
                        }
                    }
                }
            }
        }

        // 4. Deliverables Queue Section (Horizontal Card Carousel with NAS Images)
        item {
            Column(modifier = Modifier.fillMaxWidth()) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text(
                        text = "Deliverables Queue",
                        fontSize = 17.sp,
                        fontWeight = FontWeight.Bold,
                        color = colors.textPrimary
                    )

                    Text(
                        text = "See all",
                        fontSize = 12.sp,
                        fontWeight = FontWeight.Bold,
                        color = colors.primary,
                        modifier = Modifier.clickable { onNavigateDestination("Tasks", 0) }
                    )
                }

                Spacer(modifier = Modifier.height(10.dp))

                val displayTasks = remember(filteredProjects, activeQuickStatFilter) {
                    val baseList = when (activeQuickStatFilter) {
                        "Active Tasks" -> filteredProjects.filter { !it.normalizedStatus.equals("done", true) && !it.normalizedStatus.equals("completed", true) }
                        "Due Projects" -> filteredProjects.filter { it.safePriority.equals("urgent", true) || it.safePriority.equals("high", true) || it.normalizedStatus.equals("in_review", true) }
                        "Active Brands" -> filteredProjects.sortedBy { it.safeBrand }
                        "NAS Assets" -> filteredProjects.filter { it.safeDeliverableCount > 0 }
                        else -> filteredProjects
                    }
                    baseList.map { p ->
                        val progressVal = when (p.normalizedStatus) {
                            "done" -> 1.0f
                            "in_review" -> 0.85f
                            "in_progress" -> 0.50f
                            "stuck" -> 0.25f
                            else -> 0.35f
                        }
                        val progressText = "${(progressVal * 100).toInt()}%"
                        val bannerGrad = when (p.safeBrand.uppercase()) {
                            "SSH", "SS" -> listOf(Color(0xFF0F172A), Color(0xFF0284C7), Color(0xFF0369A1))
                            "SSE" -> listOf(Color(0xFF064E3B), Color(0xFF059669), Color(0xFF10B981))
                            "SSW" -> listOf(Color(0xFF831843), Color(0xFFDB2777), Color(0xFFF472B6))
                            "SSP" -> listOf(Color(0xFF4C1D95), Color(0xFF7C3AED), Color(0xFF8B5CF6))
                            else -> listOf(Color(0xFF1E293B), Color(0xFF475569), Color(0xFF64748B))
                        }
                        val nasUrl = ""

                        TodayTaskItem(
                            title = p.safeTitle,
                            brand = p.safeBrand,
                            progressText = progressText,
                            progressVal = progressVal,
                            dateText = if (p.normalizedStatus == "done") "Completed" else "In Sprint",
                            durationText = if (p.safePriority.equals("urgent", true) || p.safePriority.equals("high", true)) "High Priority" else "Standard",
                            nasUrl = nasUrl,
                            bannerGradient = bannerGrad
                        )
                    }
                }

                if (displayTasks.isEmpty()) {
                    FluentCard(
                        cornerRadius = 16.dp,
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Column(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(24.dp),
                            horizontalAlignment = Alignment.CenterHorizontally
                        ) {
                            Icon(
                                Icons.Default.FolderOpen,
                                contentDescription = null,
                                tint = colors.textMuted,
                                modifier = Modifier.size(32.dp)
                            )
                            Spacer(modifier = Modifier.height(8.dp))
                            Text(
                                text = "All Deliverables Up to Date",
                                fontSize = 14.sp,
                                fontWeight = FontWeight.Bold,
                                color = colors.textPrimary
                            )
                            Text(
                                text = "Synced with Synology NAS storage. Production deliverables will populate here when projects are active.",
                                fontSize = 11.sp,
                                color = colors.textSecondary,
                                textAlign = androidx.compose.ui.text.style.TextAlign.Center
                            )
                        }
                    }
                } else {
                    LazyRow(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(12.dp)
                    ) {
                        items(displayTasks) { task ->
                        val taskBannerGrad = if (colors.isMonochrome) {
                            listOf(Color(0xFFE4E4E7), Color(0xFFD4D4D8), Color(0xFFA1A1AA))
                        } else {
                            task.bannerGradient
                        }
                        val grayscaleFilter = if (colors.isMonochrome) {
                            androidx.compose.ui.graphics.ColorFilter.colorMatrix(
                                androidx.compose.ui.graphics.ColorMatrix().apply { setToSaturation(0f) }
                            )
                        } else null

                        Surface(
                            color = colors.card,
                            shape = RoundedCornerShape(16.dp),
                            border = androidx.compose.foundation.BorderStroke(1.dp, colors.border),
                            modifier = Modifier
                                .width(260.dp)
                                .clickable { onNavigateDestination("Tasks", 0) }
                        ) {
                            Column(modifier = Modifier.padding(12.dp)) {
                                // Card Header: NAS Image or Gradient Banner with tags
                                Box(
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .height(110.dp)
                                        .clip(RoundedCornerShape(10.dp))
                                        .background(
                                            androidx.compose.ui.graphics.Brush.linearGradient(taskBannerGrad)
                                        )
                                ) {
                                    if (task.nasUrl.isNotBlank()) {
                                        coil.compose.AsyncImage(
                                            model = task.nasUrl,
                                            contentDescription = "NAS Deliverable Render",
                                            contentScale = androidx.compose.ui.layout.ContentScale.Crop,
                                            colorFilter = grayscaleFilter,
                                            modifier = Modifier.fillMaxSize()
                                        )
                                    } else {
                                        // Luxury Brand Fallback Art Tile
                                        Box(
                                            modifier = Modifier
                                                .fillMaxSize()
                                                .padding(10.dp),
                                            contentAlignment = Alignment.Center
                                        ) {
                                            Column(
                                                horizontalAlignment = Alignment.CenterHorizontally,
                                                verticalArrangement = Arrangement.Center
                                            ) {
                                                Text(
                                                    text = task.brand,
                                                    fontSize = 24.sp,
                                                    fontWeight = FontWeight.Black,
                                                    color = Color.White.copy(alpha = 0.28f),
                                                    letterSpacing = 2.sp
                                                )
                                                Text(
                                                    text = if (task.brand == "SSE") "E-COMMERCE PRODUCTION" else "CREATIVE SUITE",
                                                    fontSize = 7.5.sp,
                                                    fontWeight = FontWeight.Bold,
                                                    color = Color.White.copy(alpha = 0.45f),
                                                    letterSpacing = 1.2.sp
                                                )
                                            }
                                        }
                                    }

                                    // Subsidiary Tag Pill over NAS image
                                    Surface(
                                        color = if (colors.isMonochrome) Color(0xFF18181B) else Color(0xFF0F172A).copy(alpha = 0.82f),
                                        shape = RoundedCornerShape(6.dp),
                                        modifier = Modifier
                                            .padding(8.dp)
                                            .align(Alignment.TopStart)
                                    ) {
                                        Text(
                                            text = task.brand,
                                            color = Color.White,
                                            fontSize = 9.sp,
                                            fontWeight = FontWeight.Bold,
                                            modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp)
                                        )
                                    }

                                    // NAS Sync Badge & Format Pill
                                    Surface(
                                        color = if (colors.isMonochrome) Color(0xFF18181B) else SshSuccessGreen.copy(alpha = 0.92f),
                                        shape = RoundedCornerShape(6.dp),
                                        modifier = Modifier
                                            .padding(8.dp)
                                            .align(Alignment.TopEnd)
                                    ) {
                                        Row(
                                            modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp),
                                            verticalAlignment = Alignment.CenterVertically
                                        ) {
                                            Icon(Icons.Default.CloudDone, contentDescription = null, tint = Color.White, modifier = Modifier.size(10.dp))
                                            Spacer(modifier = Modifier.width(3.dp))
                                            Text("NAS 4K", fontSize = 8.sp, fontWeight = FontWeight.Bold, color = Color.White)
                                        }
                                    }
                                }

                                Spacer(modifier = Modifier.height(10.dp))

                                Text(
                                    text = task.title,
                                    fontSize = 13.sp,
                                    fontWeight = FontWeight.Bold,
                                    color = colors.textPrimary,
                                    lineHeight = 17.sp,
                                    maxLines = 2
                                )

                                Spacer(modifier = Modifier.height(6.dp))

                                // Date & Duration Meta
                                Row(
                                    verticalAlignment = Alignment.CenterVertically,
                                    horizontalArrangement = Arrangement.spacedBy(12.dp)
                                ) {
                                    Row(verticalAlignment = Alignment.CenterVertically) {
                                        Icon(
                                            Icons.Default.CalendarToday,
                                            contentDescription = null,
                                            tint = colors.textMuted,
                                            modifier = Modifier.size(12.dp)
                                        )
                                        Spacer(modifier = Modifier.width(4.dp))
                                        Text(
                                            text = task.dateText,
                                            fontSize = 10.sp,
                                            color = colors.textSecondary
                                        )
                                    }

                                    Row(verticalAlignment = Alignment.CenterVertically) {
                                        Icon(
                                            Icons.Default.Schedule,
                                            contentDescription = null,
                                            tint = colors.textMuted,
                                            modifier = Modifier.size(12.dp)
                                        )
                                        Spacer(modifier = Modifier.width(4.dp))
                                        Text(
                                            text = task.durationText,
                                            fontSize = 10.sp,
                                            color = colors.textSecondary
                                        )
                                    }
                                }

                                Spacer(modifier = Modifier.height(10.dp))

                                // Linear Progress Bar
                                Row(
                                    modifier = Modifier.fillMaxWidth(),
                                    horizontalArrangement = Arrangement.SpaceBetween,
                                    verticalAlignment = Alignment.CenterVertically
                                ) {
                                    Text(
                                        text = if (task.progressVal >= 1f) "Completed" else "On Progress",
                                        fontSize = 10.sp,
                                        color = colors.textSecondary,
                                        fontWeight = FontWeight.Medium
                                    )
                                    Text(
                                        text = task.progressText,
                                        fontSize = 11.sp,
                                        fontWeight = FontWeight.Bold,
                                        color = if (colors.isMonochrome) Color(0xFF18181B) else if (task.progressVal >= 1f) SshSuccessGreen else Color(0xFFFBBF24)
                                    )
                                }

                                Spacer(modifier = Modifier.height(5.dp))

                                Box(
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .height(6.dp)
                                        .clip(RoundedCornerShape(3.dp))
                                        .background(if (colors.isMonochrome) Color(0xFFE4E4E7) else if (colors.isDark) Color(0xFF334155) else Color(0xFFE2E8F0))
                                ) {
                                    Box(
                                        modifier = Modifier
                                            .fillMaxWidth(task.progressVal)
                                            .fillMaxHeight()
                                            .clip(RoundedCornerShape(3.dp))
                                            .background(if (colors.isMonochrome) Color(0xFF18181B) else if (task.progressVal >= 1f) SshSuccessGreen else Color(0xFFFBBF24))
                                    )
                                }

                                Spacer(modifier = Modifier.height(10.dp))

                                // Footer: File stats & Stacked Avatars
                                Row(
                                    modifier = Modifier.fillMaxWidth(),
                                    horizontalArrangement = Arrangement.SpaceBetween,
                                    verticalAlignment = Alignment.CenterVertically
                                ) {
                                    Row(
                                        verticalAlignment = Alignment.CenterVertically,
                                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                                    ) {
                                        Row(verticalAlignment = Alignment.CenterVertically) {
                                            Icon(Icons.Default.FolderOpen, contentDescription = null, tint = colors.textMuted, modifier = Modifier.size(11.dp))
                                            Spacer(modifier = Modifier.width(2.dp))
                                            Text("02", fontSize = 10.sp, color = colors.textMuted)
                                        }
                                        Row(verticalAlignment = Alignment.CenterVertically) {
                                            Icon(Icons.Default.Tag, contentDescription = null, tint = colors.textMuted, modifier = Modifier.size(11.dp))
                                            Spacer(modifier = Modifier.width(2.dp))
                                            Text("12", fontSize = 10.sp, color = colors.textMuted)
                                        }
                                        Row(verticalAlignment = Alignment.CenterVertically) {
                                            Icon(Icons.Default.Brush, contentDescription = null, tint = colors.textMuted, modifier = Modifier.size(11.dp))
                                            Spacer(modifier = Modifier.width(2.dp))
                                            Text("03", fontSize = 10.sp, color = colors.textMuted)
                                        }
                                    }

                                    // Stacked Team Avatars
                                    AvatarStack(listOf("H", "A", "S"))
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}
}

@Composable
fun KpiBreakdownRow(
    color: Color,
    label: String,
    count: Int,
    total: Int = 0
) {
    val colors = LocalSscamColors.current
    val pct = if (total > 0) ((count.toFloat() / total) * 100).toInt() else 0
    Row(
        verticalAlignment = Alignment.CenterVertically,
        modifier = Modifier.width(145.dp)
    ) {
        Box(
            modifier = Modifier
                .size(9.dp)
                .clip(CircleShape)
                .background(color)
        )
        Spacer(modifier = Modifier.width(8.dp))
        Text(
            text = label,
            fontSize = 11.sp,
            fontWeight = FontWeight.Medium,
            color = colors.textSecondary,
            modifier = Modifier.weight(1f)
        )
        Text(
            text = "($count)",
            fontSize = 11.sp,
            fontWeight = FontWeight.Bold,
            color = colors.textPrimary
        )
        Spacer(modifier = Modifier.width(6.dp))
        Text(
            text = "$pct%",
            fontSize = 10.sp,
            fontWeight = FontWeight.SemiBold,
            color = colors.textSecondary
        )
    }
}
