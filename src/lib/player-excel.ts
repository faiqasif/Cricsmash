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
  sheet.getCell(1, 1).note = "Keep this header row. Add one player per row below it. Blank cells stay empty. Import the Players sheet.";

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

function plainCell(value: unknown) {
  if (value == null) return null;
  if (typeof value === "object" && value !== null && "result" in value && !("text" in value) && !("richText" in value)) {
    return (value as { result: unknown }).result;
  }
  return value;
}

export async function readPlayerWorkbook(
  file: ArrayBuffer,
  customFields: Pick<PlayerCustomField, "id" | "name">[] = [],
): Promise<{ rows: ParsedPlayerRow[]; ignoredColumns: string[] }> {
  const ExcelJS = (await import("exceljs")).default;
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(file);
  const sheet = workbook.getWorksheet(PLAYERS_SHEET) ?? workbook.worksheets[0];
  if (!sheet) throw new Error("The file has no sheets.");
  const header = sheet.getRow(1);
  const headers: string[] = [];
  header.eachCell({ includeEmpty: false }, (cell, index) => {
    headers[index] = String(cell.value ?? "").trim();
  });
  const columns = playerColumns(customFields);
  const recognized = headers.some((item) => columns.some((column) => column.key.toLowerCase() === item.toLowerCase() || column.label.toLowerCase() === item.toLowerCase()));
  if (!recognized) {
    throw new Error("The first row must be the template header. Download the template and keep that row.");
  }
  const table: { row: number; cells: Record<string, unknown> }[] = [];
  sheet.eachRow((excelRow, rowNumber) => {
    if (rowNumber === 1) return;
    const cells: Record<string, unknown> = {};
    headers.forEach((name, index) => {
      if (!name) return;
      cells[name] = plainCell(excelRow.getCell(index).value);
    });
    table.push({ row: rowNumber, cells });
  });
  return parsePlayerRows(table, customFields);
}
