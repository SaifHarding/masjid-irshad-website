import type { jsPDF } from "jspdf";
import amiriTtfUrl from "@/assets/fonts/Amiri-Regular.ttf?url";

let cachedLoad: Promise<string> | null = null;

const arrayBufferToBase64 = (buffer: ArrayBuffer): string => {
  const bytes = new Uint8Array(buffer);
  // Avoid call stack limits by chunking.
  const chunkSize = 0x8000;
  let binary = "";
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode(...chunk);
  }
  return btoa(binary);
};

const loadAmiriBase64 = async (): Promise<string> => {
  const res = await fetch(amiriTtfUrl);
  if (!res.ok) throw new Error("Failed to load Amiri font");
  const buf = await res.arrayBuffer();
  return arrayBufferToBase64(buf);
};

/**
 * Ensures an Arabic-capable font is registered with this jsPDF instance.
 * Safe to call multiple times.
 */
export const ensureAmiriFont = async (pdf: jsPDF): Promise<void> => {
  try {
    const fontList = typeof (pdf as unknown as { getFontList?: () => Record<string, unknown> }).getFontList === "function"
      ? (pdf as unknown as { getFontList: () => Record<string, unknown> }).getFontList()
      : null;
    if (fontList && "Amiri" in fontList) return;
  } catch {
    // ignore
  }

  if (!cachedLoad) cachedLoad = loadAmiriBase64();
  const base64 = await cachedLoad;

  // Add to VFS + register
  pdf.addFileToVFS("Amiri-Regular.ttf", base64);
  pdf.addFont("Amiri-Regular.ttf", "Amiri", "normal");
};
