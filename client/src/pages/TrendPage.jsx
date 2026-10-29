/* eslint-disable no-unused-vars */
/* eslint-disable react-hooks/set-state-in-effect */
import { useEffect, useState } from "react";
import axios from "axios";

import {
  Alert,
  Autocomplete,
  Box,
  Button,
  CircularProgress,
  Container,
  FormControl,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Stack,
  TextField,
  Typography,
} from "@mui/material";

import {
  AssessmentRounded,
  SearchRounded,
  ArrowBackRounded,
} from "@mui/icons-material";

import { useNavigate } from "react-router-dom";

import { useTranslation } from "react-i18next";

import ReportViewer from "../components/ReportViewer";

const api = axios.create({
  baseURL: "/api/reports",
});

export default function TrendPage() {
  const { t } = useTranslation();

  const [models, setModels] = useState([]);
  const [model, setModel] = useState("");
  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState("");

  const [sheets, setSheets] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingSheets, setLoadingSheets] = useState(false);
  const [error, setError] = useState("");
  const [reportUrl, setReportUrl] = useState("");

  const navigate = useNavigate();

  // Lấy danh sách model từ NAS
  useEffect(() => {
    api
      .get("/models")
      .then(({ data }) => setModels(data))
      .catch(() => {
        setError("Không đọc được danh sách model từ NAS");
      });
  }, []);

  // Lấy sheet theo model và năm
  useEffect(() => {
    setMonth("");
    setSheets([]);
    setReportUrl("");
    setError("");

    if (!model || !year) return;

    let cancelled = false;
    setLoadingSheets(true);

    api
      .get("/sheets", {
        params: { model, year },
      })
      .then(({ data }) => {
        if (!cancelled) setSheets(data);
      })
      .catch(() => {
        if (!cancelled) {
          setError("Không đọc được danh sách sheet");
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingSheets(false);
      });

    return () => {
      cancelled = true;
    };
  }, [model, year]);

  // Thu hồi URL PDF khi thay đổi hoặc thoát trang
  useEffect(() => {
    return () => {
      if (reportUrl) URL.revokeObjectURL(reportUrl);
    };
  }, [reportUrl]);

  const availableMonths = sheets.map((sheet) => ({
    value: sheet.substring(0, 2),
    label: `${t("filter.month")} ${Number(sheet.substring(0, 2))}`,
  }));

  const handleView = async () => {
    if (!model || !month || !year) return;

    setLoading(true);
    setError("");
    setReportUrl("");

    try {
      const response = await api.get("/view", {
        params: { model, year, month },
        responseType: "blob",
      });

      const pdf = new Blob([response.data], {
        type: "application/pdf",
      });

      setReportUrl(URL.createObjectURL(pdf));
    } catch (err) {
      setError("Không thể mở báo cáo Excel");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box
      sx={{
        minHeight: "100vh",
        bgcolor: "background.default",
        color: "text.primary",
        py: { xs: 2, md: 3 },
      }}
    >
      <Container maxWidth={false} sx={{ px: { xs: 2, md: 3 } }}>
        {/* Bộ lọc báo cáo */}
        <Paper
          elevation={0}
          sx={{
            p: { xs: 2, md: 3 },
            borderRadius: 3,
            border: "1px solid #e3e8ef",
            boxShadow: "0 3px 12px rgba(0,0,0,0.04)",
          }}
        >
          <Button
            variant="outlined"
            startIcon={<ArrowBackRounded />}
            onClick={() => navigate("/")}
            sx={{ mb: 3 }}
          >
            {t("report.backHome")}
          </Button>
          {/* Header */}
          <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 3 }}>
            <Box
              sx={{
                width: 48,
                height: 48,
                borderRadius: 2,
                bgcolor: "#1976d2",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <AssessmentRounded sx={{ color: "#fff", fontSize: 28 }} />
            </Box>

            <Box>
              <Typography
                variant="h5"
                fontWeight={700}
                sx={{ fontSize: { xs: 20, md: 24 } }}
              >
                {t("report.trend")}
              </Typography>

              <Typography variant="body2" color="text.secondary">
                SEOUL SEMI - {t("report.trend")}
              </Typography>
            </Box>
          </Stack>

          {/* Bộ lọc */}
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: {
                xs: "1fr",
                sm: "repeat(2, 1fr)",
                md: "minmax(240px, 2fr) 1fr 1fr auto",
              },
              gap: 2,
              alignItems: "stretch",
            }}
          >
            {/* Model */}
            <Autocomplete
              fullWidth
              size="small"
              options={models}
              value={model || null}
              onChange={(_, newValue) => {
                setModel(newValue || "");
              }}
              autoHighlight
              openOnFocus
              noOptionsText={t("filter.noOptions")}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label={t("filter.model")}
                  placeholder={t("filter.placeholder")}
                  sx={{
                    "& .MuiOutlinedInput-root": {
                      minHeight: 44,
                    },
                  }}
                />
              )}
            />

            {/* Năm */}
            <FormControl fullWidth size="small">
              <InputLabel>{t("filter.year")}</InputLabel>
              <Select
                label={t("filter.year")}
                value={year}
                onChange={(e) => setYear(e.target.value)}
                sx={{ height: 44 }}
              >
                {[2026, 2025, 2024, 2023].map((item) => (
                  <MenuItem key={item} value={item}>
                    {item}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            {/* Tháng */}
            <FormControl
              fullWidth
              size="small"
              disabled={!model || loadingSheets}
            >
              <InputLabel>{t("filter.month")}</InputLabel>
              <Select
                label={t("filter.month")}
                value={month}
                onChange={(e) => {
                  setMonth(e.target.value);
                  setReportUrl("");
                }}
                sx={{ height: 44 }}
              >
                {availableMonths.map((item) => (
                  <MenuItem key={item.value} value={item.value}>
                    {item.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            {/* Nút xem */}
            <Button
              variant="contained"
              disabled={!model || !month || loading}
              onClick={handleView}
              startIcon={
                loading ? (
                  <CircularProgress size={18} color="inherit" />
                ) : (
                  <SearchRounded />
                )
              }
              sx={{
                height: 44,
                px: 3,
                minWidth: 160,
                borderRadius: 1.5,
                whiteSpace: "nowrap",
                textTransform: "none",
                fontWeight: 600,
              }}
            >
              {loading ? t("report.loading") : t("report.view")}
            </Button>
          </Box>

          {error && (
            <Alert severity="error" sx={{ mt: 2 }}>
              {error}
            </Alert>
          )}
        </Paper>

        {/* Hiển thị báo cáo */}
        {reportUrl && (
          <Paper
            elevation={0}
            sx={{
              mt: 2,
              p: { xs: 1, md: 2 },
              borderRadius: 3,
              border: "1px solid #e3e8ef",
            }}
          >
            <Typography variant="h6" fontWeight={600} sx={{ mb: 2, px: 1 }}>
              {model} - {month}/{year}
            </Typography>

            <ReportViewer url={reportUrl} />
          </Paper>
        )}
      </Container>
    </Box>
  );
}
