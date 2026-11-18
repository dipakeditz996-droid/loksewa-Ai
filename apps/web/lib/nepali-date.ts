import NepaliDate from "nepali-date-converter";

export interface NepaliMonthInfo {
  index: number; // 0 to 11
  en: string;
  np: string;
}

export const NEPALI_MONTHS: NepaliMonthInfo[] = [
  { index: 0, en: "Baisakh", np: "बैशाख" },
  { index: 1, en: "Jestha", np: "जेठ" },
  { index: 2, en: "Asar", np: "असार" },
  { index: 3, en: "Shrawan", np: "श्रावण" },
  { index: 4, en: "Bhadra", np: "भाद्र" },
  { index: 5, en: "Aswin", np: "असोज" },
  { index: 6, en: "Kartik", np: "कार्तिक" },
  { index: 7, en: "Mangsir", np: "मंसिर" },
  { index: 8, en: "Poush", np: "पुष" },
  { index: 9, en: "Magh", np: "माघ" },
  { index: 10, en: "Falgun", np: "फागुन" },
  { index: 11, en: "Chaitra", np: "चैत" },
];

export const NEPALI_DAYS = [
  { en: "Sun", np: "आइत", shortNp: "आ", isWeekend: false },
  { en: "Mon", np: "सोम", shortNp: "सो", isWeekend: false },
  { en: "Tue", np: "मङ्गल", shortNp: "मं", isWeekend: false },
  { en: "Wed", np: "बुध", shortNp: "बु", isWeekend: false },
  { en: "Thu", np: "बिही", shortNp: "बि", isWeekend: false },
  { en: "Fri", np: "शुक्र", shortNp: "शु", isWeekend: false },
  { en: "Sat", np: "शनि", shortNp: "श", isWeekend: true },
];

const NEPALI_DIGITS = ["०", "१", "२", "३", "४", "५", "६", "७", "८", "९"];

export function toNepaliNumerals(value: string | number): string {
  return String(value).replace(/[0-9]/g, (digit) => NEPALI_DIGITS[Number(digit)] || digit);
}

export interface ConvertedBsDate {
  bsYear: number;
  bsMonth: number; // 0-indexed
  bsDate: number;
  monthEn: string;
  monthNp: string;
  formattedBs: string; // "2083-09-20"
  formattedReadable: string; // "2083 Poush 20"
  formattedNepali: string; // "२०८३ पुष २०"
}

/**
 * Converts Gregorian AD string (YYYY-MM-DD) to Nepali Bikram Sambat (BS).
 */
export function adToBs(adDateStr: string | null | undefined): ConvertedBsDate | null {
  if (!adDateStr) return null;
  const trimmed = String(adDateStr).trim().slice(0, 10);
  const parts = trimmed.split("-");
  const yearStr = parts[0];
  const monthStr = parts[1];
  const dayStr = parts[2];
  if (!yearStr || !monthStr || !dayStr) return null;

  const pYear = parseInt(yearStr, 10);
  const pMonth = parseInt(monthStr, 10);
  const pDay = parseInt(dayStr, 10);
  if (isNaN(pYear) || isNaN(pMonth) || isNaN(pDay)) {
    return null;
  }

  try {
    // Offset to noon UTC to prevent date boundary shifts across timezones
    const jsDate = new Date(Date.UTC(pYear, pMonth - 1, pDay, 12, 0, 0));
    const nep = new NepaliDate(jsDate);
    const y = nep.getYear();
    const m = nep.getMonth();
    const d = nep.getDate();
    const monthObj = NEPALI_MONTHS[m] || { index: m, en: "Unknown", np: "अज्ञात" };

    return {
      bsYear: y,
      bsMonth: m,
      bsDate: d,
      monthEn: monthObj.en,
      monthNp: monthObj.np,
      formattedBs: `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`,
      formattedReadable: `${y} ${monthObj.en} ${d}`,
      formattedNepali: `${toNepaliNumerals(y)} ${monthObj.np} ${toNepaliNumerals(d)}`,
    };
  } catch {
    return null;
  }
}

/**
 * Converts Nepali BS date (year, 0-indexed month, day) to Gregorian AD string (YYYY-MM-DD).
 */
export function bsToAd(bsYear: number, bsMonth: number, bsDay: number): string {
  try {
    const nep = new NepaliDate(bsYear, bsMonth, bsDay);
    const jsDate = nep.toJsDate();
    // Offset by +05:45 (Nepal Time)
    const nptMs = jsDate.getTime() + 345 * 60 * 1000;
    const nptDate = new Date(nptMs);
    const y = nptDate.getUTCFullYear();
    const m = String(nptDate.getUTCMonth() + 1).padStart(2, "0");
    const d = String(nptDate.getUTCDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  } catch {
    return "";
  }
}

/**
 * Returns number of days in a given BS month for a given BS year.
 */
export function getBsDaysInMonth(year: number, monthIndex: number): number {
  try {
    const config = (NepaliDate as any).dateConfigMap?.[String(year)];
    if (config) {
      const monthKey = NEPALI_MONTHS[monthIndex]?.en;
      if (monthKey && config[monthKey]) {
        return config[monthKey];
      }
    }
  } catch {}
  return 30;
}

/**
 * Returns the day of week (0 = Sunday, 6 = Saturday) for the 1st of a given BS month and year.
 */
export function getBsMonthStartDay(year: number, monthIndex: number): number {
  try {
    const nep = new NepaliDate(year, monthIndex, 1);
    return nep.getDay();
  } catch {
    return 0;
  }
}

/**
 * Formats a Gregorian AD date into Nepali BS with optional AD comparison.
 * e.g. "2083 Poush 20 BS (Jan 4, 2027)" or "२०८३ पुष २०"
 */
export function formatNepaliDateDisplay(
  adDateStr: string | null | undefined,
  options?: {
    showAd?: boolean;
    useNepaliScript?: boolean;
    short?: boolean;
  }
): string {
  if (!adDateStr) return "—";
  const bs = adToBs(adDateStr);
  if (!bs) {
    try {
      return new Date(adDateStr).toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    } catch {
      return String(adDateStr);
    }
  }

  const bsText = options?.useNepaliScript ? bs.formattedNepali : `${bs.formattedReadable} BS`;
  if (options?.showAd) {
    try {
      const adPart = new Date(adDateStr).toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
      return `${bsText} (${adPart})`;
    } catch {
      return bsText;
    }
  }

  return bsText;
}

/**
 * Returns current date in BS.
 */
export function getTodayBs(): { year: number; month: number; day: number } {
  try {
    const nep = new NepaliDate();
    return {
      year: nep.getYear(),
      month: nep.getMonth(),
      day: nep.getDate(),
    };
  } catch {
    return { year: 2083, month: 7, day: 1 };
  }
}
