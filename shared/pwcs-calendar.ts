function parseISOAtUtcNoon(iso: string): Date {
  return new Date(`${iso}T12:00:00Z`);
}

function formatUTCISODate(date: Date): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

type NoSchoolDateRange = {
  start: string;
  end?: string;
};

const PWCS_NO_SCHOOL_RANGES: NoSchoolDateRange[] = [
  { start: '2025-08-07', end: '2025-08-08' },
  { start: '2025-08-11', end: '2025-08-15' },
  { start: '2025-08-29' },
  { start: '2025-09-01' },
  { start: '2025-09-23' },
  { start: '2025-10-02' },
  { start: '2025-10-13' },
  { start: '2025-10-21' },
  { start: '2025-11-03' },
  { start: '2025-11-04' },
  { start: '2025-11-11' },
  { start: '2025-11-26', end: '2025-11-28' },
  { start: '2025-12-22', end: '2026-01-02' },
  { start: '2026-01-19' },
  { start: '2026-01-23' },
  { start: '2026-01-26' },
  { start: '2026-02-16' },
  { start: '2026-03-20' },
  { start: '2026-03-30', end: '2026-04-06' },
  { start: '2026-04-21' },
  { start: '2026-05-25' },
  { start: '2026-05-27' },
  { start: '2026-06-15' },
  { start: '2026-08-13', end: '2026-08-14' },
  { start: '2026-08-17', end: '2026-08-21' },
  { start: '2026-09-04' },
  { start: '2026-09-07' },
  { start: '2026-09-21' },
  { start: '2026-10-12' },
  { start: '2026-11-02' },
  { start: '2026-11-03' },
  { start: '2026-11-11' },
  { start: '2026-11-25', end: '2026-11-27' },
  { start: '2026-12-21', end: '2027-01-01' },
  { start: '2027-01-18' },
  { start: '2027-01-28' },
  { start: '2027-01-29' },
  { start: '2027-02-15' },
  { start: '2027-03-10' },
  { start: '2027-03-22', end: '2027-03-29' },
  { start: '2027-04-16' },
  { start: '2027-05-17' },
  { start: '2027-05-31' },
  { start: '2027-06-18' },
  { start: '2027-06-21' },
];

const PWCS_CALENDAR_COVERAGE_END_ISO = '2027-06-21';

// The last instructional day of each covered school year.  Used by
// isNearSchoolYearEnd to allow short snapshots in the final days of school
// without triggering the forward-looking plausibility guard.
const PWCS_SCHOOL_YEAR_LAST_DAYS = ['2026-06-12', '2027-06-17'];

function isNearSchoolYearEnd(iso: string, windowDays = 5): boolean {
  const date = parseISOAtUtcNoon(iso);
  return PWCS_SCHOOL_YEAR_LAST_DAYS.some((lastDay) => {
    const last = parseISOAtUtcNoon(lastDay);
    const diffMs = last.getTime() - date.getTime();
    const diffDays = diffMs / (1000 * 60 * 60 * 24);
    return diffDays >= 0 && diffDays <= windowDays;
  });
}

function expandDateRange({ start, end = start }: NoSchoolDateRange): string[] {
  const dates: string[] = [];
  const cursor = parseISOAtUtcNoon(start);
  const endDate = parseISOAtUtcNoon(end);

  while (cursor <= endDate) {
    dates.push(formatUTCISODate(cursor));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }

  return dates;
}

const PWCS_NO_SCHOOL_DATES = new Set(
  PWCS_NO_SCHOOL_RANGES.flatMap((range) => expandDateRange(range)),
);

function isPWCSNoSchoolDate(iso: string): boolean {
  return PWCS_NO_SCHOOL_DATES.has(iso);
}

function getPWCSNoSchoolDatesBetween(startISO: string, endISO: string): string[] {
  const start = parseISOAtUtcNoon(startISO);
  const end = parseISOAtUtcNoon(endISO);

  if (start > end) {
    return [];
  }

  const dates: string[] = [];
  const cursor = new Date(start);
  while (cursor <= end) {
    const iso = formatUTCISODate(cursor);
    if (PWCS_NO_SCHOOL_DATES.has(iso)) {
      dates.push(iso);
    }
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }

  return dates;
}

function countPWCSInstructionalWeekdaysBetween(startISO: string, endISO: string): number {
  const start = parseISOAtUtcNoon(startISO);
  const end = parseISOAtUtcNoon(endISO);

  if (start > end) {
    return 0;
  }

  let count = 0;
  const cursor = new Date(start);
  while (cursor <= end) {
    const dayOfWeek = cursor.getUTCDay();
    const iso = formatUTCISODate(cursor);
    if (dayOfWeek !== 0 && dayOfWeek !== 6 && !PWCS_NO_SCHOOL_DATES.has(iso)) {
      count += 1;
    }
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }

  return count;
}

export {
  countPWCSInstructionalWeekdaysBetween,
  getPWCSNoSchoolDatesBetween,
  isNearSchoolYearEnd,
  isPWCSNoSchoolDate,
  PWCS_CALENDAR_COVERAGE_END_ISO,
  PWCS_NO_SCHOOL_DATES,
  PWCS_SCHOOL_YEAR_LAST_DAYS,
};
