import { useNavigate } from "react-router-dom";

import {
  Box,
  Container,
  Typography,
  Paper,
  Card,
  CardActionArea,
  CardContent,
  Stack,
  IconButton,
  Tooltip,
  Menu,
  MenuItem,
} from "@mui/material";

import {
  ShowChartRounded,
  PictureAsPdfRounded,
  FactoryRounded,
  DarkModeRounded,
  LightModeRounded,
  LanguageRounded,
} from "@mui/icons-material";

import { useState } from "react";

import { useTranslation } from "react-i18next";

import { useColorMode } from "../context/ThemeContext";

export default function HomePage() {
  const navigate = useNavigate();

  const { mode, toggleColorMode } = useColorMode();

  const { t, i18n } = useTranslation();

  const [languageAnchor, setLanguageAnchor] = useState(null);

  const handleLanguageChange = (language) => {
    i18n.changeLanguage(language);
    localStorage.setItem("reflow-language", language);
    setLanguageAnchor(null);
  };

  const reports = [
    {
      title: `${t("report.trend")}`,
      subtitle: `${t("report.trendSubtitle")}`,
      description: `${t("home.trendDescription")}`,
      icon: <ShowChartRounded sx={{ fontSize: 42 }} />,
      color: "#1976d2",
      bg: "#eaf3ff",
      path: "/trend",
      disabled: false,
    },
    {
      title: `${t("report.profile")}`,
      subtitle: `${t("report.profileSubtitle")}`,
      description: `${t("home.profileDescription")}`,
      icon: <PictureAsPdfRounded sx={{ fontSize: 42 }} />,
      color: "#e65100",
      bg: "#fff3e0",
      path: "/profile",
      disabled: false,
    },
  ];

  return (
    <Box
      sx={{
        minHeight: "100vh",
        bgcolor: "background.default",
        color: "text.primary",
        py: { xs: 4, md: 8 },
      }}
    >
      <Container maxWidth="md">
        <Paper
          elevation={0}
          sx={{
            p: { xs: 3, md: 5 },
            borderRadius: 4,
            border: "1px solid #e3e8ef",
          }}
        >
          <Box
            sx={{
              display: "flex",
              justifyContent: "flex-end",
              mb: 2,
              alignItems: "center",
              gap: 1,
            }}
          >
            {/* Nút chọn ngôn ngữ */}
            <Tooltip title="Ngôn ngữ">
              <IconButton
                onClick={(e) => setLanguageAnchor(e.currentTarget)}
                sx={{
                  width: 42,
                  height: 42,
                  border: "1px solid",
                  borderColor: "divider",
                  color: "text.primary",
                  bgcolor: "background.paper",
                }}
              >
                <LanguageRounded fontSize="small" />
              </IconButton>
            </Tooltip>

            <Menu
              anchorEl={languageAnchor}
              open={Boolean(languageAnchor)}
              onClose={() => setLanguageAnchor(null)}
            >
              <MenuItem onClick={() => handleLanguageChange("vi")}>
                <Typography
                  sx={{
                    width: 30,
                    fontSize: 11,
                    color: "text.secondary",
                  }}
                >
                  VN
                </Typography>
                Tiếng Việt
              </MenuItem>

              <MenuItem onClick={() => handleLanguageChange("en")}>
                <Typography
                  sx={{
                    width: 30,
                    fontSize: 11,
                    color: "text.secondary",
                  }}
                >
                  US
                </Typography>
                English
              </MenuItem>

              <MenuItem onClick={() => handleLanguageChange("ko")}>
                <Typography
                  sx={{
                    width: 30,
                    fontSize: 11,
                    color: "text.secondary",
                  }}
                >
                  KR
                </Typography>
                한국어
              </MenuItem>
            </Menu>

            <Tooltip title={mode === "light" ? "Chế độ tối" : "Chế độ sáng"}>
              <IconButton
                onClick={toggleColorMode}
                color="primary"
                sx={{
                  bgcolor: "background.paper",
                  border: "1px solid",
                  borderColor: "divider",
                }}
              >
                {mode === "light" ? <DarkModeRounded /> : <LightModeRounded />}
              </IconButton>
            </Tooltip>
          </Box>
          <Stack
            alignItems="center"
            spacing={2}
            sx={{ mb: 5, textAlign: "center" }}
          >
            <Box
              sx={{
                width: 72,
                height: 72,
                borderRadius: 3,
                bgcolor: "#1976d2",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <FactoryRounded sx={{ fontSize: 40, color: "#fff" }} />
            </Box>

            <Typography
              variant="h4"
              fontWeight={700}
              sx={{ fontSize: { xs: 24, md: 32 } }}
            >
              {t("home.title")}
            </Typography>

            <Typography
              color="text.secondary"
              sx={{ fontSize: { xs: 20, md: 28 } }}
            >
              {t("home.subtitle")}
            </Typography>

            <Typography variant="h6" sx={{ pt: 2 }}>
              {t("home.selectReport")}
            </Typography>
          </Stack>

          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: {
                xs: "1fr",
                sm: "repeat(2, 1fr)",
              },
              gap: 3,
            }}
          >
            {reports.map((report) => (
              <Card
                key={report.title}
                variant="outlined"
                sx={{
                  borderRadius: 3,
                  opacity: report.disabled ? 0.65 : 1,
                  transition: "0.2s",
                  "&:hover": report.disabled
                    ? {}
                    : {
                        borderColor: report.color,
                        boxShadow: 3,
                        transform: "translateY(-3px)",
                      },
                }}
              >
                <CardActionArea
                  disabled={report.disabled}
                  onClick={() => navigate(report.path)}
                  sx={{ height: "100%" }}
                >
                  <CardContent sx={{ p: 3 }}>
                    <Stack spacing={2}>
                      <Box
                        sx={{
                          width: 72,
                          height: 72,
                          bgcolor: report.bg,
                          color: report.color,
                          borderRadius: 3,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        {report.icon}
                      </Box>

                      <Typography variant="h6" fontWeight={700}>
                        {report.title}
                      </Typography>

                      <Typography variant="body2" color="text.secondary">
                        {report.subtitle}
                      </Typography>

                      <Typography variant="body2" sx={{ minHeight: 65 }}>
                        {report.description}
                      </Typography>

                      <Stack
                        direction="row"
                        justifyContent="space-between"
                        alignItems="center"
                      ></Stack>
                    </Stack>
                  </CardContent>
                </CardActionArea>
              </Card>
            ))}
          </Box>
        </Paper>
      </Container>
    </Box>
  );
}
