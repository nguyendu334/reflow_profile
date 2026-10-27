import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";
import AdmZip from "adm-zip";
import { DOMParser, XMLSerializer } from "@xmldom/xmldom";
import { createHash } from "node:crypto";

const NAS_DIR = process.env.NAS_DIR;

const SOFFICE =
  process.env.LIBREOFFICE_PATH ||
  "C:\\Program Files\\LibreOffice\\program\\soffice.exe";

const SHEET_PATTERN = /^(0[1-9]|1[0-2])-\d{4}$/;

function makeError(message, status = 500) {
  const error = new Error(message);
  error.status = status;
  return error;
}

async function findWorkbook(model, sheetName) {
  const files = await fs.readdir(NAS_DIR);
  const candidates = files.filter((name) => {
    if (name.startsWith("~$") || !/\.xlsx$/i.test(name)) {
      return false;
    }

    const base = name.replace(/\.xlsx$/i, "");
    const parsedModel = base.replace(/-\d{4}$/, "");

    return parsedModel === model;
  });

  const matches = [];

  for (const fileName of candidates) {
    const zip = new AdmZip(path.join(NAS_DIR, fileName));
    const entry = zip.getEntry("xl/workbook.xml");
    if (!entry) continue;

    const doc = new DOMParser().parseFromString(
      entry.getData().toString("utf8"),
      "application/xml",
    );

    const sheets = Array.from(doc.getElementsByTagName("sheet"));

    if (sheets.some((s) => s.getAttribute("name") === sheetName)) {
      matches.push(fileName);
    }
  }

  if (matches.length === 0) {
    throw makeError("Không tìm thấy sheet báo cáo", 404);
  }

  if (matches.length > 1) {
    throw makeError("Có nhiều file chứa cùng báo cáo", 409);
  }

  return path.join(NAS_DIR, matches[0]);
}

function showOnlySheet(zip, sheetName) {
  const entry = zip.getEntry("xl/workbook.xml");

  if (!entry) {
    throw makeError("File Excel không hợp lệ", 422);
  }

  const doc = new DOMParser().parseFromString(
    entry.getData().toString("utf8"),
    "application/xml",
  );

  const sheets = Array.from(doc.getElementsByTagName("sheet"));
  const selectedIndex = sheets.findIndex(
    (sheet) => sheet.getAttribute("name") === sheetName,
  );

  if (selectedIndex === -1) {
    throw makeError("Sheet không tồn tại", 404);
  }

  sheets.forEach((sheet, index) => {
    sheet.setAttribute("state", index === selectedIndex ? "visible" : "hidden");
  });

  const views = doc.getElementsByTagName("workbookView");

  if (views.length > 0) {
    views.item(0).setAttribute("activeTab", String(selectedIndex));
    views.item(0).setAttribute("firstSheet", "0");
  }

  zip.updateFile(
    "xl/workbook.xml",
    Buffer.from(new XMLSerializer().serializeToString(doc)),
  );
}

function runLibreOffice(inputFile, outputDir, profileDir) {
  return new Promise((resolve, reject) => {
    const profileUrl = "file:///" + profileDir.replace(/\\/g, "/");

    const args = [
      `-env:UserInstallation=${profileUrl}`,
      "--headless",
      "--convert-to",
      "pdf:calc_pdf_Export",
      "--outdir",
      outputDir,
      inputFile,
    ];

    const child = spawn(SOFFICE, args, {
      windowsHide: true,
    });

    let output = "";
    let errorOutput = "";

    const timeout = setTimeout(() => {
      child.kill();
    }, 120000);

    child.stdout.on("data", (data) => {
      output += data.toString();
    });

    child.stderr.on("data", (data) => {
      errorOutput += data.toString();
    });

    child.on("error", (error) => {
      clearTimeout(timeout);
      reject(error);
    });

    child.on("close", (code) => {
      clearTimeout(timeout);

      if (code !== 0) {
        reject(makeError(`LibreOffice lỗi: ${errorOutput || output || code}`));
        return;
      }

      resolve();
    });
  });
}

