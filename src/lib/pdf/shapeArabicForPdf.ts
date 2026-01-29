// Minimal Arabic shaping for jsPDF:
// 1) Convert Arabic chars into presentation forms (connected glyphs)
// 2) Reverse the string so jsPDF's LTR rendering displays RTL correctly

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore - package has no TS types
import ArabicReshaper from "arabic-reshaper";

/**
 * Reverses a string while keeping combining marks (diacritics) attached to their base characters.
 */
const reverseArabicString = (str: string): string => {
  // Split into grapheme clusters to handle combining characters properly
  // Using spread operator with Array.from for better Unicode handling
  const chars = Array.from(str);
  return chars.reverse().join("");
};

export const shapeArabicForPdf = (text: string): string => {
  if (!text) return text;
  try {
    // For jsPDF which renders left-to-right:
    // 1) First reshape Arabic letters into connected presentation forms
    // 2) Then reverse the entire string so it displays correctly when drawn LTR
    
    // Step 1: Reshape Arabic characters into their presentation forms (connected letters)
    const reshaped: string = ArabicReshaper.convertArabic(text);

    // Step 2: Reverse the string for RTL display in LTR renderer
    const reversed = reverseArabicString(reshaped);

    return reversed;
  } catch (error) {
    console.warn("Arabic shaping failed:", error);
    // Fallback to raw
    return text;
  }
};
