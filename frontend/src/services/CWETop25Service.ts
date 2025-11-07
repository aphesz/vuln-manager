/**
 * CWE Top 25 Compliance Service
 * 
 * Provides API methods for fetching CWE Top 25 2024 compliance data
 */

const API_BASE_URL = '/api';

export interface CWEWeakness {
  cwe_id: number;
  name: string;
  rank: number;
  score: number;
  description: string;
  severity: 'Critical' | 'High' | 'Medium' | 'Low';
  finding_count: number;
  has_findings: boolean;
}

export interface CWEStatistics {
  total_weaknesses: number;
  weaknesses_found: number;
  weaknesses_not_found: number;
  coverage_percentage: number;
  total_findings: number;
  critical_findings: number;
  high_findings: number;
  most_common_cwe_id: number | null;
  most_common_cwe_count: number;
  most_common_cwe_name: string | null;
}

export interface CWECoverageResponse {
  weaknesses: CWEWeakness[];
  all_weaknesses: Record<number, Omit<CWEWeakness, 'description'>>;
  statistics: CWEStatistics;
}

class CWETop25Service {
  /**
   * Get CWE Top 25 2024 coverage for a project
   */
  async getCoverage(projectId: number): Promise<CWECoverageResponse> {
    try {
      const response = await fetch(
        `${API_BASE_URL}/projects/${projectId}/compliance/cwe-top-25`
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch CWE coverage: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching CWE coverage:', error);
      throw error;
    }
  }

  /**
   * Get severity color based on severity level
   */
  getSeverityColor(severity: string): string {
    const colors: Record<string, string> = {
      Critical: '#d32f2f',   // Red
      High: '#f57c00',       // Orange
      Medium: '#fbc02d',     // Yellow
      Low: '#388e3c'         // Green
    };
    return colors[severity] || '#757575'; // Gray default
  }

  /**
   * Get coverage status color (inverse - higher coverage is worse)
   */
  getCoverageStatusColor(percentage: number): string {
    if (percentage >= 60) return '#d32f2f'; // Red - high coverage (bad)
    if (percentage >= 40) return '#f57c00'; // Orange - medium coverage
    if (percentage >= 20) return '#fbc02d'; // Yellow - low coverage
    return '#4caf50'; // Green - very low coverage (good)
  }

  /**
   * Format CWE ID for display
   */
  formatCweId(cweId: number): string {
    return `CWE-${cweId}`;
  }

  /**
   * Truncate weakness name for display
   */
  truncateName(name: string, maxLength: number = 50): string {
    if (name.length <= maxLength) return name;
    return name.substring(0, maxLength) + '...';
  }
}

// Export singleton instance
export default new CWETop25Service();
