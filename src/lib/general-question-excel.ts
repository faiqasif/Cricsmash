export type GeneralQuestionRow = {
  row: number;
  title: string;
  option_1: string;
  option_2: string;
  option_3: string;
  option_4: string;
  correct_option: number;
  category: string;
  used: boolean;
  error: string;
};

const HEADERS = ["Question Title", "Option A", "Option B", "Option C", "Option D", "Correct option", "Category", "Status"];

function cellText(value: unknown) {
  if (value == null) return "";
  if (typeof value === "object" && value && "text" in value && typeof (value as { text?: unknown }).text === "string") {
    return (value as { text: string }).text.trim();
  }
  return String(value).trim();
}

function headerIndex(header: string) {
  const key = header.trim().toLowerCase().replace(/\s+/g, " ");
  if (key === "question title" || key === "title" || key === "question") return "title";
  if (key === "option a" || key === "a") return "a";
  if (key === "option b" || key === "b") return "b";
  if (key === "option c" || key === "c") return "c";
  if (key === "option d" || key === "d") return "d";
  if (key === "correct option" || key === "correct" || key === "answer") return "correct";
  if (key === "category") return "category";
  if (key === "status" || key === "used") return "used";
  return "";
}

function correctOption(value: string, options: string[]) {
  const text = value.trim().toLowerCase();
  if (text === "a" || text === "1") return 1;
  if (text === "b" || text === "2") return 2;
  if (text === "c" || text === "3") return 3;
  if (text === "d" || text === "4") return 4;
  const index = options.findIndex((option) => option.toLowerCase() === text);
  return index >= 0 ? index + 1 : 0;
}

function usedValue(value: string) {
  const text = value.trim().toLowerCase().replace(/\s+/g, "");
  if (!text || text === "no" || text === "used=no" || text === "unused") return false;
  if (text === "yes" || text === "used=yes" || text === "used") return true;
  return null;
}

export async function downloadGeneralQuestionTemplate() {
  const ExcelJS = (await import("exceljs")).default;
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Questions");
  sheet.addRow(HEADERS);
  sheet.addRow(["Who won the 2019 Cricket World Cup?", "England", "New Zealand", "Australia", "India", "A", "General Questions", "Used=No"]);
  sheet.getRow(1).font = { bold: true };
  sheet.columns = HEADERS.map((header) => ({ width: Math.max(18, header.length + 4) }));
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "general-questions-template.xlsx";
  link.click();
  URL.revokeObjectURL(url);
}

export async function readGeneralQuestionWorkbook(file: ArrayBuffer): Promise<GeneralQuestionRow[]> {
  const ExcelJS = (await import("exceljs")).default;
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(file);
  const sheet = workbook.worksheets[0];
  if (!sheet) throw new Error("The workbook has no sheet.");
  const header = sheet.getRow(1);
  const columns = new Map<string, number>();
  header.eachCell((cell, index) => {
    const key = headerIndex(cellText(cell.value));
    if (key) columns.set(key, index);
  });
  if (!columns.has("title") || !columns.has("a") || !columns.has("correct")) {
    throw new Error("Use the template columns: Question Title, Option A, Option B, Option C, Option D, Correct option, Category, and Status.");
  }
  const rows: GeneralQuestionRow[] = [];
  sheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return;
    const read = (key: string) => cellText(row.getCell(columns.get(key) ?? 0).value);
    const title = read("title");
    const option1 = read("a");
    const option2 = read("b");
    const option3 = read("c");
    const option4 = read("d");
    const category = read("category");
    const correctText = read("correct");
    const statusText = columns.has("used") ? read("used") : "";
    if (!title && !option1 && !option2 && !option3 && !option4 && !correctText && !category && !statusText) return;
    const errors: string[] = [];
    if (title.length < 8) errors.push("Question title must be at least 8 characters");
    if (!option1 || !option2 || !option3 || !option4) errors.push("Options A, B, C, and D are required");
    const options = [option1, option2, option3, option4];
    if (new Set(options.map((item) => item.toLowerCase())).size !== 4) errors.push("Each option must be different");
    const correct = correctOption(correctText, options);
    if (!correct) errors.push("Correct option must be A, B, C, or D");
    const used = usedValue(statusText);
    if (used == null) errors.push("Status must be Used=No or Used=Yes");
    rows.push({
      row: rowNumber,
      title,
      option_1: option1,
      option_2: option2,
      option_3: option3,
      option_4: option4,
      correct_option: correct,
      category,
      used: used === true,
      error: errors.join(". "),
    });
  });
  return rows;
}
