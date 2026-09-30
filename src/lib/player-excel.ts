import { COUNTRIES } from "@/data/cricket";
import type { PlayerCustomField } from "@/lib/players";
import { parsePlayerRows, playerColumns, type ParsedPlayerRow, type SheetColumn } from "@/lib/player-sheet";

const PLAYERS_SHEET = "Players";

function columnList(column: SheetColumn) {
  if (column.kind === "role") return '"batsman,bowler,all-rounder,wicketkeeper"';
  if (column.kind === "status") return '"active,inactive"';
  if (column.kind === "hand") return '"righty,lefty"';
  if (column.kind === "bool") return '"yes,no"';
  if (column.kind === "country") return `"${COUNTRIES.map((item) => item.name).join(",")}"`;
  return "";
}

export async function buildPlayerWorkbook(customFields: Pick<PlayerCustomField, "id" | "name">[] = []) {
  const ExcelJS = (await import("exceljs")).default;
  const columns = playerColumns(customFields);
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "CricSmash";
  workbook.created = new Date();

  const sheet = workbook.addWorksheet(PLAYERS_SHEET, {
    views: [{ state: "frozen", ySplit: 1 }],
  });
  sheet.columns = columns.map((column) => ({
    header: column.key,
    key: column.key,
    width: Math.min(36, Math.max(16, column.label.length + 2)),
  }));
  const header = sheet.getRow(1);
  header.height = 32;
  header.font = { bold: true, color: { argb: "FFFFFFFF" }, name: "Calibri", size: 11 };
  header.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF6D4DFF" } };
  header.alignment = { vertical: "middle", wrapText: true };
  sheet.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: columns.length } };

  columns.forEach((column, index) => {
    const list = columnList(column);
    if (!list) return;
    for (let row = 2; row <= 300; row += 1) {
      sheet.getCell(row, index + 1).dataValidation = {
        type: "list",
        allowBlank: !column.required,
        formulae: [list],
        showErrorMessage: true,
        errorTitle: column.label,
        error: column.hint,
      };
    }
  });

  const guide = workbook.addWorksheet("Guide");
  guide.columns = [
    { header: "Column", key: "key", width: 42 },
    { header: "Label", key: "label", width: 42 },
    { header: "Group", key: "group", width: 16 },
    { header: "Required", key: "required", width: 12 },
    { header: "How to fill it", key: "hint", width: 78 },
    { header: "Example", key: "example", width: 24 },
  ];
  const guideHeader = guide.getRow(1);
  guideHeader.font = { bold: true, color: { argb: "FFFFFFFF" } };
  guideHeader.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF16122A" } };
  guide.addRows(columns.map((column) => ({
    key: column.key,
    label: column.label,
    group: column.group,
    required: column.required ? "Yes" : "",
    hint: column.hint,
    example: column.example,
  })));
  guide.views = [{ state: "frozen", ySplit: 1 }];
  guide.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: 6 } };

  const example = workbook.addWorksheet("Example");
  example.addRow(columns.map((column) => column.key));
  example.addRow(columns.map((column) => column.example));
  example.getRow(1).font = { bold: true };
  example.getCell(3, 1).value = "This sheet is only a sample. Type players on the Players sheet.";
  return workbook;
}

export async function downloadPlayerTemplate(customFields: Pick<PlayerCustomField, "id" | "name">[] = []) {
  const workbook = await buildPlayerWorkbook(customFields);
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "player-import-template.xlsx";
  link.click();
  URL.revokeObjectURL(url);
}

function decodeXml(value: string) {
  return value
    .replace(/&#(\d+);/g, (_, code: string) => String.fromCharCode(Number(code)))
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, "\"")
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&");
}

function textNodes(xml: string) {
  return [...xml.matchAll(/<t[^>]*>([\s\S]*?)<\/t>/g)].map((match) => decodeXml(match[1] ?? "")).join("");
}

async function sharedStrings(zip: { file: (name: string) => { async: (type: "string") => Promise<string> } | null }) {
  const entry = zip.file("xl/sharedStrings.xml");
  if (!entry) return [];
  const xml = await entry.async("string");
  return [...xml.matchAll(/<si\b[^>]*>([\s\S]*?)<\/si>/g)].map((match) => textNodes(match[1] ?? ""));
}

