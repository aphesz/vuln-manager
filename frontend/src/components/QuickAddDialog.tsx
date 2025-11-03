import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Autocomplete,
  Box,
  Typography,
  Chip,
  IconButton,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  CircularProgress,
  Paper,
  Divider,
  Tooltip,
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Search as SearchIcon,
  Star as StarIcon,
  Code as CodeIcon,
  Info as InfoIcon,
} from '@mui/icons-material';
import axios from 'axios';
import { VulnerabilityTemplate, FindingCreate, InstanceCreate, RiskRating } from '../types';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

interface QuickAddDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  projectId: number;
}

const QuickAddDialog: React.FC<QuickAddDialogProps> = ({ open, onClose, onSuccess, projectId }) => {
  // Template search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<VulnerabilityTemplate[]>([]);
  const [suggestions, setSuggestions] = useState<VulnerabilityTemplate[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<VulnerabilityTemplate | null>(null);

  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [remediation, setRemediation] = useState('');
  const [riskRating, setRiskRating] = useState<RiskRating>('Medium');
  const [instances, setInstances] = useState<InstanceCreate[]>([
    { location: '', details: '' }
  ]);

  // UI state
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Load suggestions when dialog opens
  useEffect(() => {
    if (open) {
      loadSuggestions();
      resetForm();
    }
  }, [open, projectId]);

  // Search templates with debouncing
  useEffect(() => {
    if (searchQuery.length >= 2) {
      const delaySearch = setTimeout(() => {
        searchTemplates();
      }, 300);
      return () => clearTimeout(delaySearch);
    } else {
      setSearchResults([]);
    }
  }, [searchQuery]);

  const loadSuggestions = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/projects/${projectId}/template-suggestions`, {
        params: { limit: 10 }
      });
      setSuggestions(response.data);
    } catch (err) {
      console.error('Failed to load template suggestions:', err);
    }
  };

  const searchTemplates = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API_BASE_URL}/repository/search`, {
        params: { q: searchQuery, limit: 20, verified_only: false }
      });
      setSearchResults(response.data);
    } catch (err) {
      console.error('Template search failed:', err);
      setError('Failed to search templates');
    } finally {
      setLoading(false);
    }
  };

  const handleTemplateSelect = (template: VulnerabilityTemplate | null) => {
    setSelectedTemplate(template);
    if (template) {
      // Pre-fill form from template
      setTitle(template.title);
      setDescription(template.description);
      setRemediation(template.remediation_steps || template.remediation_summary || '');
      setRiskRating(template.default_risk_rating || 'Medium');
      setSearchQuery(''); // Clear search
      setSearchResults([]); // Clear results
    }
  };

  const addInstance = () => {
    setInstances([...instances, { location: '', details: '' }]);
  };

  const removeInstance = (index: number) => {
    if (instances.length > 1) {
      setInstances(instances.filter((_, i) => i !== index));
    }
  };

  const updateInstance = (index: number, field: 'location' | 'details', value: string) => {
    const updated = [...instances];
    updated[index][field] = value;
    setInstances(updated);
  };

  const validateForm = (): boolean => {
    if (!title.trim()) {
      setError('Title is required');
      return false;
    }
    if (!description.trim()) {
      setError('Description is required');
      return false;
    }
    if (!remediation.trim()) {
      setError('Remediation is required');
      return false;
    }
    if (instances.length === 0) {
      setError('At least one instance is required');
      return false;
    }
    for (let i = 0; i < instances.length; i++) {
      if (!instances[i].location.trim() || !instances[i].details.trim()) {
        setError(`Instance ${i + 1}: Both location and details are required`);
        return false;
      }
    }
    return true;
  };

  const handleSubmit = async () => {
    setError(null);
    
    if (!validateForm()) {
      return;
    }

    setSubmitting(true);
    try {
      const findingData: FindingCreate = {
        title,
        description,
        remediation,
        risk_rating: riskRating,
        template_id: selectedTemplate?.id,
        instances,
        issue_status: 'Open'
      };

      await axios.post(`${API_BASE_URL}/projects/${projectId}/findings`, findingData);
      
      onSuccess();
      onClose();
      resetForm();
    } catch (err: any) {
      const message = err.response?.data?.detail || 'Failed to create finding';
      setError(message);
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setSearchQuery('');
    setSearchResults([]);
    setSelectedTemplate(null);
    setTitle('');
    setDescription('');
    setRemediation('');
    setRiskRating('Medium');
    setInstances([{ location: '', details: '' }]);
    setError(null);
  };

  const handleClose = () => {
    if (!submitting) {
      resetForm();
      onClose();
    }
  };

  return (
    <Dialog 
      open={open} 
      onClose={handleClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: { minHeight: '70vh', maxHeight: '90vh' }
      }}
    >
      <DialogTitle>
        <Box display="flex" alignItems="center" gap={1}>
          <AddIcon />
          <Typography variant="h6">Quick Add Finding</Typography>
        </Box>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
          Search templates or create finding from scratch
        </Typography>
      </DialogTitle>

      <DialogContent dividers>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          {/* Template Search */}
          <Box>
            <Typography variant="subtitle2" gutterBottom display="flex" alignItems="center" gap={1}>
              <SearchIcon fontSize="small" />
              Search Vulnerability Templates
            </Typography>
            <Autocomplete
              options={searchResults}
              getOptionLabel={(option) => option.title}
              value={selectedTemplate}
              onChange={(_, value) => handleTemplateSelect(value)}
              inputValue={searchQuery}
              onInputChange={(_, value) => setSearchQuery(value)}
              loading={loading}
              filterOptions={(x) => x} // Disable built-in filtering
              renderInput={(params) => (
                <TextField
                  {...params}
                  placeholder="Type to search templates (title, CWE, CVE, description)..."
                  size="small"
                  InputProps={{
                    ...params.InputProps,
                    endAdornment: (
                      <>
                        {loading && <CircularProgress size={20} />}
                        {params.InputProps.endAdornment}
                      </>
                    ),
                  }}
                />
              )}
              renderOption={(props, option) => (
                <li {...props} key={option.id}>
                  <Box sx={{ width: '100%' }}>
                    <Box display="flex" alignItems="center" gap={1}>
                      <Typography variant="body2" fontWeight="bold">
                        {option.title}
                      </Typography>
                      {option.is_verified && (
                        <Tooltip title="Verified template">
                          <StarIcon fontSize="small" color="primary" />
                        </Tooltip>
                      )}
                    </Box>
                    <Box display="flex" gap={1} mt={0.5}>
                      {option.cwe_id && <Chip label={option.cwe_id} size="small" />}
                      {option.default_risk_rating && (
                        <Chip 
                          label={option.default_risk_rating} 
                          size="small" 
                          color={
                            option.default_risk_rating === 'Critical' ? 'error' :
                            option.default_risk_rating === 'High' ? 'warning' :
                            'default'
                          }
                        />
                      )}
                      <Chip label={`Used ${option.usage_count}x`} size="small" variant="outlined" />
                    </Box>
                  </Box>
                </li>
              )}
              noOptionsText={searchQuery.length < 2 ? "Type at least 2 characters" : "No templates found"}
            />

            {/* Popular Suggestions */}
            {!searchQuery && suggestions.length > 0 && (
              <Box mt={2}>
                <Typography variant="caption" color="text.secondary" display="flex" alignItems="center" gap={0.5}>
                  <InfoIcon fontSize="small" />
                  Popular in this project:
                </Typography>
                <Box display="flex" flexWrap="wrap" gap={1} mt={1}>
                  {suggestions.slice(0, 5).map((template) => (
                    <Chip
                      key={template.id}
                      label={template.title}
                      onClick={() => handleTemplateSelect(template)}
                      size="small"
                      variant="outlined"
                      icon={template.is_verified ? <StarIcon fontSize="small" /> : undefined}
                    />
                  ))}
                </Box>
              </Box>
            )}
          </Box>

          <Divider />

          {/* Finding Form */}
          <Box>
            <Typography variant="subtitle2" gutterBottom>
              Finding Details {selectedTemplate && <Chip label="From Template" size="small" sx={{ ml: 1 }} />}
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <TextField
                  label="Title"
                  fullWidth
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  size="small"
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth size="small" required>
                  <InputLabel>Risk Rating</InputLabel>
                  <Select
                    value={riskRating}
                    onChange={(e) => setRiskRating(e.target.value as RiskRating)}
                    label="Risk Rating"
                  >
                    <MenuItem value="Critical">Critical</MenuItem>
                    <MenuItem value="High">High</MenuItem>
                    <MenuItem value="Medium">Medium</MenuItem>
                    <MenuItem value="Low">Low</MenuItem>
                    <MenuItem value="Informational">Informational</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              {selectedTemplate && (
                <Grid item xs={12} sm={6}>
                  <Box display="flex" gap={1} alignItems="center" height="100%">
                    {selectedTemplate.cwe_id && <Chip label={selectedTemplate.cwe_id} size="small" icon={<CodeIcon />} />}
                    {selectedTemplate.cvss_score && <Chip label={`CVSS ${selectedTemplate.cvss_score}`} size="small" />}
                  </Box>
                </Grid>
              )}
              <Grid item xs={12}>
                <TextField
                  label="Description"
                  fullWidth
                  required
                  multiline
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  size="small"
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  label="Remediation"
                  fullWidth
                  required
                  multiline
                  rows={3}
                  value={remediation}
                  onChange={(e) => setRemediation(e.target.value)}
                  size="small"
                />
              </Grid>
            </Grid>
          </Box>

          <Divider />

          {/* Instances Editor */}
          <Box>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
              <Typography variant="subtitle2">
                Instances ({instances.length})
              </Typography>
              <Button
                size="small"
                startIcon={<AddIcon />}
                onClick={addInstance}
                variant="outlined"
              >
                Add Instance
              </Button>
            </Box>
            {instances.map((instance, index) => (
              <Paper key={index} variant="outlined" sx={{ p: 2, mb: 2 }}>
                <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                  <Typography variant="caption" color="text.secondary" fontWeight="bold">
                    Instance #{index + 1}
                  </Typography>
                  {instances.length > 1 && (
                    <IconButton
                      size="small"
                      onClick={() => removeInstance(index)}
                      color="error"
                    >
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  )}
                </Box>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      label="Location (URL/Host/Endpoint)"
                      fullWidth
                      required
                      size="small"
                      value={instance.location}
                      onChange={(e) => updateInstance(index, 'location', e.target.value)}
                      placeholder="https://example.com/page?param=value"
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      label="Details (Parameter/Payload)"
                      fullWidth
                      required
                      size="small"
                      value={instance.details}
                      onChange={(e) => updateInstance(index, 'details', e.target.value)}
                      placeholder="param, payload, or affected component"
                    />
                  </Grid>
                </Grid>
              </Paper>
            ))}
          </Box>

          {/* Error Alert */}
          {error && (
            <Alert severity="error" onClose={() => setError(null)}>
              {error}
            </Alert>
          )}
        </Box>
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={handleClose} disabled={submitting}>
          Cancel
        </Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          disabled={submitting}
          startIcon={submitting ? <CircularProgress size={16} /> : <AddIcon />}
        >
          {submitting ? 'Creating...' : 'Create Finding'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default QuickAddDialog;
