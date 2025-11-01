import axios from 'axios';
import type { JiraSettings } from '../types';

const API_BASE_URL = '/api';

/**
 * Service for Jira integration operations
 */
class JiraService {
  /**
   * Save or update Jira settings for a project
   */
  async saveSettings(settings: JiraSettings): Promise<JiraSettings> {
    const response = await axios.post(`${API_BASE_URL}/jira/settings`, settings);
    return response.data;
  }

  /**
   * Test Jira connection with provided credentials
   */
  async testConnection(
    jiraUrl: string,
    projectKey: string,
    apiToken: string
  ): Promise<{ success: boolean; message: string }> {
    try {
      const response = await axios.post(`${API_BASE_URL}/jira/test-connection`, {
        jira_url: jiraUrl,
        project_key: projectKey,
        api_token: apiToken,
      });
      return {
        success: true,
        message: response.data.message || 'Connection successful',
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.response?.data?.detail || 'Connection failed',
      };
    }
  }

  /**
   * Create a Jira issue from a finding
   */
  async createIssue(
    findingId: number,
    user: string
  ): Promise<{ jira_issue_key: string; jira_url: string }> {
    const response = await axios.post(
      `${API_BASE_URL}/findings/${findingId}/create-jira-issue`,
      { user }
    );
    return response.data;
  }

  /**
   * Get Jira settings for a project (if needed)
   */
  async getSettings(projectId: number): Promise<JiraSettings | null> {
    try {
      const response = await axios.get(`${API_BASE_URL}/jira/settings/${projectId}`);
      return response.data;
    } catch (error) {
      return null;
    }
  }
}

export default new JiraService();
