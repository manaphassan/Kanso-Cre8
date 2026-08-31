package com.suamisihat.sscam.ui.components

import androidx.compose.animation.core.Animatable
import androidx.compose.animation.core.FastOutSlowInEasing
import androidx.compose.animation.core.LinearEasing
import androidx.compose.animation.core.RepeatMode
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.tween
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowForward
import androidx.compose.material.icons.filled.FiberManualRecord
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.scale
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.drawscope.DrawScope
import androidx.compose.ui.graphics.drawscope.Fill
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.graphics.drawscope.withTransform
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.suamisihat.sscam.R
import com.suamisihat.sscam.ui.theme.SshAzure
import com.suamisihat.sscam.ui.theme.SshPrussianBlue
import com.suamisihat.sscam.ui.theme.SshWarmGold
import com.suamisihat.sscam.ui.theme.SshWarmGoldBright
import kotlinx.coroutines.delay
import kotlin.math.sin

enum class HeroParticleType {
    MEN_SYMBOL,
    SHARD,
    BRAND_BADGE,
    DUST
}

data class HeroParticle(
    var xRatio: Float,
    var yRatio: Float,
    val speedY: Float,
    val sizeDp: Float,
    val alpha: Float,
    var rotation: Float,
    val vRot: Float,
    val type: HeroParticleType
)

/**
 * Standard SuamiSihat ss-hero Splash Screen.
 * Renders the full interactive wave & particle canvas, ambient glow backdrop,
 * floating Mars/Men symbols (♂), gold shards, Fluent eyebrow badge, and title lockup.
 */
