import fs from "node:fs/promises";
import path from "node:path";
import ExcelJS from "exceljs";

const NAS_DIR = process.env.NAS_DIR;

const SHEET_PATTERN = /^(0[1-9]|1[0-2])-(\d{4})$/;
const FILE_PATTERN = /^(.+?)(?:-(\d{4}))?\.xlsx$/i;

// Lấy danh sách file Excel
async function getExcelFiles() {
  const files = await fs.readdir(NAS_DIR, {
    withFileTypes: true,
  });

  return files
    .filter((file) => file.isFile())
    .filter((file) => /\.xlsx$/i.test(file.name))
    .filter((file) => !file.name.startsWith("~$"))
    .map((file) => file.name);
}

// Đọc danh sách sheet của file
async function readSheets(fileName) {
  const filePath = path.join(NAS_DIR, fileName);

  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(filePath);

  return workbook.worksheets
    .map((sheet) => sheet.name)
    .filter((name) => SHEET_PATTERN.test(name));
}

// Lấy model từ tên file
function parseFileName(fileName) {
  const match = fileName.match(FILE_PATTERN);

  if (!match) return null;

  return {
    model: match[1],
    fileYear: match[2] ? Number(match[2]) : null,
    fileName,
  };
}

// API: Danh sách model
export async function getModels() {
  const files = await getExcelFiles();

  const models = files.map(parseFileName).filter(Boolean);

  return [...new Set(models.map((item) => item.model))].sort();
}

// API: Danh sách sheet theo model và năm
export async function getSheets(model, year) {
  const files = await getExcelFiles();

  const matchingFiles = files
    .map(parseFileName)
    .filter(Boolean)
    .filter((item) => item.model === model);

  if (matchingFiles.length === 0) {
    const error = new Error("Không tìm thấy model");
    error.status = 404;
    throw error;
  }

  const allSheets = [];

  for (const file of matchingFiles) {
    const sheets = await readSheets(file.fileName);

    for (const sheet of sheets) {
      const match = sheet.match(SHEET_PATTERN);

      if (Number(match[2]) === Number(year)) {
        allSheets.push(sheet);
      }
    }
  }

  return [...new Set(allSheets)].sort().reverse();
}
