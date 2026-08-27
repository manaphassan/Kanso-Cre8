using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Text.RegularExpressions;
using System.Windows;
using System.Windows.Documents;
using System.Windows.Media;

namespace SS_CAM.Utilities
{
    public static class MarkdownHelper
    {
        private static readonly FontFamily FluentFontFamily = new FontFamily("Segoe UI Variable Text, Segoe UI Variable Display, Segoe UI, sans-serif");
        private static readonly FontFamily FluentMonoFamily = new FontFamily("Cascadia Code, Segoe UI Mono, Consolas, monospace");

        public static FlowDocument ToFlowDocument(string markdown)
        {
            FlowDocument doc = new FlowDocument
            {
                FontFamily = FluentFontFamily,
                FontSize = 12.5,
                PagePadding = new Thickness(6),
                TextAlignment = TextAlignment.Left,
                LineHeight = 22
            };
            doc.SetResourceReference(FlowDocument.ForegroundProperty, "TextFillColorPrimaryBrush");

            if (string.IsNullOrWhiteSpace(markdown))
            {
                Paragraph emptyPara = new Paragraph(new Run("No notes/content below frontmatter in README.md."))
                {
                    FontStyle = FontStyles.Italic,
                    Margin = new Thickness(0, 8, 0, 8)
                };
                emptyPara.SetResourceReference(Paragraph.ForegroundProperty, "TextFillColorSecondaryBrush");
                doc.Blocks.Add(emptyPara);
                return doc;
            }

            string[] lines = markdown.Split(new[] { "\r\n", "\n" }, StringSplitOptions.None);
            Paragraph currentParagraph = null;
            bool inCodeBlock = false;
            bool isMermaidBlock = false;
            Paragraph codeBlockPara = null;
            List<string> mermaidLines = null;

            for (int i = 0; i < lines.Length; i++)
            {
                string rawLine = lines[i];
                string line = rawLine.TrimEnd();

                // Fenced Code Blocks (```) & Mermaid (```mermaid)
                if (line.Trim().StartsWith("```"))
                {
                    if (!inCodeBlock)
                    {
                        inCodeBlock = true;
                        string blockLang = line.Trim().Substring(3).Trim().ToLowerInvariant();
                        if (blockLang.StartsWith("mermaid"))
                        {
                            isMermaidBlock = true;
                            mermaidLines = new List<string>();
                        }
                        else
                        {
                            isMermaidBlock = false;
                            codeBlockPara = new Paragraph
                            {
                                FontFamily = FluentMonoFamily,
                                FontSize = 11,
                                Padding = new Thickness(10, 8, 10, 8),
                                Margin = new Thickness(0, 6, 0, 6)
                            };
                            codeBlockPara.SetResourceReference(Paragraph.BackgroundProperty, "CardBackgroundFillColorSecondaryBrush");
                            codeBlockPara.SetResourceReference(Paragraph.ForegroundProperty, "TextFillColorPrimaryBrush");
                        }
                    }
                    else
                    {
                        inCodeBlock = false;
                        if (isMermaidBlock && mermaidLines != null)
                        {
                            RenderMermaidDiagramBlock(doc, mermaidLines);
                            mermaidLines = null;
                            isMermaidBlock = false;
                        }
                        else if (codeBlockPara != null)
                        {
                            doc.Blocks.Add(codeBlockPara);
                            codeBlockPara = null;
                        }
                    }
                    currentParagraph = null;
                    continue;
                }

                if (inCodeBlock)
                {
                    if (isMermaidBlock && mermaidLines != null)
                    {
                        mermaidLines.Add(rawLine);
                    }
                    else if (codeBlockPara != null)
                    {
                        if (codeBlockPara.Inlines.Count > 0)
                            codeBlockPara.Inlines.Add(new LineBreak());
                        codeBlockPara.Inlines.Add(new Run(rawLine));
                    }
                    continue;
                }

                // Empty line
                if (string.IsNullOrWhiteSpace(line))
                {
                    currentParagraph = null;
                    continue;
                }

                // Table Parsing (| Header | Header |)
                if (line.Trim().StartsWith("|") && line.Trim().EndsWith("|") && i + 1 < lines.Length && lines[i + 1].Trim().StartsWith("|") && lines[i + 1].Contains("-"))
                {
                    List<string> tableLines = new List<string>();
                    int tableIndex = i;
                    while (tableIndex < lines.Length && lines[tableIndex].Trim().StartsWith("|") && lines[tableIndex].Trim().EndsWith("|"))
                    {
                        tableLines.Add(lines[tableIndex].Trim());
                        tableIndex++;
                    }

                    if (tableLines.Count >= 2)
                    {
                        RenderMarkdownTable(doc, tableLines);
                        i = tableIndex - 1;
                        currentParagraph = null;
                        continue;
                    }
                }

                // Horizontal Rule (--- or ***)
                if (line.Trim() == "---" || line.Trim() == "***")
                {
                    Paragraph hr = new Paragraph
                    {
                        Margin = new Thickness(0, 10, 0, 10),
                        BorderThickness = new Thickness(0, 0, 0, 1)
                    };
                    hr.SetResourceReference(Paragraph.BorderBrushProperty, "CardStrokeColorDefaultBrush");
                    doc.Blocks.Add(hr);
                    currentParagraph = null;
                    continue;
                }

                // Task Lists (- [ ] or - [x])
                string trimmedLine = line.TrimStart();
                if (trimmedLine.StartsWith("- [ ] ") || trimmedLine.StartsWith("- [x] ") || trimmedLine.StartsWith("- [X] ") ||
                    trimmedLine.StartsWith("* [ ] ") || trimmedLine.StartsWith("* [x] ") || trimmedLine.StartsWith("* [X] "))
                {
                    bool isChecked = trimmedLine.Substring(3, 1) == "x" || trimmedLine.Substring(3, 1) == "X";
                    string taskContent = trimmedLine.Substring(6).Trim();

                    Paragraph taskPara = new Paragraph
                    {
                        FontSize = 11.5,
                        Margin = new Thickness(8, 3, 0, 3)
                    };
                    taskPara.SetResourceReference(Paragraph.ForegroundProperty, "TextFillColorPrimaryBrush");

                    if (isChecked)
                    {
                        taskPara.Inlines.Add(new Run("[✓]  ")
                        {
                            FontWeight = FontWeights.Bold,
                            Foreground = new SolidColorBrush(Color.FromRgb(34, 197, 94))
                        });

                        Span doneSpan = new Span();
                        doneSpan.TextDecorations = TextDecorations.Strikethrough;
                        doneSpan.SetResourceReference(Span.ForegroundProperty, "TextFillColorSecondaryBrush");
                        ParseInlineMarkdown(taskContent, doneSpan.Inlines);
                        taskPara.Inlines.Add(doneSpan);
                    }
                    else
                    {
                        Run uncheckedIcon = new Run("[  ]  ") { FontWeight = FontWeights.Bold };
                        uncheckedIcon.SetResourceReference(TextElement.ForegroundProperty, "TextFillColorSecondaryBrush");
                        taskPara.Inlines.Add(uncheckedIcon);
                        ParseInlineMarkdown(taskContent, taskPara.Inlines);
                    }

                    doc.Blocks.Add(taskPara);
                    currentParagraph = null;
                    continue;
                }

                // Obsidian Admonition Callout or Blockquote (> line)
                if (trimmedLine.StartsWith("> "))
                {
                    string quoteContent = trimmedLine.Substring(2).Trim();

                    if (quoteContent.StartsWith("[!") && quoteContent.Contains("]"))
                    {
                        RenderObsidianCallout(doc, quoteContent, lines, ref i);
                    }
                    else
                    {
                        Paragraph quote = new Paragraph
                        {
                            FontSize = 11.5,
                            FontStyle = FontStyles.Italic,
                            BorderThickness = new Thickness(3, 0, 0, 0),
                            Padding = new Thickness(10, 6, 10, 6),
                            Margin = new Thickness(0, 6, 0, 6)
                        };
                        quote.SetResourceReference(Paragraph.ForegroundProperty, "TextFillColorPrimaryBrush");
                        quote.SetResourceReference(Paragraph.BackgroundProperty, "CardBackgroundFillColorSecondaryBrush");
                        quote.SetResourceReference(Paragraph.BorderBrushProperty, "FluentBrand80");
                        ParseInlineMarkdown(quoteContent, quote.Inlines);
                        doc.Blocks.Add(quote);
                    }
                    currentParagraph = null;
                    continue;
                }

                // Headings
                if (trimmedLine.StartsWith("# "))
                {
                    Paragraph h1 = new Paragraph
                    {
                        FontSize = 16,
                        FontWeight = FontWeights.Bold,
                        Margin = new Thickness(0, 14, 0, 6)
                    };
                    h1.SetResourceReference(Paragraph.ForegroundProperty, "FluentBrand80");
                    ParseInlineMarkdown(trimmedLine.Substring(2).Trim(), h1.Inlines);
                    doc.Blocks.Add(h1);
                    currentParagraph = null;
                }
                else if (trimmedLine.StartsWith("## "))
                {
                    Paragraph h2 = new Paragraph
                    {
                        FontSize = 14,
                        FontWeight = FontWeights.Bold,
                        Margin = new Thickness(0, 12, 0, 4)
                    };
                    h2.SetResourceReference(Paragraph.ForegroundProperty, "FluentBrand80");
                    ParseInlineMarkdown(trimmedLine.Substring(3).Trim(), h2.Inlines);
                    doc.Blocks.Add(h2);
                    currentParagraph = null;
                }
                else if (trimmedLine.StartsWith("### "))
                {
                    Paragraph h3 = new Paragraph
                    {
                        FontSize = 12.5,
                        FontWeight = FontWeights.SemiBold,
                        Margin = new Thickness(0, 8, 0, 4)
                    };
                    h3.SetResourceReference(Paragraph.ForegroundProperty, "TextFillColorPrimaryBrush");
                    ParseInlineMarkdown(trimmedLine.Substring(4).Trim(), h3.Inlines);
                    doc.Blocks.Add(h3);
                    currentParagraph = null;
                }
                // Bullet points (with nested level indentation support)
                else if (trimmedLine.StartsWith("- ") || trimmedLine.StartsWith("* "))
                {
                    int indentSpaces = rawLine.Length - rawLine.TrimStart().Length;
                    int level = Math.Min(3, indentSpaces / 2);
                    double leftMargin = 8 + (level * 14);

                    string bulletSymbol = level == 0 ? "\u2022  " : (level == 1 ? "\u25E6  " : "\u25AA  ");

                    Paragraph bullet = new Paragraph
                    {
                        FontSize = 11.5,
                        Margin = new Thickness(leftMargin, 2, 0, 2)
                    };
                    bullet.SetResourceReference(Paragraph.ForegroundProperty, "TextFillColorPrimaryBrush");

                    Run bulletRun = new Run(bulletSymbol) { FontWeight = FontWeights.Bold };
                    bulletRun.SetResourceReference(TextElement.ForegroundProperty, "FluentBrand80");
                    bullet.Inlines.Add(bulletRun);

                    ParseInlineMarkdown(trimmedLine.Substring(2).Trim(), bullet.Inlines);
                    doc.Blocks.Add(bullet);
                    currentParagraph = null;
                }
                // Paragraph text
                else
                {
                    if (currentParagraph == null)
                    {
                        currentParagraph = new Paragraph
                        {
                            FontSize = 11.5,
                            Margin = new Thickness(0, 2, 0, 4)
                        };
                        currentParagraph.SetResourceReference(Paragraph.ForegroundProperty, "TextFillColorPrimaryBrush");
                        ParseInlineMarkdown(line, currentParagraph.Inlines);
                        doc.Blocks.Add(currentParagraph);
                    }
                    else
                    {
                        currentParagraph.Inlines.Add(new LineBreak());
                        ParseInlineMarkdown(line, currentParagraph.Inlines);
                    }
                }
            }

            return doc;
        }

