import { useEffect, useState } from 'react';
import { getData } from './api';
import type { MenuData } from './types';
import { DayCard } from './components/DayCard';
import { SkeletonLoader } from './components/SkeletonLoader';
import './App.css';

function App() {
  const [data, setData] = useState<MenuData | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentDayIndex, setCurrentDayIndex] = useState(0);

  useEffect(() => {
    let isMounted = true;

    const loadInitialData = async () => {
      try {
        const initialData = await getData(true);
        if (isMounted) {
          setData(initialData);
          setLoading(false);
        }

        // If we loaded preview data, fetch fresh in background
        if (initialData.meta.isPreview) {
          const freshData = await Promise.race([
            getData(false),
            new Promise((resolve) =>
              setTimeout(() => resolve(null), 10000)
            ),
          ]);

          if (isMounted && freshData !== null) {
            const fresh = freshData as MenuData;
            if (fresh?.meta?.source !== 'cache') {
              setData(fresh);
            }
          }
        }
      } catch (error) {
        console.error('Failed to load menu data:', error);
        if (isMounted) {
          setData({
            days: [],
            meta: {
              source: 'offline',
              lastUpdated: new Date().toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
              }),
              isOffline: true,
              isPreview: false,
              schoolName: 'BENTONMIDDLE',
            },
            error: 'No internet 📴 and no cache.',
          });
          setLoading(false);
        }
      }
    };

    loadInitialData();

    return () => {
      isMounted = false;
    };
  }, []);


  const showError = data?.error;
  const days = data?.days || [];

  return (
    <>
      {showError && (
        <div id="error-banner" className="error-banner">
          {showError}
        </div>
      )}

      <header id="header">
        <div className="title">
          <h1>🍔 BMS Lunch</h1>
          <div className="meta-row">
            <div className="caption" id="last-updated">
              {data?.meta?.isOffline
                ? '⚠️ Offline — showing cached menu'
                : `Updated ${data?.meta?.lastUpdated || '—'}`}
            </div>
            {days.length > 0 && (
              <span id="day-counter">
                {currentDayIndex + 1} / {days.length}
              </span>
            )}
          </div>
        </div>
      </header>

      <main id="content">
        {loading && <SkeletonLoader />}
        {!loading && days.length > 0 && (
          <div className="day-view-container">
            <DayCard day={days[currentDayIndex]} />
            <div className="day-navigation">
              <button
                className="nav-button prev-button"
                onClick={() => setCurrentDayIndex(Math.max(0, currentDayIndex - 1))}
                disabled={currentDayIndex === 0}
              >
                ← Prev
              </button>
              <span className="day-info">
                {new Date(days[currentDayIndex].dateObj).toLocaleDateString('en-US', {
                  weekday: 'long',
                  month: 'short',
                  day: 'numeric',
                })}
              </span>
              <button
                className="nav-button next-button"
                onClick={() =>
                  setCurrentDayIndex(Math.min(days.length - 1, currentDayIndex + 1))
                }
                disabled={currentDayIndex === days.length - 1}
              >
                Next →
              </button>
            </div>
          </div>
        )}
        {!loading && days.length === 0 && !data?.error && (
          <article className="day-card">
            <div className="card-scroll">
              <div className="empty-state">
                <h2>Nothing to show</h2>
                <p className="sub">Try again later.</p>
              </div>
            </div>
          </article>
        )}
        {!loading && days.length === 0 && data?.error && (
          <article className="day-card">
            <div className="card-scroll">
              <div className="empty-state">
                <h2>Nothing to show</h2>
                <p className="sub">Check your internet connection or try again later.</p>
              </div>
            </div>
          </article>
        )}
      </main>
    </>
  );
}

export default App;
