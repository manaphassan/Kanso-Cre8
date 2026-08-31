package com.suamisihat.sscam.ui.components

import android.widget.Toast
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
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
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalClipboardManager
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalHapticFeedback
import androidx.compose.ui.hapticfeedback.HapticFeedbackType
import androidx.compose.ui.text.AnnotatedString
import androidx.compose.ui.text.SpanStyle
import androidx.compose.ui.text.buildAnnotatedString
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextDecoration
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.suamisihat.sscam.ui.theme.*

/**
 * Fluent 2 Full Markdown Document Viewer for SS-CAM.
 * Parses and renders rich headers, interactive checklist items, styled metadata chips,
 * blockquotes, code blocks, and inline typography.
 */
@Composable
fun FluentMarkdownViewer(
    markdownText: String,
    modifier: Modifier = Modifier,
    onMarkdownChange: ((newMarkdown: String) -> Unit)? = null
) {
    val colors = LocalSscamColors.current
    val context = LocalContext.current
    val clipboardManager = LocalClipboardManager.current
    val haptic = LocalHapticFeedback.current

    val lines = remember(markdownText) { markdownText.lines() }

    Column(
        modifier = modifier.fillMaxWidth(),
        verticalArrangement = Arrangement.spacedBy(8.dp)
    ) {
        var inCodeBlock = false
        val codeBlockLines = mutableListOf<String>()

        lines.forEachIndexed { index, rawLine ->
            val trimmed = rawLine.trim()

            // Code block fence handling
            if (trimmed.startsWith("```")) {
                if (inCodeBlock) {
                    val codeContent = codeBlockLines.joinToString("\n")
                    CodeBlockCard(
                        code = codeContent,
                        onCopy = {
                            clipboardManager.setText(AnnotatedString(codeContent))
                            Toast.makeText(context, "Copied code to clipboard", Toast.LENGTH_SHORT).show()
                        }
                    )
                    codeBlockLines.clear()
                    inCodeBlock = false
                } else {
                    inCodeBlock = true
                }
                return@forEachIndexed
            }

            if (inCodeBlock) {
                codeBlockLines.add(rawLine)
                return@forEachIndexed
            }

            when {
                // Empty Line Spacer
                trimmed.isEmpty() -> {
                    Spacer(modifier = Modifier.height(2.dp))
                }

                // Horizontal Rule
                trimmed == "---" || trimmed == "***" || trimmed == "___" -> {
                    HorizontalDivider(
                        color = colors.border,
                        thickness = 1.dp,
                        modifier = Modifier.padding(vertical = 4.dp)
                    )
                }

                // H1 Heading
                trimmed.startsWith("# ") -> {
                    val title = trimmed.removePrefix("# ").trim()
                    Surface(
                        color = colors.primary.copy(alpha = 0.08f),
                        shape = RoundedCornerShape(10.dp),
                        border = androidx.compose.foundation.BorderStroke(1.dp, colors.primary.copy(alpha = 0.25f)),
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Row(
                            modifier = Modifier.padding(horizontal = 12.dp, vertical = 10.dp),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Box(
                                modifier = Modifier
                                    .size(4.dp, 20.dp)
                                    .clip(RoundedCornerShape(2.dp))
                                    .background(colors.primary)
                            )
                            Spacer(modifier = Modifier.width(10.dp))
                            Text(
                                text = title,
                                fontSize = 17.sp,
                                fontWeight = FontWeight.ExtraBold,
                                color = colors.textPrimary,
                                letterSpacing = 0.3.sp
                            )
                        }
                    }
                }

                // H2 Heading
                trimmed.startsWith("## ") -> {
                    val title = trimmed.removePrefix("## ").trim()
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(top = 8.dp, bottom = 2.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text(
                            text = title,
                            fontSize = 14.sp,
                            fontWeight = FontWeight.Bold,
                            color = colors.textPrimary
                        )
                    }
                }

                // H3 Heading (Section Headers)
                trimmed.startsWith("### ") -> {
                    val title = trimmed.removePrefix("### ").trim()
                    val icon = when {
                        title.contains("Checklist", ignoreCase = true) || title.contains("Deliverable", ignoreCase = true) -> Icons.Default.FactCheck
                        title.contains("Brief", ignoreCase = true) || title.contains("Copy", ignoreCase = true) || title.contains("Hook", ignoreCase = true) -> Icons.Default.Campaign
                        title.contains("Storage", ignoreCase = true) || title.contains("Path", ignoreCase = true) || title.contains("NAS", ignoreCase = true) -> Icons.Default.FolderOpen
                        else -> Icons.Default.Bookmark
                    }

                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(top = 10.dp, bottom = 4.dp),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(6.dp)
                    ) {
                        Icon(
                            imageVector = icon,
                            contentDescription = null,
                            tint = if (colors.isMonochrome) Color(0xFF18181B) else colors.primary,
                            modifier = Modifier.size(16.dp)
                        )
                        Text(
                            text = title.uppercase(),
                            fontSize = 11.5.sp,
                            fontWeight = FontWeight.ExtraBold,
                            color = colors.textPrimary,
                            letterSpacing = 0.8.sp
                        )
                    }
                }

                // Checklist item: Checked [- [x]] or [- [X]]
                trimmed.startsWith("- [x]", ignoreCase = true) -> {
                    val content = trimmed.substring(5).trim()
                    ChecklistItemRow(
                        isChecked = true,
                        text = content,
                        onClick = {
                            haptic.performHapticFeedback(HapticFeedbackType.TextHandleMove)
                            if (onMarkdownChange != null) {
                                val updatedLines = lines.toMutableList()
                                updatedLines[index] = rawLine.replaceFirst("- [x]", "- [ ]", ignoreCase = true)
                                onMarkdownChange(updatedLines.joinToString("\n"))
                            }
                        }
                    )
                }

                // Checklist item: Unchecked [- [ ]]
                trimmed.startsWith("- [ ]") -> {
                    val content = trimmed.substring(5).trim()
                    ChecklistItemRow(
                        isChecked = false,
                        text = content,
                        onClick = {
                            haptic.performHapticFeedback(HapticFeedbackType.TextHandleMove)
                            if (onMarkdownChange != null) {
                                val updatedLines = lines.toMutableList()
                                updatedLines[index] = rawLine.replaceFirst("- [ ]", "- [x]")
                                onMarkdownChange(updatedLines.joinToString("\n"))
                            }
                        }
                    )
                }

                // Blockquote (> Quote text)
                trimmed.startsWith(">") -> {
                    val quote = trimmed.removePrefix(">").trim().removeSurrounding("\"")
                    Surface(
                        color = if (colors.isDark) Color(0xFF1E293B) else Color(0xFFF8FAFC),
                        shape = RoundedCornerShape(8.dp),
                        border = androidx.compose.foundation.BorderStroke(1.dp, colors.border),
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Row(
                            modifier = Modifier.padding(12.dp),
                            verticalAlignment = Alignment.Top
                        ) {
                            Box(
                                modifier = Modifier
                                    .width(3.dp)
                                    .height(36.dp)
                                    .clip(RoundedCornerShape(2.dp))
                                    .background(if (colors.isMonochrome) Color(0xFF18181B) else SshWarmGoldBright)
                            )
                            Spacer(modifier = Modifier.width(10.dp))
                            Icon(
                                Icons.Default.FormatQuote,
                                contentDescription = null,
                                tint = colors.textMuted,
                                modifier = Modifier.size(18.dp)
                            )
                            Spacer(modifier = Modifier.width(6.dp))
                            Text(
                                text = quote,
                                fontSize = 12.sp,
                                fontStyle = FontStyle.Italic,
                                color = colors.textPrimary,
                                lineHeight = 17.sp,
                                modifier = Modifier.weight(1f)
                            )
                        }
                    }
                }

                // NAS Path / Inline Code Single Line (`/volume1/...`)
                trimmed.startsWith("`") && trimmed.endsWith("`") && trimmed.length > 2 -> {
                    val pathText = trimmed.removeSurrounding("`")
                    Surface(
                        color = if (colors.isDark) Color(0xFF0F172A) else Color(0xFFF1F5F9),
                        shape = RoundedCornerShape(8.dp),
                        border = androidx.compose.foundation.BorderStroke(1.dp, colors.border),
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Row(
                            modifier = Modifier.padding(horizontal = 10.dp, vertical = 8.dp),
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.SpaceBetween
                        ) {
                            Row(
                                verticalAlignment = Alignment.CenterVertically,
                                modifier = Modifier.weight(1f)
                            ) {
                                Icon(
                                    Icons.Default.Terminal,
                                    contentDescription = null,
                                    tint = colors.textMuted,
                                    modifier = Modifier.size(15.dp)
                                )
                                Spacer(modifier = Modifier.width(8.dp))
                                Text(
                                    text = pathText,
                                    fontSize = 11.sp,
                                    fontFamily = FontFamily.Monospace,
                                    color = if (colors.isMonochrome) colors.textPrimary else colors.primary,
                                    maxLines = 2
                                )
                            }
                            IconButton(
                                onClick = {
                                    clipboardManager.setText(AnnotatedString(pathText))
                                    Toast.makeText(context, "Copied path to clipboard", Toast.LENGTH_SHORT).show()
                                },
                                modifier = Modifier.size(26.dp)
                            ) {
                                Icon(
                                    Icons.Default.ContentCopy,
                                    contentDescription = "Copy Path",
                                    tint = colors.textMuted,
                                    modifier = Modifier.size(14.dp)
                                )
                            }
                        }
                    }
                }

                // Metadata Key-Value row (e.g. **Brand:** SSE | **Client:** Internal)
                trimmed.startsWith("**") && (trimmed.contains("|") || trimmed.contains(":**")) -> {
                    MetadataPillRow(rawText = trimmed)
                }

                // Bullet item
                trimmed.startsWith("- ") || trimmed.startsWith("* ") -> {
                    val bulletText = trimmed.substring(2)
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(start = 6.dp, top = 2.dp, bottom = 2.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Box(
                            modifier = Modifier
                                .size(5.dp)
                                .clip(CircleShape)
                                .background(colors.textSecondary)
                        )
                        Spacer(modifier = Modifier.width(10.dp))
                        Text(
                            text = parseInlineMarkdown(bulletText, colors.textPrimary, colors.primary),
                            fontSize = 12.sp,
                            color = colors.textPrimary,
                            lineHeight = 16.sp
                        )
                    }
                }

                // Regular Markdown Paragraph
                else -> {
                    Text(
                        text = parseInlineMarkdown(trimmed, colors.textPrimary, colors.primary),
                        fontSize = 12.sp,
                        color = colors.textPrimary,
                        lineHeight = 17.sp
                    )
                }
            }
        }
    }
}

