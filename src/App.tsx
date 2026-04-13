import { useEffect, useState } from 'react';
import { clearCachedData, getCachedData, getFreshData } from './api';
import { SCHOOL_ID } from '../shared/menu-core.js';
import type { MenuData } from './types';
import { DayCard } from './components/DayCard';
import { DayTabs } from './components/DayTabs';
import { SkeletonLoader } from './components/SkeletonLoader';
import './App.css';

function formatFreshnessLabel(meta: MenuData['meta']): string {
  if (meta.isOffline) return '⚠️ Offline — showing cached menu';

  // Show the source timestamp (when the menu data was produced) when available
  // so users see actual data freshness, not the browser fetch time.
  if (meta.sourceUpdatedAt) {
    const d = new Date(meta.sourceUpdatedAt);
    const date = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const time = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const staleWarning = meta.isStale ? ' · cache may be stale' : '';
    return `Menu from ${date} ${time}${staleWarning}`;
  }

  const staleWarning = meta.isStale ? ' · cache may be stale' : '';
  return `Updated ${meta.lastUpdated || '—'}${staleWarning}`;
}

function App() {
  const [data, setData] = useState<MenuData | null>(null);
  const [loading, setLoading] = useState(true);
  const [retrying, setRetrying] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);

  useEffect(() => {
    // AbortController lets us cancel in-flight fetches on unmount and guards
    // every setState call so stale async results can never write after unmount.
    const controller = new AbortController();
    const { signal } = controller;

    const loadData = async () => {
      try {
        const cachedData = await getCachedData();
        const hasCachedDays = cachedData.days.length > 0;

        if (!signal.aborted) {
          setData(hasCachedDays ? cachedData : null);
          setLoading(!hasCachedDays);
        }

        const freshRequest = getFreshData({ signal });

        // Race the network against a 10-second UI deadline so cached data is
        // never blocked for more than 10 s.  Crucially, we keep `freshRequest`
        // alive either way and always attach a .then() so the session updates
        // when the response eventually arrives.
        const timedOut = await Promise.race([
          freshRequest.then(() => false).catch(() => false),
          new Promise<true>((resolve) => setTimeout(() => resolve(true), 10000)),
        ]);

        if (!timedOut) {
          // Fresh data arrived within the deadline — already handled by the
          // .then() race arm below, but we need the value to setData.
          const freshData = await freshRequest;
          if (!signal.aborted) {
            setData(freshData);
            setLoading(false);
          }
          return;
        }

        // Timeout fired.  UI stays on cached data (or skeleton if no cache).
        // Background fetch continues; commit its result when it resolves so the
        // session eventually reflects the latest menu without requiring a reload.
        const eventualData = await freshRequest;
        if (!signal.aborted) {
          setData(eventualData);
          setLoading(false);
        }
      } catch (e) {
        if (signal.aborted) return;
        setData({
          days: [],
          meta: {
            source: 'offline',
            lastUpdated: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            isOffline: true,
            isPreview: false,
            schoolName: SCHOOL_ID,
          },
          error: 'No internet and no cache.',
        });
        setLoading(false);
      }
    };

    void loadData();
    return () => { controller.abort(); };
  }, []);

  const handleRetry = async () => {
    setRetrying(true);
    setLoading(true);
    clearCachedData();

    try {
      const freshData = await getFreshData({
        cacheBustKey: String(Date.now()),
        resetCache: true,
      });
      setData(freshData);
      setLoading(false);
    } catch {
      setData({
        days: [],
        meta: {
          source: 'offline',
          lastUpdated: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          isOffline: true,
          isPreview: false,
          schoolName: SCHOOL_ID,
        },
        error: 'No internet and no cache.',
      });
      setLoading(false);
    } finally {
      setRetrying(false);
    }
  };

  const days = data?.days || [];

  // Clamp selectedIndex when days array changes
  useEffect(() => {
    setSelectedIndex((i) => Math.min(i, Math.max(days.length - 1, 0)));
  }, [days.length]);

  return (
    <div id="app">
      {data?.error && (
        <div className="error-banner">{data.error}</div>
      )}

      <header>
        <div className="title">
          <h1>🍔 BMS Lunch</h1>
          <div className="meta-row">
            <span className="caption">
              {data?.meta ? formatFreshnessLabel(data.meta) : '—'}
            </span>
            {days.length > 0 && (
              <span className="day-counter">{selectedIndex + 1} / {days.length}</span>
            )}
          </div>
        </div>
      </header>

      {!loading && days.length > 0 && (
        <DayTabs
          days={days}
          selectedIndex={selectedIndex}
          onSelect={setSelectedIndex}
        />
      )}

      <main>
        {loading && <SkeletonLoader />}
        {!loading && days.length > 0 && days[selectedIndex] && (
          <DayCard day={days[selectedIndex]} />
        )}
        {!loading && days.length === 0 && (
          <div className="empty-state">
            <h2>Nothing to show</h2>
            <p className="sub">
              {data?.error
                ? 'Check your internet connection or try again later.'
                : 'Try again later.'}
            </p>
            <button
              className="retry-button"
              type="button"
              onClick={handleRetry}
              disabled={retrying}
            >
              {retrying ? 'Refreshing…' : 'Try Again'}
            </button>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
