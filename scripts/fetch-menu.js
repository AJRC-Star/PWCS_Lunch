#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { normalizeMenuResponse, SCHOOL_ID } from '../shared/menu-core.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const API_BASE_URL = 'https://api.mealviewer.com/api/v4/school';

function formatMealViewerDate(date) {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const year = date.getFullYear();
  return `${month}-${day}-${year}`;
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
    const normalizedData = normalizeMenuResponse(rawData);

    const outputPath = path.join(__dirname, '../public/menu-data.json');
    fs.writeFileSync(outputPath, JSON.stringify(normalizedData));

    const stats = fs.statSync(outputPath);
    console.log(`✓ Normalized menu data saved to ${outputPath}`);
    console.log(`  Size: ${stats.size} bytes (~${(stats.size / 1024).toFixed(1)} KB)`);
    console.log(`  Schedules: ${Array.isArray(rawData.menuSchedules) ? rawData.menuSchedules.length : 0} → Days: ${normalizedData.days.length}`);
  } catch (error) {
    console.error('✗ Failed to fetch fresh menu data:', error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

main();
