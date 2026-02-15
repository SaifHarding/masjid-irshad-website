import type { jsPDF } from "jspdf";

interface RenderCenteredMultilineTextOptions {
  xCenter: number;
  yTop: number;
  maxWidth: number;
  lineHeight: number;
}

/**
 * Renders a string as centered multi-line text with jsPDF.
 * Returns the y position after the last rendered line.
 */
export const renderCenteredMultilineText = (
  pdf: jsPDF,
  text: string,
  { xCenter, yTop, maxWidth, lineHeight }: RenderCenteredMultilineTextOptions
): number => {
  const lines = pdf.splitTextToSize(text, maxWidth) as string[];
  let y = yTop;
  for (const line of lines) {
    pdf.text(line, xCenter, y, { align: "center" });
    y += lineHeight;
  }
  return y;
};
