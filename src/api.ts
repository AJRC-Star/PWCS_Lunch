import {
  formatMealViewerDate,
  getNextSchoolDay,
  getTodayISO,
  isPlausibleMenuSnapshot,
  MENU_SCHEMA_VERSION,
  normalizeMenuResponse,
  SCHOOL_ID,
} from '../shared/menu-core.js';
import type { MenuData } from './types';

const API_BASE_URL = 'https://api.mealviewer.com/api/v4/school';
const CACHE_KEY = `bms_lunch_cache_v${MENU_SCHEMA_VERSION}`;
const CACHE_TTL_MS = 4 * 60 * 60 * 1000; // 4 hours
const SNAPSHOT_STALE_AFTER_MS = 8 * 24 * 60 * 60 * 1000; // weekly schedule + safety buffer

interface CacheEntry {
  version: number;
  data: MenuData;
  fetchedAt: number;
}

function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === 'AbortError';
}

function getMenuDataUrl(cacheBustKey?: string): string {
  // GitHub Pages fixes cache headers at the platform level, so we version the
  // mutable JSON URL client-side to avoid stale menu data in Safari/iOS.
  const version = cacheBustKey ?? new Date().toISOString().slice(0, 13);
  return `${import.meta.env.BASE_URL}menu-data.json?v=${encodeURIComponent(version)}`;
}

function normalizeVisibleDays(days: MenuData['days'], todayISO = getTodayISO()): MenuData['days'] {
  const displayFromISO = getNextSchoolDay(todayISO);
  return days
    .filter((day) => !day.weekend && day.iso >= displayFromISO)
    .map((day) => ({
      ...day,
      today: day.iso === todayISO,
    }));
}

function isSnapshotStale(snapshotGeneratedAt?: string, fallbackFetchedAt?: number): boolean {
  if (snapshotGeneratedAt) {
    const generatedAt = Date.parse(snapshotGeneratedAt);
    if (Number.isFinite(generatedAt)) {
      return Date.now() - generatedAt > SNAPSHOT_STALE_AFTER_MS;
    }
  }

  if (typeof fallbackFetchedAt === 'number') {
    return Date.now() - fallbackFetchedAt > CACHE_TTL_MS;
  }

  return false;
}

function finalizeMenuData(
  data: MenuData,
  overrides?: Partial<MenuData['meta']>,
): MenuData {
  const visibleDays = normalizeVisibleDays(data.days);
  const snapshotGeneratedAt = overrides?.snapshotGeneratedAt ?? data.meta.snapshotGeneratedAt;
  const clientFetchedAt = overrides?.clientFetchedAt ?? data.meta.clientFetchedAt;
  const isStale = overrides?.isStale ?? isSnapshotStale(snapshotGeneratedAt, clientFetchedAt);

  return {
    ...data,
    days: visibleDays,
    meta: {
      ...data.meta,
      ...overrides,
      schemaVersion: MENU_SCHEMA_VERSION,
      snapshotGeneratedAt,
      clientFetchedAt,
      isStale,
    },
  };
}

function loadCache(): CacheEntry | null {
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    if (!cached) return null;

    const parsed = JSON.parse(cached) as Partial<CacheEntry>;
    if (
      !parsed ||
      typeof parsed !== 'object' ||
      parsed.version !== MENU_SCHEMA_VERSION ||
      typeof parsed.fetchedAt !== 'number' ||
      !parsed.data
    ) {
      return null;
    }

    return parsed as CacheEntry;
  } catch {
    return null;
  }
}

function saveCache(data: MenuData): number {
  const fetchedAt = Date.now();
  const entry: CacheEntry = {
    version: MENU_SCHEMA_VERSION,
    data: finalizeMenuData(data, { clientFetchedAt: fetchedAt }),
    fetchedAt,
  };
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(entry));
  } catch {
    // Storage quota exceeded or other error; silently continue
  }
  return fetchedAt;
}

