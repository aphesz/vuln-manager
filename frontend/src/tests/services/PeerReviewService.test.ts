import { describe, it, expect, vi, beforeEach } from 'vitest';
import axios from 'axios';
import PeerReviewService from '../../services/PeerReviewService';
import { ReviewStatus } from '../../types';

vi.mock('axios');
const mockedAxios = vi.mocked(axios);

describe('PeerReviewService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('updateReviewStatus', () => {
    it('should update review status successfully', async () => {
      const findingId = 1;
      const status = 'Approved' as ReviewStatus;
      const user = 'test_user';

      mockedAxios.patch.mockResolvedValue({ data: {} });

      await PeerReviewService.updateReviewStatus(findingId, status, user);

      expect(mockedAxios.patch).toHaveBeenCalledWith(
        `/api/findings/${findingId}/review`,
        { review_status: status, user }
      );
    });

    it('should handle errors when updating status', async () => {
      const findingId = 1;
      const status = 'Rejected' as ReviewStatus;
      const user = 'test_user';

      mockedAxios.patch.mockRejectedValue(new Error('Network error'));

      await expect(
        PeerReviewService.updateReviewStatus(findingId, status, user)
      ).rejects.toThrow('Network error');
    });
  });

  describe('addComment', () => {
    it('should add comment successfully', async () => {
      const findingId = 1;
      const text = 'This looks good';
      const user = 'test_user';
      const mockResponse = {
        data: {
          id: 100,
          finding_id: findingId,
          text,
          user,
          created_at: '2025-11-01T12:00:00Z',
        },
      };

      mockedAxios.post.mockResolvedValue(mockResponse);

      const result = await PeerReviewService.addComment(findingId, text, user);

      expect(mockedAxios.post).toHaveBeenCalledWith(
        `/api/findings/${findingId}/comments`,
        { text, user }
      );
      expect(result).toEqual(mockResponse.data);
    });

    it('should reject comments over 5000 characters', async () => {
      const findingId = 1;
      const longComment = 'a'.repeat(5001);
      const user = 'test_user';

      mockedAxios.post.mockRejectedValue({
        response: { data: { detail: 'Comment exceeds maximum length' } },
      });

      await expect(
        PeerReviewService.addComment(findingId, longComment, user)
      ).rejects.toThrow();
    });
  });

  describe('getComments', () => {
    it('should fetch comments successfully', async () => {
      const findingId = 1;
      const mockComments = [
        {
          id: 1,
          finding_id: findingId,
          comment_text: 'First comment',
          created_by: 'user1',
          created_at: '2025-11-01T10:00:00Z',
        },
        {
          id: 2,
          finding_id: findingId,
          comment_text: 'Second comment',
          created_by: 'user2',
          created_at: '2025-11-01T11:00:00Z',
        },
      ];

      mockedAxios.get.mockResolvedValue({ data: mockComments });

      const result = await PeerReviewService.getComments(findingId);

      expect(mockedAxios.get).toHaveBeenCalledWith(`/api/findings/${findingId}/comments`);
      expect(result).toEqual(mockComments);
      expect(result).toHaveLength(2);
    });
  });

  describe('getAuditLog', () => {
    it('should fetch audit log successfully', async () => {
      const findingId = 1;
      const mockAuditLog = [
        {
          id: 1,
          entity_type: 'finding',
          entity_id: findingId,
          action: 'status_changed',
          old_value: 'Pending',
          new_value: 'In Review',
          user: 'user1',
          timestamp: '2025-11-01T09:00:00Z',
        },
        {
          id: 2,
          entity_type: 'finding',
          entity_id: findingId,
          action: 'status_changed',
          old_value: 'In Review',
          new_value: 'Approved',
          user: 'user2',
          timestamp: '2025-11-01T12:00:00Z',
        },
      ];

      mockedAxios.get.mockResolvedValue({ data: mockAuditLog });

      const result = await PeerReviewService.getAuditLog({
        entity_type: 'finding',
        entity_id: findingId,
      });

      expect(mockedAxios.get).toHaveBeenCalledWith('/api/audit-log', {
        params: { entity_type: 'finding', entity_id: findingId },
      });
      expect(result).toEqual(mockAuditLog);
    });
  });
});
