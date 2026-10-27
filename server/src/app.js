import "dotenv/config";
import express from "express";
import cors from "cors";
import reportsRouter from "./routes/reports.routes.js";
import profilesRouter from "./routes/profiles.routes.js";

const app = express();

app.use(cors());
app.use(express.json());

app.use("/api/reports", reportsRouter);
app.use("/api/profiles", profilesRouter);

app.get("/api/health", (req, res) => {
  res.json({ status: "OK" });
});

app.use((err, req, res, next) => {
  console.error(err);

  res.status(err.status || 500).json({
    message: err.status ? err.message : "Không thể đọc dữ liệu từ NAS",
  });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running: http://localhost:${PORT}`);
});
