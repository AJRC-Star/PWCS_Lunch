import { useCallback, useEffect, useRef, useState } from 'react';
import { getCachedData, getFreshData } from './api';
import { MENU_SCHEMA_VERSION, SCHOOL_ID, SCHOOL_TIMEZONE } from '../shared/menu-core.js';
import type { MenuData } from './types';
import { DayCard } from './components/DayCard';
import { DayTabs } from './components/DayTabs';
import { SkeletonLoader } from './components/SkeletonLoader';
import './App.css';

type Theme = 'light' | 'dark';
type ThemePreference = Theme | 'system';

const THEME_STORAGE_KEY = 'bms-lunch-theme-preference';
const THEME_META_SELECTOR = 'meta[name="theme-color"]';
const DATE_QUERY_PARAM = 'date';
const THEME_COLORS: Record<Theme, string> = {
  dark: '#08080f',
  light: '#f5f5f7',
};
const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function getSystemTheme(): Theme {
  return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
}

function formatFreshnessLabel(meta: MenuData['meta']): string {
  if (meta.isOffline) return '⚠️ Offline — showing cached menu';

  if (meta.snapshotGeneratedAt) {
    const d = new Date(meta.snapshotGeneratedAt);
    const date = d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      timeZone: SCHOOL_TIMEZONE,
    });
    const time = d.toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
      timeZone: SCHOOL_TIMEZONE,
    });
    const staleWarning = meta.isStale ? ' · may be stale' : '';
    const prefix = meta.source === 'artifact-cache'
      ? 'Cached menu updated'
      : 'Menu updated';
    return `${prefix} ${date} at ${time}${staleWarning}`;
  }

  const staleWarning = meta.isStale ? ' · may be stale' : '';
  return `Menu updated ${meta.lastUpdated || '—'}${staleWarning}`;
}

function getEmptyStateMessage(data: MenuData | null): string {
  if (data?.errorType === 'invalid_snapshot') {
    return 'The latest published menu snapshot was rejected because it looked invalid or incomplete. Please try again later.';
  }

  if (data?.errorType === 'snapshot_unavailable') {
    return 'The published weekly menu snapshot is unavailable right now. Please try again later.';
  }

  return data?.error ? 'Check your internet connection or try again later.' : 'Try again later.';
}

function getInitialThemePreference(): ThemePreference {
  if (typeof window === 'undefined') return 'system';

  const storedTheme = window.localStorage.getItem(THEME_STORAGE_KEY);
  if (storedTheme === 'light' || storedTheme === 'dark') {
    return storedTheme;
  }

  return 'system';
}

function getInitialTheme(themePreference: ThemePreference): Theme {
  if (typeof window === 'undefined') return 'dark';
  return themePreference === 'system' ? getSystemTheme() : themePreference;
}

function getRequestedDateFromUrl(): string | null {
  if (typeof window === 'undefined') return null;

  const requestedDate = new URLSearchParams(window.location.search).get(DATE_QUERY_PARAM);
  return requestedDate && ISO_DATE_RE.test(requestedDate) ? requestedDate : null;
}

function replaceSelectedDateInUrl(iso: string): void {
  if (typeof window === 'undefined') return;

  const url = new URL(window.location.href);
  if (url.searchParams.get(DATE_QUERY_PARAM) === iso) return;

  url.searchParams.set(DATE_QUERY_PARAM, iso);
  window.history.replaceState({}, '', `${url.pathname}${url.search}${url.hash}`);
}

