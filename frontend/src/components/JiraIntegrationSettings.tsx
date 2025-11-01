import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  Alert,
  CircularProgress,
  Stack,
  InputAdornment,
  IconButton,
  Chip,
} from '@mui/material';
import {
  Visibility,
  VisibilityOff,
  CheckCircle as SuccessIcon,
  Error as ErrorIcon,
  Lock as LockIcon,
} from '@mui/icons-material';
import { useTheme } from '@mui/material/styles';
import type { JiraSettings } from '../types';
import JiraService from '../services/JiraService';

interface JiraIntegrationSettingsProps {
  projectId: number;
  onSave?: () => void;
}

const JiraIntegrationSettings = ({
  projectId,
  onSave,
}: JiraIntegrationSettingsProps) => {
  const theme = useTheme();
  const [jiraUrl, setJiraUrl] = useState('');
  const [projectKey, setProjectKey] = useState('');
  const [apiToken, setApiToken] = useState('');
  const [showToken, setShowToken] = useState(false);
  const [loading, setLoading] = useState(false);
  const [testing, setTesting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [isConfigured, setIsConfigured] = useState(false);

  useEffect(() => {
    loadSettings();
  }, [projectId]);

  const loadSettings = async () => {
    try {
      const settings = await JiraService.getSettings(projectId);
      if (settings) {
        setJiraUrl(settings.jira_url);
        setProjectKey(settings.project_key);
        setIsConfigured(true);
      }
    } catch (err) {
      console.error('Failed to load Jira settings:', err);
    }
  };

  const handleTestConnection = async () => {
    if (!jiraUrl || !projectKey || !apiToken) {
      setError('Please fill in all fields to test the connection');
      return;
    }

    setTesting(true);
    setError(null);
    setTestResult(null);

    try {
      const result = await JiraService.testConnection(jiraUrl, projectKey, apiToken);
      setTestResult(result);
    } catch (err: any) {
      setTestResult({
        success: false,
        message: 'Connection test failed',
      });
    } finally {
      setTesting(false);
    }
  };

  const handleSave = async () => {
    if (!jiraUrl || !projectKey || !apiToken) {
      setError('Please fill in all required fields');
      return;
    }

    // Basic URL validation
    try {
      new URL(jiraUrl);
    } catch {
      setError('Please enter a valid URL (e.g., https://your-domain.atlassian.net)');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const settings: JiraSettings = {
        project_id: projectId,
        jira_url: jiraUrl,
        project_key: projectKey,
        api_token_encrypted: apiToken,
      };

      await JiraService.saveSettings(settings);
      setSuccess('Jira settings saved successfully');
      setIsConfigured(true);
      if (onSave) {
        onSave();
      }
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to save Jira settings');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setJiraUrl('');
    setProjectKey('');
    setApiToken('');
    setShowToken(false);
    setTestResult(null);
    setError(null);
    setSuccess(null);
  };

  return (
    <Box>
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}
      {success && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess(null)}>
          {success}
        </Alert>
      )}

      <Card>
        <CardContent>
          <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
            <Typography variant="h6" gutterBottom>
              Jira Integration Settings
            </Typography>
            {isConfigured && (
              <Chip
                icon={<LockIcon />}
                label="Configured"
                color="success"
                size="small"
              />
            )}
          </Stack>

          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Configure Jira integration to automatically create and sync issues from findings.
            Your API token will be encrypted and stored securely.
          </Typography>

          <Stack spacing={3}>
            {/* Jira URL */}
            <TextField
              fullWidth
              label="Jira URL"
              placeholder="https://your-domain.atlassian.net"
              value={jiraUrl}
              onChange={(e) => setJiraUrl(e.target.value)}
              disabled={loading || testing}
              helperText="Enter your Jira Cloud or Server URL"
              inputProps={{
                'aria-label': 'Jira URL',
              }}
            />

            {/* Project Key */}
            <TextField
              fullWidth
              label="Jira Project Key"
              placeholder="PROJ"
              value={projectKey}
              onChange={(e) => setProjectKey(e.target.value.toUpperCase())}
              disabled={loading || testing}
              helperText="The project key where issues will be created (e.g., PROJ, SEC)"
              inputProps={{
                'aria-label': 'Jira project key',
              }}
            />

            {/* API Token */}
            <TextField
              fullWidth
              label="API Token"
              type={showToken ? 'text' : 'password'}
              placeholder="Enter your Jira API token"
              value={apiToken}
              onChange={(e) => setApiToken(e.target.value)}
              disabled={loading || testing}
              helperText={
                <Box component="span">
                  <LockIcon sx={{ fontSize: 12, verticalAlign: 'middle', mr: 0.5 }} />
                  Your token will be encrypted before storage.
                  {' '}
                  <a
                    href="https://support.atlassian.com/atlassian-account/docs/manage-api-tokens-for-your-atlassian-account/"
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ color: theme.palette.primary.main }}
                  >
                    How to create an API token
                  </a>
                </Box>
              }
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      aria-label="toggle token visibility"
                      onClick={() => setShowToken(!showToken)}
                      edge="end"
                    >
                      {showToken ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
              inputProps={{
                'aria-label': 'Jira API token',
              }}
            />

            {/* Test Connection Result */}
            {testResult && (
              <Alert
                severity={testResult.success ? 'success' : 'error'}
                icon={testResult.success ? <SuccessIcon /> : <ErrorIcon />}
              >
                {testResult.message}
              </Alert>
            )}

            {/* Action Buttons */}
            <Stack direction="row" spacing={2}>
              <Button
                variant="outlined"
                onClick={handleTestConnection}
                disabled={loading || testing || !jiraUrl || !projectKey || !apiToken}
                startIcon={testing ? <CircularProgress size={16} /> : undefined}
                aria-label="Test Jira connection"
              >
                {testing ? 'Testing...' : 'Test Connection'}
              </Button>
              <Button
                variant="contained"
                onClick={handleSave}
                disabled={loading || testing || !jiraUrl || !projectKey || !apiToken}
                startIcon={loading ? <CircularProgress size={16} /> : undefined}
                aria-label="Save Jira settings"
              >
                {loading ? 'Saving...' : 'Save Settings'}
              </Button>
              <Button
                variant="text"
                onClick={handleReset}
                disabled={loading || testing}
                aria-label="Reset form"
              >
                Reset
              </Button>
            </Stack>
          </Stack>
        </CardContent>
      </Card>

      {/* Info Card */}
      <Card sx={{ mt: 2, bgcolor: theme.palette.mode === 'dark' ? 'grey.900' : 'grey.50' }}>
        <CardContent>
          <Typography variant="subtitle2" gutterBottom>
            ℹ️ About Jira Integration
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Once configured, you can create Jira issues directly from findings. The integration
            supports:
          </Typography>
          <Box component="ul" sx={{ mt: 1, pl: 2 }}>
            <Typography component="li" variant="body2" color="text.secondary">
              Automatic issue creation with finding details
            </Typography>
            <Typography component="li" variant="body2" color="text.secondary">
              Bi-directional status sync via webhooks
            </Typography>
            <Typography component="li" variant="body2" color="text.secondary">
              Risk-based priority mapping (Critical → Highest, etc.)
            </Typography>
            <Typography component="li" variant="body2" color="text.secondary">
              Secure encrypted token storage
            </Typography>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
};

export default JiraIntegrationSettings;
