import { describe, expect, it } from 'vitest';
import {
  categorizeMealViewerItem,
  formatSchoolDate,
  formatMealViewerDate,
  getNextSchoolDay,
  isPlausibleMenuSnapshot,
  MENU_SCHEMA_VERSION,
  normalizeMealViewerDay,
  normalizeMenuResponse,
} from './menu-core.ts';

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeSchedule(
  iso: string,
  blockName: string,
  items: { item_Name: string; item_Type: string }[],
) {
  return {
    dateInformation: { dateFull: `${iso}T00:00:00` },
    menuBlocks: [
      {
        blockName,
        cafeteriaLineList: {
          data: [{ foodItemList: { data: items } }],
        },
      },
    ],
  };
}

const PIZZA_ITEMS = [
  { item_Name: 'Pepperoni Pizza', item_Type: 'Main' },
  { item_Name: 'Cheese Pizza', item_Type: 'Main' },
  { item_Name: 'Garden Salad', item_Type: 'Vegetable' },
];

// ── Existing tests (preserved) ────────────────────────────────────────────────

describe('menu-core', () => {
  it('falls back to non-breakfast blocks when lunch is named differently', () => {
    const result = normalizeMenuResponse(
      {
        schoolName: 'BENTONMIDDLE',
        menuSchedules: [makeSchedule('2026-04-13', 'Main Line', [
          { item_Name: 'Chicken Sandwich', item_Type: 'Main' },
          { item_Name: 'Garden Salad', item_Type: 'Vegetable' },
        ])],
      },
      { todayISO: '2026-04-13' },
    );

    expect(result.days).toHaveLength(1);
    expect(result.days[0].no_information_provided).toBe(false);
    expect(result.days[0].sections.map((s) => s.title)).toContain('Entree');
    expect(result.days[0].sections.flatMap((s) => s.items)).toContain('Chicken Sandwich');
  });

  it('classifies tricky menu items more accurately', () => {
    expect(categorizeMealViewerItem({ item_Name: 'Apple Crisp', item_Type: '' })).toBe('Dessert');
    expect(categorizeMealViewerItem({ item_Name: 'Marinara Dipping Sauce', item_Type: '' })).toBe('Condiments');
    expect(categorizeMealViewerItem({ item_Name: 'Meatballs (Halal)', item_Type: '' })).toBe('Entree');
  });

  it('keeps tricky items in the intended sections when MealViewer raw types are misleading', () => {
    const result = normalizeMenuResponse(
      {
        schoolName: 'BENTONMIDDLE',
        menuSchedules: [
          makeSchedule('2026-05-01', 'Lunch', [
            { item_Name: 'Falafel Nuggets', item_Type: 'Main' },
            { item_Name: 'Marinara Dipping Sauce', item_Type: 'Side' },
            { item_Name: 'Apple Crisp', item_Type: 'Fruit' },
            { item_Name: 'Meatballs (Halal)', item_Type: 'Grain' },
          ]),
        ],
      },
      { todayISO: '2026-05-01' },
    );

    const sections = Object.fromEntries(
      result.days[0].sections.map((section) => [section.title, section.items]),
    );

    expect(sections.Condiments).toContain('Marinara Dipping Sauce');
    expect(sections.Dessert).toContain('Apple Crisp');
    expect(sections.Entree).toContain('Meatballs (Halal)');
    expect(sections.Sides ?? []).not.toContain('Marinara Dipping Sauce');
    expect(sections.Fruit ?? []).not.toContain('Apple Crisp');
    expect(sections.Grains ?? []).not.toContain('Meatballs (Halal)');
  });

  // ── Finding 4: weekend "Today" label ───────────────────────────────────────

  it('marks the matching weekday as Today when todayISO falls on a school day', () => {
    const result = normalizeMenuResponse(
      {
        schoolName: 'TEST',
        menuSchedules: [
          makeSchedule('2026-04-13', 'Lunch', PIZZA_ITEMS), // Monday
          makeSchedule('2026-04-14', 'Lunch', PIZZA_ITEMS), // Tuesday
        ],
      },
      { todayISO: '2026-04-13' }, // Monday
    );

    expect(result.days).toHaveLength(2);
    expect(result.days.find((d) => d.iso === '2026-04-13')?.today).toBe(true);
    expect(result.days.find((d) => d.iso === '2026-04-14')?.today).toBe(false);
  });

  it('does not mark any day as Today when todayISO is a Saturday', () => {
    const result = normalizeMenuResponse(
      {
        schoolName: 'TEST',
        menuSchedules: [
          makeSchedule('2026-04-13', 'Lunch', PIZZA_ITEMS), // Monday
          makeSchedule('2026-04-14', 'Lunch', PIZZA_ITEMS), // Tuesday
        ],
      },
      { todayISO: '2026-04-11' }, // Saturday
    );

    // Monday and Tuesday should appear but neither is "Today"
    expect(result.days.length).toBeGreaterThanOrEqual(2);
    expect(result.days.every((d) => !d.today)).toBe(true);
  });

  it('does not mark any day as Today when todayISO is a Sunday', () => {
    const result = normalizeMenuResponse(
      {
        schoolName: 'TEST',
        menuSchedules: [makeSchedule('2026-04-13', 'Lunch', PIZZA_ITEMS)],
      },
      { todayISO: '2026-04-12' }, // Sunday
    );

    expect(result.days.every((d) => !d.today)).toBe(true);
  });

  // ── Finding 3: no-school handling ─────────────────────────────────────────

  it('includes no-school days in the output with no_school=true and no_information_provided=false', () => {
    const result = normalizeMenuResponse(
      {
        schoolName: 'TEST',
        menuSchedules: [
          makeSchedule('2026-04-13', 'No School - Holiday', []),
        ],
      },
      { todayISO: '2026-04-13' },
    );

    expect(result.days).toHaveLength(1);
    expect(result.days[0].no_school).toBe(true);
    // Must NOT be mislabelled as "No menu yet" — the UI should show "No school"
    expect(result.days[0].no_information_provided).toBe(false);
  });

  it('keeps no-school day alongside regular days in the same week', () => {
    const result = normalizeMenuResponse(
      {
        schoolName: 'TEST',
        menuSchedules: [
          makeSchedule('2026-04-13', 'No School - Holiday', []),
          makeSchedule('2026-04-14', 'Lunch', PIZZA_ITEMS),
        ],
      },
      { todayISO: '2026-04-13' },
    );

    expect(result.days).toHaveLength(2);
    const holiday = result.days.find((d) => d.iso === '2026-04-13');
    const regular = result.days.find((d) => d.iso === '2026-04-14');
    expect(holiday?.no_school).toBe(true);
    expect(holiday?.no_information_provided).toBe(false);
    expect(regular?.no_school).toBe(false);
    expect(regular?.no_information_provided).toBe(false);
  });

  it('sets no_information_provided=true for a regular day with no food items', () => {
    const result = normalizeMenuResponse(
      {
        schoolName: 'TEST',
        menuSchedules: [makeSchedule('2026-04-13', 'Lunch', [])],
      },
      { todayISO: '2026-04-13' },
    );

    expect(result.days).toHaveLength(1);
    expect(result.days[0].no_school).toBe(false);
    expect(result.days[0].no_information_provided).toBe(true);
  });

  // ── Finding 3: normalizeMealViewerDay direct tests ─────────────────────────

  it('normalizeMealViewerDay: no-school day has no_school=true and no_information_provided=false', () => {
    const schedule = {
      dateInformation: { dateFull: '2026-04-13T00:00:00' },
      menuBlocks: [{ blockName: 'Student Holiday', cafeteriaLineList: { data: [] } }],
    };

    const day = normalizeMealViewerDay(schedule, '2026-04-13');
    expect(day).not.toBeNull();
    expect(day!.no_school).toBe(true);
    expect(day!.no_information_provided).toBe(false);
  });

  it('normalizeMealViewerDay: teacher workday is treated as no-school', () => {
    const schedule = {
      dateInformation: { dateFull: '2026-04-13T00:00:00' },
      menuBlocks: [{ blockName: 'Teacher Workday', cafeteriaLineList: { data: [] } }],
    };

    const day = normalizeMealViewerDay(schedule, '2026-04-13');
    expect(day!.no_school).toBe(true);
    expect(day!.no_information_provided).toBe(false);
  });

  // ── Finding 6: timezone date range for API ─────────────────────────────────

  it('filters out weekend days from normalizeMenuResponse output', () => {
    const result = normalizeMenuResponse(
      {
        schoolName: 'TEST',
        menuSchedules: [
          makeSchedule('2026-04-11', 'Lunch', PIZZA_ITEMS), // Saturday
          makeSchedule('2026-04-12', 'Lunch', PIZZA_ITEMS), // Sunday
          makeSchedule('2026-04-13', 'Lunch', PIZZA_ITEMS), // Monday
        ],
      },
      { todayISO: '2026-04-11' }, // Saturday – display start is Monday
    );

    expect(result.days.every((d) => !d.weekend)).toBe(true);
    expect(result.days.map((d) => d.iso)).toContain('2026-04-13');
    expect(result.days.map((d) => d.iso)).not.toContain('2026-04-11');
    expect(result.days.map((d) => d.iso)).not.toContain('2026-04-12');
  });

  it('dateObj is stored as UTC noon for consistent timezone-independent display', () => {
    const result = normalizeMenuResponse(
      {
        schoolName: 'TEST',
        menuSchedules: [makeSchedule('2026-04-13', 'Lunch', PIZZA_ITEMS)],
      },
      { todayISO: '2026-04-13' },
    );

    const day = result.days[0];
    const d = new Date(day.dateObj);
    // Stored at UTC noon: hours and minutes in UTC must be 12:00
    expect(d.getUTCHours()).toBe(12);
    expect(d.getUTCMinutes()).toBe(0);
  });

  it('stores snapshotGeneratedAt instead of a source freshness field', () => {
    const result = normalizeMenuResponse(
      {
        schoolName: 'TEST',
        menuSchedules: [makeSchedule('2026-04-13', 'Lunch', PIZZA_ITEMS)],
      },
      { todayISO: '2026-04-13' },
    );

    expect(result.meta.snapshotGeneratedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(result.meta.schemaVersion).toBe(MENU_SCHEMA_VERSION);
  });

  it('formats visible dates in the school timezone from canonical ISO values', () => {
    expect(formatSchoolDate('2026-04-13', { weekday: 'long' })).toBe('Monday');
    expect(formatSchoolDate('2026-04-13', { month: 'short', day: 'numeric' })).toBe('Apr 13');
  });

  it('rejects implausibly short snapshots', () => {
    const result = normalizeMenuResponse(
      {
        schoolName: 'TEST',
        menuSchedules: [makeSchedule('2026-04-13', 'Lunch', PIZZA_ITEMS)],
      },
      { todayISO: '2026-04-13' },
    );

    expect(isPlausibleMenuSnapshot(result.days, undefined, '2026-04-13')).toBe(false);
  });

  it('rejects sharp regressions versus the previous snapshot', () => {
    const previous = normalizeMenuResponse(
      {
        schoolName: 'TEST',
        menuSchedules: [
          makeSchedule('2026-04-13', 'Lunch', PIZZA_ITEMS),
          makeSchedule('2026-04-14', 'Lunch', PIZZA_ITEMS),
          makeSchedule('2026-04-15', 'Lunch', PIZZA_ITEMS),
          makeSchedule('2026-04-16', 'Lunch', PIZZA_ITEMS),
          makeSchedule('2026-04-17', 'Lunch', PIZZA_ITEMS),
        ],
      },
      { todayISO: '2026-04-13' },
    );
    const next = normalizeMenuResponse(
      {
        schoolName: 'TEST',
        menuSchedules: [
          makeSchedule('2026-04-13', 'Lunch', PIZZA_ITEMS),
          makeSchedule('2026-04-14', 'Lunch', PIZZA_ITEMS),
        ],
      },
      { todayISO: '2026-04-13' },
    );

    expect(isPlausibleMenuSnapshot(next.days, previous.days, '2026-04-13')).toBe(false);
  });

  it('accepts a shorter snapshot when only two school days remain in the visible range', () => {
    const result = normalizeMenuResponse(
      {
        schoolName: 'TEST',
        menuSchedules: [
          makeSchedule('2026-04-16', 'Lunch', PIZZA_ITEMS),
          makeSchedule('2026-04-17', 'Lunch', PIZZA_ITEMS),
        ],
      },
      { todayISO: '2026-04-16' },
    );

    expect(isPlausibleMenuSnapshot(result.days, undefined, '2026-04-16')).toBe(true);
  });

  // ── formatMealViewerDate ───────────────────────────────────────────────────

  it('formatMealViewerDate(0) returns today in MM-DD-YYYY format', () => {
    // We cannot control what getTodayISO() returns in the test environment, but
    // we can verify the output shape and that offsetDays is applied correctly.
    const today = formatMealViewerDate(0);
    const future = formatMealViewerDate(7);

    // Both must match MM-DD-YYYY
    expect(today).toMatch(/^\d{2}-\d{2}-\d{4}$/);
    expect(future).toMatch(/^\d{2}-\d{2}-\d{4}$/);

    // The 7-day offset must advance the date by exactly 7 days
    const parseMMDDYYYY = (s: string) => {
      const [mm, dd, yyyy] = s.split('-').map(Number);
      return new Date(Date.UTC(yyyy, mm - 1, dd));
    };
    const diffDays =
      (parseMMDDYYYY(future).getTime() - parseMMDDYYYY(today).getTime()) /
      (1000 * 60 * 60 * 24);
    expect(diffDays).toBe(7);
  });

  it('getNextSchoolDay clamps Saturday to Monday', () => {
    expect(getNextSchoolDay('2026-04-11')).toBe('2026-04-13');
  });

  it('getNextSchoolDay clamps Sunday to Monday', () => {
    expect(getNextSchoolDay('2026-04-12')).toBe('2026-04-13');
  });

  it('getNextSchoolDay leaves weekdays unchanged', () => {
    expect(getNextSchoolDay('2026-04-13')).toBe('2026-04-13');
  });
});
