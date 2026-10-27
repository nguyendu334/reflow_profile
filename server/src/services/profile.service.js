import fs from "node:fs/promises";
import path from "node:path";

const PROFILE_DIR = process.env.PROFILE_DIR;

const FILE_PATTERN =
  /^(.+?)\s+(LINE\s+[A-Z0-9_-]+)\s+(NGAY|DEM)\s+(\d{1,2})[.\-/](\d{1,2})[.\-/](\d{4})(?:\s+(\d+))?\s*\.pdf$/i;

// Cache danh sách thư mục Model trong 60 giây
const CACHE_TTL = 60_000;

let modelFoldersCache = null;
let modelFoldersTime = 0;
let modelFoldersPending = null;

const profileCache = new Map();

// Lấy các thư mục Model trong tất cả thư mục năm
async function scanModelFolders() {
  const years = await fs.readdir(PROFILE_DIR, {
    withFileTypes: true,
  });

  const folders = [];

  for (const year of years) {
    if (!year.isDirectory()) continue;

    // Nhận cả "2026-Profile" và "2026- Profile"
    if (!/^\d{4}\s*-\s*profile$/i.test(year.name)) {
      continue;
    }

    const yearPath = path.join(PROFILE_DIR, year.name);

    const models = await fs.readdir(yearPath, {
      withFileTypes: true,
    });

    for (const item of models) {
      if (!item.isDirectory()) continue;

      const model = item.name.replace(/^\d+\.\s*/, "").trim();

      if (!model) continue;

      folders.push({
        model,
        folderPath: path.join(yearPath, item.name),
      });
    }
  }

  return folders;
}

async function getModelFolders() {
  if (modelFoldersCache && Date.now() - modelFoldersTime < CACHE_TTL) {
    return modelFoldersCache;
  }

  if (modelFoldersPending) {
    return modelFoldersPending;
  }

  modelFoldersPending = scanModelFolders()
    .then((folders) => {
      modelFoldersCache = folders;
      modelFoldersTime = Date.now();
      return folders;
    })
    .finally(() => {
      modelFoldersPending = null;
    });

  return modelFoldersPending;
}

// API Model: không quét file PDF
export async function getProfileModels() {
  const folders = await getModelFolders();

  return [...new Set(folders.map((item) => item.model))].sort();
}

// Chuyển tên file PDF thành dữ liệu báo cáo

function parseProfile(fileName, fullPath, folderModel) {
  const match = fileName.match(FILE_PATTERN);

  if (!match) return null;

  const [, fileModel, line, shift, day, month, year, suffix] = match;

  const date = `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;

  const parsed = new Date(`${date}T00:00:00`);

  if (
    Number.isNaN(parsed.getTime()) ||
    parsed.getFullYear() !== Number(year) ||
    parsed.getMonth() + 1 !== Number(month) ||
    parsed.getDate() !== Number(day)
  ) {
    return null;
  }

  return {
    model: folderModel,
    fileModel: fileModel.trim(),
    line: line.trim().toUpperCase(),
    shift: shift.toUpperCase(),
    date,
    suffix: suffix ? Number(suffix) : 0,
    fileName,
    fullPath,
  };
}

// Chỉ quét file PDF thuộc Model được chọn

async function scanModelProfiles(model) {
  const folders = await getModelFolders();

  const selectedFolders = folders.filter((item) => item.model === model);

  const profiles = [];

  // Quét PDF trong thư mục Model và mọi thư mục con
  async function scanDirectory(directory, folderModel) {
    const entries = await fs.readdir(directory, {
      withFileTypes: true,
    });

    for (const entry of entries) {
      const fullPath = path.join(directory, entry.name);

      if (entry.isDirectory()) {
        await scanDirectory(fullPath, folderModel);
        continue;
      }

      if (!entry.isFile() || !entry.name.toLowerCase().endsWith(".pdf")) {
        continue;
      }

      const parsed = parseProfile(entry.name, fullPath, folderModel);

      if (parsed) {
        profiles.push(parsed);
      }
    }
  }

  for (const folder of selectedFolders) {
    await scanDirectory(folder.folderPath, model);
  }

  return profiles;
}

// Cache danh sách PDF riêng theo từng Model
export async function getProfilesByModel(model) {
  const cached = profileCache.get(model);

  if (cached && Date.now() - cached.time < CACHE_TTL) {
    return cached.data;
  }

  if (cached?.pending) {
    return cached.pending;
  }

  const pending = scanModelProfiles(model)
    .then((data) => {
      profileCache.set(model, {
        data,
        time: Date.now(),
      });

      return data;
    })
    .catch((error) => {
      profileCache.delete(model);
      throw error;
    });

  profileCache.set(model, {
    pending,
  });

  return pending;
}

// Giữ tương thích với API cũ
export async function getProfiles() {
  const models = await getProfileModels();

  const results = await Promise.all(
    models.map((model) => getProfilesByModel(model)),
  );

  return results.flat();
}

// Tìm PDF theo Model + Line + Ngày + Ca
export async function findProfile(model, line, date, shift) {
  const profiles = await getProfilesByModel(model);

  const matches = profiles
    .filter(
      (item) =>
        item.line === line && item.date === date && item.shift === shift,
    )
    .sort((a, b) => b.suffix - a.suffix);

  if (matches.length === 0) {
    const error = new Error("Không tìm thấy báo cáo Profile");

    error.status = 404;
    throw error;
  }

  return matches[0].fullPath;
}
