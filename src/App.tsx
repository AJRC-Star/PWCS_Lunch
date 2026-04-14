import { useEffect, useRef, useState } from 'react';
import { getCachedData, getFreshData } from './api';
import { SCHOOL_ID, SCHOOL_TIMEZONE } from '../shared/menu-core.js';
import type { MenuData } from './types';
import { DayCard } from './components/DayCard';
import { DayTabs } from './components/DayTabs';
import { SkeletonLoader } from './components/SkeletonLoader';
import './App.css';

type Theme = 'light' | 'dark';
type ThemePreference = Theme | 'system';

const THEME_STORAGE_KEY = 'bms-lunch-theme-preference';
const THEME_META_SELECTOR = 'meta[name="theme-color"]';
const THEME_COLORS: Record<Theme, string> = {
  dark: '#08080f',
  light: '#f5f5f7',
};

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
    const staleWarning = meta.isStale ? ' · cache may be stale' : '';
    return `Snapshot generated ${date} ${time}${staleWarning}`;
  }

  const staleWarning = meta.isStale ? ' · cache may be stale' : '';
  return `Updated ${meta.lastUpdated || '—'}${staleWarning}`;
}

function getEmptyStateMessage(data: MenuData | null): string {
  if (data?.errorType === 'invalid_snapshot') {
    return 'The latest published menu snapshot was rejected because it looked invalid or incomplete. Please try again later.';
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

function App() {
  const [data, setData] = useState<MenuData | null>(null);
  const [loading, setLoading] = useState(true);
  const [retrying, setRetrying] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [themePreference, setThemePreference] = useState<ThemePreference>(() => getInitialThemePreference());
  const [theme, setTheme] = useState<Theme>(() => getInitialTheme(getInitialThemePreference()));
  const retryControllerRef = useRef<AbortController | null>(null);

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

  const nextTheme = theme === 'dark' ? 'light' : 'dark';

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
