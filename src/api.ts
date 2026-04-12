import type { MenuData, MenuDay, MenuItem } from './types';

const SCHOOL_ID = 'BENTONMIDDLE';
const API_BASE_URL = 'https://api.mealviewer.com/api/v4/school';
const CACHE_KEY = 'bms_lunch_cache_v1';
const SCHOOL_TIMEZONE = 'America/New_York';

interface CacheEntry {
  data: MenuData;
  fetchedAt: number;
}

// Get today's ISO date in school timezone (America/New_York)
function getTodayISO(): string {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: SCHOOL_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  const parts = formatter.formatToParts(new Date());
  const year = parts.find((p) => p.type === 'year')?.value;
  const month = parts.find((p) => p.type === 'month')?.value;
  const day = parts.find((p) => p.type === 'day')?.value;
  return `${year}-${month}-${day}`;
}

function formatISODate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Get next school day from a given ISO date (skips weekends)
function getNextSchoolDay(fromISO: string): string {
  const dateObj = new Date(`${fromISO}T12:00:00Z`);
  const dayOfWeek = dateObj.getUTCDay();

  // If today is Sunday (0) or Saturday (6), advance to Monday
  if (dayOfWeek === 0) {
    dateObj.setUTCDate(dateObj.getUTCDate() + 1); // Sunday -> Monday
  } else if (dayOfWeek === 6) {
    dateObj.setUTCDate(dateObj.getUTCDate() + 2); // Saturday -> Monday
  }

  return formatISODate(dateObj);
}

function formatMealViewerDate(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const year = date.getFullYear();
  return `${month}-${day}-${year}`;
}

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

