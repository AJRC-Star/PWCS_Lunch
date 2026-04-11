#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SCHOOL_ID = 'BENTONMIDDLE';
const API_BASE_URL = 'https://api.mealviewer.com/api/v4/school';

function formatMealViewerDate(date) {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const year = date.getFullYear();
  return `${month}-${day}-${year}`;
}

function formatISODate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
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
    const data = await fetchData();

    const outputPath = path.join(__dirname, '../public/menu-data.json');
    const outputData = {
      raw: data,
      fetchedAt: Date.now(),
      fetchedDate: new Date().toISOString(),
    };

    fs.writeFileSync(outputPath, JSON.stringify(outputData, null, 2));
    console.log(`✓ Menu data saved to ${outputPath}`);
    console.log(`Fetched data with ${data.menuSchedules?.length || 0} schedules`);
    process.exit(0);
  } catch (error) {
    console.error('✗ Failed to fetch menu data:', error.message);
    process.exit(1);
  }
}

main();