/**
 * Interactive Checklist Item Row with tactile state
 */
@Composable
private fun ChecklistItemRow(
    isChecked: Boolean,
    text: String,
    onClick: () -> Unit
) {
    val colors = LocalSscamColors.current
    Surface(
        color = if (isChecked) (if (colors.isDark) Color(0xFF13231B) else Color(0xFFF0FDF4)) else colors.surface,
        shape = RoundedCornerShape(10.dp),
        border = androidx.compose.foundation.BorderStroke(
            1.dp,
            if (isChecked) SshSuccessGreen.copy(alpha = 0.4f) else colors.border
        ),
        modifier = Modifier
            .fillMaxWidth()
            .clickable { onClick() }
    ) {
        Row(
            modifier = Modifier.padding(horizontal = 12.dp, vertical = 9.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Surface(
                color = if (isChecked) SshSuccessGreen else Color.Transparent,
                shape = CircleShape,
                border = androidx.compose.foundation.BorderStroke(
                    1.5.dp,
                    if (isChecked) SshSuccessGreen else colors.textMuted
                ),
                modifier = Modifier.size(18.dp)
            ) {
                if (isChecked) {
                    Icon(
                        Icons.Default.Check,
                        contentDescription = null,
                        tint = Color.White,
                        modifier = Modifier
                            .fillMaxSize()
                            .padding(2.dp)
                    )
                }
            }

            Spacer(modifier = Modifier.width(10.dp))

            Text(
                text = text,
                fontSize = 12.sp,
                fontWeight = if (isChecked) FontWeight.Normal else FontWeight.Medium,
                color = if (isChecked) colors.textMuted else colors.textPrimary,
                textDecoration = if (isChecked) TextDecoration.LineThrough else TextDecoration.None,
                modifier = Modifier.weight(1f)
            )

            if (isChecked) {
                Surface(
                    color = SshSuccessGreen.copy(alpha = 0.15f),
                    shape = RoundedCornerShape(4.dp),
                    modifier = Modifier.padding(start = 6.dp)
                ) {
                    Text(
                        text = "READY",
                        fontSize = 8.5.sp,
                        fontWeight = FontWeight.Bold,
                        color = SshSuccessGreen,
                        modifier = Modifier.padding(horizontal = 5.dp, vertical = 2.dp)
                    )
                }
            }
        }
    }
}

/**
 * Metadata Pills Row (parses **Key:** Value | **Key:** Value)
 */
@Composable
private fun MetadataPillRow(rawText: String) {
    val colors = LocalSscamColors.current
    val items = rawText.split("|").map { it.trim() }

    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(vertical = 2.dp),
        horizontalArrangement = Arrangement.spacedBy(8.dp)
    ) {
        items.forEach { segment ->
            Surface(
                color = colors.surface,
                shape = RoundedCornerShape(8.dp),
                border = androidx.compose.foundation.BorderStroke(1.dp, colors.border),
                modifier = Modifier.weight(1f, fill = false)
            ) {
                Row(
                    modifier = Modifier.padding(horizontal = 8.dp, vertical = 5.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text(
                        text = parseInlineMarkdown(segment, colors.textPrimary, colors.primary),
                        fontSize = 10.5.sp,
                        color = colors.textPrimary
                    )
                }
            }
        }
    }
}

/**
 * Code Block Card with Monospace Font and Copy button
 */
@Composable
private fun CodeBlockCard(
    code: String,
    onCopy: () -> Unit
) {
    val colors = LocalSscamColors.current
    Surface(
        color = if (colors.isDark) Color(0xFF0F172A) else Color(0xFF1E293B),
        shape = RoundedCornerShape(8.dp),
        border = androidx.compose.foundation.BorderStroke(1.dp, Color(0xFF334155)),
        modifier = Modifier.fillMaxWidth()
    ) {
        Column(modifier = Modifier.padding(10.dp)) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    text = "SPECIFICATION BLOCK",
                    fontSize = 9.sp,
                    fontWeight = FontWeight.Bold,
                    color = Color(0xFF94A3B8),
                    letterSpacing = 0.5.sp
                )
                IconButton(
                    onClick = onCopy,
                    modifier = Modifier.size(24.dp)
                ) {
                    Icon(
                        Icons.Default.ContentCopy,
                        contentDescription = "Copy",
                        tint = Color(0xFF94A3B8),
                        modifier = Modifier.size(13.dp)
                    )
                }
            }
            Spacer(modifier = Modifier.height(4.dp))
            Text(
                text = code,
                fontSize = 11.sp,
                fontFamily = FontFamily.Monospace,
                color = Color(0xFFE2E8F0),
                lineHeight = 15.sp
            )
        }
    }
}

