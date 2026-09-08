package com.suamisihat.sscam.ui.components

import androidx.compose.animation.core.Animatable
import androidx.compose.animation.core.FastOutSlowInEasing
import androidx.compose.animation.core.LinearEasing
import androidx.compose.animation.core.RepeatMode
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.spring
import androidx.compose.animation.core.tween
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowDownward
import androidx.compose.material.icons.filled.CloudSync
import androidx.compose.material.icons.filled.Refresh
import androidx.compose.material.icons.filled.Sync
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableFloatStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.rotate
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.hapticfeedback.HapticFeedbackType
import androidx.compose.ui.input.nestedscroll.NestedScrollConnection
import androidx.compose.ui.input.nestedscroll.NestedScrollSource
import androidx.compose.ui.input.nestedscroll.nestedScroll
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.platform.LocalHapticFeedback
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.IntOffset
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.zIndex
import com.suamisihat.sscam.ui.theme.LocalSscamColors
import com.suamisihat.sscam.ui.theme.SshAzure
import com.suamisihat.sscam.ui.theme.SshPrussianBlue
import com.suamisihat.sscam.ui.theme.SshWarmGold
import kotlinx.coroutines.launch
import kotlin.math.min
import kotlin.math.roundToInt

/**
 * Fluent 2 Pull-to-Refresh Container.
 * Intercepts vertical drag gestures and provides a native Fluent 2 tactile feedback
 * indicator when refreshing real-time data from Synology NAS.
 */