function sheetPath(target: string) {
  const clean = target.replace(/^\//, "");
  if (clean.startsWith("xl/")) return clean;
  return `xl/${clean.replace(/^\.\.\//, "")}`;
}

function cellValue(attrs: string, inner: string, strings: string[]) {
  const type = /(?:^|\s)t="([^"]+)"/.exec(attrs)?.[1] ?? "";
  if (type === "inlineStr") return textNodes(inner);
  const raw = /<v>([\s\S]*?)<\/v>/.exec(inner)?.[1];
  if (raw == null) return "";
  const text = decodeXml(raw);
  if (type === "s") return strings[Number(text)] ?? "";
  if (type === "b") return text === "1" ? "yes" : "no";
  if (type === "str") return text;
  const number = Number(text);
  return Number.isFinite(number) ? number : text;
}

async function readSheetTable(file: ArrayBuffer) {
  const JSZip = (await import("jszip")).default;
  const zip = await JSZip.loadAsync(file);
  const workbook = await zip.file("xl/workbook.xml")?.async("string");
  const rels = await zip.file("xl/_rels/workbook.xml.rels")?.async("string");
  if (!workbook || !rels) throw new Error("This file is not an Excel workbook.");
  const attr = (tag: string, name: string) => new RegExp(`(?:^|\\s)${name}="([^"]*)"`).exec(tag)?.[1] ?? "";
  const sheets = [...workbook.matchAll(/<sheet\b[^>]*>/g)].map((match) => ({
    name: decodeXml(attr(match[0], "name")),
    id: attr(match[0], "r:id"),
  }));
  const targets = new Map(
    [...rels.matchAll(/<Relationship\b[^>]*>/g)].map((match) => [attr(match[0], "Id"), attr(match[0], "Target")]),
  );
  const chosen = sheets.find((sheet) => sheet.name === PLAYERS_SHEET) ?? sheets[0];
  const target = chosen ? targets.get(chosen.id) : "";
  if (!chosen || !target) throw new Error("The file has no sheets.");
  const sheetXml = await zip.file(sheetPath(target))?.async("string");
  if (!sheetXml) throw new Error("The Players sheet could not be read.");
  const strings = await sharedStrings(zip);
  const rows = new Map<number, Record<number, string | number>>();
  for (const row of sheetXml.matchAll(/<row\b[^>]*\br="(\d+)"[^>]*>([\s\S]*?)<\/row>/g)) {
    const rowNumber = Number(row[1]);
    const cells: Record<number, string | number> = {};
    for (const cell of (row[2] ?? "").matchAll(/<c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g)) {
      const ref = /(?:^|\s)r="([A-Z]+)\d+"/.exec(cell[1] ?? "")?.[1] ?? "";
      if (!ref) continue;
      let index = 0;
      for (const letter of ref) index = index * 26 + (letter.charCodeAt(0) - 64);
      const value = cellValue(cell[1] ?? "", cell[2] ?? "", strings);
      if (value !== "") cells[index] = value;
    }
    if (Object.keys(cells).length) rows.set(rowNumber, cells);
  }
  return rows;
}

export async function readPlayerWorkbook(
  file: ArrayBuffer,
  customFields: Pick<PlayerCustomField, "id" | "name">[] = [],
): Promise<{ rows: ParsedPlayerRow[]; ignoredColumns: string[] }> {
  const grid = await readSheetTable(file);
  const header = grid.get(1);
  if (!header) throw new Error("The first row must be the template header. Download the template and keep that row.");
  const headers = new Map<number, string>();
  for (const [index, value] of Object.entries(header)) headers.set(Number(index), String(value).trim());
  const columns = playerColumns(customFields);
  const recognized = [...headers.values()].some((item) =>
    columns.some((column) => column.key.toLowerCase() === item.toLowerCase() || column.label.toLowerCase() === item.toLowerCase()),
  );
  if (!recognized) throw new Error("The first row must be the template header. Download the template and keep that row.");
  const table: { row: number; cells: Record<string, unknown> }[] = [];
  for (const [rowNumber, cells] of grid) {
    if (rowNumber === 1) continue;
    const record: Record<string, unknown> = {};
    for (const [index, value] of Object.entries(cells)) {
      const name = headers.get(Number(index));
      if (name) record[name] = value;
    }
    table.push({ row: rowNumber, cells: record });
  }
  return parsePlayerRows(table, customFields);
}