        private static void RenderObsidianCallout(FlowDocument doc, string headerLine, string[] lines, ref int currentIndex)
        {
            int closeBracketIndex = headerLine.IndexOf(']');
            string calloutType = headerLine.Substring(2, closeBracketIndex - 2).Trim().ToUpperInvariant();
            string calloutTitle = headerLine.Substring(closeBracketIndex + 1).Trim();

            Color borderColor;
            Color bgColor;
            Color textColor;
            string icon;

            switch (calloutType)
            {
                case "TIP":
                case "SUCCESS":
                case "CHECK":
                    borderColor = Color.FromRgb(34, 197, 94);
                    bgColor = Color.FromRgb(240, 253, 244);
                    textColor = Color.FromRgb(21, 128, 61);
                    icon = "💡";
                    break;
                case "WARNING":
                case "CAUTION":
                case "ATTENTION":
                    borderColor = Color.FromRgb(245, 158, 11);
                    bgColor = Color.FromRgb(255, 251, 235);
                    textColor = Color.FromRgb(180, 83, 9);
                    icon = "⚠️";
                    break;
                case "DANGER":
                case "ERROR":
                case "FAILURE":
                case "BUG":
                case "CRITICAL":
                    borderColor = Color.FromRgb(239, 68, 68);
                    bgColor = Color.FromRgb(254, 242, 242);
                    textColor = Color.FromRgb(185, 28, 28);
                    icon = "🚨";
                    break;
                default: // NOTE, INFO, ABSTRACT, QUOTE
                    borderColor = Color.FromRgb(59, 130, 246);
                    bgColor = Color.FromRgb(239, 246, 255);
                    textColor = Color.FromRgb(29, 78, 216);
                    icon = "ℹ️";
                    break;
            }

            Paragraph calloutPara = new Paragraph
            {
                FontSize = 11.5,
                Background = new SolidColorBrush(bgColor),
                BorderBrush = new SolidColorBrush(borderColor),
                BorderThickness = new Thickness(4, 0, 0, 0),
                Padding = new Thickness(10, 8, 10, 8),
                Margin = new Thickness(0, 8, 0, 8)
            };

            // Callout Title Row
            calloutPara.Inlines.Add(new Run(icon + "  " + (string.IsNullOrWhiteSpace(calloutTitle) ? calloutType : calloutTitle))
            {
                FontWeight = FontWeights.Bold,
                Foreground = new SolidColorBrush(textColor)
            });

            // Gather subsequent callout lines starting with "> "
            int nextIndex = currentIndex + 1;
            while (nextIndex < lines.Length && lines[nextIndex].Trim().StartsWith("> "))
            {
                string bodyLine = lines[nextIndex].Trim().Substring(2).Trim();
                calloutPara.Inlines.Add(new LineBreak());
                ParseInlineMarkdown(bodyLine, calloutPara.Inlines);
                nextIndex++;
            }

            currentIndex = nextIndex - 1;
            doc.Blocks.Add(calloutPara);
        }

