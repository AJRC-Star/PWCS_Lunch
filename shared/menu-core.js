const SCHOOL_ID = 'BENTONMIDDLE';
const SCHOOL_TIMEZONE = 'America/New_York';

function getFormatter() {
  return new Intl.DateTimeFormat('en-US', {
    timeZone: SCHOOL_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
}

function getTodayISO() {
  const parts = getFormatter().formatToParts(new Date());
  const year = parts.find((part) => part.type === 'year')?.value;
  const month = parts.find((part) => part.type === 'month')?.value;
  const day = parts.find((part) => part.type === 'day')?.value;
  return `${year}-${month}-${day}`;
}

function parseISOAtUtcNoon(iso) {
  return new Date(`${iso}T12:00:00Z`);
}

function formatUTCISODate(date) {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getNextSchoolDay(fromISO) {
  const date = parseISOAtUtcNoon(fromISO);
  const dayOfWeek = date.getUTCDay();

  if (dayOfWeek === 0) {
    date.setUTCDate(date.getUTCDate() + 1);
  } else if (dayOfWeek === 6) {
    date.setUTCDate(date.getUTCDate() + 2);
  }

  return formatUTCISODate(date);
}

function sectionPriority(title) {
  const priorities = {
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

function uniqueMenuItems(items) {
  const seen = new Set();
  const clean = [];

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

function categorizeMealViewerItem(food) {
  const rawType = String(food?.item_Type || '').trim().toLowerCase();
  const rawName = String(food?.item_Name || '').trim().toLowerCase();

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

  if (/(dessert|cookie|brownie|crisp|cake|pie|pudding|ice cream)/.test(rawName)) return 'Dessert';
  if (/(juice|milk|water)/.test(rawName)) return 'Drink';
  if (/(apple|orange|pear|peach|berry|berries|mandarin|fruit)/.test(rawName)) return 'Fruit';
  if (/(ketchup|ranch|mustard|mayo|sauce|dressing|syrup|packet|cup|dip|gravy)/.test(rawName)) {
    return 'Condiments';
  }
  if (/(salad|carrot|cucumber|celery|beans|corn|broccoli|tomato|tots|fries|plantains|onions|peppers)/.test(rawName)) {
    return 'Sides';
  }
  if (/(bread|bagel|toast|rice|pasta|macaroni|grain|bun|biscuit|roll|knot|chips|tortilla|pita)/.test(rawName)) {
    return 'Grains';
  }
  if (/(chicken|beef|turkey|pizza|burger|sandwich|quesadilla|wings|lasagna|falafel|meatballs|pupusas|drumstick|sausage)/.test(rawName)) {
    return 'Entree';
  }

  return 'Other';
}

function getFoodItemsForBlock(block) {
  return (
    block?.cafeteriaLineList?.data?.flatMap(
      (line) => line?.foodItemList?.data || []
    ) || []
  );
}

function normalizeMealViewerDay(schedule, todayISO) {
  const dateInfo = schedule?.dateInformation;
  const rawDate =
    dateInfo !== null && typeof dateInfo === 'object'
      ? dateInfo.dateFull ?? null
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
  const sectionMap = new Map();

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

  const sections = Array.from(sectionMap.entries())
    .map(([title, items]) => ({
      title,
      items: uniqueMenuItems(items),
      wide: title === 'Entree',
    }))
    .filter((section) => section.items.length > 0)
    .sort((a, b) => {
      const priorityDiff = sectionPriority(a.title) - sectionPriority(b.title);
      if (priorityDiff !== 0) return priorityDiff;
      return a.title.localeCompare(b.title);
    });

  const date = parseISOAtUtcNoon(iso);
  const isWeekend = [0, 6].includes(date.getUTCDay());
  const noInfo = !hasConfidentData && !isNoSchoolDay;

  return {
    iso,
    dateObj: date.getTime(),
    today: iso === todayISO,
    weekend: isWeekend,
    no_school: isNoSchoolDay,
    no_information_provided: noInfo || sections.length === 0,
    sections,
  };
}

function normalizeMenuResponse(rawData, options = {}) {
  const todayISO = options.todayISO || getNextSchoolDay(getTodayISO());
  const schedules = Array.isArray(rawData?.menuSchedules) ? rawData.menuSchedules : [];

  const days = schedules
    .map((schedule) => normalizeMealViewerDay(schedule, todayISO))
    .filter(Boolean)
    .filter((day) => !day.weekend && !day.no_school && day.iso >= todayISO)
    .sort((a, b) => {
      if (a.today && !b.today) return -1;
      if (!a.today && b.today) return 1;
      return String(a.iso).localeCompare(String(b.iso));
    });

  return {
    days,
    meta: {
      lastUpdated: new Date().toISOString(),
      schoolName: rawData?.schoolName || SCHOOL_ID,
    },
  };
}

export {
  SCHOOL_ID,
  SCHOOL_TIMEZONE,
  categorizeMealViewerItem,
  getNextSchoolDay,
  getTodayISO,
  normalizeMealViewerDay,
  normalizeMenuResponse,
};
