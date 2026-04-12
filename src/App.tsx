import { useEffect, useState } from 'react';
import { clearCachedData, getCachedData, getFreshData } from './api';
import type { MenuData } from './types';
import { DayCard } from './components/DayCard';
import { DayTabs } from './components/DayTabs';
import { SkeletonLoader } from './components/SkeletonLoader';
import './App.css';

function App() {
  const [data, setData] = useState<MenuData | null>(null);
  const [loading, setLoading] = useState(true);
  const [retrying, setRetrying] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);

  const setOfflineError = () => {
    setData({
      days: [],
      meta: {
        source: 'offline',
        lastUpdated: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        isOffline: true,
        isPreview: false,
        schoolName: 'BENTONMIDDLE',
      },
      error: 'No internet and no cache.',
    });
    setLoading(false);
  };

  const hydrateData = async (preferCache: boolean) => {
    if (preferCache) {
      const cachedData = await getCachedData();
      const hasCachedDays = cachedData.days.length > 0;

      setData(hasCachedDays ? cachedData : null);
      setLoading(!hasCachedDays);

      const freshRequest = getFreshData();
      const freshData = await Promise.race([
        freshRequest,
        new Promise<null>((resolve) => setTimeout(() => resolve(null), 10000)),
      ]);

      if (freshData !== null) {
        setData(freshData);
        setLoading(false);
        return;
      }

      if (!hasCachedDays) {
        const eventualData = await freshRequest;
        setData(eventualData);
        setLoading(false);
      }

      return;
    }

    const freshData = await getFreshData({
      cacheBustKey: String(Date.now()),
      resetCache: true,
    });
    setData(freshData);
    setLoading(false);
  };

  useEffect(() => {
    let isMounted = true;

    const loadData = async () => {
      try {
        if (isMounted) {
          await hydrateData(true);
        }
      } catch {
        if (isMounted) {
          setOfflineError();
        }
      }
    };

    void loadData();
    return () => { isMounted = false; };
  }, []);

  const handleRetry = async () => {
    setRetrying(true);
    setLoading(true);
    clearCachedData();

    try {
      await hydrateData(false);
    } catch {
      setOfflineError();
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
              {data?.meta?.isOffline
                ? '⚠️ Offline — showing cached menu'
                : `Updated ${data?.meta?.lastUpdated || '—'}`}
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
