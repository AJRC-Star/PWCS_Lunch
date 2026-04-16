export interface MenuItem {
  title: string;
  items: string[];
  wide?: boolean;
}

export interface MenuDay {
  iso: string;
  dateObj: number;
  today: boolean;
  weekend: boolean;
  no_school: boolean;
  no_information_provided: boolean;
  sections: MenuItem[];
}

export interface MenuData {
  days: MenuDay[];
  meta: {
    schemaVersion: number;
    source: 'artifact' | 'artifact-cache' | 'offline' | 'preview';
    /** Human-readable fetch time shown in the header (e.g. "10:32 AM"). */
    lastUpdated: string;
    /**
     * ISO timestamp for when the normalized menu snapshot was generated.
     * This reflects artifact creation time, not an upstream MealViewer
     * publish timestamp.
     */
    snapshotGeneratedAt?: string;
    /** ISO timestamp for the next expected weekly snapshot refresh. */
    expectedNextRefreshAt?: string;
    /**
     * Unix epoch ms recorded when the browser saved this payload to the local
     * cache.  Used to determine staleness against the weekly refresh schedule
     * and to compute the 7-day absolute stale ceiling.
     */
    clientFetchedAt?: number;
    /** True when the cached entry is past the expected weekly refresh time or the 7-day absolute ceiling. */
    isStale?: boolean;
    isOffline: boolean;
    isPreview: boolean;
    schoolName: string;
  };
  error?: string;
  errorType?: 'offline' | 'invalid_snapshot' | 'snapshot_unavailable';
}
