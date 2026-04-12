import { normalizeMenuResponse, SCHOOL_ID } from '../shared/menu-core.js';
import type { MenuData } from './types';
const API_BASE_URL = 'https://api.mealviewer.com/api/v4/school';
const CACHE_KEY = 'bms_lunch_cache_v1';

interface CacheEntry {
  data: MenuData;
  fetchedAt: number;
}

function getMenuDataUrl(): string {
  // GitHub Pages fixes cache headers at the platform level, so we version the
  // mutable JSON URL client-side to avoid stale menu data in Safari/iOS.
  const currentHour = new Date().toISOString().slice(0, 13);
  return `${import.meta.env.BASE_URL}menu-data.json?v=${encodeURIComponent(currentHour)}`;
}

function formatMealViewerDate(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const year = date.getFullYear();
  return `${month}-${day}-${year}`;
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
    const response = await fetch(getMenuDataUrl());
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

    const normalized = normalizeMenuResponse(toProcess as Record<string, unknown>);

    return {
      days: normalized.days,
      meta: {
        source: 'fresh',
        lastUpdated: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        isOffline: false,
        isPreview: false,
        schoolName: normalized.meta.schoolName,
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
    const normalized = normalizeMenuResponse(raw as Record<string, unknown>);

    return {
      days: normalized.days,
      meta: {
        source: 'fresh',
        lastUpdated: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        isOffline: false,
        isPreview: false,
        schoolName: normalized.meta.schoolName,
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
