import fs from "node:fs/promises";
import path from "node:path";

const PROFILE_DIR = process.env.PROFILE_DIR;

const FILE_PATTERN =
  /^(.+?)\s+(LINE\s+[A-Z0-9_-]+)\s+(NGAY|DEM)\s+(\d{1,2})[.\-/](\d{1,2})[.\-/](\d{4})(?:\s+(\d+))?\s*\.pdf$/i;

// Cache trong 60 giây
const CACHE_TTL = 60_000;

// Cache thư mục Model theo từng loại
const modelFoldersCache = new Map();
const modelFoldersPending = new Map();

// Cache danh sách PDF theo loại + Model
const profileCache = new Map();

// ==========================================
// 1. Xác định thư mục theo loại Profile
// ==========================================

function validateProfileType(type = "mass") {
  if (!["mass", "sample"].includes(type)) {
    const error = new Error("Loại Profile không hợp lệ");
    error.status = 400;
    throw error;
  }

  return type;
}

async function getTypeFolders(type = "mass") {
  validateProfileType(type);

  const entries = await fs.readdir(PROFILE_DIR, {
    withFileTypes: true,
  });

  const folders = [];

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;

    const name = entry.name.trim();

    if (type === "mass") {
      // Ví dụ: 2026- Profile, 2025-Profile
      if (/^\d{4}\s*-\s*profile$/i.test(name)) {
        folders.push(path.join(PROFILE_DIR, entry.name));
      }
    } else {
      // Ví dụ: Profile mẫu 2026
      if (/^profile\s+mẫu\s+\d{4}$/i.test(name)) {
        folders.push(path.join(PROFILE_DIR, entry.name));
      }
    }
  }

  return folders;
}

// ==========================================
// 2. Lấy Model từ tên thư mục
// ==========================================

async function scanModelFolders(type = "mass") {
  const typeFolders = await getTypeFolders(type);

  const folders = [];

  for (const typeFolder of typeFolders) {
    const models = await fs.readdir(typeFolder, {
      withFileTypes: true,
    });

    for (const item of models) {
      if (!item.isDirectory()) continue;

      const model = item.name.replace(/^\d+\.\s*/, "").trim();

      if (!model) continue;

      folders.push({
        model,
        folderPath: path.join(typeFolder, item.name),
      });
    }
  }

  return folders;
}

async function getModelFolders(type = "mass") {
  validateProfileType(type);

  const cached = modelFoldersCache.get(type);

  if (cached && Date.now() - cached.time < CACHE_TTL) {
    return cached.data;
  }

  if (modelFoldersPending.has(type)) {
    return modelFoldersPending.get(type);
  }

  const pending = scanModelFolders(type)
    .then((folders) => {
      modelFoldersCache.set(type, {
        data: folders,
        time: Date.now(),
      });

      return folders;
    })
    .finally(() => {
      modelFoldersPending.delete(type);
    });

  modelFoldersPending.set(type, pending);

  return pending;
}

// ==========================================
// 3. API lấy danh sách Model
// ==========================================

export async function getProfileModels(type = "mass") {
  const folders = await getModelFolders(type);

  return [...new Set(folders.map((item) => item.model))].sort((a, b) =>
    a.localeCompare(b, undefined, {
      numeric: true,
    }),
  );
}

// ==========================================
// 4. Phân tích tên file PDF
// ==========================================

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

// ==========================================
// 5. Quét PDF của Model được chọn
// ==========================================

async function scanModelProfiles(model, type = "mass") {
  const folders = await getModelFolders(type);

  const selectedFolders = folders.filter((item) => item.model === model);

  const profiles = [];

  async function scanDirectory(directory, folderModel) {
    const entries = await fs.readdir(directory, {
      withFileTypes: true,
    });

    for (const entry of entries) {
      const fullPath = path.join(directory, entry.name);

      if (entry.isDirectory()) {
        // Hỗ trợ Model -> Tháng -> PDF
        // Và Model -> PDF trực tiếp
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

// ==========================================
// 6. Cache PDF theo loại + Model
// ==========================================

export async function getProfilesByModel(model, type = "mass") {
  validateProfileType(type);

  const cacheKey = JSON.stringify([type, model]);

  const cached = profileCache.get(cacheKey);

  if (cached?.data && Date.now() - cached.time < CACHE_TTL) {
    return cached.data;
  }

  if (cached?.pending) {
    return cached.pending;
  }

  const pending = scanModelProfiles(model, type)
    .then((data) => {
      profileCache.set(cacheKey, {
        data,
        time: Date.now(),
      });

      return data;
    })
    .catch((error) => {
      profileCache.delete(cacheKey);
      throw error;
    });

  profileCache.set(cacheKey, { pending });

  return pending;
}

// ==========================================
// 7. Giữ tương thích với API cũ
// ==========================================

export async function getProfiles(type = "mass") {
  const models = await getProfileModels(type);

  const results = await Promise.all(
    models.map((model) => getProfilesByModel(model, type)),
  );

  return results.flat();
}

// ==========================================
// 8. Tìm PDF theo bộ lọc
// ==========================================

export async function findProfile(model, line, date, shift, type = "mass") {
  const profiles = await getProfilesByModel(model, type);

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
