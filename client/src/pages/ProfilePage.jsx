/* eslint-disable react-hooks/set-state-in-effect */
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
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
  ArrowBackRounded,
  PictureAsPdfRounded,
  SearchRounded,
} from "@mui/icons-material";
import { useTranslation } from "react-i18next";
import ReportViewer from "../components/ReportViewer";

const api = axios.create({ baseURL: "/api/profiles" });

export default function ProfilePage() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const [profileType, setProfileType] = useState("mass");
  const [models, setModels] = useState([]);
  const [model, setModel] = useState("");
  const [lines, setLines] = useState([]);
  const [line, setLine] = useState("");
  const [dates, setDates] = useState([]);
  const [date, setDate] = useState("");
  const [shifts, setShifts] = useState([]);
  const [shift, setShift] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingModels, setLoadingModels] = useState(false);
  const [loadingShifts, setLoadingShifts] = useState(false);
  const [error, setError] = useState("");
  const [reportUrl, setReportUrl] = useState("");
  const [reportTitle, setReportTitle] = useState("");

  const SHIFT_LABELS = {
    NGAY: t("filter.dayShift"),
    DEM: t("filter.nightShift"),
  };

  // Chuyển loại: xóa ngay dữ liệu cũ, tránh chọn nhầm PDF của loại trước.
  const handleTypeChange = (event) => {
    setProfileType(event.target.value);
    setModels([]);
    setModel("");
    setLines([]);
    setLine("");
    setDates([]);
    setDate("");
    setShifts([]);
    setShift("");
    setReportUrl("");
    setReportTitle("");
    setError("");
  };

  // Chỉ lấy danh sách Model của loại được chọn.
  useEffect(() => {
    let cancelled = false;
    setLoadingModels(true);
    setError("");

    api
      .get("/models", { params: { type: profileType } })
      .then(({ data }) => {
        if (!cancelled) setModels(Array.isArray(data) ? data : []);
      })
      .catch(() => {
        if (!cancelled) setError("Không đọc được danh sách Profile");
      })
      .finally(() => {
        if (!cancelled) setLoadingModels(false);
      });

    return () => {
      cancelled = true;
    };
  }, [profileType]);

  // Khi đổi Model: tải Line thuộc đúng loại + Model.
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
      .get("/lines", { params: { type: profileType, model } })
      .then(({ data }) => {
        if (cancelled) return;
        setLines(data);
        setLine(data[0] || "");
      })
      .catch(() => {
        if (!cancelled) setError("Không đọc được danh sách Line");
      });
    return () => {
      cancelled = true;
    };
  }, [model, profileType]);

  // Khi đổi Line: chọn ngày có dữ liệu mới nhất.
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
      .get("/dates", { params: { type: profileType, model, line } })
      .then(({ data }) => {
        if (cancelled) return;
        const sortedDates = [...data].sort((a, b) => b.localeCompare(a));
        setDates(sortedDates);
        setDate(sortedDates[0] || "");
      })
      .catch(() => {
        if (!cancelled) setError("Không đọc được danh sách ngày");
      });
    return () => {
      cancelled = true;
    };
  }, [model, line, profileType]);

  // Khi đổi ngày: lấy các ca sẵn có, ưu tiên ca đêm như bản cũ.
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
      .get("/shifts", { params: { type: profileType, model, line, date } })
      .then(({ data }) => {
        if (cancelled) return;
        setShifts(data);
        setShift(data.includes("DEM") ? "DEM" : data[0] || "");
      })
      .catch(() => {
        if (!cancelled) setError("Không đọc được danh sách ca làm việc");
      })
      .finally(() => {
        if (!cancelled) setLoadingShifts(false);
      });
    return () => {
      cancelled = true;
    };
  }, [model, line, date, profileType]);

  useEffect(() => {
    return () => {
      if (reportUrl) URL.revokeObjectURL(reportUrl);
    };
  }, [reportUrl]);

  const handleView = async () => {
    if (!model || !line || !date || !shift || loading) return;
    setLoading(true);
    setError("");
    setReportUrl("");
    setReportTitle("");
    try {
      const response = await api.get("/view", {
        params: { type: profileType, model, line, date, shift },
        responseType: "blob",
      });
      const blob = new Blob([response.data], { type: "application/pdf" });
      setReportTitle(
        `${model} - ${line} - ${date.split("-").reverse().join("/")} - ${SHIFT_LABELS[shift] || shift}`,
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
            border: "1px solid",
            borderColor: "divider",
            boxShadow: "0 3px 12px rgba(0,0,0,0.04)",
          }}
        >
          <Button
            variant="outlined"
            startIcon={<ArrowBackRounded />}
            onClick={() => navigate("/")}
            sx={{ mb: 3, textTransform: "none" }}
          >
            {t("report.backHome")}
          </Button>

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
            <Box
              sx={{
                height: 48,
                display: "flex",
                alignItems: "center",
              }}
            >
              <Typography
                variant="h5"
                fontWeight={700}
                sx={{
                  fontSize: { xs: 20, md: 24 },
                  lineHeight: 1.2,
                }}
              >
                {t("report.profile")}
              </Typography>
            </Box>
          </Stack>

          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: {
                xs: "minmax(0, 1fr)",
                sm: "repeat(2, minmax(0, 1fr))",
                lg: "minmax(125px, 0.9fr) minmax(210px, 2fr) repeat(3, minmax(115px, 1fr)) auto",
              },
              gap: 2,
              alignItems: "center",
            }}
          >
            <FormControl fullWidth size="small">
              <InputLabel id="profile-type-label">
                {t("filter.category", { defaultValue: "Category" })}
              </InputLabel>
              <Select
                labelId="profile-type-label"
                label={t("filter.category", {
                  defaultValue: "Category",
                })}
                value={profileType}
                onChange={handleTypeChange}
                sx={{ height: 44 }}
              >
                <MenuItem value="mass">
                  {t("filter.mass", { defaultValue: "Mass" })}
                </MenuItem>
                <MenuItem value="sample">
                  {t("filter.sample", { defaultValue: "Sample" })}
                </MenuItem>
              </Select>
            </FormControl>

            <Autocomplete
              fullWidth
              size="small"
              options={models}
              value={model || null}
              onChange={(_, newValue) => setModel(newValue || "")}
              autoHighlight
              openOnFocus
              loading={loadingModels}
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
                gridColumn: { xs: "1 / -1", sm: "1 / -1", lg: "auto" },
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

        {reportUrl && (
          <Paper sx={{ mt: 2, p: { xs: 1, md: 2 }, borderRadius: 3 }}>
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
                sx={{ fontSize: { xs: 16, md: 20 }, overflowWrap: "anywhere" }}
              >
                {reportTitle}
              </Typography>

              {/* Dấu xác nhận: giữ nguyên thiết kế và kích thước responsive */}
              <Box
                sx={{
                  display: "flex",
                  justifyContent: { xs: "center", md: "flex-end" },
                  mb: 2,
                }}
              >
                <Box
                  sx={{
                    width: { xs: 260, sm: 320, md: 360 },
                    maxWidth: "100%",
                    border: "1px solid #333",
                    bgcolor: "#fff",
                    color: "#111",
                  }}
                >
                  <Box
                    sx={{
                      display: "grid",
                      gridTemplateColumns: "repeat(4, 1fr)",
                      borderBottom: "1px solid #333",
                    }}
                  >
                    {["Lập", "Kiểm tra", "Xác nhận", "Duyệt"].map((item) => (
                      <Box
                        key={item}
                        sx={{
                          textAlign: "center",
                          fontWeight: 700,
                          fontSize: { xs: 10, sm: 12, md: 13 },
                          py: { xs: 0.5, md: 0.75 },
                          borderRight:
                            item !== "Duyệt" ? "1px solid #333" : "none",
                        }}
                      >
                        {item}
                      </Box>
                    ))}
                  </Box>
                  <Box sx={{ p: { xs: 0.75, md: 1 } }}>
                    <Box
                      sx={{
                        border: "2px solid #194a9e",
                        textAlign: "center",
                        color: "#194a9e",
                        px: 1,
                        py: { xs: 0.5, md: 0.75 },
                      }}
                    >
                      <Typography
                        sx={{
                          fontWeight: 800,
                          fontSize: { xs: 13, sm: 15, md: 17 },
                          lineHeight: 1.25,
                        }}
                      >
                        YUJIN ENC VINA
                      </Typography>
                      <Typography
                        sx={{
                          fontWeight: 700,
                          fontSize: { xs: 9, sm: 11, md: 13 },
                          lineHeight: 1.3,
                        }}
                      >
                        ĐÃ PHÊ DUYỆT - APPROVED
                      </Typography>
                    </Box>
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
