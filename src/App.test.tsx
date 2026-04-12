import { render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import App from './App';
import type { MenuData } from './types';

const apiMocks = vi.hoisted(() => ({
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
        sections: [
          {
            title: 'Entree',
            items: ['Pizza'],
            wide: true,
          },
        ],
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
}

describe('App', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('keeps showing the loading skeleton when there is no cache and fresh data is still pending', async () => {
    const deferred = createDeferred<MenuData>();

    apiMocks.getCachedData.mockResolvedValue({
      days: [],
      meta: {
        source: 'preview',
        lastUpdated: '09:59 AM',
        isOffline: false,
        isPreview: true,
        schoolName: 'BENTONMIDDLE',
      },
    });
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
});
