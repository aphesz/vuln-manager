import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Card,
  CardContent,
  Grid,
  Typography,
  useTheme,
  useMediaQuery,
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
  ButtonGroup,
  Tooltip,
  Drawer,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Divider,
  Fab,
} from '@mui/material';
import {
  Brightness4 as DarkModeIcon,
  Brightness7 as LightModeIcon,
  Contrast as ContrastIcon,
  Upload as UploadIcon,
  Download as DownloadIcon,
  Settings as SettingsIcon,
  Menu as MenuIcon,
  Close as CloseIcon,
  Assessment as ReportIcon,
  Add as AddIcon,
  Description as DocxIcon,
  PictureAsPdf as PdfIcon,
  AutoAwesome as AutoAwesomeIcon,
  TrendingUp as TrendingUpIcon,
} from '@mui/icons-material';
import { useDropzone } from 'react-dropzone';
import axios from 'axios';
import ExcelJS from 'exceljs';

import RiskChart from './RiskChart';
import FindingsTable from './FindingsTable';
import JiraIntegrationSettings from './JiraIntegrationSettings';
import ExportDialog, { ExportOptions } from './ExportDialog';
import QuickAddDialog from './QuickAddDialog';
import MatchReviewDialog from './MatchReviewDialog';
import SLAComplianceWidget from './SLAComplianceWidget';
import ReviewProgressWidget from './ReviewProgressWidget';
import TopVulnerabilitiesWidget from './TopVulnerabilitiesWidget';
import AttackMatrixWidget from './AttackMatrixWidget';
import OWASPTop10Widget from './OWASPTop10Widget';
import CWETop25Widget from './CWETop25Widget';
import { DashboardSkeleton } from './LoadingSkeletons';
import { useThemeContext } from '../theme/ThemeProvider';
import WebSocketService from '../services/WebSocketService';
import MetricsCards from './MetricsCards';
import UserPreferencesService from '../services/UserPreferencesService';
import { useNotification } from '../contexts/NotificationContext';
import { getErrorMessage, retryWithBackoff, validateFileSize, formatFileSize } from '../utils/errorHandler';
import type { Finding, Project, RiskRating, ProjectMetrics } from '../types';

// Use relative path for API calls - proxied through Nginx in Docker
const API_BASE_URL = '/api';

