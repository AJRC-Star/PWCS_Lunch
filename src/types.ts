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
    schemaVersion?: number;
    source: 'fresh' | 'offline' | 'preview';
    /** Human-readable fetch time shown in the header (e.g. "10:32 AM"). */
    lastUpdated: string;
    /**
     * ISO timestamp for when the normalized menu snapshot was generated.
     * This reflects artifact creation time, not an upstream MealViewer
     * publish timestamp.
     */
    snapshotGeneratedAt?: string;
    /**
     * Unix epoch ms recorded when the browser saved this payload to the local
     * cache.  Used to enforce the 4-hour TTL and to display "cached X ago".
     */
    clientFetchedAt?: number;
    /** True when the cached entry is older than the 4-hour TTL. */
    isStale?: boolean;
    isOffline: boolean;
    isPreview: boolean;
    schoolName: string;
  };
  error?: string;
}