@Composable
fun SsHeroSplashScreen(
    onSplashFinished: () -> Unit
) {
    val density = LocalDensity.current
    val infiniteTransition = rememberInfiniteTransition(label = "hero_anim")
    val waveStep by infiniteTransition.animateFloat(
        initialValue = 0f,
        targetValue = 6.28318f, // 2 * PI
        animationSpec = infiniteRepeatable(
            animation = tween(4000, easing = LinearEasing),
            repeatMode = RepeatMode.Restart
        ),
        label = "wave_step"
    )

    val ambientGlowScale by infiniteTransition.animateFloat(
        initialValue = 0.88f,
        targetValue = 1.12f,
        animationSpec = infiniteRepeatable(
            animation = tween(2600, easing = FastOutSlowInEasing),
            repeatMode = RepeatMode.Reverse
        ),
        label = "ambient_glow_scale"
    )

    val contentAlpha = remember { Animatable(0f) }
    val contentScale = remember { Animatable(0.92f) }

    // Floating particles including Men's Symbols (♂), Shards, and Dust
    val particles = remember {
        val list = mutableListOf<HeroParticle>()
        // 1. Men's Symbols (♂) - 8 instances positioned nicely across screen
        val menPositions = listOf(
            Pair(0.12f, 0.18f),
            Pair(0.85f, 0.15f),
            Pair(0.20f, 0.42f),
            Pair(0.80f, 0.45f),
            Pair(0.10f, 0.75f),
            Pair(0.88f, 0.70f),
            Pair(0.35f, 0.82f),
            Pair(0.65f, 0.85f)
        )
        menPositions.forEachIndexed { i, pos ->
            list.add(
                HeroParticle(
                    xRatio = pos.first,
                    yRatio = pos.second,
                    speedY = 0.0005f + (i % 3) * 0.0003f,
                    sizeDp = 28f + (i % 3) * 8f, // 28dp to 44dp
                    alpha = 0.45f + (i % 3) * 0.15f,
                    rotation = (i * 45f) % 360f,
                    vRot = (if (i % 2 == 0) 0.35f else -0.35f),
                    type = HeroParticleType.MEN_SYMBOL
                )
            )
        }
        // 2. Gold Shards - 8 instances
        val shardPositions = listOf(
            Pair(0.25f, 0.22f),
            Pair(0.72f, 0.28f),
            Pair(0.15f, 0.58f),
            Pair(0.82f, 0.55f),
            Pair(0.48f, 0.12f),
            Pair(0.52f, 0.78f),
            Pair(0.28f, 0.88f),
            Pair(0.75f, 0.90f)
        )
        shardPositions.forEachIndexed { i, pos ->
            list.add(
                HeroParticle(
                    xRatio = pos.first,
                    yRatio = pos.second,
                    speedY = 0.0007f + (i % 3) * 0.0004f,
                    sizeDp = 14f + (i % 3) * 6f, // 14dp to 26dp
                    alpha = 0.40f + (i % 3) * 0.18f,
                    rotation = (i * 30f) % 360f,
                    vRot = (if (i % 2 == 0) -0.5f else 0.5f),
                    type = HeroParticleType.SHARD
                )
            )
        }
        // 3. Ambient Glowing Dust - 12 instances
        for (i in 0 until 12) {
            list.add(
                HeroParticle(
                    xRatio = (i * 0.08f + 0.04f) % 1f,
                    yRatio = (i * 0.09f + 0.10f) % 1f,
                    speedY = 0.0004f + (i % 3) * 0.0002f,
                    sizeDp = 4f + (i % 3) * 2f,
                    alpha = 0.35f + (i % 3) * 0.15f,
                    rotation = 0f,
                    vRot = 0f,
                    type = HeroParticleType.DUST
                )
            )
        }
        list
    }

    LaunchedEffect(Unit) {
        contentAlpha.animateTo(1f, tween(700, easing = FastOutSlowInEasing))
        contentScale.animateTo(1f, tween(700, easing = FastOutSlowInEasing))
        // 4.5 seconds showcase time
        delay(4500)
        contentAlpha.animateTo(0f, tween(400))
        onSplashFinished()
    }

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(Color(0xFF070D18)) // OLED Deep Obsidian
    ) {
        // 1. Ambient Glow Backdrop (f-hero-ambient-glow)
        Box(
            modifier = Modifier
                .align(Alignment.Center)
                .size(360.dp)
                .scale(ambientGlowScale)
                .background(
                    Brush.radialGradient(
                        colors = listOf(
                            SshAzure.copy(alpha = 0.25f),
                            SshPrussianBlue.copy(alpha = 0.20f),
                            SshWarmGold.copy(alpha = 0.10f),
                            Color.Transparent
                        )
                    ),
                    shape = CircleShape
                )
        )

        // 2. Interactive Wave & Particle Canvas Background (heroWaveCanvas)
        Canvas(
            modifier = Modifier.fillMaxSize()
        ) {
            val w = size.width
            val h = size.height

            // A. Draw Floating Men's Symbols (♂), Shards, and Ambient Dust
            particles.forEach { p ->
                p.yRatio -= p.speedY
                if (p.yRatio < 0f) p.yRatio = 1f
                p.rotation += p.vRot

                val px = p.xRatio * w
                val py = p.yRatio * h
                val pSizePx = p.sizeDp * density.density

                when (p.type) {
                    HeroParticleType.MEN_SYMBOL -> {
                        drawMenSymbol(
                            x = px,
                            y = py,
                            size = pSizePx,
                            alpha = p.alpha,
                            rotationDegrees = p.rotation
                        )
                    }
                    HeroParticleType.SHARD -> {
                        drawShard(
                            x = px,
                            y = py,
                            size = pSizePx,
                            alpha = p.alpha,
                            rotationDegrees = p.rotation
                        )
                    }
                    HeroParticleType.BRAND_BADGE, HeroParticleType.DUST -> {
                        val color = if (p.yRatio > 0.5f) SshWarmGoldBright.copy(alpha = p.alpha) else SshAzure.copy(alpha = p.alpha)
                        drawCircle(
                            color = color,
                            radius = pSizePx / 2f,
                            center = Offset(px, py)
                        )
                    }
                }
            }

            // B. Layer 1: Base Dark Prussian Wave
            val path1 = Path()
            val base1Y = h * 0.72f
            path1.moveTo(0f, h)
            path1.lineTo(0f, base1Y)
            var x = 0f
            while (x <= w) {
                val y = base1Y + sin(x * 0.008f + waveStep * 0.8f) * 38f
                path1.lineTo(x, y)
                x += 10f
            }
            path1.lineTo(w, h)
            path1.close()
            drawPath(
                path = path1,
                brush = Brush.verticalGradient(
                    colors = listOf(SshPrussianBlue.copy(alpha = 0.40f), Color(0xFF0F172A).copy(alpha = 0.70f)),
                    startY = base1Y - 40f,
                    endY = h
                )
            )

            // C. Layer 2: Glowing Cyan / Azure Middle Wave
            val path2 = Path()
            val base2Y = h * 0.68f
            path2.moveTo(0f, h)
            path2.lineTo(0f, base2Y)
            x = 0f
            while (x <= w) {
                val y = base2Y + sin(x * 0.012f - waveStep * 1.2f) * 26f
                path2.lineTo(x, y)
                x += 10f
            }
            path2.lineTo(w, h)
            path2.close()
            drawPath(
                path = path2,
                brush = Brush.verticalGradient(
                    colors = listOf(SshAzure.copy(alpha = 0.32f), Color.Transparent),
                    startY = base2Y - 30f,
                    endY = h
                )
            )

            // D. Layer 3: Gold Accent Crest Stroke
            val path3 = Path()
            val base3Y = h * 0.76f
            path3.moveTo(0f, base3Y)
            x = 0f
            while (x <= w) {
                val y = base3Y + sin(x * 0.006f + waveStep * 0.5f) * 44f
                path3.lineTo(x, y)
                x += 10f
            }
            drawPath(
                path = path3,
                color = SshWarmGoldBright.copy(alpha = 0.55f),
                style = Stroke(width = 3f)
            )
        }

        // 3. Hero Content Inner Box (f-hero-inner)
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(horizontal = 24.dp, vertical = 40.dp)
                .alpha(contentAlpha.value)
                .scale(contentScale.value),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.SpaceBetween
        ) {
            // Top Eyebrow Badge
            Surface(
                color = Color.White.copy(alpha = 0.06f),
                shape = RoundedCornerShape(20.dp),
                border = androidx.compose.foundation.BorderStroke(1.dp, SshAzure.copy(alpha = 0.35f)),
                modifier = Modifier.padding(top = 28.dp)
            ) {
                Row(
                    modifier = Modifier.padding(horizontal = 14.dp, vertical = 6.dp),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(6.dp)
                ) {
                    Icon(
                        Icons.Default.FiberManualRecord,
                        contentDescription = null,
                        tint = SshAzure,
                        modifier = Modifier.size(10.dp)
                    )
                    Text(
                        text = "Design System — SuamiSihat™",
                        fontSize = 11.sp,
                        fontWeight = FontWeight.SemiBold,
                        color = Color.White.copy(alpha = 0.9f),
                        letterSpacing = 0.5.sp
                    )
                }
            }

            // Center Brand Lockup & Hero Typography
            Column(
                horizontalAlignment = Alignment.CenterHorizontally,
                verticalArrangement = Arrangement.spacedBy(16.dp)
            ) {
                // SuamiSihat Logo on Dark Shield
                Box(
                    modifier = Modifier
                        .size(90.dp)
                        .clip(CircleShape)
                        .background(
                            Brush.linearGradient(
                                colors = listOf(SshPrussianBlue, Color(0xFF0F172A))
                            )
                        )
                        .border(1.5.dp, SshAzure.copy(alpha = 0.6f), CircleShape),
                    contentAlignment = Alignment.Center
                ) {
                    Image(
                        painter = painterResource(id = R.drawable.ic_suamisihat_logomark),
                        contentDescription = "SuamiSihat",
                        modifier = Modifier.size(54.dp)
                    )
                }

                Spacer(modifier = Modifier.height(4.dp))

                // Hero Title
                Text(
                    text = "Ship the SuamiSihat™\nbrand faster and better.",
                    fontSize = 24.sp,
                    fontWeight = FontWeight.Bold,
                    color = Color.White,
                    textAlign = TextAlign.Center,
                    lineHeight = 32.sp
                )

                // Hero Subtitle
                Text(
                    text = "The standard background banner component for all hero headers.",
                    fontSize = 12.sp,
                    fontWeight = FontWeight.Medium,
                    color = Color.White.copy(alpha = 0.65f),
                    textAlign = TextAlign.Center,
                    lineHeight = 18.sp,
                    modifier = Modifier.padding(horizontal = 16.dp)
                )
            }

            // Bottom CTA / Explore Brand System Button
            Button(
                onClick = { onSplashFinished() },
                colors = ButtonDefaults.buttonColors(
                    containerColor = SshAzure
                ),
                shape = RoundedCornerShape(24.dp),
                modifier = Modifier
                    .fillMaxWidth(0.82f)
                    .height(48.dp)
            ) {
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    Text(
                        text = "Explore Brand System",
                        fontSize = 13.sp,
                        fontWeight = FontWeight.Bold,
                        color = Color.White
                    )
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
}

/**
 * Draws the canonical SuamiSihat Men's Symbol (♂) on the canvas
 */
private fun DrawScope.drawMenSymbol(
    x: Float,
    y: Float,
    size: Float,
    alpha: Float,
    rotationDegrees: Float
) {
    withTransform({
        translate(x, y)
        rotate(rotationDegrees, pivot = Offset.Zero)
    }) {
        val r = size * 0.36f
        val strokeW = (size * 0.08f).coerceIn(2.0f, 4.5f)
        val color = SshAzure.copy(alpha = alpha.coerceIn(0.2f, 0.85f))

        // 1. Center Circle Ring
        drawCircle(
            color = color,
            radius = r,
            center = Offset(0f, r * 0.35f),
            style = Stroke(width = strokeW)
        )

        // 2. Diagonal Arrow Line (pointing top-right at 45 deg)
        val arrowLen = size * 0.70f
        val startX = r * 0.65f
        val startY = -r * 0.25f
        val endX = startX + arrowLen * 0.7071f
        val endY = startY - arrowLen * 0.7071f

        drawLine(
            color = color,
            start = Offset(startX, startY),
            end = Offset(endX, endY),
            strokeWidth = strokeW
        )

        // 3. Arrowhead Bar 1 & 2
        val headLen = size * 0.30f
        drawLine(
            color = color,
            start = Offset(endX - headLen, endY),
            end = Offset(endX, endY),
            strokeWidth = strokeW
        )
        drawLine(
            color = color,
            start = Offset(endX, endY),
            end = Offset(endX, endY + headLen),
            strokeWidth = strokeW
        )
    }
}

/**
 * Draws the gold diamond/rhombus shard on the canvas
 */
private fun DrawScope.drawShard(
    x: Float,
    y: Float,
    size: Float,
    alpha: Float,
    rotationDegrees: Float
) {
    withTransform({
        translate(x, y)
        rotate(rotationDegrees, pivot = Offset.Zero)
    }) {
        val color = SshWarmGoldBright.copy(alpha = (alpha * 0.85f).coerceIn(0.2f, 0.9f))
        val path = Path().apply {
            moveTo(0f, -size / 2f)
            lineTo(size / 3f, size / 2f)
            lineTo(-size / 3f, size / 2f)
            close()
        }
        drawPath(path = path, color = color, style = Fill)
    }
}
