import {
  getNextSchoolDay,
  getTodayISO,
  isPlausibleMenuSnapshot,
  MENU_SCHEMA_VERSION,
  SCHOOL_ID,
} from '../shared/menu-core.js';
import type { MenuData } from './types';

const CACHE_KEY = `bms_lunch_cache_v${MENU_SCHEMA_VERSION}`;
const CACHE_TTL_MS = 4 * 60 * 60 * 1000; // 4 hours
const SNAPSHOT_STALE_AFTER_MS = 7 * 24 * 60 * 60 * 1000; // weekly schedule SLA
const INVALID_SNAPSHOT_MESSAGE = 'Menu snapshot is unavailable right now. Showing the last known good menu.';
const INVALID_NO_CACHE_MESSAGE = 'Menu snapshot is invalid right now. Please try again later.';
const SNAPSHOT_UNAVAILABLE_MESSAGE = 'Published weekly menu snapshot unavailable. Showing the last known good menu.';
const SNAPSHOT_UNAVAILABLE_NO_CACHE_MESSAGE = 'Published weekly menu snapshot unavailable right now. Please try again later.';
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

class SnapshotFetchError extends Error {
  code: 'snapshot_unavailable' | 'offline';

  constructor(code: 'snapshot_unavailable' | 'offline', message: string) {
    super(message);
    this.name = 'SnapshotFetchError';
    this.code = code;
  }
}

function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === 'AbortError';
}

function isSnapshotValidationError(error: unknown): error is SnapshotValidationError {
  return error instanceof SnapshotValidationError;
}

function isSnapshotFetchError(error: unknown): error is SnapshotFetchError {
  return error instanceof SnapshotFetchError;
}

function getMenuDataUrl(cacheBustKey?: string): string {
  // GitHub Pages fixes cache headers at the platform level, so we version the
  // mutable JSON URL client-side to avoid stale menu data in Safari/iOS.
  // Use a full timestamp by default so a repaired artifact can propagate
  // immediately instead of waiting for the next hour-key rollover.
  const version = cacheBustKey ?? new Date().toISOString();
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
        source: 'artifact-cache',
        isOffline: false,
        isPreview: false,
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
    const response = await fetch(getMenuDataUrl(cacheBustKey), { signal });
    if (!response.ok) {
      throw new SnapshotFetchError(
        'snapshot_unavailable',
        `Failed to load published menu snapshot: ${response.status}`,
      );
    }
    const data = await response.json() as Record<string, unknown>;

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
    if (isSnapshotValidationError(error) || isSnapshotFetchError(error)) {
      throw error;
    }
    throw new SnapshotFetchError(
      'offline',
      error instanceof Error ? error.message : 'Network unavailable while loading menu snapshot.',
    );
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

    const fetchedAt = saveCache(data);

    return finalizeMenuData(data, {
      lastUpdated: new Date(fetchedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      clientFetchedAt: fetchedAt,
    });
  } catch (e) {
    if (isAbortError(e)) throw e;

    if (isSnapshotValidationError(e)) {
      return buildInvalidSnapshotResult(e.message, cached);
    }

    if (isSnapshotFetchError(e)) {
      if (cached) {
        return {
          ...finalizeMenuData(cached.data, {
            source: e.code === 'offline' ? 'offline' : 'artifact-cache',
            isOffline: e.code === 'offline',
            isPreview: false,
            clientFetchedAt: cached.fetchedAt,
            isStale: true,
          }),
          error: e.code === 'offline'
            ? 'Offline 📴 — showing the last known good menu.'
            : SNAPSHOT_UNAVAILABLE_MESSAGE,
          errorType: e.code === 'offline' ? 'offline' : 'snapshot_unavailable',
        };
      }

      return {
        days: [],
        meta: {
          schemaVersion: MENU_SCHEMA_VERSION,
          source: e.code === 'offline' ? 'offline' : 'artifact',
          lastUpdated: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          isOffline: e.code === 'offline',
          isPreview: false,
          schoolName: SCHOOL_ID,
        },
        error: e.code === 'offline' ? OFFLINE_NO_CACHE_MESSAGE : SNAPSHOT_UNAVAILABLE_NO_CACHE_MESSAGE,
        errorType: e.code === 'offline' ? 'offline' : 'snapshot_unavailable',
      };
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
