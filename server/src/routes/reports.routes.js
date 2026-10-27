import { Router } from "express";
import { getModels, getSheets } from "../services/excel.service.js";
import { generateReportPDF } from "../services/pdf.service.js";

const router = Router();

router.get("/models", async (req, res, next) => {
  try {
    const models = await getModels();
    res.json(models);
  } catch (error) {
    next(error);
  }
});

router.get("/sheets", async (req, res, next) => {
  try {
    const { model, year } = req.query;

    if (!model || !/^\d{4}$/.test(String(year ?? ""))) {
      return res.status(400).json({
        message: "Model hoặc năm không hợp lệ",
      });
    }

    const sheets = await getSheets(model, year);
    res.json(sheets);
  } catch (error) {
    next(error);
  }
});

router.get("/view", async (req, res, next) => {
  try {
    const { model, year, month } = req.query;

    const validModel =
      typeof model === "string" && model.length > 0 && model.length <= 150;

    const validYear = /^\d{4}$/.test(String(year ?? ""));
    const validMonth = /^(0?[1-9]|1[0-2])$/.test(String(month ?? ""));

    if (!validModel || !validYear || !validMonth) {
      return res.status(400).json({
        message: "Model, tháng hoặc năm không hợp lệ",
      });
    }

    const pdf = await generateReportPDF(model, year, month);

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      'inline; filename="reflow-report.pdf"',
    );

    res.send(pdf);
  } catch (error) {
    next(error);
  }
});

export default router;
