// frontend/src/components/ModularReportGenerator.tsx
// v0.12.0 - Updated to use unified template system with database-backed templates
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
  IconButton,
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
  Badge,
  FormControlLabel,
  Checkbox,
} from '@mui/material';
import {
  Download as DownloadIcon,
  DragIndicator as DragIcon,
  Info as InfoIcon,
  CheckCircle as CheckIcon,
  Error as ErrorIcon,
  Refresh as RefreshIcon,
  Upload as UploadIcon,
  CloudUpload as CloudUploadIcon,
  Star as StarIcon,
  Person as PersonIcon,
  Delete as DeleteIcon,
  Warning as WarningIcon,
  VerifiedUser as VerifyIcon,
  Visibility as PreviewIcon,
} from '@mui/icons-material';
import { useParams } from 'react-router-dom';
import { DragDropContext, Droppable, Draggable, DropResult } from 'react-beautiful-dnd';
import PageBreadcrumbs from './PageBreadcrumbs';

// Use relative path for API calls - proxied through Nginx in Docker
const API_BASE_URL = '/api';

interface ReportTemplate {
  id: number;
  name: string;
  exists: boolean;
  path: string;
  description: string;
  template_type: string;
  is_system: boolean;
  is_public: boolean;
}

interface Project {
  id: number;
  name: string;
  consultant_name: string;
}

