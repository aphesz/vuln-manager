/** @jsxRuntime classic */
/** @jsx React.createElement */
/** @jsxFrag React.Fragment */

import React, { useState, useEffect } from 'react';
import {
  GridToolbarContainer,
  GridToolbarQuickFilter,
  GridToolbarExport,
  GridToolbarColumnsButton,
  GridToolbarFilterButton,
} from '@mui/x-data-grid';
import {
  Box,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  Button,
  IconButton,
  Tooltip,
  Autocomplete,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
} from '@mui/material';
import {
  FilterList as FilterIcon,
  Clear as ClearIcon,
  Save as SaveIcon,
} from '@mui/icons-material';
import type { RiskRating, IssueStatus, SLAStatus, Tag } from '../types';
import axios from 'axios';

interface FindingsTableToolbarProps {
  onFilterChange?: (filters: FilterState) => void;
}

export interface FilterState {
  riskRating: RiskRating | 'All';
  issueStatus: IssueStatus | 'All';
  slaStatus: SLAStatus | 'All';
  tags: Tag[];
  tagFilterMode: 'AND' | 'OR';
}

const FindingsTableToolbar: React.FC<FindingsTableToolbarProps> = ({ onFilterChange }) => {
  const [filters, setFilters] = useState<FilterState>({
    riskRating: 'All',
    issueStatus: 'All',
    slaStatus: 'All',
    tags: [],
    tagFilterMode: 'OR',
  });

  const [availableTags, setAvailableTags] = useState<Tag[]>([]);

  // Fetch available tags on component mount
  useEffect(() => {
    const fetchTags = async () => {
      try {
        const response = await axios.get('/api/tags');
        setAvailableTags(response.data);
      } catch (error) {
        console.error('Error fetching tags:', error);
      }
    };
    fetchTags();
  }, []);

  const handleFilterChange = (field: keyof FilterState, value: any) => {
    const newFilters = { ...filters, [field]: value };
    setFilters(newFilters);
    if (onFilterChange) {
      onFilterChange(newFilters);
    }
  };

  const clearFilters = () => {
    const clearedFilters: FilterState = {
      riskRating: 'All',
      issueStatus: 'All',
      slaStatus: 'All',
      tags: [],
      tagFilterMode: 'OR',
    };
    setFilters(clearedFilters);
    if (onFilterChange) {
      onFilterChange(clearedFilters);
    }
  };

  const hasActiveFilters = filters.riskRating !== 'All' || 
                          filters.issueStatus !== 'All' || 
                          filters.slaStatus !== 'All' ||
                          filters.tags.length > 0;

  return (
    <GridToolbarContainer sx={{ p: 2, gap: 2, flexWrap: 'wrap' }}>
      {/* Standard DataGrid Tools */}
      <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', flex: 1 }}>
        <GridToolbarQuickFilter 
          sx={{ minWidth: 200 }}
          debounceMs={500}
        />
        <GridToolbarColumnsButton />
        <GridToolbarFilterButton />
        <GridToolbarExport />
      </Box>

      {/* Custom Filters */}
      <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center' }}>
        <FormControl size="small" sx={{ minWidth: 140 }}>
          <InputLabel>Risk Rating</InputLabel>
          <Select
            value={filters.riskRating}
            label="Risk Rating"
            onChange={(e) => handleFilterChange('riskRating', e.target.value)}
          >
            <MenuItem value="All">All</MenuItem>
            <MenuItem value="Critical">Critical</MenuItem>
            <MenuItem value="High">High</MenuItem>
            <MenuItem value="Medium">Medium</MenuItem>
            <MenuItem value="Low">Low</MenuItem>
            <MenuItem value="Informational">Informational</MenuItem>
          </Select>
        </FormControl>

        <FormControl size="small" sx={{ minWidth: 140 }}>
          <InputLabel>Issue Status</InputLabel>
          <Select
            value={filters.issueStatus}
            label="Issue Status"
            onChange={(e) => handleFilterChange('issueStatus', e.target.value)}
          >
            <MenuItem value="All">All</MenuItem>
            <MenuItem value="Open">Open</MenuItem>
            <MenuItem value="Partially Closed">Partially Closed</MenuItem>
            <MenuItem value="Closed">Closed</MenuItem>
          </Select>
        </FormControl>

        <FormControl size="small" sx={{ minWidth: 140 }}>
          <InputLabel>SLA Status</InputLabel>
          <Select
            value={filters.slaStatus}
            label="SLA Status"
            onChange={(e) => handleFilterChange('slaStatus', e.target.value)}
          >
            <MenuItem value="All">All</MenuItem>
            <MenuItem value="On Track">On Track</MenuItem>
            <MenuItem value="At Risk">At Risk</MenuItem>
            <MenuItem value="Overdue">Overdue</MenuItem>
            <MenuItem value="Closed">Closed</MenuItem>
          </Select>
        </FormControl>

        <Autocomplete
          multiple
          size="small"
          options={availableTags}
          getOptionLabel={(option) => option.name}
          value={filters.tags}
          onChange={(event, newValue) => handleFilterChange('tags', newValue)}
          renderInput={(params) => (
            <TextField {...params} label="Filter by Tags" placeholder="Select tags" />
          )}
          renderTags={(value, getTagProps) =>
            value.map((tag, index) => (
              <Chip
                {...getTagProps({ index })}
                key={tag.id}
                label={tag.name}
                size="small"
                sx={{
                  bgcolor: tag.color,
                  color: '#fff',
                  fontWeight: 'bold',
                  '& .MuiChip-deleteIcon': {
                    color: 'rgba(255, 255, 255, 0.7)',
                    '&:hover': {
                      color: '#fff',
                    },
                  },
                }}
              />
            ))
          }
          sx={{ minWidth: 240 }}
        />

        {filters.tags.length > 1 && (
          <ToggleButtonGroup
            size="small"
            value={filters.tagFilterMode}
            exclusive
            onChange={(e, newMode) => {
              if (newMode !== null) {
                handleFilterChange('tagFilterMode', newMode);
              }
            }}
            sx={{ height: 40 }}
          >
            <ToggleButton value="OR">
              <Tooltip title="Match ANY selected tag">
                <span>OR</span>
              </Tooltip>
            </ToggleButton>
            <ToggleButton value="AND">
              <Tooltip title="Match ALL selected tags">
                <span>AND</span>
              </Tooltip>
            </ToggleButton>
          </ToggleButtonGroup>
        )}

        {hasActiveFilters && (
          <Tooltip title="Clear all filters">
            <IconButton 
              size="small" 
              onClick={clearFilters}
              color="primary"
            >
              <ClearIcon />
            </IconButton>
          </Tooltip>
        )}

        {hasActiveFilters && (
          <Chip 
            label={`${Object.entries(filters).filter(([k, v]) => 
              k === 'tags' ? (v as Tag[]).length > 0 : v !== 'All' && k !== 'tagFilterMode'
            ).length} active`}
            size="small"
            color="primary"
            variant="outlined"
          />
        )}
      </Box>
    </GridToolbarContainer>
  );
};

export default FindingsTableToolbar;
