using System.Net;
using System.Text;
using System.Text.RegularExpressions;
using Microsoft.AspNetCore.Components;

namespace PartoBita.DesignSystem.Docs.Shared;

/// <summary>
/// Minimal regex-based token coloring for code snippets shown in <see cref="ExampleCard"/>.
/// This is a CSS-only approximation, not a real tokenizer/parser — see README notes on
/// upgrading to a JS-interop highlighter (Prism/Highlight.js) if pixel-accurate highlighting
/// is needed later.
/// </summary>
public static class CodeHighlighter
{
    private static readonly string[] CSharpKeywords =
    [
        "public", "private", "protected", "internal", "static", "void", "class", "record", "struct",
        "string", "bool", "int", "double", "decimal", "var", "new", "return", "if", "else", "for",
        "foreach", "while", "using", "namespace", "null", "true", "false", "this", "async", "await",
        "override", "virtual", "abstract", "readonly", "const", "partial", "in", "is", "as", "switch",
        "case", "default", "break", "continue", "typeof", "sealed", "get", "set",
    ];

    private static readonly Regex RazorPattern = new(
        @"(?<Comment><!--[\s\S]*?-->)" +
        @"|(?<String>""[^""]*"")" +
        @"|(?<Tag></?[A-Za-z][\w:-]*)" +
        @"|(?<Razor>@(?:\([^)]*\)|[A-Za-z_][\w]*))",
        RegexOptions.Compiled);

    private static readonly Regex CSharpPattern = new(
        @"(?<Comment>//[^\n]*|/\*[\s\S]*?\*/)" +
        @"|(?<String>@?""[^""]*"")" +
        @"|(?<Keyword>\b(?:" + string.Join("|", CSharpKeywords) + @")\b)",
        RegexOptions.Compiled);

    private static readonly Regex CssPattern = new(
        @"(?<Comment>/\*[\s\S]*?\*/)" +
        @"|(?<String>""[^""]*""|'[^']*')" +
        @"|(?<Property>[\w-]+(?=\s*:))",
        RegexOptions.Compiled);

    private static readonly string[] GroupOrder = ["Comment", "String", "Keyword", "Tag", "Razor", "Property"];

    public static MarkupString Highlight(string? code, string language)
    {
        if (string.IsNullOrEmpty(code))
            return new MarkupString(string.Empty);

        var pattern = language switch
        {
            "csharp" => CSharpPattern,
            "css" => CssPattern,
            _ => RazorPattern,
        };

        var sb = new StringBuilder();
        var lastIndex = 0;

        foreach (Match match in pattern.Matches(code))
        {
            if (match.Index > lastIndex)
                sb.Append(WebUtility.HtmlEncode(code[lastIndex..match.Index]));

            sb.Append("<span class=\"tok-").Append(ClassifyMatch(match)).Append("\">")
              .Append(WebUtility.HtmlEncode(match.Value))
              .Append("</span>");

            lastIndex = match.Index + match.Length;
        }

        if (lastIndex < code.Length)
            sb.Append(WebUtility.HtmlEncode(code[lastIndex..]));

        return new MarkupString(sb.ToString());
    }

    private static string ClassifyMatch(Match match)
    {
        foreach (var name in GroupOrder)
        {
            if (match.Groups[name].Success)
                return name.ToLowerInvariant();
        }

        return "plain";
    }
}