const Dashboard = () => {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const { showSuccess, showError } = useNotification();
  const [project, setProject] = useState<Project | null>(null);
  const [metrics, setMetrics] = useState<ProjectMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [settingsDialogOpen, setSettingsDialogOpen] = useState(false);
  const [jiraDialogOpen, setJiraDialogOpen] = useState(false);
  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  const [quickAddDialogOpen, setQuickAddDialogOpen] = useState(false);
  const [matchReviewDialogOpen, setMatchReviewDialogOpen] = useState(false);
  const [preSelectedTemplateId, setPreSelectedTemplateId] = useState<number | undefined>(undefined);
  const [selectedRiskFilter, setSelectedRiskFilter] = useState<RiskRating | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isTablet = useMediaQuery(theme.breakpoints.down('md'));
  const { mode, setThemeMode } = useThemeContext();
  const prefsService = UserPreferencesService.getInstance();
  const [preferences, setPreferences] = useState(prefsService.getPreferences());

  // File upload handling
  const { getRootProps, getInputProps } = useDropzone({
    accept: {
      'application/xml': ['.xml'],
    },
    maxSize: 10 * 1024 * 1024, // 10MB
    onDrop: async (acceptedFiles: File[], rejectedFiles) => {
      // Handle rejected files
      if (rejectedFiles.length > 0) {
        const rejection = rejectedFiles[0];
        if (rejection.errors.some(e => e.code === 'file-too-large')) {
          showError(`File is too large. Maximum size is 10 MB (file: ${formatFileSize(rejection.file.size)})`);
        } else if (rejection.errors.some(e => e.code === 'file-invalid-type')) {
          showError('Invalid file type. Please upload an XML file (.xml)');
        } else {
          showError('File upload failed. Please try again.');
        }
        return;
      }

      const file = acceptedFiles[0];
      if (!file) return;

      // Validate file size (redundant check for safety)
      if (!validateFileSize(file, 10)) {
        showError(`File is too large: ${formatFileSize(file.size)}. Maximum size is 10 MB.`);
        return;
      }

      const formData = new FormData();
      formData.append('file', file);
      
      setLoading(true);
      setError(null);
      
      try {
        await retryWithBackoff(async () => {
          return await axios.post(
            `${API_BASE_URL}/projects/${projectId}/upload/auto`,
            formData,
            {
              headers: {
                'Content-Type': 'multipart/form-data',
              },
              timeout: 60000, // 60 second timeout for large files
            }
          );
        }, 2); // Retry up to 2 times
        
        showSuccess('Report uploaded successfully');
        setUploadDialogOpen(false);
        // Refresh project data after upload
        await fetchProject();
      } catch (err) {
        const errorMsg = getErrorMessage(err);
        setError(errorMsg);
        showError(errorMsg);
      } finally {
        setLoading(false);
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
    setLoading(true);
    setError(null);
    
    // Minimum loading time to ensure skeleton is visible (300ms)
    const startTime = Date.now();
    
    try {
      const [projectResponse, metricsResponse] = await Promise.all([
        retryWithBackoff(async () => {
          return await axios.get(`${API_BASE_URL}/projects/${projectId}`);
        }, 3),
        retryWithBackoff(async () => {
          return await axios.get(`${API_BASE_URL}/projects/${projectId}/metrics`);
        }, 3)
      ]);
      
      setProject(projectResponse.data);
      setMetrics(metricsResponse.data);
      
      // Ensure minimum skeleton display time
      const elapsedTime = Date.now() - startTime;
      const remainingTime = Math.max(0, 300 - elapsedTime);
      if (remainingTime > 0) {
        await new Promise(resolve => setTimeout(resolve, remainingTime));
      }
    } catch (err) {
      const errorMsg = getErrorMessage(err);
      setError(errorMsg);
      showError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProject();
  }, [projectId]);

  // Export findings using the new backend endpoint
  const handleExport = async (options: ExportOptions) => {
    if (!project) return;

    try {
      // Handle Template Report (new)
      if (options.format === 'template') {
        if (!options.templateOptions?.templateId) {
          showError('Please select a template');
          return;
        }

        const response = await axios.post(
          `${API_BASE_URL}/projects/${projectId}/reports/from-template`,
          {
            template_id: options.templateOptions.templateId,
            variables: options.templateOptions.variables || {},
          },
          { responseType: 'blob' }
        );

        // Create download link for PDF
        const blob = new Blob([response.data], { type: 'application/pdf' });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${project.name}_template_report.pdf`;
        link.click();
        window.URL.revokeObjectURL(url);

        showSuccess('Template report generated successfully!');
        setExportDialogOpen(false);
        return;
      }

      // Handle Executive Report (new)
      if (options.format === 'executive') {
        const params = new URLSearchParams();
        
        if (options.executiveOptions) {
          if (options.executiveOptions.includeCharts !== undefined) {
            params.append('include_charts', String(options.executiveOptions.includeCharts));
          }
          if (options.executiveOptions.companyName) {
            params.append('company_name', options.executiveOptions.companyName);
          }
          if (options.executiveOptions.customHeader) {
            params.append('custom_header', options.executiveOptions.customHeader);
          }
          if (options.executiveOptions.customFooter) {
            params.append('custom_footer', options.executiveOptions.customFooter);
          }
        }

        const url = `${API_BASE_URL}/projects/${projectId}/reports/executive?${params.toString()}`;
        window.open(url, '_blank');
        showSuccess('Executive report opened in new tab!');
        setExportDialogOpen(false);
        return;
      }

      // Handle Enhanced Export Formats (v1.1.0 Phase 4)
      if (options.format === 'html') {
        window.open(`${API_BASE_URL}/projects/${projectId}/export/html`, '_blank');
        showSuccess('Interactive HTML report opened in new tab!');
        setExportDialogOpen(false);
        return;
      }

      if (options.format === 'sarif') {
        const link = document.createElement('a');
        link.href = `${API_BASE_URL}/projects/${projectId}/export/sarif`;
        link.download = `${project.name}_findings.sarif`;
        link.click();
        showSuccess('SARIF export downloaded successfully!');
        setExportDialogOpen(false);
        return;
      }

      if (options.format === 'pptx') {
        const link = document.createElement('a');
        link.href = `${API_BASE_URL}/projects/${projectId}/export/pptx`;
        link.download = `${project.name}_presentation.pptx`;
        link.click();
        showSuccess('PowerPoint presentation downloaded successfully!');
        setExportDialogOpen(false);
        return;
      }

      // Handle DOCX and PDF differently (they use existing endpoints)
      if (options.format === 'docx') {
        const link = document.createElement('a');
        link.href = `${API_BASE_URL}/projects/${projectId}/report.docx`;
        link.download = `${project.name}_report.docx`;
        link.click();
        showSuccess('DOCX report downloaded successfully!');
        setExportDialogOpen(false);
        return;
      }

      if (options.format === 'pdf') {
        window.open(`${API_BASE_URL}/projects/${projectId}/report.pdf`, '_blank');
        showSuccess('PDF report opened in new tab!');
        setExportDialogOpen(false);
        return;
      }

      // For data formats (Excel, CSV, JSON, Markdown), use the export endpoint
      // Build query parameters
      const params = new URLSearchParams();
      params.append('format', options.format);
      
      if (options.columns.length > 0) {
        params.append('columns', options.columns.join(','));
      }
      
      if (options.filters.risk && options.filters.risk.length > 0) {
        params.append('risk_filter', options.filters.risk.join(','));
      }
      
      if (options.filters.issueStatus && options.filters.issueStatus.length > 0) {
        params.append('status_filter', options.filters.issueStatus.join(','));
      }
      
      if (options.filters.reviewStatus && options.filters.reviewStatus.length > 0) {
        params.append('review_filter', options.filters.reviewStatus.join(','));
      }

      // Make request to backend
      const response = await axios.get(
        `${API_BASE_URL}/projects/${projectId}/export?${params.toString()}`,
        { responseType: 'blob' }
      );

      // Create download link
      const blob = new Blob([response.data]);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      
      // Determine file extension
      const extensions: Record<string, string> = {
        excel: 'xlsx',
        csv: 'csv',
        json: 'json',
        markdown: 'md'
      };
      const extension = extensions[options.format] || 'xlsx';
      link.download = `${project.name}_findings.${extension}`;
      link.click();
      window.URL.revokeObjectURL(url);

      showSuccess(`Export successful! Downloaded ${link.download}`);
      setExportDialogOpen(false);
    } catch (error) {
      console.error('Export error:', error);
      showError('Failed to export findings. Please try again.');
    }
  };

  // Legacy export function (kept for backward compatibility)
  const handleLegacyExport = async () => {
    if (!project) return;

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Findings');

    // Define columns
    worksheet.columns = [
      { header: 'Title', key: 'title', width: 40 },
      { header: 'Risk', key: 'risk', width: 15 },
      { header: 'Description', key: 'description', width: 60 },
      { header: 'Remediation', key: 'remediation', width: 60 },
      { header: 'Instance Count', key: 'instanceCount', width: 15 },
    ];

    // Add data rows
    project.findings.forEach(finding => {
      worksheet.addRow({
        title: finding.title,
        risk: finding.risk_rating,
        description: finding.description,
        remediation: finding.remediation,
        instanceCount: finding.instances.length,
      });
    });

    // Style header row
    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' },
    };

    // Generate buffer and download
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${project.name}_findings.xlsx`;
    link.click();
    window.URL.revokeObjectURL(url);
  };

  // Open export dialog
  const exportToExcel = () => {
    setExportDialogOpen(true);
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

  if (loading) return <DashboardSkeleton />;
  if (error && !project) return (
    <Box sx={{ textAlign: 'center', py: 8 }}>
      <Typography color="error" variant="h6" gutterBottom>
        {error}
      </Typography>
      <Button variant="contained" onClick={fetchProject} sx={{ mt: 2 }}>
        Retry
      </Button>
    </Box>
  );
  if (!project) return <Typography>Project not found</Typography>;

  return (
    <Box sx={{ p: { xs: 1, sm: 2, md: 3 } }} role="main">
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
          component="h1"
          sx={{ 
            color: theme.palette.text.primary, 
            fontWeight: 600,
            fontSize: { xs: '1.5rem', sm: '2rem', md: '2.125rem' },
          }}
        >
          {project.name}
        </Typography>
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
          {/* Mobile Menu Button - shows on small screens */}
          {isMobile ? (
            <IconButton
              onClick={() => setMobileMenuOpen(true)}
              size="large"
              aria-label="Open menu"
              sx={{
                color: theme.palette.text.primary,
              }}
            >
              <MenuIcon />
            </IconButton>
          ) : (
            <>
              {/* Desktop Theme Selector Button Group */}
              <ButtonGroup 
                variant="outlined" 
                size="small"
                aria-label="Theme selection"
                sx={{
                  '& .MuiButtonGroup-grouped': {
                    minWidth: '40px',
                    borderColor: theme.palette.divider,
                  },
                  display: { xs: 'none', sm: 'flex' },
                }}
              >
                <Tooltip title="Light theme">
                  <IconButton
                    onClick={() => setThemeMode('light')}
                    size="small"
                    sx={{
                      color: mode === 'light' ? theme.palette.primary.main : theme.palette.text.secondary,
                      backgroundColor: mode === 'light' ? theme.palette.action.selected : 'transparent',
                    }}
                    aria-label="Switch to light theme"
                    aria-pressed={mode === 'light'}
                  >
                    <LightModeIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
                <Tooltip title="Dark theme">
                  <IconButton
                    onClick={() => setThemeMode('dark')}
                    size="small"
                    sx={{
                      color: mode === 'dark' ? theme.palette.primary.main : theme.palette.text.secondary,
                      backgroundColor: mode === 'dark' ? theme.palette.action.selected : 'transparent',
                    }}
                    aria-label="Switch to dark theme"
                    aria-pressed={mode === 'dark'}
                  >
                    <DarkModeIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
                <Tooltip title="High contrast theme">
                  <IconButton
                    onClick={() => setThemeMode('highContrast')}
                    size="small"
                    sx={{
                      color: mode === 'highContrast' ? theme.palette.primary.main : theme.palette.text.secondary,
                      backgroundColor: mode === 'highContrast' ? theme.palette.action.selected : 'transparent',
                    }}
                    aria-label="Switch to high contrast theme"
                    aria-pressed={mode === 'highContrast'}
                  >
                    <ContrastIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              </ButtonGroup>
              <IconButton 
                onClick={() => setSettingsDialogOpen(true)}
                size="large"
                sx={{
                  color: theme.palette.text.primary,
                }}
                title="Settings"
                aria-label="Open settings"
              >
                <SettingsIcon />
              </IconButton>
            </>
          )}
        </Box>
      </Box>

      {/* Mobile Drawer Menu */}
      <Drawer
        anchor="right"
        open={mobileMenuOpen}
        onClose={() => setMobileMenuOpen(false)}
        sx={{
          '& .MuiDrawer-paper': {
            width: { xs: '80%', sm: 300 },
            maxWidth: 300,
          },
        }}
      >
        <Box sx={{ p: 2 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6">Menu</Typography>
            <IconButton onClick={() => setMobileMenuOpen(false)} aria-label="Close menu">
              <CloseIcon />
            </IconButton>
          </Box>
          <Divider sx={{ mb: 2 }} />
          
          <List>
            <ListItem button onClick={() => { setQuickAddDialogOpen(true); setMobileMenuOpen(false); }}>
              <ListItemIcon><AddIcon /></ListItemIcon>
              <ListItemText primary="Quick Add Finding" />
            </ListItem>

            <ListItem button onClick={() => { setUploadDialogOpen(true); setMobileMenuOpen(false); }}>
              <ListItemIcon><UploadIcon /></ListItemIcon>
              <ListItemText primary="Upload Scan" />
            </ListItem>
            
            <ListItem button onClick={() => { exportToExcel(); setMobileMenuOpen(false); }}>
              <ListItemIcon><DownloadIcon /></ListItemIcon>
              <ListItemText primary="Export Excel" />
            </ListItem>
            
            <ListItem button onClick={async () => { 
              try {
                const response = await axios.get(`${API_BASE_URL}/projects/${projectId}/report.docx`, {
                  responseType: 'blob',
                });
                const url = window.URL.createObjectURL(new Blob([response.data]));
                const link = document.createElement('a');
                link.href = url;
                link.setAttribute('download', `${project.name}_report.docx`);
                document.body.appendChild(link);
                link.click();
                link.remove();
                showSuccess('Report generated successfully');
              } catch (err) {
                showError('Failed to generate report');
              }
              setMobileMenuOpen(false); 
            }}>
              <ListItemIcon><ReportIcon /></ListItemIcon>
              <ListItemText primary="Generate Report" />
            </ListItem>
            
            <Divider sx={{ my: 1 }} />
            
            <ListItem>
              <ListItemText primary="Theme" />
            </ListItem>
            <ListItem button onClick={() => setThemeMode('light')}>
              <ListItemIcon><LightModeIcon /></ListItemIcon>
              <ListItemText primary="Light" secondary={mode === 'light' ? 'Active' : ''} />
            </ListItem>
            <ListItem button onClick={() => setThemeMode('dark')}>
              <ListItemIcon><DarkModeIcon /></ListItemIcon>
              <ListItemText primary="Dark" secondary={mode === 'dark' ? 'Active' : ''} />
            </ListItem>
            <ListItem button onClick={() => setThemeMode('highContrast')}>
              <ListItemIcon><ContrastIcon /></ListItemIcon>
              <ListItemText primary="High Contrast" secondary={mode === 'highContrast' ? 'Active' : ''} />
            </ListItem>
            
            <Divider sx={{ my: 1 }} />
            
            <ListItem button onClick={() => { setSettingsDialogOpen(true); setMobileMenuOpen(false); }}>
              <ListItemIcon><SettingsIcon /></ListItemIcon>
              <ListItemText primary="Settings" />
            </ListItem>
          </List>
        </Box>
      </Drawer>

      {/* Floating Action Button for Mobile Upload */}
      {isMobile && (
        <Fab
          color="primary"
          aria-label="upload"
          onClick={() => setUploadDialogOpen(true)}
          sx={{
            position: 'fixed',
            bottom: 16,
            right: 16,
            zIndex: 1000,
          }}
        >
          <UploadIcon />
        </Fab>
      )}

      {/* Original Theme Selector (hidden on mobile, kept for reference) */}
      <Box sx={{ display: { xs: 'none', sm: 'none' } }}>
        <Box sx={{ display: 'flex', gap: 1 }}>
          {/* Theme Selector Button Group */}
          <ButtonGroup 
            variant="outlined" 
            size="small"
            aria-label="Theme selection"
            sx={{
              '& .MuiButtonGroup-grouped': {
                minWidth: '40px',
                borderColor: theme.palette.divider,
              },
            }}
          >
            <Tooltip title="Light theme">
              <IconButton
                onClick={() => setThemeMode('light')}
                size="small"
                sx={{
                  color: mode === 'light' ? theme.palette.primary.main : theme.palette.text.secondary,
                  backgroundColor: mode === 'light' ? theme.palette.action.selected : 'transparent',
                  '&:hover': {
                    backgroundColor: theme.palette.mode === 'dark' 
                      ? 'rgba(255, 255, 255, 0.1)' 
                      : 'rgba(0, 0, 0, 0.05)',
                  },
                }}
                aria-label="Switch to light theme"
                aria-pressed={mode === 'light'}
              >
                <LightModeIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            <Tooltip title="Dark theme">
              <IconButton
                onClick={() => setThemeMode('dark')}
                size="small"
                sx={{
                  color: mode === 'dark' ? theme.palette.primary.main : theme.palette.text.secondary,
                  backgroundColor: mode === 'dark' ? theme.palette.action.selected : 'transparent',
                  '&:hover': {
                    backgroundColor: theme.palette.mode === 'dark' 
                      ? 'rgba(255, 255, 255, 0.1)' 
                      : 'rgba(0, 0, 0, 0.05)',
                  },
                }}
                aria-label="Switch to dark theme"
                aria-pressed={mode === 'dark'}
              >
                <DarkModeIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            <Tooltip title="High contrast theme">
              <IconButton
                onClick={() => setThemeMode('highContrast')}
                size="small"
                sx={{
                  color: mode === 'highContrast' ? theme.palette.primary.main : theme.palette.text.secondary,
                  backgroundColor: mode === 'highContrast' ? theme.palette.action.selected : 'transparent',
                  '&:hover': {
                    backgroundColor: theme.palette.mode === 'dark' 
                      ? 'rgba(255, 255, 255, 0.1)' 
                      : 'rgba(0, 0, 0, 0.05)',
                  },
                }}
                aria-label="Switch to high contrast theme"
                aria-pressed={mode === 'highContrast'}
              >
                <ContrastIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </ButtonGroup>
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
            aria-label="Open settings"
          >
            <SettingsIcon />
          </IconButton>
        </Box>
      </Box>

      {/* Dashboard Grid */}
      <Grid container spacing={3}>
        {/* Dashboard Widgets Row */}
        {metrics && (
          <Grid item xs={12}>
            <Grid container spacing={2}>
              {/* First Row - 3 widgets */}
              <Grid item xs={12} md={4}>
                <SLAComplianceWidget
                  onTrack={metrics.sla_compliance.on_track}
                  atRisk={metrics.sla_compliance.at_risk}
                  overdue={metrics.sla_compliance.overdue}
                  total={metrics.sla_compliance.total}
                  complianceRate={metrics.sla_compliance.compliance_rate}
                />
              </Grid>
              <Grid item xs={12} md={4}>
                <ReviewProgressWidget
                  pending={metrics.review_progress.pending}
                  inReview={metrics.review_progress.in_review}
                  approved={metrics.review_progress.approved}
                  rejected={metrics.review_progress.rejected}
                  total={metrics.review_progress.total}
                  approvalRate={metrics.review_progress.approval_rate}
                />
              </Grid>
              <Grid item xs={12} md={4}>
                <TopVulnerabilitiesWidget
                  vulnerabilities={metrics.top_vulnerabilities}
                />
              </Grid>
              
              {/* Second Row - 3 widgets */}
              <Grid item xs={12} md={4}>
                <AttackMatrixWidget
                  projectId={Number(projectId)}
                />
              </Grid>
              <Grid item xs={12} md={4}>
                <OWASPTop10Widget
                  projectId={Number(projectId)}
                />
              </Grid>
              <Grid item xs={12} md={4}>
                <CWETop25Widget
                  projectId={Number(projectId)}
                />
              </Grid>
            </Grid>
          </Grid>
        )}

        {/* Metrics Cards */}
        <Grid item xs={12}>
          <MetricsCards findings={project?.findings || []} />
        </Grid>

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
                  onAddSimilar={(templateId: number) => {
                    setPreSelectedTemplateId(templateId);
                    setQuickAddDialogOpen(true);
                  }}
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
                  color="primary"
                  startIcon={<AddIcon />}
                  onClick={() => setQuickAddDialogOpen(true)}
                >
                  Quick Add Finding
                </Button>
                <Button
                  variant="contained"
                  color="secondary"
                  startIcon={<AutoAwesomeIcon />}
                  onClick={() => setMatchReviewDialogOpen(true)}
                >
                  Auto-Match Findings
                </Button>
                <Button
                  variant="contained"
                  startIcon={<TrendingUpIcon />}
                  onClick={() => navigate(`/projects/${projectId}/trends`)}
                  color="info"
                >
                  View Trends
                </Button>
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
                  color="success"
                  startIcon={<DownloadIcon />}
                  onClick={() => setExportDialogOpen(true)}
                >
                  Export Report
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
            onAddSimilar={(templateId: number) => {
              setPreSelectedTemplateId(templateId);
              setQuickAddDialogOpen(true);
            }}
          />
        </Grid>
      </Grid>

      {/* Upload Dialog */}
      <Dialog 
        open={uploadDialogOpen} 
        onClose={() => setUploadDialogOpen(false)}
        aria-labelledby="upload-dialog-title"
        aria-describedby="upload-dialog-description"
      >
        <DialogTitle id="upload-dialog-title">Upload Scanner Report</DialogTitle>
        <DialogContent>
          <Box 
            {...getRootProps()} 
            sx={{
              border: '2px dashed grey',
              p: 3,
              textAlign: 'center',
              cursor: 'pointer'
            }}
            role="button"
            tabIndex={0}
            aria-label="Drag and drop file upload area. Click or press Enter to select a file"
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                const input = document.querySelector('input[type="file"]') as HTMLInputElement;
                input?.click();
              }
            }}
          >
            <input {...getInputProps()} aria-label="File input" />
            <Typography id="upload-dialog-description">
              Drag and drop a report file here, or click to select
            </Typography>
            <Typography variant="caption" color="textSecondary">
              Supported formats: Burp Suite XML, Nessus XML (max 10MB)
            </Typography>
          </Box>
        </DialogContent>
      </Dialog>

      {/* Settings Dialog */}
      <Dialog 
        open={settingsDialogOpen} 
        onClose={() => setSettingsDialogOpen(false)} 
        maxWidth="sm" 
        fullWidth
        aria-labelledby="settings-dialog-title"
      >
        <DialogTitle id="settings-dialog-title">Dashboard Settings</DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2 }}>
            <Typography variant="h6" gutterBottom>Table Settings</Typography>
            <Box sx={{ ml: 2, mb: 2 }} role="group" aria-label="Table column visibility settings">
              <FormControlLabel
                control={
                  <Checkbox 
                    checked={preferences.tableColumns?.title?.visible ?? true}
                    onChange={(e) => {
                      prefsService.updateColumnVisibility('title', e.target.checked);
                      setPreferences(prefsService.getPreferences());
                      showSuccess('Table settings saved');
                    }}
                    inputProps={{ 'aria-label': 'Show title column' }}
                  />
                }
                label="Show Title Column"
              />
              <FormControlLabel
                control={
                  <Checkbox 
                    checked={preferences.tableColumns?.risk_rating?.visible ?? true}
                    onChange={(e) => {
                      prefsService.updateColumnVisibility('risk_rating', e.target.checked);
                      setPreferences(prefsService.getPreferences());
                      showSuccess('Table settings saved');
                    }}
                    inputProps={{ 'aria-label': 'Show risk level column' }}
                  />
                }
                label="Show Risk Level Column"
              />
              <FormControlLabel
                control={
                  <Checkbox 
                    checked={preferences.tableColumns?.instances?.visible ?? true}
                    onChange={(e) => {
                      prefsService.updateColumnVisibility('instances', e.target.checked);
                      setPreferences(prefsService.getPreferences());
                      showSuccess('Table settings saved');
                    }}
                    inputProps={{ 'aria-label': 'Show instances column' }}
                  />
                }
                label="Show Instances Column"
              />
              <FormControlLabel
                control={
                  <Checkbox 
                    checked={preferences.tableColumns?.description?.visible ?? false}
                    onChange={(e) => {
                      prefsService.updateColumnVisibility('description', e.target.checked);
                      setPreferences(prefsService.getPreferences());
                      showSuccess('Table settings saved');
                    }}
                  />
                }
                label="Show Description Column"
              />
            </Box>
            
            <Typography variant="h6" gutterBottom sx={{ mt: 3 }}>Page Size</Typography>
            <Select
              value={preferences.pageSize || 25}
              onChange={(e: any) => {
                updatePreferences({ ...preferences, pageSize: e.target.value as number });
                showSuccess('Page size updated');
              }}
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
              onChange={(e: any) => {
                updatePreferences({ ...preferences, defaultRiskFilter: e.target.value });
                showSuccess('Default filter updated');
              }}
              sx={{ ml: 2 }}
            >
              <MenuItem value="All">All Risk Levels</MenuItem>
              <MenuItem value="Critical">Critical Only</MenuItem>
              <MenuItem value="High">High and Above</MenuItem>
              <MenuItem value="Medium">Medium and Above</MenuItem>
            </Select>
            
            <Typography variant="h6" gutterBottom sx={{ mt: 3 }}>Timezone</Typography>
            <Select
              value={preferences.timezone || 'Asia/Kuala_Lumpur'}
              onChange={(e: any) => {
                prefsService.setTimezone(e.target.value);
                setPreferences(prefsService.getPreferences());
                showSuccess('Timezone preference saved');
              }}
              sx={{ ml: 2, minWidth: 300 }}
            >
              <MenuItem value="Asia/Kuala_Lumpur">GMT+8 (Malaysia Time)</MenuItem>
              <MenuItem value="Asia/Singapore">GMT+8 (Singapore Time)</MenuItem>
              <MenuItem value="Asia/Manila">GMT+8 (Philippines Time)</MenuItem>
              <MenuItem value="Asia/Hong_Kong">GMT+8 (Hong Kong Time)</MenuItem>
              <MenuItem value="Asia/Shanghai">GMT+8 (China Standard Time)</MenuItem>
              <MenuItem value="Asia/Taipei">GMT+8 (Taiwan Time)</MenuItem>
              <MenuItem value="Asia/Jakarta">GMT+7 (Western Indonesia Time)</MenuItem>
              <MenuItem value="Asia/Bangkok">GMT+7 (Indochina Time)</MenuItem>
              <MenuItem value="Asia/Tokyo">GMT+9 (Japan Standard Time)</MenuItem>
              <MenuItem value="Asia/Seoul">GMT+9 (Korea Standard Time)</MenuItem>
              <MenuItem value="UTC">UTC (Coordinated Universal Time)</MenuItem>
              <MenuItem value="America/New_York">GMT-5/-4 (Eastern Time)</MenuItem>
              <MenuItem value="America/Los_Angeles">GMT-8/-7 (Pacific Time)</MenuItem>
              <MenuItem value="Europe/London">GMT+0/+1 (British Time)</MenuItem>
              <MenuItem value="Europe/Paris">GMT+1/+2 (Central European Time)</MenuItem>
              <MenuItem value="Australia/Sydney">GMT+10/+11 (Australian Eastern Time)</MenuItem>
            </Select>
            <Typography variant="caption" color="textSecondary" sx={{ ml: 2, mt: 1, display: 'block' }}>
              All timestamps will be displayed in your selected timezone
            </Typography>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => {
            prefsService.resetPreferences();
            setPreferences(prefsService.getPreferences());
          }}>
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

      {/* Export Dialog */}
      <ExportDialog
        open={exportDialogOpen}
        onClose={() => setExportDialogOpen(false)}
        onExport={handleExport}
        projectId={parseInt(projectId as string, 10)}
      />

      {/* Quick Add Dialog */}
      <QuickAddDialog
        open={quickAddDialogOpen}
        onClose={() => {
          setQuickAddDialogOpen(false);
          setPreSelectedTemplateId(undefined); // Clear pre-selection on close
        }}
        onSuccess={() => {
          fetchProject();
          showSuccess('Finding created successfully');
          setPreSelectedTemplateId(undefined); // Clear pre-selection on success
        }}
        projectId={parseInt(projectId as string, 10)}
        preSelectedTemplateId={preSelectedTemplateId}
      />

      <MatchReviewDialog
        open={matchReviewDialogOpen}
        onClose={() => setMatchReviewDialogOpen(false)}
        projectId={parseInt(projectId as string, 10)}
        onMatchesCreated={() => {
          fetchProject();
          showSuccess('Matches created successfully');
        }}
      />
    </Box>
  );
};

export default Dashboard;