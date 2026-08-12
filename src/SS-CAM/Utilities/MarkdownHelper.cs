using System;
using System.Collections.Generic;
using System.Text.RegularExpressions;
using System.Windows;
using System.Windows.Documents;
using System.Windows.Media;

namespace SS_CAM.Utilities
{
    public static class MarkdownHelper
    {
        public static FlowDocument ToFlowDocument(string markdown)
        {
            FlowDocument doc = new FlowDocument
            {
                PagePadding = new Thickness(4),
                TextAlignment = TextAlignment.Left,
                LineHeight = 20
            };

            if (string.IsNullOrWhiteSpace(markdown))
            {
                Paragraph emptyPara = new Paragraph(new Run("No notes/content below frontmatter in README.md."))
                {
                    Foreground = new SolidColorBrush(Color.FromRgb(148, 163, 184)),
                    FontStyle = FontStyles.Italic,
                    Margin = new Thickness(0, 8, 0, 8)
                };
                doc.Blocks.Add(emptyPara);
                return doc;
            }

            string[] lines = markdown.Split(new[] { "\r\n", "\n" }, StringSplitOptions.None);
            Paragraph currentParagraph = null;
            bool inCodeBlock = false;
            Paragraph codeBlockPara = null;

            for (int i = 0; i < lines.Length; i++)
            {
                string rawLine = lines[i];
                string line = rawLine.TrimEnd();

                // Fenced Code Blocks (```)
                if (line.Trim().StartsWith("```"))
                {
                    if (!inCodeBlock)
                    {
                        inCodeBlock = true;
                        codeBlockPara = new Paragraph
                        {
                            FontFamily = new FontFamily("Consolas, Courier New"),
                            FontSize = 11,
                            Background = new SolidColorBrush(Color.FromRgb(30, 41, 59)),
                            Foreground = new SolidColorBrush(Color.FromRgb(226, 232, 240)),
                            Padding = new Thickness(10, 8, 10, 8),
                            Margin = new Thickness(0, 6, 0, 6)
                        };
                    }
                    else
                    {
                        inCodeBlock = false;
                        if (codeBlockPara != null)
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
                    if (codeBlockPara.Inlines.Count > 0)
                        codeBlockPara.Inlines.Add(new LineBreak());
                    codeBlockPara.Inlines.Add(new Run(rawLine));
                    continue;
                }

                // Empty line
                if (string.IsNullOrWhiteSpace(line))
                {
                    currentParagraph = null;
                    continue;
                }

                // Horizontal Rule (--- or ***)
                if (line.Trim() == "---" || line.Trim() == "***")
                {
                    Paragraph hr = new Paragraph
                    {
                        Margin = new Thickness(0, 10, 0, 10),
                        BorderBrush = new SolidColorBrush(Color.FromRgb(226, 232, 240)),
                        BorderThickness = new Thickness(0, 0, 0, 1)
                    };
                    doc.Blocks.Add(hr);
                    currentParagraph = null;
                    continue;
                }

                // Blockquote (> line)
                if (line.StartsWith("> "))
                {
                    Paragraph quote = new Paragraph
                    {
                        FontSize = 11.5,
                        FontStyle = FontStyles.Italic,
                        Foreground = new SolidColorBrush(Color.FromRgb(71, 85, 105)),
                        Background = new SolidColorBrush(Color.FromRgb(241, 245, 249)),
                        BorderBrush = new SolidColorBrush(Color.FromRgb(59, 130, 246)),
                        BorderThickness = new Thickness(3, 0, 0, 0),
                        Padding = new Thickness(10, 6, 10, 6),
                        Margin = new Thickness(0, 6, 0, 6)
                    };
                    ParseInlineMarkdown(line.Substring(2).Trim(), quote);
                    doc.Blocks.Add(quote);
                    currentParagraph = null;
                    continue;
                }

                // Headings
                if (line.StartsWith("# "))
                {
                    Paragraph h1 = new Paragraph
                    {
                        FontSize = 16,
                        FontWeight = FontWeights.Bold,
                        Foreground = new SolidColorBrush(Color.FromRgb(30, 58, 138)),
                        Margin = new Thickness(0, 14, 0, 6)
                    };
                    ParseInlineMarkdown(line.Substring(2).Trim(), h1);
                    doc.Blocks.Add(h1);
                    currentParagraph = null;
                }
                else if (line.StartsWith("## "))
                {
                    Paragraph h2 = new Paragraph
                    {
                        FontSize = 14,
                        FontWeight = FontWeights.Bold,
                        Foreground = new SolidColorBrush(Color.FromRgb(37, 99, 235)),
                        Margin = new Thickness(0, 12, 0, 4)
                    };
                    ParseInlineMarkdown(line.Substring(3).Trim(), h2);
                    doc.Blocks.Add(h2);
                    currentParagraph = null;
                }
                else if (line.StartsWith("### "))
                {
                    Paragraph h3 = new Paragraph
                    {
                        FontSize = 12.5,
                        FontWeight = FontWeights.SemiBold,
                        Foreground = new SolidColorBrush(Color.FromRgb(71, 85, 105)),
                        Margin = new Thickness(0, 8, 0, 4)
                    };
                    ParseInlineMarkdown(line.Substring(4).Trim(), h3);
                    doc.Blocks.Add(h3);
                    currentParagraph = null;
                }
                // Bullet points
                else if (line.StartsWith("- ") || line.StartsWith("* "))
                {
                    Paragraph bullet = new Paragraph
                    {
                        FontSize = 11.5,
                        Margin = new Thickness(8, 2, 0, 2)
                    };
                    bullet.Inlines.Add(new Run("\u2022  ")
                    {
                        FontWeight = FontWeights.Bold,
                        Foreground = new SolidColorBrush(Color.FromRgb(59, 130, 246))
                    });
                    ParseInlineMarkdown(line.Substring(2).Trim(), bullet);
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
                        ParseInlineMarkdown(line, currentParagraph);
                        doc.Blocks.Add(currentParagraph);
                    }
                    else
                    {
                        currentParagraph.Inlines.Add(new LineBreak());
                        ParseInlineMarkdown(line, currentParagraph);
                    }
                }
            }

            return doc;
        }

