import axios from 'axios';
import type { Finding, IssueStatus } from '../types';

const API_BASE_URL = '/api';

/**
 * Service for issue status operations
 */
class IssueStatusService {
  /**
   * Update issue status for a finding
   */
  async updateIssueStatus(
    findingId: number,
    status: IssueStatus,
    comment?: string,
    user: string = 'analyst@example.com'
  ): Promise<Finding> {
    const response = await axios.patch(
      `${API_BASE_URL}/findings/${findingId}/issue-status`,
      {
        issue_status: status,
        issue_status_comment: comment,
        user,
      }
    );
    return response.data;
  }
}

export default new IssueStatusService();