        private static void RenderMarkdownTable(FlowDocument doc, List<string> tableLines)
        {
            if (tableLines == null || tableLines.Count < 2) return;

            string headerLine = tableLines[0];
            string[] headers = SplitTableLine(headerLine);

            Table table = new Table
            {
                CellSpacing = 0,
                Margin = new Thickness(0, 8, 0, 10),
                Background = new SolidColorBrush(Color.FromRgb(248, 250, 252)),
                BorderBrush = new SolidColorBrush(Color.FromRgb(203, 213, 225)),
                BorderThickness = new Thickness(1)
            };

            for (int col = 0; col < headers.Length; col++)
            {
                table.Columns.Add(new TableColumn());
            }

            // Header Row Group
            TableRowGroup headerGroup = new TableRowGroup();
            TableRow headerRow = new TableRow
            {
                Background = new SolidColorBrush(Color.FromRgb(30, 41, 59))
            };

            foreach (string h in headers)
            {
                Paragraph cellPara = new Paragraph
                {
                    FontSize = 11,
                    FontWeight = FontWeights.Bold,
                    Foreground = Brushes.White,
                    Margin = new Thickness(0)
                };
                ParseInlineMarkdown(h, cellPara.Inlines);

                TableCell cell = new TableCell(cellPara)
                {
                    Padding = new Thickness(8, 6, 8, 6),
                    BorderBrush = new SolidColorBrush(Color.FromRgb(51, 65, 85)),
                    BorderThickness = new Thickness(0, 0, 1, 1)
                };
                headerRow.Cells.Add(cell);
            }
            headerGroup.Rows.Add(headerRow);
            table.RowGroups.Add(headerGroup);

            // Data Rows Group
            TableRowGroup bodyGroup = new TableRowGroup();
            int dataRowIndex = 0;

            for (int r = 1; r < tableLines.Count; r++)
            {
                string line = tableLines[r];
                if (line.Contains("---")) continue; // Skip separator line

                string[] cells = SplitTableLine(line);
                TableRow row = new TableRow
                {
                    Background = (dataRowIndex % 2 == 0)
                        ? new SolidColorBrush(Color.FromRgb(255, 255, 255))
                        : new SolidColorBrush(Color.FromRgb(241, 245, 249))
                };

                for (int col = 0; col < headers.Length; col++)
                {
                    string cellText = col < cells.Length ? cells[col] : string.Empty;
                    Paragraph cellPara = new Paragraph
                    {
                        FontSize = 11,
                        Foreground = new SolidColorBrush(Color.FromRgb(30, 41, 59)),
                        Margin = new Thickness(0)
                    };
                    ParseInlineMarkdown(cellText, cellPara.Inlines);

                    TableCell cell = new TableCell(cellPara)
                    {
                        Padding = new Thickness(8, 5, 8, 5),
                        BorderBrush = new SolidColorBrush(Color.FromRgb(226, 232, 240)),
                        BorderThickness = new Thickness(0, 0, 1, 1)
                    };
                    row.Cells.Add(cell);
                }
                bodyGroup.Rows.Add(row);
                dataRowIndex++;
            }

            table.RowGroups.Add(bodyGroup);
            doc.Blocks.Add(table);
        }