        private static void ParseInlineMarkdown(string line, Paragraph paragraph)
        {
            string pattern = @"(\*\*.*?\*\*|\*.*?\*|`.*?`)";
            string[] parts = Regex.Split(line, pattern);

            foreach (string part in parts)
            {
                if (string.IsNullOrEmpty(part)) continue;

                if (part.StartsWith("**") && part.EndsWith("**") && part.Length >= 4)
                {
                    string content = part.Substring(2, part.Length - 4);
                    paragraph.Inlines.Add(new Run(content)
                    {
                        FontWeight = FontWeights.Bold,
                        Foreground = new SolidColorBrush(Color.FromRgb(30, 41, 59))
                    });
                }
                else if (part.StartsWith("*") && part.EndsWith("*") && part.Length >= 2)
                {
                    string content = part.Substring(1, part.Length - 2);
                    paragraph.Inlines.Add(new Run(content)
                    {
                        FontStyle = FontStyles.Italic
                    });
                }
                else if (part.StartsWith("`") && part.EndsWith("`") && part.Length >= 2)
                {
                    string content = part.Substring(1, part.Length - 2);
                    paragraph.Inlines.Add(new Run(" " + content + " ")
                    {
                        FontFamily = new FontFamily("Consolas"),
                        FontSize = 10.5,
                        Background = new SolidColorBrush(Color.FromRgb(241, 245, 249)),
                        Foreground = new SolidColorBrush(Color.FromRgb(225, 29, 72))
                    });
                }
                else
                {
                    paragraph.Inlines.Add(new Run(part));
                }
            }
        }
    }
}
