import React, { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Box,
  Button,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  Alert,
  Snackbar,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  ContentCopy as CopyIcon,
  Description as DescriptionIcon,
} from '@mui/icons-material';
import PageBreadcrumbs from './PageBreadcrumbs';

const API_BASE_URL = process.env.REACT_APP_API_URL || '/api';

interface ReportTemplate {
  id: number;
  name: string;
  description: string | null;
  template_type: string;
  sections: string;
  variables: string;
  is_system_template: boolean;
  created_at: string;
  updated_at: string;
  created_by_user_id: number | null;
}

interface TemplateDialogData {
  name: string;
  description: string;
  template_type: string;
  sections: string;
  variables: string;
}

const ReportTemplates: React.FC = () => {
  const [templates, setTemplates] = useState<ReportTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<ReportTemplate | null>(null);
  const [formData, setFormData] = useState<TemplateDialogData>({
    name: '',
    description: '',
    template_type: 'Custom',
    sections: '[]',
    variables: '[]',
  });
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' });

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/templates`);
      if (response.ok) {
        const data = await response.json();
        setTemplates(data);
      }
    } catch (error) {
      console.error('Error loading templates:', error);
      showSnackbar('Failed to load templates', 'error');
    } finally {
      setLoading(false);
    }
  };

  const showSnackbar = (message: string, severity: 'success' | 'error') => {
    setSnackbar({ open: true, message, severity });
  };

  const handleOpenDialog = (template?: ReportTemplate) => {
    if (template) {
      setEditingTemplate(template);
      setFormData({
        name: template.name,
        description: template.description || '',
        template_type: template.template_type,
        sections: template.sections,
        variables: template.variables,
      });
    } else {
      setEditingTemplate(null);
      setFormData({
        name: '',
        description: '',
        template_type: 'Custom',
        sections: JSON.stringify([
          { id: 'title', name: 'Title Page', enabled: true, order: 1 },
          { id: 'summary', name: 'Executive Summary', enabled: true, order: 2 },
          { id: 'charts', name: 'Charts', enabled: true, order: 3, settings: { include_pie: true, include_line: true } },
          { id: 'findings', name: 'Top Findings', enabled: true, order: 4, settings: { max_items: 10 } },
          { id: 'recommendations', name: 'Recommendations', enabled: true, order: 5 },
        ], null, 2),
        variables: JSON.stringify([
          { name: 'company_name', label: 'Company Name', type: 'text', default: '' },
          { name: 'include_charts', label: 'Include Charts', type: 'boolean', default: true },
          { name: 'max_findings', label: 'Max Findings', type: 'number', default: 10 },
        ], null, 2),
      });
    }
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingTemplate(null);
  };

  const handleSave = async () => {
    try {
      // Validate JSON
      JSON.parse(formData.sections);
      JSON.parse(formData.variables);
    } catch {
      showSnackbar('Invalid JSON in sections or variables', 'error');
      return;
    }

    const url = editingTemplate
      ? `${API_BASE_URL}/templates/${editingTemplate.id}`
      : `${API_BASE_URL}/templates`;
    const method = editingTemplate ? 'PUT' : 'POST';

    try {
      const token = localStorage.getItem('access_token');
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token ? `Bearer ${token}` : '',
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        showSnackbar(
          editingTemplate ? 'Template updated successfully' : 'Template created successfully',
          'success'
        );
        handleCloseDialog();
        loadTemplates();
      } else {
        const error = await response.json();
        showSnackbar(error.detail || 'Failed to save template', 'error');
      }
    } catch (error) {
      console.error('Error saving template:', error);
      showSnackbar('Failed to save template', 'error');
    }
  };

  const handleDelete = async (template: ReportTemplate) => {
    if (!confirm(`Are you sure you want to delete "${template.name}"?`)) {
      return;
    }

    try {
      const token = localStorage.getItem('access_token');
      const response = await fetch(`${API_BASE_URL}/templates/${template.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': token ? `Bearer ${token}` : '',
        },
      });

      if (response.ok || response.status === 204) {
        showSnackbar('Template deleted successfully', 'success');
        loadTemplates();
      } else {
        const error = await response.json();
        showSnackbar(error.detail || 'Failed to delete template', 'error');
      }
    } catch (error) {
      console.error('Error deleting template:', error);
      showSnackbar('Failed to delete template', 'error');
    }
  };

  const handleDuplicate = (template: ReportTemplate) => {
    setEditingTemplate(null);
    setFormData({
      name: `${template.name} (Copy)`,
      description: template.description || '',
      template_type: template.template_type,
      sections: template.sections,
      variables: template.variables,
    });
    setDialogOpen(true);
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'Executive': return 'primary';
      case 'Technical': return 'secondary';
      case 'Compliance': return 'success';
      case 'Custom': return 'default';
      default: return 'default';
    }
  };

  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
      {/* Breadcrumbs */}
      <PageBreadcrumbs />

      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Box>
          <Typography variant="h4" gutterBottom>
            📋 Report Templates
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Create and manage reusable report templates for generating customized security reports
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => handleOpenDialog()}
        >
          New Template
        </Button>
      </Box>

      {/* Templates Table */}
      {loading ? (
        <Typography>Loading templates...</Typography>
      ) : templates.length === 0 ? (
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <DescriptionIcon sx={{ fontSize: 60, color: 'text.secondary', mb: 2 }} />
          <Typography variant="h6" gutterBottom>
            No Templates Yet
          </Typography>
          <Typography variant="body2" color="text.secondary" mb={2}>
            Create your first report template to get started
          </Typography>
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => handleOpenDialog()}>
            Create Template
          </Button>
        </Paper>
      ) : (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell><strong>Name</strong></TableCell>
                <TableCell><strong>Type</strong></TableCell>
                <TableCell><strong>Description</strong></TableCell>
                <TableCell><strong>Created</strong></TableCell>
                <TableCell align="right"><strong>Actions</strong></TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {templates.map((template) => (
                <TableRow key={template.id} hover>
                  <TableCell>
                    <Box display="flex" alignItems="center" gap={1}>
                      {template.name}
                      {template.is_system_template && (
                        <Chip label="System" size="small" color="info" />
                      )}
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={template.template_type}
                      color={getTypeColor(template.template_type)}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" color="text.secondary">
                      {template.description || 'No description'}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    {new Date(template.created_at).toLocaleDateString()}
                  </TableCell>
                  <TableCell align="right">
                    <IconButton
                      size="small"
                      onClick={() => handleDuplicate(template)}
                      title="Duplicate"
                    >
                      <CopyIcon fontSize="small" />
                    </IconButton>
                    {!template.is_system_template && (
                      <>
                        <IconButton
                          size="small"
                          onClick={() => handleOpenDialog(template)}
                          title="Edit"
                        >
                          <EditIcon fontSize="small" />
                        </IconButton>
                        <IconButton
                          size="small"
                          onClick={() => handleDelete(template)}
                          color="error"
                          title="Delete"
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Template Dialog */}
      <Dialog open={dialogOpen} onClose={handleCloseDialog} maxWidth="md" fullWidth>
        <DialogTitle>
          {editingTemplate ? 'Edit Template' : 'Create New Template'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              label="Template Name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              fullWidth
              required
            />
            <TextField
              label="Description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              fullWidth
              multiline
              rows={2}
            />
            <TextField
              label="Template Type"
              value={formData.template_type}
              onChange={(e) => setFormData({ ...formData, template_type: e.target.value })}
              select
              fullWidth
              required
            >
              <MenuItem value="Executive">Executive</MenuItem>
              <MenuItem value="Technical">Technical</MenuItem>
              <MenuItem value="Compliance">Compliance</MenuItem>
              <MenuItem value="Custom">Custom</MenuItem>
            </TextField>
            <TextField
              label="Sections (JSON)"
              value={formData.sections}
              onChange={(e) => setFormData({ ...formData, sections: e.target.value })}
              fullWidth
              multiline
              rows={8}
              required
              helperText="JSON array of section objects with id, name, enabled, order, settings"
            />
            <TextField
              label="Variables (JSON)"
              value={formData.variables}
              onChange={(e) => setFormData({ ...formData, variables: e.target.value })}
              fullWidth
              multiline
              rows={6}
              required
              helperText="JSON array of variable objects with name, label, type, default"
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button onClick={handleSave} variant="contained">
            {editingTemplate ? 'Update' : 'Create'}
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
        <Alert
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          severity={snackbar.severity}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Container>
  );
};

export default ReportTemplates;
