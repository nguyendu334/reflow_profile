/* eslint-disable react-hooks/set-state-in-effect */
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";

import {
  Alert,
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
  Typography,
} from "@mui/material";

import {
  ArrowBackRounded,
  PictureAsPdfRounded,
  SearchRounded,
} from "@mui/icons-material";

import { useTranslation } from "react-i18next";

import ReportViewer from "../components/ReportViewer";

const api = axios.create({
  baseURL: "/api/profiles",
});

export default function ProfilePage() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const [models, setModels] = useState([]);
  const [model, setModel] = useState("");

  const [lines, setLines] = useState([]);
  const [line, setLine] = useState("");

  const [dates, setDates] = useState([]);
  const [date, setDate] = useState("");

  const [shifts, setShifts] = useState([]);
  const [shift, setShift] = useState("");

  const [loading, setLoading] = useState(false);
  const [loadingShifts, setLoadingShifts] = useState(false);
  const [error, setError] = useState("");
  const [reportUrl, setReportUrl] = useState("");
  const [reportTitle, setReportTitle] = useState("");

  const SHIFT_LABELS = {
    NGAY: t("filter.dayShift"),
    DEM: t("filter.nightShift"),
  };

  // Lấy danh sách Model
  useEffect(() => {
    let cancelled = false;

    api
      .get("/models")
      .then(({ data }) => {
        if (!cancelled) setModels(data);
      })
      .catch(() => {
        if (!cancelled) {
          setError("Không đọc được danh sách Profile");
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  // Khi đổi Model
  useEffect(() => {
    setLine("");
    setLines([]);
    setDate("");
    setDates([]);
    setShift("");
    setShifts([]);
    setReportUrl("");
    setReportTitle("");
    setError("");

    if (!model) return;

    let cancelled = false;

    api
      .get("/lines", { params: { model } })
      .then(({ data }) => {
        if (!cancelled) setLines(data);
      })
      .catch(() => {
        if (!cancelled) {
          setError("Không đọc được danh sách Line");
        }
      });

    return () => {
      cancelled = true;
    };
  }, [model]);

  // Khi đổi Line
  useEffect(() => {
    setDate("");
    setDates([]);
    setShift("");
    setShifts([]);
    setReportUrl("");
    setReportTitle("");
    setError("");

    if (!model || !line) return;

    let cancelled = false;

    api
      .get("/dates", { params: { model, line } })
      .then(({ data }) => {
        if (!cancelled) setDates(data);
      })
      .catch(() => {
        if (!cancelled) {
          setError("Không đọc được danh sách ngày");
        }
      });

    return () => {
      cancelled = true;
    };
  }, [model, line]);

  // Khi đổi Ngày: lấy danh sách ca
  useEffect(() => {
    setShift("");
    setShifts([]);
    setReportUrl("");
    setReportTitle("");
    setError("");

    if (!model || !line || !date) {
      setLoadingShifts(false);
      return;
    }

    let cancelled = false;
    setLoadingShifts(true);

    api
      .get("/shifts", {
        params: { model, line, date },
      })
      .then(({ data }) => {
        if (cancelled) return;

        setShifts(data);

        // Chỉ có một ca thì tự động chọn
        if (data.length === 1) {
          setShift(data[0]);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setError("Không đọc được danh sách ca làm việc");
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingShifts(false);
      });

    return () => {
      cancelled = true;
    };
  }, [model, line, date]);

  // Thu hồi URL blob khi đổi báo cáo hoặc rời trang
  useEffect(() => {
    return () => {
      if (reportUrl) {
        URL.revokeObjectURL(reportUrl);
      }
    };
  }, [reportUrl]);

  const handleView = async () => {
    if (!model || !line || !date || !shift) return;

    setLoading(true);
    setError("");
    setReportUrl("");
    setReportTitle("");

    try {
      const response = await api.get("/view", {
        params: { model, line, date, shift },
        responseType: "blob",
      });

      const blob = new Blob([response.data], {
        type: "application/pdf",
      });

      setReportTitle(
        `${model} - ${line} - ${date
          .split("-")
          .reverse()
          .join("/")} - ${SHIFT_LABELS[shift] || shift}`,
      );

      setReportUrl(URL.createObjectURL(blob));
    } catch {
      setError("Không thể mở báo cáo Temperature Profile");
    } finally {
      setLoading(false);
    }
  };

  const handleShiftChange = (event) => {
    setShift(event.target.value);
    setReportUrl("");
    setReportTitle("");
  };

  return (
    <Box
      sx={{
        minHeight: "100vh",
        bgcolor: "background.default",
        color: "text.primary",
        py: 3,
      }}
    >
      <Container maxWidth={false} sx={{ px: { xs: 2, md: 3 } }}>
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
            sx={{
              mb: 3,
              textTransform: "none",
            }}
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
                bgcolor: "#fff3e0",
                color: "#e65100",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <PictureAsPdfRounded sx={{ fontSize: 30 }} />
            </Box>

            <Box>
              <Typography
                variant="h5"
                fontWeight={700}
                sx={{
                  fontSize: { xs: 20, md: 24 },
                }}
              >
                {t("report.profile")}
              </Typography>

              <Typography variant="body2" color="text.secondary">
                SEOUL SEMI - {t("report.profile")}
              </Typography>
            </Box>
          </Stack>

          {/* Bộ lọc */}
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: {
                xs: "1fr",
                sm: "repeat(2, minmax(0, 1fr))",
                lg: "minmax(220px, 2fr) repeat(3, minmax(125px, 1fr)) auto",
              },
              gap: 2,
              alignItems: "center",
            }}
          >
            {/* Model */}
            <FormControl fullWidth size="small">
              <InputLabel>{t("filter.model")}</InputLabel>
              <Select
                label={t("filter.model")}
                value={model}
                onChange={(e) => setModel(e.target.value)}
                sx={{ height: 44 }}
              >
                {models.map((item) => (
                  <MenuItem key={item} value={item}>
                    {item}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            {/* Line */}
            <FormControl fullWidth size="small" disabled={!model}>
              <InputLabel>{t("filter.line")}</InputLabel>
              <Select
                label={t("filter.line")}
                value={line}
                onChange={(e) => setLine(e.target.value)}
                sx={{ height: 44 }}
              >
                {lines.map((item) => (
                  <MenuItem key={item} value={item}>
                    {item}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            {/* Ngày */}
            <FormControl fullWidth size="small" disabled={!line}>
              <InputLabel>{t("filter.date")}</InputLabel>
              <Select
                label={t("filter.date")}
                value={date}
                onChange={(e) => setDate(e.target.value)}
                sx={{ height: 44 }}
              >
                {dates.map((item) => (
                  <MenuItem key={item} value={item}>
                    {item.split("-").reverse().join("/")}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            {/* Ca làm việc */}
            <FormControl
              fullWidth
              size="small"
              disabled={!date || loadingShifts}
            >
              <InputLabel>{t("filter.shift")}</InputLabel>
              <Select
                label={t("filter.shift")}
                value={shift}
                onChange={handleShiftChange}
                sx={{ height: 44 }}
              >
                {shifts.map((item) => (
                  <MenuItem key={item} value={item}>
                    {SHIFT_LABELS[item] || item}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            {/* Xem báo cáo */}
            <Button
              variant="contained"
              disabled={
                !model || !line || !date || !shift || loading || loadingShifts
              }
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
                minWidth: 165,
                px: 3,
                borderRadius: 1.5,
                whiteSpace: "nowrap",
                textTransform: "none",
                fontWeight: 600,
                boxShadow: "0 2px 5px rgba(25,118,210,0.2)",
                gridColumn: {
                  xs: "1 / -1",
                  sm: "1 / -1",
                  lg: "auto",
                },
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

        {/* Hiển thị PDF */}
        {reportUrl && (
          <Paper
            sx={{
              mt: 2,
              p: { xs: 1, md: 2 },
              borderRadius: 3,
            }}
          >
            <Box
              sx={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
                flexWrap: "wrap",
                gap: 2,
                mb: 2,
              }}
            >
              <Typography
                variant="h6"
                sx={{
                  fontSize: { xs: 16, md: 20 },
                  overflowWrap: "anywhere",
                }}
              >
                {reportTitle}
              </Typography>

              {/* Dấu xác nhận */}

              {/* Dấu phê duyệt YUJIN ENC VINA */}
              <Box
                sx={{
                  width: 320,
                  maxWidth: "100%",
                  border: "1px solid #222",
                  bgcolor: "#fff",
                  flexShrink: 0,
                  boxSizing: "border-box",
                }}
              >
                {/* Hàng tiêu đề */}
                <Box
                  sx={{
                    display: "grid",
                    gridTemplateColumns: "repeat(4, 1fr)",
                    borderBottom: "1px solid #222",
                  }}
                >
                  {["Lập", "Kiểm tra", "Xác nhận", "Duyệt"].map(
                    (item, index) => (
                      <Box
                        key={item}
                        sx={{
                          textAlign: "center",
                          py: 0.6,
                          borderRight: index < 3 ? "1px solid #222" : "none",
                        }}
                      >
                        <Typography
                          sx={{
                            fontSize: 13,
                            fontWeight: 700,
                            color: "#111",
                          }}
                        >
                          {item}
                        </Typography>
                      </Box>
                    ),
                  )}
                </Box>

                {/* Nội dung phê duyệt */}
                <Box sx={{ p: 0.8 }}>
                  <Box
                    sx={{
                      border: "2px solid #17439b",
                      textAlign: "center",
                      py: 0.4,
                      px: 0.5,
                    }}
                  >
                    <Typography
                      sx={{
                        color: "#17439b",
                        fontSize: 15,
                        fontWeight: 900,
                        lineHeight: 1.2,
                      }}
                    >
                      YUJIN ENC VINA
                    </Typography>

                    <Typography
                      sx={{
                        color: "#17439b",
                        fontSize: 11,
                        fontWeight: 900,
                        lineHeight: 1.3,
                      }}
                    >
                      ĐÃ PHÊ DUYỆT - APPROVED
                    </Typography>
                  </Box>
                </Box>
              </Box>
            </Box>

            <ReportViewer url={reportUrl} />
          </Paper>
        )}
      </Container>
    </Box>
  );
}