        private static string[] SplitTableLine(string line)
        {
            string trimmed = line.Trim();
            if (trimmed.StartsWith("|")) trimmed = trimmed.Substring(1);
            if (trimmed.EndsWith("|")) trimmed = trimmed.Substring(0, trimmed.Length - 1);

            string[] rawParts = trimmed.Split('|');
            string[] result = new string[rawParts.Length];
            for (int i = 0; i < rawParts.Length; i++)
            {
                result[i] = rawParts[i].Trim();
            }
            return result;
        }

        private static void RenderMermaidDiagramBlock(FlowDocument doc, List<string> mermaidLines)
        {
            if (mermaidLines == null) return;

            Paragraph header = new Paragraph
            {
                Background = new SolidColorBrush(Color.FromRgb(15, 23, 42)),
                Foreground = new SolidColorBrush(Color.FromRgb(56, 189, 248)),
                Padding = new Thickness(10, 6, 10, 6),
                Margin = new Thickness(0, 8, 0, 0),
                FontWeight = FontWeights.Bold,
                FontSize = 11
            };
            header.Inlines.Add(new Run("📊 MERMAID DIAGRAM ENGINE"));

            Paragraph diagramBody = new Paragraph
            {
                Background = new SolidColorBrush(Color.FromRgb(30, 41, 59)),
                Foreground = new SolidColorBrush(Color.FromRgb(241, 245, 249)),
                Padding = new Thickness(12, 10, 12, 10),
                Margin = new Thickness(0, 0, 0, 8),
                FontSize = 11
            };

            foreach (string rawLine in mermaidLines)
            {
                string trimmed = rawLine.Trim();
                if (string.IsNullOrWhiteSpace(trimmed)) continue;

                if (trimmed.StartsWith("graph ") || trimmed.StartsWith("flowchart ") || trimmed.StartsWith("sequenceDiagram") || trimmed.StartsWith("pie"))
                {
                    diagramBody.Inlines.Add(new Run("Type: " + trimmed)
                    {
                        FontWeight = FontWeights.Bold,
                        Foreground = new SolidColorBrush(Color.FromRgb(96, 165, 250))
                    });
                    diagramBody.Inlines.Add(new LineBreak());
                    continue;
                }

                if (trimmed.Contains("-->") || trimmed.Contains("->") || trimmed.Contains("==>"))
                {
                    string[] parts = Regex.Split(trimmed, @"(\-\-\>|\-\>|\=\=\>)");
                    for (int p = 0; p < parts.Length; p++)
                    {
                        string token = parts[p].Trim();
                        if (token == "-->" || token == "->" || token == "==>")
                        {
                            diagramBody.Inlines.Add(new Run("  ➔  ")
                            {
                                Foreground = new SolidColorBrush(Color.FromRgb(56, 189, 248)),
                                FontWeight = FontWeights.Bold
                            });
                        }
                        else if (!string.IsNullOrEmpty(token))
                        {
                            string label = Regex.Replace(token, @"^[A-Za-z0-9_]+\s*[\(\[\{](.*?)[\)\]\}]$", "$1");
                            label = label.Trim('[', ']', '(', ')', '{', '}', '"', '\'');

                            diagramBody.Inlines.Add(new Run(" [ " + label + " ] ")
                            {
                                Background = new SolidColorBrush(Color.FromRgb(30, 58, 138)),
                                Foreground = Brushes.White,
                                FontWeight = FontWeights.SemiBold
                            });
                        }
                    }
                    diagramBody.Inlines.Add(new LineBreak());
                }
                else
                {
                    diagramBody.Inlines.Add(new Run(rawLine));
                    diagramBody.Inlines.Add(new LineBreak());
                }
            }

            doc.Blocks.Add(header);
            doc.Blocks.Add(diagramBody);
        }

