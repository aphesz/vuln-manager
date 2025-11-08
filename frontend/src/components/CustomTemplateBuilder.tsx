// frontend/src/components/CustomTemplateBuilder.tsx
import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  TextField,
  Typography,
  IconButton,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Grid,
  Paper,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControlLabel,
  Switch,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Alert,
  Snackbar
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  DragIndicator as DragIcon,
  ExpandMore as ExpandMoreIcon,
  Save as SaveIcon,
  Visibility as PreviewIcon,
  ArrowUpward as UpIcon,
  ArrowDownward as DownIcon,
  Close as CloseIcon
} from '@mui/icons-material';
import { useNavigate, useParams } from 'react-router-dom';
import CustomTemplateService, {
  CustomTemplateJSON,
  TemplateSection,
  CustomReportTemplate
} from '../services/CustomTemplateService';

const CustomTemplateBuilder: React.FC = () => {
  const navigate = useNavigate();
  const { templateId } = useParams<{ templateId?: string }>();
  const isEditMode = !!templateId;

  // Template state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isPublic, setIsPublic] = useState(false);
  const [templateData, setTemplateData] = useState<CustomTemplateJSON>(
    CustomTemplateService.createDefaultTemplate()
  );

  // UI state
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
    open: false,
    message: '',
    severity: 'success'
  });
  const [sectionDialogOpen, setSectionDialogOpen] = useState(false);
  const [newSectionType, setNewSectionType] = useState<TemplateSection['type']>('text');

  // Load template in edit mode
  useEffect(() => {
    if (isEditMode && templateId) {
      loadTemplate(parseInt(templateId));
    }
  }, [templateId]);

  const loadTemplate = async (id: number) => {
    try {
      setLoading(true);
      const template = await CustomTemplateService.getTemplate(id);
      setName(template.name);
      setDescription(template.description || '');
      setIsPublic(template.is_public);
      setTemplateData(CustomTemplateService.parseTemplateJSON(template.template_json));
    } catch (error) {
      showSnackbar('Failed to load template', 'error');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const showSnackbar = (message: string, severity: 'success' | 'error') => {
    setSnackbar({ open: true, message, severity });
  };

  const handleCloseSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  const handleAddSection = () => {
    const newSection: TemplateSection = {
      type: newSectionType,
      title: `New ${newSectionType.charAt(0).toUpperCase() + newSectionType.slice(1)} Section`,
      ...(newSectionType === 'text' && { content: 'Enter content here...' }),
      ...(newSectionType === 'metrics' && { widget: 'key_metrics' }),
      ...(newSectionType === 'chart' && { widget: 'risk_over_time' }),
      ...(newSectionType === 'findings' && { 
        filters: { 
          risk_rating: ['Critical', 'High'],
          issue_status: ['Open']
        }
      })
    };

    setTemplateData({
      ...templateData,
      sections: [...templateData.sections, newSection]
    });
    setSectionDialogOpen(false);
  };

  const handleRemoveSection = (index: number) => {
    const newSections = templateData.sections.filter((_, i) => i !== index);
    setTemplateData({ ...templateData, sections: newSections });
  };

  const handleMoveSection = (index: number, direction: 'up' | 'down') => {
    const newSections = [...templateData.sections];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    
    if (targetIndex >= 0 && targetIndex < newSections.length) {
      [newSections[index], newSections[targetIndex]] = [newSections[targetIndex], newSections[index]];
      setTemplateData({ ...templateData, sections: newSections });
    }
  };

  const handleUpdateSection = (index: number, updates: Partial<TemplateSection>) => {
    const newSections = [...templateData.sections];
    newSections[index] = { ...newSections[index], ...updates };
    setTemplateData({ ...templateData, sections: newSections });
  };

  const handleSave = async () => {
    // Validation
    if (!name.trim()) {
      showSnackbar('Template name is required', 'error');
      return;
    }

    if (templateData.sections.length === 0) {
      showSnackbar('Template must have at least one section', 'error');
      return;
    }

    try {
      setSaving(true);
      const template_json = CustomTemplateService.stringifyTemplateJSON(templateData);

      // Validate JSON structure
      const validation = CustomTemplateService.validateTemplateJSON(template_json);
      if (!validation.valid) {
        showSnackbar(`Validation error: ${validation.error}`, 'error');
        return;
      }

      if (isEditMode && templateId) {
        await CustomTemplateService.updateTemplate(parseInt(templateId), {
          name,
          description: description || undefined,
          template_json,
          is_public: isPublic
        });
        showSnackbar('Template updated successfully', 'success');
      } else {
        const created = await CustomTemplateService.createTemplate({
          name,
          description: description || undefined,
          template_json,
          is_public: isPublic,
          created_by: 'current_user'  // TODO: Get from auth context
        });
        showSnackbar('Template created successfully', 'success');
        setTimeout(() => navigate(`/custom-templates/${created.id}/edit`), 1500);
      }
    } catch (error) {
      showSnackbar('Failed to save template', 'error');
      console.error(error);
    } finally {
      setSaving(false);
    }
  };

  const renderSectionEditor = (section: TemplateSection, index: number) => {
    return (
      <Accordion key={index} defaultExpanded={index === 0}>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Box display="flex" alignItems="center" width="100%">
            <DragIcon sx={{ mr: 1, color: 'text.secondary' }} />
            <Chip 
              label={section.type} 
              size="small" 
              color="primary" 
              sx={{ mr: 2 }}
            />
            <Typography variant="subtitle1" sx={{ flexGrow: 1 }}>
              {section.title}
            </Typography>
            <IconButton
              size="small"
              onClick={(e) => {
                e.stopPropagation();
                handleMoveSection(index, 'up');
              }}
              disabled={index === 0}
            >
              <UpIcon />
            </IconButton>
            <IconButton
              size="small"
              onClick={(e) => {
                e.stopPropagation();
                handleMoveSection(index, 'down');
              }}
              disabled={index === templateData.sections.length - 1}
            >
              <DownIcon />
            </IconButton>
            <IconButton
              size="small"
              color="error"
              onClick={(e) => {
                e.stopPropagation();
                handleRemoveSection(index);
              }}
            >
              <DeleteIcon />
            </IconButton>
          </Box>
        </AccordionSummary>
        <AccordionDetails>
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Section Title"
                value={section.title}
                onChange={(e) => handleUpdateSection(index, { title: e.target.value })}
              />
            </Grid>

            {section.type === 'text' && (
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  multiline
                  rows={4}
                  label="Content"
                  value={section.content || ''}
                  onChange={(e) => handleUpdateSection(index, { content: e.target.value })}
                />
              </Grid>
            )}

            {section.type === 'metrics' && (
              <Grid item xs={12}>
                <FormControl fullWidth>
                  <InputLabel>Widget Type</InputLabel>
                  <Select
                    value={section.widget || 'key_metrics'}
                    onChange={(e) => handleUpdateSection(index, { widget: e.target.value })}
                  >
                    <MenuItem value="key_metrics">Key Metrics</MenuItem>
                    <MenuItem value="risk_distribution">Risk Distribution</MenuItem>
                    <MenuItem value="remediation_rate">Remediation Rate</MenuItem>
                    <MenuItem value="sla_compliance">SLA Compliance</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
            )}

            {section.type === 'chart' && (
              <Grid item xs={12}>
                <FormControl fullWidth>
                  <InputLabel>Chart Type</InputLabel>
                  <Select
                    value={section.widget || 'risk_over_time'}
                    onChange={(e) => handleUpdateSection(index, { widget: e.target.value })}
                  >
                    <MenuItem value="risk_over_time">Risk Score Over Time</MenuItem>
                    <MenuItem value="findings_timeline">Findings Timeline</MenuItem>
                    <MenuItem value="remediation_progress">Remediation Progress</MenuItem>
                    <MenuItem value="attack_surface">ATT&CK Surface</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
            )}

            {section.type === 'findings' && (
              <Grid item xs={12}>
                <Typography variant="subtitle2" gutterBottom>Filters</Typography>
                <Box display="flex" gap={1} flexWrap="wrap">
                  {['Critical', 'High', 'Medium', 'Low', 'Informational'].map((risk) => (
                    <Chip
                      key={risk}
                      label={risk}
                      onClick={() => {
                        const currentFilters = section.filters?.risk_rating || [];
                        const newFilters = currentFilters.includes(risk)
                          ? currentFilters.filter(r => r !== risk)
                          : [...currentFilters, risk];
                        handleUpdateSection(index, {
                          filters: { ...section.filters, risk_rating: newFilters }
                        });
                      }}
                      color={section.filters?.risk_rating?.includes(risk) ? 'primary' : 'default'}
                    />
                  ))}
                </Box>
              </Grid>
            )}
          </Grid>
        </AccordionDetails>
      </Accordion>
    );
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <Typography>Loading template...</Typography>
      </Box>
    );
  }

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4">
          {isEditMode ? 'Edit Custom Template' : 'Create Custom Template'}
        </Typography>
        <Box display="flex" gap={2}>
          <Button
            variant="outlined"
            startIcon={<CloseIcon />}
            onClick={() => navigate('/custom-templates')}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            color="primary"
            startIcon={<SaveIcon />}
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? 'Saving...' : 'Save Template'}
          </Button>
        </Box>
      </Box>

      <Grid container spacing={3}>
        {/* Template Settings */}
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>Template Settings</Typography>
              
              <TextField
                fullWidth
                label="Template Name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                margin="normal"
                required
              />

              <TextField
                fullWidth
                label="Description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                margin="normal"
                multiline
                rows={3}
              />

              <FormControlLabel
                control={
                  <Switch
                    checked={isPublic}
                    onChange={(e) => setIsPublic(e.target.checked)}
                  />
                }
                label="Make template public"
                sx={{ mt: 2 }}
              />

              <Box mt={3}>
                <Typography variant="subtitle2" gutterBottom>Page Layout</Typography>
                <FormControl fullWidth margin="normal">
                  <InputLabel>Page Size</InputLabel>
                  <Select
                    value={templateData.layout.page_size}
                    onChange={(e) => setTemplateData({
                      ...templateData,
                      layout: { ...templateData.layout, page_size: e.target.value as 'letter' | 'a4' }
                    })}
                  >
                    <MenuItem value="letter">Letter (8.5" × 11")</MenuItem>
                    <MenuItem value="a4">A4 (210mm × 297mm)</MenuItem>
                  </Select>
                </FormControl>

                <FormControl fullWidth margin="normal">
                  <InputLabel>Orientation</InputLabel>
                  <Select
                    value={templateData.layout.orientation}
                    onChange={(e) => setTemplateData({
                      ...templateData,
                      layout: { ...templateData.layout, orientation: e.target.value as 'portrait' | 'landscape' }
                    })}
                  >
                    <MenuItem value="portrait">Portrait</MenuItem>
                    <MenuItem value="landscape">Landscape</MenuItem>
                  </Select>
                </FormControl>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Section Editor */}
        <Grid item xs={12} md={8}>
          <Paper sx={{ p: 2 }}>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
              <Typography variant="h6">Report Sections</Typography>
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={() => setSectionDialogOpen(true)}
              >
                Add Section
              </Button>
            </Box>

            {templateData.sections.length === 0 ? (
              <Alert severity="info">
                No sections added yet. Click "Add Section" to get started.
              </Alert>
            ) : (
              <Box>
                {templateData.sections.map((section, index) => renderSectionEditor(section, index))}
              </Box>
            )}
          </Paper>
        </Grid>
      </Grid>

      {/* Add Section Dialog */}
      <Dialog open={sectionDialogOpen} onClose={() => setSectionDialogOpen(false)}>
        <DialogTitle>Add New Section</DialogTitle>
        <DialogContent>
          <FormControl fullWidth margin="normal">
            <InputLabel>Section Type</InputLabel>
            <Select
              value={newSectionType}
              onChange={(e) => setNewSectionType(e.target.value as TemplateSection['type'])}
            >
              <MenuItem value="text">Text Block</MenuItem>
              <MenuItem value="metrics">Metrics Cards</MenuItem>
              <MenuItem value="chart">Chart/Graph</MenuItem>
              <MenuItem value="findings">Findings Table</MenuItem>
              <MenuItem value="table">Data Table</MenuItem>
            </Select>
          </FormControl>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
            {newSectionType === 'text' && 'Add custom text content and descriptions'}
            {newSectionType === 'metrics' && 'Display key metrics and statistics'}
            {newSectionType === 'chart' && 'Visualize data with charts and graphs'}
            {newSectionType === 'findings' && 'Show filtered findings in a table'}
            {newSectionType === 'table' && 'Display structured tabular data'}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSectionDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleAddSection} variant="contained">Add</Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert onClose={handleCloseSnackbar} severity={snackbar.severity}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default CustomTemplateBuilder;
