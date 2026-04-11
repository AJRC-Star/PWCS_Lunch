import { useEffect, useState } from 'react';
import { getData } from './api';
import type { MenuData } from './types';
import { DayCard } from './components/DayCard';
import { DayTabs } from './components/DayTabs';
import { SkeletonLoader } from './components/SkeletonLoader';
import './App.css';

function App() {
  const [data, setData] = useState<MenuData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedIndex, setSelectedIndex] = useState(0);

  useEffect(() => {
    let isMounted = true;

    const loadData = async () => {
      try {
        const initialData = await getData(true);
        if (isMounted) {
          setData(initialData);
          setLoading(false);
        }

        if (initialData.meta.isPreview) {
          const freshData = await Promise.race([
            getData(false),
            new Promise<null>((resolve) => setTimeout(() => resolve(null), 10000)),
          ]);

          if (isMounted && freshData !== null) {
            const fresh = freshData as MenuData;
            if (fresh?.meta?.source !== 'cache') {
              setData(fresh);
            }
          }
        }
      } catch {
        if (isMounted) {
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
        }
      }
    };

    loadData();
    return () => { isMounted = false; };
  }, []);

  const days = data?.days || [];

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
        {!loading && days.length > 0 && (
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
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