        private static void ParseInlineMarkdown(string line, InlineCollection inlines)
        {
            string pattern = @"(\[.*?\]\(.*?\)|\*\*.*?\*\*|\*.*?\*|~~.*?~~|==.*?==|\+\+.*?\+\+|<kbd>.*?</kbd>|~.*?~|\^.*?\^|`.*?`)";
            string[] parts = Regex.Split(line, pattern);

            foreach (string part in parts)
            {
                if (string.IsNullOrEmpty(part)) continue;

                // Clickable Hyperlinks ([Label](url))
                if (part.StartsWith("[") && part.Contains("](") && part.EndsWith(")"))
                {
                    int closeSquare = part.IndexOf(']');
                    string label = part.Substring(1, closeSquare - 1);
                    string url = part.Substring(closeSquare + 2, part.Length - closeSquare - 3);

                    Hyperlink link = new Hyperlink(new Run(label))
                    {
                        Foreground = new SolidColorBrush(Color.FromRgb(37, 99, 235)),
                        TextDecorations = TextDecorations.Underline
                    };

                    link.Click += (s, e) =>
                    {
                        try
                        {
                            Process.Start(new ProcessStartInfo(url) { UseShellExecute = true });
                        }
                        catch (Exception ex)
                        {
                            Debug.WriteLine("[MarkdownHelper] Hyperlink open error: " + ex.Message);
                        }
                    };

                    inlines.Add(link);
                }
                // Bold (**text**)
                else if (part.StartsWith("**") && part.EndsWith("**") && part.Length >= 4)
                {
                    string content = part.Substring(2, part.Length - 4);
                    inlines.Add(new Run(content)
                    {
                        FontWeight = FontWeights.Bold
                    });
                }
                // Italic (*text*)
                else if (part.StartsWith("*") && part.EndsWith("*") && part.Length >= 2)
                {
                    string content = part.Substring(1, part.Length - 2);
                    inlines.Add(new Run(content)
                    {
                        FontStyle = FontStyles.Italic
                    });
                }
                // Strikethrough (~~text~~)
                else if (part.StartsWith("~~") && part.EndsWith("~~") && part.Length >= 4)
                {
                    string content = part.Substring(2, part.Length - 4);
                    Span strikeSpan = new Span(new Run(content))
                    {
                        TextDecorations = TextDecorations.Strikethrough
                    };
                    strikeSpan.SetResourceReference(Span.ForegroundProperty, "TextFillColorSecondaryBrush");
                    inlines.Add(strikeSpan);
                }
                // Highlight (==text==)
                else if (part.StartsWith("==") && part.EndsWith("==") && part.Length >= 4)
                {
                    string content = part.Substring(2, part.Length - 4);
                    inlines.Add(new Run(" " + content + " ")
                    {
                        Background = new SolidColorBrush(Color.FromRgb(254, 240, 138)),
                        Foreground = new SolidColorBrush(Color.FromRgb(133, 77, 14)),
                        FontWeight = FontWeights.SemiBold
                    });
                }
                // Underline (++text++)
                else if (part.StartsWith("++") && part.EndsWith("++") && part.Length >= 4)
                {
                    string content = part.Substring(2, part.Length - 4);
                    Span underlineSpan = new Span(new Run(content))
                    {
                        TextDecorations = TextDecorations.Underline
                    };
                    inlines.Add(underlineSpan);
                }
                // Subscript (~sub~)
                else if (part.StartsWith("~") && part.EndsWith("~") && part.Length >= 2 && !part.StartsWith("~~"))
                {
                    string content = part.Substring(1, part.Length - 2);
                    Run subRun = new Run(content)
                    {
                        FontSize = 9.5,
                        BaselineAlignment = BaselineAlignment.Subscript
                    };
                    subRun.SetResourceReference(TextElement.ForegroundProperty, "TextFillColorSecondaryBrush");
                    inlines.Add(subRun);
                }
                // Superscript (^sup^)
                else if (part.StartsWith("^") && part.EndsWith("^") && part.Length >= 2)
                {
                    string content = part.Substring(1, part.Length - 2);
                    Run supRun = new Run(content)
                    {
                        FontSize = 9.5,
                        BaselineAlignment = BaselineAlignment.Superscript
                    };
                    supRun.SetResourceReference(TextElement.ForegroundProperty, "TextFillColorSecondaryBrush");
                    inlines.Add(supRun);
                }
                // Keycap Badge (<kbd>Key</kbd>)
                else if (part.StartsWith("<kbd>") && part.EndsWith("</kbd>") && part.Length >= 11)
                {
                    string content = part.Substring(5, part.Length - 11);
                    Run kbdRun = new Run(" " + content + " ")
                    {
                        FontFamily = FluentMonoFamily,
                        FontSize = 10,
                        FontWeight = FontWeights.Bold
                    };
                    kbdRun.SetResourceReference(TextElement.BackgroundProperty, "CardBackgroundFillColorSecondaryBrush");
                    kbdRun.SetResourceReference(TextElement.ForegroundProperty, "TextFillColorPrimaryBrush");
                    inlines.Add(kbdRun);
                }
                // Inline Code (`code`)
                else if (part.StartsWith("`") && part.EndsWith("`") && part.Length >= 2)
                {
                    string content = part.Substring(1, part.Length - 2);
                    Run codeRun = new Run(" " + content + " ")
                    {
                        FontFamily = FluentMonoFamily,
                        FontSize = 10.5
                    };
                    codeRun.SetResourceReference(TextElement.BackgroundProperty, "CardBackgroundFillColorSecondaryBrush");
                    codeRun.SetResourceReference(TextElement.ForegroundProperty, "FluentBrand80");
                    inlines.Add(codeRun);
                }
                else
                {
                    inlines.Add(new Run(part));
                }
            }
        }
    }
}
