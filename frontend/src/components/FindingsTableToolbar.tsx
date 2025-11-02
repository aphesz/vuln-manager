/** @jsxRuntime classic */
/** @jsx React.createElement */
/** @jsxFrag React.Fragment */

import React, { useState } from 'react';
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
} from '@mui/material';
import {
  FilterList as FilterIcon,
  Clear as ClearIcon,
  Save as SaveIcon,
} from '@mui/icons-material';
import type { RiskRating, IssueStatus, SLAStatus } from '../types';

interface FindingsTableToolbarProps {
  onFilterChange?: (filters: FilterState) => void;
}

export interface FilterState {
  riskRating: RiskRating | 'All';
  issueStatus: IssueStatus | 'All';
  slaStatus: SLAStatus | 'All';
}

const FindingsTableToolbar: React.FC<FindingsTableToolbarProps> = ({ onFilterChange }) => {
  const [filters, setFilters] = useState<FilterState>({
    riskRating: 'All',
    issueStatus: 'All',
    slaStatus: 'All',
  });

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
    };
    setFilters(clearedFilters);
    if (onFilterChange) {
      onFilterChange(clearedFilters);
    }
  };

  const hasActiveFilters = filters.riskRating !== 'All' || 
                          filters.issueStatus !== 'All' || 
                          filters.slaStatus !== 'All';

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
            label={`${Object.values(filters).filter(v => v !== 'All').length} active`}
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
