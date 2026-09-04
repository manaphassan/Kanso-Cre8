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
import com.suamisihat.sscam.data.models.CreativeOrder
import com.suamisihat.sscam.data.models.CreateOrderRequest
import com.suamisihat.sscam.ui.components.*
import com.suamisihat.sscam.ui.theme.*

data class QuickStatItem(
    val title: String,
    val count: String,
    val icon: ImageVector,
    val iconBg: Color
)

data class TodayTaskItem(
    val project: ProjectItem,
    val progressText: String,
    val progressVal: Float,
    val bannerGradient: List<Color>,
    val subBrandFullName: String
)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun DashboardCompanionScreen(
    projects: List<ProjectItem>,
    syncMessage: String,
    isLiveSync: Boolean,
    onNavigateDestination: (String, Int) -> Unit = { _, _ -> },
    onSignOff: (ProjectItem) -> Unit = {},
    orders: List<CreativeOrder> = emptyList(),
    onUpdateOrderStatus: (String, String) -> Unit = { _, _ -> },
    onSubmitNewOrder: (CreateOrderRequest) -> Unit = {}
) {
    val colors = LocalSscamColors.current
    val haptic = LocalHapticFeedback.current
    var searchQuery by remember { mutableStateOf("") }
    var selectedTimeframe by remember { mutableStateOf("Weekly") }
    var isTimeframeMenuExpanded by remember { mutableStateOf(false) }
    var activeQuickStatFilter by remember { mutableStateOf("All") }

    var selectedOrderFilter by remember { mutableStateOf("all") }
    var selectedOrderForDetail by remember { mutableStateOf<CreativeOrder?>(null) }
    var showNewOrderModal by remember { mutableStateOf(false) }

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

        // 2. 2x2 Bento KPI Grid (Zero-Scroll Instant Telemetry)
        item {
            Column(
                modifier = Modifier.fillMaxWidth(),
                verticalArrangement = Arrangement.spacedBy(10.dp)
            ) {
                // Top Row: Active Tasks + Due Projects
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(10.dp)
                ) {
                    BentoStatCard(
                        stat = quickStats[0],
                        isSelected = activeQuickStatFilter == quickStats[0].title,
                        colors = colors,
                        modifier = Modifier.weight(1f),
                        onClick = {
                            haptic.performHapticFeedback(HapticFeedbackType.TextHandleMove)
                            activeQuickStatFilter = if (activeQuickStatFilter == quickStats[0].title) "All" else quickStats[0].title
                        }
                    )
                    BentoStatCard(
                        stat = quickStats[1],
                        isSelected = activeQuickStatFilter == quickStats[1].title,
                        colors = colors,
                        modifier = Modifier.weight(1f),
                        onClick = {
                            haptic.performHapticFeedback(HapticFeedbackType.TextHandleMove)
                            activeQuickStatFilter = if (activeQuickStatFilter == quickStats[1].title) "All" else quickStats[1].title
                        }
                    )
                }

                // Bottom Row: Active Brands + NAS Assets
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(10.dp)
                ) {
                    BentoStatCard(
                        stat = quickStats[2],
                        isSelected = activeQuickStatFilter == quickStats[2].title,
                        colors = colors,
                        modifier = Modifier.weight(1f),
                        onClick = {
                            haptic.performHapticFeedback(HapticFeedbackType.TextHandleMove)
                            activeQuickStatFilter = if (activeQuickStatFilter == quickStats[2].title) "All" else quickStats[2].title
                        }
                    )
                    BentoStatCard(
                        stat = quickStats[3],
                        isSelected = activeQuickStatFilter == quickStats[3].title,
                        colors = colors,
                        modifier = Modifier.weight(1f),
                        onClick = {
                            haptic.performHapticFeedback(HapticFeedbackType.TextHandleMove)
                            activeQuickStatFilter = if (activeQuickStatFilter == quickStats[3].title) "All" else quickStats[3].title
                        }
                    )
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

        // 4. New Order Requests Section (Syncs with Web Portal creative.suamisihat.myds.me/#order-form)
        item {
            Column(modifier = Modifier.fillMaxWidth()) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Text(
                            text = "New Order Requests",
                            fontSize = 17.sp,
                            fontWeight = FontWeight.Bold,
                            color = colors.textPrimary
                        )
                        Spacer(modifier = Modifier.width(8.dp))
                        Surface(
                            color = if (colors.isDark) Color(0xFF1E293B) else Color(0xFFEFF6FF),
                            shape = RoundedCornerShape(8.dp),
                            border = androidx.compose.foundation.BorderStroke(1.dp, colors.primary.copy(alpha = 0.3f))
                        ) {
                            Text(
                                text = "${orders.size}",
                                fontSize = 11.sp,
                                fontWeight = FontWeight.Bold,
                                color = colors.primary,
                                modifier = Modifier.padding(horizontal = 7.dp, vertical = 2.dp)
                            )
                        }
                    }

                    Surface(
                        color = colors.primary,
                        shape = RoundedCornerShape(8.dp),
                        modifier = Modifier.clickable {
                            haptic.performHapticFeedback(HapticFeedbackType.LongPress)
                            showNewOrderModal = true
                        }
                    ) {
                        Row(
                            modifier = Modifier.padding(horizontal = 10.dp, vertical = 5.dp),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Icon(
                                Icons.Default.Add,
                                contentDescription = "New Request",
                                tint = Color.White,
                                modifier = Modifier.size(14.dp)
                            )
                            Spacer(modifier = Modifier.width(4.dp))
                            Text(
                                text = "New Request",
                                fontSize = 11.sp,
                                fontWeight = FontWeight.Bold,
                                color = Color.White
                            )
                        }
                    }
                }

                Spacer(modifier = Modifier.height(10.dp))

                // Status Filter Tabs matching Web Portal tabs: All Requests, Pending, In Progress, For Approval, Completed
                val orderTabs = listOf(
                    Triple("all", "All Requests", orders.size),
                    Triple("pending", "Pending", orders.count { it.status.equals("pending", true) }),
                    Triple("in_progress", "In Progress", orders.count { it.status.equals("in_progress", true) }),
                    Triple("for_approval", "For Approval", orders.count { it.status.equals("for_approval", true) }),
                    Triple("done", "Completed", orders.count { it.status.equals("done", true) || it.status.equals("completed", true) })
                )

                LazyRow(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    items(orderTabs) { (key, label, count) ->
                        val isSelected = selectedOrderFilter == key
                        Surface(
                            color = if (isSelected) colors.primary else if (colors.isDark) Color(0xFF1E293B) else Color(0xFFF1F5F9),
                            shape = RoundedCornerShape(12.dp),
                            border = if (isSelected) null else androidx.compose.foundation.BorderStroke(1.dp, colors.border),
                            modifier = Modifier.clickable {
                                haptic.performHapticFeedback(HapticFeedbackType.TextHandleMove)
                                selectedOrderFilter = key
                            }
                        ) {
                            Row(
                                modifier = Modifier.padding(horizontal = 12.dp, vertical = 6.dp),
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Text(
                                    text = label,
                                    fontSize = 11.sp,
                                    fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Medium,
                                    color = if (isSelected) Color.White else colors.textPrimary
                                )
                                Spacer(modifier = Modifier.width(6.dp))
                                Surface(
                                    color = if (isSelected) Color.White.copy(alpha = 0.25f) else if (colors.isDark) Color(0xFF334155) else Color(0xFFE2E8F0),
                                    shape = CircleShape
                                ) {
                                    Text(
                                        text = "$count",
                                        fontSize = 9.sp,
                                        fontWeight = FontWeight.Bold,
                                        color = if (isSelected) Color.White else colors.textSecondary,
                                        modifier = Modifier.padding(horizontal = 5.dp, vertical = 1.dp)
                                    )
                                }
                            }
                        }
                    }
                }

                Spacer(modifier = Modifier.height(12.dp))

                val filteredOrders = remember(orders, selectedOrderFilter, searchQuery) {
                    val base = when (selectedOrderFilter) {
                        "pending" -> orders.filter { it.status.equals("pending", true) }
                        "in_progress" -> orders.filter { it.status.equals("in_progress", true) }
                        "for_approval" -> orders.filter { it.status.equals("for_approval", true) }
                        "done" -> orders.filter { it.status.equals("done", true) || it.status.equals("completed", true) }
                        else -> orders
                    }
                    if (searchQuery.isBlank()) base
                    else base.filter {
                        it.title.contains(searchQuery, ignoreCase = true) ||
                        it.entity.contains(searchQuery, ignoreCase = true) ||
                        it.id.contains(searchQuery, ignoreCase = true) ||
                        it.requester.contains(searchQuery, ignoreCase = true) ||
                        it.copy.contains(searchQuery, ignoreCase = true)
                    }
                }

                if (filteredOrders.isEmpty()) {
                    FluentCard(
                        cornerRadius = 16.dp,
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Column(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(28.dp),
                            horizontalAlignment = Alignment.CenterHorizontally
                        ) {
                            Icon(
                                Icons.Default.Article,
                                contentDescription = null,
                                tint = colors.textMuted,
                                modifier = Modifier.size(36.dp)
                            )
                            Spacer(modifier = Modifier.height(10.dp))
                            Text(
                                text = if (selectedOrderFilter == "all") "No creative requests on record." else "No ${selectedOrderFilter.replace('_', ' ').replaceFirstChar { it.uppercase() }} orders.",
                                fontSize = 14.sp,
                                fontWeight = FontWeight.Bold,
                                color = colors.textPrimary
                            )
                            Spacer(modifier = Modifier.height(4.dp))
                            Text(
                                text = "Submit the first request or adjust the status filter.",
                                fontSize = 11.5.sp,
                                color = colors.textSecondary,
                                textAlign = androidx.compose.ui.text.style.TextAlign.Center
                            )
                            Spacer(modifier = Modifier.height(14.dp))
                            Button(
                                onClick = { showNewOrderModal = true },
                                colors = ButtonDefaults.buttonColors(containerColor = colors.primary),
                                shape = RoundedCornerShape(8.dp)
                            ) {
                                Icon(Icons.Default.Add, contentDescription = null, modifier = Modifier.size(16.dp))
                                Spacer(modifier = Modifier.width(6.dp))
                                Text("New Request", fontSize = 12.sp, fontWeight = FontWeight.Bold)
                            }
                        }
                    }
                } else {
                    LazyRow(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(14.dp)
                    ) {
                        items(filteredOrders, key = { it.id }) { order ->
                            val entityGrad = when (order.safeEntity.uppercase()) {
                                "SSH", "SS" -> listOf(Color(0xFF043388), Color(0xFF0284C7))
                                "SSE" -> listOf(Color(0xFF065F46), Color(0xFF10B981))
                                "SSC" -> listOf(Color(0xFF4A044E), Color(0xFFA21CAF))
                                "SSW" -> listOf(Color(0xFF831843), Color(0xFFF43F5E))
                                "SST" -> listOf(Color(0xFF0E7490), Color(0xFF06B6D4))
                                else -> listOf(Color(0xFF1E293B), Color(0xFF475569))
                            }

                            val prioColors = when (order.priority.lowercase()) {
                                "tier_3", "urgent" -> Color(0xFF991B1B) to Color(0xFFFEF2F2)
                                "tier_2", "fast-track" -> Color(0xFF92400E) to Color(0xFFFFFBEB)
                                else -> Color(0xFF065F46) to Color(0xFFECFDF5)
                            }

                            val statusColors = when (order.status.lowercase()) {
                                "in_progress" -> Color(0xFF1D4ED8) to Color(0xFFEFF6FF)
                                "for_approval" -> Color(0xFF92400E) to Color(0xFFFFFBEB)
                                "done", "completed" -> Color(0xFF065F46) to Color(0xFFECFDF5)
                                "cancelled" -> Color(0xFF991B1B) to Color(0xFFFEF2F2)
                                else -> Color(0xFF475569) to Color(0xFFF1F5F9)
                            }

                            Surface(
                                color = colors.card,
                                shape = RoundedCornerShape(16.dp),
                                border = androidx.compose.foundation.BorderStroke(1.dp, colors.border),
                                modifier = Modifier
                                    .width(295.dp)
                                    .clickable {
                                        haptic.performHapticFeedback(HapticFeedbackType.TextHandleMove)
                                        selectedOrderForDetail = order
                                    }
                            ) {
                                Column(modifier = Modifier.padding(12.dp)) {
                                    // Header Art Banner
                                    Box(
                                        modifier = Modifier
                                            .fillMaxWidth()
                                            .height(82.dp)
                                            .clip(RoundedCornerShape(10.dp))
                                            .background(androidx.compose.ui.graphics.Brush.linearGradient(entityGrad))
                                            .padding(8.dp)
                                    ) {
                                        Column(
                                            modifier = Modifier.fillMaxSize(),
                                            verticalArrangement = Arrangement.SpaceBetween
                                        ) {
                                            Row(
                                                modifier = Modifier.fillMaxWidth(),
                                                horizontalArrangement = Arrangement.SpaceBetween,
                                                verticalAlignment = Alignment.CenterVertically
                                            ) {
                                                Surface(
                                                    color = Color.Black.copy(alpha = 0.35f),
                                                    shape = RoundedCornerShape(6.dp)
                                                ) {
                                                    Text(
                                                        text = order.safeEntity,
                                                        color = Color.White,
                                                        fontSize = 10.sp,
                                                        fontWeight = FontWeight.ExtraBold,
                                                        modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp)
                                                    )
                                                }

                                                Surface(
                                                    color = prioColors.second,
                                                    shape = RoundedCornerShape(6.dp),
                                                    border = androidx.compose.foundation.BorderStroke(0.8.dp, prioColors.first.copy(alpha = 0.3f))
                                                ) {
                                                    Text(
                                                        text = order.priorityLabel,
                                                        color = prioColors.first,
                                                        fontSize = 9.sp,
                                                        fontWeight = FontWeight.Bold,
                                                        modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp)
                                                    )
                                                }
                                            }

                                            Row(
                                                modifier = Modifier.fillMaxWidth(),
                                                horizontalArrangement = Arrangement.SpaceBetween,
                                                verticalAlignment = Alignment.CenterVertically
                                            ) {
                                                Surface(
                                                    color = Color.White.copy(alpha = 0.22f),
                                                    shape = RoundedCornerShape(5.dp)
                                                ) {
                                                    Text(
                                                        text = order.formatLabel,
                                                        color = Color.White,
                                                        fontSize = 9.sp,
                                                        fontWeight = FontWeight.SemiBold,
                                                        modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp)
                                                    )
                                                }

                                                Text(
                                                    text = "#${order.id}",
                                                    color = Color.White.copy(alpha = 0.9f),
                                                    fontSize = 9.5.sp,
                                                    fontWeight = FontWeight.Bold,
                                                    fontFamily = androidx.compose.ui.text.font.FontFamily.Monospace
                                                )
                                            }
                                        }
                                    }

                                    Spacer(modifier = Modifier.height(10.dp))

                                    Text(
                                        text = order.safeTitle,
                                        fontSize = 13.5.sp,
                                        fontWeight = FontWeight.Bold,
                                        color = colors.textPrimary,
                                        lineHeight = 18.sp,
                                        maxLines = 2
                                    )

                                    Spacer(modifier = Modifier.height(6.dp))

                                    // Brief Snippet preview box
                                    Surface(
                                        color = if (colors.isDark) Color(0xFF1E293B).copy(alpha = 0.5f) else Color(0xFFF8FAFC),
                                        shape = RoundedCornerShape(8.dp),
                                        border = androidx.compose.foundation.BorderStroke(0.8.dp, colors.border.copy(alpha = 0.6f)),
                                        modifier = Modifier.fillMaxWidth()
                                    ) {
                                        Text(
                                            text = "\"${order.copy.take(80)}${if (order.copy.length > 80) "…" else ""}\"",
                                            fontSize = 10.5.sp,
                                            color = colors.textSecondary,
                                            maxLines = 2,
                                            lineHeight = 14.sp,
                                            modifier = Modifier.padding(horizontal = 8.dp, vertical = 6.dp)
                                        )
                                    }

                                    Spacer(modifier = Modifier.height(8.dp))

                                    Row(
                                        modifier = Modifier.fillMaxWidth(),
                                        horizontalArrangement = Arrangement.SpaceBetween,
                                        verticalAlignment = Alignment.CenterVertically
                                    ) {
                                        Row(verticalAlignment = Alignment.CenterVertically) {
                                            Icon(
                                                Icons.Default.CalendarToday,
                                                contentDescription = null,
                                                tint = colors.textMuted,
                                                modifier = Modifier.size(11.dp)
                                            )
                                            Spacer(modifier = Modifier.width(4.dp))
                                            Text(
                                                text = "Due ${order.targetDate.ifBlank { "TBD" }}",
                                                fontSize = 10.sp,
                                                color = colors.textSecondary
                                            )
                                        }

                                        Row(verticalAlignment = Alignment.CenterVertically) {
                                            Icon(
                                                Icons.Default.Person,
                                                contentDescription = null,
                                                tint = colors.textMuted,
                                                modifier = Modifier.size(11.dp)
                                            )
                                            Spacer(modifier = Modifier.width(3.dp))
                                            Text(
                                                text = order.requester,
                                                fontSize = 10.sp,
                                                color = colors.textSecondary,
                                                maxLines = 1
                                            )
                                        }
                                    }

                                    Spacer(modifier = Modifier.height(10.dp))

                                    // Status & Quick Action Button
                                    Row(
                                        modifier = Modifier.fillMaxWidth(),
                                        horizontalArrangement = Arrangement.SpaceBetween,
                                        verticalAlignment = Alignment.CenterVertically
                                    ) {
                                        Surface(
                                            color = statusColors.second,
                                            shape = RoundedCornerShape(6.dp),
                                            border = androidx.compose.foundation.BorderStroke(0.8.dp, statusColors.first.copy(alpha = 0.25f))
                                        ) {
                                            Text(
                                                text = order.statusLabel,
                                                color = statusColors.first,
                                                fontSize = 10.sp,
                                                fontWeight = FontWeight.Bold,
                                                modifier = Modifier.padding(horizontal = 7.dp, vertical = 3.dp)
                                            )
                                        }

                                        when (order.status.lowercase()) {
                                            "pending" -> {
                                                Surface(
                                                    color = Color(0xFF1D4ED8),
                                                    shape = RoundedCornerShape(6.dp),
                                                    modifier = Modifier.clickable {
                                                        haptic.performHapticFeedback(HapticFeedbackType.LongPress)
                                                        onUpdateOrderStatus(order.id, "in_progress")
                                                    }
                                                ) {
                                                    Row(
                                                        modifier = Modifier.padding(horizontal = 9.dp, vertical = 4.dp),
                                                        verticalAlignment = Alignment.CenterVertically
                                                    ) {
                                                        Icon(Icons.Default.PlayArrow, contentDescription = null, tint = Color.White, modifier = Modifier.size(11.dp))
                                                        Spacer(modifier = Modifier.width(3.dp))
                                                        Text("Start", color = Color.White, fontSize = 10.sp, fontWeight = FontWeight.Bold)
                                                    }
                                                }
                                            }
                                            "in_progress" -> {
                                                Surface(
                                                    color = Color(0xFFD97706),
                                                    shape = RoundedCornerShape(6.dp),
                                                    modifier = Modifier.clickable {
                                                        haptic.performHapticFeedback(HapticFeedbackType.LongPress)
                                                        onUpdateOrderStatus(order.id, "for_approval")
                                                    }
                                                ) {
                                                    Row(
                                                        modifier = Modifier.padding(horizontal = 9.dp, vertical = 4.dp),
                                                        verticalAlignment = Alignment.CenterVertically
                                                    ) {
                                                        Icon(Icons.Default.RateReview, contentDescription = null, tint = Color.White, modifier = Modifier.size(11.dp))
                                                        Spacer(modifier = Modifier.width(3.dp))
                                                        Text("Review", color = Color.White, fontSize = 10.sp, fontWeight = FontWeight.Bold)
                                                    }
                                                }
                                            }
                                            "for_approval" -> {
                                                Surface(
                                                    color = Color(0xFF059669),
                                                    shape = RoundedCornerShape(6.dp),
                                                    modifier = Modifier.clickable {
                                                        haptic.performHapticFeedback(HapticFeedbackType.LongPress)
                                                        onUpdateOrderStatus(order.id, "done")
                                                    }
                                                ) {
                                                    Row(
                                                        modifier = Modifier.padding(horizontal = 9.dp, vertical = 4.dp),
                                                        verticalAlignment = Alignment.CenterVertically
                                                    ) {
                                                        Icon(Icons.Default.CheckCircle, contentDescription = null, tint = Color.White, modifier = Modifier.size(11.dp))
                                                        Spacer(modifier = Modifier.width(3.dp))
                                                        Text("Complete", color = Color.White, fontSize = 10.sp, fontWeight = FontWeight.Bold)
                                                    }
                                                }
                                            }
                                            else -> {
                                                Row(verticalAlignment = Alignment.CenterVertically) {
                                                    Icon(Icons.Default.Check, contentDescription = null, tint = Color(0xFF059669), modifier = Modifier.size(13.dp))
                                                    Spacer(modifier = Modifier.width(3.dp))
                                                    Text("Fulfilled", color = Color(0xFF059669), fontSize = 10.sp, fontWeight = FontWeight.Bold)
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
        }
    }

    // Creative Order Detail Modal
    if (selectedOrderForDetail != null) {
        val detailOrder = selectedOrderForDetail!!
        AlertDialog(
            onDismissRequest = { selectedOrderForDetail = null },
            confirmButton = {
                TextButton(onClick = { selectedOrderForDetail = null }) {
                    Text("Close", color = colors.primary, fontWeight = FontWeight.Bold)
                }
            },
            dismissButton = {
                when (detailOrder.status.lowercase()) {
                    "pending" -> {
                        Button(
                            onClick = {
                                onUpdateOrderStatus(detailOrder.id, "in_progress")
                                selectedOrderForDetail = null
                            },
                            colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF1D4ED8))
                        ) {
                            Icon(Icons.Default.PlayArrow, contentDescription = null, modifier = Modifier.size(16.dp))
                            Spacer(modifier = Modifier.width(4.dp))
                            Text("Start Work")
                        }
                    }
                    "in_progress" -> {
                        Button(
                            onClick = {
                                onUpdateOrderStatus(detailOrder.id, "for_approval")
                                selectedOrderForDetail = null
                            },
                            colors = ButtonDefaults.buttonColors(containerColor = Color(0xFFD97706))
                        ) {
                            Icon(Icons.Default.RateReview, contentDescription = null, modifier = Modifier.size(16.dp))
                            Spacer(modifier = Modifier.width(4.dp))
                            Text("Submit for Review")
                        }
                    }
                    "for_approval" -> {
                        Button(
                            onClick = {
                                onUpdateOrderStatus(detailOrder.id, "done")
                                selectedOrderForDetail = null
                            },
                            colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF059669))
                        ) {
                            Icon(Icons.Default.CheckCircle, contentDescription = null, modifier = Modifier.size(16.dp))
                            Spacer(modifier = Modifier.width(4.dp))
                            Text("Mark Completed")
                        }
                    }
                    else -> {}
                }
            },
            title = {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text(
                        text = "Order Details",
                        fontSize = 17.sp,
                        fontWeight = FontWeight.Bold,
                        color = colors.textPrimary
                    )
                    Text(
                        text = "#${detailOrder.id}",
                        fontSize = 11.sp,
                        fontFamily = androidx.compose.ui.text.font.FontFamily.Monospace,
                        color = colors.textSecondary
                    )
                }
            },
            text = {
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(vertical = 4.dp),
                    verticalArrangement = Arrangement.spacedBy(10.dp)
                ) {
                    Text(
                        text = detailOrder.safeTitle,
                        fontSize = 15.sp,
                        fontWeight = FontWeight.ExtraBold,
                        color = colors.textPrimary
                    )

                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(6.dp)
                    ) {
                        Surface(
                            color = colors.primary.copy(alpha = 0.15f),
                            shape = RoundedCornerShape(6.dp)
                        ) {
                            Text(
                                text = detailOrder.safeEntity,
                                fontSize = 10.sp,
                                fontWeight = FontWeight.Bold,
                                color = colors.primary,
                                modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp)
                            )
                        }

                        Surface(
                            color = if (detailOrder.priority.contains("3")) Color(0xFFFEF2F2) else Color(0xFFEFF6FF),
                            shape = RoundedCornerShape(6.dp)
                        ) {
                            Text(
                                text = detailOrder.priorityLabel,
                                fontSize = 10.sp,
                                fontWeight = FontWeight.Bold,
                                color = if (detailOrder.priority.contains("3")) Color(0xFF991B1B) else Color(0xFF1D4ED8),
                                modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp)
                            )
                        }

                        Surface(
                            color = if (colors.isDark) Color(0xFF334155) else Color(0xFFF1F5F9),
                            shape = RoundedCornerShape(6.dp)
                        ) {
                            Text(
                                text = detailOrder.formatLabel,
                                fontSize = 10.sp,
                                fontWeight = FontWeight.Medium,
                                color = colors.textPrimary,
                                modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp)
                            )
                        }
                    }

                    Text(
                        text = "Brief & Copy Script:",
                        fontSize = 11.sp,
                        fontWeight = FontWeight.Bold,
                        color = colors.textSecondary
                    )

                    Surface(
                        color = if (colors.isDark) Color(0xFF1E293B) else Color(0xFFF8FAFC),
                        shape = RoundedCornerShape(8.dp),
                        border = androidx.compose.foundation.BorderStroke(1.dp, colors.border),
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Text(
                            text = detailOrder.copy,
                            fontSize = 12.sp,
                            color = colors.textPrimary,
                            lineHeight = 16.sp,
                            modifier = Modifier.padding(10.dp)
                        )
                    }

                    if (detailOrder.attachmentNote.isNotBlank()) {
                        Text(
                            text = "Asset Reference:",
                            fontSize = 11.sp,
                            fontWeight = FontWeight.Bold,
                            color = colors.textSecondary
                        )
                        Surface(
                            color = if (colors.isDark) Color(0xFF0F172A) else Color(0xFFEFF6FF),
                            shape = RoundedCornerShape(6.dp),
                            modifier = Modifier.fillMaxWidth()
                        ) {
                            Text(
                                text = detailOrder.attachmentNote,
                                fontSize = 11.sp,
                                color = colors.primary,
                                fontFamily = androidx.compose.ui.text.font.FontFamily.Monospace,
                                modifier = Modifier.padding(8.dp)
                            )
                        }
                    }

                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween
                    ) {
                        Column {
                            Text("Requester", fontSize = 10.sp, color = colors.textMuted)
                            Text(detailOrder.requester, fontSize = 12.sp, fontWeight = FontWeight.SemiBold, color = colors.textPrimary)
                        }
                        Column(horizontalAlignment = Alignment.End) {
                            Text("Target Date", fontSize = 10.sp, color = colors.textMuted)
                            Text(detailOrder.targetDate, fontSize = 12.sp, fontWeight = FontWeight.SemiBold, color = colors.textPrimary)
                        }
                    }
                }
            }
        )
    }

    // Create New Order Modal
    if (showNewOrderModal) {
        var newTitle by remember { mutableStateOf("") }
        var newEntity by remember { mutableStateOf("SSH") }
        var newPriority by remember { mutableStateOf("tier_1") }
        var newFormat by remember { mutableStateOf("9_16_video") }
        var newCopy by remember { mutableStateOf("") }
        var newTargetDate by remember {
            val cal = java.util.Calendar.getInstance()
            cal.add(java.util.Calendar.DAY_OF_YEAR, 3)
            val sdf = java.text.SimpleDateFormat("yyyy-MM-dd", java.util.Locale.US)
            mutableStateOf(sdf.format(cal.time))
        }
        var newAttachment by remember { mutableStateOf("") }

        AlertDialog(
            onDismissRequest = { showNewOrderModal = false },
            confirmButton = {
                Button(
                    onClick = {
                        if (newTitle.isNotBlank() && newCopy.isNotBlank()) {
                            onSubmitNewOrder(
                                CreateOrderRequest(
                                    title = newTitle.trim(),
                                    entity = newEntity,
                                    priority = newPriority,
                                    format = newFormat,
                                    copy = newCopy.trim(),
                                    targetDate = newTargetDate,
                                    attachmentNote = newAttachment.trim()
                                )
                            )
                            showNewOrderModal = false
                        }
                    },
                    enabled = newTitle.isNotBlank() && newCopy.isNotBlank(),
                    colors = ButtonDefaults.buttonColors(containerColor = colors.primary)
                ) {
                    Text("Submit Request", fontWeight = FontWeight.Bold)
                }
            },
            dismissButton = {
                TextButton(onClick = { showNewOrderModal = false }) {
                    Text("Cancel", color = colors.textSecondary)
                }
            },
            title = {
                Column {
                    Text("Creative Request Form", fontSize = 16.sp, fontWeight = FontWeight.Bold, color = colors.textPrimary)
                    Text("Submit structured creative brief under 60 seconds", fontSize = 11.sp, color = colors.textSecondary)
                }
            },
            text = {
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(vertical = 4.dp),
                    verticalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    OutlinedTextField(
                        value = newTitle,
                        onValueChange = { newTitle = it },
                        label = { Text("Project Title *") },
                        modifier = Modifier.fillMaxWidth(),
                        singleLine = true
                    )

                    // Entity selector
                    Text("Requesting Entity", fontSize = 11.sp, fontWeight = FontWeight.Bold, color = colors.textSecondary)
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(6.dp)
                    ) {
                        listOf("SSH", "SSE", "SSC", "SST", "SSW").forEach { ent ->
                            Surface(
                                color = if (newEntity == ent) colors.primary else if (colors.isDark) Color(0xFF1E293B) else Color(0xFFF1F5F9),
                                shape = RoundedCornerShape(8.dp),
                                modifier = Modifier
                                    .weight(1f)
                                    .clickable { newEntity = ent }
                            ) {
                                Text(
                                    text = ent,
                                    fontSize = 11.sp,
                                    fontWeight = if (newEntity == ent) FontWeight.Bold else FontWeight.Medium,
                                    color = if (newEntity == ent) Color.White else colors.textPrimary,
                                    textAlign = androidx.compose.ui.text.style.TextAlign.Center,
                                    modifier = Modifier.padding(vertical = 6.dp)
                                )
                            }
                        }
                    }

                    // Priority Selector
                    Text("Priority Tier", fontSize = 11.sp, fontWeight = FontWeight.Bold, color = colors.textSecondary)
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(6.dp)
                    ) {
                        listOf(
                            "tier_1" to "Standard",
                            "tier_2" to "Fast-Track",
                            "tier_3" to "Urgent"
                        ).forEach { (prio, label) ->
                            Surface(
                                color = if (newPriority == prio) colors.primary else if (colors.isDark) Color(0xFF1E293B) else Color(0xFFF1F5F9),
                                shape = RoundedCornerShape(8.dp),
                                modifier = Modifier
                                    .weight(1f)
                                    .clickable { newPriority = prio }
                            ) {
                                Text(
                                    text = label,
                                    fontSize = 10.5.sp,
                                    fontWeight = if (newPriority == prio) FontWeight.Bold else FontWeight.Medium,
                                    color = if (newPriority == prio) Color.White else colors.textPrimary,
                                    textAlign = androidx.compose.ui.text.style.TextAlign.Center,
                                    modifier = Modifier.padding(vertical = 6.dp)
                                )
                            }
                        }
                    }

                    // Format Selector
                    Text("Format", fontSize = 11.sp, fontWeight = FontWeight.Bold, color = colors.textSecondary)
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(6.dp)
                    ) {
                        listOf(
                            "9_16_video" to "9:16 Video",
                            "1_1_feed" to "1:1 Feed",
                            "print_posm" to "Print POSM"
                        ).forEach { (fmt, label) ->
                            Surface(
                                color = if (newFormat == fmt) colors.primary else if (colors.isDark) Color(0xFF1E293B) else Color(0xFFF1F5F9),
                                shape = RoundedCornerShape(8.dp),
                                modifier = Modifier
                                    .weight(1f)
                                    .clickable { newFormat = fmt }
                            ) {
                                Text(
                                    text = label,
                                    fontSize = 10.sp,
                                    fontWeight = if (newFormat == fmt) FontWeight.Bold else FontWeight.Medium,
                                    color = if (newFormat == fmt) Color.White else colors.textPrimary,
                                    textAlign = androidx.compose.ui.text.style.TextAlign.Center,
                                    modifier = Modifier.padding(vertical = 6.dp)
                                )
                            }
                        }
                    }

                    OutlinedTextField(
                        value = newCopy,
                        onValueChange = { newCopy = it },
                        label = { Text("Brief & Copy Script *") },
                        modifier = Modifier.fillMaxWidth(),
                        minLines = 3,
                        maxLines = 4
                    )

                    OutlinedTextField(
                        value = newTargetDate,
                        onValueChange = { newTargetDate = it },
                        label = { Text("Target Date (YYYY-MM-DD) *") },
                        modifier = Modifier.fillMaxWidth(),
                        singleLine = true
                    )

                    OutlinedTextField(
                        value = newAttachment,
                        onValueChange = { newAttachment = it },
                        label = { Text("Asset Reference (NAS path or Drive link)") },
                        modifier = Modifier.fillMaxWidth(),
                        singleLine = true
                    )
                }
            }
        )
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