function App() {
  const [data, setData] = useState<MenuData | null>(null);
  const [loading, setLoading] = useState(true);
  const [retrying, setRetrying] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [themePreference, setThemePreference] = useState<ThemePreference>(getInitialThemePreference);
  // Derive the concrete theme from the stored preference, converting 'system'
  // to the actual OS value via getSystemTheme().  getInitialThemePreference()
  // is called a second time here (two localStorage reads on mount) because
  // useState does not expose its lazy-init result to sibling useState calls.
  const [theme, setTheme] = useState<Theme>(() => getInitialTheme(getInitialThemePreference()));
  const [swipeDirection, setSwipeDirection] = useState<'left' | 'right' | null>(null);
  const retryControllerRef = useRef<AbortController | null>(null);
  const mainRef = useRef<HTMLElement>(null);
  const selectedIndexRef = useRef(0);
  const daysLengthRef = useRef(0);
  const autoSelectedRef = useRef(false);

  useEffect(() => {
    if (themePreference === 'system') {
      window.localStorage.removeItem(THEME_STORAGE_KEY);
    } else {
      window.localStorage.setItem(THEME_STORAGE_KEY, themePreference);
    }
  }, [themePreference]);

  useEffect(() => {
    if (themePreference === 'system') {
      setTheme(getSystemTheme());
      const media = window.matchMedia('(prefers-color-scheme: light)');
      const onChange = () => setTheme(media.matches ? 'light' : 'dark');
      if (typeof media.addEventListener === 'function') {
        media.addEventListener('change', onChange);
        return () => media.removeEventListener('change', onChange);
      }

      media.addListener(onChange);
      return () => media.removeListener(onChange);
    }

    setTheme(themePreference);
  }, [themePreference]);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.documentElement.style.colorScheme = theme;

    const themeMeta = document.querySelector<HTMLMetaElement>(THEME_META_SELECTOR);
    if (themeMeta) {
      themeMeta.setAttribute('content', THEME_COLORS[theme]);
    }
  }, [theme]);

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
        let timeoutId: ReturnType<typeof setTimeout> | null = null;

        // Race the network against a 10-second UI deadline so cached data is
        // never blocked for more than 10 s.  Crucially, we keep `freshRequest`
        // alive either way and always attach a .then() so the session updates
        // when the response eventually arrives.
        const timedOut = await Promise.race([
          freshRequest.then(() => false).catch(() => false),
          new Promise<true>((resolve) => {
            timeoutId = setTimeout(() => resolve(true), 10000);
          }),
        ]);
        if (timeoutId !== null) {
          clearTimeout(timeoutId);
        }

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
            schemaVersion: MENU_SCHEMA_VERSION,
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
    return () => {
      controller.abort();
      retryControllerRef.current?.abort();
      retryControllerRef.current = null;
    };
  }, []);

  const handleRetry = async () => {
    if (retryControllerRef.current) return;

    const controller = new AbortController();
    retryControllerRef.current = controller;
    setRetrying(true);

    try {
      const freshData = await getFreshData({
        cacheBustKey: String(Date.now()),
        signal: controller.signal,
      });
      if (!controller.signal.aborted) {
        setData(freshData);
        setLoading(false);
      }
    } catch {
      if (!controller.signal.aborted) {
        setData({
          days: [],
          meta: {
            schemaVersion: MENU_SCHEMA_VERSION,
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
    } finally {
      if (retryControllerRef.current === controller) {
        retryControllerRef.current = null;
      }
      if (!controller.signal.aborted) {
        setRetrying(false);
      }
    }
  };

  const days = data?.days || [];

  // Clamp selectedIndex when days array changes
  useEffect(() => {
    setSelectedIndex((i) => Math.min(i, Math.max(days.length - 1, 0)));
  }, [days.length]);

  // Jump to today's day on first data load
  useEffect(() => {
    if (autoSelectedRef.current || days.length === 0) return;
    autoSelectedRef.current = true;
    const requestedDate = getRequestedDateFromUrl();
    const requestedIndex = requestedDate
      ? days.findIndex((d) => d.iso === requestedDate)
      : -1;
    if (requestedIndex >= 0) {
      setSelectedIndex(requestedIndex);
      return;
    }

    const todayIndex = days.findIndex((d) => d.today);
    if (todayIndex >= 0) setSelectedIndex(todayIndex);
  }, [days.length]);

  useEffect(() => {
    const selectedDay = days[selectedIndex];
    if (!selectedDay) return;
    replaceSelectedDateInUrl(selectedDay.iso);
  }, [days, selectedIndex]);

  const handleSelectDay = useCallback((newIndex: number) => {
    if (newIndex === selectedIndex) return;
    setSwipeDirection(newIndex > selectedIndex ? 'left' : 'right');
    setSelectedIndex(newIndex);
  }, [selectedIndex]);

  // Sync refs so the stable touch-listener effect always reads current values.
  selectedIndexRef.current = selectedIndex;
  daysLengthRef.current = days.length;

  // Attach swipe listeners to document in capture phase with passive:false on
  // both touchstart and touchmove. On iOS Safari/PWA, if touchstart is passive
  // the browser pre-commits to scroll before our touchmove can call
  // preventDefault() — making the swipe silently fail. Capture phase ensures
  // we intercept before iOS's internal scroll handler claims the gesture.
  useEffect(() => {
    let startX = 0;
    let startY = 0;
    let tracking = false;
    let isHorizontal: boolean | null = null;

    const onStart = (e: TouchEvent) => {
      const mainEl = mainRef.current;
      if (!mainEl || !mainEl.contains(e.target as Node)) return;
      tracking = true;
      startX = e.touches[0].clientX;
      startY = e.touches[0].clientY;
      isHorizontal = null;
    };

    const onMove = (e: TouchEvent) => {
      if (!tracking) return;
      if (isHorizontal === null) {
        const dx = Math.abs(e.touches[0].clientX - startX);
        const dy = Math.abs(e.touches[0].clientY - startY);
        if (dx > 6 || dy > 6) isHorizontal = dx > dy;
      }
      if (isHorizontal) e.preventDefault();
    };

    const onEnd = (e: TouchEvent) => {
      if (!tracking || !isHorizontal) { tracking = false; return; }
      tracking = false;
      const delta = e.changedTouches[0].clientX - startX;
      if (Math.abs(delta) < 40) return;
      const idx = selectedIndexRef.current;
      const len = daysLengthRef.current;
      if (delta < 0 && idx < len - 1) {
        setSwipeDirection('left');
        setSelectedIndex(idx + 1);
      } else if (delta > 0 && idx > 0) {
        setSwipeDirection('right');
        setSelectedIndex(idx - 1);
      }
    };

    document.addEventListener('touchstart', onStart, { passive: false, capture: true });
    document.addEventListener('touchmove', onMove, { passive: false, capture: true });
    document.addEventListener('touchend', onEnd, { passive: true });
    return () => {
      document.removeEventListener('touchstart', onStart, { capture: true });
      document.removeEventListener('touchmove', onMove, { capture: true });
      document.removeEventListener('touchend', onEnd);
    };
  }, []); // stable: setState setters never change; current values read via refs

  const allNoSchool = days.length >= 3 && days.every((d) => d.no_school);
  const nextTheme = theme === 'dark' ? 'light' : 'dark';

  return (
    <div id="app">
      {data?.error && (
        <div className="error-banner" role="alert">{data.error}</div>
      )}

      <header>
        <div className="title">
          <h1>🍔 BMS Lunch</h1>
          <div className="meta-row">
            <span className="caption">
              {data?.meta ? formatFreshnessLabel(data.meta) : '—'}
            </span>
            {days.length > 0 && (
              <span className="day-counter">Day {selectedIndex + 1} of {days.length}</span>
            )}
          </div>
        </div>
        <button
          className="theme-toggle"
          type="button"
          onClick={() => setThemePreference(nextTheme)}
          aria-label={`Switch to ${nextTheme} mode`}
          title={`Switch to ${nextTheme} mode`}
        >
          <span className="theme-toggle-icon" aria-hidden="true">
            {theme === 'dark' ? '☀️' : '🌙'}
          </span>
        </button>
      </header>

      {!loading && days.length > 0 && !allNoSchool && (
        <DayTabs
          days={days}
          selectedIndex={selectedIndex}
          onSelect={handleSelectDay}
        />
      )}

      <main ref={mainRef}>
        {loading && <SkeletonLoader />}
        {!loading && allNoSchool && (
          <div className="no-school-week">
            <span className="no-school-emoji">☀️</span>
            <h2 className="no-school-title">No School This Week</h2>
            <p className="sub">Enjoy the break — see you when school's back!</p>
          </div>
        )}
        {!loading && days.length > 0 && !allNoSchool && days[selectedIndex] && (
          <DayCard
            key={selectedIndex}
            day={days[selectedIndex]}
            direction={swipeDirection}
          />
        )}
        {!loading && days.length === 0 && (
          <div className="empty-state">
            <h2>Nothing to show</h2>
            <p className="sub">{getEmptyStateMessage(data)}</p>
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
