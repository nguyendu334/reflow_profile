import { Router } from "express";
import fs from "node:fs/promises";

import {
  getProfiles,
  getProfileModels,
  getProfilesByModel,
  findProfile,
} from "../services/profile.service.js";

const router = Router();

// Danh sách Model
router.get("/models", async (req, res, next) => {
  try {
    const models = await getProfileModels();
    res.json(models);
  } catch (error) {
    next(error);
  }
});

router.get("/options", async (req, res, next) => {
  try {
    const { model } = req.query;

    if (typeof model !== "string" || !model.trim()) {
      return res.status(400).json({
        message: "Model không hợp lệ",
      });
    }

    const profiles = await getProfilesByModel(model);

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

// Danh sách Line theo Model
router.get("/lines", async (req, res, next) => {
  try {
    const { model } = req.query;
    const profiles = await getProfiles();

    res.json(
      [
        ...new Set(
          profiles.filter((p) => p.model === model).map((p) => p.line),
        ),
      ].sort(),
    );
  } catch (error) {
    next(error);
  }
});

// Danh sách ngày theo Model + Line
router.get("/dates", async (req, res, next) => {
  try {
    const { model, line } = req.query;
    const profiles = await getProfiles();

    res.json(
      [
        ...new Set(
          profiles
            .filter((p) => p.model === model && p.line === line)
            .map((p) => p.date),
        ),
      ]
        .sort()
        .reverse(),
    );
  } catch (error) {
    next(error);
  }
});

// Danh sách ca theo Model + Line + Ngày
router.get("/shifts", async (req, res, next) => {
  try {
    const { model, line, date } = req.query;
    const profiles = await getProfiles();

    const shifts = [
      ...new Set(
        profiles
          .filter(
            (p) => p.model === model && p.line === line && p.date === date,
          )
          .map((p) => p.shift),
      ),
    ];

    res.json(
      shifts.sort(
        (a, b) => ["NGAY", "DEM"].indexOf(a) - ["NGAY", "DEM"].indexOf(b),
      ),
    );
  } catch (error) {
    next(error);
  }
});

// Xem PDF
router.get("/view", async (req, res, next) => {
  try {
    const { model, line, date, shift } = req.query;

    if (
      typeof model !== "string" ||
      typeof line !== "string" ||
      typeof date !== "string" ||
      !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
      !["NGAY", "DEM"].includes(shift)
    ) {
      return res.status(400).json({
        message: "Thông tin tìm kiếm không hợp lệ",
      });
    }

    const filePath = await findProfile(model, line, date, shift);

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