async function fetchData(signal?: AbortSignal, cacheBustKey?: string): Promise<MenuData> {
  try {
    // Try to fetch pre-normalized menu data (updated on school days by GitHub Actions)
    const response = await fetch(getMenuDataUrl(cacheBustKey), { signal });
    if (!response.ok) {
      throw new Error(`Failed to load menu data: ${response.status}`);
    }
    const data = await response.json() as Record<string, unknown>;

    // If already normalized, return directly, preserving the snapshot timestamp.
    if (data.days && Array.isArray(data.days) && data.meta) {
      const sourceMeta = data.meta as Record<string, unknown>;
      if (
        typeof sourceMeta.schemaVersion === 'number' &&
        sourceMeta.schemaVersion !== MENU_SCHEMA_VERSION
      ) {
        throw new Error(`Unsupported menu schema version: ${sourceMeta.schemaVersion}`);
      }
      return finalizeMenuData({
        days: (data.days as MenuData['days']).map((day) => ({
          ...day,
        })),
        meta: {
          schemaVersion:
            typeof sourceMeta.schemaVersion === 'number' ? sourceMeta.schemaVersion : undefined,
          source: 'fresh',
          lastUpdated: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          snapshotGeneratedAt:
            typeof sourceMeta.snapshotGeneratedAt === 'string'
              ? sourceMeta.snapshotGeneratedAt
              : typeof sourceMeta.lastUpdated === 'string'
                ? sourceMeta.lastUpdated
                : undefined,
          isOffline: false,
          isPreview: false,
          schoolName: (typeof sourceMeta.schoolName === 'string' ? sourceMeta.schoolName : null) ?? SCHOOL_ID,
        },
      });
    }

    // Handle old format with a .raw wrapper, then normalize.
    const toProcess = (data.raw ?? data) as Record<string, unknown>;
    if (!toProcess || typeof toProcess !== 'object') {
      throw new Error('Invalid menu data format');
    }

    const normalized = normalizeMenuResponse(toProcess);

    return finalizeMenuData({
      days: normalized.days,
      meta: {
        schemaVersion: normalized.meta.schemaVersion,
        source: 'fresh',
        lastUpdated: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        snapshotGeneratedAt: normalized.meta.snapshotGeneratedAt,
        isOffline: false,
        isPreview: false,
        schoolName: normalized.meta.schoolName,
      },
    });
  } catch (error) {
    if (isAbortError(error)) throw error;

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

    return finalizeMenuData({
      days: normalized.days,
      meta: {
        schemaVersion: normalized.meta.schemaVersion,
        source: 'fresh',
        lastUpdated: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        snapshotGeneratedAt: normalized.meta.snapshotGeneratedAt,
        isOffline: false,
        isPreview: false,
        schoolName: normalized.meta.schoolName,
      },
    });
  }
}

// Returns cached data immediately without network, or empty if no cache.
// Annotates isStale so the UI can surface a warning when the TTL has elapsed.
export async function getCachedData(): Promise<MenuData> {
  const cached = loadCache();
  if (cached) {
    return finalizeMenuData(cached.data, {
      source: 'preview',
      isPreview: true,
      clientFetchedAt: cached.fetchedAt,
    });
  }
  return {
    days: [],
    meta: {
      schemaVersion: MENU_SCHEMA_VERSION,
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
  signal?: AbortSignal;
}): Promise<MenuData> {
  const cached = loadCache();
  try {
    const data = await fetchData(options?.signal, options?.cacheBustKey);
    if (!isPlausibleMenuSnapshot(data.days, cached?.data.days, getTodayISO(), 1)) {
      if (cached) {
        return {
          ...finalizeMenuData(cached.data, {
            source: 'preview',
            isPreview: true,
            clientFetchedAt: cached.fetchedAt,
            isStale: true,
          }),
          error: 'Latest menu snapshot looked incomplete. Showing the last known good menu.',
        };
      }
      throw new Error('Fetched menu snapshot was incomplete');
    }

    const fetchedAt = saveCache(data);
    return finalizeMenuData(data, {
      source: 'fresh',
      lastUpdated: new Date(fetchedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      clientFetchedAt: fetchedAt,
    });
  } catch (e) {
    if (isAbortError(e)) throw e;

    if (cached) {
      return finalizeMenuData(cached.data, {
        source: 'offline',
        isOffline: true,
        isPreview: false,
        clientFetchedAt: cached.fetchedAt,
      });
    }
    return {
      days: [],
      meta: {
        schemaVersion: MENU_SCHEMA_VERSION,
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
