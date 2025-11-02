/** @jsxRuntime classic */
/** @jsx React.createElement */
/** @jsxFrag React.Fragment */

import React, { useState, useEffect } from 'react';
import {
  DataGrid,
  GridToolbar,
  GridActionsCellItem,
  GridRenderCellParams,
  GridColDef,
  GridRenderEditCellParams,
  useGridApiContext,
} from '@mui/x-data-grid';
import { Finding, Instance, RiskRating, ReviewStatus, SLAStatus, IssueStatus } from '../types';
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
  Tooltip,
  Select,
  MenuItem,
  TextField,
  FormControl,
  InputLabel,
  IconButton,
} from '@mui/material';
import {
  CheckCircle as ApprovedIcon,
  Cancel as RejectedIcon,
  RateReview as ReviewIcon,
  Pending as PendingIcon,
  BugReport as JiraIcon,
  Warning as WarningIcon,
  Error as ErrorIcon,
  CheckCircle as SuccessIcon,
  Edit as EditIcon,
  Save as SaveIcon,
  Close as CancelIcon,
} from '@mui/icons-material';
import { useTheme } from '@mui/material/styles';
import FindingReviewPanel from './FindingReviewPanel';
import IssueStatusService from '../services/IssueStatusService';
import UserPreferencesService from '../services/UserPreferencesService';
import { formatDateShort, isOverdue } from '../utils/timezoneUtils';
import axios from 'axios';

const API_BASE_URL = '/api';

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

// Custom edit components for inline editing
const RiskRatingEditCell = (params: GridRenderEditCellParams) => {
  const apiRef = useGridApiContext();
  const { id, value, field } = params;

  const handleChange = async (event: any) => {
    const newValue = event.target.value as RiskRating;
    apiRef.current.setEditCellValue({ id, field, value: newValue });
    
    // Auto-save on change
    try {
      await axios.patch(`${API_BASE_URL}/findings/${id}`, {
        risk_rating: newValue,
      });
      apiRef.current.stopCellEditMode({ id, field });
    } catch (error) {
      console.error('Failed to update risk rating:', error);
    }
  };

  return (
    <Select
      value={value}
      onChange={handleChange}
      size="small"
      fullWidth
      autoFocus
    >
      <MenuItem value="Critical">Critical</MenuItem>
      <MenuItem value="High">High</MenuItem>
      <MenuItem value="Medium">Medium</MenuItem>
      <MenuItem value="Low">Low</MenuItem>
      <MenuItem value="Informational">Informational</MenuItem>
    </Select>
  );
};

const IssueStatusEditCell = (params: GridRenderEditCellParams) => {
  const apiRef = useGridApiContext();
  const { id, value, field, row } = params;

  const handleChange = async (event: any) => {
    const newValue = event.target.value as IssueStatus;
    apiRef.current.setEditCellValue({ id, field, value: newValue });
    
    // Auto-save on change
    try {
      await IssueStatusService.updateIssueStatus(
        id as number,
        newValue,
        undefined,
        'analyst@example.com'
      );
      apiRef.current.stopCellEditMode({ id, field });
    } catch (error) {
      console.error('Failed to update issue status:', error);
    }
  };

  return (
    <Select
      value={value || 'Open'}
      onChange={handleChange}
      size="small"
      fullWidth
      autoFocus
    >
      <MenuItem value="Open">Open</MenuItem>
      <MenuItem value="Partially Closed">Partially Closed</MenuItem>
      <MenuItem value="Closed">Closed</MenuItem>
    </Select>
  );
};

interface FindingDialogProps {
  finding: Finding | null;
  open: boolean;
  onClose: () => void;
  onRefresh?: () => void;
}