function uniqueMenuItems(items: unknown[] | null): string[] {
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

function categorizeMealViewerItem(food: Record<string, unknown>): string {
  const rawType = String(food?.item_Type || '').trim().toLowerCase();
  const rawName = String(food?.item_Name || '').trim().toLowerCase();

  if (
    rawType.includes('protein') ||
    rawType.includes('entree') ||
    rawType.includes('main')
  ) {
    return 'Entree';
  }
  if (rawType.includes('vegetable') || rawType.includes('side')) {
    return 'Sides';
  }
  if (rawType.includes('fruit')) {
    return 'Fruit';
  }
  if (rawType.includes('grain') || rawType.includes('bread')) {
    return 'Grains';
  }
  if (
    rawType.includes('milk') ||
    rawType.includes('beverage') ||
    rawType.includes('drink')
  ) {
    return 'Drink';
  }
  if (
    rawType.includes('condiment') ||
    rawType.includes('sauce') ||
    rawType.includes('topping')
  ) {
    return 'Condiments';
  }
  if (rawType.includes('dessert')) {
    return 'Dessert';
  }

  if (/(juice|milk|water)/.test(rawName)) return 'Drink';
  if (/(apple|orange|pear|peach|berry|berries|mandarin|fruit)/.test(rawName))
    return 'Fruit';
  if (
    /(salad|carrot|cucumber|celery|beans|corn|broccoli|tomato|tots|fries)/.test(
      rawName
    )
  )
    return 'Sides';
  if (/(bread|bagel|toast|rice|pasta|macaroni|grain)/.test(rawName))
    return 'Grains';
  if (
    /(ketchup|ranch|mustard|mayo|sauce|dressing|syrup|packet|cup|dip)/.test(
      rawName
    )
  )
    return 'Condiments';

  return 'Other';
}

function normalizeMealViewerDay(schedule: Record<string, unknown>, todayISO: string): MenuDay | null {
  const dateInfo = schedule?.dateInformation;
  const rawDate = (dateInfo !== null && typeof dateInfo === 'object')
    ? (dateInfo as Record<string, unknown>).dateFull ?? null
    : null;
  const iso = rawDate ? String(rawDate).split('T')[0] : null;
  if (!iso) return null;

  const sectionMap = new Map<string, string[]>();
  const blockNames = ((schedule.menuBlocks || []) as Array<{ blockName?: unknown }>).map(
    (block) => String(block?.blockName || '').trim().toLowerCase()
  );

  const isNoSchoolDay = blockNames.some((name) =>
    /no school|holiday|teacher workday|school closed|student holiday/.test(name)
  );

  const allBlocks = (schedule.menuBlocks || []) as Array<{
    blockName?: unknown;
    cafeteriaLineList?: { data?: Array<{ foodItemList?: { data?: unknown[] } }> };
  }>;

  const nonBreakfastBlocks = allBlocks.filter((block) => {
    const name = String(block?.blockName || '').trim().toLowerCase();
    return !name.startsWith('breakfast');
  });

  const lunchBlocks = nonBreakfastBlocks.filter((block) => {
    const name = String(block?.blockName || '').trim().toLowerCase();
    return name.includes('lunch');
  });

  // Prefer explicit lunch blocks; only fall back if necessary
  const blocks = lunchBlocks.length > 0 ? lunchBlocks : [];
  const hasConfidentData = blocks.length > 0;

  for (const block of blocks) {
    const foods = (
      block?.cafeteriaLineList?.data?.flatMap(
        (line) => (line?.foodItemList?.data || []) as unknown[]
      ) || []
    ) as Array<Record<string, unknown>>;

    for (const food of foods) {
      const itemName = String(food?.item_Name || '').trim();
      if (!itemName) continue;

      const title = categorizeMealViewerItem(food);
      const bucket = sectionMap.get(title) || [];
      bucket.push(itemName);
      sectionMap.set(title, bucket);
    }
  }

  const sections: MenuItem[] = Array.from(sectionMap.entries())
    .map(([title, items]) => ({
      title,
      items: uniqueMenuItems(items),
      wide: title === 'Entree',
    }))
    .filter((section) => section.items.length > 0);

  sections.sort((a, b) => {
    const priorityDiff = sectionPriority(a.title) - sectionPriority(b.title);
    if (priorityDiff !== 0) return priorityDiff;
    return a.title.localeCompare(b.title);
  });

  const isWeekend = [0, 6].includes(new Date(`${iso}T12:00:00`).getDay());

  // Mark as no information if:
  // - No sections found (no lunch blocks with data)
  // - Day is not a school day/weekend and we couldn't find confident lunch data
  const noInfo = !hasConfidentData && !isNoSchoolDay;

  return {
    iso,
    dateObj: new Date(`${iso}T12:00:00`).getTime(),
    today: iso === todayISO,
    weekend: isWeekend,
    no_school: isNoSchoolDay,
    no_information_provided: noInfo || !sections.length,
    sections,
  };
}


function loadCache(): CacheEntry | null {
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    return cached ? JSON.parse(cached) : null;
  } catch {
    return null;
  }
}

function saveCache(data: MenuData): number {
  const fetchedAt = Date.now();
  const entry: CacheEntry = { data, fetchedAt };
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(entry));
  } catch {
    // Storage quota exceeded or other error; silently continue
  }
  return fetchedAt;
}

