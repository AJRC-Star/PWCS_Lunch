import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getCachedData, getFreshData } from './api';
import { MENU_SCHEMA_VERSION } from '../shared/menu-core.js';
import { MENU_CACHE_SEMANTIC_VERSION } from '../shared/menu-contract.js';

const TEST_SECTIONS = [{ title: 'Entree', items: ['Pizza'], wide: true }];

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
            sections: TEST_SECTIONS,
          },
          {
            iso: '2026-04-14',
            dateObj: Date.parse('2026-04-14T12:00:00Z'),
            today: false,
            weekend: false,
            no_school: false,
            no_information_provided: false,
            sections: TEST_SECTIONS,
          },
          {
            iso: '2026-04-15',
            dateObj: Date.parse('2026-04-15T12:00:00Z'),
            today: false,
            weekend: false,
            no_school: false,
            no_information_provided: false,
            sections: TEST_SECTIONS,
          },
          {
            iso: '2026-04-16',
            dateObj: Date.parse('2026-04-16T12:00:00Z'),
            today: false,
            weekend: false,
            no_school: false,
            no_information_provided: false,
            sections: TEST_SECTIONS,
          },
        ],
        meta: {
          schemaVersion: MENU_SCHEMA_VERSION,
          snapshotGeneratedAt: '2026-04-13T10:00:00.000Z',
          expectedNextRefreshAt: '2026-04-18T10:00:00.000Z',
          schoolName: 'BENTONMIDDLE',
        },
      }),
    } as Response);

    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-04-14T14:00:00.000Z'));

    try {
      const data = await getFreshData();

      expect(data.days).toHaveLength(3);
      expect(data.days.find((day) => day.iso === '2026-04-13')).toBeUndefined();
      expect(data.days.find((day) => day.iso === '2026-04-14')?.today).toBe(true);
      expect(data.meta.snapshotGeneratedAt).toBe('2026-04-13T10:00:00.000Z');
    } finally {
      vi.useRealTimers();
    }
  });

  it('marks a published snapshot as stale as soon as it misses the weekly refresh SLA', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({
        days: [
          {
            iso: '2026-04-21',
            dateObj: Date.parse('2026-04-21T12:00:00Z'),
            today: true,
            weekend: false,
            no_school: true,
            no_information_provided: false,
            sections: [],
          },
          {
            iso: '2026-04-22',
            dateObj: Date.parse('2026-04-22T12:00:00Z'),
            today: false,
            weekend: false,
            no_school: false,
            no_information_provided: false,
            sections: TEST_SECTIONS,
          },
          {
            iso: '2026-04-23',
            dateObj: Date.parse('2026-04-23T12:00:00Z'),
            today: false,
            weekend: false,
            no_school: false,
            no_information_provided: false,
            sections: TEST_SECTIONS,
          },
        ],
        meta: {
          schemaVersion: MENU_SCHEMA_VERSION,
          snapshotGeneratedAt: '2026-04-14T10:00:00.000Z',
          expectedNextRefreshAt: '2026-04-18T10:00:00.000Z',
          schoolName: 'BENTONMIDDLE',
        },
      }),
    } as Response);

    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-04-21T10:01:00.000Z'));

    try {
      const data = await getFreshData();
      expect(data.meta.isStale).toBe(true);
    } finally {
      vi.useRealTimers();
    }
  });

  it('rejects schema-less normalized artifacts instead of silently treating them as current', async () => {
    vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          days: [],
          meta: {
            lastUpdated: '2026-04-13T10:00:00.000Z',
            schoolName: 'BENTONMIDDLE',
          },
        }),
      } as Response)
      .mockRejectedValueOnce(new Error('live api unavailable'));

    const data = await getFreshData();

    expect(data.errorType).toBe('invalid_snapshot');
    expect(data.error).toMatch(/schema version/i);
    expect(data.meta.isOffline).toBe(false);
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
            sections: TEST_SECTIONS,
          },
          {
            iso: '2026-04-15',
            dateObj: Date.parse('2026-04-15T12:00:00Z'),
            today: false,
            weekend: false,
            no_school: false,
            no_information_provided: false,
            sections: TEST_SECTIONS,
          },
          {
            iso: '2026-04-16',
            dateObj: Date.parse('2026-04-16T12:00:00Z'),
            today: false,
            weekend: false,
            no_school: false,
            no_information_provided: false,
            sections: TEST_SECTIONS,
          },
          {
            iso: '2026-04-17',
            dateObj: Date.parse('2026-04-17T12:00:00Z'),
            today: false,
            weekend: false,
            no_school: false,
            no_information_provided: false,
            sections: TEST_SECTIONS,
          },
        ],
        meta: {
          schemaVersion: MENU_SCHEMA_VERSION,
          snapshotGeneratedAt: '2026-04-12T10:00:00.000Z',
          expectedNextRefreshAt: '2026-04-18T10:00:00.000Z',
          schoolName: 'BENTONMIDDLE',
        },
      }),
    } as Response);

    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-04-15T14:00:00.000Z'));

    try {
      const data = await getFreshData();
      expect(data.days).toHaveLength(3);
      expect(data.days[0].iso).toBe('2026-04-15');
      expect(data.days[0].today).toBe(true);
    } finally {
      vi.useRealTimers();
    }
  });

  it('recomputes today and drops past cached days when reading preview data', async () => {
    const cachedPayload = {
      version: MENU_CACHE_SEMANTIC_VERSION,
      data: {
        days: [
          {
            iso: '2026-04-13',
            dateObj: Date.parse('2026-04-13T12:00:00Z'),
            today: true,
            weekend: false,
            no_school: false,
            no_information_provided: false,
            sections: TEST_SECTIONS,
          },
          {
            iso: '2026-04-14',
            dateObj: Date.parse('2026-04-14T12:00:00Z'),
            today: false,
            weekend: false,
            no_school: false,
            no_information_provided: false,
            sections: TEST_SECTIONS,
          },
        ],
        meta: {
          schemaVersion: MENU_SCHEMA_VERSION,
          source: 'artifact',
          lastUpdated: '09:00 AM',
          snapshotGeneratedAt: '2026-04-13T10:00:00.000Z',
          expectedNextRefreshAt: '2026-04-18T10:00:00.000Z',
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

  it('rejects stale same-schema cache entries after a semantic cache version bump', async () => {
    const staleSemanticCache = {
      version: MENU_SCHEMA_VERSION,
      data: {
        days: [
          {
            iso: '2026-04-21',
            dateObj: Date.parse('2026-04-21T12:00:00Z'),
            today: false,
            weekend: false,
            no_school: false,
            no_information_provided: true,
            sections: [],
          },
        ],
        meta: {
          schemaVersion: MENU_SCHEMA_VERSION,
          source: 'artifact',
          lastUpdated: '09:00 AM',
          snapshotGeneratedAt: '2026-04-14T10:00:00.000Z',
          schoolName: 'BENTONMIDDLE',
        },
      },
      fetchedAt: Date.parse('2026-04-14T16:00:00.000Z'),
    };

    vi.stubGlobal('localStorage', {
      getItem: vi.fn(() => JSON.stringify(staleSemanticCache)),
      setItem: vi.fn(),
      removeItem: vi.fn(),
      clear: vi.fn(),
    });

    const data = await getCachedData();

    expect(staleSemanticCache.version).not.toBe(MENU_CACHE_SEMANTIC_VERSION);
    expect(data.days).toHaveLength(0);
    expect(data.meta.source).toBe('preview');
  });

  it('ignores and clears malformed same-version cache before fetching fresh data', async () => {
    const removeItem = vi.fn();
    const setItem = vi.fn();
    vi.stubGlobal('localStorage', {
      getItem: vi.fn(() => JSON.stringify({
        version: MENU_CACHE_SEMANTIC_VERSION,
        data: {
          days: null,
          meta: {
            schemaVersion: MENU_SCHEMA_VERSION,
            source: 'artifact',
            lastUpdated: '09:00 AM',
            snapshotGeneratedAt: '2026-04-13T10:00:00.000Z',
            expectedNextRefreshAt: '2026-04-18T10:00:00.000Z',
            schoolName: 'BENTONMIDDLE',
          },
        },
        fetchedAt: Date.parse('2026-04-13T12:00:00.000Z'),
      })),
      setItem,
      removeItem,
      clear: vi.fn(),
    });
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
            sections: TEST_SECTIONS,
          },
          {
            iso: '2026-04-14',
            dateObj: Date.parse('2026-04-14T12:00:00Z'),
            today: false,
            weekend: false,
            no_school: false,
            no_information_provided: false,
            sections: TEST_SECTIONS,
          },
          {
            iso: '2026-04-15',
            dateObj: Date.parse('2026-04-15T12:00:00Z'),
            today: false,
            weekend: false,
            no_school: false,
            no_information_provided: false,
            sections: TEST_SECTIONS,
          },
        ],
        meta: {
          schemaVersion: MENU_SCHEMA_VERSION,
          snapshotGeneratedAt: '2026-04-13T10:00:00.000Z',
          expectedNextRefreshAt: '2026-04-18T10:00:00.000Z',
          schoolName: 'BENTONMIDDLE',
        },
      }),
    } as Response);

    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-04-13T14:00:00.000Z'));

    try {
      const data = await getFreshData();

      expect(removeItem).toHaveBeenCalled();
      expect(setItem).toHaveBeenCalled();
      expect(data.meta.source).toBe('artifact');
      expect(data.days).toHaveLength(3);
    } finally {
      vi.useRealTimers();
    }
  });

  it('rejects artifacts whose expected refresh deadline would suppress stale warnings', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({
        days: [
          {
            iso: '2026-04-20',
            dateObj: Date.parse('2026-04-20T12:00:00Z'),
            today: false,
            weekend: false,
            no_school: false,
            no_information_provided: false,
            sections: TEST_SECTIONS,
          },
          {
            iso: '2026-04-21',
            dateObj: Date.parse('2026-04-21T12:00:00Z'),
            today: false,
            weekend: false,
            no_school: true,
            no_information_provided: false,
            sections: [],
          },
          {
            iso: '2026-04-22',
            dateObj: Date.parse('2026-04-22T12:00:00Z'),
            today: false,
            weekend: false,
            no_school: false,
            no_information_provided: false,
            sections: TEST_SECTIONS,
          },
        ],
        meta: {
          schemaVersion: MENU_SCHEMA_VERSION,
          snapshotGeneratedAt: '2026-04-15T10:00:00.000Z',
          expectedNextRefreshAt: '2030-01-01T00:00:00.000Z',
          schoolName: 'BENTONMIDDLE',
        },
      }),
    } as Response);

    const data = await getFreshData();

    expect(data.errorType).toBe('invalid_snapshot');
    expect(data.error).toMatch(/weekly refresh schedule/i);
  });

  it('keeps the last known good cached menu when a refresh fails', async () => {
    const cachedPayload = {
      version: MENU_CACHE_SEMANTIC_VERSION,
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
          source: 'artifact',
          lastUpdated: '09:00 AM',
          snapshotGeneratedAt: '2026-04-12T10:00:00.000Z',
          expectedNextRefreshAt: '2026-04-18T10:00:00.000Z',
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

  it('labels cached last-known-good data distinctly when the published snapshot is unavailable', async () => {
    const cachedPayload = {
      version: MENU_CACHE_SEMANTIC_VERSION,
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
          source: 'artifact',
          lastUpdated: '09:00 AM',
          snapshotGeneratedAt: '2026-04-12T10:00:00.000Z',
          expectedNextRefreshAt: '2026-04-18T10:00:00.000Z',
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
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: false,
      status: 404,
    } as Response);

    const data = await getFreshData();

    expect(data.meta.source).toBe('artifact-cache');
    expect(data.meta.isOffline).toBe(false);
    expect(data.errorType).toBe('snapshot_unavailable');
    expect(data.error).toMatch(/weekly menu snapshot unavailable/i);
  });

  it('rejects a one-day published artifact snapshot for first-load users', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
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
            sections: [{ title: 'Entree', items: ['Pizza'], wide: true }],
          },
        ],
        meta: {
          schemaVersion: MENU_SCHEMA_VERSION,
          snapshotGeneratedAt: '2026-04-13T10:00:00.000Z',
          expectedNextRefreshAt: '2026-04-18T10:00:00.000Z',
          schoolName: 'BENTONMIDDLE',
        },
      }),
    } as Response);

    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-04-13T14:00:00.000Z'));

    try {
      const data = await getFreshData();
      expect(data.errorType).toBe('invalid_snapshot');
      expect(data.days).toHaveLength(0);
    } finally {
      vi.useRealTimers();
    }
  });

  it('marks a snapshot stale after its expected refresh deadline even when it is less than seven days old', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({
        days: [
          {
            iso: '2026-04-20',
            dateObj: Date.parse('2026-04-20T12:00:00Z'),
            today: true,
            weekend: false,
            no_school: false,
            no_information_provided: false,
            sections: [{ title: 'Entree', items: ['Pizza'], wide: true }],
          },
          {
            iso: '2026-04-21',
            dateObj: Date.parse('2026-04-21T12:00:00Z'),
            today: false,
            weekend: false,
            no_school: true,
            no_information_provided: false,
            sections: [],
          },
          {
            iso: '2026-04-22',
            dateObj: Date.parse('2026-04-22T12:00:00Z'),
            today: false,
            weekend: false,
            no_school: false,
            no_information_provided: false,
            sections: TEST_SECTIONS,
          },
        ],
        meta: {
          schemaVersion: MENU_SCHEMA_VERSION,
          snapshotGeneratedAt: '2026-04-15T10:00:00.000Z',
          expectedNextRefreshAt: '2026-04-18T10:00:00.000Z',
          schoolName: 'BENTONMIDDLE',
        },
      }),
    } as Response);

    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-04-20T13:00:00.000Z'));

    try {
      const data = await getFreshData();
      expect(data.meta.isStale).toBe(true);
    } finally {
      vi.useRealTimers();
    }
  });

  it('reports a published snapshot as unavailable instead of silently switching to a second authoritative source', async () => {
    const setItem = vi.fn();
    vi.stubGlobal('localStorage', {
      getItem: vi.fn(() => null),
      setItem,
      removeItem: vi.fn(),
      clear: vi.fn(),
    });

    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: false,
      status: 404,
    } as Response);

    const data = await getFreshData();

    expect(data.meta.source).toBe('artifact');
    expect(data.errorType).toBe('snapshot_unavailable');
    expect(data.error).toMatch(/weekly menu snapshot unavailable/i);
    expect(setItem).not.toHaveBeenCalled();
  });

  it('uses a high-granularity default cache-bust key so repaired artifacts do not stay sticky within the same hour', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
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
            sections: [{ title: 'Entree', items: ['Pizza'], wide: true }],
          },
          {
            iso: '2026-04-14',
            dateObj: Date.parse('2026-04-14T12:00:00Z'),
            today: false,
            weekend: false,
            no_school: false,
            no_information_provided: false,
            sections: TEST_SECTIONS,
          },
          {
            iso: '2026-04-15',
            dateObj: Date.parse('2026-04-15T12:00:00Z'),
            today: false,
            weekend: false,
            no_school: false,
            no_information_provided: false,
            sections: TEST_SECTIONS,
          },
        ],
        meta: {
          schemaVersion: MENU_SCHEMA_VERSION,
          snapshotGeneratedAt: '2026-04-13T10:00:00.000Z',
          expectedNextRefreshAt: '2026-04-18T10:00:00.000Z',
          schoolName: 'BENTONMIDDLE',
        },
      }),
    } as Response);

    vi.useFakeTimers();
    try {
      vi.setSystemTime(new Date('2026-04-13T10:00:00.000Z'));
      await getFreshData();
      const firstUrl = String(fetchSpy.mock.calls[0][0]);

      vi.setSystemTime(new Date('2026-04-13T10:00:05.000Z'));
      await getFreshData();
      const secondUrl = String(fetchSpy.mock.calls[1][0]);

      expect(firstUrl).not.toBe(secondUrl);
    } finally {
      vi.useRealTimers();
    }
  });

  it('does not mask an invalid published artifact behind a live fallback', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        days: [],
        meta: {
          lastUpdated: '2026-04-13T10:00:00.000Z',
          schoolName: 'BENTONMIDDLE',
        },
      }),
    } as Response);

    const data = await getFreshData();

    expect(data.meta.source).toBe('artifact');
    expect(data.errorType).toBe('invalid_snapshot');
    expect(data.error).toMatch(/schema version/i);
  });

  it('rejects semantically invalid published artifacts at runtime', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        days: [
          {
            iso: '2026-04-21',
            dateObj: Date.parse('2026-04-21T12:00:00Z'),
            today: false,
            weekend: false,
            no_school: false,
            no_information_provided: true,
            sections: [],
          },
          {
            iso: '2026-04-22',
            dateObj: Date.parse('2026-04-22T12:00:00Z'),
            today: false,
            weekend: false,
            no_school: false,
            no_information_provided: false,
            sections: TEST_SECTIONS,
          },
          {
            iso: '2026-04-23',
            dateObj: Date.parse('2026-04-23T12:00:00Z'),
            today: false,
            weekend: false,
            no_school: false,
            no_information_provided: false,
            sections: TEST_SECTIONS,
          },
        ],
        meta: {
          schemaVersion: MENU_SCHEMA_VERSION,
          snapshotGeneratedAt: '2026-04-18T10:00:00.000Z',
          expectedNextRefreshAt: '2026-04-25T10:00:00.000Z',
          schoolName: 'BENTONMIDDLE',
        },
      }),
    } as Response);

    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-04-20T14:00:00.000Z'));

    try {
      const data = await getFreshData();
      expect(data.errorType).toBe('invalid_snapshot');
      expect(data.error).toMatch(/official no-school date 2026-04-21/i);
    } finally {
      vi.useRealTimers();
    }
  });

  it('labels cached last-known-good data distinctly when the published snapshot is invalid', async () => {
    const cachedPayload = {
      version: MENU_CACHE_SEMANTIC_VERSION,
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
          source: 'artifact',
          lastUpdated: '09:00 AM',
          snapshotGeneratedAt: '2026-04-12T10:00:00.000Z',
          expectedNextRefreshAt: '2026-04-18T10:00:00.000Z',
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
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({
        days: [],
        meta: {
          lastUpdated: '2026-04-13T10:00:00.000Z',
          schoolName: 'BENTONMIDDLE',
        },
      }),
    } as Response);

    const data = await getFreshData();

    expect(data.meta.source).toBe('artifact-cache');
    expect(data.meta.isOffline).toBe(false);
    expect(data.errorType).toBe('invalid_snapshot');
  });
});