// Detailed view dialog for a finding
const FindingDialog = ({ finding, open, onClose, onRefresh }: FindingDialogProps) => {
  const [tabValue, setTabValue] = useState(0);
  const [refreshKey, setRefreshKey] = useState(0);

  if (!finding) return null;

  const handleStatusChange = () => {
    setRefreshKey((prev: number) => prev + 1);
    if (onRefresh) {
      onRefresh();
    }
  };

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
          <Tab label="Peer Review" />
          <Tab label="Issue Status" />
        </Tabs>

        {tabValue === 0 && (
          <Box>
            <Typography variant="h6" gutterBottom>Description</Typography>
            <Typography variant="body1" paragraph sx={{ whiteSpace: 'pre-wrap' }}>
              {stripHtmlTags(finding.description)}
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
            <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap' }}>
              {stripHtmlTags(finding.remediation)}
            </Typography>
          </Box>
        )}

        {tabValue === 3 && (
          <Box key={refreshKey}>
            <FindingReviewPanel
              findingId={finding.id}
              currentStatus={finding.review_status || 'Pending'}
              currentReviewerName={finding.reviewer_name}
              onStatusChange={handleStatusChange}
            />
          </Box>
        )}

        {tabValue === 4 && (
          <Box>
            <Typography variant="h6" gutterBottom>
              Issue Tracking Status
            </Typography>
            <Typography variant="body2" color="text.secondary" paragraph>
              Track whether this finding is open, partially resolved, or fully closed.
            </Typography>

            <FormControl fullWidth sx={{ mb: 2 }}>
              <InputLabel>Issue Status</InputLabel>
              <Select
                value={finding.issue_status || 'Open'}
                label="Issue Status"
                onChange={async (e) => {
                  const newStatus = e.target.value as IssueStatus;
                  try {
                    await IssueStatusService.updateIssueStatus(
                      finding.id,
                      newStatus,
                      undefined,
                      'analyst@example.com'
                    );
                    handleStatusChange();
                  } catch (err) {
                    console.error('Failed to update issue status:', err);
                  }
                }}
              >
                <MenuItem value="Open">Open</MenuItem>
                <MenuItem value="Partially Closed">Partially Closed</MenuItem>
                <MenuItem value="Closed">Closed</MenuItem>
              </Select>
            </FormControl>

            <TextField
              fullWidth
              multiline
              rows={3}
              label="Status Comment (Optional)"
              defaultValue={finding.issue_status_comment || ''}
              helperText="Add notes about the current status"
              onBlur={async (e) => {
                const comment = e.target.value;
                if (comment !== (finding.issue_status_comment || '')) {
                  try {
                    await IssueStatusService.updateIssueStatus(
                      finding.id,
                      finding.issue_status || 'Open',
                      comment,
                      'analyst@example.com'
                    );
                    handleStatusChange();
                  } catch (err) {
                    console.error('Failed to update status comment:', err);
                  }
                }
              }}
            />

            <Box sx={{ mt: 2, p: 2, bgcolor: 'background.paper', borderRadius: 1 }}>
              <Typography variant="caption" color="text.secondary">
                <strong>Status Guide:</strong>
              </Typography>
              <Typography variant="caption" display="block" color="text.secondary">
                • <strong>Open:</strong> Finding is unresolved and requires attention
              </Typography>
              <Typography variant="caption" display="block" color="text.secondary">
                • <strong>Partially Closed:</strong> Some instances resolved, others remain
              </Typography>
              <Typography variant="caption" display="block" color="text.secondary">
                • <strong>Closed:</strong> All instances resolved and verified
              </Typography>
            </Box>
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
  onRefresh?: () => void;
}

// Utility function to strip HTML tags and decode HTML entities
const stripHtmlTags = (html: string): string => {
  if (!html) return '';
  
  // Create a temporary element to parse HTML
  const div = document.createElement('div');
  div.innerHTML = html;
  
  // Get text content (strips all HTML)
  let text = div.textContent || div.innerText || '';
  
  // Decode common HTML entities
  text = text
    .replace(/&nbsp;/g, ' ')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
  
  // Clean up excess whitespace
  text = text.replace(/\s+/g, ' ').trim();
  
  return text;
};

// Main FindingsTable component
const FindingsTable = ({ findings, preferences, onPreferencesChange, onRefresh }: FindingsTableProps) => {
  const [selectedFinding, setSelectedFinding] = useState(null);
  const [apiRef, setApiRef] = useState<any>(null);
  const theme = useTheme();

  // Update selectedFinding when findings array changes (after refresh)
  useEffect(() => {
    if (selectedFinding) {
      const updatedFinding = findings.find((f: Finding) => f.id === selectedFinding.id);
      if (updatedFinding) {
        setSelectedFinding(updatedFinding);
      }
    }
  }, [findings]);

  // Helper functions for status rendering
  const getReviewStatusColor = (status: ReviewStatus | undefined) => {
    switch (status) {
      case 'Approved': return 'success';
      case 'Rejected': return 'error';
      case 'In Review': return 'info';
      case 'Pending':
      default: return 'warning';
    }
  };

  const getReviewStatusIcon = (status: ReviewStatus | undefined) => {
    switch (status) {
      case 'Approved': return <ApprovedIcon sx={{ fontSize: 16 }} />;
      case 'Rejected': return <RejectedIcon sx={{ fontSize: 16 }} />;
      case 'In Review': return <ReviewIcon sx={{ fontSize: 16 }} />;
      case 'Pending':
      default: return <PendingIcon sx={{ fontSize: 16 }} />;
    }
  };

  const getSLAStatusColor = (status: SLAStatus | undefined) => {
    switch (status) {
      case 'On Track': return theme.palette.success.main;
      case 'At Risk': return theme.palette.warning.main;
      case 'Overdue': return theme.palette.error.main;
      default: return theme.palette.grey[500];
    }
  };

  const getSLAStatusIcon = (status: SLAStatus | undefined) => {
    switch (status) {
      case 'On Track': return <SuccessIcon sx={{ fontSize: 16 }} />;
      case 'At Risk': return <WarningIcon sx={{ fontSize: 16 }} />;
      case 'Overdue': return <ErrorIcon sx={{ fontSize: 16 }} />;
      default: return null;
    }
  };

  // Get user's timezone preference
  const prefsService = UserPreferencesService.getInstance();
  const userTimezone = prefsService.getTimezone();

  const formatDeadline = (deadline: string | undefined) => {
    if (!deadline) return 'Not set';
    return formatDateShort(deadline, userTimezone);
  };

  const columns: GridColDef[] = [
    {
      field: 'title',
      headerName: 'Title',
      flex: 2,
      minWidth: 150,
      editable: true,
      renderCell: (params: GridRenderCellParams) => (
        <Box sx={{ display: 'flex', alignItems: 'center', width: '100%', gap: 1 }}>
          <Typography 
            variant="body2" 
            sx={{ 
              cursor: 'pointer', 
              flex: 1,
              '&:hover': { textDecoration: 'underline' }
            }}
            onClick={() => setSelectedFinding(params.row)}
          >
            {params.value}
          </Typography>
          <Tooltip title="Click to edit">
            <IconButton
              size="small"
              onClick={(e: any) => {
                e.stopPropagation();
                if (apiRef) {
                  apiRef.startCellEditMode({ id: params.id, field: params.field });
                }
              }}
              sx={{ 
                p: 0.5,
                '&:hover': { color: 'primary.main' }
              }}
            >
              <EditIcon sx={{ fontSize: 16, opacity: 0.6 }} />
            </IconButton>
          </Tooltip>
        </Box>
      ),
      renderEditCell: (params: GridRenderEditCellParams) => {
        const apiRef = useGridApiContext();
        const { id, value, field } = params;
        const [editValue, setEditValue] = useState(value);

        const handleSave = async () => {
          try {
            await axios.patch(`${API_BASE_URL}/findings/${id}`, {
              title: editValue,
            });
            apiRef.current.setEditCellValue({ id, field, value: editValue });
            apiRef.current.stopCellEditMode({ id, field });
            if (onRefresh) onRefresh();
          } catch (error) {
            console.error('Failed to update title:', error);
          }
        };

        return (
          <Box sx={{ display: 'flex', alignItems: 'center', width: '100%', gap: 0.5 }}>
            <TextField
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleSave();
                } else if (e.key === 'Escape') {
                  apiRef.current.stopCellEditMode({ id, field, ignoreModifications: true });
                }
              }}
              size="small"
              fullWidth
              autoFocus
              sx={{ '& .MuiInputBase-input': { fontSize: '0.875rem' } }}
            />
            <IconButton size="small" onClick={handleSave} color="primary">
              <SaveIcon fontSize="small" />
            </IconButton>
            <IconButton 
              size="small" 
              onClick={() => apiRef.current.stopCellEditMode({ id, field, ignoreModifications: true })}
            >
              <CancelIcon fontSize="small" />
            </IconButton>
          </Box>
        );
      },
    },
    {
      field: 'description',
      headerName: 'Description',
      flex: 3,
      minWidth: 200,
      renderCell: (params: GridRenderCellParams) => (
        <Typography 
          variant="body2"
          sx={{
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
          }}
        >
          {params.value ? params.value.replace(/<[^>]*>/g, '').substring(0, 100) : ''}
        </Typography>
      ),
    },
    {
      field: 'risk_rating',
      headerName: 'Risk Level',
      flex: 1,
      minWidth: 120,
      editable: true,
      renderCell: (params: GridRenderCellParams) => (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <RiskChip level={params.value} />
          <Tooltip title="Click to edit">
            <IconButton
              size="small"
              onClick={(e: any) => {
                e.stopPropagation();
                if (apiRef) {
                  apiRef.startCellEditMode({ id: params.id, field: params.field });
                }
              }}
              sx={{ 
                p: 0.5,
                '&:hover': { color: 'primary.main' }
              }}
            >
              <EditIcon sx={{ fontSize: 14, opacity: 0.6 }} />
            </IconButton>
          </Tooltip>
        </Box>
      ),
      renderEditCell: RiskRatingEditCell,
    },
    {
      field: 'review_status',
      headerName: 'Review Status',
      flex: 1,
      minWidth: 140,
      renderCell: (params: GridRenderCellParams) => {
        const status = (params.value as ReviewStatus) || 'Pending';
        return (
          <Chip
            label={status}
            size="small"
            color={getReviewStatusColor(status) as any}
            icon={getReviewStatusIcon(status)}
            sx={{ fontWeight: 'bold', fontSize: '0.75rem' }}
          />
        );
      },
    },
    {
      field: 'jira_status',
      headerName: 'Jira',
      flex: 1,
      minWidth: 110,
      renderCell: (params: GridRenderCellParams) => {
        const jiraKey = params.row.jira_issue_key;
        const jiraStatus = params.value;
        
        if (!jiraKey) {
          return (
            <Chip
              label="No Issue"
              size="small"
              variant="outlined"
              sx={{ fontSize: '0.7rem' }}
            />
          );
        }
        
        return (
          <Tooltip title={`${jiraKey}: ${jiraStatus || 'Unknown'}`} arrow>
            <Chip
              label={jiraStatus || jiraKey}
              size="small"
              icon={<JiraIcon sx={{ fontSize: 14 }} />}
              color="primary"
              sx={{ fontWeight: 'bold', fontSize: '0.7rem' }}
            />
          </Tooltip>
        );
      },
    },
    {
      field: 'sla_status',
      headerName: 'SLA Status',
      flex: 1,
      minWidth: 130,
      renderCell: (params: GridRenderCellParams) => {
        const status = params.value as SLAStatus;
        
        if (!status) {
          return (
            <Chip
              label="Not Set"
              size="small"
              variant="outlined"
              sx={{ fontSize: '0.7rem' }}
            />
          );
        }
        
        return (
          <Chip
            label={status}
            size="small"
            icon={getSLAStatusIcon(status) || undefined}
            sx={{
              bgcolor: getSLAStatusColor(status),
              color: 'white',
              fontWeight: 'bold',
              fontSize: '0.75rem',
            }}
          />
        );
      },
    },
    {
      field: 'issue_status',
      headerName: 'Issue Status',
      flex: 1,
      minWidth: 130,
      editable: true,
      renderCell: (params: GridRenderCellParams) => {
        const apiRef = useGridApiContext();
        const status = params.value as string | undefined;
        
        const getChip = () => {
          if (!status || status === 'Open') {
            return (
              <Chip
                label="Open"
                size="small"
                color="error"
                sx={{ fontWeight: 'bold', fontSize: '0.75rem' }}
              />
            );
          }
          
          if (status === 'Partially Closed') {
            return (
              <Chip
                label="Partially Closed"
                size="small"
                color="warning"
                sx={{ fontWeight: 'bold', fontSize: '0.7rem' }}
              />
            );
          }
          
          return (
            <Chip
              label="Closed"
              size="small"
              color="success"
              sx={{ fontWeight: 'bold', fontSize: '0.75rem' }}
            />
          );
        };

        return (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {getChip()}
            <Tooltip title="Click to edit">
              <IconButton
                size="small"
                onClick={(e: any) => {
                  e.stopPropagation();
                  if (apiRef) {
                    apiRef.startCellEditMode({ id: params.id, field: params.field });
                  }
                }}
                sx={{ 
                  p: 0.5,
                  '&:hover': { color: 'primary.main' }
                }}
              >
                <EditIcon sx={{ fontSize: 14, opacity: 0.6 }} />
              </IconButton>
            </Tooltip>
          </Box>
        );
      },
      renderEditCell: IssueStatusEditCell,
    },
    {
      field: 'remediation_deadline',
      headerName: 'Deadline',
      flex: 1,
      minWidth: 120,
      renderCell: (params: GridRenderCellParams) => {
        const deadline = params.value as string | undefined;
        const overdue = deadline ? isOverdue(deadline) : false;
        
        return (
          <Typography
            variant="body2"
            sx={{
              fontSize: '0.875rem',
              color: overdue ? theme.palette.error.main : 'inherit',
              fontWeight: overdue ? 'bold' : 'normal',
            }}
          >
            {formatDeadline(deadline)}
          </Typography>
        );
      },
    },
    {
      field: 'instances',
      headerName: 'Instances',
      flex: 0.5,
      minWidth: 90,
      valueGetter: (params: any) => params.row.instances.length,
    },
    {
      field: 'actions',
      type: 'actions' as const,
      headerName: 'Actions',
      flex: 0.5,
      minWidth: 80,
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

  // Filter columns based on user preferences
  const visibleColumns = columns.filter(col => {
    const columnId = col.field;
    // Always show actions column
    if (columnId === 'actions') return true;
    // Check preferences for other columns
    return preferences?.tableColumns?.[columnId]?.visible ?? true;
  });

  return (
    <Paper 
      elevation={1} 
      sx={{ 
        width: '100%',
        overflow: 'hidden',
      }}
    >
      <DataGrid
        rows={findings}
        columns={visibleColumns}
        pageSizeOptions={[10, 25, 50]}
        checkboxSelection
        disableRowSelectionOnClick
        autoHeight
        apiRef={setApiRef}
        initialState={{
          pagination: {
            paginationModel: { pageSize: 10, page: 0 },
          },
        }}
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
            padding: { xs: 1, sm: 2 },
            backgroundColor: theme.palette.background.paper,
            flexWrap: 'wrap',
          },
          '& .MuiDataGrid-columnHeaders': {
            fontSize: { xs: '0.75rem', sm: '0.875rem' },
          },
          '& .MuiDataGrid-cell': {
            fontSize: { xs: '0.75rem', sm: '0.875rem' },
          },
          // Set minimum height to avoid too small tables with few rows
          minHeight: 300,
          // Set maximum height to prevent excessive scrolling with many rows
          maxHeight: { xs: '60vh', sm: '70vh', md: '80vh' },
        }}
      />
      
      <FindingDialog
        finding={selectedFinding}
        open={!!selectedFinding}
        onClose={() => setSelectedFinding(null)}
        onRefresh={onRefresh}
      />
    </Paper>
  );
};

export default FindingsTable;