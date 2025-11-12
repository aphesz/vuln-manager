// frontend/src/components/ModularReportGenerator.tsx
import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Button,
  TextField,
  Chip,
  Alert,
  CircularProgress,
  Grid,
  Card,
  CardContent,
  CardActions,
  Checkbox,
  FormControlLabel,
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Stack,
  Divider,
} from '@mui/material';
import {
  Download as DownloadIcon,
  DragIndicator as DragIcon,
  Info as InfoIcon,
  CheckCircle as CheckIcon,
  Error as ErrorIcon,
  Refresh as RefreshIcon,
  Preview as PreviewIcon,
  Settings as SettingsIcon,
} from '@mui/icons-material';
import { useParams, useNavigate } from 'react-router-dom';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';
import PageBreadcrumbs from './PageBreadcrumbs';

interface ReportModule {
  name: string;
  exists: boolean;
  path: string;
  description: string;
}

interface Project {
  id: number;
  name: string;
  consultant_name: string;
}

const ModularReportGenerator: React.FC = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  
  const [project, setProject] = useState<Project | null>(null);
  const [availableModules, setAvailableModules] = useState<ReportModule[]>([]);
  const [selectedModules, setSelectedModules] = useState<string[]>([]);
  const [customVariables, setCustomVariables] = useState({
    company_name: '',
    report_date: new Date().toISOString().split('T')[0],
    report_version: '1.0',
    consultant_email: '',
    assessment_period: '',
  });
  
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [infoDialogOpen, setInfoDialogOpen] = useState(false);
  const [selectedModuleInfo, setSelectedModuleInfo] = useState<ReportModule | null>(null);

  useEffect(() => {
    loadProject();
    loadAvailableModules();
  }, [projectId]);

  const loadProject = async () => {
    try {
      const response = await fetch(`http://localhost:8000/projects/${projectId}`);
      if (!response.ok) throw new Error('Failed to load project');
      const data = await response.json();
      setProject(data);
      setCustomVariables(prev => ({
        ...prev,
        consultant_email: data.consultant_name ? `${data.consultant_name.toLowerCase().replace(/\s/g, '.')}@company.com` : '',
      }));
    } catch (err) {
      setError('Failed to load project details');
      console.error(err);
    }
  };

  const loadAvailableModules = async () => {
    setLoading(true);
    try {
      const response = await fetch('http://localhost:8000/report/modules');
      if (!response.ok) throw new Error('Failed to load modules');
      const data = await response.json();
      setAvailableModules(data.modules);
      
      // Pre-select recommended modules
      const recommended = ['title_page', 'executive_summary', 'detailed_findings', 'recommendations'];
      setSelectedModules(recommended.filter(m => 
        data.modules.find((mod: ReportModule) => mod.name === m && mod.exists)
      ));
    } catch (err) {
      setError('Failed to load available report modules');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const toggleModule = (moduleName: string) => {
    setSelectedModules(prev => 
      prev.includes(moduleName)
        ? prev.filter(m => m !== moduleName)
        : [...prev, moduleName]
    );
  };

  const handleDragEnd = (result: any) => {
    if (!result.destination) return;

    const items = Array.from(selectedModules);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    setSelectedModules(items);
  };

  const generateReport = async () => {
    if (selectedModules.length === 0) {
      setError('Please select at least one module');
      return;
    }

    setGenerating(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch(`http://localhost:8000/projects/${projectId}/report/assemble`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          modules: selectedModules,
          variables: customVariables,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to generate report');
      }

      // Download the DOCX file
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${project?.name.replace(/\s/g, '_')}_Report_${customVariables.report_date}.docx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      setSuccess('Report generated successfully! Check your downloads folder.');
    } catch (err: any) {
      setError(err.message || 'Failed to generate report');
      console.error(err);
    } finally {
      setGenerating(false);
    }
  };

  const showModuleInfo = (module: ReportModule) => {
    setSelectedModuleInfo(module);
    setInfoDialogOpen(true);
  };

  const getModuleIcon = (moduleName: string) => {
    const icons: Record<string, string> = {
      title_page: '📄',
      executive_summary: '📊',
      risk_charts: '📈',
      top_findings: '🔝',
      detailed_findings: '🔍',
      recommendations: '💡',
      appendix: '📚',
      sla_status: '⏰',
      compliance_owasp: '🛡️',
      compliance_cwe: '🔐',
      jira_integration: '🎫',
    };
    return icons[moduleName] || '📋';
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <PageBreadcrumbs projectId={projectId} projectName={project?.name} />
      
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          📝 Modular Report Generator
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Select and order modules to create a customized security assessment report
        </Typography>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {success && (
        <Alert severity="success" sx={{ mb: 3 }} onClose={() => setSuccess(null)}>
          {success}
        </Alert>
      )}

      <Grid container spacing={3}>
        {/* Available Modules */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Available Modules ({availableModules.filter(m => m.exists).length}/{availableModules.length})
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Click to add modules to your report
            </Typography>
            
            <Stack spacing={1}>
              {availableModules.map((module) => (
                <Card 
                  key={module.name}
                  variant="outlined"
                  sx={{ 
                    cursor: module.exists ? 'pointer' : 'not-allowed',
                    opacity: module.exists ? 1 : 0.5,
                    bgcolor: selectedModules.includes(module.name) ? 'action.selected' : 'background.paper',
                    '&:hover': module.exists ? { bgcolor: 'action.hover' } : {},
                  }}
                  onClick={() => module.exists && toggleModule(module.name)}
                >
                  <CardContent sx={{ py: 1.5 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flex: 1 }}>
                        <Typography variant="h6">{getModuleIcon(module.name)}</Typography>
                        <Box sx={{ flex: 1 }}>
                          <Typography variant="subtitle2">
                            {module.name.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {module.description}
                          </Typography>
                        </Box>
                      </Box>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        {module.exists ? (
                          <Chip 
                            icon={<CheckIcon />} 
                            label="Ready" 
                            color="success" 
                            size="small" 
                          />
                        ) : (
                          <Chip 
                            icon={<ErrorIcon />} 
                            label="Not Available" 
                            color="error" 
                            size="small" 
                          />
                        )}
                        <Checkbox 
                          checked={selectedModules.includes(module.name)}
                          disabled={!module.exists}
                          edge="end"
                        />
                        <IconButton 
                          size="small" 
                          onClick={(e) => {
                            e.stopPropagation();
                            showModuleInfo(module);
                          }}
                        >
                          <InfoIcon fontSize="small" />
                        </IconButton>
                      </Box>
                    </Box>
                  </CardContent>
                </Card>
              ))}
            </Stack>
          </Paper>
        </Grid>

        {/* Selected Modules & Configuration */}
        <Grid item xs={12} md={6}>
          <Stack spacing={3}>
            {/* Selected Modules */}
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                Selected Modules ({selectedModules.length})
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Drag to reorder • Modules will appear in this order
              </Typography>

              {selectedModules.length === 0 ? (
                <Alert severity="info">
                  No modules selected. Click on available modules to add them.
                </Alert>
              ) : (
                <DragDropContext onDragEnd={handleDragEnd}>
                  <Droppable droppableId="selected-modules">
                    {(provided) => (
                      <List 
                        {...provided.droppableProps} 
                        ref={provided.innerRef}
                        dense
                      >
                        {selectedModules.map((moduleName, index) => {
                          const module = availableModules.find(m => m.name === moduleName);
                          return (
                            <Draggable key={moduleName} draggableId={moduleName} index={index}>
                              {(provided) => (
                                <ListItem
                                  ref={provided.innerRef}
                                  {...provided.draggableProps}
                                  sx={{ 
                                    mb: 1, 
                                    bgcolor: 'background.paper',
                                    border: 1,
                                    borderColor: 'divider',
                                    borderRadius: 1,
                                  }}
                                >
                                  <ListItemIcon {...provided.dragHandleProps}>
                                    <DragIcon />
                                  </ListItemIcon>
                                  <ListItemText 
                                    primary={`${index + 1}. ${getModuleIcon(moduleName)} ${moduleName.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}`}
                                    secondary={module?.description}
                                  />
                                  <IconButton 
                                    size="small" 
                                    onClick={() => toggleModule(moduleName)}
                                    color="error"
                                  >
                                    ✕
                                  </IconButton>
                                </ListItem>
                              )}
                            </Draggable>
                          );
                        })}
                        {provided.placeholder}
                      </List>
                    )}
                  </Droppable>
                </DragDropContext>
              )}
            </Paper>

            {/* Custom Variables */}
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                Report Variables
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Customize report metadata
              </Typography>

              <Stack spacing={2}>
                <TextField
                  label="Company Name"
                  value={customVariables.company_name}
                  onChange={(e) => setCustomVariables(prev => ({ ...prev, company_name: e.target.value }))}
                  fullWidth
                  size="small"
                  placeholder="ACME Corporation"
                />
                <TextField
                  label="Report Date"
                  type="date"
                  value={customVariables.report_date}
                  onChange={(e) => setCustomVariables(prev => ({ ...prev, report_date: e.target.value }))}
                  fullWidth
                  size="small"
                  InputLabelProps={{ shrink: true }}
                />
                <TextField
                  label="Report Version"
                  value={customVariables.report_version}
                  onChange={(e) => setCustomVariables(prev => ({ ...prev, report_version: e.target.value }))}
                  fullWidth
                  size="small"
                  placeholder="1.0"
                />
                <TextField
                  label="Consultant Email"
                  value={customVariables.consultant_email}
                  onChange={(e) => setCustomVariables(prev => ({ ...prev, consultant_email: e.target.value }))}
                  fullWidth
                  size="small"
                  placeholder="consultant@company.com"
                />
                <TextField
                  label="Assessment Period"
                  value={customVariables.assessment_period}
                  onChange={(e) => setCustomVariables(prev => ({ ...prev, assessment_period: e.target.value }))}
                  fullWidth
                  size="small"
                  placeholder="October 1-31, 2024"
                />
              </Stack>
            </Paper>

            {/* Generate Button */}
            <Button
              variant="contained"
              size="large"
              startIcon={generating ? <CircularProgress size={20} /> : <DownloadIcon />}
              onClick={generateReport}
              disabled={generating || selectedModules.length === 0}
              fullWidth
              sx={{ py: 1.5 }}
            >
              {generating ? 'Generating Report...' : `Generate Report (${selectedModules.length} modules)`}
            </Button>

            {/* Quick Actions */}
            <Stack direction="row" spacing={1}>
              <Button
                variant="outlined"
                size="small"
                startIcon={<RefreshIcon />}
                onClick={loadAvailableModules}
                fullWidth
              >
                Refresh Modules
              </Button>
              <Button
                variant="outlined"
                size="small"
                onClick={() => {
                  const recommended = ['title_page', 'executive_summary', 'detailed_findings', 'recommendations'];
                  setSelectedModules(recommended.filter(m => 
                    availableModules.find(mod => mod.name === m && mod.exists)
                  ));
                }}
                fullWidth
              >
                Reset to Defaults
              </Button>
            </Stack>
          </Stack>
        </Grid>
      </Grid>

      {/* Module Info Dialog */}
      <Dialog open={infoDialogOpen} onClose={() => setInfoDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          {selectedModuleInfo && (
            <>
              {getModuleIcon(selectedModuleInfo.name)} {selectedModuleInfo.name.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
            </>
          )}
        </DialogTitle>
        <DialogContent>
          {selectedModuleInfo && (
            <Stack spacing={2}>
              <Typography variant="body1">
                {selectedModuleInfo.description}
              </Typography>
              <Divider />
              <Typography variant="body2" color="text.secondary">
                <strong>Path:</strong> {selectedModuleInfo.path}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                <strong>Status:</strong> {selectedModuleInfo.exists ? '✅ Available' : '❌ Not Generated'}
              </Typography>
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setInfoDialogOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ModularReportGenerator;
