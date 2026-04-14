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
          {
            iso: '2026-04-15',
            dateObj: Date.parse('2026-04-15T12:00:00Z'),
            today: false,
            weekend: false,
            no_school: false,
            no_information_provided: false,
            sections: [],
          },
          {
            iso: '2026-04-16',
            dateObj: Date.parse('2026-04-16T12:00:00Z'),
            today: false,
            weekend: false,
            no_school: false,
            no_information_provided: false,
            sections: [],
          },
        ],
        meta: {
          schemaVersion: MENU_SCHEMA_VERSION,
          snapshotGeneratedAt: '2026-04-13T10:00:00.000Z',
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
          {
            iso: '2026-04-16',
            dateObj: Date.parse('2026-04-16T12:00:00Z'),
            today: false,
            weekend: false,
            no_school: false,
            no_information_provided: false,
            sections: [],
          },
          {
            iso: '2026-04-17',
            dateObj: Date.parse('2026-04-17T12:00:00Z'),
            today: false,
            weekend: false,
            no_school: false,
            no_information_provided: false,
            sections: [],
          },
        ],
        meta: {
          schemaVersion: MENU_SCHEMA_VERSION,
          snapshotGeneratedAt: '2026-04-12T10:00:00.000Z',
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
          source: 'artifact',
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
          source: 'artifact',
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

  it('rejects a one-day live fallback snapshot for first-load users', async () => {
    vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce({
        ok: false,
        status: 404,
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          schoolName: 'BENTONMIDDLE',
          menuSchedules: [
            {
              dateInformation: { dateFull: '2026-04-13T00:00:00' },
              menuBlocks: [
                {
                  blockName: 'Lunch',
                  cafeteriaLineList: {
                    data: [{ foodItemList: { data: [{ item_Name: 'Pizza', item_Type: 'Main' }] } }],
                  },
                },
              ],
            },
          ],
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

  it('shows live API fallback as a degraded source and does not persist it as the weekly artifact cache', async () => {
    const setItem = vi.fn();
    vi.stubGlobal('localStorage', {
      getItem: vi.fn(() => null),
      setItem,
      removeItem: vi.fn(),
      clear: vi.fn(),
    });

    vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce({
        ok: false,
        status: 404,
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          schoolName: 'BENTONMIDDLE',
          menuSchedules: [
            {
              dateInformation: { dateFull: '2026-04-13T00:00:00' },
              menuBlocks: [
                {
                  blockName: 'Lunch',
                  cafeteriaLineList: {
                    data: [{ foodItemList: { data: [{ item_Name: 'Pizza', item_Type: 'Main' }] } }],
                  },
                },
                {
                  blockName: 'Lunch',
                  cafeteriaLineList: {
                    data: [{ foodItemList: { data: [{ item_Name: 'Garden Salad', item_Type: 'Vegetable' }] } }],
                  },
                },
              ],
            },
            {
              dateInformation: { dateFull: '2026-04-14T00:00:00' },
              menuBlocks: [
                {
                  blockName: 'Lunch',
                  cafeteriaLineList: {
                    data: [{ foodItemList: { data: [{ item_Name: 'Pasta', item_Type: 'Main' }] } }],
                  },
                },
              ],
            },
            {
              dateInformation: { dateFull: '2026-04-15T00:00:00' },
              menuBlocks: [
                {
                  blockName: 'Lunch',
                  cafeteriaLineList: {
                    data: [{ foodItemList: { data: [{ item_Name: 'Pear Wedges', item_Type: 'Fruit' }] } }],
                  },
                },
              ],
            },
          ],
        }),
      } as Response);

    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-04-13T14:00:00.000Z'));

    try {
      const data = await getFreshData();
      expect(data.meta.source).toBe('live-fallback');
      expect(data.errorType).toBe('live_fallback');
      expect(data.error).toMatch(/live API fallback/i);
      expect(setItem).not.toHaveBeenCalled();
    } finally {
      vi.useRealTimers();
    }
  });

  it('tells the user when live fallback was triggered by an invalid published artifact', async () => {
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
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          schoolName: 'BENTONMIDDLE',
          menuSchedules: [
            {
              dateInformation: { dateFull: '2026-04-13T00:00:00' },
              menuBlocks: [
                {
                  blockName: 'Lunch',
                  cafeteriaLineList: {
                    data: [{ foodItemList: { data: [{ item_Name: 'Pizza', item_Type: 'Main' }] } }],
                  },
                },
              ],
            },
            {
              dateInformation: { dateFull: '2026-04-14T00:00:00' },
              menuBlocks: [
                {
                  blockName: 'Lunch',
                  cafeteriaLineList: {
                    data: [{ foodItemList: { data: [{ item_Name: 'Garden Salad', item_Type: 'Vegetable' }] } }],
                  },
                },
              ],
            },
            {
              dateInformation: { dateFull: '2026-04-15T00:00:00' },
              menuBlocks: [
                {
                  blockName: 'Lunch',
                  cafeteriaLineList: {
                    data: [{ foodItemList: { data: [{ item_Name: 'Pear Wedges', item_Type: 'Fruit' }] } }],
                  },
                },
              ],
            },
          ],
        }),
      } as Response);

    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-04-13T14:00:00.000Z'));

    try {
      const data = await getFreshData();
      expect(data.meta.source).toBe('live-fallback');
      expect(data.errorType).toBe('live_fallback');
      expect(data.error).toMatch(/invalid/i);
    } finally {
      vi.useRealTimers();
    }
  });
});