@Composable
fun BentoStatCard(
    stat: QuickStatItem,
    isSelected: Boolean,
    colors: SscamColors,
    modifier: Modifier = Modifier,
    onClick: () -> Unit
) {
    Surface(
        color = if (isSelected) (if (colors.isDark) colors.surface else Color(0xFFEFF6FF)) else colors.card,
        shape = RoundedCornerShape(16.dp),
        border = androidx.compose.foundation.BorderStroke(
            if (isSelected) 1.8.dp else 1.dp,
            if (isSelected) colors.primary else colors.border
        ),
        modifier = modifier
            .height(72.dp)
            .clickable(onClick = onClick)
    ) {
        Row(
            modifier = Modifier
                .fillMaxSize()
                .padding(horizontal = 12.dp, vertical = 8.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(10.dp)
        ) {
            Box(
                modifier = Modifier
                    .size(36.dp)
                    .clip(RoundedCornerShape(10.dp))
                    .background(if (colors.isMonochrome) Color(0xFFF4F4F5) else if (colors.isDark) colors.surface else stat.iconBg),
                contentAlignment = Alignment.Center
            ) {
                Icon(
                    stat.icon,
                    contentDescription = null,
                    tint = if (colors.isMonochrome) Color(0xFF18181B) else if (colors.isDark) colors.primary else Color(0xFF0F172A),
                    modifier = Modifier.size(18.dp)
                )
            }
            Column(
                verticalArrangement = Arrangement.Center
            ) {
                Text(
                    text = stat.count,
                    fontSize = 13.sp,
                    fontWeight = FontWeight.ExtraBold,
                    color = if (isSelected) colors.primary else colors.textPrimary
                )
                Text(
                    text = stat.title,
                    fontSize = 10.5.sp,
                    fontWeight = FontWeight.Medium,
                    color = colors.textSecondary
                )
            }
        }
    }
}
