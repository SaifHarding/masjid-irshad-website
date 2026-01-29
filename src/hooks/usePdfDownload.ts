import { useCallback, useState } from "react";
import type { PrayerTimesData } from "@/hooks/usePrayerTimes";
import { format, parseISO } from "date-fns";


// Helper function to generate QR code using canvas
const generateQRCodeDataUrl = async (text: string): Promise<string> => {
  return new Promise((resolve, reject) => {
    try {
      // Dynamically import qrcode if available
      import("qrcode").then((QRCode) => {
        QRCode.toDataURL(text, {
          width: 256,
          margin: 1,
          color: {
            dark: "#0d7377",
            light: "#f4c430",
          },
        }).then(resolve).catch(reject);
      }).catch(() => {
        // Fallback: create a simple canvas-based QR code placeholder
        const canvas = document.createElement("canvas");
        const size = 256;
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.fillStyle = "#f4c430";
          ctx.fillRect(0, 0, size, size);
          ctx.fillStyle = "#0d7377";
          ctx.font = "12px Arial";
          ctx.textAlign = "center";
          ctx.fillText("QR Code", size / 2, size / 2);
          resolve(canvas.toDataURL());
        } else {
          reject(new Error("Could not create canvas context"));
        }
      });
    } catch (error) {
      reject(error);
    }
  });
};

interface UsePdfDownloadOptions {
  filename: string;
  onSuccess?: () => void;
  onError?: (error: Error) => void;
}

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

const formatTime = (time: string): string => {
  if (!time) return "-";
  const [hours, minutes] = time.split(":");
  const hour = parseInt(hours);
  const ampm = hour >= 12 ? "pm" : "am";
  const displayHour = hour % 12 || 12;
  return `${displayHour}:${minutes}${ampm}`;
};

