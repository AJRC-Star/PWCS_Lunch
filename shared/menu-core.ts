const SCHOOL_ID = 'BENTONMIDDLE';
const SCHOOL_TIMEZONE = 'America/New_York';
const MENU_SCHEMA_VERSION = 2;
const MIN_PLAUSIBLE_DAYS = 3;

// ── Internal types ────────────────────────────────────────────────────────────

interface FoodItem {
  item_Name?: unknown;
  item_Type?: unknown;
}

interface CafeteriaLine {
  foodItemList?: { data?: FoodItem[] };
}

interface MenuBlock {
  blockName?: unknown;
  cafeteriaLineList?: { data?: CafeteriaLine[] };
}

interface MenuSchedule {
  dateInformation?: unknown;
  menuBlocks?: MenuBlock[];
}

// ── Public types ──────────────────────────────────────────────────────────────

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
  no_information_provided: boolean;
  sections: SharedMenuSection[];
}

export interface SharedMenuResponse {
  days: SharedMenuDay[];
  meta: {
    schemaVersion: number;
    snapshotGeneratedAt: string;
    schoolName: string;
  };
}

// ── Date helpers ──────────────────────────────────────────────────────────────

function getFormatter(): Intl.DateTimeFormat {
  return new Intl.DateTimeFormat('en-US', {
    timeZone: SCHOOL_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
}

function formatSchoolDate(
  iso: string,
  options: Intl.DateTimeFormatOptions,
): string {
  return new Intl.DateTimeFormat('en-US', {
    ...options,
    timeZone: SCHOOL_TIMEZONE,
  }).format(parseISOAtUtcNoon(iso));
}

function getTodayISO(): string {
  const parts = getFormatter().formatToParts(new Date());
  const year = parts.find((part) => part.type === 'year')?.value;
  const month = parts.find((part) => part.type === 'month')?.value;
  const day = parts.find((part) => part.type === 'day')?.value;
  return `${year}-${month}-${day}`;
}

function parseISOAtUtcNoon(iso: string): Date {
  return new Date(`${iso}T12:00:00Z`);
}

function formatUTCISODate(date: Date): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getNextSchoolDay(fromISO: string): string {
  const date = parseISOAtUtcNoon(fromISO);
  const dayOfWeek = date.getUTCDay();

  if (dayOfWeek === 0) {
    date.setUTCDate(date.getUTCDate() + 1);
  } else if (dayOfWeek === 6) {
    date.setUTCDate(date.getUTCDate() + 2);
  }

  return formatUTCISODate(date);
}

function normalizeVisibleSharedDays(days: SharedMenuDay[], todayISO = getTodayISO()): SharedMenuDay[] {
  const displayFromISO = getNextSchoolDay(todayISO);
  return days
    .filter((day) => !day.weekend && day.iso >= displayFromISO)
    .map((day) => ({
      ...day,
      today: day.iso === todayISO,
    }));
}

function countWeekdaysBetween(startISO: string, endISO: string): number {
  const start = parseISOAtUtcNoon(startISO);
  const end = parseISOAtUtcNoon(endISO);

  if (start > end) {
    return 0;
  }

  let count = 0;
  const cursor = new Date(start);
  while (cursor <= end) {
    const dayOfWeek = cursor.getUTCDay();
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      count += 1;
    }
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }

  return count;
}

function isPlausibleMenuSnapshot(
  days: SharedMenuDay[],
  previousDays?: SharedMenuDay[],
  todayISO = getTodayISO(),
  minimumDays = MIN_PLAUSIBLE_DAYS,
): boolean {
  const visibleDays = normalizeVisibleSharedDays(days, todayISO);
  const uniqueDays = new Set(visibleDays.map((day) => day.iso));
  if (uniqueDays.size !== visibleDays.length) {
    return false;
  }

  const lastVisibleISO = visibleDays[visibleDays.length - 1]?.iso;
  if (!lastVisibleISO) {
    return false;
  }

  if (
    visibleDays.length < minimumDays &&
    (
      visibleDays.length < Math.max(2, minimumDays - 1) ||
      countWeekdaysBetween(getNextSchoolDay(todayISO), lastVisibleISO) >= minimumDays
    )
  ) {
    return false;
  }

  if (!previousDays) {
    return true;
  }

  const previousVisibleDays = normalizeVisibleSharedDays(previousDays, todayISO);
  const previousLastVisibleISO = previousVisibleDays[previousVisibleDays.length - 1]?.iso;
  if (
    previousVisibleDays.length >= minimumDays &&
    visibleDays.length + 2 < previousVisibleDays.length &&
    previousLastVisibleISO &&
    countWeekdaysBetween(lastVisibleISO, previousLastVisibleISO) >= minimumDays
  ) {
    return false;
  }

  const nextNoInfoCount = visibleDays.filter((day) => day.no_information_provided).length;
  const previousNoInfoCount = previousVisibleDays.filter((day) => day.no_information_provided).length;
  if (nextNoInfoCount > previousNoInfoCount + 2) {
    return false;
  }

  return true;
}

/**
 * Returns a MealViewer-formatted date string (MM-DD-YYYY) for the school's
 * local timezone, optionally offset by a number of calendar days.  This
 * replaces the previous `new Date()` approach which used the host machine's
 * timezone and produced off-by-one-day results for users/runners outside ET.
 */
function formatMealViewerDate(offsetDays = 0): string {
  const baseISO = getTodayISO();
  const date = parseISOAtUtcNoon(baseISO);
  date.setUTCDate(date.getUTCDate() + offsetDays);
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  const year = date.getUTCFullYear();
  return `${month}-${day}-${year}`;
}

// ── Menu categorisation ───────────────────────────────────────────────────────

function sectionPriority(title: string): number {
  const priorities: Record<string, number> = {
    Entree: 0,
    Sides: 1,
    Fruit: 2,
    Grains: 3,
    Drink: 4,
    Condiments: 5,
    Dessert: 6,
    Other: 7,
  };

  return priorities[title] ?? 8;
}

function uniqueMenuItems(items: string[]): string[] {
  const seen = new Set<string>();
  const clean: string[] = [];

  for (const item of items || []) {
    const name = String(item ?? '').trim();
    if (!name) continue;

    const key = name.toLowerCase();
    if (seen.has(key)) continue;

    seen.add(key);
    clean.push(name);
  }

  return clean;
}

function categorizeMealViewerItem(food: FoodItem): string {
  const rawType = String(food?.item_Type || '').trim().toLowerCase();
  const rawName = String(food?.item_Name || '').trim().toLowerCase();

  // High-confidence name overrides win even when MealViewer assigns an overly
  // broad item_Type such as Fruit, Side, or Grain.
  if (/(dessert|cookie|brownie|crisp|cake|pie|pudding|ice cream|shortcake)/.test(rawName)) {
    return 'Dessert';
  }
  if (/(ketchup|ranch|mustard|mayo|sauce|dressing|syrup|packet|cup|dip|gravy|hummus)/.test(rawName)) {
    return 'Condiments';
  }
  if (/(chicken|beef|turkey|pizza|burger|sandwich|quesadilla|wings|lasagna|falafel|meatballs|pupusas|drumstick|sausage|fillet|nuggets|chili)/.test(rawName)) {
    return 'Entree';
  }
  if (/(juice|milk|water)/.test(rawName)) return 'Drink';
  if (/(apple|orange|pear|peach|berry|berries|mandarin|fruit|pineapple|banana|grape|clementine|kiwi|mango)/.test(rawName)) {
    return 'Fruit';
  }

  if (rawType.includes('protein') || rawType.includes('entree') || rawType.includes('main')) {
    return 'Entree';
  }
  if (rawType.includes('dessert')) {
    return 'Dessert';
  }
  if (rawType.includes('milk') || rawType.includes('beverage') || rawType.includes('drink')) {
    return 'Drink';
  }
  if (rawType.includes('fruit')) {
    return 'Fruit';
  }
  if (rawType.includes('condiment') || rawType.includes('sauce') || rawType.includes('topping')) {
    return 'Condiments';
  }
  if (rawType.includes('vegetable') || rawType.includes('side')) {
    return 'Sides';
  }
  if (rawType.includes('grain') || rawType.includes('bread')) {
    return 'Grains';
  }

  if (/(salad|carrot|cucumber|celery|beans|corn|broccoli|tomato|tots|fries|plantains|onions|peppers)/.test(rawName)) {
    return 'Sides';
  }
  if (/(bread|bagel|toast|rice|pasta|macaroni|grain|bun|biscuit|roll|knot|chips|tortilla|pita)/.test(rawName)) {
    return 'Grains';
  }

  return 'Other';
}

function getFoodItemsForBlock(block: MenuBlock): FoodItem[] {
  return (
    block?.cafeteriaLineList?.data?.flatMap(
      (line) => line?.foodItemList?.data || []
    ) || []
  );
}

// ── Day normalisation ─────────────────────────────────────────────────────────

function normalizeMealViewerDay(
  schedule: MenuSchedule,
  todayISO: string,
): SharedMenuDay | null {
  const dateInfo = schedule?.dateInformation;
  const rawDate =
    dateInfo !== null && typeof dateInfo === 'object'
      ? (dateInfo as Record<string, unknown>).dateFull ?? null
      : null;
  const iso = rawDate ? String(rawDate).split('T')[0] : null;

  if (!iso) return null;

  const allBlocks = Array.isArray(schedule.menuBlocks) ? schedule.menuBlocks : [];
  const blockNames = allBlocks.map((block) => String(block?.blockName || '').trim().toLowerCase());
  const isNoSchoolDay = blockNames.some((name) =>
    /no school|holiday|teacher workday|school closed|student holiday/.test(name)
  );

  const nonBreakfastBlocks = allBlocks.filter((block) => {
    const name = String(block?.blockName || '').trim().toLowerCase();
    return !name.startsWith('breakfast');
  });

  const lunchBlocks = nonBreakfastBlocks.filter((block) => {
    const name = String(block?.blockName || '').trim().toLowerCase();
    return name.includes('lunch');
  });

  const blocks = lunchBlocks.length > 0 ? lunchBlocks : nonBreakfastBlocks;
  const hasConfidentData = blocks.some((block) => getFoodItemsForBlock(block).length > 0);
  const sectionMap = new Map<string, string[]>();

  for (const block of blocks) {
    for (const food of getFoodItemsForBlock(block)) {
      const itemName = String(food?.item_Name || '').trim();
      if (!itemName) continue;

      const title = categorizeMealViewerItem(food);
      const bucket = sectionMap.get(title) || [];
      bucket.push(itemName);
      sectionMap.set(title, bucket);
    }
  }

  const sections: SharedMenuSection[] = Array.from(sectionMap.entries())
    .map(([title, rawItems]) => {
      const items = uniqueMenuItems(rawItems);
      return {
        title,
        items,
        wide: title === 'Entree' || title === 'Sides' || title === 'Fruit' || items.length >= 4,
      };
    })
    .filter((section) => section.items.length > 0)
    .sort((a, b) => {
      const priorityDiff = sectionPriority(a.title) - sectionPriority(b.title);
      if (priorityDiff !== 0) return priorityDiff;
      return a.title.localeCompare(b.title);
    });

  const date = parseISOAtUtcNoon(iso);
  const isWeekend = [0, 6].includes(date.getUTCDay());

  // Only set no_information_provided when there genuinely is no data AND it is
  // not a known no-school day.  The previous `|| sections.length === 0` caused
  // every no-school day (which naturally has empty sections) to be mislabelled
  // as "No menu yet" instead of "No school".
  const noInfo = !hasConfidentData && !isNoSchoolDay;

  return {
    iso,
    dateObj: date.getTime(),
    // Use the true calendar today for the "Today" badge.  The caller passes
    // getTodayISO() so that on weekends no day is falsely labelled "Today".
    today: iso === todayISO,
    weekend: isWeekend,
    no_school: isNoSchoolDay,
    no_information_provided: noInfo,
    sections,
  };
}

// ── Response normalisation ────────────────────────────────────────────────────

function normalizeMenuResponse(
  rawData: Record<string, unknown>,
  options: { todayISO?: string } = {},
): SharedMenuResponse {
  // Use the true calendar today for the "Today" badge so that on weekends no
  // future day is incorrectly labelled "Today".  Separately, compute the first
  // day to display (Monday when called on a weekend) so that past/weekend days
  // are still excluded from the list.
  const todayISO = options.todayISO ?? getTodayISO();
  const displayFromISO = getNextSchoolDay(todayISO);

  const schedules = Array.isArray(rawData?.menuSchedules)
    ? (rawData.menuSchedules as MenuSchedule[])
    : [];

  const days = schedules
    .map((schedule) => normalizeMealViewerDay(schedule, todayISO))
    .filter((day): day is SharedMenuDay => day !== null)
    // Keep no_school days in the output so the UI can display "No school"
    // rather than silently dropping those days from the calendar.
    .filter((day) => !day.weekend && day.iso >= displayFromISO)
    .sort((a, b) => {
      if (a.today && !b.today) return -1;
      if (!a.today && b.today) return 1;
      return String(a.iso).localeCompare(String(b.iso));
    });

  return {
    days,
    meta: {
      schemaVersion: MENU_SCHEMA_VERSION,
      snapshotGeneratedAt: new Date().toISOString(),
      schoolName: (rawData?.schoolName as string) || SCHOOL_ID,
    },
  };
}

export {
  isPlausibleMenuSnapshot,
  MENU_SCHEMA_VERSION,
  SCHOOL_ID,
  SCHOOL_TIMEZONE,
  categorizeMealViewerItem,
  formatSchoolDate,
  formatMealViewerDate,
  getNextSchoolDay,
  getTodayISO,
  normalizeMealViewerDay,
  normalizeMenuResponse,
};
