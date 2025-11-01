import { describe, it, expect, vi, beforeEach } from 'vitest';
import axios from 'axios';
import SLAService from '../../services/SLAService';
import { SLAStatus } from '../../types';

vi.mock('axios');
const mockedAxios = vi.mocked(axios);

describe('SLAService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getSLASummary', () => {
    it('should fetch SLA summary successfully', async () => {
      const mockSummary = {
        total_findings: 100,
        on_track: 60,
        at_risk: 25,
        overdue: 15,
      };

      mockedAxios.get.mockResolvedValue({ data: mockSummary });

      const result = await SLAService.getSLASummary();

      expect(mockedAxios.get).toHaveBeenCalledWith('/api/sla-summary');
      expect(result).toEqual(mockSummary);
      expect(result.total_findings).toBe(100);
    });
  });

  describe('getOverdueFindings', () => {
    it('should fetch overdue findings successfully', async () => {
      const mockFindings = [
        {
          id: 1,
          title: 'SQL Injection',
          risk_rating: 'Critical',
          sla_status: 'Overdue' as SLAStatus,
          remediation_deadline: '2025-10-15T23:59:59Z',
          instances: [],
        },
        {
          id: 2,
          title: 'XSS Vulnerability',
          risk_rating: 'High',
          sla_status: 'Overdue' as SLAStatus,
          remediation_deadline: '2025-10-20T23:59:59Z',
          instances: [],
        },
      ];

      mockedAxios.get.mockResolvedValue({ data: mockFindings });

      const result = await SLAService.getOverdueFindings();

      expect(mockedAxios.get).toHaveBeenCalledWith('/api/findings/overdue');
      expect(result).toHaveLength(2);
      expect(result[0].sla_status).toBe('Overdue');
    });
  });

  describe('updateRemediation', () => {
    it('should update remediation deadline successfully', async () => {
      const findingId = 1;
      const deadline = '2025-12-31T23:59:59Z';
      const owner = 'security_team';
      const user = 'admin';
      const mockResponse = {
        id: findingId,
        title: 'Test Finding',
        risk_rating: 'High',
        remediation_deadline: deadline,
        remediation_owner: owner,
        sla_status: 'On Track' as SLAStatus,
        instances: [],
      };

      mockedAxios.patch.mockResolvedValue({ data: mockResponse });

      const result = await SLAService.updateRemediation(findingId, {
        remediation_deadline: deadline,
        remediation_owner: owner,
        user,
      });

      expect(mockedAxios.patch).toHaveBeenCalledWith(
        `/api/findings/${findingId}/remediation`,
        {
          remediation_deadline: deadline,
          remediation_owner: owner,
          user,
        }
      );
      expect(result).toEqual(mockResponse);
    });

    it('should handle invalid deadline format', async () => {
      const findingId = 1;
      const invalidDeadline = 'not-a-date';
      const user = 'admin';

      mockedAxios.patch.mockRejectedValue({
        response: { data: { detail: 'Invalid datetime format' } },
      });

      await expect(
        SLAService.updateRemediation(findingId, {
          remediation_deadline: invalidDeadline,
          user,
        })
      ).rejects.toThrow();
    });
  });
});
