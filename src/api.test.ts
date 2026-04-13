import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getFreshData } from './api';

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
          lastUpdated: '2026-04-13T10:00:00.000Z',
          schoolName: 'BENTONMIDDLE',
        },
      }),
    } as Response);

    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-04-14T14:00:00.000Z'));

    try {
      const data = await getFreshData();

      expect(data.days.find((day) => day.iso === '2026-04-13')?.today).toBe(false);
      expect(data.days.find((day) => day.iso === '2026-04-14')?.today).toBe(true);
    } finally {
      vi.useRealTimers();
    }
  });
});
