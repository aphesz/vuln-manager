import axios from 'axios';
import type { Finding, SLASummary } from '../types';

const API_BASE_URL = '/api';

/**
 * Service for SLA and remediation tracking operations
 */
class SLAService {
  /**
   * Get all findings with SLA tracking
   */
  async getAllFindingsWithSLA(): Promise<Finding[]> {
    const response = await axios.get(`${API_BASE_URL}/findings/sla`);
    return response.data;
  }

  /**
   * Get all overdue findings
   */
  async getOverdueFindings(): Promise<Finding[]> {
    const response = await axios.get(`${API_BASE_URL}/findings/overdue`);
    return response.data;
  }

  /**
   * Update remediation tracking for a finding
   */
  async updateRemediation(
    findingId: number,
    data: {
      remediation_deadline?: string;
      remediation_owner?: string;
      user: string;
    }
  ): Promise<Finding> {
    const response = await axios.patch(
      `${API_BASE_URL}/findings/${findingId}/remediation`,
      data
    );
    return response.data;
  }

  /**
   * Get SLA summary metrics
   */
  async getSLASummary(): Promise<SLASummary> {
    const response = await axios.get(`${API_BASE_URL}/sla-summary`);
    return response.data;
  }
}

export default new SLAService();
