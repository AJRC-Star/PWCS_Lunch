import React, { useEffect, useState, useRef } from 'react';
import { getData } from './api';
import type { MenuData } from './types';
import { DayCard } from './components/DayCard';
import { SkeletonLoader } from './components/SkeletonLoader';
import { Navigation } from './components/Navigation';
import './App.css';

function App() {
  const [data, setData] = useState<MenuData | null>(null);
  const [loading, setLoading] = useState(true);
  const [dayCounter, setDayCounter] = useState(0);
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
            {days.length > 0 && (
              <span id="day-counter">
                {dayCounter} / {days.length}
              </span>
            )}
          </div>
        </div>
      </header>

      <main id="content" ref={contentRef}>
        {loading && <SkeletonLoader />}
        {!loading && days.length > 0 && (
          <>
            {days.map((day, idx) => (
              <DayCard key={idx} day={day} />
            ))}
          </>
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

      {!loading && days.length > 0 && (
        <Navigation totalDays={days.length} containerRef={contentRef} />
      )}
    </>
  );
}

export default App;
