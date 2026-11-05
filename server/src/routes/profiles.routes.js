import { Router } from "express";
import fs from "node:fs/promises";

import {
  getProfileModels,
  getProfilesByModel,
  findProfile,
} from "../services/profile.service.js";

const router = Router();

// ==========================================
// Kiểm tra loại Profile
// ==========================================
function getProfileType(req) {
  const type = req.query.type ?? "mass";

  if (typeof type !== "string" || !["mass", "sample"].includes(type)) {
    const error = new Error("Loại Profile không hợp lệ");
    error.status = 400;
    throw error;
  }

  return type;
}

// ==========================================
// 1. Danh sách Model theo loại Profile
// ==========================================
router.get("/models", async (req, res, next) => {
  try {
    const type = getProfileType(req);

    const models = await getProfileModels(type);

    res.json(models);
  } catch (error) {
    next(error);
  }
});

// ==========================================
// 2. Lấy tất cả lựa chọn theo Model
// ==========================================
router.get("/options", async (req, res, next) => {
  try {
    const { model } = req.query;
    const type = getProfileType(req);

    if (typeof model !== "string" || !model.trim()) {
      return res.status(400).json({
        message: "Model không hợp lệ",
      });
    }

    const profiles = await getProfilesByModel(model, type);

    res.json(
      profiles.map(({ line, date, shift }) => ({
        line,
        date,
        shift,
      })),
    );
  } catch (error) {
    next(error);
  }
});

// ==========================================
// 3. Danh sách Line theo Model
// ==========================================
router.get("/lines", async (req, res, next) => {
  try {
    const { model } = req.query;
    const type = getProfileType(req);

    if (typeof model !== "string" || !model.trim()) {
      return res.status(400).json({
        message: "Model không hợp lệ",
      });
    }

    const profiles = await getProfilesByModel(model, type);

    const lines = [...new Set(profiles.map((p) => p.line))].sort();

    res.json(lines);
  } catch (error) {
    next(error);
  }
});

// ==========================================
// 4. Danh sách ngày theo Model + Line
// ==========================================
router.get("/dates", async (req, res, next) => {
  try {
    const { model, line } = req.query;
    const type = getProfileType(req);

    if (
      typeof model !== "string" ||
      !model.trim() ||
      typeof line !== "string" ||
      !line.trim()
    ) {
      return res.status(400).json({
        message: "Model hoặc Line không hợp lệ",
      });
    }

    const profiles = await getProfilesByModel(model, type);

    const dates = [
      ...new Set(profiles.filter((p) => p.line === line).map((p) => p.date)),
    ].sort((a, b) => b.localeCompare(a));

    res.json(dates);
  } catch (error) {
    next(error);
  }
});

// ==========================================
// 5. Danh sách ca theo Model + Line + Ngày
// ==========================================
router.get("/shifts", async (req, res, next) => {
  try {
    const { model, line, date } = req.query;
    const type = getProfileType(req);

    if (
      typeof model !== "string" ||
      !model.trim() ||
      typeof line !== "string" ||
      !line.trim() ||
      typeof date !== "string" ||
      !/^\d{4}-\d{2}-\d{2}$/.test(date)
    ) {
      return res.status(400).json({
        message: "Thông tin tìm kiếm không hợp lệ",
      });
    }

    const profiles = await getProfilesByModel(model, type);

    const shifts = [
      ...new Set(
        profiles
          .filter((p) => p.line === line && p.date === date)
          .map((p) => p.shift),
      ),
    ];

    shifts.sort(
      (a, b) => ["NGAY", "DEM"].indexOf(a) - ["NGAY", "DEM"].indexOf(b),
    );

    res.json(shifts);
  } catch (error) {
    next(error);
  }
});

// ==========================================
// 6. Xem file PDF
// ==========================================
router.get("/view", async (req, res, next) => {
  try {
    const { model, line, date, shift } = req.query;
    const type = getProfileType(req);

    if (
      typeof model !== "string" ||
      !model.trim() ||
      typeof line !== "string" ||
      !line.trim() ||
      typeof date !== "string" ||
      !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
      !["NGAY", "DEM"].includes(shift)
    ) {
      return res.status(400).json({
        message: "Thông tin tìm kiếm không hợp lệ",
      });
    }

    const filePath = await findProfile(model, line, date, shift, type);

    const pdf = await fs.readFile(filePath);

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      'inline; filename="temperature-profile.pdf"',
    );

    res.send(pdf);
  } catch (error) {
    next(error);
  }
});

export default router;
