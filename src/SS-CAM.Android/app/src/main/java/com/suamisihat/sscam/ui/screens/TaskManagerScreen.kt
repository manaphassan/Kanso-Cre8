package com.suamisihat.sscam.ui.screens

import android.widget.Toast
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.rememberLazyListState
import kotlinx.coroutines.launch
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.Assignment
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.suamisihat.sscam.data.models.ProjectItem
import com.suamisihat.sscam.ui.components.*
import com.suamisihat.sscam.ui.theme.*

data class CalendarDayItem(
    val dayLetter: String,
    val dayNumber: String,
    val isToday: Boolean = false
)

@Composable
fun TaskManagerScreen(
    projects: List<ProjectItem>,
    onSignOff: (ProjectItem) -> Unit = {},
    onRevise: (ProjectItem) -> Unit = {},
    onCreateNewTask: (title: String, desc: String, brand: String, priority: String) -> Unit = { _, _, _, _ -> }
) {
    val context = LocalContext.current
    val colors = LocalSscamColors.current

    var selectedSubTab by remember { mutableStateOf(0) }
    val subTabs = listOf("Queue", "Timeline")

    var selectedFilter by remember { mutableStateOf("BACKLOG") }
    var selectedBrand by remember { mutableStateOf("ALL BRANDS") }
    var selectedProjectForManage by remember { mutableStateOf<ProjectItem?>(null) }

    val filterTabs = listOf("BACKLOG", "PROGRESS", "REVIEW", "REVISION", "DONE & APPROVED", "ON HOLD / QUEUED")
    val brandTabs = listOf("ALL BRANDS", "SSH", "SSC", "SSW", "SSE", "SST")

    val priorityOrder = mapOf(
        "urgent" to 4,
        "high" to 3,
        "medium" to 2,
        "standard" to 2,
        "low" to 1
    )

    val filteredProjects = remember(projects, selectedFilter, selectedBrand) {
        projects.filter { p ->
            val statusMatch = when (selectedFilter.uppercase()) {
                "BACKLOG" -> p.normalizedStatus == "backlog"
                "PROGRESS", "IN PROGRESS" -> p.normalizedStatus == "in_progress"
                "REVIEW", "IN REVIEW", "REVIEW QUEUE" -> p.normalizedStatus == "in_review"
                "REVISION", "REVISION REQUIRED" -> p.normalizedStatus == "revision"
                "DONE & APPROVED", "DONE", "APPROVED" -> p.normalizedStatus == "done"
                "ON HOLD / QUEUED", "ON HOLD", "QUEUED" -> p.normalizedStatus == "on_hold"
                else -> true
            }
            val brandMatch = when (selectedBrand) {
                "ALL BRANDS" -> true
                "SSH" -> p.brand?.equals("SSH", ignoreCase = true) == true || p.brand?.equals("SS", ignoreCase = true) == true
                else -> p.brand?.contains(selectedBrand, ignoreCase = true) == true
            }
            statusMatch && brandMatch
        }.sortedWith(
            compareByDescending<ProjectItem> { p ->
                priorityOrder[p.priority?.lowercase()?.trim()] ?: 0
            }.thenBy { p ->
                val d = p.deadline?.trim().orEmpty()
                if (d.isBlank() || d.equals("TBD", ignoreCase = true)) {
                    "9999-12-31"
                } else if (d.contains("T")) {
                    d.substringBefore("T")
                } else {
                    d
                }
            }
        )
    }

    Box(modifier = Modifier.fillMaxSize()) {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(horizontal = 16.dp, vertical = 10.dp)
        ) {
            // Segmented Sub-Tab Switcher (Vector styled)
            FluentSegmentedPillControl(
                options = subTabs,
                selectedIndex = selectedSubTab,
                onOptionSelected = { selectedSubTab = it },
                modifier = Modifier.padding(bottom = 12.dp)
            )

            if (selectedSubTab == 0) {
                // 📋 TASK REVIEW QUEUE
                LazyColumn(
                    modifier = Modifier.fillMaxSize(),
                    verticalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    // Status Filter Row
                    item {
                        LazyRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                            items(filterTabs) { tab ->
                                val isSelected = selectedFilter == tab
                                val activeBg = if (colors.isMonochrome) Color(0xFF18181B) else if (colors.isDark) colors.container else colors.primary
                                val activeText = Color.White
                                val inactiveBg = if (colors.isDark) colors.surface else colors.card
                                Box(
                                    modifier = Modifier
                                        .clip(RoundedCornerShape(8.dp))
                                        .background(if (isSelected) activeBg else inactiveBg)
                                        .border(
                                            1.dp,
                                            if (isSelected) (if (colors.isMonochrome) Color(0xFF18181B) else colors.primary.copy(alpha = 0.6f)) else colors.border,
                                            RoundedCornerShape(8.dp)
                                        )
                                        .clickable { selectedFilter = tab }
                                        .padding(horizontal = 12.dp, vertical = 6.dp)
                                ) {
                                    Text(
                                        tab,
                                        fontSize = 11.sp,
                                        fontWeight = FontWeight.Bold,
                                        color = if (isSelected) activeText else colors.textSecondary
                                    )
                                }
                            }
                        }
                    }

                    // Subsidiary Brand Filter Row
                    item {
                        LazyRow(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                            items(brandTabs) { brand ->
                                val isSelected = selectedBrand == brand
                                val selectedBg = if (colors.isMonochrome) Color(0xFF18181B) else if (colors.isDark) colors.card else colors.container
                                val selectedFg = if (colors.isMonochrome) Color.White else colors.accent
                                Box(
                                    modifier = Modifier
                                        .clip(RoundedCornerShape(6.dp))
                                        .background(if (isSelected) selectedBg else Color.Transparent)
                                        .border(
                                            if (isSelected) 1.dp else 0.dp,
                                            if (isSelected) (if (colors.isMonochrome) Color(0xFF18181B) else colors.accent.copy(alpha = 0.5f)) else Color.Transparent,
                                            RoundedCornerShape(6.dp)
                                        )
                                        .clickable { selectedBrand = brand }
                                        .padding(horizontal = 10.dp, vertical = 4.dp)
                                ) {
                                    Text(
                                        brand,
                                        fontSize = 10.sp,
                                        fontWeight = FontWeight.SemiBold,
                                        color = if (isSelected) selectedFg else colors.textMuted
                                    )
                                }
                            }
                        }
                    }

                    // Task Header
                    item {
                        FluentSectionHeader(
                            title = "Task Queue",
                            trailingText = "${filteredProjects.size} tasks"
                        )
                    }

                    // Deliverables List Items or Empty State
                    if (filteredProjects.isEmpty()) {
                        item {
                            FluentCard(
                                cornerRadius = 16.dp,
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .padding(vertical = 16.dp)
                            ) {
                                Column(
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .padding(32.dp),
                                    horizontalAlignment = Alignment.CenterHorizontally
                                ) {
                                    Icon(
                                        Icons.AutoMirrored.Filled.Assignment,
                                        contentDescription = null,
                                        tint = colors.textMuted,
                                        modifier = Modifier.size(36.dp)
                                    )
                                    Spacer(modifier = Modifier.height(10.dp))
                                    Text(
                                        text = "No Deliverables in Queue",
                                        fontSize = 15.sp,
                                        fontWeight = FontWeight.Bold,
                                        color = colors.textPrimary
                                    )
                                    Spacer(modifier = Modifier.height(4.dp))
                                    Text(
                                        text = "All production deliverables in this category are up to date and synchronized with Synology NAS storage.",
                                        fontSize = 12.sp,
                                        color = colors.textSecondary,
                                        textAlign = androidx.compose.ui.text.style.TextAlign.Center
                                    )
                                }
                            }
                        }
                    } else {
                        items(filteredProjects) { project ->
                            ReferenceStyleDeliverableCard(
                                title = project.safeTitle,
                                brand = project.safeBrand,
                                designer = project.safeDesigner,
                                deadline = project.formattedDeadline,
                                status = project.status,
                                priority = project.safePriority,
                                onSignOff = { onSignOff(project) },
                                onCardClick = { selectedProjectForManage = project }
                            )
                        }
                    }

                    item {
                        Spacer(modifier = Modifier.height(70.dp))
                    }
                }
            } else {
                // 📅 TASK CALENDAR / SCHEDULE TIMELINE
                OrbixTaskCalendarTimelineView(
                    projects = projects,
                    onSignOff = onSignOff,
                    onProjectClick = { selectedProjectForManage = it }
                )
            }
        }

        // Project Companion Management Bottom Sheet (Status, README, Deliverables)
        selectedProjectForManage?.let { projectToManage ->
            ManageProjectBottomSheet(
                project = projectToManage,
                onDismiss = { selectedProjectForManage = null },
                onUpdateStatus = { newStatus ->
                    android.widget.Toast.makeText(context, "Status updated to '$newStatus'", android.widget.Toast.LENGTH_SHORT).show()
                },
                onSaveReadme = { _ ->
                    android.widget.Toast.makeText(context, "README.md synced with NAS storage", android.widget.Toast.LENGTH_SHORT).show()
                }
            )
        }
    }
}