/**
 * Helper to parse inline **bold**, *italic*, and `code` markers
 */
private fun parseInlineMarkdown(
    text: String,
    textColor: Color,
    accentColor: Color
): AnnotatedString {
    return buildAnnotatedString {
        var cursor = 0
        val length = text.length

        while (cursor < length) {
            val boldIdx = text.indexOf("**", cursor)
            val codeIdx = text.indexOf("`", cursor)

            val nextSpecial = when {
                boldIdx != -1 && codeIdx != -1 -> minOf(boldIdx, codeIdx)
                boldIdx != -1 -> boldIdx
                codeIdx != -1 -> codeIdx
                else -> -1
            }

            if (nextSpecial == -1) {
                append(text.substring(cursor))
                break
            }

            if (nextSpecial > cursor) {
                append(text.substring(cursor, nextSpecial))
                cursor = nextSpecial
            }

            if (cursor == boldIdx) {
                val endBold = text.indexOf("**", cursor + 2)
                if (endBold != -1) {
                    pushStyle(SpanStyle(fontWeight = FontWeight.Bold, color = textColor))
                    append(text.substring(cursor + 2, endBold))
                    pop()
                    cursor = endBold + 2
                } else {
                    append("**")
                    cursor += 2
                }
            } else if (cursor == codeIdx) {
                val endCode = text.indexOf("`", cursor + 1)
                if (endCode != -1) {
                    pushStyle(SpanStyle(fontFamily = FontFamily.Monospace, color = accentColor, fontWeight = FontWeight.SemiBold))
                    append(text.substring(cursor + 1, endCode))
                    pop()
                    cursor = endCode + 1
                } else {
                    append("`")
                    cursor += 1
                }
            }
        }
    }
}
