/** @jsxRuntime classic */
/** @jsx React.createElement */
/** @jsxFrag React.Fragment */

import React, { useState } from 'react';
import {
  DataGrid,
  GridToolbar,
  GridActionsCellItem,
  GridRenderCellParams,
} from '@mui/x-data-grid';
import { Finding, Instance, RiskRating } from '../types';
import {
  Box,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Card,
  CardContent,
  Tabs,
  Tab,
  Paper,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';

interface RiskChipProps {
  level: RiskRating;
}

// Risk level chips with consistent styling
const RiskChip = ({ level }: RiskChipProps) => {
  const theme = useTheme();
  return (
    <Chip
      label={level}
      sx={{
        bgcolor: theme.palette.risk[level.toLowerCase()],
        color: 'white',
        fontWeight: 'bold',
      }}
    />
  );
};

interface FindingDialogProps {
  finding: Finding | null;
  open: boolean;
  onClose: () => void;
}

// Detailed view dialog for a finding
const FindingDialog = ({ finding, open, onClose }: FindingDialogProps) => {
  const [tabValue, setTabValue] = useState(0);

  if (!finding) return null;

  return (
    <Dialog 
      open={open} 
      onClose={onClose}
      maxWidth="md"
      fullWidth
    >
      <DialogTitle>
        <Typography variant="h6" component="div">
          {finding.title}
        </Typography>
        <Box sx={{ mt: 1 }}>
          <RiskChip level={finding.risk_rating} />
        </Box>
      </DialogTitle>
      <DialogContent>
        <Tabs 
          value={tabValue}
          onChange={(_event: React.SyntheticEvent, newValue: number) => setTabValue(newValue)}
          sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}
        >
          <Tab label="Overview" />
          <Tab label="Instances" />
          <Tab label="Remediation" />
        </Tabs>

        {tabValue === 0 && (
          <Box>
            <Typography variant="h6" gutterBottom>Description</Typography>
            <Typography variant="body1" paragraph>
              {finding.description}
            </Typography>
          </Box>
        )}

        {tabValue === 1 && (
          <Box>
            <Typography variant="h6" gutterBottom>
              Instances ({finding.instances.length})
            </Typography>
            {finding.instances.map((instance, idx) => (
              <Card key={idx} sx={{ mb: 2 }}>
                <CardContent>
                  <Typography variant="subtitle2" color="text.secondary">
                    Location
                  </Typography>
                  <Typography variant="body2" sx={{ mb: 1 }}>
                    {instance.location}
                  </Typography>
                  <Typography variant="subtitle2" color="text.secondary">
                    Details
                  </Typography>
                  <Typography variant="body2">
                    {instance.details}
                  </Typography>
                  <Box sx={{ mt: 1 }}>
                    <Chip 
                      label={instance.status}
                      size="small"
                      color={instance.status.includes('New') ? 'error' : 'success'}
                    />
                  </Box>
                </CardContent>
              </Card>
            ))}
          </Box>
        )}

        {tabValue === 2 && (
          <Box>
            <Typography variant="h6" gutterBottom>Remediation Steps</Typography>
            <Typography variant="body1">
              {finding.remediation}
            </Typography>
          </Box>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
};

interface FindingsTableProps {
  findings: Finding[];
  preferences: {
    [key: string]: {
      visible: boolean;
      width?: number;
      order: number;
    };
  };
  onPreferencesChange: (columns: any) => void;
}

// Main FindingsTable component
const FindingsTable = ({ findings, preferences, onPreferencesChange }: FindingsTableProps) => {
  const [selectedFinding, setSelectedFinding] = useState(null);
  const theme = useTheme();

  const columns = [
    {
      field: 'title',
      headerName: 'Title',
      flex: 2,
      renderCell: (params: GridRenderCellParams) => (
        <Typography variant="body2" sx={{ cursor: 'pointer' }}>
          {params.value}
        </Typography>
      ),
    },
    {
      field: 'risk_rating',
      headerName: 'Risk Level',
      width: 130,
      renderCell: (params: GridRenderCellParams) => <RiskChip level={params.value} />,
    },
    {
      field: 'instances',
      headerName: 'Instances',
      width: 100,
      valueGetter: (params: any) => params.row.instances.length,
    },
    {
      field: 'actions',
      type: 'actions' as const,
      headerName: 'Actions',
      width: 100,
      getActions: (params: any) => [
        <GridActionsCellItem
          label="View Details"
          onClick={() => setSelectedFinding(params.row)}
          showInMenu
        />,
        <GridActionsCellItem
          label="Export Finding"
          onClick={() => {/* TODO: Implement export */}}
          showInMenu
        />,
      ],
    },
  ];

  return (
    <Paper elevation={1} sx={{ height: 600, width: '100%' }}>
      <DataGrid
        rows={findings}
        columns={columns}
        pageSizeOptions={[10, 25, 50]}
        checkboxSelection
        disableRowSelectionOnClick
        slotProps={{
          toolbar: {
            showQuickFilter: true,
            quickFilterProps: { debounceMs: 500 },
          },
        }}
        slots={{
          toolbar: GridToolbar,
        }}
        sx={{
          '& .MuiDataGrid-toolbarContainer': {
            padding: 2,
            backgroundColor: theme.palette.background.paper,
          },
        }}
      />
      
      <FindingDialog
        finding={selectedFinding}
        open={!!selectedFinding}
        onClose={() => setSelectedFinding(null)}
      />
    </Paper>
  );
};

export default FindingsTable;