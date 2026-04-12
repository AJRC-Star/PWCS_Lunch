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
  no_information_provided?: boolean;
  sections: MenuItem[];
}

export interface MenuData {
  days: MenuDay[];
  meta: {
    source: 'fresh' | 'cache' | 'offline' | 'preview';
    /** Human-readable fetch time shown in the header (e.g. "10:32 AM"). */
    lastUpdated: string;
    /**
     * ISO timestamp from the data source (menu-data.json meta or live API
     * normalisation).  Represents when the underlying menu data was produced,
     * NOT when the browser fetched it.
     */
    sourceUpdatedAt?: string;
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
