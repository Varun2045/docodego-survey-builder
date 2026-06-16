/**
 * Helper to resolve the survey's chosen font family identifier
 * into a standard CSS font-family stack.
 */
export function getFontFamilyStyle(font: string): string {
  switch (font) {
    case "serif":
      return "Georgia, Cambria, 'Times New Roman', Times, serif";
    case "mono":
      return "'Fira Code', 'Courier New', Courier, monospace";
    case "outfit":
      return "'Outfit', sans-serif";
    case "playfair":
      return "'Playfair Display', serif";
    case "lexend":
      return "'Lexend', sans-serif";
    default:
      return "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
  }
}

/**
 * Helper to blend a hex color with white (90% white blend factor)
 * to generate a soft, light, tinted background variant.
 */
export function getLightenedColor(hexColor: string): string {
  let cleanHex = hexColor.replace("#", "");
  if (cleanHex.length === 3) {
    cleanHex = cleanHex
      .split("")
      .map((c) => c + c)
      .join("");
  }
  if (cleanHex.length !== 6) {
    return "#F0EBF8";
  }

  const r = Number.parseInt(cleanHex.slice(0, 2), 16);
  const g = Number.parseInt(cleanHex.slice(2, 4), 16);
  const b = Number.parseInt(cleanHex.slice(4, 6), 16);

  const rNew = Math.round(r + (255 - r) * 0.9);
  const gNew = Math.round(g + (255 - g) * 0.9);
  const bNew = Math.round(b + (255 - b) * 0.9);

  const rHex = rNew.toString(16).padStart(2, "0");
  const gHex = gNew.toString(16).padStart(2, "0");
  const bHex = bNew.toString(16).padStart(2, "0");

  return `#${rHex}${gHex}${bHex}`;
}

/**
 * Helper to resolve the background style selection
 * into a standard Hex color value.
 */
export function getBgColorStyle(bgStyle: string, primaryColor: string): string {
  switch (bgStyle) {
    case "white":
      return "#ffffff";
    case "gray":
      return "#f8f9fa";
    case "cream":
      return "#faf6f0";
    case "slate":
      return "#f1f5f9";
    default:
      return getLightenedColor(primaryColor);
  }
}
