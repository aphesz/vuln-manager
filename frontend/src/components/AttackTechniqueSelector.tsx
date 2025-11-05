/** @jsxRuntime classic */
/** @jsx React.createElement */
/** @jsxFrag React.Fragment */

import React, { useState, useEffect } from 'react';
import {
  Box,
  Chip,
  TextField,
  Autocomplete,
  Typography,
  Stack,
  Paper,
  Button,
  CircularProgress,
  Tooltip,
} from '@mui/material';
import {
  Security as SecurityIcon,
  AutoFixHigh as SuggestIcon,
  Clear as ClearIcon,
} from '@mui/icons-material';
import axios from 'axios';

interface AttackTechnique {
  technique_id: string;
  technique_name: string;
  tactic: string;
  description?: string;
  relevance_score?: number;
}

interface AttackTechniqueSelectorProps {
  templateId?: number;
  selectedTechniques: AttackTechnique[];
  onChange: (techniques: AttackTechnique[]) => void;
  disabled?: boolean;
}

const TACTIC_COLORS: { [key: string]: string } = {
  'Initial Access': '#ff6b6b',
  'Execution': '#ff8c42',
  'Persistence': '#ffd93d',
  'Privilege Escalation': '#6bcf7f',
  'Defense Evasion': '#4d96ff',
  'Credential Access': '#9d4edd',
  'Discovery': '#f72585',
  'Lateral Movement': '#ff006e',
  'Collection': '#8338ec',
  'Exfiltration': '#3a86ff',
  'Impact': '#fb5607',
};

