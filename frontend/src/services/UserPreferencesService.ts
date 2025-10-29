interface UserPreferences {
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

  private constructor() {
    const savedPrefs = localStorage.getItem('userPreferences');
    this.preferences = savedPrefs ? { ...DEFAULT_PREFERENCES, ...JSON.parse(savedPrefs) } : DEFAULT_PREFERENCES;
  }

  static getInstance(): UserPreferencesService {
    if (!UserPreferencesService.instance) {
      UserPreferencesService.instance = new UserPreferencesService();
    }
    return UserPreferencesService.instance;
  }

  getPreferences(): UserPreferences {
    return { ...this.preferences };
  }

  updatePreferences(updates: Partial<UserPreferences>): void {
    this.preferences = {
      ...this.preferences,
      ...updates,
    };
    localStorage.setItem('userPreferences', JSON.stringify(this.preferences));
  }

  resetPreferences(): void {
    this.preferences = { ...DEFAULT_PREFERENCES };
    localStorage.setItem('userPreferences', JSON.stringify(DEFAULT_PREFERENCES));
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
    localStorage.setItem('userPreferences', JSON.stringify(this.preferences));
  }
}

export default UserPreferencesService;
export type { UserPreferences };