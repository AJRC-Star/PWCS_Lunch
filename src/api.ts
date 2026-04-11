import type { MenuData, MenuDay, MenuItem } from './types';

const SCHOOL_ID = 'BENTONMIDDLE';
const API_BASE_URL = 'https://api.mealviewer.com/api/v4/school';
const CACHE_KEY = 'bms_lunch_cache_v1';
const CACHE_FRESHNESS_MS = 4 * 60 * 60 * 1000; // 4 hours

interface CacheEntry {
  raw: unknown;
  fetchedAt: number;
}

function formatISODate(date: Date): string {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Chicago',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);

  const p: Record<string, string> = {};
  for (const { type, value } of parts) {
    p[type] = value;
  }
  return `${p.year}-${p.month}-${p.day}`;
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
  const rawDate = (schedule?.dateInformation as Record<string, unknown>)?.dateFull ?? null;
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

  const blocks =
    lunchBlocks.length > 0
      ? lunchBlocks
      : nonBreakfastBlocks.length > 0
        ? nonBreakfastBlocks
        : allBlocks;

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

  if (!sections.length) {
    return {
      iso,
      dateObj: new Date(`${iso}T12:00:00`).getTime(),
      today: iso === todayISO,
      weekend: isWeekend,
      no_school: isNoSchoolDay,
      no_information_provided: !isNoSchoolDay,
      sections: [],
    };
  }

  return {
    iso,
    dateObj: new Date(`${iso}T12:00:00`).getTime(),
    today: iso === todayISO,
    weekend: isWeekend,
    no_school: isNoSchoolDay,
    sections,
  };
}

function processData(
  raw: unknown,
  { source, fetchedAt }: { source: 'fresh' | 'cache' | 'offline' | 'preview'; fetchedAt: number }
): MenuData {
  if (!raw || typeof raw !== 'object') {
    return {
      days: [],
      meta: {
        source,
        lastUpdated: new Date(fetchedAt).toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
        }),
        isOffline: source === 'offline',
        isPreview: source === 'preview',
        schoolName: SCHOOL_ID,
      },
      error: 'Invalid Data',
    };
  }

  const todayISO = formatISODate(new Date());
  const schedules = Array.isArray((raw as Record<string, unknown>).menuSchedules)
    ? ((raw as Record<string, unknown>).menuSchedules as unknown[])
    : [];

  const days = (schedules as Array<Record<string, unknown>>)
    .map((schedule) => normalizeMealViewerDay(schedule, todayISO))
    .filter(Boolean)
    .filter((day) => day && !day.weekend && !day.no_school && day.iso >= todayISO)
    .sort((a, b) => {
      if (a.today && !b.today) return -1;
      if (!a.today && b.today) return 1;
      return String(a.iso).localeCompare(String(b.iso));
    }) as MenuDay[];

  return {
    days,
    meta: {
      source,
      lastUpdated: new Date(fetchedAt).toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      }),
      isOffline: source === 'offline',
      isPreview: source === 'preview',
      schoolName: (raw as Record<string, unknown>)?.schoolName || SCHOOL_ID,
    },
  };
}

function isCacheFresh(fetchedAt: number): boolean {
  if (!Number.isFinite(fetchedAt)) return false;
  const elapsed = Date.now() - fetchedAt;
  if (elapsed >= CACHE_FRESHNESS_MS) return false;

  const cachedDate = new Date(fetchedAt).toDateString();
  const todayDate = new Date().toDateString();
  return cachedDate === todayDate;
}

function loadCache(): CacheEntry | null {
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    return cached ? JSON.parse(cached) : null;
  } catch {
    return null;
  }
}

function saveCache(raw: unknown): number {
  const fetchedAt = Date.now();
  const data: CacheEntry = { raw, fetchedAt };
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(data));
  } catch {
    // Storage quota exceeded or other error
  }
  return fetchedAt;
}

async function fetchData(): Promise<unknown> {
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

  return response.json();
}

export async function getData(allowPreview = false): Promise<MenuData> {
  if (allowPreview) {
    const cached = loadCache();
    if (cached) {
      const processedData = processData(cached.raw, {
        source: 'preview',
        fetchedAt: cached.fetchedAt,
      });
      return processedData;
    }
  } else {
    const cached = loadCache();
    if (cached && isCacheFresh(cached.fetchedAt)) {
      const processedData = processData(cached.raw, {
        source: 'cache',
        fetchedAt: cached.fetchedAt,
      });
      return processedData;
    }
  }

  try {
    const raw = await fetchData();
    const fetchedAt = saveCache(raw);
    const processedData = processData(raw, { source: 'fresh', fetchedAt });
    return processedData;
  } catch (e) {
    const cached = loadCache();
    if (cached) {
      const processedData = processData(cached.raw, {
        source: 'offline',
        fetchedAt: cached.fetchedAt,
      });
      return processedData;
    }

    return {
      days: [],
      meta: {
        source: 'offline',
        lastUpdated: new Date().toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
        }),
        isOffline: true,
        isPreview: false,
        schoolName: SCHOOL_ID,
      },
      error: 'No internet 📴 and no cache.',
    };
  }
}
