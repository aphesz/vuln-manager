import { describe, it, expect, vi, beforeEach } from 'vitest';
import axios from 'axios';
import JiraService from '../../services/JiraService';

vi.mock('axios');
const mockedAxios = vi.mocked(axios);

describe('JiraService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getSettings', () => {
    it('should fetch Jira settings successfully', async () => {
      const projectId = 1;
      const mockSettings = {
        id: 1,
        jira_url: 'https://example.atlassian.net',
        project_key: 'VULN',
        api_token: '',
        created_at: '2025-11-01T00:00:00Z',
        updated_at: '2025-11-01T00:00:00Z',
      };

      mockedAxios.get.mockResolvedValue({ data: mockSettings });

      const result = await JiraService.getSettings(projectId);

      expect(mockedAxios.get).toHaveBeenCalledWith(`/api/jira/settings/${projectId}`);
      expect(result).toEqual(mockSettings);
    });

    it('should return null if settings not found', async () => {
      const projectId = 999;

      mockedAxios.get.mockRejectedValue({ response: { status: 404 } });

      const result = await JiraService.getSettings(projectId);

      expect(result).toBeNull();
    });
  });

  describe('saveSettings', () => {
    it('should save Jira settings successfully', async () => {
      const settings = {
        id: 1,
        jira_url: 'https://example.atlassian.net',
        project_key: 'VULN',
        api_token: 'test-token-123',
        created_at: '2025-11-01T00:00:00Z',
        updated_at: '2025-11-01T00:00:00Z',
      };

      mockedAxios.post.mockResolvedValue({ data: settings });

      const result = await JiraService.saveSettings(settings);

      expect(mockedAxios.post).toHaveBeenCalledWith('/api/jira/settings', settings);
      expect(result).toEqual(settings);
    });

    it('should validate required fields', async () => {
      const invalidSettings: any = {
        id: 1,
        jira_url: '',
        project_key: 'VULN',
        api_token: '',
        created_at: '2025-11-01T00:00:00Z',
        updated_at: '2025-11-01T00:00:00Z',
      };

      mockedAxios.post.mockRejectedValue({
        response: { data: { detail: 'jira_url is required' } },
      });

      await expect(JiraService.saveSettings(invalidSettings)).rejects.toThrow();
    });
  });

  describe('testConnection', () => {
    it('should test connection successfully', async () => {
      const jiraUrl = 'https://example.atlassian.net';
      const projectKey = 'VULN';
      const apiToken = 'test-token';

      mockedAxios.post.mockResolvedValue({
        data: { message: 'Connection successful' },
      });

      const result = await JiraService.testConnection(jiraUrl, projectKey, apiToken);

      expect(mockedAxios.post).toHaveBeenCalledWith('/api/jira/test-connection', {
        jira_url: jiraUrl,
        project_key: projectKey,
        api_token: apiToken,
      });
      expect(result.success).toBe(true);
      expect(result.message).toContain('Connection successful');
    });

    it('should handle connection failures', async () => {
      const jiraUrl = 'https://example.atlassian.net';
      const projectKey = 'VULN';
      const apiToken = 'bad-token';

      mockedAxios.post.mockRejectedValue({
        response: { data: { detail: 'Authentication failed' } },
      });

      const result = await JiraService.testConnection(jiraUrl, projectKey, apiToken);

      expect(result.success).toBe(false);
      expect(result.message).toContain('Authentication failed');
    });
  });

  describe('createIssue', () => {
    it('should create Jira issue successfully', async () => {
      const findingId = 1;
      const user = 'test_user';
      const mockResponse = {
        jira_issue_key: 'VULN-123',
        jira_url: 'https://example.atlassian.net/browse/VULN-123',
      };

      mockedAxios.post.mockResolvedValue({ data: mockResponse });

      const result = await JiraService.createIssue(findingId, user);

      expect(mockedAxios.post).toHaveBeenCalledWith(
        `/api/findings/${findingId}/create-jira-issue`,
        { user }
      );
      expect(result).toEqual(mockResponse);
      expect(result.jira_issue_key).toBe('VULN-123');
    });

    it('should handle Jira API errors', async () => {
      const findingId = 1;
      const user = 'test_user';

      mockedAxios.post.mockRejectedValue({
        response: { data: { detail: 'Jira credentials not configured' } },
      });

      await expect(JiraService.createIssue(findingId, user)).rejects.toThrow();
    });
  });
});
