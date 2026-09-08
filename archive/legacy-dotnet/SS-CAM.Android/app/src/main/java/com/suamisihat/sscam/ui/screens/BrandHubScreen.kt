package com.suamisihat.sscam.ui.screens

import android.content.ClipData
import android.content.ClipboardManager
import android.content.Context
import android.widget.Toast
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
import androidx.compose.material.icons.filled.ContentCopy
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.suamisihat.sscam.ui.components.FluentCard
import com.suamisihat.sscam.ui.components.FluentSectionHeader
import com.suamisihat.sscam.ui.components.FluentSegmentedPillControl
import com.suamisihat.sscam.ui.theme.*

data class SubsidiaryBrand(
    val code: String,
    val name: String,
    val desc: String,
    val primaryColor: Color,
    val primaryHex: String,
    val accentColor: Color,
    val accentHex: String,
    val targetAudience: String
)

data class CopySnippet(
    val category: String,
    val hook: String,
    val body: String,
    val cta: String
)

data class MediaSpec(
    val formatName: String,
    val aspect: String,
    val resolution: String,
    val useCase: String,
    val icon: String
)

@Composable
fun BrandHubScreen() {
    val context = LocalContext.current
    val colors = LocalSscamColors.current

    var selectedSubTab by remember { mutableStateOf(0) }
    val subTabs = listOf("🎨 Color Tokens", "📐 Media Specs", "✍️ Copy Hooks")

    fun copyToClipboard(text: String, label: String) {
        val clipboard = context.getSystemService(Context.CLIPBOARD_SERVICE) as ClipboardManager
        val clip = ClipData.newPlainText(label, text)
        clipboard.setPrimaryClip(clip)
        Toast.makeText(context, "Copied $text ($label) to clipboard!", Toast.LENGTH_SHORT).show()
    }

    val subsidiaries = remember {
        listOf(
            SubsidiaryBrand("SSH", "SuamiSihat Holding", "Corporate Group & Executive", Color(0xFF022057), "#022057", SshWarmGoldBright, "#D4AF37", "Executives, Stakeholders & Master Brand"),
            SubsidiaryBrand("SSC", "SuamiSihat Care", "Clinical Healthcare & Consultation", Color(0xFF0066CC), "#0066CC", Color(0xFF38BDF8), "#38BDF8", "Patients, Medical & Sexual Health Consultations"),
            SubsidiaryBrand("SSW", "SuamiSihat Wellness", "Holistic Nutrition & Herbal Health", Color(0xFF0F766E), "#0F766E", Color(0xFF34D399), "#34D399", "Active Men, Daily Supplements & Longevity"),
            SubsidiaryBrand("SSE", "SuamiSihat E-Commerce", "Digital Retail & Fast Consumer Goods", Color(0xFFD97706), "#D97706", Color(0xFFFBBF24), "#FBBF24", "Shopee, TikTok Shop & Direct Deliveries"),
            SubsidiaryBrand("SST", "SuamiSihat Tech", "Digital Innovation & Platform Systems", Color(0xFFDC2626), "#DC2626", Color(0xFFF87171), "#F87171", "Engineering, Apps & Workflow Automation")
        )
    }

    val mediaSpecs = remember {
        listOf(
            MediaSpec("TikTok / Reels / Shorts", "9:16", "1080 × 1920 px", "Full-screen vertical motion video & hooks", "🎬"),
            MediaSpec("Instagram Feed Square", "1:1", "1080 × 1080 px", "Carousel graphics & single product posts", "🖼️"),
            MediaSpec("Meta / IG Portrait", "4:5", "1080 × 1350 px", "Feed-filling high CTR mobile ad banners", "📱"),
            MediaSpec("YouTube / Web Master", "16:9", "1920 × 1080 px", "Landscape video, tutorial & web hero", "🖥️"),
            MediaSpec("Packaging Dieline", "Vector / Print", "300 DPI CMYK", "Physical product box, pouch & bottle labels", "📦")
        )
    }

    val copySnippets = remember {
        listOf(
            CopySnippet(
                "⚡ High-Energy Hook",
                "3 Tanda Tenaga Lelaki Merosot & Cara Pulihkan Dalam 14 Hari",
                "Ramai lelaki abaikan simptom awal seperti cepat letih waktu petang, hilang fokus kerja, dan prestasi menurun. Formula klinikal SuamiSihat dirumus khas dengan herba gred premium.",
                "Dapatkan Tawaran Merdeka Hari Ini"
            ),
            CopySnippet(
                "🌿 Natural Herbal Formula",
                "Rahsia Ketahanan Lelaki Berprestasi Tanpa Bahan Kimia Terlarang",
                "100% ekstrak semulajadi lulus KKM. Disokong ujian makmal untuk memastikan stamina dan aliran darah optimum sepanjang hari.",
                "Konsultasi Percuma Bersama Pakar"
            ),
            CopySnippet(
                "🔥 Flash Sale / Promo",
                "Jualan Kilat SuamiSihat: Jimat Sehingga 40% + Hadiah Percuma",
                "Stok terhad untuk 100 pembeli terawal sahaja. Penghantaran pantas terus ke pintu rumah anda dengan bungkusan rahsia.",
                "Beli Sekarang di TikTok Shop"
            )
        )
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(horizontal = 16.dp, vertical = 12.dp)
    ) {
        // Sub-Tab Switcher
        FluentSegmentedPillControl(
            options = subTabs,
            selectedIndex = selectedSubTab,
            onOptionSelected = { selectedSubTab = it },
            modifier = Modifier.padding(bottom = 12.dp)
        )

        when (selectedSubTab) {
            0 -> {
                // 🎨 COLOR TOKENS & SUBSIDIARIES
                LazyColumn(
                    modifier = Modifier.fillMaxSize(),
                    verticalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    item {
                        FluentCard(modifier = Modifier.fillMaxWidth()) {
                            Column(modifier = Modifier.padding(16.dp)) {
                                Text("60:30:10 COLOR HIERARCHY RULE", fontSize = 11.sp, fontWeight = FontWeight.Bold, color = colors.primary)
                                Spacer(modifier = Modifier.height(4.dp))
                                Text("Official SuamiSihat Palette Standard", fontSize = 16.sp, fontWeight = FontWeight.Bold, color = colors.textPrimary)
                                Spacer(modifier = Modifier.height(6.dp))
                                Text("• 60% Canvas & Foundation (Breathing Room)\n• 30% Structural Surfaces & Cards\n• 10% High-Impact Conversion Accent", fontSize = 12.sp, color = colors.textSecondary)
                            }
                        }
                    }

                    item {
                        FluentSectionHeader(title = "Holding Subsidiaries & Design Tokens", trailingText = "Tap Hex to Copy")
                    }

                    items(subsidiaries) { sub ->
                        FluentCard(modifier = Modifier.fillMaxWidth()) {
                            Column(modifier = Modifier.padding(14.dp)) {
                                Row(
                                    modifier = Modifier.fillMaxWidth(),
                                    horizontalArrangement = Arrangement.SpaceBetween,
                                    verticalAlignment = Alignment.CenterVertically
                                ) {
                                    Row(verticalAlignment = Alignment.CenterVertically) {
                                        Box(
                                            modifier = Modifier
                                                .size(32.dp)
                                                .clip(RoundedCornerShape(8.dp))
                                                .background(sub.primaryColor),
                                            contentAlignment = Alignment.Center
                                        ) {
                                            Text(sub.code, color = Color.White, fontWeight = FontWeight.Bold, fontSize = 11.sp)
                                        }
                                        Spacer(modifier = Modifier.width(10.dp))
                                        Column {
                                            Text(sub.name, fontSize = 14.sp, fontWeight = FontWeight.Bold, color = colors.textPrimary)
                                            Text(sub.desc, fontSize = 11.sp, color = colors.textSecondary)
                                        }
                                    }
                                }

                                Spacer(modifier = Modifier.height(10.dp))

                                // Color Swatches Row
                                Row(
                                    modifier = Modifier.fillMaxWidth(),
                                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                                ) {
                                    // Primary Swatch
                                    Row(
                                        modifier = Modifier
                                            .weight(1f)
                                            .clip(RoundedCornerShape(8.dp))
                                            .background(if (colors.isDark) Color(0xFF1E293B) else Color(0xFFF1F5F9))
                                            .border(1.dp, colors.border, RoundedCornerShape(8.dp))
                                            .clickable { copyToClipboard(sub.primaryHex, "${sub.code} Primary") }
                                            .padding(horizontal = 8.dp, vertical = 6.dp),
                                        verticalAlignment = Alignment.CenterVertically
                                    ) {
                                        Box(modifier = Modifier.size(16.dp).clip(CircleShape).background(sub.primaryColor))
                                        Spacer(modifier = Modifier.width(6.dp))
                                        Column {
                                            Text("Primary", fontSize = 9.sp, color = colors.textSecondary)
                                            Text(sub.primaryHex, fontSize = 11.sp, fontWeight = FontWeight.Bold, color = colors.textPrimary)
                                        }
                                    }

                                    // Accent Swatch
                                    Row(
                                        modifier = Modifier
                                            .weight(1f)
                                            .clip(RoundedCornerShape(8.dp))
                                            .background(if (colors.isDark) Color(0xFF1E293B) else Color(0xFFF1F5F9))
                                            .border(1.dp, colors.border, RoundedCornerShape(8.dp))
                                            .clickable { copyToClipboard(sub.accentHex, "${sub.code} Accent") }
                                            .padding(horizontal = 8.dp, vertical = 6.dp),
                                        verticalAlignment = Alignment.CenterVertically
                                    ) {
                                        Box(modifier = Modifier.size(16.dp).clip(CircleShape).background(sub.accentColor))
                                        Spacer(modifier = Modifier.width(6.dp))
                                        Column {
                                            Text("Accent (10%)", fontSize = 9.sp, color = colors.textSecondary)
                                            Text(sub.accentHex, fontSize = 11.sp, fontWeight = FontWeight.Bold, color = colors.textPrimary)
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
            1 -> {
                // 📐 MEDIA SPECS FOR DESIGNERS & EDITORS
                LazyColumn(
                    modifier = Modifier.fillMaxSize(),
                    verticalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    item {
                        FluentCard(modifier = Modifier.fillMaxWidth()) {
                            Column(modifier = Modifier.padding(16.dp)) {
                                Text("CREATIVE PRODUCTION SPECS", fontSize = 11.sp, fontWeight = FontWeight.Bold, color = colors.primary)
                                Spacer(modifier = Modifier.height(4.dp))
                                Text("Standard Aspect Ratios & Deliverables", fontSize = 16.sp, fontWeight = FontWeight.Bold, color = colors.textPrimary)
                                Spacer(modifier = Modifier.height(4.dp))
                                Text("Optimized rendering targets for video editors and multimedia designers.", fontSize = 12.sp, color = colors.textSecondary)
                            }
                        }
                    }

                    items(mediaSpecs) { spec ->
                        FluentCard(modifier = Modifier.fillMaxWidth()) {
                            Row(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .padding(14.dp),
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Box(
                                    modifier = Modifier
                                        .size(40.dp)
                                        .clip(RoundedCornerShape(10.dp))
                                        .background(if (colors.isDark) Color(0xFF1E293B) else Color(0xFFE2E8F0)),
                                    contentAlignment = Alignment.Center
                                ) {
                                    Text(spec.icon, fontSize = 20.sp)
                                }

                                Spacer(modifier = Modifier.width(12.dp))

                                Column(modifier = Modifier.weight(1f)) {
                                    Row(verticalAlignment = Alignment.CenterVertically) {
                                        Text(spec.formatName, fontSize = 13.sp, fontWeight = FontWeight.Bold, color = colors.textPrimary)
                                        Spacer(modifier = Modifier.width(6.dp))
                                        Box(
                                            modifier = Modifier
                                                .clip(RoundedCornerShape(4.dp))
                                                .background(colors.primary.copy(alpha = 0.15f))
                                                .padding(horizontal = 5.dp, vertical = 2.dp)
                                        ) {
                                            Text(spec.aspect, fontSize = 10.sp, fontWeight = FontWeight.Bold, color = colors.primary)
                                        }
                                    }
                                    Spacer(modifier = Modifier.height(2.dp))
                                    Text(spec.resolution, fontSize = 12.sp, fontWeight = FontWeight.SemiBold, color = colors.accent)
                                    Text(spec.useCase, fontSize = 11.sp, color = colors.textSecondary)
                                }

                                IconButton(onClick = { copyToClipboard(spec.resolution, spec.formatName) }) {
                                    Icon(Icons.Default.ContentCopy, contentDescription = "Copy Resolution", tint = colors.textSecondary)
                                }
                            }
                        }
                    }
                }
            }
            2 -> {
                // ✍️ HIGH-CONVERTING COPY HOOKS
                LazyColumn(
                    modifier = Modifier.fillMaxSize(),
                    verticalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    item {
                        FluentCard(modifier = Modifier.fillMaxWidth()) {
                            Column(modifier = Modifier.padding(16.dp)) {
                                Text("COPYWRITING & ANGLE STUDIO", fontSize = 11.sp, fontWeight = FontWeight.Bold, color = colors.primary)
                                Spacer(modifier = Modifier.height(4.dp))
                                Text("Proven Malay Marketing Hooks", fontSize = 16.sp, fontWeight = FontWeight.Bold, color = colors.textPrimary)
                                Spacer(modifier = Modifier.height(4.dp))
                                Text("Tap any section to copy directly into video overlays or ad copy.", fontSize = 12.sp, color = colors.textSecondary)
                            }
                        }
                    }

                    items(copySnippets) { snip ->
                        FluentCard(modifier = Modifier.fillMaxWidth()) {
                            Column(modifier = Modifier.padding(14.dp)) {
                                Row(
                                    modifier = Modifier.fillMaxWidth(),
                                    horizontalArrangement = Arrangement.SpaceBetween,
                                    verticalAlignment = Alignment.CenterVertically
                                ) {
                                    Text(snip.category, fontSize = 11.sp, fontWeight = FontWeight.Bold, color = SshWarmGoldBright)
                                    IconButton(
                                        onClick = { copyToClipboard("${snip.hook}\n\n${snip.body}\n\n${snip.cta}", "Full Copy") },
                                        modifier = Modifier.size(28.dp)
                                    ) {
                                        Icon(Icons.Default.ContentCopy, contentDescription = "Copy All", tint = colors.textSecondary, modifier = Modifier.size(16.dp))
                                    }
                                }

                                Spacer(modifier = Modifier.height(6.dp))
                                Text(
                                    snip.hook,
                                    fontSize = 14.sp,
                                    fontWeight = FontWeight.Bold,
                                    color = colors.textPrimary,
                                    modifier = Modifier.clickable { copyToClipboard(snip.hook, "Headline Hook") }
                                )

                                Spacer(modifier = Modifier.height(6.dp))
                                Text(
                                    snip.body,
                                    fontSize = 12.sp,
                                    color = colors.textSecondary,
                                    lineHeight = 16.sp,
                                    modifier = Modifier.clickable { copyToClipboard(snip.body, "Body Copy") }
                                )

                                Spacer(modifier = Modifier.height(10.dp))
                                Box(
                                    modifier = Modifier
                                        .clip(RoundedCornerShape(6.dp))
                                        .background(colors.primary.copy(alpha = 0.15f))
                                        .border(1.dp, colors.primary.copy(alpha = 0.3f), RoundedCornerShape(6.dp))
                                        .clickable { copyToClipboard(snip.cta, "Call To Action") }
                                        .padding(horizontal = 10.dp, vertical = 6.dp)
                                ) {
                                    Text("CTA: ${snip.cta} ↗", fontSize = 11.sp, fontWeight = FontWeight.Bold, color = colors.primary)
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}
