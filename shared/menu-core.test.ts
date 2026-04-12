import { describe, expect, it } from 'vitest';
import {
  categorizeMealViewerItem,
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
});
