import axios from 'axios';
import type { ReviewStatus, Comment, AuditLog } from '../types';

const API_BASE_URL = '/api';

/**
 * Service for peer review workflow operations
 */
class PeerReviewService {
  /**
   * Update the review status of a finding
   */
  async updateReviewStatus(
    findingId: number,
    status: ReviewStatus,
    reviewerName?: string
  ): Promise<void> {
    await axios.patch(`${API_BASE_URL}/findings/${findingId}/review`, {
      status,
      reviewer_name: reviewerName,
    });
  }

  /**
   * Add a comment to a finding
   */
  async addComment(
    findingId: number,
    text: string,
    user: string
  ): Promise<Comment> {
    const response = await axios.post(`${API_BASE_URL}/findings/${findingId}/comments`, {
      text,
      user,
    });
    return response.data;
  }

  /**
   * Get all comments for a finding
   */
  async getComments(findingId: number): Promise<Comment[]> {
    const response = await axios.get(`${API_BASE_URL}/findings/${findingId}/comments`);
    return response.data;
  }

  /**
   * Get audit log entries
   */
  async getAuditLog(params?: {
    entity_type?: string;
    entity_id?: number;
    user?: string;
  }): Promise<AuditLog[]> {
    const response = await axios.get(`${API_BASE_URL}/audit-log`, {
      params,
    });
    return response.data;
  }
}

export default new PeerReviewService();
