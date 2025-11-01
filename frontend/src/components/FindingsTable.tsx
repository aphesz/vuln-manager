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
} from '@mui/icons-material';
import { useTheme } from '@mui/material/styles';
import FindingReviewPanel from './FindingReviewPanel';
import IssueStatusService from '../services/IssueStatusService';

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

  const formatDeadline = (deadline: string | undefined) => {
    if (!deadline) return 'Not set';
    const date = new Date(deadline);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const columns: GridColDef[] = [
    {
      field: 'title',
      headerName: 'Title',
      flex: 2,
      minWidth: 150,
      renderCell: (params: GridRenderCellParams) => (
        <Typography 
          variant="body2" 
          sx={{ cursor: 'pointer' }}
          onClick={() => setSelectedFinding(params.row)}
        >
          {params.value}
        </Typography>
      ),
    },
    {
      field: 'risk_rating',
      headerName: 'Risk Level',
      flex: 1,
      minWidth: 120,
      renderCell: (params: GridRenderCellParams) => <RiskChip level={params.value} />,
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
      renderCell: (params: GridRenderCellParams) => {
        const status = params.value as string | undefined;
        
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
      },
    },
    {
      field: 'remediation_deadline',
      headerName: 'Deadline',
      flex: 1,
      minWidth: 120,
      renderCell: (params: GridRenderCellParams) => {
        const deadline = params.value as string | undefined;
        const isOverdue = deadline && new Date(deadline) < new Date();
        
        return (
          <Typography
            variant="body2"
            sx={{
              fontSize: '0.875rem',
              color: isOverdue ? theme.palette.error.main : 'inherit',
              fontWeight: isOverdue ? 'bold' : 'normal',
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

  return (
    <Paper 
      elevation={1} 
      sx={{ 
        height: { xs: 500, sm: 600, md: 700 }, 
        width: '100%',
        overflow: 'auto',
      }}
    >
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