@Composable
fun FluentPullToRefresh(
    isRefreshing: Boolean,
    onRefresh: () -> Unit,
    modifier: Modifier = Modifier,
    enabled: Boolean = true,
    content: @Composable () -> Unit
) {
    val colors = LocalSscamColors.current
    val density = LocalDensity.current
    val haptic = LocalHapticFeedback.current
    val coroutineScope = rememberCoroutineScope()

    val refreshThresholdPx = with(density) { 72.dp.toPx() }
    val maxDragDistancePx = with(density) { 120.dp.toPx() }

    val pullOffsetAnim = remember { Animatable(0f) }
    var hasFiredHaptic by remember { mutableStateOf(false) }

    LaunchedEffect(isRefreshing) {
        if (!isRefreshing) {
            pullOffsetAnim.animateTo(0f, spring(dampingRatio = 0.8f, stiffness = 400f))
            hasFiredHaptic = false
        } else {
            pullOffsetAnim.animateTo(with(density) { 56.dp.toPx() }, spring(dampingRatio = 0.8f, stiffness = 400f))
        }
    }

    val nestedScrollConnection = remember(enabled, isRefreshing) {
        object : NestedScrollConnection {
            override fun onPreScroll(available: Offset, source: NestedScrollSource): Offset {
                if (!enabled || isRefreshing) return Offset.Zero

                // If user is dragging upward while pulled down, consume to collapse
                if (available.y < 0 && pullOffsetAnim.value > 0f) {
                    val newOffset = (pullOffsetAnim.value + available.y).coerceAtLeast(0f)
                    coroutineScope.launch { pullOffsetAnim.snapTo(newOffset) }
                    return Offset(0f, available.y)
                }
                return Offset.Zero
            }

            override fun onPostScroll(
                consumed: Offset,
                available: Offset,
                source: NestedScrollSource
            ): Offset {
                if (!enabled || isRefreshing) return Offset.Zero

                if (available.y > 0) {
                    // Apply resistance formula
                    val dragResistance = 0.42f
                    val newOffset = min(maxDragDistancePx, pullOffsetAnim.value + available.y * dragResistance)

                    if (newOffset >= refreshThresholdPx && !hasFiredHaptic) {
                        haptic.performHapticFeedback(HapticFeedbackType.TextHandleMove)
                        hasFiredHaptic = true
                    } else if (newOffset < refreshThresholdPx) {
                        hasFiredHaptic = false
                    }

                    coroutineScope.launch { pullOffsetAnim.snapTo(newOffset) }
                    return Offset(0f, available.y)
                }
                return Offset.Zero
            }

            override suspend fun onPreFling(available: androidx.compose.ui.unit.Velocity): androidx.compose.ui.unit.Velocity {
                if (!enabled || isRefreshing) return androidx.compose.ui.unit.Velocity.Zero

                if (pullOffsetAnim.value >= refreshThresholdPx) {
                    onRefresh()
                } else {
                    pullOffsetAnim.animateTo(0f, spring(dampingRatio = 0.8f, stiffness = 450f))
                }
                return androidx.compose.ui.unit.Velocity.Zero
            }
        }
    }

    val infiniteTransition = rememberInfiniteTransition(label = "pull_sync_spin")
    val spinAngle by infiniteTransition.animateFloat(
        initialValue = 0f,
        targetValue = 360f,
        animationSpec = infiniteRepeatable(
            animation = tween(900, easing = LinearEasing),
            repeatMode = RepeatMode.Restart
        ),
        label = "spin_angle"
    )

    Box(
        modifier = modifier
            .fillMaxSize()
            .nestedScroll(nestedScrollConnection)
    ) {
        // Floating Pull-To-Refresh Indicator Badge
        val currentOffset = pullOffsetAnim.value
        if (currentOffset > 2f || isRefreshing) {
            val progress = (currentOffset / refreshThresholdPx).coerceIn(0f, 1f)
            val isThresholdReached = currentOffset >= refreshThresholdPx

            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .offset { IntOffset(0, (currentOffset - with(density) { 48.dp.toPx() }).roundToInt()) }
                    .zIndex(10f),
                contentAlignment = Alignment.TopCenter
            ) {
                Box(
                    modifier = Modifier
                        .shadow(elevation = 8.dp, shape = RoundedCornerShape(24.dp))
                        .clip(RoundedCornerShape(24.dp))
                        .background(if (colors.isDark) Color(0xFF1E293B) else Color.White)
                        .border(
                            1.dp,
                            if (isThresholdReached || isRefreshing) SshAzure.copy(alpha = 0.6f) else colors.border,
                            RoundedCornerShape(24.dp)
                        )
                        .padding(horizontal = 14.dp, vertical = 8.dp)
                ) {
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        if (isRefreshing) {
                            Icon(
                                imageVector = Icons.Default.Sync,
                                contentDescription = "Syncing",
                                tint = if (colors.isDark) SshWarmGold else SshPrussianBlue,
                                modifier = Modifier
                                    .size(16.dp)
                                    .rotate(spinAngle)
                            )
                            Text(
                                text = "Syncing Synology NAS...",
                                fontSize = 12.sp,
                                fontWeight = FontWeight.SemiBold,
                                color = colors.textPrimary
                            )
                        } else {
                            val iconRotation = progress * 180f
                            Icon(
                                imageVector = if (isThresholdReached) Icons.Default.CloudSync else Icons.Default.ArrowDownward,
                                contentDescription = "Pull to Refresh",
                                tint = if (isThresholdReached) SshAzure else colors.textSecondary,
                                modifier = Modifier
                                    .size(16.dp)
                                    .rotate(if (isThresholdReached) 0f else iconRotation)
                            )
                            Text(
                                text = if (isThresholdReached) "Release to sync" else "Pull down to sync",
                                fontSize = 12.sp,
                                fontWeight = FontWeight.Medium,
                                color = if (isThresholdReached) SshAzure else colors.textSecondary
                            )
                        }
                    }
                }
            }
        }

        // Screen Content (pushed down slightly during pull)
        Box(
            modifier = Modifier
                .fillMaxSize()
                .offset { IntOffset(0, (pullOffsetAnim.value * 0.7f).roundToInt()) }
        ) {
            content()
        }
    }
}