const ModularReportGenerator: React.FC = () => {
  const { projectId } = useParams<{ projectId: string }>();
  
  const [project, setProject] = useState<Project | null>(null);
  const [availableTemplates, setAvailableTemplates] = useState<ReportTemplate[]>([]);
  const [selectedTemplateIds, setSelectedTemplateIds] = useState<number[]>([]);
  const [customVariables, setCustomVariables] = useState({
    company_name: '',
    report_date: new Date().toISOString().split('T')[0],
    report_version: '1.0',
    consultant_email: '',
    assessment_period: '',
  });
  
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [previewing, setPreviewing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [infoDialogOpen, setInfoDialogOpen] = useState(false);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [selectedTemplateInfo, setSelectedTemplateInfo] = useState<ReportTemplate | null>(null);
  const [templateToDelete, setTemplateToDelete] = useState<ReportTemplate | null>(null);
  
  // Upload form state
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadName, setUploadName] = useState('');
  const [uploadDescription, setUploadDescription] = useState('');
  const [uploadIsPublic, setUploadIsPublic] = useState(false);

  useEffect(() => {
    loadProject();
    loadAvailableTemplates();
  }, [projectId]);

  const loadProject = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/projects/${projectId}`);
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

  const loadAvailableTemplates = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/projects/${projectId}/templates`);
      if (!response.ok) throw new Error('Failed to load templates');
      const data = await response.json();
      setAvailableTemplates(data.templates);
      
      // Pre-select recommended system templates
      const systemTemplates = data.templates.filter((t: ReportTemplate) => t.is_system);
      const recommendedNames = ['Title Page', 'Executive Summary', 'Detailed Findings', 'Recommendations'];
      const recommended = systemTemplates
        .filter((t: ReportTemplate) => recommendedNames.includes(t.name) && t.exists)
        .map((t: ReportTemplate) => t.id);
      setSelectedTemplateIds(recommended);
    } catch (err) {
      setError('Failed to load available templates');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const toggleTemplate = (templateId: number) => {
    setSelectedTemplateIds(prev => 
      prev.includes(templateId)
        ? prev.filter(id => id !== templateId)
        : [...prev, templateId]
    );
  };

  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) return;

    const items = Array.from(selectedTemplateIds);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    setSelectedTemplateIds(items);
  };

  const generateReport = async () => {
    if (selectedTemplateIds.length === 0) {
      setError('Please select at least one template');
      return;
    }

    setGenerating(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch(`${API_BASE_URL}/projects/${projectId}/report/assemble/v2`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          template_ids: selectedTemplateIds,
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
      a.download = `${project?.name.replace(/\s/g, '_')}_Custom_Report_${customVariables.report_date}.docx`;
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

  const previewTemplate = async (templateId: number) => {
    setPreviewing(true);
    setError(null);

    try {
      const response = await fetch(`${API_BASE_URL}/projects/${projectId}/templates/${templateId}/preview`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          variables: customVariables,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to generate preview');
      }

      // Download the preview DOCX file
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      
      // Get template name for filename
      const template = availableTemplates.find(t => t.id === templateId);
      const templateName = template?.name.replace(/\s/g, '_') || 'Template';
      a.download = `PREVIEW_${templateName}_${new Date().toISOString().split('T')[0]}.docx`;
      
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      setSuccess('Preview generated! The file has a watermark to indicate it uses sample data.');
    } catch (err: any) {
      setError(err.message || 'Failed to generate preview');
      console.error(err);
    } finally {
      setPreviewing(false);
    }
  };

  const handleUploadTemplate = async () => {
    if (!uploadFile || !uploadName) {
      setError('Please provide a file and template name');
      return;
    }

    setUploading(true);
    setError(null);

    const formData = new FormData();
    formData.append('file', uploadFile);
    formData.append('name', uploadName);
    formData.append('description', uploadDescription);
    formData.append('template_type', 'Custom');
    formData.append('is_public', uploadIsPublic.toString());

    try {
      const response = await fetch(`${API_BASE_URL}/projects/${projectId}/templates/upload`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to upload template');
      }

      setSuccess('Template uploaded successfully!');
      setUploadDialogOpen(false);
      setUploadFile(null);
      setUploadName('');
      setUploadDescription('');
      setUploadIsPublic(false);
      
      // Reload templates
      loadAvailableTemplates();
    } catch (err: any) {
      setError(err.message || 'Failed to upload template');
      console.error(err);
    } finally {
      setUploading(false);
    }
  };

  const handleVerifyTemplates = async () => {
    setVerifying(true);
    setError(null);
    
    try {
      const response = await fetch(`${API_BASE_URL}/projects/${projectId}/templates/verify`);
      
      if (!response.ok) {
        throw new Error('Failed to verify templates');
      }
      
      const data = await response.json();
      
      if (data.invalid_templates > 0) {
        setError(`Found ${data.invalid_templates} template(s) with missing files. Check the console for details.`);
        console.warn('Template verification results:', data);
      } else {
        setSuccess('All templates verified successfully!');
      }
      
      // Reload templates to update status
      loadAvailableTemplates();
    } catch (err: any) {
      setError(err.message || 'Failed to verify templates');
      console.error(err);
    } finally {
      setVerifying(false);
    }
  };

  const handleDeleteTemplate = async () => {
    if (!templateToDelete) return;
    
    try {
      const response = await fetch(
        `${API_BASE_URL}/projects/${projectId}/templates/${templateToDelete.id}`,
        { method: 'DELETE' }
      );
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ detail: 'Failed to delete template' }));
        throw new Error(errorData.detail || 'Failed to delete template');
      }
      
      setSuccess(`Template "${templateToDelete.name}" deleted successfully!`);
      setDeleteDialogOpen(false);
      setTemplateToDelete(null);
      
      // Remove from selected if it was selected
      setSelectedTemplateIds(prev => prev.filter(id => id !== templateToDelete.id));
      
      // Reload templates
      loadAvailableTemplates();
    } catch (err: any) {
      setError(err.message || 'Failed to delete template');
      console.error(err);
    }
  };

  const confirmDeleteTemplate = (template: ReportTemplate) => {
    setTemplateToDelete(template);
    setDeleteDialogOpen(true);
  };

  const showTemplateInfo = (template: ReportTemplate) => {
    setSelectedTemplateInfo(template);
    setInfoDialogOpen(true);
  };

  const getTemplateIcon = (template: ReportTemplate) => {
    if (!template.is_system) return '📝'; // Custom template
    
    const icons: Record<string, string> = {
      'Title Page': '📄',
      'Executive Summary': '📊',
      'Risk Charts': '📈',
      'Top Findings': '🔝',
      'Detailed Findings': '🔍',
      'Recommendations': '💡',
      'Appendix': '📚',
      'SLA Status': '⏰',
      'OWASP Compliance': '🛡️',
      'CWE Compliance': '🔐',
      'Jira Integration': '🎫',
    };
    return icons[template.name] || '📋';
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  const systemTemplates = availableTemplates.filter(t => t.is_system);
  const customTemplates = availableTemplates.filter(t => !t.is_system);

  return (
    <Box sx={{ p: 3 }}>
      <PageBreadcrumbs projectId={projectId} projectName={project?.name} />
      
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          📝 Modular Report Generator
          <Chip label="v0.12.0" size="small" color="primary" />
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Select templates to create a customized security assessment report • Mix system and custom templates
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
        {/* Available Templates */}
        <Grid item xs={12} md={6}>
          <Stack spacing={2}>
            {/* System Templates */}
            <Paper sx={{ p: 3 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6">
                  <StarIcon sx={{ verticalAlign: 'middle', mr: 1, color: 'warning.main' }} />
                  System Templates ({systemTemplates.filter(t => t.exists).length})
                </Typography>
                <IconButton size="small" onClick={loadAvailableTemplates}>
                  <RefreshIcon />
                </IconButton>
              </Box>
              
              <Stack spacing={1}>
                {systemTemplates.map((template) => (
                  <Card 
                    key={template.id}
                    variant="outlined"
                    sx={{ 
                      cursor: template.exists ? 'pointer' : 'not-allowed',
                      opacity: template.exists ? 1 : 0.5,
                      bgcolor: selectedTemplateIds.includes(template.id) ? 'action.selected' : 'background.paper',
                      '&:hover': template.exists ? { bgcolor: 'action.hover' } : {},
                    }}
                    onClick={() => template.exists && toggleTemplate(template.id)}
                  >
                    <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flex: 1 }}>
                          <Typography variant="h6">{getTemplateIcon(template)}</Typography>
                          <Box sx={{ flex: 1 }}>
                            <Typography variant="subtitle2">
                              {template.name}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {template.description}
                            </Typography>
                          </Box>
                        </Box>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          {template.exists ? (
                            <Chip icon={<CheckIcon />} label="Ready" color="success" size="small" />
                          ) : (
                            <Chip icon={<ErrorIcon />} label="N/A" color="error" size="small" />
                          )}
                          <Checkbox 
                            checked={selectedTemplateIds.includes(template.id)}
                            disabled={!template.exists}
                            edge="end"
                          />
                          <IconButton 
                            size="small"
                            color="primary"
                            disabled={!template.exists || previewing}
                            onClick={(e) => {
                              e.stopPropagation();
                              previewTemplate(template.id);
                            }}
                            title="Preview with sample data"
                          >
                            <PreviewIcon fontSize="small" />
                          </IconButton>
                          <IconButton 
                            size="small" 
                            onClick={(e) => {
                              e.stopPropagation();
                              showTemplateInfo(template);
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

            {/* Custom Templates */}
            <Paper sx={{ p: 3 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6">
                  <PersonIcon sx={{ verticalAlign: 'middle', mr: 1, color: 'info.main' }} />
                  Custom Templates ({customTemplates.length})
                </Typography>
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <Button
                    startIcon={verifying ? <CircularProgress size={16} /> : <VerifyIcon />}
                    variant="outlined"
                    size="small"
                    onClick={handleVerifyTemplates}
                    disabled={verifying || customTemplates.length === 0}
                  >
                    Verify
                  </Button>
                  <Button
                    startIcon={<CloudUploadIcon />}
                    variant="contained"
                    size="small"
                    onClick={() => setUploadDialogOpen(true)}
                  >
                    Upload
                  </Button>
                </Box>
              </Box>
              
              {customTemplates.length === 0 ? (
                <Alert severity="info">
                  No custom templates yet. Upload a DOCX template with Jinja2 placeholders.
                </Alert>
              ) : (
                <Stack spacing={1}>
                  {customTemplates.map((template) => (
                    <Card 
                      key={template.id}
                      variant="outlined"
                      sx={{ 
                        cursor: 'pointer',
                        bgcolor: selectedTemplateIds.includes(template.id) ? 'action.selected' : 'background.paper',
                        '&:hover': { bgcolor: 'action.hover' },
                        borderColor: !template.exists ? 'error.main' : 'divider',
                      }}
                      onClick={() => toggleTemplate(template.id)}
                    >
                      <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flex: 1 }}>
                            <Typography variant="h6">{getTemplateIcon(template)}</Typography>
                            <Box sx={{ flex: 1 }}>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <Typography variant="subtitle2">
                                  {template.name}
                                </Typography>
                                {!template.exists && (
                                  <Chip 
                                    icon={<WarningIcon />} 
                                    label="File Missing" 
                                    color="error" 
                                    size="small" 
                                  />
                                )}
                              </Box>
                              <Typography variant="caption" color="text.secondary">
                                {template.description || 'Custom template'}
                              </Typography>
                            </Box>
                          </Box>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            {template.is_public && (
                              <Chip label="Public" color="success" size="small" />
                            )}
                            <Chip label="Custom" color="info" size="small" />
                            <Checkbox 
                              checked={selectedTemplateIds.includes(template.id)}
                              disabled={!template.exists}
                              edge="end" 
                            />
                            <IconButton
                              size="small"
                              color="primary"
                              disabled={!template.exists || previewing}
                              onClick={(e) => {
                                e.stopPropagation();
                                previewTemplate(template.id);
                              }}
                              title="Preview with sample data"
                            >
                              <PreviewIcon fontSize="small" />
                            </IconButton>
                            <IconButton
                              size="small"
                              color="error"
                              onClick={(e) => {
                                e.stopPropagation();
                                confirmDeleteTemplate(template);
                              }}
                            >
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </Box>
                        </Box>
                      </CardContent>
                    </Card>
                  ))}
                </Stack>
              )}
            </Paper>
          </Stack>
        </Grid>

        {/* Selected Templates & Configuration */}
        <Grid item xs={12} md={6}>
          <Stack spacing={3}>
            {/* Selected Templates */}
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                Selected Templates ({selectedTemplateIds.length})
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Drag to reorder • Templates will appear in this order
              </Typography>

              {selectedTemplateIds.length === 0 ? (
                <Alert severity="info">
                  No templates selected. Click on available templates to add them.
                </Alert>
              ) : (
                <DragDropContext onDragEnd={handleDragEnd}>
                  <Droppable droppableId="selected-templates">
                    {(provided) => (
                      <List 
                        {...provided.droppableProps} 
                        ref={provided.innerRef}
                        dense
                      >
                        {selectedTemplateIds.map((templateId, index) => {
                          const template = availableTemplates.find(t => t.id === templateId);
                          if (!template) return null;
                          return (
                            <Draggable key={templateId} draggableId={`template-${templateId}`} index={index}>
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
                                    primary={
                                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                        {`${index + 1}. ${getTemplateIcon(template)} ${template.name}`}
                                        {!template.is_system && <Chip label="Custom" size="small" color="info" />}
                                      </Box>
                                    }
                                    secondary={template.description}
                                  />
                                  <IconButton 
                                    size="small" 
                                    onClick={() => toggleTemplate(templateId)}
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
                Customize report metadata (fills placeholders in templates)
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
              disabled={generating || selectedTemplateIds.length === 0}
              fullWidth
              sx={{ py: 1.5 }}
            >
              {generating ? 'Generating Report...' : `Generate Report (${selectedTemplateIds.length} templates)`}
            </Button>

            {/* Quick Actions */}
            <Stack direction="row" spacing={1}>
              <Button
                variant="outlined"
                size="small"
                startIcon={<RefreshIcon />}
                onClick={loadAvailableTemplates}
                fullWidth
              >
                Refresh
              </Button>
              <Button
                variant="outlined"
                size="small"
                onClick={() => {
                  const recommendedNames = ['Title Page', 'Executive Summary', 'Detailed Findings', 'Recommendations'];
                  const recommended = systemTemplates
                    .filter(t => recommendedNames.includes(t.name) && t.exists)
                    .map(t => t.id);
                  setSelectedTemplateIds(recommended);
                }}
                fullWidth
              >
                Reset to Defaults
              </Button>
            </Stack>
          </Stack>
        </Grid>
      </Grid>

      {/* Template Upload Dialog */}
      <Dialog open={uploadDialogOpen} onClose={() => setUploadDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Upload Custom Template</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <Alert severity="info">
              Upload a DOCX file with Jinja2 placeholders like <code>{'{{ project.name }}'}</code>, <code>{'{% for f in findings %}'}</code>
            </Alert>
            
            <Button
              component="label"
              variant="outlined"
              startIcon={<UploadIcon />}
              fullWidth
            >
              {uploadFile ? uploadFile.name : 'Choose DOCX File'}
              <input
                type="file"
                accept=".docx"
                hidden
                onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
              />
            </Button>

            <TextField
              label="Template Name"
              value={uploadName}
              onChange={(e) => setUploadName(e.target.value)}
              fullWidth
              required
              placeholder="My Custom Report Template"
            />

            <TextField
              label="Description"
              value={uploadDescription}
              onChange={(e) => setUploadDescription(e.target.value)}
              fullWidth
              multiline
              rows={2}
              placeholder="Brief description of what this template contains"
            />

            <FormControlLabel
              control={
                <Checkbox
                  checked={uploadIsPublic}
                  onChange={(e) => setUploadIsPublic(e.target.checked)}
                />
              }
              label="Share with all projects (public)"
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setUploadDialogOpen(false)}>Cancel</Button>
          <Button 
            onClick={handleUploadTemplate} 
            variant="contained"
            disabled={uploading || !uploadFile || !uploadName}
            startIcon={uploading ? <CircularProgress size={20} /> : <CloudUploadIcon />}
          >
            {uploading ? 'Uploading...' : 'Upload'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Template Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Delete Template?</DialogTitle>
        <DialogContent>
          <Alert severity="warning" sx={{ mb: 2 }}>
            This will permanently delete the template and its file from storage.
          </Alert>
          <Typography>
            Are you sure you want to delete <strong>{templateToDelete?.name}</strong>?
          </Typography>
          {!templateToDelete?.exists && (
            <Alert severity="info" sx={{ mt: 2 }}>
              Note: The file is already missing. This will only remove the database entry.
            </Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
          <Button 
            onClick={handleDeleteTemplate} 
            variant="contained"
            color="error"
            startIcon={<DeleteIcon />}
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      {/* Template Info Dialog */}
      <Dialog open={infoDialogOpen} onClose={() => setInfoDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          {selectedTemplateInfo && (
            <>
              {getTemplateIcon(selectedTemplateInfo)} {selectedTemplateInfo.name}
            </>
          )}
        </DialogTitle>
        <DialogContent>
          {selectedTemplateInfo && (
            <Stack spacing={2}>
              <Typography variant="body1">
                {selectedTemplateInfo.description || 'No description available'}
              </Typography>
              <Divider />
              <Typography variant="body2" color="text.secondary">
                <strong>Type:</strong> {selectedTemplateInfo.template_type}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                <strong>Source:</strong> {selectedTemplateInfo.is_system ? 'System Template' : 'Custom Upload'}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                <strong>Status:</strong> {selectedTemplateInfo.exists ? '✅ Available' : '❌ Not Available'}
              </Typography>
              {!selectedTemplateInfo.is_system && (
                <Typography variant="body2" color="text.secondary">
                  <strong>Visibility:</strong> {selectedTemplateInfo.is_public ? 'Public (All Projects)' : 'Private (This Project)'}
                </Typography>
              )}
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
