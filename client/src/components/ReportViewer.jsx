import { useEffect, useRef, useState } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import { Box, CircularProgress, Typography } from "@mui/material";

import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url,
).toString();

export default function ReportViewer({ url }) {
  const containerRef = useRef(null);

  const [numPages, setNumPages] = useState(0);
  const [pageWidth, setPageWidth] = useState(800);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const observer = new ResizeObserver(() => {
      const width = container.clientWidth;

      // Thu nhỏ trang PDF vừa chiều rộng vùng hiển thị
      setPageWidth(Math.max(100, width - 16));
    });

    observer.observe(container);

    return () => observer.disconnect();
  }, []);

  return (
    <Box
      ref={containerRef}
      sx={{
        width: "100%",
        overflowX: "hidden",
        bgcolor: "#fff",
      }}
    >
      <Document
        file={url}
        onLoadSuccess={({ numPages }) => setNumPages(numPages)}
        loading={<CircularProgress />}
        error={
          <Typography color="error">Không thể hiển thị báo cáo</Typography>
        }
      >
        {Array.from({ length: numPages }, (_, index) => (
          <Box
            key={index}
            sx={{
              display: "flex",
              justifyContent: "center",
              width: "100%",
              mb: 1,
              "& canvas": {
                maxWidth: "100%",
                height: "auto !important",
              },
            }}
          >
            <Page
              pageNumber={index + 1}
              width={pageWidth}
              renderTextLayer={false}
              renderAnnotationLayer={false}
            />
          </Box>
        ))}
      </Document>
    </Box>
  );
}
