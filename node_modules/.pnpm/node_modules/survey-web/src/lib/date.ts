/**
 * SQLite CURRENT_TIMESTAMP returns a string like "YYYY-MM-DD HH:MM:SS" in UTC.
 * JavaScript's Date constructor parses this string in local time in some browsers,
 * causing timezone offsets.
 *
 * This helper ensures the SQLite UTC timestamp is parsed as a true UTC date,
 * so `.toLocaleString()` converts it accurately to the user's local timezone.
 */
export function parseSQLiteUTCTime(utcString: string): Date {
  if (!utcString) return new Date();

  // If it's already an ISO 8601 string (contains 'T' or ends with 'Z'), parse it directly
  if (utcString.includes("T") || utcString.endsWith("Z")) {
    return new Date(utcString);
  }

  // SQLite CURRENT_TIMESTAMP format: "YYYY-MM-DD HH:MM:SS"
  // Convert to ISO 8601 UTC format: "YYYY-MM-DDTHH:MM:SSZ"
  const formatted = `${utcString.replace(" ", "T")}Z`;
  const parsed = new Date(formatted);

  // Fallback if parsing fails
  return Number.isNaN(parsed.getTime()) ? new Date(utcString) : parsed;
}
