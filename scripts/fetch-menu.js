#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SCHOOL_ID = 'BENTONMIDDLE';
const API_BASE_URL = 'https://api.mealviewer.com/api/v4/school';
const SCHOOL_TIMEZONE = 'America/New_York';

function formatMealViewerDate(date) {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const year = date.getFullYear();
  return `${month}-${day}-${year}`;
}

// Get today's ISO date in school timezone
function getTodayISO() {
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

function formatISODate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
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

function categorizeMealViewerItem(food) {
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

function getNextSchoolDay(todayISO) {
  const dateObj = new Date(`${todayISO}T12:00:00`);
  const dayOfWeek = dateObj.getDay();

  if (dayOfWeek === 0) {
    dateObj.setDate(dateObj.getDate() + 1);
  } else if (dayOfWeek === 6) {
    dateObj.setDate(dateObj.getDate() + 2);
  }

  return formatISODate(dateObj);
}

function normalizeMealViewerDay(schedule, todayISO) {
  const dateInfo = schedule?.dateInformation;
  const rawDate = (dateInfo !== null && typeof dateInfo === 'object')
    ? (dateInfo).dateFull ?? null
    : null;
  const iso = rawDate ? String(rawDate).split('T')[0] : null;
  if (!iso) return null;

  const sectionMap = new Map();
  const blockNames = ((schedule.menuBlocks || []) || []).map(
    (block) => String(block?.blockName || '').trim().toLowerCase()
  );

  const isNoSchoolDay = blockNames.some((name) =>
    /no school|holiday|teacher workday|school closed|student holiday/.test(name)
  );

  const allBlocks = (schedule.menuBlocks || []) || [];

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
        (line) => (line?.foodItemList?.data || [])
      ) || []
    );

    for (const food of foods) {
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
    .filter((section) => section.items.length > 0);

  sections.sort((a, b) => {
    const priorityDiff = sectionPriority(a.title) - sectionPriority(b.title);
    if (priorityDiff !== 0) return priorityDiff;
    return a.title.localeCompare(b.title);
  });

  const isWeekend = [0, 6].includes(new Date(`${iso}T12:00:00`).getDay());

  // Mark as no information if we don't have confident lunch data
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

async function fetchData() {
  const start = new Date();
  const end = new Date(start);
  end.setDate(end.getDate() + 21);

  const range = [formatMealViewerDate(start), formatMealViewerDate(end)].join('/');
  const url = `${API_BASE_URL}/${SCHOOL_ID}/${range}`;

  console.log(`Fetching menu data from: ${url}`);

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

async function main() {
  try {
    console.log('Starting menu data fetch...');
    const rawData = await fetchData();

    // Normalize the data into app DTO using school timezone
    let todayISO = getTodayISO();
    todayISO = getNextSchoolDay(todayISO);

    const schedules = Array.isArray(rawData.menuSchedules) ? rawData.menuSchedules : [];
    const days = schedules
      .map((schedule) => normalizeMealViewerDay(schedule, todayISO))
      .filter((day) => day !== null)
      .filter((day) => !day.weekend && !day.no_school && day.iso >= todayISO)
      .sort((a, b) => {
        if (a.today && !b.today) return -1;
        if (!a.today && b.today) return 1;
        return String(a.iso).localeCompare(String(b.iso));
      });

    const normalizedData = {
      days,
      meta: {
        lastUpdated: new Date().toISOString(),
        schoolName: rawData.schoolName || SCHOOL_ID,
      },
    };

    const outputPath = path.join(__dirname, '../public/menu-data.json');
    fs.writeFileSync(outputPath, JSON.stringify(normalizedData));

    const stats = fs.statSync(outputPath);
    console.log(`✓ Normalized menu data saved to ${outputPath}`);
    console.log(`  Size: ${stats.size} bytes (~${(stats.size / 1024).toFixed(1)} KB)`);
    console.log(`  Schedules: ${schedules.length} → Days: ${days.length}`);
    process.exit(0);
  } catch (error) {
    console.error('✗ Failed to fetch menu data:', error.message);
    process.exit(1);
  }
}

main();
