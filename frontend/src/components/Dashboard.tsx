import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import {
  Box,
  Card,
  CardContent,
  Grid,
  Typography,
  useTheme,
  IconButton,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Checkbox,
  FormControlLabel,
  Select,
  MenuItem,
} from '@mui/material';
import {
  Brightness4 as DarkModeIcon,
  Brightness7 as LightModeIcon,
  Upload as UploadIcon,
  Download as DownloadIcon,
  Settings as SettingsIcon,
} from '@mui/icons-material';
import { useDropzone } from 'react-dropzone';
import axios from 'axios';
import { utils, writeFile } from 'xlsx';

import RiskChart from './RiskChart';
import FindingsTable from './FindingsTable';
import JiraIntegrationSettings from './JiraIntegrationSettings';
import { useThemeContext } from '../theme/ThemeProvider';
import WebSocketService from '../services/WebSocketService';
import UserPreferencesService from '../services/UserPreferencesService';
import type { Finding, Project, RiskRating } from '../types';

// Use relative path for API calls - proxied through Nginx in Docker
const API_BASE_URL = '/api';

const Dashboard = () => {
  const { projectId } = useParams();
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [settingsDialogOpen, setSettingsDialogOpen] = useState(false);
  const [jiraDialogOpen, setJiraDialogOpen] = useState(false);
  const [selectedRiskFilter, setSelectedRiskFilter] = useState<RiskRating | null>(null);
  const theme = useTheme();
  const { mode, toggleTheme } = useThemeContext();
  const prefsService = UserPreferencesService.getInstance();
  const [preferences, setPreferences] = useState(prefsService.getPreferences());

  // File upload handling
  const { getRootProps, getInputProps } = useDropzone({
    accept: {
      'application/xml': ['.xml'],
    },
    onDrop: async (acceptedFiles: File[]) => {
      const file = acceptedFiles[0];
      if (file) {
        const formData = new FormData();
        formData.append('file', file);
        
        try {
          await axios.post(
            `${API_BASE_URL}/projects/${projectId}/upload/auto`,
            formData,
            {
              headers: {
                'Content-Type': 'multipart/form-data',
              },
            }
          );
          // Refresh project data after upload
          fetchProject();
          setUploadDialogOpen(false);
        } catch (err) {
          setError('Failed to upload report file');
        }
      }
    },
  });

  // WebSocket setup for real-time updates
  useEffect(() => {
    if (!projectId) return;

    const projectNum = parseInt(projectId as string, 10);
    const ws = WebSocketService.getInstance(projectNum);
    
    const unsubscribe = ws.subscribe('finding_update', (data: any) => {
      console.log('Received finding_update:', data);
      fetchProject();
    });

    return () => {
      unsubscribe();
      ws.disconnect();
    };
  }, [projectId]);

  // Fetch project data
  const fetchProject = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/projects/${projectId}`);
      setProject(response.data);
      setError(null);
    } catch (err) {
      setError('Failed to load project data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProject();
  }, [projectId]);

  // Export findings to Excel
  const exportToExcel = () => {
    if (!project) return;

    const data = project.findings.map((finding: Finding) => ({
      Title: finding.title,
      Risk: finding.risk_rating,
      Description: finding.description,
      Remediation: finding.remediation,
      'Instance Count': finding.instances.length,
    }));

    const ws = utils.json_to_sheet(data);
    const wb = utils.book_new();
    utils.book_append_sheet(wb, ws, 'Findings');
    writeFile(wb, `${project.name}_findings.xlsx`);
  };

  // Update user preferences
  const updatePreferences = (updates: typeof preferences) => {
    prefsService.updatePreferences(updates);
    setPreferences(updates);
  };

  // Calculate risk summary (only open findings)
  const getRiskSummary = () => {
    const openFindings = project?.findings.filter(f => f.issue_status !== 'Closed') || [];
    return {
      critical: openFindings.filter(f => f.risk_rating === 'Critical').length,
      high: openFindings.filter(f => f.risk_rating === 'High').length,
      medium: openFindings.filter(f => f.risk_rating === 'Medium').length,
      low: openFindings.filter(f => f.risk_rating === 'Low').length,
      informational: openFindings.filter(f => f.risk_rating === 'Informational').length,
    };
  };

  // Get filtered findings by risk rating (only open findings)
  const getFilteredFindings = () => {
    if (!selectedRiskFilter || !project) return [];
    return project.findings.filter(
      f => f.risk_rating === selectedRiskFilter && f.issue_status !== 'Closed'
    );
  };

  // Handle risk card click
  const handleRiskCardClick = (risk: RiskRating) => {
    setSelectedRiskFilter(selectedRiskFilter === risk ? null : risk);
  };

  if (loading) return <Typography>Loading Dashboard...</Typography>;
  if (error) return <Typography color="error">{error}</Typography>;
  if (!project) return <Typography>Project not found</Typography>;

  return (
    <Box sx={{ p: { xs: 1, sm: 2, md: 3 } }}>
      {/* Header */}
      <Box sx={{ 
        mb: 3, 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: 1,
      }}>
        <Typography 
          variant="h4" 
          sx={{ 
            color: theme.palette.text.primary, 
            fontWeight: 600,
            fontSize: { xs: '1.5rem', sm: '2rem', md: '2.125rem' },
          }}
        >
          {project.name}
        </Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <IconButton 
            onClick={toggleTheme} 
            size="large"
            sx={{
              color: theme.palette.text.primary,
              '&:hover': {
                backgroundColor: theme.palette.mode === 'dark' 
                  ? 'rgba(255, 255, 255, 0.1)' 
                  : 'rgba(0, 0, 0, 0.05)',
              },
            }}
            title={`Switch to ${mode === 'dark' ? 'light' : 'dark'} mode`}
          >
            {mode === 'dark' ? <LightModeIcon /> : <DarkModeIcon />}
          </IconButton>
          <IconButton 
            onClick={() => setSettingsDialogOpen(true)}
            size="large"
            sx={{
              color: theme.palette.text.primary,
              '&:hover': {
                backgroundColor: theme.palette.mode === 'dark' 
                  ? 'rgba(255, 255, 255, 0.1)' 
                  : 'rgba(0, 0, 0, 0.05)',
              },
            }}
            title="Settings"
          >
            <SettingsIcon />
          </IconButton>
        </Box>
      </Box>

      {/* Dashboard Grid */}
      <Grid container spacing={3}>
        {/* Risk Rating Summary Cards (Interactive) */}
        <Grid item xs={12}>
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', mb: 2 }}>
            {[
              { risk: 'Critical' as RiskRating, color: '#b71c1c', bgColor: '#ffcdd2', label: 'Critical' },
              { risk: 'High' as RiskRating, color: '#e65100', bgColor: '#ffccbc', label: 'High' },
              { risk: 'Medium' as RiskRating, color: '#f57f17', bgColor: '#fff9c4', label: 'Medium' },
              { risk: 'Low' as RiskRating, color: '#2e7d32', bgColor: '#c8e6c9', label: 'Low' },
              { risk: 'Informational' as RiskRating, color: '#1565c0', bgColor: '#bbdefb', label: 'Informational' },
            ].map(({ risk, color, bgColor, label }) => {
              const summary = getRiskSummary();
              const count = summary[risk.toLowerCase() as keyof typeof summary];
              const isSelected = selectedRiskFilter === risk;
              
              return (
                <Card
                  key={risk}
                  onClick={() => handleRiskCardClick(risk)}
                  sx={{
                    flex: 1,
                    minWidth: '180px',
                    cursor: 'pointer',
                    transition: 'all 0.3s',
                    border: isSelected ? `3px solid ${color}` : `2px solid ${color}`,
                    backgroundColor: isSelected 
                      ? (theme.palette.mode === 'dark' ? `${color}22` : bgColor)
                      : (theme.palette.mode === 'dark' ? `${color}11` : bgColor),
                    transform: isSelected ? 'scale(1.05)' : 'scale(1)',
                    '&:hover': {
                      transform: 'scale(1.05)',
                      boxShadow: 6,
                      backgroundColor: theme.palette.mode === 'dark' ? `${color}33` : bgColor,
                    },
                  }}
                >
                  <CardContent>
                    <Typography 
                      variant="overline" 
                      sx={{ 
                        color: theme.palette.mode === 'dark' ? color : color,
                        fontWeight: 600,
                      }}
                    >
                      {label}
                    </Typography>
                    <Typography 
                      variant="h3" 
                      sx={{ 
                        color, 
                        fontWeight: 'bold', 
                        my: 1,
                        textShadow: theme.palette.mode === 'dark' ? `0 0 10px ${color}55` : 'none',
                      }}
                    >
                      {count}
                    </Typography>
                    <Typography 
                      variant="caption" 
                      sx={{ 
                        color: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.7)' : 'text.secondary',
                      }}
                    >
                      Open Findings
                    </Typography>
                  </CardContent>
                </Card>
              );
            })}
          </Box>
        </Grid>

        {/* Filtered Findings Table (when risk card is selected) */}
        {selectedRiskFilter && (
          <Grid item xs={12}>
            <Card sx={{ 
              mb: 2, 
              border: '2px solid', 
              borderColor: (() => {
                const colorMap = {
                  'Critical': '#b71c1c',
                  'High': '#e65100',
                  'Medium': '#f57f17',
                  'Low': '#2e7d32',
                  'Informational': '#1565c0',
                };
                return colorMap[selectedRiskFilter as keyof typeof colorMap];
              })(),
              backgroundColor: (() => {
                const bgColorMap = {
                  'Critical': theme.palette.mode === 'dark' ? '#b71c1c11' : '#ffcdd2',
                  'High': theme.palette.mode === 'dark' ? '#e6510011' : '#ffccbc',
                  'Medium': theme.palette.mode === 'dark' ? '#f57f1711' : '#fff9c4',
                  'Low': theme.palette.mode === 'dark' ? '#2e7d3211' : '#c8e6c9',
                  'Informational': theme.palette.mode === 'dark' ? '#1565c011' : '#bbdefb',
                };
                return bgColorMap[selectedRiskFilter as keyof typeof bgColorMap];
              })(),
            }}>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <Typography variant="h6" sx={{ 
                    fontWeight: 600,
                    color: (() => {
                      const colorMap = {
                        'Critical': '#b71c1c',
                        'High': '#e65100',
                        'Medium': '#f57f17',
                        'Low': '#2e7d32',
                        'Informational': '#1565c0',
                      };
                      return colorMap[selectedRiskFilter as keyof typeof colorMap];
                    })(),
                  }}>
                    {selectedRiskFilter} Risk - Open Findings ({getFilteredFindings().length})
                  </Typography>
                  <Button
                    size="small"
                    onClick={() => setSelectedRiskFilter(null)}
                    sx={{ minWidth: 'auto' }}
                  >
                    Clear Filter
                  </Button>
                </Box>
                <FindingsTable 
                  findings={getFilteredFindings()}
                  preferences={preferences.tableColumns}
                  onPreferencesChange={(columns: any) => 
                    updatePreferences({ ...preferences, tableColumns: columns })
                  }
                  onRefresh={fetchProject}
                />
              </CardContent>
            </Card>
          </Grid>
        )}

        {/* Risk Distribution Chart */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom sx={{ color: theme.palette.text.primary, fontWeight: 600 }}>
                Risk Distribution
              </Typography>
              <RiskChart findings={project.findings} />
            </CardContent>
          </Card>
        </Grid>

        {/* Quick Actions */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom sx={{ color: theme.palette.text.primary, fontWeight: 600 }}>
                Quick Actions
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
                <Button
                  variant="contained"
                  startIcon={<UploadIcon />}
                  onClick={() => setUploadDialogOpen(true)}
                >
                  Upload Report
                </Button>
                <Button
                  variant="contained"
                  startIcon={<SettingsIcon />}
                  onClick={() => setJiraDialogOpen(true)}
                >
                  Jira Settings
                </Button>
                <Button
                  variant="contained"
                  startIcon={<DownloadIcon />}
                  onClick={exportToExcel}
                >
                  Export Excel
                </Button>
                <Button
                  variant="outlined"
                  href={`${API_BASE_URL}/projects/${projectId}/report.docx`}
                  target="_blank"
                  download
                >
                  Export DOCX
                </Button>
                <Button
                  variant="outlined"
                  href={`${API_BASE_URL}/projects/${projectId}/report.pdf`}
                  target="_blank"
                >
                  Export PDF
                </Button>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Findings Table */}
        <Grid item xs={12}>
          <FindingsTable 
            findings={project.findings}
            preferences={preferences.tableColumns}
            onPreferencesChange={(columns: any) => 
              updatePreferences({ ...preferences, tableColumns: columns })
            }
            onRefresh={fetchProject}
          />
        </Grid>
      </Grid>

      {/* Upload Dialog */}
      <Dialog open={uploadDialogOpen} onClose={() => setUploadDialogOpen(false)}>
        <DialogTitle>Upload Scanner Report</DialogTitle>
        <DialogContent>
          <Box {...getRootProps()} sx={{
            border: '2px dashed grey',
            p: 3,
            textAlign: 'center',
            cursor: 'pointer'
          }}>
            <input {...getInputProps()} />
            <Typography>
              Drag and drop a report file here, or click to select
            </Typography>
            <Typography variant="caption" color="textSecondary">
              Supported formats: Burp Suite XML, Nessus XML
            </Typography>
          </Box>
        </DialogContent>
      </Dialog>

      {/* Settings Dialog */}
      <Dialog open={settingsDialogOpen} onClose={() => setSettingsDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Dashboard Settings</DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2 }}>
            <Typography variant="h6" gutterBottom>Table Settings</Typography>
            <Box sx={{ ml: 2, mb: 2 }}>
              <FormControlLabel
                control={<Checkbox defaultChecked />}
                label="Show Title Column"
              />
              <FormControlLabel
                control={<Checkbox defaultChecked />}
                label="Show Risk Level Column"
              />
              <FormControlLabel
                control={<Checkbox defaultChecked />}
                label="Show Instances Column"
              />
              <FormControlLabel
                control={<Checkbox />}
                label="Show Description Column"
              />
            </Box>
            
            <Typography variant="h6" gutterBottom sx={{ mt: 3 }}>Page Size</Typography>
            <Select
              value={preferences.pageSize || 25}
              onChange={(e: any) => updatePreferences({ ...preferences, pageSize: e.target.value as number })}
              sx={{ ml: 2, mb: 2 }}
            >
              <MenuItem value={10}>10 items per page</MenuItem>
              <MenuItem value={25}>25 items per page</MenuItem>
              <MenuItem value={50}>50 items per page</MenuItem>
              <MenuItem value={100}>100 items per page</MenuItem>
            </Select>
            
            <Typography variant="h6" gutterBottom sx={{ mt: 3 }}>Default Risk Filter</Typography>
            <Select
              value={preferences.defaultRiskFilter || 'All'}
              onChange={(e: any) => updatePreferences({ ...preferences, defaultRiskFilter: e.target.value })}
              sx={{ ml: 2 }}
            >
              <MenuItem value="All">All Risk Levels</MenuItem>
              <MenuItem value="Critical">Critical Only</MenuItem>
              <MenuItem value="High">High and Above</MenuItem>
              <MenuItem value="Medium">Medium and Above</MenuItem>
            </Select>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => prefsService.resetPreferences()}>
            Reset to Defaults
          </Button>
          <Button onClick={() => setSettingsDialogOpen(false)} variant="contained">
            Close
          </Button>
        </DialogActions>
      </Dialog>

      {/* Jira Integration Settings Dialog */}
      <Dialog 
        open={jiraDialogOpen} 
        onClose={() => setJiraDialogOpen(false)} 
        maxWidth="md" 
        fullWidth
      >
        <DialogTitle>Jira Integration</DialogTitle>
        <DialogContent>
          <JiraIntegrationSettings 
            projectId={parseInt(projectId as string, 10)} 
            onSave={() => {
              setJiraDialogOpen(false);
              // Optionally show success message
            }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setJiraDialogOpen(false)}>
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Dashboard;