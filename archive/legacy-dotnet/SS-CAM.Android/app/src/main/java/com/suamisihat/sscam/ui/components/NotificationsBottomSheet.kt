package com.suamisihat.sscam.ui.components

import androidx.compose.animation.AnimatedVisibility
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
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.suamisihat.sscam.data.models.NotificationItem
import com.suamisihat.sscam.ui.theme.*

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun NotificationsBottomSheet(
    notifications: List<NotificationItem>,
    onDismiss: () -> Unit,
    onNotificationClick: (NotificationItem) -> Unit = {},
    onMarkAllAsRead: () -> Unit = {}
) {
    val colors = LocalSscamColors.current
    var selectedFilter by remember { mutableStateOf("All") }

    val filterList = listOf("All", "Unread", "Reviews", "Briefs")

    val filteredNotifications = remember(notifications, selectedFilter) {
        when (selectedFilter) {
            "Unread" -> notifications.filter { !it.read }
            "Reviews" -> notifications.filter { it.type == "approval" || it.type == "revision" }
            "Briefs" -> notifications.filter { it.type == "brief" || it.type == "intake" }
            else -> notifications
        }
    }

    ModalBottomSheet(
        onDismissRequest = onDismiss,
        containerColor = colors.surface,
        contentColor = colors.textPrimary,
        shape = RoundedCornerShape(topStart = 20.dp, topEnd = 20.dp),
        dragHandle = {
            Box(
                modifier = Modifier
                    .padding(top = 10.dp, bottom = 6.dp)
                    .width(40.dp)
                    .height(4.dp)
                    .clip(CircleShape)
                    .background(colors.textSecondary.copy(alpha = 0.3f))
            )
        }
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 16.dp, vertical = 8.dp)
        ) {
            // Header Row
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Box(
                        modifier = Modifier
                            .size(32.dp)
                            .clip(CircleShape)
                            .background(colors.accent.copy(alpha = 0.15f)),
                        contentAlignment = Alignment.Center
                    ) {
                        Icon(
                            Icons.Default.Notifications,
                            contentDescription = null,
                            tint = colors.accent,
                            modifier = Modifier.size(18.dp)
                        )
                    }
                    Spacer(modifier = Modifier.width(10.dp))
                    Column {
                        Text(
                            "Activity & Notifications",
                            fontSize = 16.sp,
                            fontWeight = FontWeight.Bold,
                            color = colors.textPrimary
                        )
                        val unreadCount = notifications.count { !it.read }
                        Text(
                            if (unreadCount > 0) "$unreadCount unread updates" else "All caught up",
                            fontSize = 11.sp,
                            color = if (unreadCount > 0) colors.accent else SshSuccessGreen
                        )
                    }
                }

                if (notifications.any { !it.read }) {
                    TextButton(
                        onClick = onMarkAllAsRead,
                        contentPadding = PaddingValues(horizontal = 8.dp, vertical = 4.dp)
                    ) {
                        Icon(Icons.Default.DoneAll, contentDescription = null, modifier = Modifier.size(15.dp), tint = colors.accent)
                        Spacer(modifier = Modifier.width(4.dp))
                        Text("Mark read", fontSize = 12.sp, color = colors.accent, fontWeight = FontWeight.SemiBold)
                    }
                }
            }

            Spacer(modifier = Modifier.height(12.dp))

            // Filter Tabs
            LazyRow(
                horizontalArrangement = Arrangement.spacedBy(8.dp),
                modifier = Modifier.fillMaxWidth()
            ) {
                items(filterList) { filter ->
                    val isSelected = selectedFilter == filter
                    Box(
                        modifier = Modifier
                            .clip(RoundedCornerShape(20.dp))
                            .background(
                                if (isSelected) colors.primary.copy(alpha = 0.2f) else colors.container.copy(alpha = 0.5f)
                            )
                            .border(
                                1.dp,
                                if (isSelected) colors.accent.copy(alpha = 0.8f) else colors.container,
                                RoundedCornerShape(20.dp)
                            )
                            .clickable { selectedFilter = filter }
                            .padding(horizontal = 14.dp, vertical = 6.dp)
                    ) {
                        Text(
                            text = filter,
                            fontSize = 12.sp,
                            fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Normal,
                            color = if (isSelected) colors.accent else colors.textSecondary
                        )
                    }
                }
            }

            Spacer(modifier = Modifier.height(14.dp))

            // Notification List
            if (filteredNotifications.isEmpty()) {
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(vertical = 40.dp),
                    contentAlignment = Alignment.Center
                ) {
                    Column(horizontalAlignment = Alignment.CenterHorizontally) {
                        Icon(
                            Icons.Default.CheckCircleOutline,
                            contentDescription = null,
                            tint = SshSuccessGreen.copy(alpha = 0.6f),
                            modifier = Modifier.size(48.dp)
                        )
                        Spacer(modifier = Modifier.height(8.dp))
                        Text(
                            "No notifications in this view",
                            fontSize = 14.sp,
                            color = colors.textSecondary,
                            fontWeight = FontWeight.Medium
                        )
                    }
                }
            } else {
                LazyColumn(
                    verticalArrangement = Arrangement.spacedBy(10.dp),
                    modifier = Modifier
                        .fillMaxWidth()
                        .heightIn(max = 420.dp)
                ) {
                    items(filteredNotifications) { item ->
                        NotificationCard(
                            item = item,
                            onClick = { onNotificationClick(item) }
                        )
                    }
                }
            }

            Spacer(modifier = Modifier.height(16.dp))
        }
    }
}

