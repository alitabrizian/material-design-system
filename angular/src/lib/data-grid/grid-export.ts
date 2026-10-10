/*
 * Data-aware export without third-party packages, matching the Blazor grid's GridExport: XLSX
 * (Office Open XML in a stored ZIP: typed numbers and dates, frozen header, AutoFilter, outlined
 * group rows) and CSV (UTF-8 with BOM so Excel detects the encoding).
 */

export interface ExportCell {
  value: unknown;
  bold?: boolean;
}

export interface ExportRow {
  cells: ExportCell[];
  outlineLevel?: number;
}

const MAIN_NS = 'http://schemas.openxmlformats.org/spreadsheetml/2006/main';
const REL_NS = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships';
const STYLE = { bold: 1, date: 2, decimal: 3, integer: 4, boldDecimal: 5, dateTime: 6, boldInteger: 7 };

export function columnName(index: number): string {
  let name = '';
  for (index++; index > 0; index = Math.floor((index - 1) / 26)) name = String.fromCharCode(65 + ((index - 1) % 26)) + name;
  return name;
}

function escapeXml(text: string): string {
  return text.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function sheetName(name: string): string {
  const clean = name.replace(/[\\/?*[\]:]/g, '');
  return (clean || 'Sheet1').slice(0, 31);
}

/** Excel serial date (days since 1899-12-30, local time). */
function oaDate(date: Date): number {
  const utc = Date.UTC(date.getFullYear(), date.getMonth(), date.getDate(), date.getHours(), date.getMinutes(), date.getSeconds());
  return (utc - Date.UTC(1899, 11, 30)) / 86400000;
}

const isDay = (d: Date) => d.getHours() === 0 && d.getMinutes() === 0 && d.getSeconds() === 0;

function cellXml(ref: string, cell: ExportCell): string {
  const value = cell.value;
  const s = (style: number) => (style ? ` s="${style}"` : '');
  if (value == null || value === '') return '';
  if (typeof value === 'boolean') return `<c r="${ref}" t="b"${s(cell.bold ? STYLE.bold : 0)}><v>${value ? 1 : 0}</v></c>`;
  if (value instanceof Date) return `<c r="${ref}"${s(isDay(value) ? STYLE.date : STYLE.dateTime)}><v>${oaDate(value)}</v></c>`;
  if (typeof value === 'number' && isFinite(value)) {
    const integer = Number.isInteger(value);
    const style = integer ? (cell.bold ? STYLE.boldInteger : STYLE.integer) : cell.bold ? STYLE.boldDecimal : STYLE.decimal;
    return `<c r="${ref}"${s(style)}><v>${value}</v></c>`;
  }
  return `<c r="${ref}" t="inlineStr"${s(cell.bold ? STYLE.bold : 0)}><is><t xml:space="preserve">${escapeXml(String(value))}</t></is></c>`;
}

export function toXlsx(name: string, headers: string[], widths: number[], rows: ExportRow[]): Blob {
  const sheet = escapeXml(sheetName(name));
  const last = columnName(Math.max(0, headers.length - 1));
  const parts: string[] = [];
  parts.push(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="${MAIN_NS}" xmlns:r="${REL_NS}">`);
  parts.push('<sheetPr><outlinePr summaryBelow="0"/></sheetPr>');
  parts.push('<sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>');
  parts.push('<sheetFormatPr defaultRowHeight="15"/><cols>');
  widths.forEach((w, i) => parts.push(`<col min="${i + 1}" max="${i + 1}" width="${w.toFixed(2)}" customWidth="1"/>`));
  parts.push('</cols><sheetData>');
  const all: ExportRow[] = [{ cells: headers.map((h) => ({ value: h, bold: true })) }, ...rows];
  all.forEach((row, r) => {
    const level = Math.min(7, row.outlineLevel ?? 0);
    parts.push(level > 0 ? `<row r="${r + 1}" outlineLevel="${level}">` : `<row r="${r + 1}">`);
    row.cells.forEach((cell, c) => parts.push(cellXml(`${columnName(c)}${r + 1}`, cell)));
    parts.push('</row>');
  });
  parts.push('</sheetData>');
  if (headers.length) parts.push(`<autoFilter ref="A1:${last}1"/>`);
  parts.push('</worksheet>');

  const files: [string, string][] = [
    [
      '[Content_Types].xml',
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' +
        '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/>' +
        '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>' +
        '<Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>' +
        '<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/></Types>',
    ],
    [
      '_rels/.rels',
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
        '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>',
    ],
    [
      'xl/workbook.xml',
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="${MAIN_NS}" xmlns:r="${REL_NS}"><sheets><sheet name="${sheet}" sheetId="1" r:id="rId1"/></sheets>` +
        (headers.length ? `<definedNames><definedName name="_xlnm._FilterDatabase" localSheetId="0" hidden="1">'${sheet}'!$A$1:$${last}$1</definedName></definedNames>` : '') +
        '</workbook>',
    ],
    [
      'xl/_rels/workbook.xml.rels',
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
        '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>' +
        '<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>',
    ],
    [
      'xl/styles.xml',
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><styleSheet xmlns="${MAIN_NS}">` +
        '<numFmts count="2"><numFmt numFmtId="164" formatCode="yyyy-mm-dd"/><numFmt numFmtId="165" formatCode="yyyy-mm-dd hh:mm"/></numFmts>' +
        '<fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><name val="Calibri"/></font></fonts>' +
        '<fills count="2"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill></fills>' +
        '<borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders>' +
        '<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="8">' +
        '<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>' +
        '<xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1"/>' +
        '<xf numFmtId="164" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/>' +
        '<xf numFmtId="4" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/>' +
        '<xf numFmtId="3" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/>' +
        '<xf numFmtId="4" fontId="1" fillId="0" borderId="0" xfId="0" applyNumberFormat="1" applyFont="1"/>' +
        '<xf numFmtId="165" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/>' +
        '<xf numFmtId="3" fontId="1" fillId="0" borderId="0" xfId="0" applyNumberFormat="1" applyFont="1"/>' +
        '</cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>',
    ],
    ['xl/worksheets/sheet1.xml', parts.join('')],
  ];
  return new Blob([zip(files) as BlobPart], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
}

export function toCsv(headers: string[], rows: ExportRow[]): Blob {
  const quote = (v: string) => (/[",\r\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);
  const text = (v: unknown): string => {
    if (v == null) return '';
    if (v instanceof Date) {
      const iso = new Date(v.getTime() - v.getTimezoneOffset() * 60000).toISOString();
      return isDay(v) ? iso.slice(0, 10) : iso.slice(0, 19).replace('T', ' ');
    }
    return String(v);
  };
  const lines = [headers.map(quote).join(','), ...rows.map((r) => r.cells.map((c) => quote(text(c.value))).join(','))];
  return new Blob(['﻿' + lines.join('\r\n') + '\r\n'], { type: 'text/csv;charset=utf-8' });
}

export function download(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// ------------------------------------------------------------------------------ ZIP (stored)

let crcTable: Uint32Array | null = null;

function crc32(data: Uint8Array): number {
  if (!crcTable) {
    crcTable = new Uint32Array(256);
    for (let n = 0; n < 256; n++) {
      let c = n;
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      crcTable[n] = c >>> 0;
    }
  }
  let crc = 0xffffffff;
  for (let i = 0; i < data.length; i++) crc = crcTable[(crc ^ data[i]) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

/** A ZIP archive with uncompressed (stored) entries: all Office needs. */
function zip(files: [string, string][]): Uint8Array {
  const encoder = new TextEncoder();
  const chunks: Uint8Array[] = [];
  const central: Uint8Array[] = [];
  let offset = 0;
  for (const [name, content] of files) {
    const nameBytes = encoder.encode(name);
    const data = encoder.encode(content);
    const crc = crc32(data);
    const local = new DataView(new ArrayBuffer(30));
    local.setUint32(0, 0x04034b50, true);
    local.setUint16(4, 20, true);
    local.setUint16(6, 0x0800, true); // UTF-8 names
    local.setUint16(8, 0, true); // stored
    local.setUint32(14, crc, true);
    local.setUint32(18, data.length, true);
    local.setUint32(22, data.length, true);
    local.setUint16(26, nameBytes.length, true);
    chunks.push(new Uint8Array(local.buffer), nameBytes, data);

    const entry = new DataView(new ArrayBuffer(46));
    entry.setUint32(0, 0x02014b50, true);
    entry.setUint16(4, 20, true);
    entry.setUint16(6, 20, true);
    entry.setUint16(8, 0x0800, true);
    entry.setUint32(16, crc, true);
    entry.setUint32(20, data.length, true);
    entry.setUint32(24, data.length, true);
    entry.setUint16(28, nameBytes.length, true);
    entry.setUint32(42, offset, true);
    central.push(new Uint8Array(entry.buffer), nameBytes);
    offset += 30 + nameBytes.length + data.length;
  }
  const centralSize = central.reduce((n, c) => n + c.length, 0);
  const end = new DataView(new ArrayBuffer(22));
  end.setUint32(0, 0x06054b50, true);
  end.setUint16(8, files.length, true);
  end.setUint16(10, files.length, true);
  end.setUint32(12, centralSize, true);
  end.setUint32(16, offset, true);
  const all = [...chunks, ...central, new Uint8Array(end.buffer)];
  const result = new Uint8Array(all.reduce((n, c) => n + c.length, 0));
  let position = 0;
  for (const c of all) {
    result.set(c, position);
    position += c.length;
  }
  return result;
}
