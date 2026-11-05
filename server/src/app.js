// import "dotenv/config";
// import express from "express";
// import cors from "cors";
// import reportsRouter from "./routes/reports.routes.js";
// import profilesRouter from "./routes/profiles.routes.js";

// const app = express();

// app.use(cors());
// app.use(express.json());

// app.use("/api/reports", reportsRouter);
// app.use("/api/profiles", profilesRouter);

// app.get("/api/health", (req, res) => {
//   res.json({ status: "OK" });
// });

// app.use((err, req, res, next) => {
//   console.error(err);

//   res.status(err.status || 500).json({
//     message: err.status ? err.message : "Không thể đọc dữ liệu từ NAS",
//   });
// });

// const PORT = process.env.PORT || 5000;

// app.listen(PORT, () => {
//   console.log(`Server running: http://localhost:${PORT}`);
// });

import "dotenv/config";
import express from "express";
import cors from "cors";
import path from "node:path";
import { fileURLToPath } from "node:url";

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

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const clientDistPath = path.resolve(__dirname, "../../client/dist");

app.use(express.static(clientDistPath));

app.use((req, res, next) => {
  if (req.path === "/api" || req.path.startsWith("/api/")) {
    return res.status(404).json({
      message: "API không tồn tại",
    });
  }

  if (req.method !== "GET" && req.method !== "HEAD") {
    return next();
  }

  res.sendFile(path.join(clientDistPath, "index.html"));
});

app.use((err, req, res, next) => {
  console.error(err);

  res.status(err.status || 500).json({
    message: err.status ? err.message : "Không thể đọc dữ liệu từ NAS",
  });
});

const PORT = process.env.PORT || 5001;

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on port ${PORT}`);
});
