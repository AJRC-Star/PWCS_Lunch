import { useCallback, useEffect, useRef, useState } from 'react';
import { getCachedData, getFreshData } from './api';
import { MENU_SCHEMA_VERSION, SCHOOL_ID } from '../shared/menu-core.js';
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

type MetaStatus = 'fresh' | 'stale' | 'offline';

function getMetaStatus(meta: MenuData['meta']): MetaStatus {
  if (meta.isOffline) return 'offline';
  if (meta.isStale) return 'stale';
  return 'fresh';
}

function formatFreshnessLabel(meta: MenuData['meta']): string {
  if (meta.isOffline) return 'Offline — showing cached menu';
  if (meta.isStale) return 'Menu may be outdated';
  return "This week's menu";
}

function getEmptyStateMessage(data: MenuData | null): string {
  if (data?.errorType === 'invalid_snapshot') {
    return 'The latest menu snapshot was rejected as invalid. Wait a few minutes, then tap Refresh Menu.';
  }

  if (data?.errorType === 'snapshot_unavailable') {
    return 'The weekly menu snapshot is unavailable right now. Tap Refresh Menu to try again.';
  }

  return data?.error
    ? 'Check your internet connection, then tap Refresh Menu.'
    : 'Tap Refresh Menu to try again.';
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
  const [bgRefreshing, setBgRefreshing] = useState(false);
  const [showSwipeHint, setShowSwipeHint] = useState(false);
  const retryControllerRef = useRef<AbortController | null>(null);
  const mainRef = useRef<HTMLElement>(null);
  const selectedIndexRef = useRef(0);
  const daysLengthRef = useRef(0);
  const autoSelectedRef = useRef(false);
  const hintShownRef = useRef(false);
  const daysRef = useRef<MenuData['days']>([]);

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
          if (hasCachedDays) setBgRefreshing(true);
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
            setBgRefreshing(false);
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
          setBgRefreshing(false);
        }
      } catch (e) {
        if (signal.aborted) return;
        setBgRefreshing(false);
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

  // Sync refs so the stable event-listener effects always read current values.
  selectedIndexRef.current = selectedIndex;
  daysLengthRef.current = days.length;
  daysRef.current = days;

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

  // `t` key jumps to today from anywhere in the app (H7 accelerator).
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 't' && e.key !== 'T') return;
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) return;
      const todayIdx = daysRef.current.findIndex((d) => d.today);
      if (todayIdx >= 0 && todayIdx !== selectedIndexRef.current) {
        const direction = todayIdx > selectedIndexRef.current ? 'left' : 'right';
        setSwipeDirection(direction);
        setSelectedIndex(todayIdx);
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, []); // stable: reads current values via refs

  // Show a brief swipe hint on first data load this session.
  useEffect(() => {
    if (days.length > 1 && !hintShownRef.current) {
      hintShownRef.current = true;
      if (!sessionStorage.getItem('bms-lunch-hint-shown')) {
        sessionStorage.setItem('bms-lunch-hint-shown', '1');
        setShowSwipeHint(true);
        const id = setTimeout(() => setShowSwipeHint(false), 2500);
        return () => clearTimeout(id);
      }
    }
  }, [days.length]);

  const allNoSchool = days.length >= 3 && days.every((d) => d.no_school);
  const nextTheme = theme === 'dark' ? 'light' : 'dark';
  const todayIndex = days.findIndex((d) => d.today);
  const isOnToday = todayIndex === -1 || selectedIndex === todayIndex;

  return (
    <div id="app">
      {data?.error && (
        <div className="error-banner" role="alert">{data.error}</div>
      )}

      <header>
        <div className="title">
          <h1>BMS Lunch</h1>
          <div className="meta-row">
            <span className="caption">
              {data?.meta ? (
                <>
                  <span
                    className={`status-dot status-dot--${getMetaStatus(data.meta)}${bgRefreshing ? ' status-dot--refreshing' : ''}`}
                    aria-hidden="true"
                  />
                  {formatFreshnessLabel(data.meta)}
                </>
              ) : '—'}
            </span>
            {!isOnToday && todayIndex >= 0 && (
              <button
                className="today-shortcut"
                type="button"
                onClick={() => handleSelectDay(todayIndex)}
                aria-label="Jump to today's menu"
              >
                Today
              </button>
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
      {showSwipeHint && (
        <p className="swipe-hint" aria-hidden="true">Swipe left or right to browse days</p>
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
              {retrying ? 'Refreshing…' : 'Refresh Menu'}
            </button>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
