import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getCachedData, getFreshData } from './api';
import { MENU_SCHEMA_VERSION } from '../shared/menu-core.js';

describe('api', () => {
  beforeEach(() => {
    const storage = new Map<string, string>();
    vi.stubGlobal('localStorage', {
      getItem: vi.fn((key: string) => storage.get(key) ?? null),
      setItem: vi.fn((key: string, value: string) => {
        storage.set(key, value);
      }),
      removeItem: vi.fn((key: string) => {
        storage.delete(key);
      }),
      clear: vi.fn(() => {
        storage.clear();
      }),
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('recomputes the today flag when loading normalized static data', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({
        days: [
          {
            iso: '2026-04-13',
            dateObj: Date.parse('2026-04-13T12:00:00Z'),
            today: true,
            weekend: false,
            no_school: false,
            no_information_provided: false,
            sections: [],
          },
          {
            iso: '2026-04-14',
            dateObj: Date.parse('2026-04-14T12:00:00Z'),
            today: false,
            weekend: false,
            no_school: false,
            no_information_provided: false,
            sections: [],
          },
        ],
        meta: {
          snapshotGeneratedAt: '2026-04-13T10:00:00.000Z',
          schoolName: 'BENTONMIDDLE',
        },
      }),
    } as Response);

    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-04-14T14:00:00.000Z'));

    try {
      const data = await getFreshData();

      expect(data.days).toHaveLength(1);
      expect(data.days.find((day) => day.iso === '2026-04-13')).toBeUndefined();
      expect(data.days.find((day) => day.iso === '2026-04-14')?.today).toBe(true);
      expect(data.meta.snapshotGeneratedAt).toBe('2026-04-13T10:00:00.000Z');
    } finally {
      vi.useRealTimers();
    }
  });

  it('drops past days from the normalized artifact path as well', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({
        days: [
          {
            iso: '2026-04-14',
            dateObj: Date.parse('2026-04-14T12:00:00Z'),
            today: true,
            weekend: false,
            no_school: false,
            no_information_provided: false,
            sections: [],
          },
          {
            iso: '2026-04-15',
            dateObj: Date.parse('2026-04-15T12:00:00Z'),
            today: false,
            weekend: false,
            no_school: false,
            no_information_provided: false,
            sections: [],
          },
        ],
        meta: {
          snapshotGeneratedAt: '2026-04-12T10:00:00.000Z',
          schoolName: 'BENTONMIDDLE',
        },
      }),
    } as Response);

    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-04-15T14:00:00.000Z'));

    try {
      const data = await getFreshData();
      expect(data.days).toHaveLength(1);
      expect(data.days[0].iso).toBe('2026-04-15');
      expect(data.days[0].today).toBe(true);
    } finally {
      vi.useRealTimers();
    }
  });

  it('recomputes today and drops past cached days when reading preview data', async () => {
    const cachedPayload = {
      version: MENU_SCHEMA_VERSION,
      data: {
        days: [
          {
            iso: '2026-04-13',
            dateObj: Date.parse('2026-04-13T12:00:00Z'),
            today: true,
            weekend: false,
            no_school: false,
            no_information_provided: false,
            sections: [],
          },
          {
            iso: '2026-04-14',
            dateObj: Date.parse('2026-04-14T12:00:00Z'),
            today: false,
            weekend: false,
            no_school: false,
            no_information_provided: false,
            sections: [],
          },
        ],
        meta: {
          schemaVersion: MENU_SCHEMA_VERSION,
          source: 'fresh',
          lastUpdated: '09:00 AM',
          schoolName: 'BENTONMIDDLE',
        },
      },
      fetchedAt: Date.parse('2026-04-13T16:00:00.000Z'),
    };

    vi.stubGlobal('localStorage', {
      getItem: vi.fn(() => JSON.stringify(cachedPayload)),
      setItem: vi.fn(),
      removeItem: vi.fn(),
      clear: vi.fn(),
    });

    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-04-14T14:00:00.000Z'));

    try {
      const data = await getCachedData();

      expect(data.days).toHaveLength(1);
      expect(data.days[0].iso).toBe('2026-04-14');
      expect(data.days[0].today).toBe(true);
    } finally {
      vi.useRealTimers();
    }
  });

  it('keeps the last known good cached menu when a refresh fails', async () => {
    const cachedPayload = {
      version: MENU_SCHEMA_VERSION,
      data: {
        days: [
          {
            iso: '2026-04-15',
            dateObj: Date.parse('2026-04-15T12:00:00Z'),
            today: true,
            weekend: false,
            no_school: false,
            no_information_provided: false,
            sections: [{ title: 'Entree', items: ['Cached Pizza'], wide: true }],
          },
        ],
        meta: {
          schemaVersion: MENU_SCHEMA_VERSION,
          source: 'fresh',
          lastUpdated: '09:00 AM',
          snapshotGeneratedAt: '2026-04-12T10:00:00.000Z',
          schoolName: 'BENTONMIDDLE',
        },
      },
      fetchedAt: Date.parse('2026-04-15T12:00:00.000Z'),
    };

    vi.stubGlobal('localStorage', {
      getItem: vi.fn(() => JSON.stringify(cachedPayload)),
      setItem: vi.fn(),
      removeItem: vi.fn(),
      clear: vi.fn(),
    });
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('offline'));

    const data = await getFreshData({ cacheBustKey: 'retry' });

    expect(data.days[0].sections[0].items).toContain('Cached Pizza');
    expect(data.meta.source).toBe('offline');
    expect(data.meta.isOffline).toBe(true);
  });
});
