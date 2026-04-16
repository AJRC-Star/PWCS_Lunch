#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  formatMealViewerDate,
  normalizeMenuResponse,
  SCHOOL_ID,
  type SharedMenuResponse,
} from '../shared/menu-core.ts';
import { getExpectedNextRefreshAt, validateMenuArtifact } from '../shared/menu-contract.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const API_BASE_URL = 'https://api.mealviewer.com/api/v4/school';
const MAX_FETCH_ATTEMPTS = 3;
const FETCH_TIMEOUT_MS = 30_000; // 30 s per attempt; prevents a hung connection blocking the runner

function loadPreviousSnapshot(outputPath: string): SharedMenuResponse | null {
  try {
    const raw = fs.readFileSync(outputPath, 'utf8');
    return JSON.parse(raw) as SharedMenuResponse;
  } catch {
    return null;
  }
}

async function fetchData(): Promise<Record<string, unknown>> {
  // Use school-timezone dates so the fetch range is correct regardless of
  // where the GitHub Actions runner is located.
  const startStr = formatMealViewerDate(0);
  const endStr = formatMealViewerDate(21);
  const range = [startStr, endStr].join('/');
  const url = `${API_BASE_URL}/${SCHOOL_ID}/${range}`;

  console.log(`Fetching menu data from: ${url}`);

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    return await (response.json() as Promise<Record<string, unknown>>);
  } finally {
    clearTimeout(timeoutId);
  }
}

async function fetchWithRetry(): Promise<Record<string, unknown>> {
  for (let attempt = 1; attempt <= MAX_FETCH_ATTEMPTS; attempt += 1) {
    try {
      return await fetchData();
    } catch (error) {
      if (attempt === MAX_FETCH_ATTEMPTS) {
        throw error;
      }

      const delayMs = 1000 * 2 ** (attempt - 1);
      console.warn(
        `Attempt ${attempt} failed (${error instanceof Error ? error.message : error}). Retrying in ${delayMs}ms...`,
      );
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }

  throw new Error('Failed to fetch menu data after retries');
}

async function main(): Promise<void> {
  try {
    console.log('Starting menu data fetch...');
    const rawData = await fetchWithRetry();
    const snapshotGeneratedAt = new Date().toISOString();
    const normalizedData = normalizeMenuResponse(rawData, {
      snapshotGeneratedAt,
      expectedNextRefreshAt: getExpectedNextRefreshAt(snapshotGeneratedAt),
    });
    const outputPath = path.join(__dirname, '../public/menu-data.json');
    const previousSnapshot = loadPreviousSnapshot(outputPath);

    if (normalizedData.days.length === 0) {
      console.warn('⚠ Normalisation produced 0 days — skipping file write to preserve previous data.');
      process.exit(1);
    }

    // validateMenuArtifact runs isPlausibleMenuSnapshot internally; no need for
    // a separate pre-flight call.
    validateMenuArtifact(normalizedData, previousSnapshot?.days);

    if (previousSnapshot !== null) {
      const instructionalDays = normalizedData.days.filter((d) => !d.weekend && !d.no_school);
      const noInfoCount = instructionalDays.filter((d) => d.no_information_provided).length;
      const noInfoRate = instructionalDays.length > 0 ? noInfoCount / instructionalDays.length : 0;
      const prevInstructionalDays = previousSnapshot.days.filter((d) => !d.weekend && !d.no_school);
      const prevNoInfoCount = prevInstructionalDays.filter((d) => d.no_information_provided).length;
      const prevNoInfoRate = prevInstructionalDays.length > 0 ? prevNoInfoCount / prevInstructionalDays.length : 0;
      if (noInfoRate > 0.5 && noInfoRate - prevNoInfoRate > 0.4) {
        console.warn(
          `⚠ High no-information rate: ${noInfoCount}/${instructionalDays.length} school days` +
          ` (${(noInfoRate * 100).toFixed(0)}%) have no menu data,` +
          ` up from ${(prevNoInfoRate * 100).toFixed(0)}% in the previous snapshot.` +
          ' Skipping file write to preserve previous data.',
        );
        process.exit(1);
      }
    }

    fs.writeFileSync(outputPath, JSON.stringify(normalizedData));

    const stats = fs.statSync(outputPath);
    console.log(`✓ Normalized menu data saved to ${outputPath}`);
    console.log(`  Size: ${stats.size} bytes (~${(stats.size / 1024).toFixed(1)} KB)`);
    console.log(`  Schedules: ${Array.isArray(rawData.menuSchedules) ? (rawData.menuSchedules as unknown[]).length : 0} → Days: ${normalizedData.days.length}`);
  } catch (error) {
    console.error('✗ Failed to fetch fresh menu data:', error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

main();
