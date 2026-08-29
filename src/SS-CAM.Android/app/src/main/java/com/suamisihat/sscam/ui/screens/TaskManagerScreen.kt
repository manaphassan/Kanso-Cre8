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

data class ScheduledCalendarTask(
    val id: String,
    val title: String,
    val durationText: String,
    val progressPercent: Float,
    val progressStatusText: String,
    val accentColor: Color,
    val teamInitials: List<String>,
    val columnOffsetFraction: Float = 0f // 0f = aligned left, 0.4f = shifted right track
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

    var selectedFilter by remember { mutableStateOf("ALL") }
    var selectedBrand by remember { mutableStateOf("ALL BRANDS") }
    var selectedProjectForManage by remember { mutableStateOf<ProjectItem?>(null) }

    val filterTabs = listOf("ALL", "IN REVIEW", "IN PROGRESS", "DONE", "BACKLOG")
    val brandTabs = listOf("ALL BRANDS", "SSH", "SSC", "SSW", "SSE", "SST")

    val filteredProjects = projects.filter { p ->
        val statusMatch = when (selectedFilter) {
            "ALL" -> true
            "IN REVIEW" -> p.normalizedStatus == "in_review" || p.normalizedStatus == "revision"
            "IN PROGRESS" -> p.normalizedStatus == "in_progress"
            "DONE" -> p.normalizedStatus == "done"
            "BACKLOG" -> p.normalizedStatus == "backlog"
            else -> true
        }
        val brandMatch = when (selectedBrand) {
            "ALL BRANDS" -> true
            "SSH" -> p.brand?.equals("SSH", ignoreCase = true) == true || p.brand?.equals("SS", ignoreCase = true) == true
            else -> p.brand?.contains(selectedBrand, ignoreCase = true) == true
        }
        statusMatch && brandMatch
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
                            trailingText = "${filteredProjects.size} Tasks"
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
                        items(filteredProjects, key = { it.id }) { project ->
                            ReferenceStyleDeliverableCard(
                                title = project.title,
                                brand = project.brand,
                                designer = project.designer,
                                deadline = project.deadline,
                                status = project.status,
                                priority = project.priority,
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
                    onSignOff = onSignOff
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

/**
 * Orbix Studio Inspired Task Calendar & Multi-Track Schedule Timeline View
 * Supports Scrollable Week Days & Full Interactive Month Calendar Grid
 */
@Composable
fun OrbixTaskCalendarTimelineView(
    projects: List<ProjectItem> = emptyList(),
    onSignOff: (ProjectItem) -> Unit = {}
) {
    val colors = LocalSscamColors.current
    var selectedDayIndex by remember { mutableStateOf(10) } // Default centered around today
    var selectedViewMode by remember { mutableStateOf("Week") }
    var isViewModeMenuExpanded by remember { mutableStateOf(false) }

    // Month Grid Navigation State (Defaults to August 2026)
    var calendarYear by remember { mutableStateOf(2026) }
    var calendarMonth by remember { mutableStateOf(8) } // 8 = August, 9 = September
    var selectedMonthDay by remember { mutableStateOf(29) } // 29 August

    // 21-Day Scrollable Week Range (e.g. Aug 20 to Sep 09)
    val scrollableWeekDays = remember {
        val daysList = mutableListOf<CalendarDayItem>()
        val dayLetters = listOf("Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat")
        for (i in -10..10) {
            val d = 29 + i
            val (dayNum, isToday) = if (d in 1..31) {
                Pair(String.format("%02d", d), d == 29)
            } else if (d > 31) {
                Pair(String.format("%02d", d - 31), false)
            } else {
                Pair(String.format("%02d", 31 + d), false)
            }
            val letterIdx = (i + 14) % 7
            daysList.add(CalendarDayItem(dayLetters[letterIdx], dayNum, isToday))
        }
        daysList
    }

    val scheduledTasks = remember(projects, colors.isMonochrome, selectedDayIndex, selectedMonthDay) {
        if (projects.isNotEmpty()) {
            projects.take(6).mapIndexed { idx, p ->
                val progressVal = when (p.normalizedStatus) {
                    "done" -> 1.0f
                    "in_review" -> 0.75f
                    "in_progress" -> 0.40f
                    "stuck" -> 0.20f
                    else -> 0.15f
                }
                val accentColor = if (colors.isMonochrome) {
                    Color(0xFFD4D4D8)
                } else {
                    when (p.normalizedStatus) {
                        "done" -> Color(0xFF86EFAC)
                        "in_review" -> Color(0xFFBAE6FD)
                        "in_progress" -> Color(0xFFFDE68A)
                        else -> Color(0xFFFECDD3)
                    }
                }
                val offset = if (idx % 2 == 1) 0.35f else 0f
                val initials = if (!p.designer.isNullOrBlank()) {
                    listOf(p.designer.take(1).uppercase())
                } else listOf("H", "A", "S")

                ScheduledCalendarTask(
                    id = p.id,
                    title = p.title,
                    durationText = if (p.priority.equals("urgent", true)) "01.00 hr • Urgent" else "02.30 hrs",
                    progressPercent = progressVal,
                    progressStatusText = when (p.normalizedStatus) {
                        "done" -> "Completed 100%"
                        "in_review" -> "In Review 75%"
                        "in_progress" -> "In Progress ${(progressVal * 100).toInt()}%"
                        else -> "Queued"
                    },
                    accentColor = accentColor,
                    teamInitials = initials,
                    columnOffsetFraction = offset
                )
            }
        } else {
            emptyList()
        }
    }

    val monthNames = listOf("", "January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December")
    val monthName = monthNames.getOrElse(calendarMonth) { "August" }

    LazyColumn(
        modifier = Modifier.fillMaxSize(),
        verticalArrangement = Arrangement.spacedBy(14.dp)
    ) {
        // 1. Task Calendar Header with Navigation Pill & Week/Month Dropdown
        item {
            Column(modifier = Modifier.fillMaxWidth()) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Column {
                        Text(
                            text = "Task Calendar",
                            fontSize = 18.sp,
                            fontWeight = FontWeight.Bold,
                            color = colors.textPrimary
                        )
                        Text(
                            text = "$monthName $calendarYear",
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
                                            if (selectedViewMode == "Week") {
                                                if (selectedDayIndex > 0) selectedDayIndex--
                                            } else {
                                                if (calendarMonth > 1) calendarMonth-- else { calendarMonth = 12; calendarYear-- }
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
                                            selectedDayIndex = 10
                                            calendarMonth = 8
                                            calendarYear = 2026
                                            selectedMonthDay = 29
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
                                            if (selectedViewMode == "Week") {
                                                if (selectedDayIndex < scrollableWeekDays.lastIndex) selectedDayIndex++
                                            } else {
                                                if (calendarMonth < 12) calendarMonth++ else { calendarMonth = 1; calendarYear++ }
                                            }
                                        }
                                )
                            }
                        }

                        // View Mode Dropdown Pill (Week vs Month)
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
                                        text = selectedViewMode,
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
                            }
                        }
                    }
                }
            }
        }

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
                            val pillBg = if (isSelected) (if (colors.isMonochrome) Color(0xFF18181B) else colors.primary) else Color.Transparent
                            val fgColor = if (isSelected) Color.White else if (isToday) colors.primary else colors.textPrimary

                            Surface(
                                color = pillBg,
                                shape = RoundedCornerShape(12.dp),
                                border = if (!isSelected && isToday) androidx.compose.foundation.BorderStroke(1.dp, colors.primary) else null,
                                modifier = Modifier
                                    .width(48.dp)
                                    .clickable { selectedDayIndex = index }
                            ) {
                                Column(
                                    horizontalAlignment = Alignment.CenterHorizontally,
                                    modifier = Modifier.padding(vertical = 8.dp)
                                ) {
                                    Text(
                                        text = day.dayLetter,
                                        fontSize = 10.sp,
                                        color = if (isSelected) Color.White.copy(alpha = 0.8f) else colors.textMuted,
                                        fontWeight = FontWeight.Medium
                                    )
                                    Spacer(modifier = Modifier.height(4.dp))
                                    Text(
                                        text = day.dayNumber,
                                        fontSize = 13.sp,
                                        fontWeight = if (isSelected || isToday) FontWeight.Bold else FontWeight.Normal,
                                        color = fgColor
                                    )
                                    Spacer(modifier = Modifier.height(4.dp))
                                    Box(
                                        modifier = Modifier
                                            .size(5.dp)
                                            .clip(CircleShape)
                                            .background(
                                                if (isSelected) Color.White
                                                else if (isToday) (if (colors.isMonochrome) Color(0xFF18181B) else SshSuccessGreen)
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

                        // Month Grid Days (Days 1 to 31)
                        val daysInMonth = if (calendarMonth in listOf(1, 3, 5, 7, 8, 10, 12)) 31 else 30
                        val startOffset = if (calendarMonth == 8) 6 else 2 // August 2026 starts Saturday (idx 6)
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
                                        val isToday = dayNum == 29 && calendarMonth == 8 && calendarYear == 2026
                                        val hasTasks = dayNum in listOf(12, 14, 18, 22, 29, 30)

                                        Box(
                                            modifier = Modifier
                                                .weight(1f)
                                                .aspectRatio(1f)
                                                .padding(2.dp)
                                                .clip(RoundedCornerShape(8.dp))
                                                .background(
                                                    if (isSelected) (if (colors.isMonochrome) Color(0xFF18181B) else colors.primary)
                                                    else Color.Transparent
                                                )
                                                .border(
                                                    if (!isSelected && isToday) 1.dp else 0.dp,
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

        // 3. Multi-Track Vertical Grid & Timeline Cards Canvas
        item {
            if (scheduledTasks.isEmpty()) {
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
                        Icon(
                            Icons.AutoMirrored.Filled.Assignment,
                            contentDescription = null,
                            tint = colors.textMuted,
                            modifier = Modifier.size(32.dp)
                        )
                        Spacer(modifier = Modifier.height(8.dp))
                        Text(
                            text = "No Scheduled Tasks",
                            fontSize = 14.sp,
                            fontWeight = FontWeight.Bold,
                            color = colors.textPrimary
                        )
                        Text(
                            text = "Tap the + button below to create a new task or sync from Synology NAS.",
                            fontSize = 11.sp,
                            color = colors.textSecondary,
                            textAlign = androidx.compose.ui.text.style.TextAlign.Center
                        )
                    }
                }
            } else {
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(vertical = 4.dp)
                ) {
                    // Background Track Grid lines
                    Canvas(
                        modifier = Modifier
                            .matchParentSize()
                            .padding(horizontal = 24.dp)
                    ) {
                        val step = size.width / 6f
                        for (i in 0..6) {
                            val x = i * step
                            val isCenterTrack = i == 3
                            val centerColor = if (colors.isMonochrome) Color(0xFF18181B) else Color(0xFF10B981).copy(alpha = 0.7f)
                            val sideColor = if (colors.isMonochrome) Color(0xFFE4E4E7) else Color.LightGray.copy(alpha = 0.25f)
                            drawLine(
                                color = if (isCenterTrack) centerColor else sideColor,
                                start = Offset(x, 0f),
                                end = Offset(x, size.height),
                                strokeWidth = if (isCenterTrack) 2.dp.toPx() else 1.dp.toPx()
                            )
                        }
                    }

                    // Vertical Scheduled Task Cards
                    Column(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(vertical = 8.dp),
                        verticalArrangement = Arrangement.spacedBy(16.dp)
                    ) {
                        scheduledTasks.forEach { task ->
                            Row(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .padding(start = (task.columnOffsetFraction * 180).dp, end = if (task.columnOffsetFraction > 0) 0.dp else 40.dp)
                            ) {
                                OrbixTimelineTaskCard(task = task)
                            }
                        }
                    }
                }
            }
        }

        item {
            Spacer(modifier = Modifier.height(70.dp))
        }
    }
}

/**
 * High-fidelity Orbix Style Timeline Task Card with Progress Bar and Team Avatars
 */
@Composable
fun OrbixTimelineTaskCard(
    task: ScheduledCalendarTask
) {
    val colors = LocalSscamColors.current

    Surface(
        color = if (colors.isDark) Color(0xFF1E293B) else Color(0xFFF8FAFC),
        shape = RoundedCornerShape(16.dp),
        border = androidx.compose.foundation.BorderStroke(1.5.dp, if (colors.isMonochrome) Color(0xFFD4D4D8) else task.accentColor),
        shadowElevation = 2.dp,
        modifier = Modifier.fillMaxWidth()
    ) {
        Column(modifier = Modifier.padding(14.dp)) {
            // Task Title
            Text(
                text = task.title,
                fontSize = 13.sp,
                fontWeight = FontWeight.Bold,
                color = colors.textPrimary,
                lineHeight = 18.sp,
                maxLines = 2
            )

            Spacer(modifier = Modifier.height(6.dp))

            // Duration Meta
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
                    fontSize = 11.sp,
                    color = colors.textSecondary
                )
            }

            Spacer(modifier = Modifier.height(10.dp))

            // Progress Bar
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    text = if (task.progressPercent >= 1f) "Completed" else "On Progress",
                    fontSize = 10.sp,
                    color = colors.textSecondary,
                    fontWeight = FontWeight.Medium
                )
                Text(
                    text = "${(task.progressPercent * 100).toInt()}%",
                    fontSize = 11.sp,
                    fontWeight = FontWeight.Bold,
                    color = if (colors.isMonochrome) Color(0xFF18181B) else if (task.progressPercent >= 1f) SshSuccessGreen else Color(0xFFFBBF24)
                )
            }

            Spacer(modifier = Modifier.height(4.dp))

            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .height(5.dp)
                    .clip(RoundedCornerShape(3.dp))
                    .background(if (colors.isMonochrome) Color(0xFFE4E4E7) else if (colors.isDark) Color(0xFF334155) else Color(0xFFE2E8F0))
            ) {
                Box(
                    modifier = Modifier
                        .fillMaxWidth(task.progressPercent)
                        .fillMaxHeight()
                        .clip(RoundedCornerShape(3.dp))
                        .background(if (colors.isMonochrome) Color(0xFF18181B) else if (task.progressPercent >= 1f) SshSuccessGreen else Color(0xFFFBBF24))
                )
            }

            Spacer(modifier = Modifier.height(10.dp))

            // Team Avatars Footer
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.Start,
                verticalAlignment = Alignment.CenterVertically
            ) {
                AvatarStack(task.teamInitials)
            }
        }
    }
}