function setPrintLayout(zip, sheetName) {
  const workbookEntry = zip.getEntry("xl/workbook.xml");
  const relsEntry = zip.getEntry("xl/_rels/workbook.xml.rels");

  if (!workbookEntry || !relsEntry) {
    throw new Error("Thiếu cấu trúc workbook");
  }

  const parser = new DOMParser();
  const serializer = new XMLSerializer();

  const workbookDoc = parser.parseFromString(
    workbookEntry.getData().toString("utf8"),
    "application/xml",
  );

  const relsDoc = parser.parseFromString(
    relsEntry.getData().toString("utf8"),
    "application/xml",
  );

  const sheets = Array.from(workbookDoc.getElementsByTagName("sheet"));

  const sheet = sheets.find((item) => item.getAttribute("name") === sheetName);

  if (!sheet) throw new Error("Không tìm thấy sheet");

  const relId = sheet.getAttribute("r:id");

  const relationships = Array.from(
    relsDoc.getElementsByTagName("Relationship"),
  );

  const relationship = relationships.find(
    (item) => item.getAttribute("Id") === relId,
  );

  if (!relationship) {
    throw new Error("Không tìm thấy đường dẫn sheet");
  }

  const target = relationship.getAttribute("Target");

  const sheetPath = target.startsWith("/")
    ? target.replace(/^\/+/, "")
    : target.startsWith("xl/")
      ? target
      : `xl/${target}`;

  const sheetEntry = zip.getEntry(sheetPath);

  if (!sheetEntry) {
    throw new Error("Không tìm thấy XML của sheet");
  }

  const doc = parser.parseFromString(
    sheetEntry.getData().toString("utf8"),
    "application/xml",
  );

  const ns = "http://schemas.openxmlformats.org/spreadsheetml/2006/main";

  // Bật chế độ Fit to Page
  let sheetPr = doc.getElementsByTagName("sheetPr")[0];

  if (!sheetPr) {
    sheetPr = doc.createElementNS(ns, "sheetPr");
    doc.documentElement.insertBefore(sheetPr, doc.documentElement.firstChild);
  }

  let setupPr = sheetPr.getElementsByTagName("pageSetUpPr")[0];

  if (!setupPr) {
    setupPr = doc.createElementNS(ns, "pageSetUpPr");
    sheetPr.appendChild(setupPr);
  }

  setupPr.setAttribute("fitToPage", "1");

  // Thiết lập vừa 1 trang ngang, không giới hạn dọc
  let pageSetup = doc.getElementsByTagName("pageSetup")[0];

  if (!pageSetup) {
    pageSetup = doc.createElementNS(ns, "pageSetup");

    const root = doc.documentElement;
    const pageMargins = doc.getElementsByTagName("pageMargins")[0];

    if (pageMargins?.nextSibling) {
      root.insertBefore(pageSetup, pageMargins.nextSibling);
    } else {
      root.appendChild(pageSetup);
    }
  }

  pageSetup.setAttribute("orientation", "landscape");
  pageSetup.setAttribute("fitToWidth", "1");
  pageSetup.setAttribute("fitToHeight", "0");
  pageSetup.removeAttribute("scale");

  pageSetup.setAttribute("useFirstPageNumber", "0");

  // Giảm lề trang
  let margins = doc.getElementsByTagName("pageMargins")[0];

  if (margins) {
    margins.setAttribute("left", "0.2");
    margins.setAttribute("right", "0.2");
    margins.setAttribute("top", "0.2");
    margins.setAttribute("bottom", "0.2");
    margins.setAttribute("header", "0");
    margins.setAttribute("footer", "0");
  }

  zip.updateFile(sheetPath, Buffer.from(serializer.serializeToString(doc)));
}

const CACHE_DIR = path.resolve(process.cwd(), "cache", "reports");

// Tránh nhiều request chuyển đổi cùng một báo cáo
const pendingReports = new Map();

async function getCachedPDF(sourceFile, sheetName, generatePDF) {
  await fs.mkdir(CACHE_DIR, { recursive: true });

  // Lấy thông tin file Excel gốc trên NAS
  const sourceStat = await fs.stat(sourceFile);

  const cacheKey = createHash("sha256")
    .update(`${sourceFile}|${sheetName}`)
    .digest("hex");

  const cacheFile = path.join(CACHE_DIR, `${cacheKey}.pdf`);
  const metadataFile = path.join(CACHE_DIR, `${cacheKey}.json`);

  const version = `${sourceStat.mtimeMs}:${sourceStat.size}`;

  // Nếu đã có một request đang xử lý cùng phiên bản
  const pendingKey = `${cacheKey}:${version}`;

  if (pendingReports.has(pendingKey)) {
    return pendingReports.get(pendingKey);
  }

  // Kiểm tra cache
  try {
    const metadata = JSON.parse(await fs.readFile(metadataFile, "utf8"));

    const cachedStat = await fs.stat(cacheFile);

    if (metadata.version === version && cachedStat.size > 0) {
      console.log(`[CACHE HIT] ${sheetName}`);
      return await fs.readFile(cacheFile);
    }
  } catch {
    // Chưa có cache hoặc cache không hợp lệ
  }

  console.log(`[CACHE MISS] ${sheetName}`);

  const task = (async () => {
    const pdf = await generatePDF();

    // Chỉ ghi cache nếu file nguồn không thay đổi
    // trong quá trình chuyển đổi
    const latestStat = await fs.stat(sourceFile);

    if (
      latestStat.mtimeMs === sourceStat.mtimeMs &&
      latestStat.size === sourceStat.size
    ) {
      const tempCache = path.join(
        CACHE_DIR,
        `${cacheKey}-${process.pid}-${Date.now()}.tmp`,
      );

      await fs.writeFile(tempCache, pdf);
      await fs.rename(tempCache, cacheFile);

      await fs.writeFile(
        metadataFile,
        JSON.stringify({
          version,
          sheetName,
          generatedAt: new Date().toISOString(),
        }),
      );

      console.log(`[CACHE SAVED] ${sheetName}`);
    } else {
      console.log(`[CACHE SKIPPED] Excel changed: ${sheetName}`);
    }

    return pdf;
  })();

  pendingReports.set(pendingKey, task);

  try {
    return await task;
  } finally {
    pendingReports.delete(pendingKey);
  }
}

export async function generateReportPDF(model, year, month) {
  const sheetName = `${String(month).padStart(2, "0")}-${year}`;

  if (!SHEET_PATTERN.test(sheetName)) {
    throw makeError("Tháng hoặc năm không hợp lệ", 400);
  }

  const sourceFile = await findWorkbook(model, sheetName);

  return getCachedPDF(sourceFile, sheetName, async () => {
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "reflow-"));

    try {
      const inputFile = path.join(tempDir, "report.xlsx");
      const outputFile = path.join(tempDir, "report.pdf");
      const profileDir = path.join(tempDir, "lo-profile");

      const zip = new AdmZip(sourceFile);

      // Giữ nguyên xử lý Excel hiện tại
      showOnlySheet(zip, sheetName);
      setPrintLayout(zip, sheetName);

      zip.writeZip(inputFile);

      await runLibreOffice(inputFile, tempDir, profileDir);

      return await fs.readFile(outputFile);
    } finally {
      await fs.rm(tempDir, {
        recursive: true,
        force: true,
      });
    }
  });
}
