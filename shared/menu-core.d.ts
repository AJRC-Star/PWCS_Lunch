export const SCHOOL_ID: string;
export const SCHOOL_TIMEZONE: string;

export interface SharedMenuSection {
  title: string;
  items: string[];
  wide?: boolean;
}

export interface SharedMenuDay {
  iso: string;
  dateObj: number;
  today: boolean;
  weekend: boolean;
  no_school: boolean;
  no_information_provided?: boolean;
  sections: SharedMenuSection[];
}

export interface SharedMenuResponse {
  days: SharedMenuDay[];
  meta: {
    lastUpdated: string;
    schoolName: string;
  };
}

export function categorizeMealViewerItem(food: Record<string, unknown>): string;
export function getNextSchoolDay(fromISO: string): string;
export function getTodayISO(): string;
export function normalizeMealViewerDay(
  schedule: Record<string, unknown>,
  todayISO: string
): SharedMenuDay | null;
export function normalizeMenuResponse(
  rawData: Record<string, unknown>,
  options?: { todayISO?: string }
): SharedMenuResponse;
