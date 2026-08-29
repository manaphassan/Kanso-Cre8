package com.suamisihat.sscam.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.InsertDriveFile
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.suamisihat.sscam.data.models.ProjectItem
import com.suamisihat.sscam.ui.theme.*

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ManageProjectBottomSheet(
    project: ProjectItem,
    onDismiss: () -> Unit,
    onUpdateStatus: (newStatus: String) -> Unit = {},
    onSaveReadme: (newReadme: String) -> Unit = {}
) {
    val colors = LocalSscamColors.current
    var selectedTab by remember { mutableStateOf(0) } // 0: Overview & Status, 1: Project README, 2: Deliverables
    val drawerTabs = listOf("STATUS & INFO", "README.MD", "DELIVERABLES")

    val safeTitle = project.title.ifBlank { "Untitled Project" }
    val safeBrand = project.brand.ifBlank { "SSH" }
    val safeDesigner = project.designer.ifBlank { "Unassigned" }
    val safeClient = project.client.ifBlank { "Internal" }
    val safePriority = project.priority.ifBlank { "standard" }

    var currentStatus by remember { mutableStateOf(project.normalizedStatus) }
    var readmeText by remember {
        mutableStateOf(
            "# $safeTitle\n\n" +
            "**Brand:** $safeBrand | **Client:** $safeClient\n" +
            "**Designer:** $safeDesigner | **Priority:** $safePriority\n\n" +
            "### Creative Deliverables Checklist\n" +
            "- [x] 01_Main_KeyVisual_1080x1350.png\n" +
            "- [ ] 02_Video_Hook_9x16.mp4\n" +
            "- [ ] 03_Carousel_Ad_Set_01-05.png\n\n" +
            "### Creative Brief & Copy Hook\n" +
            "> \"Tingkatkan stamina & tenaga harian secara semulajadi bersama formula premium SuamiSihat.\"\n\n" +
            "### Storage & NAS Path\n" +
            "`/volume1/SS_Cam_Storage/Projects/${safeBrand}_${safeTitle.replace(" ", "_")}`\n"
        )
    }

    val availableStatuses = listOf(
        Triple("in_progress", "In Progress", Color(0xFFFBBF24)),
        Triple("in_review", "In Review", SshAzure),
        Triple("revision", "Revision", Color(0xFFF97316)),
        Triple("done", "Completed", SshSuccessGreen),
        Triple("stuck", "Stuck / Urgent", Color(0xFFEF4444)),
        Triple("queued", "Queued", Color(0xFF64748B))
    )

    val sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true)

    ModalBottomSheet(
        onDismissRequest = onDismiss,
        sheetState = sheetState,
        containerColor = colors.card,
        dragHandle = null,
        shape = RoundedCornerShape(topStart = 24.dp, topEnd = 24.dp)
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(20.dp)
        ) {
            // Header Bar: Close • Project Title • Save
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Surface(
                    color = colors.surface,
                    shape = CircleShape,
                    border = androidx.compose.foundation.BorderStroke(1.dp, colors.border),
                    modifier = Modifier.size(36.dp)
                ) {
                    IconButton(onClick = onDismiss) {
                        Icon(Icons.Default.Close, contentDescription = "Close", tint = colors.textSecondary, modifier = Modifier.size(18.dp))
                    }
                }

                Column(horizontalAlignment = Alignment.CenterHorizontally, modifier = Modifier.weight(1f).padding(horizontal = 8.dp)) {
                    Text(
                        text = "Project Companion",
                        fontSize = 11.sp,
                        fontWeight = FontWeight.SemiBold,
                        color = colors.primary
                    )
                    Text(
                        text = safeTitle,
                        fontSize = 15.sp,
                        fontWeight = FontWeight.Bold,
                        color = colors.textPrimary,
                        maxLines = 1,
                        overflow = androidx.compose.ui.text.style.TextOverflow.Ellipsis
                    )
                }

                Surface(
                    color = colors.primary,
                    shape = CircleShape,
                    modifier = Modifier.size(36.dp)
                ) {
                    IconButton(onClick = {
                        onUpdateStatus(currentStatus)
                        onSaveReadme(readmeText)
                        onDismiss()
                    }) {
                        Icon(Icons.Default.Check, contentDescription = "Save Changes", tint = Color.White, modifier = Modifier.size(18.dp))
                    }
                }
            }

            Spacer(modifier = Modifier.height(16.dp))

            // Subtabs
            FluentSegmentedPillControl(
                options = drawerTabs,
                selectedIndex = selectedTab,
                onOptionSelected = { selectedTab = it },
                modifier = Modifier.fillMaxWidth()
            )

            Spacer(modifier = Modifier.height(16.dp))

            when (selectedTab) {
                0 -> {
                    // TAB 0: Status Progression & Project Info
                    LazyColumn(
                        modifier = Modifier.fillMaxWidth().heightIn(max = 420.dp),
                        verticalArrangement = Arrangement.spacedBy(14.dp)
                    ) {
                        // 1. Status Switcher Section
                        item {
                            Text(
                                text = "PROJECT STATUS LIFECYCLE",
                                fontSize = 11.sp,
                                fontWeight = FontWeight.Bold,
                                color = colors.textSecondary,
                                letterSpacing = 1.sp
                            )
                            Spacer(modifier = Modifier.height(8.dp))
                            Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
                                availableStatuses.forEach { (statusKey, label, color) ->
                                    val isSelected = currentStatus == statusKey
                                    Surface(
                                        color = if (isSelected) color.copy(alpha = 0.15f) else colors.surface,
                                        shape = RoundedCornerShape(12.dp),
                                        border = androidx.compose.foundation.BorderStroke(
                                            if (isSelected) 1.5.dp else 1.dp,
                                            if (isSelected) color else colors.border
                                        ),
                                        modifier = Modifier
                                            .fillMaxWidth()
                                            .clickable { currentStatus = statusKey }
                                    ) {
                                        Row(
                                            modifier = Modifier.padding(horizontal = 14.dp, vertical = 10.dp),
                                            verticalAlignment = Alignment.CenterVertically,
                                            horizontalArrangement = Arrangement.SpaceBetween
                                        ) {
                                            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                                                Box(
                                                    modifier = Modifier
                                                        .size(10.dp)
                                                        .clip(CircleShape)
                                                        .background(color)
                                                )
                                                Text(
                                                    text = label,
                                                    fontSize = 13.sp,
                                                    fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Medium,
                                                    color = if (isSelected) colors.textPrimary else colors.textSecondary
                                                )
                                            }
                                            if (isSelected) {
                                                Icon(Icons.Default.CheckCircle, contentDescription = "Selected", tint = color, modifier = Modifier.size(18.dp))
                                            }
                                        }
                                    }
                                }
                            }
                        }

                        // 2. Project Metadata Summary
                        item {
                            Surface(
                                color = colors.surface,
                                shape = RoundedCornerShape(14.dp),
                                border = androidx.compose.foundation.BorderStroke(1.dp, colors.border),
                                modifier = Modifier.fillMaxWidth()
                            ) {
                                Column(modifier = Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                                    Text(text = "PROJECT METADATA", fontSize = 11.sp, fontWeight = FontWeight.Bold, color = colors.textSecondary)
                                    Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                                        Text(text = "Brand Code:", fontSize = 12.sp, color = colors.textSecondary)
                                        Text(text = safeBrand, fontSize = 12.sp, fontWeight = FontWeight.Bold, color = colors.primary)
                                    }
                                    Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                                        Text(text = "Lead Designer:", fontSize = 12.sp, color = colors.textSecondary)
                                        Text(text = safeDesigner, fontSize = 12.sp, fontWeight = FontWeight.SemiBold, color = colors.textPrimary)
                                    }
                                    Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                                        Text(text = "Client Org:", fontSize = 12.sp, color = colors.textSecondary)
                                        Text(text = safeClient, fontSize = 12.sp, fontWeight = FontWeight.SemiBold, color = colors.textPrimary)
                                    }
                                    Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                                        Text(text = "Production Deliverables:", fontSize = 12.sp, color = colors.textSecondary)
                                        Text(text = "${project.deliverableCount} files in NAS storage", fontSize = 12.sp, fontWeight = FontWeight.SemiBold, color = colors.textPrimary)
                                    }
                                }
                            }
                        }
                    }
                }
                1 -> {
                    // TAB 1: Live Project README.md Editor
                    Column(
                        modifier = Modifier.fillMaxWidth().heightIn(max = 420.dp),
                        verticalArrangement = Arrangement.spacedBy(10.dp)
                    ) {
                        Text(
                            text = "CANONICAL PROJECT README.MD",
                            fontSize = 11.sp,
                            fontWeight = FontWeight.Bold,
                            color = colors.textSecondary,
                            letterSpacing = 1.sp
                        )
                        Surface(
                            color = colors.surface,
                            shape = RoundedCornerShape(12.dp),
                            border = androidx.compose.foundation.BorderStroke(1.dp, colors.border),
                            modifier = Modifier
                                .fillMaxWidth()
                                .weight(1f)
                        ) {
                            androidx.compose.foundation.text.BasicTextField(
                                value = readmeText,
                                onValueChange = { readmeText = it },
                                textStyle = androidx.compose.ui.text.TextStyle(
                                    fontSize = 12.sp,
                                    fontFamily = androidx.compose.ui.text.font.FontFamily.Monospace,
                                    color = colors.textPrimary
                                ),
                                modifier = Modifier
                                    .fillMaxSize()
                                    .padding(12.dp)
                            )
                        }
                        Text(
                            text = "💡 Changes made here sync directly with the Synology NAS project README.md and Desktop client.",
                            fontSize = 11.sp,
                            color = colors.textSecondary
                        )
                    }
                }
                2 -> {
                    // TAB 2: Deliverable Assets & Upload Preview
                    LazyColumn(
                        modifier = Modifier.fillMaxWidth().heightIn(max = 420.dp),
                        verticalArrangement = Arrangement.spacedBy(10.dp)
                    ) {
                        item {
                            Text(
                                text = "PRODUCTION DELIVERABLES (${project.deliverableCount})",
                                fontSize = 11.sp,
                                fontWeight = FontWeight.Bold,
                                color = colors.textSecondary,
                                letterSpacing = 1.sp
                            )
                        }

                        items(listOf(
                            Triple("KeyVisual_Final_Poster.png", "3.4 MB • 1080x1350 • NAS Rendered", SshSuccessGreen),
                            Triple("Video_Hook_Variation_01.mp4", "18.2 MB • 1080x1920 • 9:16", Color(0xFFFBBF24)),
                            Triple("Ad_Carousel_Dieline_Pack.zip", "42.1 MB • AI / PSD Production", SshAzure)
                        )) { (filename, meta, statusColor) ->
                            Surface(
                                color = colors.surface,
                                shape = RoundedCornerShape(12.dp),
                                border = androidx.compose.foundation.BorderStroke(1.dp, colors.border),
                                modifier = Modifier.fillMaxWidth()
                            ) {
                                Row(
                                    modifier = Modifier.padding(12.dp),
                                    verticalAlignment = Alignment.CenterVertically,
                                    horizontalArrangement = Arrangement.SpaceBetween
                                ) {
                                    Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                                        Box(
                                            modifier = Modifier
                                                .size(36.dp)
                                                .clip(RoundedCornerShape(8.dp))
                                                .background(colors.card),
                                            contentAlignment = Alignment.Center
                                        ) {
                                            Icon(Icons.AutoMirrored.Filled.InsertDriveFile, contentDescription = null, tint = colors.primary, modifier = Modifier.size(20.dp))
                                        }
                                        Column {
                                            Text(text = filename, fontSize = 13.sp, fontWeight = FontWeight.SemiBold, color = colors.textPrimary)
                                            Text(text = meta, fontSize = 11.sp, color = colors.textSecondary)
                                        }
                                    }
                                    Box(
                                        modifier = Modifier
                                            .size(8.dp)
                                            .clip(CircleShape)
                                            .background(statusColor)
                                    )
                                }
                            }
                        }

                        item {
                            Spacer(modifier = Modifier.height(6.dp))
                            Surface(
                                color = colors.surface,
                                shape = RoundedCornerShape(12.dp),
                                border = androidx.compose.foundation.BorderStroke(1.dp, colors.primary.copy(alpha = 0.5f)),
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .clickable { /* Upload trigger */ }
                            ) {
                                Row(
                                    modifier = Modifier.padding(14.dp),
                                    horizontalArrangement = Arrangement.Center,
                                    verticalAlignment = Alignment.CenterVertically
                                ) {
                                    Icon(Icons.Default.CloudUpload, contentDescription = "Upload", tint = colors.primary, modifier = Modifier.size(18.dp))
                                    Spacer(modifier = Modifier.width(8.dp))
                                    Text(
                                        text = "Upload Mobile Render to 03_EXPORTS/",
                                        fontSize = 12.sp,
                                        fontWeight = FontWeight.Bold,
                                        color = colors.primary
                                    )
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}
