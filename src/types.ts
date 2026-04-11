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
    lastUpdated: string;
    isOffline: boolean;
    isPreview: boolean;
    schoolName: string;
  };
  error?: string;
}
