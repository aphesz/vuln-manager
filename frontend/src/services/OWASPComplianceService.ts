/**
 * OWASP Top 10 Compliance Service
 * 
 * Provides API methods for fetching OWASP Top 10 2021 compliance data
 */

const API_BASE_URL = '/api';

export interface OWASPCategory {
  name: string;
  description: string;
  finding_count: number;
  has_findings: boolean;
}

export interface OWASPStatistics {
  total_categories: number;
  categories_with_findings: number;
  categories_without_findings: number;
  coverage_percentage: number;
  total_findings: number;
  unmapped_findings: number;
  total_findings_in_project: number;
  most_common_category: string | null;
  most_common_category_count: number;
}

export interface OWASPCoverageResponse {
  categories: Record<string, OWASPCategory>;
  statistics: OWASPStatistics;
}

class OWASPComplianceService {
  /**
   * Get OWASP Top 10 2021 coverage for a project
   */
  async getCoverage(projectId: number): Promise<OWASPCoverageResponse> {
    try {
      const response = await fetch(
        `${API_BASE_URL}/projects/${projectId}/compliance/owasp-top-10`
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch OWASP coverage: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching OWASP coverage:', error);
      throw error;
    }
  }

  /**
   * Get category color based on finding count
   */
  getCategoryColor(count: number): string {
    if (count === 0) return '#9e9e9e'; // Gray - no findings
    if (count <= 2) return '#4caf50'; // Green - low
    if (count <= 5) return '#ff9800'; // Orange - medium
    return '#f44336'; // Red - high
  }

  /**
   * Get coverage status color
   */
  getCoverageStatusColor(percentage: number): string {
    if (percentage >= 80) return '#f44336'; // Red - high coverage (bad)
    if (percentage >= 50) return '#ff9800'; // Orange - medium coverage
    if (percentage >= 20) return '#2196f3'; // Blue - low coverage
    return '#4caf50'; // Green - very low coverage (good)
  }

  /**
   * Sort categories by finding count (descending)
   */
  sortCategoriesByCount(
    categories: Record<string, OWASPCategory>
  ): Array<[string, OWASPCategory]> {
    return Object.entries(categories).sort(
      (a, b) => b[1].finding_count - a[1].finding_count
    );
  }
}

// Export singleton instance
export default new OWASPComplianceService();