@Composable
fun NotificationCard(
    item: NotificationItem,
    onClick: () -> Unit
) {
    val colors = LocalSscamColors.current

    val (icon, iconTint, bgTint) = when (item.type.lowercase()) {
        "approval" -> Triple(Icons.Default.CheckCircle, SshSuccessGreen, SshSuccessGreen.copy(alpha = 0.12f))
        "revision" -> Triple(Icons.Default.Refresh, Color(0xFFF59E0B), Color(0xFFF59E0B).copy(alpha = 0.12f))
        "brief", "intake" -> Triple(Icons.Default.AddCircleOutline, SshAzure, SshAzure.copy(alpha = 0.12f))
        "mention" -> Triple(Icons.Default.AlternateEmail, Color(0xFFA855F7), Color(0xFFA855F7).copy(alpha = 0.12f))
        else -> Triple(Icons.Default.ChatBubbleOutline, colors.accent, colors.accent.copy(alpha = 0.12f))
    }

    Card(
        shape = RoundedCornerShape(12.dp),
        colors = CardDefaults.cardColors(
            containerColor = if (!item.read) colors.container.copy(alpha = 0.8f) else colors.surface
        ),
        border = androidx.compose.foundation.BorderStroke(
            1.dp,
            if (!item.read) colors.accent.copy(alpha = 0.4f) else colors.container.copy(alpha = 0.6f)
        ),
        modifier = Modifier
            .fillMaxWidth()
            .clickable { onClick() }
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(12.dp),
            verticalAlignment = Alignment.Top
        ) {
            Box(
                modifier = Modifier
                    .size(36.dp)
                    .clip(RoundedCornerShape(8.dp))
                    .background(bgTint),
                contentAlignment = Alignment.Center
            ) {
                Icon(icon, contentDescription = null, tint = iconTint, modifier = Modifier.size(20.dp))
            }

            Spacer(modifier = Modifier.width(12.dp))

            Column(modifier = Modifier.weight(1f)) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text(
                        text = item.title.ifBlank { "Creative Update" },
                        fontSize = 13.sp,
                        fontWeight = if (!item.read) FontWeight.Bold else FontWeight.SemiBold,
                        color = colors.textPrimary,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis,
                        modifier = Modifier.weight(1f, fill = false)
                    )
                    Spacer(modifier = Modifier.width(6.dp))
                    Text(
                        text = item.timestamp.ifBlank { "Just now" },
                        fontSize = 10.sp,
                        color = colors.textSecondary
                    )
                }

                Spacer(modifier = Modifier.height(3.dp))

                Text(
                    text = item.message,
                    fontSize = 12.sp,
                    color = if (!item.read) colors.textPrimary.copy(alpha = 0.9f) else colors.textSecondary,
                    lineHeight = 16.sp,
                    maxLines = 2,
                    overflow = TextOverflow.Ellipsis
                )

                if (item.projectTitle.isNotBlank()) {
                    Spacer(modifier = Modifier.height(4.dp))
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Box(
                            modifier = Modifier
                                .clip(RoundedCornerShape(4.dp))
                                .background(colors.primary.copy(alpha = 0.15f))
                                .padding(horizontal = 5.dp, vertical = 1.dp)
                        ) {
                            Text(
                                text = item.projectTitle,
                                fontSize = 10.sp,
                                fontWeight = FontWeight.Bold,
                                color = colors.accent
                            )
                        }
                    }
                }
            }

            if (!item.read) {
                Spacer(modifier = Modifier.width(6.dp))
                Box(
                    modifier = Modifier
                        .size(8.dp)
                        .clip(CircleShape)
                        .background(colors.accent)
                        .align(Alignment.CenterVertically)
                )
            }
        }
    }
}
