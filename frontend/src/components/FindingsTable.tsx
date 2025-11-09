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
  useGridApiRef,
} from '@mui/x-data-grid';
import { Finding, Instance, RiskRating, ReviewStatus, SLAStatus, IssueStatus, Tag } from '../types';
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
  Autocomplete,
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
  Delete as DeleteIcon,
  FileDownload as ExportIcon,
  SwapVert as BulkEditIcon,
  ContentCopy as AddSimilarIcon,
} from '@mui/icons-material';
import { useTheme } from '@mui/material/styles';
import FindingReviewPanel from './FindingReviewPanel';
import FindingsTableToolbar, { FilterState } from './FindingsTableToolbar';
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
      
      // Try to stop edit mode, but don't fail if already stopped
      try {
        apiRef.current.stopCellEditMode({ id, field });
      } catch (e) {
        // Cell already exited edit mode, that's fine
      }
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
      
      // Try to stop edit mode, but don't fail if already stopped
      try {
        apiRef.current.stopCellEditMode({ id, field });
      } catch (e) {
        // Cell already exited edit mode, that's fine
      }
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
  onAddSimilar?: (templateId: number) => void; // Callback for "Add Similar" button
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
const FindingsTable = ({ findings, preferences, onPreferencesChange, onRefresh, onAddSimilar }: FindingsTableProps) => {
  const [selectedFinding, setSelectedFinding] = useState(null);
  const [selectedRows, setSelectedRows] = useState<any[]>([]);
  const [bulkAction, setBulkAction] = useState<string>('');
  const [bulkValue, setBulkValue] = useState<string>('');
  const [filteredFindings, setFilteredFindings] = useState(findings);
  const [availableTags, setAvailableTags] = useState<Tag[]>([]);
  const [localFindings, setLocalFindings] = useState(findings);
  const apiRef = useGridApiRef();
  const theme = useTheme();

  // Fetch available tags on component mount
  useEffect(() => {
    const fetchTags = async () => {
      try {
        const response = await axios.get(`${API_BASE_URL}/tags`);
        setAvailableTags(response.data);
      } catch (error) {
        console.error('Error fetching tags:', error);
      }
    };
    fetchTags();
  }, []);

  // Update local findings when findings prop changes
  useEffect(() => {
    setLocalFindings(findings);
    setFilteredFindings(findings);
  }, [findings]);

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

  // Handle filter changes
  const handleFilterChange = (filters: FilterState) => {
    let filtered = [...findings];

    // Apply risk rating filter
    if (filters.riskRating !== 'All') {
      filtered = filtered.filter((f: Finding) => f.risk_rating === filters.riskRating);
    }

    // Apply issue status filter
    if (filters.issueStatus !== 'All') {
      filtered = filtered.filter((f: Finding) => (f.issue_status || 'Open') === filters.issueStatus);
    }

    // Apply SLA status filter
    if (filters.slaStatus !== 'All') {
      filtered = filtered.filter((f: Finding) => (f.sla_status || 'On Track') === filters.slaStatus);
    }

    // Apply tag filter
    if (filters.tags.length > 0) {
      filtered = filtered.filter((f: Finding) => {
        const findingTagIds = (f.tags || []).map(t => t.id);
        const selectedTagIds = filters.tags.map(t => t.id);
        
        if (filters.tagFilterMode === 'AND') {
          // ALL selected tags must be present
          return selectedTagIds.every(tagId => findingTagIds.includes(tagId));
        } else {
          // ANY selected tag must be present (OR logic)
          return selectedTagIds.some(tagId => findingTagIds.includes(tagId));
        }
      });
    }

    setFilteredFindings(filtered);
  };

  // Optimistic update helper - updates finding in local state without refresh
  const updateFindingOptimistically = (findingId: number, updates: Partial<Finding>) => {
    setLocalFindings(prev => 
      prev.map(f => f.id === findingId ? { ...f, ...updates } : f)
    );
    setFilteredFindings(prev => 
      prev.map(f => f.id === findingId ? { ...f, ...updates } : f)
    );
    // Also update selectedFinding if it's the one being edited
    if (selectedFinding && selectedFinding.id === findingId) {
      setSelectedFinding({ ...selectedFinding, ...updates });
    }
  };

  // Tag management handlers
  const handleAddTag = async (findingId: number, tagId: number) => {
    try {
      await axios.post(`${API_BASE_URL}/findings/${findingId}/tags/${tagId}`);
      // Optimistically add tag to local state
      const tag = availableTags.find(t => t.id === tagId);
      if (tag) {
        const finding = localFindings.find(f => f.id === findingId);
        const currentTags = finding?.tags || [];
        updateFindingOptimistically(findingId, { tags: [...currentTags, tag] });
      }
    } catch (error) {
      console.error('Error adding tag:', error);
      // Revert on error
      if (onRefresh) onRefresh();
    }
  };

  const handleRemoveTag = async (findingId: number, tagId: number) => {
    try {
      await axios.delete(`${API_BASE_URL}/findings/${findingId}/tags/${tagId}`);
      // Optimistically remove tag from local state
      const finding = localFindings.find(f => f.id === findingId);
      const currentTags = finding?.tags || [];
      updateFindingOptimistically(findingId, { 
        tags: currentTags.filter(t => t.id !== tagId) 
      });
    } catch (error) {
      console.error('Error removing tag:', error);
      // Revert on error
      if (onRefresh) onRefresh();
    }
  };

  // Bulk action handlers
  const handleBulkRiskRatingChange = async (newRating: RiskRating) => {
    try {
      await Promise.all(
        selectedRows.map(id =>
          axios.patch(`${API_BASE_URL}/findings/${id}`, { risk_rating: newRating })
        )
      );
      if (onRefresh) onRefresh();
      setSelectedRows([]);
      setBulkAction('');
    } catch (error) {
      console.error('Bulk risk rating update failed:', error);
    }
  };

  const handleBulkStatusChange = async (newStatus: IssueStatus) => {
    try {
      await Promise.all(
        selectedRows.map(id =>
          IssueStatusService.updateIssueStatus(id as number, newStatus, undefined, 'analyst@example.com')
        )
      );
      if (onRefresh) onRefresh();
      setSelectedRows([]);
      setBulkAction('');
    } catch (error) {
      console.error('Bulk status update failed:', error);
    }
  };

  const handleBulkExport = () => {
    const selectedFindings = findings.filter((f: Finding) => selectedRows.includes(f.id));
    const csv = [
      ['ID', 'Title', 'Risk Rating', 'Status', 'Instances', 'SLA Deadline'],
      ...selectedFindings.map((f: Finding) => [
        f.id,
        f.title,
        f.risk_rating,
        f.issue_status || 'Open',
        f.instance_count || 0,
        formatDeadline(f.remediation_deadline)
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `findings-export-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    setSelectedRows([]);
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
                if (apiRef?.current) {
                  apiRef.current.startCellEditMode({ id: params.id, field: params.field });
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
        let currentValue = value;

        const handleSave = async () => {
          try {
            await axios.patch(`${API_BASE_URL}/findings/${id}`, {
              title: currentValue,
            });
            
            // Try to stop edit mode, but don't fail if already stopped
            try {
              apiRef.current.stopCellEditMode({ id, field });
            } catch (e) {
              // Cell already exited edit mode, that's fine
            }
            
            if (onRefresh) onRefresh();
          } catch (error) {
            console.error('Failed to update title:', error);
          }
        };

        const handleChange = (event: any) => {
          currentValue = event.target.value;
          apiRef.current.setEditCellValue({ id, field, value: currentValue });
        };

        const handleCancel = () => {
          try {
            apiRef.current.stopCellEditMode({ id, field, ignoreModifications: true });
          } catch (e) {
            // Cell already exited edit mode, that's fine
          }
        };

        return (
          <Box sx={{ display: 'flex', alignItems: 'center', width: '100%', gap: 0.5 }}>
            <TextField
              defaultValue={value}
              onChange={handleChange}
              onKeyDown={(e: any) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleSave();
                } else if (e.key === 'Escape') {
                  e.preventDefault();
                  handleCancel();
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
            <IconButton size="small" onClick={handleCancel}>
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
      minWidth: 140,
      sortable: true,
      renderCell: (params: GridRenderCellParams) => {
        const [isEditing, setIsEditing] = useState(false);
        const [selectedRisk, setSelectedRisk] = useState<RiskRating>(params.value);

        const handleRiskChange = async (newRisk: RiskRating) => {
          setSelectedRisk(newRisk);
          setIsEditing(false);
          // Optimistic update
          updateFindingOptimistically(params.row.id, { risk_rating: newRisk });
          
          try {
            await axios.patch(`${API_BASE_URL}/findings/${params.row.id}`, { 
              risk_rating: newRisk 
            });
          } catch (error) {
            console.error('Error updating risk rating:', error);
            // Revert on error
            if (onRefresh) onRefresh();
          }
        };

        if (isEditing) {
          return (
            <Select
              size="small"
              value={selectedRisk}
              onChange={(e) => handleRiskChange(e.target.value as RiskRating)}
              onBlur={() => setIsEditing(false)}
              autoFocus
              sx={{ width: '100%', fontSize: '0.875rem' }}
            >
              <MenuItem value="Critical">Critical</MenuItem>
              <MenuItem value="High">High</MenuItem>
              <MenuItem value="Medium">Medium</MenuItem>
              <MenuItem value="Low">Low</MenuItem>
              <MenuItem value="Informational">Informational</MenuItem>
            </Select>
          );
        }

        return (
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1,
              cursor: 'pointer',
              '&:hover': {
                backgroundColor: 'action.hover',
              },
            }}
            onClick={() => setIsEditing(true)}
          >
            <RiskChip level={params.value} />
          </Box>
        );
      },
    },
    {
      field: 'tags',
      headerName: 'Tags',
      flex: 1,
      minWidth: 250,
      sortable: false,
      renderCell: (params: GridRenderCellParams) => {
        const findingTags = params.row.tags || [];
        const [isEditing, setIsEditing] = useState(false);
        const [selectedTags, setSelectedTags] = useState<Tag[]>(findingTags);

        const handleTagChange = async (newTags: Tag[]) => {
          const findingId = params.row.id;
          const oldTagIds = findingTags.map((t: Tag) => t.id);
          const newTagIds = newTags.map(t => t.id);

          // Find tags to add (in new but not in old)
          const toAdd = newTagIds.filter(id => !oldTagIds.includes(id));
          // Find tags to remove (in old but not in new)
          const toRemove = oldTagIds.filter(id => !newTagIds.includes(id));

          try {
            // Add new tags
            for (const tagId of toAdd) {
              await handleAddTag(findingId, tagId);
            }
            // Remove old tags
            for (const tagId of toRemove) {
              await handleRemoveTag(findingId, tagId);
            }
            setSelectedTags(newTags);
            setIsEditing(false);
          } catch (error) {
            console.error('Error updating tags:', error);
          }
        };

        if (isEditing) {
          return (
            <Autocomplete
              multiple
              size="small"
              options={availableTags}
              getOptionLabel={(option) => option.name}
              value={selectedTags}
              onChange={(event, newValue) => handleTagChange(newValue)}
              onBlur={() => setIsEditing(false)}
              renderInput={(params) => (
                <TextField {...params} placeholder="Select tags" autoFocus />
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
                      fontSize: '0.7rem',
                      height: 20,
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
              sx={{ width: '100%' }}
            />
          );
        }

        return (
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 0.5,
              flexWrap: 'wrap',
              cursor: 'pointer',
              '&:hover': {
                backgroundColor: 'action.hover',
              },
            }}
            onClick={() => setIsEditing(true)}
          >
            {findingTags.map((tag: any) => (
              <Chip
                key={tag.id}
                label={tag.name}
                size="small"
                sx={{
                  backgroundColor: tag.color,
                  color: '#fff',
                  fontWeight: 'bold',
                  fontSize: '0.7rem',
                  height: 20,
                }}
              />
            ))}
            {findingTags.length === 0 && (
              <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>
                Click to add tags
              </Typography>
            )}
          </Box>
        );
      },
    },
    {
      field: 'review_status',
      headerName: 'Review Status',
      flex: 1,
      minWidth: 160,
      sortable: true,
      renderCell: (params: GridRenderCellParams) => {
        const [isEditing, setIsEditing] = useState(false);
        const [selectedStatus, setSelectedStatus] = useState<ReviewStatus>(
          (params.value as ReviewStatus) || 'Pending'
        );

        const handleStatusChange = async (newStatus: ReviewStatus) => {
          setSelectedStatus(newStatus);
          setIsEditing(false);
          // Optimistic update
          updateFindingOptimistically(params.row.id, { review_status: newStatus });
          
          try {
            await axios.patch(`${API_BASE_URL}/findings/${params.row.id}`, { 
              review_status: newStatus 
            });
          } catch (error) {
            console.error('Error updating review status:', error);
            // Revert on error
            if (onRefresh) onRefresh();
          }
        };

        if (isEditing) {
          return (
            <Select
              size="small"
              value={selectedStatus}
              onChange={(e) => handleStatusChange(e.target.value as ReviewStatus)}
              onBlur={() => setIsEditing(false)}
              autoFocus
              sx={{ width: '100%', fontSize: '0.875rem' }}
            >
              <MenuItem value="Pending">Pending</MenuItem>
              <MenuItem value="In Review">In Review</MenuItem>
              <MenuItem value="Approved">Approved</MenuItem>
              <MenuItem value="Rejected">Rejected</MenuItem>
            </Select>
          );
        }

        const status = (params.value as ReviewStatus) || 'Pending';
        return (
          <Box
            sx={{
              cursor: 'pointer',
              '&:hover': {
                backgroundColor: 'action.hover',
              },
            }}
            onClick={() => setIsEditing(true)}
          >
            <Chip
              label={status}
              size="small"
              color={getReviewStatusColor(status) as any}
              icon={getReviewStatusIcon(status)}
              sx={{ fontWeight: 'bold', fontSize: '0.75rem' }}
            />
          </Box>
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
      minWidth: 150,
      sortable: true,
      renderCell: (params: GridRenderCellParams) => {
        const [isEditing, setIsEditing] = useState(false);
        const [selectedStatus, setSelectedStatus] = useState<SLAStatus | ''>(
          (params.value as SLAStatus) || ''
        );

        const handleStatusChange = async (newStatus: SLAStatus | '') => {
          setSelectedStatus(newStatus);
          setIsEditing(false);
          // Optimistic update
          updateFindingOptimistically(params.row.id, { 
            sla_status: (newStatus || undefined) as SLAStatus | undefined
          });
          
          try {
            await axios.patch(`${API_BASE_URL}/findings/${params.row.id}`, { 
              sla_status: newStatus || null
            });
          } catch (error) {
            console.error('Error updating SLA status:', error);
            // Revert on error
            if (onRefresh) onRefresh();
          }
        };

        if (isEditing) {
          return (
            <Select
              size="small"
              value={selectedStatus}
              onChange={(e) => handleStatusChange(e.target.value as SLAStatus | '')}
              onBlur={() => setIsEditing(false)}
              autoFocus
              sx={{ width: '100%', fontSize: '0.875rem' }}
            >
              <MenuItem value="">Not Set</MenuItem>
              <MenuItem value="On Track">On Track</MenuItem>
              <MenuItem value="At Risk">At Risk</MenuItem>
              <MenuItem value="Overdue">Overdue</MenuItem>
            </Select>
          );
        }

        const status = params.value as SLAStatus;
        
        if (!status) {
          return (
            <Box
              sx={{
                cursor: 'pointer',
                '&:hover': {
                  backgroundColor: 'action.hover',
                },
              }}
              onClick={() => setIsEditing(true)}
            >
              <Chip
                label="Click to set"
                size="small"
                variant="outlined"
                sx={{ fontSize: '0.7rem' }}
              />
            </Box>
          );
        }
        
        return (
          <Box
            sx={{
              cursor: 'pointer',
              '&:hover': {
                backgroundColor: 'action.hover',
              },
            }}
            onClick={() => setIsEditing(true)}
          >
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
          </Box>
        );
      },
    },
    {
      field: 'issue_status',
      headerName: 'Issue Status',
      flex: 1,
      minWidth: 160,
      sortable: true,
      renderCell: (params: GridRenderCellParams) => {
        const [isEditing, setIsEditing] = useState(false);
        const [selectedStatus, setSelectedStatus] = useState<IssueStatus>(
          (params.value as IssueStatus) || 'Open'
        );

        const handleStatusChange = async (newStatus: IssueStatus) => {
          setSelectedStatus(newStatus);
          setIsEditing(false);
          // Optimistic update
          updateFindingOptimistically(params.row.id, { issue_status: newStatus });
          
          try {
            await IssueStatusService.updateIssueStatus(
              params.row.id,
              newStatus,
              undefined,
              'user@example.com'
            );
          } catch (error) {
            console.error('Error updating issue status:', error);
            // Revert on error
            if (onRefresh) onRefresh();
          }
        };

        if (isEditing) {
          return (
            <Select
              size="small"
              value={selectedStatus}
              onChange={(e) => handleStatusChange(e.target.value as IssueStatus)}
              onBlur={() => setIsEditing(false)}
              autoFocus
              sx={{ width: '100%', fontSize: '0.875rem' }}
            >
              <MenuItem value="Open">Open</MenuItem>
              <MenuItem value="Partially Closed">Partially Closed</MenuItem>
              <MenuItem value="Closed">Closed</MenuItem>
            </Select>
          );
        }

        const status = (params.value as IssueStatus) || 'Open';
        const getChipProps = () => {
          if (status === 'Open') {
            return { label: 'Open', color: 'error' as const };
          } else if (status === 'Partially Closed') {
            return { label: 'Partially Closed', color: 'warning' as const };
          } else {
            return { label: 'Closed', color: 'success' as const };
          }
        };

        return (
          <Box
            sx={{
              cursor: 'pointer',
              '&:hover': {
                backgroundColor: 'action.hover',
              },
            }}
            onClick={() => setIsEditing(true)}
          >
            <Chip
              {...getChipProps()}
              size="small"
              sx={{ fontWeight: 'bold', fontSize: '0.75rem' }}
            />
          </Box>
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
        ...(onAddSimilar && params.row.template_id ? [
          <GridActionsCellItem
            icon={<AddSimilarIcon />}
            label="Add Similar Finding"
            onClick={() => onAddSimilar(params.row.template_id)}
            showInMenu
          />
        ] : []),
        <GridActionsCellItem
          label="Export Finding"
          onClick={() => {/* TODO(future): Add single-finding export to Excel/CSV */}}
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
      {/* Bulk Actions Toolbar */}
      {selectedRows.length > 0 && (
        <Box
          sx={{
            p: 2,
            backgroundColor: theme.palette.mode === 'dark' ? 'rgba(144, 202, 249, 0.16)' : 'rgba(25, 118, 210, 0.08)',
            borderBottom: `1px solid ${theme.palette.divider}`,
            display: 'flex',
            alignItems: 'center',
            gap: 2,
            flexWrap: 'wrap',
          }}
        >
          <Typography variant="body1" sx={{ fontWeight: 'bold' }}>
            {selectedRows.length} finding{selectedRows.length > 1 ? 's' : ''} selected
          </Typography>

          <FormControl size="small" sx={{ minWidth: 150 }}>
            <InputLabel>Bulk Action</InputLabel>
            <Select
              value={bulkAction}
              label="Bulk Action"
              onChange={(e) => setBulkAction(e.target.value)}
            >
              <MenuItem value="risk_rating">Change Risk Rating</MenuItem>
              <MenuItem value="status">Change Status</MenuItem>
              <MenuItem value="export">Export Selected</MenuItem>
            </Select>
          </FormControl>

          {bulkAction === 'risk_rating' && (
            <FormControl size="small" sx={{ minWidth: 150 }}>
              <InputLabel>New Risk Rating</InputLabel>
              <Select
                value={bulkValue}
                label="New Risk Rating"
                onChange={(e) => setBulkValue(e.target.value)}
              >
                <MenuItem value="Critical">Critical</MenuItem>
                <MenuItem value="High">High</MenuItem>
                <MenuItem value="Medium">Medium</MenuItem>
                <MenuItem value="Low">Low</MenuItem>
                <MenuItem value="Informational">Informational</MenuItem>
              </Select>
            </FormControl>
          )}

          {bulkAction === 'status' && (
            <FormControl size="small" sx={{ minWidth: 150 }}>
              <InputLabel>New Status</InputLabel>
              <Select
                value={bulkValue}
                label="New Status"
                onChange={(e) => setBulkValue(e.target.value)}
              >
                <MenuItem value="Open">Open</MenuItem>
                <MenuItem value="Partially Closed">Partially Closed</MenuItem>
                <MenuItem value="Closed">Closed</MenuItem>
              </Select>
            </FormControl>
          )}

          {bulkAction === 'risk_rating' && bulkValue && (
            <Button
              variant="contained"
              size="small"
              startIcon={<BulkEditIcon />}
              onClick={() => handleBulkRiskRatingChange(bulkValue as RiskRating)}
            >
              Apply to {selectedRows.length}
            </Button>
          )}

          {bulkAction === 'status' && bulkValue && (
            <Button
              variant="contained"
              size="small"
              startIcon={<BulkEditIcon />}
              onClick={() => handleBulkStatusChange(bulkValue as IssueStatus)}
            >
              Apply to {selectedRows.length}
            </Button>
          )}

          {bulkAction === 'export' && (
            <Button
              variant="contained"
              size="small"
              startIcon={<ExportIcon />}
              onClick={handleBulkExport}
            >
              Export {selectedRows.length} as CSV
            </Button>
          )}

          <Button
            variant="outlined"
            size="small"
            onClick={() => {
              setSelectedRows([]);
              setBulkAction('');
              setBulkValue('');
            }}
          >
            Cancel
          </Button>
        </Box>
      )}

      <DataGrid
        rows={filteredFindings}
        columns={visibleColumns}
        pageSizeOptions={[10, 25, 50]}
        checkboxSelection
        disableRowSelectionOnClick
        autoHeight
        apiRef={apiRef}
        onRowSelectionModelChange={(newSelection) => {
          setSelectedRows(newSelection as any[]);
        }}
        initialState={{
          pagination: {
            paginationModel: { pageSize: 10, page: 0 },
          },
        }}
        slotProps={{
          toolbar: {
            onFilterChange: handleFilterChange,
          },
        }}
        slots={{
          toolbar: FindingsTableToolbar,
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