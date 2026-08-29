package com.suamisihat.sscam.ui.screens

import androidx.compose.animation.core.*
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowForward
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.graphics.drawscope.rotate
import androidx.compose.ui.hapticfeedback.HapticFeedbackType
import androidx.compose.ui.platform.LocalHapticFeedback
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.text.input.VisualTransformation
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.suamisihat.sscam.R
import com.suamisihat.sscam.data.models.StaffMember
import com.suamisihat.sscam.ui.components.UserProfileAvatar
import com.suamisihat.sscam.ui.theme.*
import kotlin.math.cos
import kotlin.math.sin

/**
 * SuamiSihat Hero Login Screen
 * Features the signature SuamiSihat Hero Mesh animated glowing backdrop with floating Logomarks
 * and Men's Symbols (Mars ♂), official SuamiSihat vector logomark header, refined designer
 * account selector (Profile Pic + Name + ID Badge only), and secure authentication.
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun LoginScreen(
    staffList: List<StaffMember> = emptyList(),
    initialUsername: String = "harussani",
    isLoading: Boolean = false,
    errorMessage: String? = null,
    onLogin: (username: String, password: String, rememberMe: Boolean) -> Unit
) {
    val haptic = LocalHapticFeedback.current
    val scrollState = rememberScrollState()

    var liveStaffList by remember { mutableStateOf(staffList) }

    LaunchedEffect(staffList) {
        if (staffList.isNotEmpty()) {
            liveStaffList = staffList
        } else {
            try {
                kotlinx.coroutines.withContext(kotlinx.coroutines.Dispatchers.IO) {
                    val api = com.suamisihat.sscam.data.api.SscamApiService.create()
                    val res = api.getTeam()
                    if (res.isSuccessful && res.body() != null) {
                        kotlinx.coroutines.withContext(kotlinx.coroutines.Dispatchers.Main) {
                            liveStaffList = res.body()!!.allStaff
                        }
                    }
                }
            } catch (e: Exception) { }
        }
    }

    val displayStaff = remember(liveStaffList) { liveStaffList }

    var selectedUsername by remember { mutableStateOf(initialUsername) }
    var password by remember { mutableStateOf("") }
    var showPassword by remember { mutableStateOf(false) }
    var rememberMe by remember { mutableStateOf(true) }
    var isDropdownOpen by remember { mutableStateOf(false) }

    val currentStaff = remember(displayStaff, selectedUsername) {
        displayStaff.find { it.username.equals(selectedUsername, ignoreCase = true) }
            ?: displayStaff.firstOrNull()
            ?: StaffMember(staffId = "SS-STAFF", username = selectedUsername, name = selectedUsername.replaceFirstChar { it.uppercase() }, role = "Designer", department = "Creative Production", avatarColor = "#0078D4", defaultBrand = "SSH")
    }

    // Animated Hero Aura, Wave Phase & Particle Drift
    val infiniteTransition = rememberInfiniteTransition(label = "heroMeshPulse")
    val pulseScale by infiniteTransition.animateFloat(
        initialValue = 0.92f,
        targetValue = 1.08f,
        animationSpec = infiniteRepeatable(
            animation = tween(4000, easing = FastOutSlowInEasing),
            repeatMode = RepeatMode.Reverse
        ),
        label = "pulseScale"
    )

    val wavePhase by infiniteTransition.animateFloat(
        initialValue = 0f,
        targetValue = (2 * Math.PI).toFloat(),
        animationSpec = infiniteRepeatable(
            animation = tween(6000, easing = LinearEasing),
            repeatMode = RepeatMode.Restart
        ),
        label = "wavePhase"
    )

    val driftProgress by infiniteTransition.animateFloat(
        initialValue = 0f,
        targetValue = 1f,
        animationSpec = infiniteRepeatable(
            animation = tween(12000, easing = LinearEasing),
            repeatMode = RepeatMode.Restart
        ),
        label = "driftProgress"
    )

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(
                brush = Brush.verticalGradient(
                    colors = listOf(
                        Color(0xFF022057), // Deep Cobalt Navy
                        Color(0xFF043388), // Royal Azure
                        Color(0xFF021233)  // Midnight Studio Abyss
                    )
                )
            )
    ) {
        // ── 1. Animated Hero Wave & Ambient Glowing Aura Canvas with Logomark & Men's Symbols ──
        Canvas(modifier = Modifier.fillMaxSize()) {
            val w = size.width
            val h = size.height

            // Ambient Radial Glow 1 (Azure Cyan at top center)
            drawCircle(
                brush = Brush.radialGradient(
                    colors = listOf(
                        Color(0xFF21A1F7).copy(alpha = 0.30f * pulseScale),
                        Color(0xFF0078D4).copy(alpha = 0.14f),
                        Color.Transparent
                    ),
                    center = Offset(w * 0.5f, h * 0.20f),
                    radius = w * 0.70f * pulseScale
                ),
                radius = w * 0.70f * pulseScale,
                center = Offset(w * 0.5f, h * 0.20f)
            )

            // Ambient Radial Glow 2 (Warm Gold hint at bottom right)
            drawCircle(
                brush = Brush.radialGradient(
                    colors = listOf(
                        Color(0xFFFCE53D).copy(alpha = 0.16f * pulseScale),
                        Color(0xFFD97706).copy(alpha = 0.06f),
                        Color.Transparent
                    ),
                    center = Offset(w * 0.88f, h * 0.80f),
                    radius = w * 0.50f
                ),
                radius = w * 0.50f,
                center = Offset(w * 0.88f, h * 0.80f)
            )

            // ── Floating Men's Symbols (Mars ♂) ──
            val mensSymbolsData = listOf(
                // xFraction, yBaseFraction, radius, speedMultiplier, xDriftAmp, alpha, rotationBase
                listOf(0.14f, 0.18f, 16f, 1.0f, 18f, 0.26f, -15f),
                listOf(0.86f, 0.24f, 22f, 0.8f, -22f, 0.22f, 20f),
                listOf(0.22f, 0.68f, 28f, 1.2f, 25f, 0.18f, -30f),
                listOf(0.80f, 0.72f, 18f, 0.9f, -15f, 0.24f, 10f),
                listOf(0.50f, 0.88f, 20f, 1.1f, 20f, 0.20f, -5f),
                listOf(0.08f, 0.45f, 24f, 0.7f, -18f, 0.16f, 35f),
                listOf(0.92f, 0.50f, 14f, 1.3f, 14f, 0.22f, -25f)
            )

            mensSymbolsData.forEach { data ->
                val xFrac = data[0]
                val yBaseFrac = data[1]
                val radius = data[2].dp.toPx()
                val speed = data[3]
                val xAmp = data[4].dp.toPx()
                val baseAlpha = data[5]
                val rotBase = data[6]

                // Dynamic vertical upward drift with wrapping
                val yPos = ((yBaseFrac - (driftProgress * speed)) % 1.0f).let { if (it < 0) it + 1.0f else it } * h
                val xPos = (xFrac * w) + (sin(wavePhase * speed + xFrac * 10f) * xAmp).toFloat()
                val dynamicAlpha = (baseAlpha * (0.8f + 0.4f * sin(wavePhase + xFrac * 5f))).toFloat().coerceIn(0.05f, 0.40f)
                val dynamicRot = rotBase + (sin(wavePhase * 0.5f + xFrac) * 12f).toFloat()

                // Draw Mars ♂ Glyph
                val strokeW = (radius * 0.18f).coerceAtLeast(1.8f.dp.toPx())
                val circleCenter = Offset(xPos - radius * 0.25f, yPos + radius * 0.25f)
                val circleRadius = radius * 0.55f

                // 1. Circle body
                drawCircle(
                    color = Color(0xFF38BDF8).copy(alpha = dynamicAlpha),
                    radius = circleRadius,
                    center = circleCenter,
                    style = Stroke(width = strokeW)
                )

                // 2. Diagonal Arrow shaft (45 degrees up-right + rotation)
                val arrowAngleRad = Math.toRadians((45.0 + dynamicRot)).toFloat()
                val startDist = circleRadius
                val endDist = radius * 1.05f
                val startX = circleCenter.x + (cos(arrowAngleRad) * startDist)
                val startY = circleCenter.y - (sin(arrowAngleRad) * startDist)
                val endX = circleCenter.x + (cos(arrowAngleRad) * endDist)
                val endY = circleCenter.y - (sin(arrowAngleRad) * endDist)

                drawLine(
                    color = Color(0xFF38BDF8).copy(alpha = dynamicAlpha),
                    start = Offset(startX, startY),
                    end = Offset(endX, endY),
                    strokeWidth = strokeW,
                    cap = StrokeCap.Round
                )

                // 3. Arrow head barbs
                val barbLen = radius * 0.42f
                val barbAngle1 = arrowAngleRad + Math.toRadians(140.0).toFloat()
                val barbAngle2 = arrowAngleRad - Math.toRadians(140.0).toFloat()

                drawLine(
                    color = Color(0xFF38BDF8).copy(alpha = dynamicAlpha),
                    start = Offset(endX, endY),
                    end = Offset(endX + cos(barbAngle1) * barbLen, endY - sin(barbAngle1) * barbLen),
                    strokeWidth = strokeW,
                    cap = StrokeCap.Round
                )
                drawLine(
                    color = Color(0xFF38BDF8).copy(alpha = dynamicAlpha),
                    start = Offset(endX, endY),
                    end = Offset(endX + cos(barbAngle2) * barbLen, endY - sin(barbAngle2) * barbLen),
                    strokeWidth = strokeW,
                    cap = StrokeCap.Round
                )
            }

            // ── Floating SuamiSihat Dual-S Logomark Wave Motifs ──
            val logomarkMotifs = listOf(
                // xFrac, yBaseFrac, scaleSize, speed, alpha, rot
                listOf(0.28f, 0.32f, 38f, 0.85f, 0.18f, 15f),
                listOf(0.72f, 0.15f, 48f, 0.70f, 0.14f, -20f),
                listOf(0.35f, 0.82f, 44f, 1.05f, 0.16f, -10f),
                listOf(0.82f, 0.42f, 32f, 0.95f, 0.20f, 25f)
            )

            logomarkMotifs.forEach { data ->
                val xFrac = data[0]
                val yBaseFrac = data[1]
                val sizePx = data[2].dp.toPx()
                val speed = data[3]
                val baseAlpha = data[4]
                val rot = data[5]

                val yPos = ((yBaseFrac - (driftProgress * speed)) % 1.0f).let { if (it < 0) it + 1.0f else it } * h
                val xPos = (xFrac * w) + (sin(wavePhase * speed + xFrac * 8f) * 16.dp.toPx()).toFloat()
                val dynAlpha = (baseAlpha * (0.85f + 0.35f * cos(wavePhase + xFrac * 6f))).toFloat().coerceIn(0.04f, 0.35f)

                rotate(degrees = rot + (sin(wavePhase * 0.4f) * 8f).toFloat(), pivot = Offset(xPos, yPos)) {
                    val sPath = Path()
                    val r = sizePx * 0.36f
                    val strokeW = 2.2.dp.toPx()

                    // Upper S-arc
                    sPath.reset()
                    sPath.moveTo(xPos, yPos - r)
                    sPath.cubicTo(
                        xPos + r * 1.2f, yPos - r,
                        xPos + r * 1.2f, yPos,
                        xPos, yPos
                    )
                    // Lower S-arc
                    sPath.cubicTo(
                        xPos - r * 1.2f, yPos,
                        xPos - r * 1.2f, yPos + r,
                        xPos, yPos + r
                    )

                    drawPath(
                        path = sPath,
                        color = Color(0xFF38BDF8).copy(alpha = dynAlpha),
                        style = Stroke(width = strokeW, cap = StrokeCap.Round)
                    )

                    // Interlocking Core Arc
                    val innerPath = Path()
                    innerPath.moveTo(xPos + r * 0.4f, yPos - r * 0.7f)
                    innerPath.cubicTo(
                        xPos - r * 0.6f, yPos - r * 0.4f,
                        xPos + r * 0.6f, yPos + r * 0.4f,
                        xPos - r * 0.4f, yPos + r * 0.7f
                    )
                    drawPath(
                        path = innerPath,
                        color = Color(0xFFFCE53D).copy(alpha = dynAlpha * 0.75f),
                        style = Stroke(width = strokeW * 0.75f, cap = StrokeCap.Round)
                    )
                }
            }

            // ── Animated Sine Wave Ribbons ──
            // Animated Sine Wave Ribbon 1 (Primary Cyan)
            val wavePath1 = Path()
            val baseLine1 = h * 0.26f
            wavePath1.moveTo(0f, baseLine1)
            for (x in 0..w.toInt() step 6) {
                val y = baseLine1 + (sin(x * 0.008f + wavePhase) * 22f).toFloat()
                wavePath1.lineTo(x.toFloat(), y)
            }
            drawPath(
                path = wavePath1,
                color = Color(0xFF38BDF8).copy(alpha = 0.45f),
                style = Stroke(width = 2.5.dp.toPx(), cap = StrokeCap.Round)
            )

            // Animated Sine Wave Ribbon 2 (Gold Accent)
            val wavePath2 = Path()
            val baseLine2 = h * 0.30f
            wavePath2.moveTo(0f, baseLine2)
            for (x in 0..w.toInt() step 6) {
                val y = baseLine2 + (sin(x * 0.006f - wavePhase * 0.8f) * 18f).toFloat()
                wavePath2.lineTo(x.toFloat(), y)
            }
            drawPath(
                path = wavePath2,
                color = Color(0xFFFCE53D).copy(alpha = 0.30f),
                style = Stroke(width = 1.5.dp.toPx(), cap = StrokeCap.Round)
            )
        }

        // ── 2. Foreground Login Content & Glassmorphism Card ──
        Column(
            modifier = Modifier
                .fillMaxSize()
                .statusBarsPadding()
                .navigationBarsPadding()
                .verticalScroll(scrollState)
                .padding(horizontal = 24.dp, vertical = 20.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.Center
        ) {
            Spacer(modifier = Modifier.height(12.dp))

            // Official SuamiSihat Logomark Header Emblem
            Box(
                modifier = Modifier
                    .size(80.dp)
                    .clip(CircleShape)
                    .background(
                        brush = Brush.radialGradient(
                            colors = listOf(
                                Color(0xFF043388),
                                Color(0xFF022057)
                            )
                        )
                    )
                    .border(
                        2.dp,
                        Brush.linearGradient(listOf(Color(0xFF38BDF8), Color(0xFF0078D4))),
                        CircleShape
                    ),
                contentAlignment = Alignment.Center
            ) {
                Image(
                    painter = painterResource(id = R.drawable.ic_suamisihat_logomark),
                    contentDescription = "SuamiSihat Logomark",
                    modifier = Modifier.size(62.dp)
                )
            }

            Spacer(modifier = Modifier.height(14.dp))

            Text(
                text = "Welcome to SS-CAM",
                fontSize = 22.sp,
                fontWeight = FontWeight.Bold,
                color = Color.White,
                letterSpacing = 0.5.sp
            )

            Text(
                text = "SuamiSihat Creative Asset Management",
                fontSize = 12.sp,
                color = Color(0xFF94A3B8),
                fontWeight = FontWeight.Normal
            )

            Spacer(modifier = Modifier.height(24.dp))

            // Glassmorphism Card Container
            Surface(
                color = Color(0xFF0B1528).copy(alpha = 0.88f),
                shape = RoundedCornerShape(24.dp),
                border = androidx.compose.foundation.BorderStroke(1.dp, Color(0xFF38BDF8).copy(alpha = 0.30f)),
                shadowElevation = 8.dp,
                modifier = Modifier.fillMaxWidth()
            ) {
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(22.dp)
                ) {
                    // Error message alert if present
                    if (!errorMessage.isNullOrBlank()) {
                        Surface(
                            color = Color(0xFFEF4444).copy(alpha = 0.15f),
                            shape = RoundedCornerShape(10.dp),
                            border = androidx.compose.foundation.BorderStroke(1.dp, Color(0xFFEF4444).copy(alpha = 0.5f)),
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(bottom = 14.dp)
                        ) {
                            Row(
                                modifier = Modifier.padding(horizontal = 12.dp, vertical = 8.dp),
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Icon(
                                    Icons.Default.ErrorOutline,
                                    contentDescription = null,
                                    tint = Color(0xFFF87171),
                                    modifier = Modifier.size(16.dp)
                                )
                                Spacer(modifier = Modifier.width(8.dp))
                                Text(
                                    text = errorMessage,
                                    fontSize = 12.sp,
                                    color = Color(0xFFFCA5A5),
                                    fontWeight = FontWeight.Medium
                                )
                            }
                        }
                    }

                    // Field 1: User Account Profile Selector (Profile Pic, Name & ID Badge Only)
                    Text(
                        text = "SELECT DESIGNER ACCOUNT",
                        fontSize = 10.sp,
                        fontWeight = FontWeight.Bold,
                        color = Color(0xFF94A3B8),
                        letterSpacing = 0.6.sp
                    )

                    Spacer(modifier = Modifier.height(6.dp))

                    // Dropdown Trigger Pill
                    ExposedDropdownMenuBox(
                        expanded = isDropdownOpen,
                        onExpandedChange = { isDropdownOpen = !isDropdownOpen }
                    ) {
                        Surface(
                            color = Color(0xFF132238),
                            shape = RoundedCornerShape(14.dp),
                            border = androidx.compose.foundation.BorderStroke(1.dp, Color(0xFF334155)),
                            modifier = Modifier
                                .fillMaxWidth()
                                .menuAnchor(MenuAnchorType.PrimaryNotEditable, true)
                        ) {
                            Row(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .padding(horizontal = 14.dp, vertical = 12.dp),
                                verticalAlignment = Alignment.CenterVertically,
                                horizontalArrangement = Arrangement.SpaceBetween
                            ) {
                                Row(
                                    verticalAlignment = Alignment.CenterVertically,
                                    modifier = Modifier.weight(1f)
                                ) {
                                    UserProfileAvatar(
                                        imageUrl = currentStaff.avatarUrl,
                                        initials = currentStaff.name,
                                        avatarColorHex = currentStaff.avatarColor,
                                        size = 36.dp
                                    )
                                    Spacer(modifier = Modifier.width(12.dp))
                                    Text(
                                        text = currentStaff.name,
                                        fontSize = 15.sp,
                                        fontWeight = FontWeight.Bold,
                                        color = Color.White
                                    )
                                    Spacer(modifier = Modifier.width(8.dp))
                                    Surface(
                                        color = Color(0xFF0078D4).copy(alpha = 0.25f),
                                        shape = RoundedCornerShape(6.dp),
                                        border = androidx.compose.foundation.BorderStroke(0.5.dp, Color(0xFF38BDF8).copy(alpha = 0.5f))
                                    ) {
                                        Text(
                                            text = currentStaff.staffId,
                                            fontSize = 10.sp,
                                            fontWeight = FontWeight.Bold,
                                            color = Color(0xFF38BDF8),
                                            modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp)
                                        )
                                    }
                                }

                                Icon(
                                    imageVector = if (isDropdownOpen) Icons.Default.KeyboardArrowUp else Icons.Default.KeyboardArrowDown,
                                    contentDescription = "Select User",
                                    tint = Color(0xFF94A3B8),
                                    modifier = Modifier.size(20.dp)
                                )
                            }
                        }

                        ExposedDropdownMenu(
                            expanded = isDropdownOpen,
                            onDismissRequest = { isDropdownOpen = false },
                            modifier = Modifier
                                .background(Color(0xFF0F172A))
                                .border(1.dp, Color(0xFF334155), RoundedCornerShape(12.dp))
                        ) {
                            displayStaff.forEach { staff ->
                                val isSelected = staff.username.equals(selectedUsername, ignoreCase = true)
                                DropdownMenuItem(
                                    text = {
                                        Row(
                                            verticalAlignment = Alignment.CenterVertically,
                                            modifier = Modifier.fillMaxWidth()
                                        ) {
                                            UserProfileAvatar(
                                                imageUrl = staff.avatarUrl,
                                                initials = staff.name,
                                                avatarColorHex = staff.avatarColor,
                                                size = 32.dp
                                            )
                                            Spacer(modifier = Modifier.width(12.dp))
                                            Text(
                                                text = staff.name,
                                                fontSize = 14.sp,
                                                fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Medium,
                                                color = if (isSelected) Color(0xFF38BDF8) else Color.White
                                            )
                                            Spacer(modifier = Modifier.width(8.dp))
                                            Surface(
                                                color = Color(0xFF0078D4).copy(alpha = 0.20f),
                                                shape = RoundedCornerShape(5.dp),
                                                border = androidx.compose.foundation.BorderStroke(0.5.dp, Color(0xFF38BDF8).copy(alpha = 0.4f))
                                            ) {
                                                Text(
                                                    text = staff.staffId,
                                                    fontSize = 10.sp,
                                                    fontWeight = FontWeight.Bold,
                                                    color = Color(0xFF38BDF8),
                                                    modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp)
                                                )
                                            }
                                        }
                                    },
                                    onClick = {
                                        selectedUsername = staff.username
                                        isDropdownOpen = false
                                        try { haptic.performHapticFeedback(HapticFeedbackType.LongPress) } catch (e: Exception) {}
                                    },
                                    colors = MenuDefaults.itemColors(
                                        textColor = Color.White
                                    )
                                )
                            }
                        }
                    }

                    Spacer(modifier = Modifier.height(16.dp))

                    // Field 2: Password Input
                    Text(
                        text = "PASSWORD",
                        fontSize = 10.sp,
                        fontWeight = FontWeight.Bold,
                        color = Color(0xFF94A3B8),
                        letterSpacing = 0.6.sp
                    )

                    Spacer(modifier = Modifier.height(6.dp))

                    Surface(
                        color = Color(0xFF132238),
                        shape = RoundedCornerShape(14.dp),
                        border = androidx.compose.foundation.BorderStroke(1.dp, Color(0xFF334155)),
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(horizontal = 12.dp, vertical = 2.dp),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Icon(
                                Icons.Default.Lock,
                                contentDescription = null,
                                tint = Color(0xFF94A3B8),
                                modifier = Modifier.size(18.dp)
                            )
                            Spacer(modifier = Modifier.width(10.dp))
                            TextField(
                                value = password,
                                onValueChange = { password = it },
                                placeholder = {
                                    Text(
                                        "Enter password (optional on studio NAS)",
                                        fontSize = 12.sp,
                                        color = Color(0xFF64748B)
                                    )
                                },
                                visualTransformation = if (showPassword) VisualTransformation.None else PasswordVisualTransformation(),
                                keyboardOptions = KeyboardOptions(imeAction = ImeAction.Done),
                                keyboardActions = KeyboardActions(
                                    onDone = {
                                        if (!isLoading) {
                                            onLogin(selectedUsername, password, rememberMe)
                                        }
                                    }
                                ),
                                colors = TextFieldDefaults.colors(
                                    focusedContainerColor = Color.Transparent,
                                    unfocusedContainerColor = Color.Transparent,
                                    disabledContainerColor = Color.Transparent,
                                    focusedIndicatorColor = Color.Transparent,
                                    unfocusedIndicatorColor = Color.Transparent,
                                    focusedTextColor = Color.White,
                                    unfocusedTextColor = Color.White,
                                    cursorColor = Color(0xFF38BDF8)
                                ),
                                singleLine = true,
                                modifier = Modifier.weight(1f)
                            )
                            IconButton(
                                onClick = { showPassword = !showPassword },
                                modifier = Modifier.size(32.dp)
                            ) {
                                Icon(
                                    imageVector = if (showPassword) Icons.Default.Visibility else Icons.Default.VisibilityOff,
                                    contentDescription = "Toggle password visibility",
                                    tint = Color(0xFF94A3B8),
                                    modifier = Modifier.size(18.dp)
                                )
                            }
                        }
                    }

                    Spacer(modifier = Modifier.height(14.dp))

                    // Remember Me Row
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .clickable(
                                interactionSource = remember { MutableInteractionSource() },
                                indication = null
                            ) {
                                rememberMe = !rememberMe
                            },
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Checkbox(
                            checked = rememberMe,
                            onCheckedChange = { rememberMe = it },
                            colors = CheckboxDefaults.colors(
                                checkedColor = Color(0xFF0078D4),
                                uncheckedColor = Color(0xFF64748B),
                                checkmarkColor = Color.White
                            ),
                            modifier = Modifier.size(24.dp)
                        )
                        Spacer(modifier = Modifier.width(8.dp))
                        Text(
                            text = "Remember me on this workstation",
                            fontSize = 12.sp,
                            color = Color(0xFFCBD5E1),
                            fontWeight = FontWeight.Medium
                        )
                    }

                    Spacer(modifier = Modifier.height(18.dp))

                    // Sign In Primary Button
                    Button(
                        onClick = {
                            try { haptic.performHapticFeedback(HapticFeedbackType.LongPress) } catch (e: Exception) {}
                            onLogin(selectedUsername, password, rememberMe)
                        },
                        enabled = !isLoading,
                        shape = RoundedCornerShape(14.dp),
                        colors = ButtonDefaults.buttonColors(
                            containerColor = Color(0xFF0078D4),
                            disabledContainerColor = Color(0xFF0078D4).copy(alpha = 0.5f)
                        ),
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(48.dp)
                    ) {
                        if (isLoading) {
                            CircularProgressIndicator(
                                color = Color.White,
                                strokeWidth = 2.dp,
                                modifier = Modifier.size(20.dp)
                            )
                            Spacer(modifier = Modifier.width(8.dp))
                            Text(
                                text = "Authenticating with NAS...",
                                fontSize = 14.sp,
                                fontWeight = FontWeight.Bold,
                                color = Color.White
                            )
                        } else {
                            Text(
                                text = "Sign In to Studio",
                                fontSize = 14.sp,
                                fontWeight = FontWeight.Bold,
                                color = Color.White
                            )
                            Spacer(modifier = Modifier.width(8.dp))
                            Icon(
                                Icons.AutoMirrored.Filled.ArrowForward,
                                contentDescription = null,
                                tint = Color.White,
                                modifier = Modifier.size(16.dp)
                            )
                        }
                    }
                }
            }

            Spacer(modifier = Modifier.height(24.dp))

            // Official 2026 Brand Footer
            Text(
                text = "2026® SuamiSihat Holding Sdn Bhd • Creative-Team",
                fontSize = 11.sp,
                color = Color(0xFF64748B),
                fontWeight = FontWeight.Medium
            )

            Spacer(modifier = Modifier.height(16.dp))
        }
    }
}
