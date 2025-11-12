import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Typography,
  Box,
  Alert,
  CircularProgress,
  Chip,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  IconButton,
  Tooltip,
  InputAdornment,
  Stack,
  Divider,
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  ContentCopy as CopyIcon,
  Search as SearchIcon,
  Description as DescriptionIcon,
  Code as CodeIcon,
  Source as SourceIcon,
} from '@mui/icons-material';
import axios from 'axios';

interface TemplateVariable {
  name: string;
  type: string;
  category: string;
  description: string;
  example: string;
  source: string;
  required: boolean;
  usage: string;
  context: string;
}

interface Documentation {
  template_name: string;
  total_variables: number;
  categories: Record<string, TemplateVariable[]>;
  variables: TemplateVariable[];
}

interface TemplatePlaceholderDocsProps {
  open: boolean;
  onClose: () => void;
  projectId: number;
  templateId: number;
  templateName: string;
}

const TemplatePlaceholderDocs: React.FC<TemplatePlaceholderDocsProps> = ({
  open,
  onClose,
  projectId,
  templateId,
  templateName,
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [docs, setDocs] = useState<Documentation | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedVariable, setCopiedVariable] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      fetchDocumentation();
    }
  }, [open, projectId, templateId]);

  const fetchDocumentation = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await axios.get(
        `/api/projects/${projectId}/templates/${templateId}/documentation`
      );
      setDocs(response.data);
    } catch (err: any) {
      console.error('Error fetching documentation:', err);
      setError(err.response?.data?.detail || 'Failed to load documentation');
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = (text: string, variableName: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedVariable(variableName);
      setTimeout(() => setCopiedVariable(null), 2000);
    });
  };

  const filterVariables = (variables: TemplateVariable[]): TemplateVariable[] => {
    if (!searchQuery.trim()) return variables;
    
    const query = searchQuery.toLowerCase();
    return variables.filter(
      (v) =>
        v.name.toLowerCase().includes(query) ||
        v.description.toLowerCase().includes(query) ||
        v.category.toLowerCase().includes(query) ||
        v.example.toLowerCase().includes(query)
    );
  };

  const getCategoryColor = (category: string): 'primary' | 'success' | 'info' | 'warning' | 'default' => {
    const colors: Record<string, any> = {
      project: 'primary',
      findings: 'error',
      risk_summary: 'warning',
      compliance: 'success',
      sla: 'info',
      metadata: 'default',
    };
    return colors[category] || 'default';
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth>
      <DialogTitle>
        <Box display="flex" alignItems="center" gap={1}>
          <DescriptionIcon />
          <Box>
            <Typography variant="h6">Template Variables Reference</Typography>
            <Typography variant="body2" color="text.secondary">
              {templateName}
            </Typography>
          </Box>
        </Box>
      </DialogTitle>
      
      <DialogContent>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}
        
        {loading ? (
          <Box display="flex" justifyContent="center" alignItems="center" py={4}>
            <CircularProgress />
          </Box>
        ) : !docs ? (
          <Alert severity="info">
            No documentation available for this template.
          </Alert>
        ) : (
          <>
            {/* Summary */}
            <Alert severity="info" icon={false} sx={{ mb: 3 }}>
              <Typography variant="body2" fontWeight="bold">
                {docs.total_variables} variable{docs.total_variables !== 1 ? 's' : ''} available
              </Typography>
              <Typography variant="caption" color="text.secondary">
                All placeholders that can be used in this template
              </Typography>
            </Alert>

            {/* Search */}
            <TextField
              fullWidth
              placeholder="Search variables by name, description, or category..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              sx={{ mb: 3 }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon />
                  </InputAdornment>
                ),
              }}
            />

            {/* Variables by Category */}
            {Object.entries(docs.categories).map(([category, variables]) => {
              const filteredVars = filterVariables(variables);
              if (filteredVars.length === 0) return null;

              return (
                <Accordion key={category} defaultExpanded={category === 'project'}>
                  <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                    <Box display="flex" alignItems="center" gap={2} width="100%">
                      <Typography variant="h6" sx={{ textTransform: 'capitalize' }}>
                        {category.replace(/_/g, ' ')}
                      </Typography>
                      <Chip
                        label={filteredVars.length}
                        size="small"
                        color={getCategoryColor(category)}
                      />
                    </Box>
                  </AccordionSummary>
                  <AccordionDetails>
                    <Stack spacing={2}>
                      {filteredVars.map((variable) => (
                        <Box
                          key={variable.name}
                          sx={{
                            p: 2,
                            border: '1px solid',
                            borderColor: 'divider',
                            borderRadius: 1,
                            bgcolor: 'background.paper',
                          }}
                        >
                          {/* Variable Header */}
                          <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={2}>
                            <Box flex={1}>
                              <Box display="flex" alignItems="center" gap={1} mb={0.5}>
                                <Typography variant="h6" component="code" sx={{ fontFamily: 'monospace', color: 'primary.main' }}>
                                  {variable.name}
                                </Typography>
                                <Chip label={variable.type} size="small" variant="outlined" />
                                {variable.required && (
                                  <Chip label="Required" size="small" color="error" variant="outlined" />
                                )}
                              </Box>
                              <Typography variant="body2" color="text.secondary">
                                {variable.description}
                              </Typography>
                            </Box>
                            <Tooltip title={copiedVariable === variable.name ? 'Copied!' : 'Copy usage'}>
                              <IconButton
                                size="small"
                                onClick={() => handleCopy(variable.usage, variable.name)}
                                color={copiedVariable === variable.name ? 'success' : 'default'}
                              >
                                <CopyIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          </Box>

                          <Divider sx={{ my: 1.5 }} />

                          {/* Variable Details */}
                          <Stack spacing={1}>
                            {/* Usage */}
                            <Box>
                              <Box display="flex" alignItems="center" gap={0.5} mb={0.5}>
                                <CodeIcon fontSize="small" color="action" />
                                <Typography variant="caption" fontWeight="bold" color="text.secondary">
                                  Usage:
                                </Typography>
                              </Box>
                              <Box
                                sx={{
                                  bgcolor: 'grey.900',
                                  color: 'grey.100',
                                  p: 1,
                                  borderRadius: 1,
                                  fontFamily: 'monospace',
                                  fontSize: '0.875rem',
                                }}
                              >
                                {variable.usage}
                              </Box>
                            </Box>

                            {/* Example */}
                            {variable.example && (
                              <Box>
                                <Typography variant="caption" fontWeight="bold" color="text.secondary">
                                  Example:
                                </Typography>
                                <Typography
                                  variant="body2"
                                  sx={{
                                    bgcolor: 'action.hover',
                                    p: 1,
                                    borderRadius: 1,
                                    fontFamily: 'monospace',
                                    fontSize: '0.875rem',
                                  }}
                                >
                                  {variable.example}
                                </Typography>
                              </Box>
                            )}

                            {/* Source */}
                            <Box display="flex" alignItems="center" gap={0.5}>
                              <SourceIcon fontSize="small" color="action" />
                              <Typography variant="caption" fontWeight="bold" color="text.secondary">
                                Source:
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                {variable.source}
                              </Typography>
                            </Box>

                            {/* Context */}
                            <Box display="flex" alignItems="center" gap={0.5}>
                              <Typography variant="caption" fontWeight="bold" color="text.secondary">
                                Context:
                              </Typography>
                              <Chip
                                label={variable.context}
                                size="small"
                                variant="outlined"
                                sx={{ height: 20, fontSize: '0.7rem' }}
                              />
                            </Box>
                          </Stack>
                        </Box>
                      ))}
                    </Stack>
                  </AccordionDetails>
                </Accordion>
              );
            })}
          </>
        )}
      </DialogContent>
      
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
};

export default TemplatePlaceholderDocs;
