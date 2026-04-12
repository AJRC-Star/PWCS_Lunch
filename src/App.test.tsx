import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import App from './App';
import type { MenuData } from './types';

const apiMocks = vi.hoisted(() => ({
  clearCachedData: vi.fn(),
  getCachedData: vi.fn(),
  getFreshData: vi.fn(),
}));

vi.mock('./api', () => apiMocks);

function createDeferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;

  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });

  return { promise, resolve, reject };
}

function makeMenuData(): MenuData {
  return {
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
      source: 'fresh',
      lastUpdated: '10:00 AM',
      sourceUpdatedAt: '2026-04-13T10:00:00.000Z',
      clientFetchedAt: 1744545600000,
      isStale: false,
      isOffline: false,
      isPreview: false,
      schoolName: 'BENTONMIDDLE',
    },
  };
}

function makeCachedMenuData(): MenuData {
  return {
    days: [
      {
        iso: '2026-04-13',
        dateObj: Date.parse('2026-04-13T12:00:00Z'),
        today: true,
        weekend: false,
        no_school: false,
        no_information_provided: false,
        sections: [{ title: 'Entree', items: ['CachedItem'], wide: true }],
      },
    ],
    meta: {
      source: 'preview',
      lastUpdated: '09:00 AM',
      isOffline: false,
      isPreview: true,
      schoolName: 'BENTONMIDDLE',
      isStale: false,
      clientFetchedAt: Date.now() - 1000,
    },
  };
}

function makeEmptyPreview(): MenuData {
  return {
    days: [],
    meta: {
      source: 'preview',
      lastUpdated: '09:59 AM',
      isOffline: false,
      isPreview: true,
      schoolName: 'BENTONMIDDLE',
    },
  };
}

describe('App', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  // ── Existing tests ─────────────────────────────────────────────────────────

  it('keeps showing the loading skeleton when there is no cache and fresh data is still pending', async () => {
    const deferred = createDeferred<MenuData>();

    apiMocks.getCachedData.mockResolvedValue(makeEmptyPreview());
    apiMocks.getFreshData.mockReturnValue(deferred.promise);

    render(<App />);

    await waitFor(() => {
      expect(apiMocks.getCachedData).toHaveBeenCalledTimes(1);
      expect(apiMocks.getFreshData).toHaveBeenCalledTimes(1);
    });

    expect(screen.getByRole('heading', { name: /bms lunch/i })).toBeInTheDocument();
    expect(screen.queryByText('Nothing to show')).not.toBeInTheDocument();
    expect(document.querySelector('.skeleton-card')).not.toBeNull();

    deferred.resolve(makeMenuData());

    expect(await screen.findByText('Pizza')).toBeInTheDocument();
  });

  it('lets the user force a fresh retry from the empty offline state', async () => {
    const user = userEvent.setup();

    apiMocks.getCachedData.mockResolvedValue(makeEmptyPreview());
    apiMocks.getFreshData
      .mockResolvedValueOnce({
        days: [],
        meta: {
          source: 'offline',
          lastUpdated: '10:01 AM',
          isOffline: true,
          isPreview: false,
          schoolName: 'BENTONMIDDLE',
        },
        error: 'No internet and no cache.',
      })
      .mockResolvedValueOnce(makeMenuData());

    render(<App />);

    expect(await screen.findByText('Nothing to show')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /try again/i }));

    expect(apiMocks.clearCachedData).toHaveBeenCalled();
    expect(apiMocks.getFreshData).toHaveBeenLastCalledWith({
      cacheBustKey: expect.any(String),
      resetCache: true,
    });
    expect((await screen.findAllByText('Pizza')).length).toBeGreaterThan(0);
  });

  // ── Finding 5: background refresh survives any delay ──────────────────────

  it('updates to fresh data in background after cache is shown', async () => {
    const deferred = createDeferred<MenuData>();
    apiMocks.getCachedData.mockResolvedValue(makeCachedMenuData());
    apiMocks.getFreshData.mockReturnValue(deferred.promise);

    render(<App />);

    // Cached data shows immediately — no spinner needed
    expect(await screen.findByText('CachedItem')).toBeInTheDocument();

    // Background fetch completes (may be before or after the 10-second UI
    // deadline; the component must commit the result either way)
    await act(async () => {
      deferred.resolve(makeMenuData());
    });

    expect(await screen.findByText('Pizza')).toBeInTheDocument();
    expect(screen.queryByText('CachedItem')).not.toBeInTheDocument();
  });

  it('shows skeleton then fresh data when there is no cache and the fetch is delayed', async () => {
    const deferred = createDeferred<MenuData>();
    apiMocks.getCachedData.mockResolvedValue(makeEmptyPreview());
    apiMocks.getFreshData.mockReturnValue(deferred.promise);

    render(<App />);

    // No cache → skeleton while waiting
    await waitFor(() => {
      expect(document.querySelector('.skeleton-card')).not.toBeNull();
    });

    // Fetch eventually resolves
    await act(async () => {
      deferred.resolve(makeMenuData());
    });

    expect(await screen.findByText('Pizza')).toBeInTheDocument();
  });

  // ── Finding 1: freshness label shows source timestamp ─────────────────────

  it('displays the source timestamp in the header when sourceUpdatedAt is present', async () => {
    apiMocks.getCachedData.mockResolvedValue(makeEmptyPreview());
    apiMocks.getFreshData.mockResolvedValue(makeMenuData());

    render(<App />);

    // Wait until the menu has rendered
    await screen.findByText(/menu from/i);

    const caption = document.querySelector('.caption');
    // sourceUpdatedAt '2026-04-13T10:00:00.000Z' → "Menu from Apr 13 …"
    expect(caption?.textContent).toMatch(/Apr 13/);
    expect(caption?.textContent).not.toMatch(/stale/i);
  });

  it('surfaces a stale-cache warning when the cached entry is past its TTL', async () => {
    const staleData: MenuData = {
      ...makeCachedMenuData(),
      meta: { ...makeCachedMenuData().meta, isStale: true },
    };

    const deferred = createDeferred<MenuData>();
    apiMocks.getCachedData.mockResolvedValue(staleData);
    apiMocks.getFreshData.mockReturnValue(deferred.promise);

    render(<App />);

    // Stale cache renders and the header must call out the staleness
    await screen.findByText('CachedItem');
    const caption = document.querySelector('.caption');
    expect(caption?.textContent).toMatch(/stale/i);

    // Clean up: resolve the deferred so the component does not leak
    await act(async () => {
      deferred.resolve(makeMenuData());
    });
  });

  // ── Finding 3: no-school card is rendered correctly ───────────────────────

  it('renders the No school card for a no_school day', async () => {
    const noSchoolData: MenuData = {
      days: [
        {
          iso: '2026-04-13',
          dateObj: Date.parse('2026-04-13T12:00:00Z'),
          today: true,
          weekend: false,
          no_school: true,
          no_information_provided: false,
          sections: [],
        },
      ],
      meta: {
        source: 'fresh',
        lastUpdated: '10:00 AM',
        isOffline: false,
        isPreview: false,
        schoolName: 'BENTONMIDDLE',
      },
    };

    apiMocks.getCachedData.mockResolvedValue(makeEmptyPreview());
    apiMocks.getFreshData.mockResolvedValue(noSchoolData);

    render(<App />);

    expect(await screen.findByText('No school')).toBeInTheDocument();
    expect(screen.queryByText('No menu yet')).not.toBeInTheDocument();
  });
});
