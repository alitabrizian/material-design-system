using System.Globalization;
using System.IO.Compression;
using System.Text;

namespace PartoBita.DesignSystem.Blazor.Components;

/// <summary>A cell of an export row: its value and whether it is a group/header/summary cell.</summary>
internal readonly record struct ExportCell(object? Value, bool Bold = false, string? Format = null);

internal sealed record ExportRow(IReadOnlyList<ExportCell> Cells, int OutlineLevel = 0);

/// <summary>
/// Data-aware export without third-party packages: XLSX (Office Open XML written with
/// <see cref="ZipArchive"/>, numbers and dates stay typed, header frozen with AutoFilter, group rows
/// outlined) and CSV (UTF-8 with BOM so Excel detects the encoding).
/// </summary>
internal static class GridExport
{
    private const string MainNs = "http://schemas.openxmlformats.org/spreadsheetml/2006/main";
    private const string RelNs = "http://schemas.openxmlformats.org/officeDocument/2006/relationships";

    // Cell style indexes in styles.xml.
    private const int StyleBold = 1, StyleDate = 2, StyleDecimal = 3, StyleInteger = 4, StyleBoldDecimal = 5, StyleDateTime = 6, StyleBoldInteger = 7;

    public static byte[] ToXlsx(string sheetName, IReadOnlyList<string> headers, IReadOnlyList<double> widths, IEnumerable<ExportRow> rows)
    {
        using var stream = new MemoryStream();
        using (var zip = new ZipArchive(stream, ZipArchiveMode.Create, leaveOpen: true))
        {
            Add(zip, "[Content_Types].xml",
                "<?xml version=\"1.0\" encoding=\"UTF-8\" standalone=\"yes\"?><Types xmlns=\"http://schemas.openxmlformats.org/package/2006/content-types\">" +
                "<Default Extension=\"rels\" ContentType=\"application/vnd.openxmlformats-package.relationships+xml\"/><Default Extension=\"xml\" ContentType=\"application/xml\"/>" +
                "<Override PartName=\"/xl/workbook.xml\" ContentType=\"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml\"/>" +
                "<Override PartName=\"/xl/worksheets/sheet1.xml\" ContentType=\"application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml\"/>" +
                "<Override PartName=\"/xl/styles.xml\" ContentType=\"application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml\"/></Types>");
            Add(zip, "_rels/.rels",
                "<?xml version=\"1.0\" encoding=\"UTF-8\" standalone=\"yes\"?><Relationships xmlns=\"http://schemas.openxmlformats.org/package/2006/relationships\">" +
                "<Relationship Id=\"rId1\" Type=\"http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument\" Target=\"xl/workbook.xml\"/></Relationships>");
            Add(zip, "xl/workbook.xml",
                $"<?xml version=\"1.0\" encoding=\"UTF-8\" standalone=\"yes\"?><workbook xmlns=\"{MainNs}\" xmlns:r=\"{RelNs}\"><sheets>" +
                $"<sheet name=\"{Escape(SheetName(sheetName))}\" sheetId=\"1\" r:id=\"rId1\"/></sheets>" +
                (headers.Count > 0 ? $"<definedNames><definedName name=\"_xlnm._FilterDatabase\" localSheetId=\"0\" hidden=\"1\">'{Escape(SheetName(sheetName))}'!$A$1:${ColumnName(headers.Count - 1)}$1</definedName></definedNames>" : "") +
                "</workbook>");
            Add(zip, "xl/_rels/workbook.xml.rels",
                "<?xml version=\"1.0\" encoding=\"UTF-8\" standalone=\"yes\"?><Relationships xmlns=\"http://schemas.openxmlformats.org/package/2006/relationships\">" +
                "<Relationship Id=\"rId1\" Type=\"http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet\" Target=\"worksheets/sheet1.xml\"/>" +
                "<Relationship Id=\"rId2\" Type=\"http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles\" Target=\"styles.xml\"/></Relationships>");
            Add(zip, "xl/styles.xml",
                $"<?xml version=\"1.0\" encoding=\"UTF-8\" standalone=\"yes\"?><styleSheet xmlns=\"{MainNs}\">" +
                "<numFmts count=\"2\"><numFmt numFmtId=\"164\" formatCode=\"yyyy-mm-dd\"/><numFmt numFmtId=\"165\" formatCode=\"yyyy-mm-dd hh:mm\"/></numFmts>" +
                "<fonts count=\"2\"><font><sz val=\"11\"/><name val=\"Calibri\"/></font><font><b/><sz val=\"11\"/><name val=\"Calibri\"/></font></fonts>" +
                "<fills count=\"2\"><fill><patternFill patternType=\"none\"/></fill><fill><patternFill patternType=\"gray125\"/></fill></fills>" +
                "<borders count=\"1\"><border><left/><right/><top/><bottom/><diagonal/></border></borders>" +
                "<cellStyleXfs count=\"1\"><xf numFmtId=\"0\" fontId=\"0\" fillId=\"0\" borderId=\"0\"/></cellStyleXfs>" +
                "<cellXfs count=\"8\">" +
                "<xf numFmtId=\"0\" fontId=\"0\" fillId=\"0\" borderId=\"0\" xfId=\"0\"/>" +
                "<xf numFmtId=\"0\" fontId=\"1\" fillId=\"0\" borderId=\"0\" xfId=\"0\" applyFont=\"1\"/>" +
                "<xf numFmtId=\"164\" fontId=\"0\" fillId=\"0\" borderId=\"0\" xfId=\"0\" applyNumberFormat=\"1\"/>" +
                "<xf numFmtId=\"4\" fontId=\"0\" fillId=\"0\" borderId=\"0\" xfId=\"0\" applyNumberFormat=\"1\"/>" +
                "<xf numFmtId=\"3\" fontId=\"0\" fillId=\"0\" borderId=\"0\" xfId=\"0\" applyNumberFormat=\"1\"/>" +
                "<xf numFmtId=\"4\" fontId=\"1\" fillId=\"0\" borderId=\"0\" xfId=\"0\" applyNumberFormat=\"1\" applyFont=\"1\"/>" +
                "<xf numFmtId=\"165\" fontId=\"0\" fillId=\"0\" borderId=\"0\" xfId=\"0\" applyNumberFormat=\"1\"/>" +
                "<xf numFmtId=\"3\" fontId=\"1\" fillId=\"0\" borderId=\"0\" xfId=\"0\" applyNumberFormat=\"1\" applyFont=\"1\"/>" +
                "</cellXfs><cellStyles count=\"1\"><cellStyle name=\"Normal\" xfId=\"0\" builtinId=\"0\"/></cellStyles></styleSheet>");

            var entry = zip.CreateEntry("xl/worksheets/sheet1.xml", CompressionLevel.Optimal);
            using var writer = new StreamWriter(entry.Open(), new UTF8Encoding(false));
            writer.Write($"<?xml version=\"1.0\" encoding=\"UTF-8\" standalone=\"yes\"?><worksheet xmlns=\"{MainNs}\" xmlns:r=\"{RelNs}\">");
            writer.Write("<sheetPr><outlinePr summaryBelow=\"0\"/></sheetPr>");
            writer.Write("<sheetViews><sheetView workbookViewId=\"0\"><pane ySplit=\"1\" topLeftCell=\"A2\" activePane=\"bottomLeft\" state=\"frozen\"/></sheetView></sheetViews>");
            writer.Write("<sheetFormatPr defaultRowHeight=\"15\"/><cols>");
            for (var i = 0; i < widths.Count; i++)
                writer.Write($"<col min=\"{i + 1}\" max=\"{i + 1}\" width=\"{widths[i].ToString("0.##", CultureInfo.InvariantCulture)}\" customWidth=\"1\"/>");
            writer.Write("</cols><sheetData>");
            var r = 1;
            WriteRow(writer, r++, new ExportRow(headers.Select(h => new ExportCell(h, Bold: true)).ToList()));
            foreach (var row in rows) WriteRow(writer, r++, row);
            writer.Write("</sheetData>");
            if (headers.Count > 0) writer.Write($"<autoFilter ref=\"A1:{ColumnName(headers.Count - 1)}1\"/>");
            writer.Write("</worksheet>");
        }
        return stream.ToArray();
    }

    private static void WriteRow(TextWriter writer, int r, ExportRow row)
    {
        writer.Write(row.OutlineLevel > 0 ? $"<row r=\"{r}\" outlineLevel=\"{Math.Min(7, row.OutlineLevel)}\">" : $"<row r=\"{r}\">");
        for (var c = 0; c < row.Cells.Count; c++)
        {
            var cell = row.Cells[c];
            var reference = ColumnName(c) + r.ToString(CultureInfo.InvariantCulture);
            switch (cell.Value)
            {
                case null:
                    break;
                case bool b:
                    writer.Write($"<c r=\"{reference}\" t=\"b\"{StyleAttr(cell.Bold ? StyleBold : 0)}><v>{(b ? 1 : 0)}</v></c>");
                    break;
                case DateTime d:
                    writer.Write($"<c r=\"{reference}\"{StyleAttr(d.TimeOfDay == TimeSpan.Zero ? StyleDate : StyleDateTime)}><v>{d.ToOADate().ToString(CultureInfo.InvariantCulture)}</v></c>");
                    break;
                case DateOnly d:
                    writer.Write($"<c r=\"{reference}\"{StyleAttr(StyleDate)}><v>{d.ToDateTime(TimeOnly.MinValue).ToOADate().ToString(CultureInfo.InvariantCulture)}</v></c>");
                    break;
                case DateTimeOffset d:
                    writer.Write($"<c r=\"{reference}\"{StyleAttr(StyleDateTime)}><v>{d.DateTime.ToOADate().ToString(CultureInfo.InvariantCulture)}</v></c>");
                    break;
                case Enum e:
                    writer.Write($"<c r=\"{reference}\" t=\"inlineStr\"{StyleAttr(cell.Bold ? StyleBold : 0)}><is><t>{Escape(PBDataGridColumn.SplitWords(e.ToString()))}</t></is></c>");
                    break;
                case var number when GridField.IsNumeric(number.GetType()):
                    var integer = number is int or long or short or byte or uint or ulong or ushort;
                    var style = integer ? (cell.Bold ? StyleBoldInteger : StyleInteger) : (cell.Bold ? StyleBoldDecimal : StyleDecimal);
                    writer.Write($"<c r=\"{reference}\"{StyleAttr(style)}><v>{Convert.ToString(number, CultureInfo.InvariantCulture)}</v></c>");
                    break;
                default:
                    var text = Convert.ToString(cell.Value, CultureInfo.CurrentCulture) ?? "";
                    writer.Write($"<c r=\"{reference}\" t=\"inlineStr\"{StyleAttr(cell.Bold ? StyleBold : 0)}><is><t xml:space=\"preserve\">{Escape(text)}</t></is></c>");
                    break;
            }
        }
        writer.Write("</row>");
    }

    public static byte[] ToCsv(IReadOnlyList<string> headers, IEnumerable<ExportRow> rows)
    {
        var builder = new StringBuilder();
        builder.AppendJoin(',', headers.Select(Quote)).Append("\r\n");
        foreach (var row in rows)
        {
            builder.AppendJoin(',', row.Cells.Select(c => Quote(c.Value switch
            {
                null => "",
                DateTime d => d.TimeOfDay == TimeSpan.Zero ? d.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture) : d.ToString("yyyy-MM-dd HH:mm:ss", CultureInfo.InvariantCulture),
                DateOnly d => d.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture),
                IFormattable f when GridField.IsNumeric(c.Value.GetType()) => f.ToString(null, CultureInfo.InvariantCulture),
                _ => Convert.ToString(c.Value, CultureInfo.CurrentCulture) ?? "",
            }))).Append("\r\n");
        }
        return [.. Encoding.UTF8.GetPreamble(), .. Encoding.UTF8.GetBytes(builder.ToString())];
    }

    private static string Quote(string value) =>
        value.IndexOfAny([',', '"', '\r', '\n']) >= 0 ? "\"" + value.Replace("\"", "\"\"") + "\"" : value;

    private static string StyleAttr(int style) => style == 0 ? "" : $" s=\"{style}\"";

    private static void Add(ZipArchive zip, string name, string content)
    {
        var entry = zip.CreateEntry(name, CompressionLevel.Optimal);
        using var writer = new StreamWriter(entry.Open(), new UTF8Encoding(false));
        writer.Write(content);
    }

    internal static string ColumnName(int index)
    {
        var name = "";
        for (index++; index > 0; index = (index - 1) / 26) name = (char)('A' + (index - 1) % 26) + name;
        return name;
    }

    private static string SheetName(string name)
    {
        var clean = new string(name.Where(c => c is not ('\\' or '/' or '?' or '*' or '[' or ']' or ':')).ToArray());
        return clean.Length == 0 ? "Sheet1" : clean[..Math.Min(31, clean.Length)];
    }

    private static string Escape(string text)
    {
        var builder = new StringBuilder(text.Length);
        foreach (var c in text)
        {
            switch (c)
            {
                case '<': builder.Append("&lt;"); break;
                case '>': builder.Append("&gt;"); break;
                case '&': builder.Append("&amp;"); break;
                case '"': builder.Append("&quot;"); break;
                case '\t' or '\n' or '\r': builder.Append(c); break;
                case < ' ': break;
                default: builder.Append(c); break;
            }
        }
        return builder.ToString();
    }
}

/// <summary>Grids taking part in row drag and drop, per JS runtime (per circuit on Blazor Server).</summary>
internal static class GridDragRegistry
{
    private static readonly System.Runtime.CompilerServices.ConditionalWeakTable<object, Dictionary<string, IGridDragSource>> Grids = new();

    public static void Register(object runtime, string id, IGridDragSource grid)
    {
        lock (Grids) Grids.GetOrCreateValue(runtime)[id] = grid;
    }

    public static void Unregister(object runtime, string id)
    {
        lock (Grids)
        {
            if (Grids.TryGetValue(runtime, out var grids)) grids.Remove(id);
        }
    }

    public static IGridDragSource? Find(object runtime, string id)
    {
        lock (Grids) return Grids.TryGetValue(runtime, out var grids) && grids.TryGetValue(id, out var grid) ? grid : null;
    }
}

internal interface IGridDragSource
{
    IReadOnlyList<object?> DraggedItems { get; }

    void Invalidate();
}
