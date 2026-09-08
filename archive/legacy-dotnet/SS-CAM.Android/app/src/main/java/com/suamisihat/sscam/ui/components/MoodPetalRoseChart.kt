package com.suamisihat.sscam.ui.components

import android.graphics.Paint
import android.graphics.Typeface
import androidx.compose.animation.core.*
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.gestures.detectTapGestures
import androidx.compose.foundation.layout.*
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
import androidx.compose.ui.geometry.Rect
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.drawscope.Fill
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.graphics.nativeCanvas
import androidx.compose.ui.graphics.toArgb
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.suamisihat.sscam.ui.theme.LocalSscamColors
import com.suamisihat.sscam.ui.theme.SshSuccessGreen
import com.suamisihat.sscam.ui.theme.SshWarmGoldBright
import kotlin.math.PI
import kotlin.math.atan2
import kotlin.math.cos
import kotlin.math.sin
import kotlin.math.sqrt

data class MoodPetalData(
    val id: String,
    val name: String,
    var score: Int,
    val maxScore: Int = 15,
    val description: String,
    val advice: String,
    val icon: ImageVector
)

@Composable
fun MoodPetalRoseChart(
    modifier: Modifier = Modifier,
    petals: List<MoodPetalData>,
    selectedPetalIndex: Int,
    onPetalSelected: (Int) -> Unit
) {
    val colors = LocalSscamColors.current
    val isDark = colors.isDark

    // Animate petal growth
    val animatedProgress = remember { Animatable(0f) }
    LaunchedEffect(Unit) {
        animatedProgress.animateTo(
            targetValue = 1f,
            animationSpec = tween(durationMillis = 600, easing = FastOutSlowInEasing)
        )
    }

    // Cached native paint objects for maximum 60-120fps draw performance
    val numPaint = remember {
        Paint().apply {
            isAntiAlias = true
            textAlign = Paint.Align.CENTER
            typeface = Typeface.create(Typeface.DEFAULT, Typeface.BOLD)
        }
    }

    val labelPaint = remember {
        Paint().apply {
            isAntiAlias = true
            textAlign = Paint.Align.CENTER
            typeface = Typeface.create(Typeface.DEFAULT, Typeface.NORMAL)
        }
    }

    val haptic = androidx.compose.ui.platform.LocalHapticFeedback.current

    Box(
        modifier = modifier
            .fillMaxWidth()
            .aspectRatio(1f),
        contentAlignment = Alignment.Center
    ) {
        Canvas(
            modifier = Modifier
                .fillMaxSize()
                .padding(8.dp)
                .pointerInput(petals) {
                    detectTapGestures { offset ->
                        val cx = size.width / 2f
                        val cy = size.height / 2f
                        val dx = offset.x - cx
                        val dy = offset.y - cy
                        val distance = sqrt(dx * dx + dy * dy)
                        val maxRadius = size.width / 2f * 0.95f
                        val minRadius = maxRadius * 0.15f

                        if (distance in minRadius..maxRadius) {
                            val angleDeg = atan2(dy, dx) * (180f / PI.toFloat())
                            val relAngle = (angleDeg - (-67.5f) + 360f) % 360f
                            val clickedIndex = (relAngle / 45f).toInt().coerceIn(0, petals.lastIndex)
                            try {
                                haptic.performHapticFeedback(androidx.compose.ui.hapticfeedback.HapticFeedbackType.TextHandleMove)
                            } catch (e: Exception) {}
                            onPetalSelected(clickedIndex)
                        }
                    }
                }
        ) {
            val cx = size.width / 2f
            val cy = size.height / 2f
            val maxR = (size.minDimension / 2f) * 0.94f
            val minR = maxR * 0.16f
            val gapDegrees = 3.5f
            val sweepDegrees = 45f - gapDegrees

            val bgPetalColor = if (colors.isMonochrome) Color(0xFFE4E4E7) else if (isDark) Color(0xFF334155).copy(alpha = 0.85f) else Color(0xFF475569).copy(alpha = 0.75f)
            val activeFillColor = if (colors.isMonochrome) Color(0xFF18181B) else if (isDark) Color(0xFFEDE9FE) else Color(0xFFF1F5F9)
            val selectedHighlightBorder = if (colors.isMonochrome) Color(0xFF000000) else Color(0xFFF59E0B)

            numPaint.textSize = 14.sp.toPx()
            labelPaint.textSize = 10.sp.toPx()

            for (i in petals.indices) {
                val petal = petals[i]
                val startAngle = -67.5f + (i * 45f) + (gapDegrees / 2f)
                val midAngle = startAngle + (sweepDegrees / 2f)
                val midAngleRad = midAngle * (PI.toFloat() / 180f)

                val isSelected = (i == selectedPetalIndex)
                val scoreFraction = (petal.score.toFloat() / petal.maxScore.toFloat()).coerceIn(0.1f, 1.0f)
                val dynamicFillR = minR + (maxR - minR) * scoreFraction * animatedProgress.value

                // 1. Outer Background Petal Wedge
                val bgPath = createPetalWedgePath(
                    cx = cx,
                    cy = cy,
                    innerR = minR,
                    outerR = maxR,
                    startAngle = startAngle,
                    sweepAngle = sweepDegrees
                )
                drawPath(
                    path = bgPath,
                    color = if (isSelected) bgPetalColor.copy(alpha = 0.95f) else bgPetalColor,
                    style = Fill
                )

                // 2. Inner Value Petal Wedge
                val fillPath = createPetalWedgePath(
                    cx = cx,
                    cy = cy,
                    innerR = minR,
                    outerR = dynamicFillR,
                    startAngle = startAngle,
                    sweepAngle = sweepDegrees
                )
                drawPath(
                    path = fillPath,
                    color = activeFillColor,
                    style = Fill
                )

                // Selected Petal Highlight Ring
                if (isSelected) {
                    drawPath(
                        path = bgPath,
                        color = selectedHighlightBorder,
                        style = Stroke(width = 2.5.dp.toPx())
                    )
                }

                // 3. Score Number & Label Text
                val hasHighValue = scoreFraction >= 0.55f
                val labelDistance = if (hasHighValue) {
                    minR + (dynamicFillR - minR) * 0.55f
                } else {
                    maxR * 0.68f
                }

                val textX = cx + labelDistance * cos(midAngleRad)
                val textY = cy + labelDistance * sin(midAngleRad)

                if (colors.isMonochrome) {
                    numPaint.color = if (hasHighValue) Color.White.toArgb() else Color(0xFF18181B).toArgb()
                    labelPaint.color = if (hasHighValue) Color(0xFFD4D4D8).toArgb() else Color(0xFF52525B).toArgb()
                } else {
                    numPaint.color = if (hasHighValue) Color(0xFF0F172A).toArgb() else Color.White.toArgb()
                    labelPaint.color = if (hasHighValue) Color(0xFF334155).toArgb() else Color(0xFFCBD5E1).toArgb()
                }

                drawContext.canvas.nativeCanvas.drawText(
                    petal.score.toString(),
                    textX,
                    textY - 3.dp.toPx(),
                    numPaint
                )

                drawContext.canvas.nativeCanvas.drawText(
                    petal.name,
                    textX,
                    textY + 11.dp.toPx(),
                    labelPaint
                )
            }

            // Center Hub Circle
            drawCircle(
                color = if (colors.isMonochrome) Color(0xFF18181B) else if (isDark) Color(0xFF0F172A) else Color(0xFF020617),
                radius = minR * 0.9f,
                center = Offset(cx, cy)
            )
        }
    }
}

