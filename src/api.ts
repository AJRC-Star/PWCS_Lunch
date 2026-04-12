import { normalizeMenuResponse, SCHOOL_ID, formatMealViewerDate } from '../shared/menu-core.js';
import type { MenuData } from './types';

const API_BASE_URL = 'https://api.mealviewer.com/api/v4/school';
const CACHE_KEY = 'bms_lunch_cache_v1';
const CACHE_TTL_MS = 4 * 60 * 60 * 1000; // 4 hours

interface CacheEntry {
  data: MenuData;
  fetchedAt: number;
}

function getMenuDataUrl(cacheBustKey?: string): string {
  // GitHub Pages fixes cache headers at the platform level, so we version the
  // mutable JSON URL client-side to avoid stale menu data in Safari/iOS.
  const version = cacheBustKey ?? new Date().toISOString().slice(0, 13);
  return `${import.meta.env.BASE_URL}menu-data.json?v=${encodeURIComponent(version)}`;
}

function loadCache(): CacheEntry | null {
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    return cached ? (JSON.parse(cached) as CacheEntry) : null;
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

export function clearCachedData(): void {
  try {
    localStorage.removeItem(CACHE_KEY);
  } catch {
    // Ignore storage access issues and keep going with a fresh network attempt.
  }
}

async function fetchData(signal?: AbortSignal, cacheBustKey?: string): Promise<MenuData> {
  try {
    // Try to fetch pre-normalized menu data (updated weekdays by GitHub Actions)
    const response = await fetch(getMenuDataUrl(cacheBustKey), { signal });
    if (!response.ok) {
      throw new Error(`Failed to load menu data: ${response.status}`);
    }
    const data = await response.json() as Record<string, unknown>;

    // Handle both new normalized format and old format with .raw
    const toProcess = (data.days ? data : (data as Record<string, unknown>).raw) as Record<string, unknown>;

    // If already normalized, return directly, preserving the source timestamp
    if (data.days && Array.isArray(data.days) && data.meta) {
      const sourceMeta = data.meta as Record<string, unknown>;
      return {
        days: data.days as MenuData['days'],
        meta: {
          source: 'fresh',
          lastUpdated: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          sourceUpdatedAt: typeof sourceMeta.lastUpdated === 'string' ? sourceMeta.lastUpdated : undefined,
          isOffline: false,
          isPreview: false,
          schoolName: (typeof sourceMeta.schoolName === 'string' ? sourceMeta.schoolName : null) ?? SCHOOL_ID,
        },
      };
    }

    // Otherwise process the raw format
    if (!toProcess || typeof toProcess !== 'object') {
      throw new Error('Invalid menu data format');
    }

    const normalized = normalizeMenuResponse(toProcess);

    return {
      days: normalized.days,
      meta: {
        source: 'fresh',
        lastUpdated: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        sourceUpdatedAt: normalized.meta.lastUpdated,
        isOffline: false,
        isPreview: false,
        schoolName: normalized.meta.schoolName,
      },
    };
  } catch (error) {
    if ((error as { name?: string }).name === 'AbortError') throw error;

    // Fallback to live API if pre-fetched data isn't available.
    // Use school-timezone dates to avoid off-by-one-day errors for users or
    // CI runners whose host clock is in a different timezone.
    console.warn('Could not load pre-fetched menu data, falling back to live API', error);
    const startStr = formatMealViewerDate(0);
    const endStr = formatMealViewerDate(21);
    const range = [startStr, endStr].join('/');
    const url = `${API_BASE_URL}/${SCHOOL_ID}/${range}`;

    const response = await fetch(url, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      signal,
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    const raw = await response.json() as Record<string, unknown>;
    const normalized = normalizeMenuResponse(raw);

    return {
      days: normalized.days,
      meta: {
        source: 'fresh',
        lastUpdated: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        sourceUpdatedAt: normalized.meta.lastUpdated,
        isOffline: false,
        isPreview: false,
        schoolName: normalized.meta.schoolName,
      },
    };
  }
}

// Returns cached data immediately without network, or empty if no cache.
// Annotates isStale so the UI can surface a warning when the TTL has elapsed.
export async function getCachedData(): Promise<MenuData> {
  const cached = loadCache();
  if (cached) {
    const isStale = Date.now() - cached.fetchedAt > CACHE_TTL_MS;
    return {
      ...cached.data,
      meta: {
        ...cached.data.meta,
        source: 'preview',
        isPreview: true,
        clientFetchedAt: cached.fetchedAt,
        isStale,
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

// Fetches fresh data from the network or static JSON and saves it to cache.
export async function getFreshData(options?: {
  cacheBustKey?: string;
  resetCache?: boolean;
  signal?: AbortSignal;
}): Promise<MenuData> {
  try {
    if (options?.resetCache) {
      clearCachedData();
    }

    const data = await fetchData(options?.signal, options?.cacheBustKey);
    const fetchedAt = saveCache(data);
    return {
      ...data,
      meta: {
        ...data.meta,
        source: 'fresh',
        lastUpdated: new Date(fetchedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        clientFetchedAt: fetchedAt,
        isStale: false,
      },
    };
  } catch (e) {
    if ((e as { name?: string }).name === 'AbortError') throw e;

    const cached = loadCache();
    if (cached) {
      return {
        ...cached.data,
        meta: {
          ...cached.data.meta,
          source: 'offline',
          isOffline: true,
          clientFetchedAt: cached.fetchedAt,
          isStale: Date.now() - cached.fetchedAt > CACHE_TTL_MS,
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
    return getCachedData();
  }
  return getFreshData();
}
