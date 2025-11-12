import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  FormControl,
  FormControlLabel,
  Switch,
  Typography,
  Box,
  Alert,
  CircularProgress,
  Chip,
  InputAdornment,
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import axios from 'axios';

interface TemplateVariable {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'date' | 'list';
  required: boolean;
  context: 'simple' | 'loop' | 'conditional';
  sample_value: any;
}

interface TemplateVariablesFormProps {
  open: boolean;
  onClose: () => void;
  projectId: number;
  templateIds: number[];
  onSubmit: (variables: Record<string, any>) => void;
}

const TemplateVariablesForm: React.FC<TemplateVariablesFormProps> = ({
  open,
  onClose,
  projectId,
  templateIds,
  onSubmit,
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [allVariables, setAllVariables] = useState<TemplateVariable[]>([]);
  const [values, setValues] = useState<Record<string, any>>({});

  // Fetch variables from all selected templates
  useEffect(() => {
    if (open && templateIds.length > 0) {
      fetchVariables();
    }
  }, [open, templateIds, projectId]);

  const fetchVariables = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Fetch variables from each template
      const requests = templateIds.map(id =>
        axios.get(`/api/projects/${projectId}/templates/${id}/variables`)
      );
      
      const responses = await Promise.all(requests);
      
      // Combine and deduplicate variables
      const variablesMap = new Map<string, TemplateVariable>();
      
      responses.forEach(response => {
        const templateVars = response.data.variables || [];
        templateVars.forEach((v: TemplateVariable) => {
          // Use most restrictive requirements (if any template requires it, it's required)
          if (!variablesMap.has(v.name) || (v.required && !variablesMap.get(v.name)?.required)) {
            variablesMap.set(v.name, v);
          }
        });
      });
      
      const uniqueVars = Array.from(variablesMap.values());
      setAllVariables(uniqueVars);
      
      // Initialize values with sample defaults
      const initialValues: Record<string, any> = {};
      uniqueVars.forEach(v => {
        initialValues[v.name] = v.sample_value;
      });
      setValues(initialValues);
      
    } catch (err: any) {
      console.error('Error fetching template variables:', err);
      setError(err.response?.data?.detail || 'Failed to load template variables');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (name: string, value: any) => {
    setValues(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = () => {
    // Validate required fields
    const missingFields = allVariables
      .filter(v => v.required && !values[v.name])
      .map(v => v.name);
    
    if (missingFields.length > 0) {
      setError(`Please fill in required fields: ${missingFields.join(', ')}`);
      return;
    }
    
    onSubmit(values);
  };

  const renderField = (variable: TemplateVariable) => {
    const value = values[variable.name];
    
    switch (variable.type) {
      case 'boolean':
        return (
          <FormControlLabel
            control={
              <Switch
                checked={!!value}
                onChange={(e) => handleChange(variable.name, e.target.checked)}
              />
            }
            label={
              <Box>
                <Typography variant="body2">{variable.name}</Typography>
                <Typography variant="caption" color="text.secondary">
                  {variable.context === 'conditional' ? 'Conditional variable' : 'Boolean value'}
                </Typography>
              </Box>
            }
          />
        );
      
      case 'number':
        return (
          <TextField
            fullWidth
            type="number"
            label={variable.name}
            value={value || ''}
            onChange={(e) => handleChange(variable.name, parseFloat(e.target.value) || 0)}
            required={variable.required}
            helperText={`${variable.context} variable`}
            InputProps={{
              endAdornment: variable.name.includes('count') && (
                <InputAdornment position="end">
                  <Chip label="count" size="small" />
                </InputAdornment>
              ),
            }}
          />
        );
      
      case 'date':
        return (
          <LocalizationProvider dateAdapter={AdapterDateFns}>
            <DatePicker
              label={variable.name}
              value={value ? new Date(value) : null}
              onChange={(newValue) => {
                const formatted = newValue ? newValue.toISOString().split('T')[0] : '';
                handleChange(variable.name, formatted);
              }}
              slotProps={{
                textField: {
                  fullWidth: true,
                  required: variable.required,
                  helperText: `${variable.context} variable`,
                },
              }}
            />
          </LocalizationProvider>
        );
      
      case 'list':
        return (
          <TextField
            fullWidth
            label={variable.name}
            value={value || ''}
            onChange={(e) => handleChange(variable.name, e.target.value)}
            required={variable.required}
            multiline
            rows={3}
            helperText={`${variable.context} variable - typically populated from database`}
            placeholder="This will be populated automatically from your project data"
            disabled
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Chip label="auto" size="small" color="info" />
                </InputAdornment>
              ),
            }}
          />
        );
      
      case 'string':
      default:
        return (
          <TextField
            fullWidth
            label={variable.name}
            value={value || ''}
            onChange={(e) => handleChange(variable.name, e.target.value)}
            required={variable.required}
            helperText={`${variable.context} variable`}
            multiline={variable.name.includes('description') || variable.name.includes('notes')}
            rows={variable.name.includes('description') || variable.name.includes('notes') ? 3 : 1}
          />
        );
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        Configure Template Variables
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          Customize values for detected Jinja2 variables in your templates
        </Typography>
      </DialogTitle>
      
      <DialogContent>
        {loading && (
          <Box display="flex" justifyContent="center" alignItems="center" py={4}>
            <CircularProgress />
          </Box>
        )}
        
        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}
        
        {!loading && allVariables.length === 0 && (
          <Alert severity="info">
            No custom variables detected in the selected templates.
            You can proceed directly to report generation.
          </Alert>
        )}
        
        {!loading && allVariables.length > 0 && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
            <Alert severity="info" icon={false}>
              <Typography variant="body2" fontWeight="bold">
                Detected {allVariables.length} variable{allVariables.length !== 1 ? 's' : ''}:
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 1 }}>
                {allVariables.map(v => (
                  <Chip
                    key={v.name}
                    label={v.name}
                    size="small"
                    color={v.required ? 'primary' : 'default'}
                    variant={v.required ? 'filled' : 'outlined'}
                  />
                ))}
              </Box>
            </Alert>
            
            {allVariables.map((variable) => (
              <Box key={variable.name}>
                {renderField(variable)}
              </Box>
            ))}
          </Box>
        )}
      </DialogContent>
      
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          disabled={loading || (allVariables.length > 0 && Object.keys(values).length === 0)}
        >
          {allVariables.length === 0 ? 'Continue' : 'Generate Report'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default TemplateVariablesForm;