private fun createPetalWedgePath(
    cx: Float,
    cy: Float,
    innerR: Float,
    outerR: Float,
    startAngle: Float,
    sweepAngle: Float
): Path {
    return Path().apply {
        arcTo(
            rect = Rect(
                Offset(cx - outerR, cy - outerR),
                Size(outerR * 2, outerR * 2)
            ),
            startAngleDegrees = startAngle,
            sweepAngleDegrees = sweepAngle,
            forceMoveTo = true
        )

        val endAngleRad = (startAngle + sweepAngle) * (PI.toFloat() / 180f)
        val innerEndX = cx + innerR * cos(endAngleRad)
        val innerEndY = cy + innerR * sin(endAngleRad)
        lineTo(innerEndX, innerEndY)

        arcTo(
            rect = Rect(
                Offset(cx - innerR, cy - innerR),
                Size(innerR * 2, innerR * 2)
            ),
            startAngleDegrees = startAngle + sweepAngle,
            sweepAngleDegrees = -sweepAngle,
            forceMoveTo = false
        )

        close()
    }
}

@Composable
fun StudioMoodWheelCard(
    modifier: Modifier = Modifier
) {
    val colors = LocalSscamColors.current

    // 8 Vector Brand Icons (No Emojis)
    var petals by remember {
        mutableStateOf(
            listOf(
                MoodPetalData("1", "Happiness", 12, 15, "Feeling joyful, fulfilled, and energized.", "Maintain this high momentum for key visual branding and master cuts.", Icons.Default.SentimentVerySatisfied),
                MoodPetalData("2", "Awe", 10, 15, "Inspired by fresh creative concepts & visual art.", "Optimal time to storyboard breakthrough campaign directions.", Icons.Default.AutoAwesome),
                MoodPetalData("3", "Admiration", 5, 15, "Valuing peer craftsmanship & teamwork.", "Ideal mindset for peer review sessions and design critiques.", Icons.Default.Group),
                MoodPetalData("4", "Surprise", 12, 15, "Stimulation from new technical discoveries or assets.", "Explore newly discovered motion techniques and studio tools.", Icons.Default.Lightbulb),
                MoodPetalData("5", "Sadness", 6, 15, "Creative fatigue or depleted inspiration.", "Take a 15-minute screen pause or tune in to Lofi Studio Radio.", Icons.Default.CloudQueue),
                MoodPetalData("6", "Fear", 4, 15, "Deadline anxiety or dense sprint workload.", "Break tasks into 25-minute focused Pomodoro sprints.", Icons.Default.Shield),
                MoodPetalData("7", "Anger", 2, 15, "Technical friction or creative block.", "Take a 4-second deep breath and rest your eyes from the display.", Icons.Default.SelfImprovement),
                MoodPetalData("8", "Anticipation", 5, 15, "Excitement for upcoming campaign launch.", "Prepare final deliverable packaging for creative director sign-off.", Icons.Default.RocketLaunch)
            )
        )
    }

    var selectedIndex by remember { mutableStateOf(0) }
    val activePetal = petals[selectedIndex]

    FluentCard(
        cornerRadius = 16.dp,
        modifier = modifier.fillMaxWidth()
    ) {
        Column(modifier = Modifier.padding(16.dp)) {
            // Header
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Icon(
                        Icons.Default.Psychology,
                        contentDescription = null,
                        tint = colors.primary,
                        modifier = Modifier.size(18.dp)
                    )
                    Spacer(modifier = Modifier.width(6.dp))
                    Column {
                        Text(
                            text = "CREATIVE EMOTION & MINDSET WHEEL",
                            fontSize = 12.sp,
                            fontWeight = FontWeight.Bold,
                            color = colors.primary,
                            letterSpacing = 0.5.sp
                        )
                        Text(
                            text = "Studio Designer & Editor Emotion Wheel",
                            fontSize = 11.sp,
                            color = colors.textSecondary
                        )
                    }
                }

                Surface(
                    color = if (colors.isMonochrome) Color(0xFFF4F4F5) else SshWarmGoldBright.copy(alpha = 0.15f),
                    shape = RoundedCornerShape(12.dp),
                    border = androidx.compose.foundation.BorderStroke(1.dp, if (colors.isMonochrome) Color(0xFFD4D4D8) else SshWarmGoldBright.copy(alpha = 0.4f))
                ) {
                    Text(
                        text = "Score: ${activePetal.score}/15",
                        fontSize = 10.sp,
                        fontWeight = FontWeight.Bold,
                        color = if (colors.isMonochrome) Color(0xFF18181B) else SshWarmGoldBright,
                        modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp)
                    )
                }
            }

            Spacer(modifier = Modifier.height(12.dp))

            // Rose Wheel Chart Container
            Surface(
                color = if (colors.isMonochrome) Color(0xFFF4F4F5) else Color(0xFF0F172A),
                shape = RoundedCornerShape(16.dp),
                border = androidx.compose.foundation.BorderStroke(1.dp, if (colors.isMonochrome) Color(0xFFD4D4D8) else Color(0xFF334155)),
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(vertical = 4.dp)
            ) {
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(12.dp),
                    contentAlignment = Alignment.Center
                ) {
                    MoodPetalRoseChart(
                        modifier = Modifier.size(280.dp),
                        petals = petals,
                        selectedPetalIndex = selectedIndex,
                        onPetalSelected = { selectedIndex = it }
                    )
                }
            }

            Spacer(modifier = Modifier.height(14.dp))

            // Selected Mood Dimension Details & Score Stepper
            Surface(
                color = if (colors.isDark) Color(0xFF1E293B) else Color(0xFFF8FAFC),
                shape = RoundedCornerShape(12.dp),
                border = androidx.compose.foundation.BorderStroke(1.dp, colors.border),
                modifier = Modifier.fillMaxWidth()
            ) {
                Column(modifier = Modifier.padding(12.dp)) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Row(
                            modifier = Modifier.weight(1f).padding(end = 8.dp),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Box(
                                modifier = Modifier
                                    .size(34.dp)
                                    .clip(RoundedCornerShape(8.dp))
                                    .background(colors.primary.copy(alpha = 0.12f)),
                                contentAlignment = Alignment.Center
                            ) {
                                Icon(
                                    activePetal.icon,
                                    contentDescription = null,
                                    tint = colors.primary,
                                    modifier = Modifier.size(18.dp)
                                )
                            }
                            Spacer(modifier = Modifier.width(10.dp))
                            Column {
                                Text(
                                    text = activePetal.name,
                                    fontSize = 14.sp,
                                    fontWeight = FontWeight.Bold,
                                    color = colors.textPrimary
                                )
                                Text(
                                    text = activePetal.description,
                                    fontSize = 11.sp,
                                    color = colors.textSecondary,
                                    maxLines = 1
                                )
                            }
                        }

                        // Stepper (+ / -)
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(4.dp)
                        ) {
                            IconButton(
                                onClick = {
                                    if (activePetal.score > 0) {
                                        petals = petals.mapIndexed { idx, p ->
                                            if (idx == selectedIndex) p.copy(score = p.score - 1) else p
                                        }
                                    }
                                },
                                modifier = Modifier
                                    .size(30.dp)
                                    .clip(CircleShape)
                                    .background(colors.card)
                                    .border(1.dp, colors.border, CircleShape)
                            ) {
                                Icon(Icons.Default.Remove, contentDescription = "Minus", tint = colors.textPrimary, modifier = Modifier.size(16.dp))
                            }

                            Text(
                                text = "${activePetal.score}",
                                fontSize = 14.sp,
                                fontWeight = FontWeight.Bold,
                                color = colors.primary,
                                modifier = Modifier.padding(horizontal = 4.dp)
                            )

                            IconButton(
                                onClick = {
                                    if (activePetal.score < activePetal.maxScore) {
                                        petals = petals.mapIndexed { idx, p ->
                                            if (idx == selectedIndex) p.copy(score = p.score + 1) else p
                                        }
                                    }
                                },
                                modifier = Modifier
                                    .size(30.dp)
                                    .clip(CircleShape)
                                    .background(colors.card)
                                    .border(1.dp, colors.border, CircleShape)
                            ) {
                                Icon(Icons.Default.Add, contentDescription = "Plus", tint = colors.textPrimary, modifier = Modifier.size(16.dp))
                            }
                        }
                    }

                    Spacer(modifier = Modifier.height(8.dp))

                    // Tip & Advice Pill
                    Surface(
                        color = if (colors.isMonochrome) Color(0xFFF4F4F5) else colors.primary.copy(alpha = 0.08f),
                        shape = RoundedCornerShape(8.dp),
                        border = if (colors.isMonochrome) androidx.compose.foundation.BorderStroke(1.dp, Color(0xFFD4D4D8)) else null,
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Row(
                            modifier = Modifier.padding(horizontal = 10.dp, vertical = 6.dp),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Icon(
                                Icons.Default.TipsAndUpdates,
                                contentDescription = null,
                                tint = if (colors.isMonochrome) Color(0xFF18181B) else colors.primary,
                                modifier = Modifier.size(14.dp)
                            )
                            Spacer(modifier = Modifier.width(6.dp))
                            Text(
                                text = activePetal.advice,
                                fontSize = 11.sp,
                                color = if (colors.isMonochrome) Color(0xFF18181B) else colors.primary,
                                fontWeight = FontWeight.Medium
                            )
                        }
                    }
                }
            }
        }
    }
}