const AttackTechniqueSelector: React.FC<AttackTechniqueSelectorProps> = ({
  templateId,
  selectedTechniques,
  onChange,
  disabled = false,
}) => {
  const [allTechniques, setAllTechniques] = useState<AttackTechnique[]>([]);
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<AttackTechnique[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);

  // Fetch all available techniques on mount
  useEffect(() => {
    fetchAllTechniques();
  }, []);

  const fetchAllTechniques = async () => {
    setLoading(true);
    try {
      const response = await axios.get('/api/attack/techniques');
      setAllTechniques(response.data.techniques);
    } catch (error) {
      console.error('Error fetching ATT&CK techniques:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchSuggestions = async () => {
    if (!templateId) return;

    setLoadingSuggestions(true);
    try {
      const response = await axios.post(`/api/vulnerability-templates/${templateId}/suggest-attack`);
      setSuggestions(response.data.suggestions);
    } catch (error) {
      console.error('Error fetching ATT&CK suggestions:', error);
    } finally {
      setLoadingSuggestions(false);
    }
  };

  const handleAddTechnique = (technique: AttackTechnique | null) => {
    if (!technique) return;

    // Check if already selected
    const alreadySelected = selectedTechniques.some(
      (t) => t.technique_id === technique.technique_id
    );

    if (!alreadySelected) {
      onChange([...selectedTechniques, technique]);
    }
  };

  const handleRemoveTechnique = (techniqueId: string) => {
    onChange(selectedTechniques.filter((t) => t.technique_id !== techniqueId));
  };

  const handleApplySuggestion = (technique: AttackTechnique) => {
    handleAddTechnique(technique);
  };

  const handleClearAll = () => {
    onChange([]);
  };

  return (
    <Box>
      <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 2 }}>
        <SecurityIcon color="primary" />
        <Typography variant="subtitle1" fontWeight="600">
          MITRE ATT&CK Techniques
        </Typography>
        {templateId && (
          <Button
            size="small"
            startIcon={loadingSuggestions ? <CircularProgress size={16} /> : <SuggestIcon />}
            onClick={fetchSuggestions}
            disabled={loadingSuggestions || disabled}
            variant="outlined"
            color="secondary"
          >
            Get Suggestions
          </Button>
        )}
      </Stack>

      {/* Suggestions */}
      {suggestions.length > 0 && (
        <Paper
          variant="outlined"
          sx={{
            p: 2,
            mb: 2,
            bgcolor: 'background.default',
            borderColor: 'secondary.main',
          }}
        >
          <Typography variant="subtitle2" color="secondary" sx={{ mb: 1 }}>
            💡 Suggested Techniques (based on vulnerability characteristics)
          </Typography>
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
            {suggestions.slice(0, 5).map((technique) => {
              const isSelected = selectedTechniques.some(
                (t) => t.technique_id === technique.technique_id
              );
              return (
                <Tooltip
                  key={technique.technique_id}
                  title={`${technique.description} (Relevance: ${technique.relevance_score})`}
                  arrow
                >
                  <Chip
                    label={`${technique.technique_id}: ${technique.technique_name}`}
                    size="small"
                    color={isSelected ? 'default' : 'secondary'}
                    variant={isSelected ? 'filled' : 'outlined'}
                    onClick={() => !isSelected && handleApplySuggestion(technique)}
                    disabled={isSelected || disabled}
                    sx={{
                      cursor: isSelected ? 'default' : 'pointer',
                      mb: 1,
                    }}
                  />
                </Tooltip>
              );
            })}
          </Stack>
        </Paper>
      )}

      {/* Technique Selector */}
      <Autocomplete
        options={allTechniques}
        getOptionLabel={(option) =>
          `${option.technique_id} - ${option.technique_name} (${option.tactic})`
        }
        renderInput={(params) => (
          <TextField
            {...params}
            label="Search ATT&CK Techniques"
            placeholder="Type technique ID, name, or tactic..."
            variant="outlined"
            InputProps={{
              ...params.InputProps,
              endAdornment: (
                <>
                  {loading && <CircularProgress color="inherit" size={20} />}
                  {params.InputProps.endAdornment}
                </>
              ),
            }}
          />
        )}
        renderOption={(props, option) => (
          <li {...props} key={option.technique_id}>
            <Box sx={{ width: '100%' }}>
              <Stack direction="row" spacing={1} alignItems="center">
                <Chip
                  label={option.tactic}
                  size="small"
                  sx={{
                    bgcolor: TACTIC_COLORS[option.tactic] || '#999',
                    color: 'white',
                    fontWeight: 600,
                    fontSize: '0.7rem',
                  }}
                />
                <Typography variant="body2" fontWeight="600">
                  {option.technique_id}
                </Typography>
                <Typography variant="body2" sx={{ flex: 1 }}>
                  {option.technique_name}
                </Typography>
              </Stack>
              {option.description && (
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ display: 'block', mt: 0.5, ml: 1 }}
                >
                  {option.description}
                </Typography>
              )}
            </Box>
          </li>
        )}
        onChange={(event, value) => handleAddTechnique(value)}
        value={null}
        disabled={disabled}
        loading={loading}
        sx={{ mb: 2 }}
      />

      {/* Selected Techniques */}
      {selectedTechniques.length > 0 && (
        <Box>
          <Stack
            direction="row"
            justifyContent="space-between"
            alignItems="center"
            sx={{ mb: 1 }}
          >
            <Typography variant="subtitle2" color="text.secondary">
              Selected Techniques ({selectedTechniques.length})
            </Typography>
            {!disabled && (
              <Button
                size="small"
                startIcon={<ClearIcon />}
                onClick={handleClearAll}
                color="error"
              >
                Clear All
              </Button>
            )}
          </Stack>
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
            {selectedTechniques.map((technique) => (
              <Chip
                key={technique.technique_id}
                label={
                  <Stack direction="row" spacing={0.5} alignItems="center">
                    <Typography variant="caption" fontWeight="600">
                      {technique.technique_id}
                    </Typography>
                    <Typography variant="caption">•</Typography>
                    <Typography variant="caption">{technique.technique_name}</Typography>
                  </Stack>
                }
                onDelete={disabled ? undefined : () => handleRemoveTechnique(technique.technique_id)}
                sx={{
                  bgcolor: TACTIC_COLORS[technique.tactic] || '#999',
                  color: 'white',
                  fontWeight: 600,
                  '& .MuiChip-deleteIcon': {
                    color: 'white',
                    '&:hover': {
                      color: 'rgba(255, 255, 255, 0.7)',
                    },
                  },
                  mb: 1,
                }}
              />
            ))}
          </Stack>
        </Box>
      )}

      {selectedTechniques.length === 0 && (
        <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic', mt: 1 }}>
          No ATT&CK techniques mapped. Use the search above to add techniques, or click "Get
          Suggestions" for AI-powered recommendations.
        </Typography>
      )}
    </Box>
  );
};

export default AttackTechniqueSelector;
