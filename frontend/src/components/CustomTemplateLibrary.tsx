// frontend/src/components/CustomTemplateLibrary.tsx
import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  CardActions,
  Typography,
  Grid,
  IconButton,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Alert,
  Snackbar
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  FileCopy as DuplicateIcon,
  Visibility as ViewIcon,
  Public as PublicIcon,
  Lock as PrivateIcon
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import CustomTemplateService, { CustomReportTemplate } from '../services/CustomTemplateService';

const CustomTemplateLibrary: React.FC = () => {
  const navigate = useNavigate();
  const [templates, setTemplates] = useState<CustomReportTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; template: CustomReportTemplate | null }>({
    open: false,
    template: null
  });
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
    open: false,
    message: '',
    severity: 'success'
  });

  useEffect(() => {
    loadTemplates();
  }, [searchQuery]);

  const loadTemplates = async () => {
    try {
      setLoading(true);
      const data = await CustomTemplateService.listTemplates({
        search: searchQuery || undefined,
        limit: 50
      });
      setTemplates(data);
    } catch (error) {
      showSnackbar('Failed to load templates', 'error');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const showSnackbar = (message: string, severity: 'success' | 'error') => {
    setSnackbar({ open: true, message, severity });
  };

  const handleDelete = async () => {
    if (!deleteDialog.template) return;

    try {
      await CustomTemplateService.deleteTemplate(deleteDialog.template.id);
      showSnackbar('Template deleted successfully', 'success');
      setDeleteDialog({ open: false, template: null });
      loadTemplates();
    } catch (error) {
      showSnackbar('Failed to delete template', 'error');
      console.error(error);
    }
  };

  const handleDuplicate = async (template: CustomReportTemplate) => {
    try {
      const newName = `${template.name} (Copy)`;
      await CustomTemplateService.duplicateTemplate(template.id, newName);
      showSnackbar('Template duplicated successfully', 'success');
      loadTemplates();
    } catch (error) {
      showSnackbar('Failed to duplicate template', 'error');
      console.error(error);
    }
  };

  const handleViewDetails = (template: CustomReportTemplate) => {
    try {
      const templateData = CustomTemplateService.parseTemplateJSON(template.template_json);
      console.log('Template details:', templateData);
      // TODO(future): Add template preview modal with section breakdown
      showSnackbar(`Template has ${templateData.sections.length} sections`, 'success');
    } catch (error) {
      showSnackbar('Failed to parse template', 'error');
    }
  };

  const filteredTemplates = templates.filter(t =>
    t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4">Custom Report Templates</Typography>
        <Button
          variant="contained"
          color="primary"
          startIcon={<AddIcon />}
          onClick={() => navigate('/custom-templates/new')}
        >
          Create Template
        </Button>
      </Box>

      <TextField
        fullWidth
        placeholder="Search templates..."
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        sx={{ mb: 3 }}
      />

      {loading ? (
        <Typography>Loading templates...</Typography>
      ) : filteredTemplates.length === 0 ? (
        <Alert severity="info">
          {searchQuery ? 'No templates match your search.' : 'No templates created yet. Click "Create Template" to get started.'}
        </Alert>
      ) : (
        <Grid container spacing={3}>
          {filteredTemplates.map((template) => (
            <Grid item xs={12} sm={6} md={4} key={template.id}>
              <Card>
                <CardContent>
                  <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={1}>
                    <Typography variant="h6" component="div" noWrap sx={{ flexGrow: 1, mr: 1 }}>
                      {template.name}
                    </Typography>
                    {template.is_public ? (
                      <PublicIcon fontSize="small" color="primary" />
                    ) : (
                      <PrivateIcon fontSize="small" color="disabled" />
                    )}
                  </Box>
                  
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2, minHeight: 40 }}>
                    {template.description || 'No description provided'}
                  </Typography>

                  <Box display="flex" gap={1} flexWrap="wrap" mb={1}>
                    <Chip
                      label={`${JSON.parse(template.template_json).sections.length} sections`}
                      size="small"
                      variant="outlined"
                    />
                    <Chip
                      label={`Used ${template.usage_count}x`}
                      size="small"
                      variant="outlined"
                      color={template.usage_count > 0 ? 'primary' : 'default'}
                    />
                  </Box>

                  <Typography variant="caption" color="text.secondary">
                    Created: {new Date(template.created_at).toLocaleDateString()}
                  </Typography>
                </CardContent>

                <CardActions>
                  <IconButton
                    size="small"
                    onClick={() => handleViewDetails(template)}
                    title="View Details"
                  >
                    <ViewIcon />
                  </IconButton>
                  <IconButton
                    size="small"
                    color="primary"
                    onClick={() => navigate(`/custom-templates/${template.id}/edit`)}
                    title="Edit"
                  >
                    <EditIcon />
                  </IconButton>
                  <IconButton
                    size="small"
                    onClick={() => handleDuplicate(template)}
                    title="Duplicate"
                  >
                    <DuplicateIcon />
                  </IconButton>
                  <IconButton
                    size="small"
                    color="error"
                    onClick={() => setDeleteDialog({ open: true, template })}
                    title="Delete"
                  >
                    <DeleteIcon />
                  </IconButton>
                </CardActions>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteDialog.open}
        onClose={() => setDeleteDialog({ open: false, template: null })}
      >
        <DialogTitle>Delete Template?</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete "{deleteDialog.template?.name}"? This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialog({ open: false, template: null })}>
            Cancel
          </Button>
          <Button onClick={handleDelete} color="error" variant="contained">
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert onClose={() => setSnackbar({ ...snackbar, open: false })} severity={snackbar.severity}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default CustomTemplateLibrary;