export const usePdfDownload = ({ filename, onSuccess, onError }: UsePdfDownloadOptions) => {
  const [isGenerating, setIsGenerating] = useState(false);

  const downloadPdf = useCallback(
    async (data: PrayerTimesData[], selectedMonth: number, selectedYear: number) => {
      if (!data || data.length === 0) {
        onError?.(new Error("No data to generate PDF"));
        return;
      }

      setIsGenerating(true);

      try {
        // Dynamically import jsPDF and autoTable to reduce initial bundle size
        const [{ jsPDF }, autoTableModule] = await Promise.all([
          import("jspdf"),
          import("jspdf-autotable"),
        ]);
        const autoTable = autoTableModule.default;

        // Create PDF in A4 portrait
        const pdf = new jsPDF({
          orientation: "portrait",
          unit: "mm",
          format: "a4",
        });

        const pageWidth = pdf.internal.pageSize.getWidth();
        const pageHeight = pdf.internal.pageSize.getHeight();
        const margin = 8;

        // Colors
        const tealColor: [number, number, number] = [13, 115, 119];
        const goldColor: [number, number, number] = [244, 196, 48];

        // Draw teal background for entire page
        pdf.setFillColor(...tealColor);
        pdf.rect(0, 0, pageWidth, pageHeight, "F");

        // Header section
        const headerY = 12;

        // Load and add logo (left side)
        try {
          const logoSize = 20;
          const logoX = margin + 5;
          const logoY = headerY - 3;

          // Draw white circle background for logo
          const logoCenterX = logoX + logoSize / 2;
          const logoCenterY = logoY + logoSize / 2;
          const circleRadius = logoSize / 2 + 1; // Slightly larger than logo

          pdf.setFillColor(255, 255, 255);
          pdf.circle(logoCenterX, logoCenterY, circleRadius, "F");

          // Load and add logo on top of white circle
          const logoResponse = await fetch("/masjid-irshad-logo.png");
          const logoBlob = await logoResponse.blob();
          const logoDataUrl = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(logoBlob);
          });

          pdf.addImage(logoDataUrl, "PNG", logoX, logoY, logoSize, logoSize);
        } catch (error) {
          console.warn("Failed to load logo:", error);
        }

        // Generate and add QR code (right side)
        try {
          const qrCodeDataUrl = await generateQRCodeDataUrl("https://masjidirshad.co.uk");

          const qrSize = 18;
          const qrX = pageWidth - margin - qrSize - 5;
          pdf.addImage(qrCodeDataUrl, "PNG", qrX, headerY - 3, qrSize, qrSize);

          // QR label (larger and bolder)
          pdf.setFontSize(10);
          pdf.setTextColor(255, 255, 255);
          pdf.setFont("helvetica", "bold");
          pdf.text("Scan for Website", qrX + qrSize / 2, headerY + qrSize + 2, { align: "center" });
        } catch (error) {
          console.warn("Failed to generate QR code:", error);
        }

        // Decorative header ornament
        pdf.setDrawColor(...goldColor);
        pdf.setLineWidth(0.5);
        const ornamentY = headerY - 1;
        const centerX = pageWidth / 2;

        // Draw decorative lines with center diamonds
        pdf.line(centerX - 25, ornamentY, centerX - 5, ornamentY);
        pdf.line(centerX + 5, ornamentY, centerX + 25, ornamentY);

        // Center diamonds using rectangles for better compatibility
        pdf.setFillColor(...goldColor);
        const diamondSize = 1.2;
        pdf.rect(centerX - 3 - diamondSize/2, ornamentY - diamondSize/2, diamondSize, diamondSize, "F");
        pdf.rect(centerX - diamondSize/2, ornamentY - diamondSize/2, diamondSize, diamondSize, "F");
        pdf.rect(centerX + 3 - diamondSize/2, ornamentY - diamondSize/2, diamondSize, diamondSize, "F");

        // Month/Year title
        pdf.setFontSize(26);
        pdf.setTextColor(255, 255, 255);
        pdf.setFont("helvetica", "bold");
        pdf.text(`${MONTHS[selectedMonth]} ${selectedYear}`, pageWidth / 2, headerY + 10, { align: "center" });

        // Gold underline
        pdf.setDrawColor(...goldColor);
        pdf.setLineWidth(0.5);
        pdf.line(pageWidth / 2 - 20, headerY + 13, pageWidth / 2 + 20, headerY + 13);

        // Mosque name
        pdf.setFontSize(11);
        pdf.setFont("helvetica", "bold");
        pdf.text("Masjid Irshad", pageWidth / 2, headerY + 19, { align: "center" });

        // Address
        pdf.setFontSize(8);
        pdf.setFont("helvetica", "normal");
        pdf.setTextColor(230, 230, 230);
        pdf.text("400 Dallow Road, Luton, LU1 1UR", pageWidth / 2, headerY + 24, { align: "center" });

        // Website
        pdf.setTextColor(...goldColor);
        pdf.setFontSize(7);
        pdf.text("masjidirshad.co.uk", pageWidth / 2, headerY + 28, { align: "center" });

        // Prepare table data
        const tableBody = data.map((row) => {
          const dateObj = parseISO(row.Date);
          return [
            format(dateObj, "d"),
            row.Day,
            formatTime(row.Fajr_Begins),
            formatTime(row.Fajr_Jamaat),
            formatTime(row.Sunrise),
            formatTime(row.Dhuhr_Begins),
            formatTime(row.Dhuhr_Jamaat),
            formatTime(row.Asr_Begins),
            formatTime(row.Asr_Jamaat),
            formatTime(row.Maghrib_Begins),
            formatTime(row.Maghrib_Jamaat),
            formatTime(row.Isha_Begins),
            formatTime(row.Isha_Jamaat),
          ];
        });

        // Generate table
        autoTable(pdf, {
          startY: headerY + 34,
          margin: { left: margin, right: margin, bottom: 35 },
          head: [
            [
              { content: "Date", rowSpan: 2 },
              { content: "Day", rowSpan: 2 },
              { content: "Fajr", colSpan: 2 },
              { content: "Sunrise", rowSpan: 2 },
              { content: "Dhuhr", colSpan: 2 },
              { content: "Asr", colSpan: 2 },
              { content: "Maghrib", colSpan: 2 },
              { content: "Isha", colSpan: 2 },
            ],
            ["Start", "Iqamah", "Start", "Iqamah", "Start", "Iqamah", "Start", "Iqamah", "Start", "Iqamah"],
          ],
          body: tableBody,
          theme: "grid",
          styles: {
            fontSize: 7,
            cellPadding: 1.5,
            halign: "center",
            valign: "middle",
            textColor: [30, 41, 59],
            lineColor: [200, 200, 200],
            lineWidth: 0.1,
          },
          headStyles: {
            fillColor: tealColor,
            textColor: [255, 255, 255],
            fontStyle: "bold",
            fontSize: 7,
          },
          alternateRowStyles: {
            fillColor: [248, 250, 252],
          },
          bodyStyles: {
            fillColor: [255, 255, 255],
          },
          didParseCell: (hookData) => {
            // Highlight Friday rows
            if (hookData.section === "body" && hookData.row.raw && Array.isArray(hookData.row.raw)) {
              const dayCell = hookData.row.raw[1] as string;
              if (dayCell === "Fri") {
                hookData.cell.styles.fillColor = [254, 243, 199];
                if (hookData.column.index === 1) {
                  hookData.cell.styles.textColor = [13, 115, 119];
                  hookData.cell.styles.fontStyle = "bold";
                }
              }
            }
            // Bold iqamah times
            if (hookData.section === "body" && [3, 6, 8, 10, 12].includes(hookData.column.index)) {
              hookData.cell.styles.fontStyle = "bold";
            }
          },
        });

        // Footer section - position dynamically after table with small gap
        const tableEndY = (pdf as any).lastAutoTable.finalY;
        const footerY = tableEndY + 10;

        // English translation (without Arabic verse)
        pdf.setFontSize(8);
        pdf.setTextColor(220, 220, 220);
        pdf.setFont("helvetica", "bold");
        pdf.text('"O you who believe, seek help through patience and prayer. Indeed, Allah is with the patient." - Qur\'an, Surah Al-Baqarah (2:153)', pageWidth / 2, footerY, { align: "center" });

        // Decorative footer ornament (after English translation)
        pdf.setDrawColor(...goldColor);
        pdf.setFillColor(...goldColor);
        const footerOrnamentY = footerY + 8;
        const footerDiamondSize = 1.2;

        // Draw three small diamonds using rectangles
        pdf.rect(pageWidth / 2 - 5 - footerDiamondSize/2, footerOrnamentY - footerDiamondSize/2, footerDiamondSize, footerDiamondSize, "F");
        pdf.rect(pageWidth / 2 - footerDiamondSize/2, footerOrnamentY - footerDiamondSize/2, footerDiamondSize, footerDiamondSize, "F");
        pdf.rect(pageWidth / 2 + 5 - footerDiamondSize/2, footerOrnamentY - footerDiamondSize/2, footerDiamondSize, footerDiamondSize, "F");

        // Jumu'ah times section (larger, bolder, well spaced)
        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(11);
        pdf.setTextColor(255, 255, 255);
        pdf.text("Jumu'ah 1st Jamaat: 12:30", pageWidth / 2 - 32, footerY + 18, { align: "center" });

        // Decorative divider
        pdf.setFillColor(...goldColor);
        const dividerSize = 1.2;
        pdf.rect(pageWidth / 2 - dividerSize/2, footerY + 17 - dividerSize/2, dividerSize, dividerSize, "F");

        pdf.setTextColor(255, 255, 255);
        pdf.text("Jumu'ah 2nd Jamaat: 13:15", pageWidth / 2 + 32, footerY + 18, { align: "center" });

        // Maktab info (larger, bold)
        pdf.setTextColor(...goldColor);
        pdf.setFontSize(10);
        pdf.setFont("helvetica", "bold");
        pdf.text("Weekday Boys & Girls Maktab Classes Available", pageWidth / 2, footerY + 28, { align: "center" });

        // Website (at the bottom, largest and boldest)
        pdf.setTextColor(255, 255, 255);
        pdf.setFontSize(12);
        pdf.setFont("helvetica", "bold");
        pdf.text("www.masjidirshad.co.uk", pageWidth / 2, footerY + 36, { align: "center" });

        // Save the PDF
        pdf.save(`${filename}.pdf`);

        onSuccess?.();
      } catch (error) {
        console.error("PDF generation failed:", error);
        onError?.(error instanceof Error ? error : new Error("PDF generation failed"));
      } finally {
        setIsGenerating(false);
      }
    },
    [filename, onSuccess, onError]
  );

  return { downloadPdf, isGenerating };
};
