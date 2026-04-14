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
const INVALID_SNAPSHOT_MESSAGE = 'Menu snapshot is unavailable right now. Showing the last known good menu.';
const INVALID_NO_CACHE_MESSAGE = 'Menu snapshot is invalid right now. Please try again later.';
const OFFLINE_NO_CACHE_MESSAGE = 'No internet 📴 and no cache.';

interface CacheEntry {
  version: number;
  data: MenuData;
  fetchedAt: number;
}

class SnapshotValidationError extends Error {
  code: 'invalid_artifact' | 'invalid_snapshot';

  constructor(code: 'invalid_artifact' | 'invalid_snapshot', message: string) {
    super(message);
    this.name = 'SnapshotValidationError';
    this.code = code;
  }
}

function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === 'AbortError';
}

function isSnapshotValidationError(error: unknown): error is SnapshotValidationError {
  return error instanceof SnapshotValidationError;
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

function buildInvalidSnapshotResult(message: string, cached?: CacheEntry | null): MenuData {
  if (cached) {
    return {
      ...finalizeMenuData(cached.data, {
        source: 'preview',
        isPreview: true,
        clientFetchedAt: cached.fetchedAt,
        isStale: true,
      }),
      error: message,
      errorType: 'invalid_snapshot',
    };
  }

  return {
    days: [],
    meta: {
      schemaVersion: MENU_SCHEMA_VERSION,
      source: 'artifact',
      lastUpdated: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      isOffline: false,
      isPreview: false,
      isStale: true,
      schoolName: SCHOOL_ID,
    },
    error: message,
    errorType: 'invalid_snapshot',
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
      if (typeof sourceMeta.schemaVersion !== 'number') {
        throw new SnapshotValidationError(
          'invalid_artifact',
          'Published menu snapshot is missing its schema version.',
        );
      }
      if (sourceMeta.schemaVersion !== MENU_SCHEMA_VERSION) {
        throw new SnapshotValidationError(
          'invalid_artifact',
          `Unsupported menu schema version: ${sourceMeta.schemaVersion}`,
        );
      }
      if (typeof sourceMeta.snapshotGeneratedAt !== 'string') {
        throw new SnapshotValidationError(
          'invalid_artifact',
          'Published menu snapshot is missing snapshotGeneratedAt.',
        );
      }
      return finalizeMenuData({
        days: (data.days as MenuData['days']).map((day) => ({
          ...day,
        })),
        meta: {
          schemaVersion: sourceMeta.schemaVersion,
          source: 'artifact',
          lastUpdated: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          snapshotGeneratedAt: sourceMeta.snapshotGeneratedAt,
          isOffline: false,
          isPreview: false,
          schoolName: (typeof sourceMeta.schoolName === 'string' ? sourceMeta.schoolName : null) ?? SCHOOL_ID,
        },
      });
    }

    throw new SnapshotValidationError(
      'invalid_artifact',
      'Published menu snapshot is not in the normalized schema.',
    );
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

    try {
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
          source: 'live-fallback',
          lastUpdated: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          snapshotGeneratedAt: normalized.meta.snapshotGeneratedAt,
          isOffline: false,
          isPreview: false,
          schoolName: normalized.meta.schoolName,
        },
        error: isSnapshotValidationError(error)
          ? 'Published snapshot invalid. Showing live API fallback that may differ from the weekly snapshot.'
          : 'Published snapshot unavailable. Showing live API fallback that may differ from the weekly snapshot.',
        errorType: 'live_fallback',
      });
    } catch (liveError) {
      if (isAbortError(liveError)) throw liveError;
      if (isSnapshotValidationError(error)) {
        throw error;
      }
      throw liveError;
    }
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
    if (!isPlausibleMenuSnapshot(data.days, cached?.data.days, getTodayISO())) {
      throw new SnapshotValidationError(
        'invalid_snapshot',
        cached ? INVALID_SNAPSHOT_MESSAGE : INVALID_NO_CACHE_MESSAGE,
      );
    }

    const shouldPersist = data.meta.source === 'artifact';
    const fetchedAt = shouldPersist ? saveCache(data) : Date.now();

    return {
      ...finalizeMenuData(data, {
        lastUpdated: new Date(fetchedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        clientFetchedAt: shouldPersist ? fetchedAt : undefined,
      }),
      ...(data.meta.source === 'live-fallback'
        ? {
            error: data.error,
            errorType: 'live_fallback' as const,
          }
        : {}),
    };
  } catch (e) {
    if (isAbortError(e)) throw e;

    if (isSnapshotValidationError(e)) {
      return buildInvalidSnapshotResult(e.message, cached);
    }

    if (cached) {
      return {
        ...finalizeMenuData(cached.data, {
          source: 'offline',
          isOffline: true,
          isPreview: false,
          clientFetchedAt: cached.fetchedAt,
        }),
        error: 'Offline 📴 — showing the last known good menu.',
        errorType: 'offline',
      };
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
      error: OFFLINE_NO_CACHE_MESSAGE,
      errorType: 'offline',
    };
  }
}
