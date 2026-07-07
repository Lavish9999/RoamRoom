const MONTHS: Record<string, number> = {
  january: 0, february: 1, march: 2, april: 3, may: 4, june: 5,
  july: 6, august: 7, september: 8, october: 9, november: 10, december: 11,
  jan: 0, feb: 1, mar: 2, apr: 3, jun: 5, jul: 6, aug: 7, sep: 8, sept: 8, oct: 9, nov: 10, dec: 11,
};

/**
 * Parse a trip date string to a Date, or null if unparseable.
 *
 * The app stores dates as human strings like "July 17, 2026". Hermes (the iOS
 * JS engine) does NOT reliably parse that with `new Date()`, so we parse the
 * "Month DD, YYYY" shape ourselves and only fall back to the native parser for
 * ISO/other formats.
 */
export function parseDate(value?: string): Date | null {
  if (!value) return null;
  const trimmed = value.trim();

  const match = trimmed.match(/^([A-Za-z]{3,9})\.?\s+(\d{1,2}),?\s+(\d{4})$/);
  if (match) {
    const month = MONTHS[match[1].toLowerCase()];
    if (month !== undefined) return new Date(Number(match[3]), month, Number(match[2]));
  }

  const native = new Date(trimmed);
  return Number.isNaN(native.getTime()) ? null : native;
}
