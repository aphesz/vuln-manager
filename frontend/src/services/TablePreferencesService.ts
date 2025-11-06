/**
 * Service for managing customizable table view configurations
 */

export interface TablePreset {
  id: string;
  name: string;
  description: string;
  visibleColumns: string[];
  columnWidths?: Record<string, number>;
  sortModel?: Array<{ field: string; sort: 'asc' | 'desc' }>;
  filterModel?: any;
  density?: 'compact' | 'standard' | 'comfortable';
}

export interface TablePreferences {
  activePresetId: string | null;
  presets: TablePreset[];
}

// Default presets
const DEFAULT_PRESETS: TablePreset[] = [
  {
    id: 'security-view',
    name: 'Security Focus',
    description: 'Essential security information for vulnerability assessment',
    visibleColumns: ['title', 'risk_rating', 'instance_count', 'review_status', 'issue_status'],
    density: 'compact',
  },
  {
    id: 'management-view',
    name: 'Management Overview',
    description: 'High-level view for project management and tracking',
    visibleColumns: ['title', 'risk_rating', 'sla_status', 'remediation_deadline', 'remediation_owner', 'jira_issue_key'],
    density: 'standard',
  },
  {
    id: 'developer-view',
    name: 'Developer Details',
    description: 'Technical details for developers fixing vulnerabilities',
    visibleColumns: ['title', 'risk_rating', 'description', 'remediation', 'instance_count', 'tags'],
    density: 'comfortable',
  },
  {
    id: 'full-view',
    name: 'Complete View',
    description: 'All available columns for comprehensive analysis',
    visibleColumns: [
      'title',
      'risk_rating',
      'description',
      'remediation',
      'instance_count',
      'review_status',
      'issue_status',
      'sla_status',
      'remediation_deadline',
      'remediation_owner',
      'jira_issue_key',
      'tags',
    ],
    density: 'standard',
  },
];

class TablePreferencesService {
  private static instance: TablePreferencesService;
  private readonly storageKey = 'vuln-manager-table-preferences';
  private preferences: TablePreferences;

  private constructor() {
    this.preferences = this.loadPreferences();
  }

  static getInstance(): TablePreferencesService {
    if (!TablePreferencesService.instance) {
      TablePreferencesService.instance = new TablePreferencesService();
    }
    return TablePreferencesService.instance;
  }

  /**
   * Load preferences from localStorage
   */
  private loadPreferences(): TablePreferences {
    try {
      const stored = localStorage.getItem(this.storageKey);
      if (stored) {
        const parsed = JSON.parse(stored);
        // Merge with default presets to ensure they're always available
        const presets = [...DEFAULT_PRESETS];
        if (parsed.presets) {
          // Add custom presets
          const customPresets = parsed.presets.filter(
            (p: TablePreset) => !DEFAULT_PRESETS.find((dp) => dp.id === p.id)
          );
          presets.push(...customPresets);
        }
        return {
          activePresetId: parsed.activePresetId || null,
          presets,
        };
      }
    } catch (error) {
      console.error('Failed to load table preferences:', error);
    }

    return {
      activePresetId: null,
      presets: DEFAULT_PRESETS,
    };
  }

  /**
   * Save preferences to localStorage
   */
  private savePreferences(): void {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(this.preferences));
    } catch (error) {
      console.error('Failed to save table preferences:', error);
    }
  }

  /**
   * Get all preferences
   */
  getPreferences(): TablePreferences {
    return { ...this.preferences };
  }

  /**
   * Get all available presets
   */
  getPresets(): TablePreset[] {
    return [...this.preferences.presets];
  }

  /**
   * Get a specific preset by ID
   */
  getPreset(id: string): TablePreset | undefined {
    return this.preferences.presets.find((p) => p.id === id);
  }

  /**
   * Get the active preset
   */
  getActivePreset(): TablePreset | null {
    if (!this.preferences.activePresetId) {
      return null;
    }
    return this.getPreset(this.preferences.activePresetId) || null;
  }

  /**
   * Set the active preset
   */
  setActivePreset(presetId: string | null): void {
    if (presetId && !this.getPreset(presetId)) {
      throw new Error(`Preset "${presetId}" not found`);
    }
    this.preferences.activePresetId = presetId;
    this.savePreferences();
  }

  /**
   * Create a new custom preset
   */
  createPreset(preset: Omit<TablePreset, 'id'>): TablePreset {
    const id = `custom-${Date.now()}`;
    const newPreset: TablePreset = {
      ...preset,
      id,
    };
    this.preferences.presets.push(newPreset);
    this.savePreferences();
    return newPreset;
  }

  /**
   * Update an existing preset (only custom presets can be updated)
   */
  updatePreset(id: string, updates: Partial<Omit<TablePreset, 'id'>>): void {
    const index = this.preferences.presets.findIndex((p) => p.id === id);
    if (index === -1) {
      throw new Error(`Preset "${id}" not found`);
    }

    // Prevent updating default presets
    if (DEFAULT_PRESETS.find((p) => p.id === id)) {
      throw new Error('Cannot update default presets. Create a custom preset instead.');
    }

    this.preferences.presets[index] = {
      ...this.preferences.presets[index],
      ...updates,
    };
    this.savePreferences();
  }

  /**
   * Delete a custom preset
   */
  deletePreset(id: string): void {
    // Prevent deleting default presets
    if (DEFAULT_PRESETS.find((p) => p.id === id)) {
      throw new Error('Cannot delete default presets');
    }

    const index = this.preferences.presets.findIndex((p) => p.id === id);
    if (index === -1) {
      throw new Error(`Preset "${id}" not found`);
    }

    this.preferences.presets.splice(index, 1);

    // Clear active preset if it was deleted
    if (this.preferences.activePresetId === id) {
      this.preferences.activePresetId = null;
    }

    this.savePreferences();
  }

  /**
   * Export preferences as JSON
   */
  exportPreferences(): string {
    return JSON.stringify(this.preferences, null, 2);
  }

  /**
   * Import preferences from JSON
   */
  importPreferences(json: string): void {
    try {
      const imported = JSON.parse(json);
      
      // Validate structure
      if (!imported.presets || !Array.isArray(imported.presets)) {
        throw new Error('Invalid preferences format');
      }

      // Keep default presets, add custom ones
      const customPresets = imported.presets.filter(
        (p: TablePreset) => !DEFAULT_PRESETS.find((dp) => dp.id === p.id)
      );

      this.preferences = {
        activePresetId: imported.activePresetId || null,
        presets: [...DEFAULT_PRESETS, ...customPresets],
      };

      this.savePreferences();
    } catch (error) {
      throw new Error(`Failed to import preferences: ${error}`);
    }
  }

  /**
   * Reset to default presets
   */
  resetToDefaults(): void {
    this.preferences = {
      activePresetId: null,
      presets: DEFAULT_PRESETS,
    };
    this.savePreferences();
  }
}

export default TablePreferencesService;