sealed class TimelineFeedItem {
    data class ProjectEntry(val project: ProjectItem) : TimelineFeedItem()
    data class TodayMarker(val date: java.time.LocalDate, val activeCount: Int) : TimelineFeedItem()
}

/**
 * Orbix Studio Inspired Task Calendar & Multi-Track Schedule Timeline View
 * Supports Scrollable Week Days, Full Interactive Month Calendar Grid, and All-Projects Vertical Timeline Stack
 */
@Composable
fun OrbixTaskCalendarTimelineView(
    projects: List<ProjectItem> = emptyList(),
    onSignOff: (ProjectItem) -> Unit = {},
    onProjectClick: (ProjectItem) -> Unit = {}
) {
    val colors = LocalSscamColors.current
    val today = remember { java.time.LocalDate.now() }
    val coroutineScope = rememberCoroutineScope()
    val weekScrollState = rememberLazyListState(initialFirstVisibleItemIndex = 8)
    val timelineListState = rememberLazyListState()

    var selectedDayIndex by remember { mutableStateOf(10) } // Default centered around today (offset 0 in -10..10)
    var selectedViewMode by remember { mutableStateOf("Week") } // "Week", "Month", "Timeline"
    var isViewModeMenuExpanded by remember { mutableStateOf(false) }

    var calendarYear by remember { mutableStateOf(today.year) }
    var calendarMonth by remember { mutableStateOf(today.monthValue) }
    var selectedMonthDay by remember { mutableStateOf(today.dayOfMonth) }

    // Selected dates for Week and Month views
    val selectedWeekDate = remember(today, selectedDayIndex) {
        today.plusDays((selectedDayIndex - 10).toLong())
    }
    val selectedMonthDate = remember(calendarYear, calendarMonth, selectedMonthDay) {
        try {
            java.time.LocalDate.of(calendarYear, calendarMonth, selectedMonthDay)
        } catch (e: Exception) {
            today
        }
    }

    // 21-Day Scrollable Week Range centered around Today (-10..10 days)
    val scrollableWeekDays = remember(today) {
        val daysList = mutableListOf<CalendarDayItem>()
        for (i in -10..10) {
            val date = today.plusDays(i.toLong())
            val dayLetter = date.dayOfWeek.getDisplayName(java.time.format.TextStyle.SHORT, java.util.Locale.ENGLISH)
            val dayNum = String.format("%02d", date.dayOfMonth)
            val isToday = (i == 0)
            daysList.add(CalendarDayItem(dayLetter, dayNum, isToday))
        }
        daysList
    }

    // Active project deliverables for the selected day in Week or Month view (sorted chronologically)
    val activeProjectsForDate = remember(projects, selectedViewMode, selectedWeekDate, selectedMonthDate) {
        val filtered = when (selectedViewMode) {
            "Week" -> projects.filter { it.isActiveOn(selectedWeekDate) }
            "Month" -> projects.filter { it.isActiveOn(selectedMonthDate) }
            else -> emptyList()
        }
        filtered.sortedWith(
            compareBy<ProjectItem> { it.effectiveStartDate }
                .thenBy { it.effectiveEndDate }
                .thenBy { it.safeTitle }
        )
    }

    // Sort ALL projects chronologically from oldest to newest start date for Timeline view
    val sortedAllProjects = remember(projects) {
        projects.sortedWith(
            compareBy<ProjectItem> { it.effectiveStartDate }
                .thenBy { it.effectiveEndDate }
                .thenBy { it.safeTitle }
        )
    }

    // Build timeline items with TODAY Marker inserted at its exact chronological position
    val timelineItems = remember(sortedAllProjects, today) {
        val list = mutableListOf<TimelineFeedItem>()
        var todayInserted = false
        val activeCountToday = sortedAllProjects.count { it.isActiveOn(today) }

        for (p in sortedAllProjects) {
            val start = p.effectiveStartDate
            if (!todayInserted && (today.isBefore(start) || p.isActiveOn(today))) {
                list.add(TimelineFeedItem.TodayMarker(today, activeCountToday))
                todayInserted = true
            }
            list.add(TimelineFeedItem.ProjectEntry(p))
        }
        if (!todayInserted) {
            list.add(TimelineFeedItem.TodayMarker(today, activeCountToday))
        }
        list
    }

    val todayItemIndex = remember(timelineItems) {
        val idx = timelineItems.indexOfFirst { it is TimelineFeedItem.TodayMarker }
        if (idx >= 0) idx else 0
    }

    // Automatically center middle-align onto Today when switching to Timeline view
    LaunchedEffect(selectedViewMode, todayItemIndex) {
        if (selectedViewMode == "Timeline" && timelineItems.isNotEmpty()) {
            kotlinx.coroutines.delay(120)
            val viewportHeight = timelineListState.layoutInfo.viewportSize.height
            val centerOffset = if (viewportHeight > 0) -(viewportHeight / 3) else -300
            // Offset by +1 for the Info banner item (0)
            timelineListState.animateScrollToItem(
                index = (todayItemIndex + 1).coerceAtLeast(0),
                scrollOffset = centerOffset
            )
        }
    }

    val monthNames = listOf("", "January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December")
    val monthName = monthNames.getOrElse(calendarMonth) { "September" }

    Column(
        modifier = Modifier.fillMaxSize()
    ) {
        // 1. Fixed Header with Navigation Pill & View Mode Dropdown (Always visible at top)
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(bottom = 12.dp)
        ) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Column {
                    Text(
                        text = if (selectedViewMode == "Timeline") "Roadmap Timeline" else "Task Calendar",
                        fontSize = 18.sp,
                        fontWeight = FontWeight.Bold,
                        color = colors.textPrimary
                    )
                    Text(
                        text = when (selectedViewMode) {
                            "Week" -> selectedWeekDate.format(java.time.format.DateTimeFormatter.ofPattern("EEEE, d MMM yyyy"))
                            "Month" -> "$monthName $calendarYear"
                            else -> "${sortedAllProjects.size} Projects • Oldest to Newest"
                        },
                        fontSize = 12.sp,
                        color = colors.textSecondary
                    )
                }

                Row(
                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    // < Today > Navigation Pill
                    Surface(
                        color = if (colors.isDark) Color(0xFF1E293B) else Color(0xFFF1F5F9),
                        shape = RoundedCornerShape(20.dp),
                        border = androidx.compose.foundation.BorderStroke(1.dp, colors.border)
                    ) {
                        Row(
                            modifier = Modifier.padding(horizontal = 6.dp, vertical = 4.dp),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Icon(
                                Icons.Default.ChevronLeft,
                                contentDescription = "Previous",
                                tint = colors.textSecondary,
                                modifier = Modifier
                                    .size(18.dp)
                                    .clickable {
                                        when (selectedViewMode) {
                                            "Week" -> {
                                                if (selectedDayIndex > 0) {
                                                    selectedDayIndex--
                                                    coroutineScope.launch { weekScrollState.animateScrollToItem((selectedDayIndex - 2).coerceAtLeast(0)) }
                                                }
                                            }
                                            "Month" -> {
                                                if (calendarMonth > 1) calendarMonth-- else { calendarMonth = 12; calendarYear-- }
                                            }
                                            "Timeline" -> {
                                                coroutineScope.launch { timelineListState.animateScrollToItem(0) }
                                            }
                                        }
                                    }
                            )
                            Text(
                                text = "Today",
                                fontSize = 11.sp,
                                fontWeight = FontWeight.Bold,
                                color = colors.textPrimary,
                                modifier = Modifier
                                    .clickable {
                                        when (selectedViewMode) {
                                            "Week" -> {
                                                selectedDayIndex = 10
                                                coroutineScope.launch { weekScrollState.animateScrollToItem(8) }
                                            }
                                            "Month" -> {
                                                selectedMonthDay = today.dayOfMonth
                                                calendarMonth = today.monthValue
                                                calendarYear = today.year
                                            }
                                            "Timeline" -> {
                                                coroutineScope.launch {
                                                    val viewportHeight = timelineListState.layoutInfo.viewportSize.height
                                                    val centerOffset = if (viewportHeight > 0) -(viewportHeight / 3) else -300
                                                    timelineListState.animateScrollToItem(
                                                        index = (todayItemIndex + 1).coerceAtLeast(0),
                                                        scrollOffset = centerOffset
                                                    )
                                                }
                                            }
                                        }
                                    }
                                    .padding(horizontal = 6.dp)
                            )
                            Icon(
                                Icons.Default.ChevronRight,
                                contentDescription = "Next",
                                tint = colors.textSecondary,
                                modifier = Modifier
                                    .size(18.dp)
                                    .clickable {
                                        when (selectedViewMode) {
                                            "Week" -> {
                                                if (selectedDayIndex < scrollableWeekDays.lastIndex) {
                                                    selectedDayIndex++
                                                    coroutineScope.launch { weekScrollState.animateScrollToItem((selectedDayIndex - 2).coerceAtLeast(0)) }
                                                }
                                            }
                                            "Month" -> {
                                                if (calendarMonth < 12) calendarMonth++ else { calendarMonth = 1; calendarYear++ }
                                            }
                                            "Timeline" -> {
                                                coroutineScope.launch { timelineListState.animateScrollToItem((timelineItems.size).coerceAtLeast(0)) }
                                            }
                                        }
                                    }
                            )
                        }
                    }

                    // View Mode Dropdown Pill (Week / Month / Timeline)
                    Box {
                        Surface(
                            color = if (colors.isDark) Color(0xFF1E293B) else Color(0xFFF1F5F9),
                            shape = RoundedCornerShape(20.dp),
                            border = androidx.compose.foundation.BorderStroke(1.dp, colors.border),
                            modifier = Modifier.clickable { isViewModeMenuExpanded = true }
                        ) {
                            Row(
                                modifier = Modifier.padding(horizontal = 10.dp, vertical = 6.dp),
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Text(
                                    text = when (selectedViewMode) {
                                        "Timeline" -> "Timeline"
                                        "Month" -> "Month"
                                        else -> "Week"
                                    },
                                    fontSize = 11.sp,
                                    fontWeight = FontWeight.SemiBold,
                                    color = colors.textPrimary
                                )
                                Spacer(modifier = Modifier.width(4.dp))
                                Icon(
                                    Icons.Default.KeyboardArrowDown,
                                    contentDescription = "Change View Mode",
                                    tint = colors.textSecondary,
                                    modifier = Modifier.size(14.dp)
                                )
                            }
                        }

                        DropdownMenu(
                            expanded = isViewModeMenuExpanded,
                            onDismissRequest = { isViewModeMenuExpanded = false }
                        ) {
                            DropdownMenuItem(
                                text = { Text("Week View", fontSize = 12.sp, fontWeight = if (selectedViewMode == "Week") FontWeight.Bold else FontWeight.Normal) },
                                onClick = {
                                    selectedViewMode = "Week"
                                    isViewModeMenuExpanded = false
                                }
                            )
                            DropdownMenuItem(
                                text = { Text("Month View", fontSize = 12.sp, fontWeight = if (selectedViewMode == "Month") FontWeight.Bold else FontWeight.Normal) },
                                onClick = {
                                    selectedViewMode = "Month"
                                    isViewModeMenuExpanded = false
                                }
                            )
                            DropdownMenuItem(
                                text = { Text("Timeline (All Projects)", fontSize = 12.sp, fontWeight = if (selectedViewMode == "Timeline") FontWeight.Bold else FontWeight.Normal) },
                                onClick = {
                                    selectedViewMode = "Timeline"
                                    isViewModeMenuExpanded = false
                                }
                            )
                        }
                    }
                }
            }
        }

        // 2. Scrollable Content Area
        LazyColumn(
            state = timelineListState,
            modifier = Modifier
                .fillMaxWidth()
                .weight(1f),
            verticalArrangement = Arrangement.spacedBy(14.dp)
        ) {

        if (selectedViewMode != "Timeline") {
            // 2. Calendar Display (Scrollable Week Strip OR Full Interactive Month Grid)
            item {
                if (selectedViewMode == "Week") {
                    // Horizontal Scrollable Week Days Strip
                    Surface(
                        color = if (colors.isDark) Color(0xFF1E293B) else Color(0xFFF8FAFC),
                        shape = RoundedCornerShape(16.dp),
                        border = androidx.compose.foundation.BorderStroke(1.dp, colors.border),
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        LazyRow(
                            state = weekScrollState,
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(horizontal = 8.dp, vertical = 10.dp),
                            horizontalArrangement = Arrangement.spacedBy(8.dp),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            items(scrollableWeekDays.size) { index ->
                                val day = scrollableWeekDays[index]
                                val isSelected = index == selectedDayIndex
                                val isToday = day.isToday
                                val dayDate = today.plusDays((index - 10).toLong())
                                val dayHasTasks = projects.any { it.isActiveOn(dayDate) }

                                val pillBg = if (isSelected) (if (colors.isMonochrome) Color(0xFF18181B) else colors.primary)
                                             else if (isToday) (if (colors.isMonochrome) Color(0xFFF4F4F5) else colors.primary.copy(alpha = 0.12f))
                                             else Color.Transparent
                                val fgColor = if (isSelected) Color.White else if (isToday) colors.primary else colors.textPrimary

                                Surface(
                                    color = pillBg,
                                    shape = RoundedCornerShape(12.dp),
                                    border = if (!isSelected && isToday) androidx.compose.foundation.BorderStroke(1.5.dp, colors.primary)
                                             else if (!isSelected) androidx.compose.foundation.BorderStroke(0.5.dp, colors.border.copy(alpha = 0.5f))
                                             else null,
                                    modifier = Modifier
                                        .width(52.dp)
                                        .clickable { selectedDayIndex = index }
                                ) {
                                    Column(
                                        horizontalAlignment = Alignment.CenterHorizontally,
                                        modifier = Modifier.padding(vertical = 6.dp)
                                    ) {
                                        if (isToday) {
                                            Box(
                                                modifier = Modifier
                                                    .clip(RoundedCornerShape(4.dp))
                                                    .background(if (isSelected) Color.White.copy(alpha = 0.25f) else colors.primary)
                                                    .padding(horizontal = 4.dp, vertical = 1.dp)
                                            ) {
                                                Text(
                                                    text = "TODAY",
                                                    fontSize = 7.5.sp,
                                                    fontWeight = FontWeight.ExtraBold,
                                                    color = Color.White
                                                )
                                            }
                                            Spacer(modifier = Modifier.height(2.dp))
                                        } else {
                                            Text(
                                                text = day.dayLetter,
                                                fontSize = 10.sp,
                                                color = if (isSelected) Color.White.copy(alpha = 0.8f) else colors.textMuted,
                                                fontWeight = FontWeight.Medium
                                            )
                                            Spacer(modifier = Modifier.height(2.dp))
                                        }

                                        Text(
                                            text = day.dayNumber,
                                            fontSize = 13.sp,
                                            fontWeight = if (isSelected || isToday) FontWeight.Bold else FontWeight.Normal,
                                            color = fgColor
                                        )
                                        Spacer(modifier = Modifier.height(3.dp))
                                        Box(
                                            modifier = Modifier
                                                .size(5.dp)
                                                .clip(CircleShape)
                                                .background(
                                                    if (isSelected) Color.White
                                                    else if (dayHasTasks) (if (colors.isMonochrome) Color(0xFF18181B) else SshSuccessGreen)
                                                    else Color.Transparent
                                                )
                                        )
                                    }
                                }
                            }
                        }
                    }
                } else {
                    // Full Month Calendar Grid (7 Columns)
                    Surface(
                        color = if (colors.isDark) Color(0xFF1E293B) else Color(0xFFF8FAFC),
                        shape = RoundedCornerShape(16.dp),
                        border = androidx.compose.foundation.BorderStroke(1.dp, colors.border),
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Column(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(12.dp)
                        ) {
                            // Weekday Headers (Sun to Sat)
                            val weekdays = listOf("Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat")
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.SpaceAround
                            ) {
                                weekdays.forEach { wd ->
                                    Text(
                                        text = wd,
                                        fontSize = 11.sp,
                                        fontWeight = FontWeight.Bold,
                                        color = colors.textMuted,
                                        textAlign = androidx.compose.ui.text.style.TextAlign.Center,
                                        modifier = Modifier.weight(1f)
                                    )
                                }
                            }

                            Spacer(modifier = Modifier.height(8.dp))

                            // Month Grid Days dynamically calculated
                            val firstOfMonth = java.time.LocalDate.of(calendarYear, calendarMonth, 1)
                            val daysInMonth = firstOfMonth.lengthOfMonth()
                            val startOffset = firstOfMonth.dayOfWeek.value % 7 // 7 -> 0 (Sunday)
                            val totalCells = startOffset + daysInMonth
                            val numRows = (totalCells + 6) / 7

                            for (r in 0 until numRows) {
                                Row(
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .padding(vertical = 2.dp),
                                    horizontalArrangement = Arrangement.SpaceAround
                                ) {
                                    for (c in 0 until 7) {
                                        val cellIndex = r * 7 + c
                                        val dayNum = cellIndex - startOffset + 1
                                        if (dayNum in 1..daysInMonth) {
                                            val isSelected = dayNum == selectedMonthDay
                                            val isToday = dayNum == today.dayOfMonth && calendarMonth == today.monthValue && calendarYear == today.year
                                            val cellDate = try { java.time.LocalDate.of(calendarYear, calendarMonth, dayNum) } catch (e: Exception) { null }
                                            val hasTasks = cellDate != null && projects.any { it.isActiveOn(cellDate) }

                                            Box(
                                                modifier = Modifier
                                                    .weight(1f)
                                                    .aspectRatio(1f)
                                                    .padding(2.dp)
                                                    .clip(RoundedCornerShape(8.dp))
                                                    .background(
                                                        if (isSelected) (if (colors.isMonochrome) Color(0xFF18181B) else colors.primary)
                                                        else if (isToday) (if (colors.isMonochrome) Color(0xFFF4F4F5) else colors.primary.copy(alpha = 0.12f))
                                                        else Color.Transparent
                                                    )
                                                    .border(
                                                        if (!isSelected && isToday) 1.5.dp else 0.dp,
                                                        if (!isSelected && isToday) colors.primary else Color.Transparent,
                                                        RoundedCornerShape(8.dp)
                                                    )
                                                    .clickable { selectedMonthDay = dayNum },
                                                contentAlignment = Alignment.Center
                                            ) {
                                                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                                                    Text(
                                                        text = dayNum.toString(),
                                                        fontSize = 11.sp,
                                                        fontWeight = if (isSelected || isToday) FontWeight.Bold else FontWeight.Normal,
                                                        color = if (isSelected) Color.White else if (isToday) colors.primary else colors.textPrimary
                                                    )
                                                    if (hasTasks) {
                                                        Spacer(modifier = Modifier.height(2.dp))
                                                        Box(
                                                            modifier = Modifier
                                                                .size(4.dp)
                                                                .clip(CircleShape)
                                                                .background(if (isSelected) Color.White else if (colors.isMonochrome) Color(0xFF18181B) else SshSuccessGreen)
                                                        )
                                                    }
                                                }
                                            }
                                        } else {
                                            Spacer(modifier = Modifier.weight(1f))
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }

            // 3. Project Cards Stack (Same card style as Timeline View, minus left timeline track)
            if (activeProjectsForDate.isEmpty()) {
                item {
                    val formattedSelectedDate = if (selectedViewMode == "Week") {
                        selectedWeekDate.format(java.time.format.DateTimeFormatter.ofPattern("EEEE, d MMMM yyyy"))
                    } else {
                        selectedMonthDate.format(java.time.format.DateTimeFormatter.ofPattern("EEEE, d MMMM yyyy"))
                    }

                    FluentCard(
                        cornerRadius = 16.dp,
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(vertical = 12.dp)
                    ) {
                        Column(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(28.dp),
                            horizontalAlignment = Alignment.CenterHorizontally
                        ) {
                            Box(
                                modifier = Modifier
                                    .size(48.dp)
                                    .clip(CircleShape)
                                    .background(colors.border.copy(alpha = 0.5f)),
                                contentAlignment = Alignment.Center
                            ) {
                                Icon(
                                    Icons.Default.DateRange,
                                    contentDescription = null,
                                    tint = colors.textMuted,
                                    modifier = Modifier.size(24.dp)
                                )
                            }
                            Spacer(modifier = Modifier.height(12.dp))
                            Text(
                                text = "No Tasks Scheduled",
                                fontSize = 15.sp,
                                fontWeight = FontWeight.Bold,
                                color = colors.textPrimary
                            )
                            Spacer(modifier = Modifier.height(4.dp))
                            Text(
                                text = "No deliverables are active on $formattedSelectedDate",
                                fontSize = 12.sp,
                                color = colors.textSecondary,
                                textAlign = androidx.compose.ui.text.style.TextAlign.Center
                            )
                            Spacer(modifier = Modifier.height(8.dp))
                            Text(
                                text = "Switch to Timeline View to see all projects stacked from oldest to newest.",
                                fontSize = 11.sp,
                                color = colors.textMuted,
                                textAlign = androidx.compose.ui.text.style.TextAlign.Center
                            )
                        }
                    }
                }
            } else {
                items(activeProjectsForDate.size) { idx ->
                    val project = activeProjectsForDate[idx]
                    VerticalTimelineProjectCard(
                        project = project,
                        isTodayActive = project.isActiveOn(today),
                        colors = colors,
                        showTimelineTrack = false,
                        onClick = { onProjectClick(project) }
                    )
                }
            }
        } else {
            // 4. ALL PROJECTS VERTICAL TIMELINE STACK VIEW (Sorted Old to New, Centered on Today)
            item {
                Surface(
                    color = if (colors.isDark) Color(0xFF1E293B) else Color(0xFFF1F5F9),
                    shape = RoundedCornerShape(12.dp),
                    border = BorderStroke(1.dp, colors.border.copy(alpha = 0.6f)),
                    modifier = Modifier.fillMaxWidth().padding(vertical = 4.dp)
                ) {
                    Row(
                        modifier = Modifier.padding(horizontal = 14.dp, vertical = 8.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Icon(Icons.Default.SwapVert, contentDescription = null, tint = colors.primary, modifier = Modifier.size(16.dp))
                        Spacer(modifier = Modifier.width(8.dp))
                        Text(
                            text = "All projects stacked chronologically (old to new). Centered on today.",
                            fontSize = 11.5.sp,
                            color = colors.textSecondary
                        )
                    }
                }
            }

            items(timelineItems.size) { index ->
                when (val feedItem = timelineItems[index]) {
                    is TimelineFeedItem.TodayMarker -> {
                        VerticalTimelineTodayMarker(
                            date = feedItem.date,
                            activeCount = feedItem.activeCount,
                            colors = colors
                        )
                    }
                    is TimelineFeedItem.ProjectEntry -> {
                        VerticalTimelineProjectCard(
                            project = feedItem.project,
                            isTodayActive = feedItem.project.isActiveOn(today),
                            colors = colors,
                            showTimelineTrack = true,
                            onClick = { onProjectClick(feedItem.project) }
                        )
                    }
                }
            }
        }

        item {
            Spacer(modifier = Modifier.height(70.dp))
        }
    }
}
}

/**
 * Visual Today Marker Banner for the Vertical Timeline View
 */
@Composable
fun VerticalTimelineTodayMarker(
    date: java.time.LocalDate,
    activeCount: Int,
    colors: SscamColors
) {
    val formattedDate = date.format(java.time.format.DateTimeFormatter.ofPattern("EEEE, d MMMM yyyy"))

    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(vertical = 6.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        // Left Track Node: Glowing Today Indicator
        Column(
            horizontalAlignment = Alignment.CenterHorizontally,
            modifier = Modifier.width(36.dp)
        ) {
            Box(
                modifier = Modifier
                    .size(18.dp)
                    .clip(CircleShape)
                    .background(colors.primary.copy(alpha = 0.2f)),
                contentAlignment = Alignment.Center
            ) {
                Box(
                    modifier = Modifier
                        .size(10.dp)
                        .clip(CircleShape)
                        .background(colors.primary)
                )
            }
        }

        // Today Marker Card
        Surface(
            color = if (colors.isDark) Color(0xFF0F2744) else Color(0xFFEFF6FF),
            shape = RoundedCornerShape(14.dp),
            border = BorderStroke(2.dp, colors.primary),
            shadowElevation = 4.dp,
            modifier = Modifier.fillMaxWidth()
        ) {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 14.dp, vertical = 10.dp),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Box(
                        modifier = Modifier
                            .clip(RoundedCornerShape(6.dp))
                            .background(colors.primary)
                            .padding(horizontal = 6.dp, vertical = 2.dp)
                    ) {
                        Text(
                            text = "TODAY",
                            fontSize = 9.sp,
                            fontWeight = FontWeight.ExtraBold,
                            color = Color.White
                        )
                    }
                    Spacer(modifier = Modifier.width(10.dp))
                    Column {
                        Text(
                            text = "Current Date",
                            fontSize = 10.sp,
                            fontWeight = FontWeight.SemiBold,
                            color = colors.primary
                        )
                        Text(
                            text = formattedDate,
                            fontSize = 12.sp,
                            fontWeight = FontWeight.Bold,
                            color = colors.textPrimary
                        )
                    }
                }

                Surface(
                    color = if (activeCount > 0) colors.primary else colors.border,
                    shape = RoundedCornerShape(12.dp)
                ) {
                    Text(
                        text = if (activeCount > 0) "$activeCount Active" else "0 Active",
                        fontSize = 10.sp,
                        fontWeight = FontWeight.Bold,
                        color = Color.White,
                        modifier = Modifier.padding(horizontal = 8.dp, vertical = 3.dp)
                    )
                }
            }
        }
    }
}

/**
 * High-fidelity Project Card for Week, Month, and Timeline Views
 * Consistent Fluent design across all 3 views.
 * When showTimelineTrack = true, renders left rail line and node.
 * When showTimelineTrack = false, renders clean full-width card.
 */
@Composable
fun VerticalTimelineProjectCard(
    project: ProjectItem,
    isTodayActive: Boolean,
    colors: SscamColors,
    showTimelineTrack: Boolean = true,
    onClick: () -> Unit
) {
    val statusColor = when (project.normalizedStatus) {
        "done" -> Color(0xFF10B981) // Green
        "in_review" -> Color(0xFFF59E0B) // Amber
        "in_progress" -> Color(0xFF0078D4) // Blue
        "revision" -> Color(0xFFD97706) // Orange
        else -> Color(0xFF64748B) // Slate
    }

    val priorityText = when (project.safePriority.lowercase().trim()) {
        "urgent" -> "P3"
        "high" -> "P2"
        "medium", "standard" -> "P1"
        else -> ""
    }
    val priorityColor = when (project.safePriority.lowercase().trim()) {
        "urgent" -> Color(0xFFEF4444)
        "high" -> Color(0xFFF59E0B)
        "medium", "standard" -> Color(0xFF0078D4)
        else -> Color(0xFF64748B)
    }

    val startDateStr = project.parsedCreatedDate?.format(java.time.format.DateTimeFormatter.ofPattern("dd MMM yyyy")) ?: project.formattedCreated
    val deadlineStr = project.parsedDeadlineDate?.format(java.time.format.DateTimeFormatter.ofPattern("dd MMM yyyy")) ?: project.formattedDeadline
    val dateRangeText = "$startDateStr  →  $deadlineStr"

    val cardSurface = @Composable {
        Surface(
            color = if (colors.isDark) Color(0xFF1E293B) else Color(0xFFF8FAFC),
            shape = RoundedCornerShape(14.dp),
            border = BorderStroke(
                if (isTodayActive) 1.5.dp else 1.dp,
                if (isTodayActive) colors.primary else colors.border
            ),
            shadowElevation = if (isTodayActive) 2.dp else 1.dp,
            modifier = Modifier
                .fillMaxWidth()
                .clickable { onClick() }
        ) {
            Column(modifier = Modifier.padding(14.dp)) {
                // Row 1: Date Range & Badges
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Icon(
                            Icons.Default.DateRange,
                            contentDescription = null,
                            tint = colors.textMuted,
                            modifier = Modifier.size(12.dp)
                        )
                        Spacer(modifier = Modifier.width(4.dp))
                        Text(
                            text = dateRangeText,
                            fontSize = 11.sp,
                            fontWeight = FontWeight.Medium,
                            color = colors.textSecondary
                        )
                    }

                    Row(horizontalArrangement = Arrangement.spacedBy(4.dp)) {
                        if (isTodayActive) {
                            Surface(
                                color = colors.primary.copy(alpha = 0.15f),
                                shape = RoundedCornerShape(6.dp)
                            ) {
                                Text(
                                    text = "ACTIVE",
                                    fontSize = 9.sp,
                                    fontWeight = FontWeight.ExtraBold,
                                    color = colors.primary,
                                    modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp)
                                )
                            }
                        }
                        if (priorityText.isNotBlank()) {
                            Surface(
                                color = priorityColor,
                                shape = RoundedCornerShape(6.dp)
                            ) {
                                Text(
                                    text = priorityText,
                                    fontSize = 9.sp,
                                    fontWeight = FontWeight.ExtraBold,
                                    color = Color.White,
                                    modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp)
                                )
                            }
                        }
                    }
                }

                Spacer(modifier = Modifier.height(6.dp))

                // Project Title
                Text(
                    text = project.safeTitle,
                    fontSize = 13.5.sp,
                    fontWeight = FontWeight.Bold,
                    color = colors.textPrimary,
                    maxLines = 2
                )

                Spacer(modifier = Modifier.height(8.dp))

                // Meta Footer (Designer, Brand, Status)
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Box(
                            modifier = Modifier
                                .size(20.dp)
                                .clip(CircleShape)
                                .background(colors.primary.copy(alpha = 0.15f)),
                            contentAlignment = Alignment.Center
                        ) {
                            Text(
                                text = project.safeDesigner.take(1).uppercase(),
                                fontSize = 10.sp,
                                fontWeight = FontWeight.Bold,
                                color = colors.primary
                            )
                        }
                        Spacer(modifier = Modifier.width(6.dp))
                        Text(
                            text = "${project.safeDesigner} • ${project.safeBrand}",
                            fontSize = 11.sp,
                            color = colors.textSecondary
                        )
                    }

                    // Status Pill
                    Surface(
                        color = statusColor.copy(alpha = 0.15f),
                        shape = RoundedCornerShape(8.dp)
                    ) {
                        Text(
                            text = when (project.normalizedStatus) {
                                "done" -> "Completed"
                                "in_review" -> "In Review"
                                "in_progress" -> "In Progress"
                                "revision" -> "Revision"
                                else -> "Backlog"
                            },
                            fontSize = 10.sp,
                            fontWeight = FontWeight.SemiBold,
                            color = statusColor,
                            modifier = Modifier.padding(horizontal = 7.dp, vertical = 3.dp)
                        )
                    }
                }
            }
        }
    }

    if (showTimelineTrack) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(vertical = 4.dp),
            verticalAlignment = Alignment.Top
        ) {
            // Left Track Node and Line
            Column(
                horizontalAlignment = Alignment.CenterHorizontally,
                modifier = Modifier
                    .width(36.dp)
                    .padding(top = 16.dp)
            ) {
                Box(
                    modifier = Modifier
                        .size(12.dp)
                        .clip(CircleShape)
                        .background(statusColor)
                )
                Box(
                    modifier = Modifier
                        .width(2.dp)
                        .height(90.dp)
                        .background(colors.border.copy(alpha = 0.6f))
                )
            }

            cardSurface()
        }
    } else {
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .padding(vertical = 2.dp)
        ) {
            cardSurface()
        }
    }
}
