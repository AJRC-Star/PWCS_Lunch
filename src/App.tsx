import { useEffect, useState, useRef } from 'react';
import { getData } from './api';
import type { MenuData } from './types';
import { DayCard } from './components/DayCard';
import { WeekView } from './components/WeekView';
import { SkeletonLoader } from './components/SkeletonLoader';
import { Navigation } from './components/Navigation';
import './App.css';

function App() {
  const [data, setData] = useState<MenuData | null>(null);
  const [loading, setLoading] = useState(true);
  const [dayCounter, setDayCounter] = useState(0);
  const [viewMode, setViewMode] = useState<'day' | 'week'>('day');
  const contentRef = useRef<HTMLDivElement>(null);

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

          if (isMounted && freshData) {
            const fresh = freshData as MenuData;
            if (fresh.meta.source !== 'cache') {
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

  useEffect(() => {
    if (data?.days && contentRef.current) {
      const container = contentRef.current;
      const cards = container.querySelectorAll('.day-card');
      let idx = 0;
      const probe = container.scrollTop + 12;

      for (let i = 0; i < cards.length; i++) {
        const card = cards[i] as HTMLElement;
        if (card.offsetTop <= probe) {
          idx = i;
        } else {
          break;
        }
      }

      setDayCounter(idx + 1);
    }
  }, [data]);

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
            {days.length > 0 && viewMode === 'day' && (
              <span id="day-counter">
                {dayCounter} / {days.length}
              </span>
            )}
          </div>
        </div>
        {days.length > 0 && (
          <div className="header-controls">
            <div className="view-toggle">
              <button
                className={viewMode === 'day' ? 'active' : ''}
                onClick={() => setViewMode('day')}
              >
                Day
              </button>
              <button
                className={viewMode === 'week' ? 'active' : ''}
                onClick={() => setViewMode('week')}
              >
                Week
              </button>
            </div>
          </div>
        )}
      </header>

      <main id="content" ref={contentRef} className={viewMode === 'week' ? 'week-view' : ''}>
        {loading && <SkeletonLoader />}
        {!loading && days.length > 0 && viewMode === 'day' && (
          <>
            {days.map((day, idx) => (
              <DayCard key={idx} day={day} />
            ))}
          </>
        )}
        {!loading && days.length > 0 && viewMode === 'week' && (
          <WeekView days={days} onDayClick={() => setViewMode('day')} />
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

      {!loading && days.length > 0 && viewMode === 'day' && (
        <Navigation totalDays={days.length} containerRef={contentRef} />
      )}
    </>
  );
}

export default App;
