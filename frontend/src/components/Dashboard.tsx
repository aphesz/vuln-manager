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
import { useThemeContext } from '../theme/ThemeProvider';
import WebSocketService from '../services/WebSocketService';
import UserPreferencesService from '../services/UserPreferencesService';
import type { Finding, Project } from '../types';

// Use relative path for API calls - proxied through Nginx in Docker
const API_BASE_URL = '/api';

const Dashboard = () => {
  const { projectId } = useParams();
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [settingsDialogOpen, setSettingsDialogOpen] = useState(false);
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

  if (loading) return <Typography>Loading Dashboard...</Typography>;
  if (error) return <Typography color="error">{error}</Typography>;
  if (!project) return <Typography>Project not found</Typography>;

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h4">{project.name}</Typography>
        <Box>
          <IconButton onClick={toggleTheme} color="inherit">
            {mode === 'dark' ? <LightModeIcon /> : <DarkModeIcon />}
          </IconButton>
          <IconButton onClick={() => setSettingsDialogOpen(true)} color="inherit">
            <SettingsIcon />
          </IconButton>
        </Box>
      </Box>

      {/* Dashboard Grid */}
      <Grid container spacing={3}>
        {/* Risk Distribution Chart */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>Risk Distribution</Typography>
              <RiskChart findings={project.findings} />
            </CardContent>
          </Card>
        </Grid>

        {/* Quick Actions */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>Quick Actions</Typography>
              <Box sx={{ display: 'flex', gap: 2 }}>
                <Button
                  variant="contained"
                  startIcon={<UploadIcon />}
                  onClick={() => setUploadDialogOpen(true)}
                >
                  Upload Report
                </Button>
                <Button
                  variant="contained"
                  startIcon={<DownloadIcon />}
                  onClick={exportToExcel}
                >
                  Export to Excel
                </Button>
                <Button
                  variant="outlined"
                  href={`${API_BASE_URL}/projects/${projectId}/report.docx`}
                  target="_blank"
                  download
                >
                  Export to DOCX
                </Button>
                <Button
                  variant="outlined"
                  href={`${API_BASE_URL}/projects/${projectId}/report.pdf`}
                  target="_blank"
                >
                  Export to PDF
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
    </Box>
  );
};

export default Dashboard;