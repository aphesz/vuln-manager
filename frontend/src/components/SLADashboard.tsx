import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Alert,
  CircularProgress,
  Chip,
  Paper,
  Stack,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  IconButton,
  Tooltip,
} from '@mui/material';
import {
  DataGrid,
  GridColDef,
  GridRenderCellParams,
  GridToolbar,
  GridActionsCellItem,
} from '@mui/x-data-grid';
import {
  Warning as WarningIcon,
  Error as ErrorIcon,
  CheckCircle as SuccessIcon,
  Schedule as ClockIcon,
  Edit as EditIcon,
} from '@mui/icons-material';
import { useTheme } from '@mui/material/styles';
import { DateTimePicker } from '@mui/x-date-pickers/DateTimePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import type { Finding, SLAStatus, SLASummary } from '../types';
import SLAService from '../services/SLAService';

const SLADashboard = () => {
  const theme = useTheme();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [allFindings, setAllFindings] = useState<Finding[]>([]);
  const [slaSummary, setSlaSummary] = useState<SLASummary | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedFinding, setSelectedFinding] = useState<Finding | null>(null);
  const [editDeadline, setEditDeadline] = useState<Date | null>(null);
  const [editOwner, setEditOwner] = useState<string>('');
  const [selectedFilter, setSelectedFilter] = useState<SLAStatus | null>(null);
  
  // For demo purposes - in production, get this from auth context
  const currentUser = 'analyst@example.com';

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    setError(null);

    try {
      const [findings, summary] = await Promise.all([
        SLAService.getAllFindingsWithSLA(),
        SLAService.getSLASummary(),
      ]);
      setAllFindings(findings);
      setSlaSummary(summary);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to load SLA data');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenEditDialog = (finding: Finding) => {
    setSelectedFinding(finding);
    setEditDeadline(finding.remediation_deadline ? new Date(finding.remediation_deadline) : null);
    setEditOwner(finding.remediation_owner || '');
    setEditDialogOpen(true);
  };

  const handleCloseEditDialog = () => {
    setEditDialogOpen(false);
    setSelectedFinding(null);
    setEditDeadline(null);
    setEditOwner('');
  };

  const handleSaveRemediation = async () => {
    if (!selectedFinding) return;

    try {
      await SLAService.updateRemediation(selectedFinding.id, {
        remediation_deadline: editDeadline?.toISOString(),
        remediation_owner: editOwner || undefined,
        user: currentUser,
      });
      handleCloseEditDialog();
      loadData(); // Refresh data
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to update remediation tracking');
    }
  };

  const handleCardClick = (status: SLAStatus) => {
    // Toggle filter - clicking the same card again clears the filter
    setSelectedFilter(selectedFilter === status ? null : status);
  };

  const getFilteredFindings = () => {
    if (!selectedFilter) return [];
    return allFindings.filter((f: Finding) => f.sla_status === selectedFilter);
  };

  const handleUpdateDeadline = async (findingId: number, deadline: Date | null) => {
    if (!deadline) return;

    try {
      await SLAService.updateRemediation(findingId, {
        remediation_deadline: deadline.toISOString(),
        user: currentUser,
      });
      loadData(); // Refresh data
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to update deadline');
    }
  };

  const handleUpdateOwner = async (findingId: number, owner: string) => {
    try {
      await SLAService.updateRemediation(findingId, {
        remediation_owner: owner,
        user: currentUser,
      });
      loadData(); // Refresh data
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to update owner');
    }
  };

  const getSLAStatusColor = (status: SLAStatus | undefined) => {
    switch (status) {
      case 'On Track':
        return theme.palette.success.main;
      case 'At Risk':
        return theme.palette.warning.main;
      case 'Overdue':
        return theme.palette.error.main;
      default:
        return theme.palette.grey[500];
    }
  };

  const getSLAStatusIcon = (status: SLAStatus | undefined) => {
    switch (status) {
      case 'On Track':
        return <SuccessIcon sx={{ fontSize: 16 }} />;
      case 'At Risk':
        return <WarningIcon sx={{ fontSize: 16 }} />;
      case 'Overdue':
        return <ErrorIcon sx={{ fontSize: 16 }} />;
      default:
        return <ClockIcon sx={{ fontSize: 16 }} />;
    }
  };

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'Critical':
        return theme.palette.error.dark;
      case 'High':
        return theme.palette.error.main;
      case 'Medium':
        return theme.palette.warning.main;
      case 'Low':
        return theme.palette.info.main;
      default:
        return theme.palette.grey[500];
    }
  };

  const formatDate = (dateString: string | undefined) => {
    if (!dateString) return 'Not set';
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const columns: GridColDef[] = [
    {
      field: 'title',
      headerName: 'Finding',
      flex: 2,
      minWidth: 200,
    },
    {
      field: 'risk_rating',
      headerName: 'Risk',
      width: 120,
      renderCell: (params: GridRenderCellParams) => (
        <Chip
          label={params.value}
          size="small"
          sx={{
            bgcolor: getRiskColor(params.value as string),
            color: 'white',
            fontWeight: 'bold',
          }}
        />
      ),
    },
    {
      field: 'sla_status',
      headerName: 'SLA Status',
      width: 140,
      renderCell: (params: GridRenderCellParams) => (
        <Chip
          label={params.value || 'Unknown'}
          size="small"
          icon={getSLAStatusIcon(params.value as SLAStatus)}
          sx={{
            bgcolor: getSLAStatusColor(params.value as SLAStatus),
            color: 'white',
            fontWeight: 'bold',
          }}
        />
      ),
    },
    {
      field: 'remediation_deadline',
      headerName: 'Deadline',
      width: 180,
      renderCell: (params: GridRenderCellParams) => (
        <Typography variant="body2" sx={{ fontSize: '0.875rem' }}>
          {formatDate(params.value as string)}
        </Typography>
      ),
    },
    {
      field: 'remediation_owner',
      headerName: 'Owner',
      width: 150,
      renderCell: (params: GridRenderCellParams) => (
        <Typography variant="body2" sx={{ fontSize: '0.875rem' }}>
          {params.value || 'Unassigned'}
        </Typography>
      ),
    },
    {
      field: 'actions',
      type: 'actions' as const,
      headerName: 'Actions',
      width: 100,
      getActions: (params: any) => [
        <GridActionsCellItem
          icon={<EditIcon />}
          label="Set Deadline & Owner"
          onClick={() => handleOpenEditDialog(params.row)}
          showInMenu={false}
        />,
      ],
    },
  ];

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 400 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <Box sx={{ p: 3 }}>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        <Typography variant="h4" gutterBottom sx={{ mb: 3, fontWeight: 600 }}>
          SLA & Remediation Tracking
        </Typography>

        <Grid container spacing={3}>
        {/* SLA Summary Cards */}
        <Grid item xs={12}>
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', mb: 2 }}>
            {[
              { 
                status: 'On Track' as SLAStatus, 
                color: '#2e7d32', 
                bgColor: '#c8e6c9',
                icon: <SuccessIcon />,
                label: 'On Track',
                description: 'Findings within SLA deadline'
              },
              { 
                status: 'At Risk' as SLAStatus, 
                color: '#e65100', 
                bgColor: '#ffccbc',
                icon: <WarningIcon />,
                label: 'At Risk',
                description: 'Approaching deadline (within 20%)'
              },
              { 
                status: 'Overdue' as SLAStatus, 
                color: '#b71c1c', 
                bgColor: '#ffcdd2',
                icon: <ErrorIcon />,
                label: 'Overdue',
                description: 'Past remediation deadline'
              },
            ].map(({ status, color, bgColor, icon, label, description }) => {
              const count = slaSummary?.[status.toLowerCase().replace(' ', '_') as keyof SLASummary] || 0;
              const isSelected = selectedFilter === status;
              
              return (
                <Card
                  key={status}
                  onClick={() => handleCardClick(status)}
                  sx={{
                    flex: 1,
                    minWidth: '200px',
                    cursor: 'pointer',
                    transition: 'all 0.3s',
                    border: isSelected ? `3px solid ${color}` : `2px solid ${color}`,
                    backgroundColor: isSelected 
                      ? (theme.palette.mode === 'dark' ? `${color}22` : bgColor)
                      : (theme.palette.mode === 'dark' ? `${color}11` : bgColor),
                    transform: isSelected ? 'scale(1.05)' : 'scale(1)',
                    '&:hover': {
                      transform: 'scale(1.05)',
                      boxShadow: 6,
                      backgroundColor: theme.palette.mode === 'dark' ? `${color}33` : bgColor,
                    },
                  }}
                >
                  <CardContent>
                    <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
                      <Box sx={{ color }}>{icon}</Box>
                      <Typography 
                        variant="overline" 
                        sx={{ 
                          color: theme.palette.mode === 'dark' ? color : color,
                          fontWeight: 600,
                        }}
                      >
                        {label}
                      </Typography>
                    </Stack>
                    <Typography 
                      variant="h3" 
                      sx={{ 
                        color, 
                        fontWeight: 'bold', 
                        my: 1,
                        textShadow: theme.palette.mode === 'dark' ? `0 0 10px ${color}55` : 'none',
                      }}
                    >
                      {count}
                    </Typography>
                    <Typography 
                      variant="caption" 
                      sx={{ 
                        color: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.7)' : 'text.secondary',
                      }}
                    >
                      {description}
                    </Typography>
                  </CardContent>
                </Card>
              );
            })}
          </Box>
        </Grid>

        {/* Filtered Findings Table (appears when card is clicked) */}
        {selectedFilter && (
          <Grid item xs={12}>
            <Card sx={{ 
              mb: 2, 
              border: '2px solid', 
              borderColor: (() => {
                const colorMap = {
                  'On Track': '#2e7d32',
                  'At Risk': '#e65100',
                  'Overdue': '#b71c1c',
                };
                return colorMap[selectedFilter as keyof typeof colorMap];
              })(),
              backgroundColor: (() => {
                const bgColorMap = {
                  'On Track': theme.palette.mode === 'dark' ? '#2e7d3211' : '#c8e6c9',
                  'At Risk': theme.palette.mode === 'dark' ? '#e6510011' : '#ffccbc',
                  'Overdue': theme.palette.mode === 'dark' ? '#b71c1c11' : '#ffcdd2',
                };
                return bgColorMap[selectedFilter as keyof typeof bgColorMap];
              })(),
            }}>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6" sx={{ 
                  fontWeight: 600,
                  color: (() => {
                    const colorMap = {
                      'On Track': '#2e7d32',
                      'At Risk': '#e65100',
                      'Overdue': '#b71c1c',
                    };
                    return colorMap[selectedFilter as keyof typeof colorMap];
                  })(),
                }}>
                  {selectedFilter} Findings ({getFilteredFindings().length})
                </Typography>
                <Button 
                  size="small" 
                  onClick={() => setSelectedFilter(null)}
                  sx={{ minWidth: 'auto' }}
                >
                  Clear Filter
                </Button>
              </Box>
              <Paper elevation={0} sx={{ height: 400, width: '100%' }}>
                <DataGrid
                  rows={getFilteredFindings()}
                  columns={columns}
                  pageSizeOptions={[5, 10, 25]}
                  checkboxSelection={false}
                  disableRowSelectionOnClick
                  slots={{
                    toolbar: GridToolbar,
                  }}
                  slotProps={{
                    toolbar: {
                      showQuickFilter: true,
                      quickFilterProps: { debounceMs: 500 },
                    },
                  }}
                  sx={{
                    '& .MuiDataGrid-toolbarContainer': {
                      padding: 2,
                      backgroundColor: theme.palette.background.paper,
                    },
                    '& .MuiDataGrid-row': {
                      cursor: 'pointer',
                    },
                  }}
                />
              </Paper>
            </CardContent>
          </Card>
          </Grid>
        )}

        {/* All Findings Table */}
        <Grid item xs={12}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom sx={{ mb: 2 }}>
              All Findings with SLA Tracking
            </Typography>
            <Paper elevation={0} sx={{ height: 600, width: '100%' }}>
              <DataGrid
                rows={allFindings}
                columns={columns}
                pageSizeOptions={[10, 25, 50]}
                checkboxSelection={false}
                disableRowSelectionOnClick
                slots={{
                  toolbar: GridToolbar,
                }}
                slotProps={{
                  toolbar: {
                    showQuickFilter: true,
                    quickFilterProps: { debounceMs: 500 },
                  },
                }}
                sx={{
                  '& .MuiDataGrid-toolbarContainer': {
                    padding: 2,
                    backgroundColor: theme.palette.background.paper,
                  },
                  '& .MuiDataGrid-row': {
                    cursor: 'pointer',
                  },
                }}
              />
            </Paper>
          </CardContent>
        </Card>

        {/* Info Card */}
        <Card sx={{ mt: 3, bgcolor: theme.palette.mode === 'dark' ? 'grey.900' : 'grey.50' }}>
          <CardContent>
            <Typography variant="subtitle2" gutterBottom>
              ℹ️ About SLA Tracking
            </Typography>
            <Typography variant="body2" color="text.secondary">
              SLA deadlines are automatically calculated based on risk rating:
            </Typography>
            <Box component="ul" sx={{ mt: 1, pl: 2 }}>
              <Typography component="li" variant="body2" color="text.secondary">
                <strong>Critical:</strong> 7 days
              </Typography>
              <Typography component="li" variant="body2" color="text.secondary">
                <strong>High:</strong> 14 days
              </Typography>
              <Typography component="li" variant="body2" color="text.secondary">
                <strong>Medium:</strong> 30 days
              </Typography>
              <Typography component="li" variant="body2" color="text.secondary">
                <strong>Low:</strong> 90 days
              </Typography>
            </Box>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              Status is updated automatically: <strong>On Track</strong> (within deadline),{' '}
              <strong>At Risk</strong> (less than 20% time remaining), <strong>Overdue</strong>{' '}
              (past deadline).
            </Typography>
          </CardContent>
        </Card>
        </Grid>

        {/* Edit Remediation Dialog */}
        <Dialog 
          open={editDialogOpen} 
          onClose={handleCloseEditDialog}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle>
            Set Remediation Tracking
          </DialogTitle>
          <DialogContent>
            {selectedFinding && (
              <Box sx={{ pt: 2 }}>
                <Typography variant="subtitle2" gutterBottom>
                  Finding: <strong>{selectedFinding.title}</strong>
                </Typography>
                <Typography variant="body2" color="text.secondary" gutterBottom sx={{ mb: 3 }}>
                  Risk: <Chip 
                    label={selectedFinding.risk_rating} 
                    size="small"
                    sx={{
                      bgcolor: getRiskColor(selectedFinding.risk_rating),
                      color: 'white',
                      fontWeight: 'bold',
                    }}
                  />
                </Typography>

                <DateTimePicker
                  label="Remediation Deadline"
                  value={editDeadline}
                  onChange={(newValue: Date | null) => setEditDeadline(newValue)}
                  slotProps={{
                    textField: {
                      fullWidth: true,
                      margin: 'normal',
                      helperText: 'Set the deadline for remediation',
                    },
                  }}
                />

                <TextField
                  fullWidth
                  margin="normal"
                  label="Remediation Owner"
                  value={editOwner}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEditOwner(e.target.value)}
                  helperText="Person responsible for remediation (e.g., email or name)"
                  placeholder="analyst@example.com"
                />

                <Alert severity="info" sx={{ mt: 2 }}>
                  SLA status will be automatically calculated when you set a deadline.
                </Alert>
              </Box>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseEditDialog}>Cancel</Button>
            <Button 
              onClick={handleSaveRemediation} 
              variant="contained"
              disabled={!editDeadline && !editOwner}
            >
              Save
            </Button>
          </DialogActions>
        </Dialog>
      </Grid>
      </Box>
    </LocalizationProvider>
  );
};

export default SLADashboard;
