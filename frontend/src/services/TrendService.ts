/**
 * TrendService - API client for trend analysis endpoints
 * 
 * Provides methods to fetch historical trend data for:
 * - Finding counts over time
 * - Remediation progress and velocity
 * - Risk score evolution
 * - Upload history timeline
 */

import axios from 'axios';

const API_BASE_URL = '/api';

export type Granularity = 'daily' | 'weekly' | 'monthly';

export interface FindingsTimelineResponse {
  labels: string[];
  datasets: {
    Critical: number[];
    High: number[];
    Medium: number[];
    Low: number[];
    Informational: number[];
  };
  totals: {
    Critical: number;
    High: number;
    Medium: number;
    Low: number;
    Informational: number;
  };
}

export interface RemediationProgressResponse {
  labels: string[];
  open_findings: number[];
  closed_findings: number[];
  remediation_velocity: number;
  mean_time_to_remediate: {
    Critical: number | null;
    High: number | null;
    Medium: number | null;
    Low: number | null;
    Informational: number | null;
  };
  by_risk: {
    Critical: { open: number; closed: number };
    High: { open: number; closed: number };
    Medium: { open: number; closed: number };
    Low: { open: number; closed: number };
    Informational: { open: number; closed: number };
  };
}

export interface RiskScoreTrendResponse {
  labels: string[];
  risk_scores: number[];
  trend: 'improving' | 'stable' | 'worsening';
  change_percent: number;
  current_score: number;
  start_score: number;
}

export interface Upload {
  date: string;
  finding_count: number;
  risk_distribution: {
    Critical: number;
    High: number;
    Medium: number;
    Low: number;
    Informational: number;
  };
}

export interface UploadHistoryResponse {
  timeline: Upload[] | null;
  total_uploads: number;
  average_findings_per_upload: number;
}

export interface TrendParams {
  start_date?: string; // ISO format YYYY-MM-DD
  end_date?: string;   // ISO format YYYY-MM-DD
  granularity?: Granularity;
}

class TrendService {
  /**
   * Get finding counts over time grouped by risk rating
   */
  async getFindingsTimeline(
    projectId: number,
    params?: TrendParams
  ): Promise<FindingsTimelineResponse> {
    const response = await axios.get(
      `${API_BASE_URL}/projects/${projectId}/trends/findings`,
      { params }
    );
    return response.data;
  }

  /**
   * Get remediation progress metrics and velocity
   */
  async getRemediationProgress(
    projectId: number,
    params?: TrendParams
  ): Promise<RemediationProgressResponse> {
    const response = await axios.get(
      `${API_BASE_URL}/projects/${projectId}/trends/remediation`,
      { params }
    );
    return response.data;
  }

  /**
   * Get weighted risk score evolution over time
   */
  async getRiskScoreTrend(
    projectId: number,
    params?: TrendParams
  ): Promise<RiskScoreTrendResponse> {
    const response = await axios.get(
      `${API_BASE_URL}/projects/${projectId}/trends/risk-score`,
      { params }
    );
    return response.data;
  }

  /**
   * Get upload history timeline with metrics
   */
  async getUploadHistory(
    projectId: number,
    params?: Omit<TrendParams, 'granularity'>
  ): Promise<UploadHistoryResponse> {
    const response = await axios.get(
      `${API_BASE_URL}/projects/${projectId}/trends/uploads`,
      { params }
    );
    return response.data;
  }
}

export default new TrendService();
