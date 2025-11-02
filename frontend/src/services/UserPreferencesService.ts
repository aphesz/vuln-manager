interface UserPreferences {
  // Theme preferences
  themeMode?: 'light' | 'dark'; // Explicitly set theme (null = use system preference)
  systemPreferenceTracking?: boolean; // Whether to follow system theme changes
  
  // Timezone & Locale preferences
  timezone?: string; // IANA timezone (e.g., 'Asia/Kuala_Lumpur')
  dateFormat?: string; // Date format string
  locale?: string; // Locale code (e.g., 'en_MY')
  
  // Table preferences
  tableColumns: {
    [key: string]: {
      visible: boolean;
      width?: number;
      order: number;
    };
  };
  pageSize: number;
  defaultRiskFilter: string;
  dashboardLayout: {
    [key: string]: {
      x: number;
      y: number;
      w: number;
      h: number;
    };
  };
}

const DEFAULT_PREFERENCES: UserPreferences = {
  themeMode: undefined, // Use system preference by default
  systemPreferenceTracking: true, // Track system theme changes
  timezone: 'Asia/Kuala_Lumpur', // Default to GMT+8 (Malaysia Time)
  dateFormat: 'YYYY-MM-DD HH:mm:ss z', // Default date format
  locale: 'en-MY', // Malaysian English
  tableColumns: {
    title: { visible: true, width: 300, order: 0 },
    risk_rating: { visible: true, width: 120, order: 1 },
    instances: { visible: true, width: 100, order: 2 },
    description: { visible: false, order: 3 },
  },
  pageSize: 25,
  defaultRiskFilter: 'All',
  dashboardLayout: {
    riskChart: { x: 0, y: 0, w: 6, h: 4 },
    findingsTable: { x: 0, y: 4, w: 12, h: 8 },
    recentActivity: { x: 6, y: 0, w: 6, h: 4 },
  },
};

class UserPreferencesService {
  private static instance: UserPreferencesService;
  private preferences: UserPreferences;
  private storageKey = 'userPreferences';

  private constructor() {
    this.preferences = this.loadPreferencesSecurely();
  }

  static getInstance(): UserPreferencesService {
    if (!UserPreferencesService.instance) {
      UserPreferencesService.instance = new UserPreferencesService();
    }
    return UserPreferencesService.instance;
  }

  /**
   * Securely load preferences from localStorage with validation.
   * Returns defaults if storage is unavailable or corrupted.
   */
  private loadPreferencesSecurely(): UserPreferences {
    try {
      const saved = localStorage.getItem(this.storageKey);
      if (!saved) {
        return { ...DEFAULT_PREFERENCES };
      }

      // Parse and validate structure
      const parsed = JSON.parse(saved);
      
      // Security: Validate themeMode is one of allowed values
      if (parsed.themeMode && !['light', 'dark'].includes(parsed.themeMode)) {
        console.warn('Invalid theme mode in storage, using default');
        parsed.themeMode = DEFAULT_PREFERENCES.themeMode;
      }

      // Merge with defaults to ensure all required fields exist
      return {
        ...DEFAULT_PREFERENCES,
        ...parsed,
        // Recursively merge nested objects
        tableColumns: { ...DEFAULT_PREFERENCES.tableColumns, ...parsed.tableColumns },
        dashboardLayout: { ...DEFAULT_PREFERENCES.dashboardLayout, ...parsed.dashboardLayout },
      };
    } catch (e) {
      console.warn('Failed to load preferences from storage:', e);
      return { ...DEFAULT_PREFERENCES };
    }
  }

  getPreferences(): UserPreferences {
    return { ...this.preferences };
  }

  updatePreferences(updates: Partial<UserPreferences>): void {
    // Security: Validate theme mode if provided
    if (updates.themeMode && !['light', 'dark'].includes(updates.themeMode)) {
      console.error('Invalid theme mode, ignoring update');
      return;
    }

    this.preferences = {
      ...this.preferences,
      ...updates,
    };
    this.savePreferences();
  }

  resetPreferences(): void {
    this.preferences = { ...DEFAULT_PREFERENCES };
    this.savePreferences();
  }

  // Theme preference methods
  getThemeMode(): 'light' | 'dark' | undefined {
    return this.preferences.themeMode;
  }

  setThemeMode(mode: 'light' | 'dark'): void {
    if (!['light', 'dark'].includes(mode)) {
      console.error('Invalid theme mode:', mode);
      return;
    }
    this.updatePreferences({ themeMode: mode });
  }

  getSystemPreferenceTracking(): boolean {
    return this.preferences.systemPreferenceTracking ?? DEFAULT_PREFERENCES.systemPreferenceTracking!;
  }

  setSystemPreferenceTracking(enabled: boolean): void {
    this.updatePreferences({ systemPreferenceTracking: enabled });
  }

  // Timezone & Locale methods
  getTimezone(): string {
    return this.preferences.timezone || DEFAULT_PREFERENCES.timezone!;
  }

  setTimezone(timezone: string): void {
    this.updatePreferences({ timezone });
  }

  getDateFormat(): string {
    return this.preferences.dateFormat || DEFAULT_PREFERENCES.dateFormat!;
  }

  setDateFormat(format: string): void {
    this.updatePreferences({ dateFormat: format });
  }

  getLocale(): string {
    return this.preferences.locale || DEFAULT_PREFERENCES.locale!;
  }

  setLocale(locale: string): void {
    this.updatePreferences({ locale });
  }

  // Column-specific methods
  updateColumnVisibility(columnId: string, visible: boolean): void {
    if (this.preferences.tableColumns[columnId]) {
      this.preferences.tableColumns[columnId].visible = visible;
      this.savePreferences();
    }
  }

  updateColumnOrder(columnId: string, order: number): void {
    if (this.preferences.tableColumns[columnId]) {
      this.preferences.tableColumns[columnId].order = order;
      this.savePreferences();
    }
  }

  updateColumnWidth(columnId: string, width: number): void {
    if (this.preferences.tableColumns[columnId]) {
      this.preferences.tableColumns[columnId].width = width;
      this.savePreferences();
    }
  }

  // Dashboard layout methods
  updateDashboardLayout(componentId: string, layout: { x: number; y: number; w: number; h: number }): void {
    this.preferences.dashboardLayout[componentId] = layout;
    this.savePreferences();
  }

  private savePreferences(): void {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(this.preferences));
    } catch (e) {
      console.error('Failed to save preferences to storage:', e);
    }
  }
}

export default UserPreferencesService;
export type { UserPreferences };