async function fetchData(): Promise<MenuData> {
  try {
    // Try to fetch pre-normalized menu data (updated daily by GitHub Actions)
    const response = await fetch(import.meta.env.BASE_URL + 'menu-data.json');
    if (!response.ok) {
      throw new Error(`Failed to load menu data: ${response.status}`);
    }
    const data = await response.json();

    // Handle both new normalized format and old format with .raw
    const toProcess = data.days ? data : data.raw;

    // If already normalized, return directly
    if (data.days && Array.isArray(data.days) && data.meta) {
      return {
        days: data.days,
        meta: {
          source: 'fresh',
          lastUpdated: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          isOffline: false,
          isPreview: false,
          schoolName: data.meta.schoolName || SCHOOL_ID,
        },
      };
    }

    // Otherwise process the raw format
    if (!toProcess || typeof toProcess !== 'object') {
      throw new Error('Invalid menu data format');
    }

    let todayISO = getTodayISO();
    todayISO = getNextSchoolDay(todayISO);

    const schedules = Array.isArray((toProcess as Record<string, unknown>).menuSchedules)
      ? ((toProcess as Record<string, unknown>).menuSchedules as unknown[])
      : [];

    const days = (schedules as Array<Record<string, unknown>>)
      .map((schedule) => normalizeMealViewerDay(schedule, todayISO))
      .filter((day): day is MenuDay => day !== null)
      .filter((day) => !day.weekend && !day.no_school && day.iso >= todayISO)
      .sort((a, b) => {
        if (a.today && !b.today) return -1;
        if (!a.today && b.today) return 1;
        return String(a.iso).localeCompare(String(b.iso));
      });

    return {
      days,
      meta: {
        source: 'fresh',
        lastUpdated: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        isOffline: false,
        isPreview: false,
        schoolName: String((toProcess as Record<string, unknown>)?.schoolName || SCHOOL_ID),
      },
    };
  } catch (error) {
    // Fallback to live API if pre-fetched data isn't available
    console.warn('Could not load pre-fetched menu data, falling back to live API', error);
    const start = new Date();
    const end = new Date(start);
    end.setDate(end.getDate() + 21);

    const range = [formatMealViewerDate(start), formatMealViewerDate(end)].join('/');
    const url = `${API_BASE_URL}/${SCHOOL_ID}/${range}`;

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    const raw = await response.json();

    // Process raw API data into normalized format using same logic as static file path
    let todayISO = getTodayISO();
    todayISO = getNextSchoolDay(todayISO);

    const schedules = Array.isArray((raw as Record<string, unknown>).menuSchedules)
      ? ((raw as Record<string, unknown>).menuSchedules as unknown[])
      : [];

    const days = (schedules as Array<Record<string, unknown>>)
      .map((schedule) => normalizeMealViewerDay(schedule, todayISO))
      .filter((day): day is MenuDay => day !== null)
      .filter((day) => !day.weekend && !day.no_school && day.iso >= todayISO)
      .sort((a, b) => {
        if (a.today && !b.today) return -1;
        if (!a.today && b.today) return 1;
        return String(a.iso).localeCompare(String(b.iso));
      });

    return {
      days,
      meta: {
        source: 'fresh',
        lastUpdated: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        isOffline: false,
        isPreview: false,
        schoolName: String((raw as Record<string, unknown>)?.schoolName || SCHOOL_ID),
      },
    };
  }
}

// Returns cached data immediately without network, or empty if no cache
export async function getCachedData(): Promise<MenuData> {
  const cached = loadCache();
  if (cached) {
    return {
      ...cached.data,
      meta: {
        ...cached.data.meta,
        source: 'preview',
        isPreview: true,
      },
    };
  }
  return {
    days: [],
    meta: {
      source: 'preview',
      lastUpdated: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      isOffline: false,
      isPreview: true,
      schoolName: SCHOOL_ID,
    },
  };
}

// Always fetches fresh data from network or static JSON; respects 4-hour cache TTL
export async function getFreshData(): Promise<MenuData> {
  try {
    const data = await fetchData();
    const fetchedAt = saveCache(data);
    return {
      ...data,
      meta: {
        ...data.meta,
        source: 'fresh',
        lastUpdated: new Date(fetchedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
    };
  } catch (e) {
    const cached = loadCache();
    if (cached) {
      return {
        ...cached.data,
        meta: {
          ...cached.data.meta,
          source: 'offline',
          isOffline: true,
        },
      };
    }
    return {
      days: [],
      meta: {
        source: 'offline',
        lastUpdated: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        isOffline: true,
        isPreview: false,
        schoolName: SCHOOL_ID,
      },
      error: 'No internet 📴 and no cache.',
    };
  }
}

// Backwards-compatible entry point: shows cache if available, fetches fresh in background
export async function getData(allowPreview = false): Promise<MenuData> {
  if (allowPreview) {
    // For preview mode: return cache immediately
    return getCachedData();
  }
  // For normal mode: fetch fresh (respects 4-hour TTL in fetchData)
  return getFreshData();
}
