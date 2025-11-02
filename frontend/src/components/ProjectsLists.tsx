import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Link, useNavigate } from 'react-router-dom';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  CircularProgress,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  TextField,
  Tab,
  Tabs,
  IconButton,
  Menu,
  MenuItem,
  Tooltip,
  Chip,
  Grid,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import AddIcon from '@mui/icons-material/Add';
import DownloadIcon from '@mui/icons-material/Download';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import ArchiveIcon from '@mui/icons-material/Archive';
import UnarchiveIcon from '@mui/icons-material/Unarchive';
import AssessmentIcon from '@mui/icons-material/Assessment';
import { useNotification } from '../contexts/NotificationContext';
import { getErrorMessage, retryWithBackoff } from '../utils/errorHandler';
import { ProjectCardSkeleton } from './LoadingSkeletons';

// Use relative path for API calls - proxied through Nginx in Docker
const API_BASE_URL = process.env.REACT_APP_API_URL || '/api';

interface RiskSummary {
  Critical: number;
  High: number;
  Medium: number;
  Low: number;
  Informational: number;
}

interface Project {
  id: string | number;
  name: string;
  consultant_name?: string;
  is_archived?: boolean;
  archived_at?: string;
  total_findings?: number;
  risk_summary?: RiskSummary;
  critical_high_count?: number;
}

const ProjectsLists: React.FC = () => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tabValue, setTabValue] = useState(0);
  const theme = useTheme();
  const navigate = useNavigate();
  const { showSuccess, showError } = useNotification();

  // Dialog states
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [createFormData, setCreateFormData] = useState({ name: '', consultant_name: '' });
  const [renameDialogOpen, setRenameDialogOpen] = useState(false);
  const [renameProjectId, setRenameProjectId] = useState<string | number | null>(null);
  const [renameFormData, setRenameFormData] = useState({ name: '', consultant_name: '' });
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleteProjectId, setDeleteProjectId] = useState<string | number | null>(null);
  const [deleteProjectName, setDeleteProjectName] = useState('');
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedProjectId, setSelectedProjectId] = useState<string | number | null>(null);

  // Inline edit states
  const [editingProjectId, setEditingProjectId] = useState<string | number | null>(null);
  const [editFormData, setEditFormData] = useState({ name: '', consultant_name: '' });

  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await retryWithBackoff(async () => {
        return await axios.get(`${API_BASE_URL}/projects/stats/all`);
      }, 3);
      setProjects(response.data);
    } catch (err: any) {
      const errorMessage = getErrorMessage(err);
      console.error('Failed to fetch projects:', err);
      setError(errorMessage);
      showError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Create Project
  const handleCreateProject = async () => {
    if (!createFormData.name.trim()) {
      showError('Project name is required');
      return;
    }
    try {
      await axios.post(`${API_BASE_URL}/projects/`, {
        name: createFormData.name,
        consultant_name: createFormData.consultant_name || null,
      });
      setCreateDialogOpen(false);
      setCreateFormData({ name: '', consultant_name: '' });
      showSuccess(`Project "${createFormData.name}" created successfully`);
      fetchProjects();
    } catch (err: any) {
      console.error('Failed to create project:', err);
      showError(getErrorMessage(err));
    }
  };

  // Rename Project
  const handleOpenRenameDialog = (project: Project) => {
    setRenameProjectId(project.id);
    setRenameFormData({
      name: project.name,
      consultant_name: project.consultant_name || '',
    });
    setRenameDialogOpen(true);
  };

  const handleRenameProject = async () => {
    if (!renameFormData.name.trim()) {
      showError('Project name is required');
      return;
    }
    try {
      await axios.put(`${API_BASE_URL}/projects/${renameProjectId}`, {
        name: renameFormData.name,
        consultant_name: renameFormData.consultant_name || null,
        is_archived: false,
        archived_at: null,
      });
      setRenameDialogOpen(false);
      showSuccess('Project renamed successfully');
      fetchProjects();
    } catch (err: any) {
      console.error('Failed to rename project:', err);
      showError(getErrorMessage(err));
    }
  };

  // Delete Project
  const handleOpenDeleteDialog = (project: Project) => {
    setDeleteProjectId(project.id);
    setDeleteProjectName(project.name);
    setDeleteConfirmOpen(true);
  };

  const handleDeleteProject = async () => {
    try {
      await axios.delete(`${API_BASE_URL}/projects/${deleteProjectId}`);
      setDeleteConfirmOpen(false);
      showSuccess(`Project "${deleteProjectName}" deleted successfully`);
      fetchProjects();
    } catch (err: any) {
      console.error('Failed to delete project:', err);
      showError(getErrorMessage(err));
    }
  };

  // Archive/Unarchive Project
  const handleToggleArchive = async (project: Project) => {
    try {
      const action = !project.is_archived ? 'archived' : 'unarchived';
      await axios.put(`${API_BASE_URL}/projects/${project.id}`, {
        name: project.name,
        consultant_name: project.consultant_name || null,
        is_archived: !project.is_archived,
        archived_at: !project.is_archived ? new Date().toISOString() : null,
      });
      showSuccess(`Project "${project.name}" ${action} successfully`);
      fetchProjects();
    } catch (err: any) {
      console.error('Failed to update archive status:', err);
      showError(getErrorMessage(err));
    }
  };

  // Export Project
  const handleExportProject = (project: Project) => {
    const projectData = {
      id: project.id,
      name: project.name,
      consultant_name: project.consultant_name,
      exported_at: new Date().toISOString(),
    };
    const dataStr = JSON.stringify(projectData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${project.name.replace(/\s+/g, '_')}_export.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, projectId: string | number) => {
    setAnchorEl(event.currentTarget);
    setSelectedProjectId(projectId);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedProjectId(null);
  };

  const handleMenuAction = (action: () => void) => {
    action();
    handleMenuClose();
  };

  // Inline Edit Handlers
  const handleStartEdit = (project: Project) => {
    setEditingProjectId(project.id);
    setEditFormData({
      name: project.name,
      consultant_name: project.consultant_name || '',
    });
  };

  const handleSaveEdit = async () => {
    if (!editFormData.name.trim()) {
      showError('Project name is required');
      return;
    }
    try {
      await axios.put(`${API_BASE_URL}/projects/${editingProjectId}`, {
        name: editFormData.name,
        consultant_name: editFormData.consultant_name || null,
        is_archived: false,
        archived_at: null,
      });
      setEditingProjectId(null);
      showSuccess('Project updated successfully');
      fetchProjects();
    } catch (err: any) {
      console.error('Failed to save project:', err);
      showError(getErrorMessage(err));
    }
  };

  const handleCancelEdit = () => {
    setEditingProjectId(null);
    setEditFormData({ name: '', consultant_name: '' });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSaveEdit();
    } else if (e.key === 'Escape') {
      handleCancelEdit();
    }
  };

  // Filter projects by archive status
  const activeProjects = projects.filter((p) => !p.is_archived);
  const archivedProjects = projects.filter((p) => p.is_archived);

  const displayProjects = tabValue === 0 ? activeProjects : archivedProjects;

  if (loading) {
    return (
      <Box sx={{ p: 3 }} role="main" aria-busy="true" aria-label="Loading projects">
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h4" component="h1">Assessment Projects</Typography>
          <Button 
            variant="contained" 
            color="primary" 
            startIcon={<AddIcon />} 
            disabled
            aria-label="Create new project (loading)"
          >
            Create Project
          </Button>
        </Box>
        <Grid container spacing={2}>
          {[1, 2, 3].map((i) => (
            <Grid item xs={12} key={i}>
              <ProjectCardSkeleton />
            </Grid>
          ))}
        </Grid>
      </Box>
    );
  }
  
  if (error) {
    return (
      <Box sx={{ p: 3 }} role="main">
        <Alert severity="error" sx={{ mb: 2 }} role="alert">{error}</Alert>
        <Button 
          variant="contained" 
          onClick={fetchProjects}
          aria-label="Retry loading projects"
        >
          Retry
        </Button>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }} role="main">
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1">Assessment Projects</Typography>
        <Button
          variant="contained"
          color="primary"
          startIcon={<AddIcon />}
          onClick={() => setCreateDialogOpen(true)}
          aria-label="Create new project"
        >
          Create Project
        </Button>
      </Box>

      {/* Tabs for Active/Archived */}
      {projects.length > 0 && (
        <Tabs 
          value={tabValue} 
          onChange={(e, newValue) => setTabValue(newValue)} 
          sx={{ mb: 2 }}
          aria-label="Project status tabs"
        >
          <Tab 
            label={`Active (${activeProjects.length})`} 
            id="tab-active"
            aria-controls="tabpanel-active"
          />
          <Tab 
            label={`Archived (${archivedProjects.length})`}
            id="tab-archived"
            aria-controls="tabpanel-archived"
          />
        </Tabs>
      )}

      {displayProjects.length === 0 ? (
        <Alert severity="info">
          {tabValue === 0
            ? 'No active projects found. Create one to get started!'
            : 'No archived projects.'}
        </Alert>
      ) : (
        displayProjects.map((project) => (
          <Card
            key={project.id}
            sx={{
              mb: 2,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              opacity: project.is_archived ? 0.7 : 1,
            }}
          >
            <CardContent sx={{ flex: 1 }}>
              {editingProjectId === project.id ? (
                // Inline Edit Mode
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                  <TextField
                    autoFocus
                    label="Project Name"
                    size="small"
                    fullWidth
                    value={editFormData.name}
                    onChange={(e) =>
                      setEditFormData({ ...editFormData, name: e.target.value })
                    }
                    onKeyDown={handleKeyDown}
                  />
                  <TextField
                    label="Consultant Name"
                    size="small"
                    fullWidth
                    value={editFormData.consultant_name}
                    onChange={(e) =>
                      setEditFormData({ ...editFormData, consultant_name: e.target.value })
                    }
                    onKeyDown={handleKeyDown}
                  />
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <Button
                      size="small"
                      variant="contained"
                      color="primary"
                      onClick={handleSaveEdit}
                    >
                      Save
                    </Button>
                    <Button
                      size="small"
                      variant="outlined"
                      onClick={handleCancelEdit}
                    >
                      Cancel
                    </Button>
                  </Box>
                </Box>
              ) : (
                // Display Mode - Click to navigate to dashboard
                <>
                  <Typography
                    variant="h6"
                    onClick={() => !project.is_archived && navigate(`/projects/${project.id}`)}
                    sx={{
                      cursor: project.is_archived ? 'default' : 'pointer',
                      '&:hover': project.is_archived ? {} : {
                        color: 'primary.main',
                      },
                    }}
                  >
                    {project.name}
                  </Typography>
                  <Typography
                    variant="body2"
                    color="textSecondary"
                    sx={{ mb: 1 }}
                  >
                    Consultant: {project.consultant_name || 'N/A'}
                  </Typography>
                  
                  {/* Statistics Section */}
                  <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center', mt: 1 }}>
                    {/* Total Findings */}
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <AssessmentIcon fontSize="small" color="action" />
                      <Typography variant="body2" color="textSecondary">
                        {project.total_findings || 0} findings
                      </Typography>
                    </Box>
                    
                    {/* Critical/High Count */}
                    {project.critical_high_count! > 0 && (
                      <Chip
                        label={`${project.critical_high_count} Critical/High`}
                        size="small"
                        color="error"
                        variant="outlined"
                      />
                    )}
                    
                    {/* Risk Summary Chips */}
                    {project.risk_summary && (
                      <>
                        {project.risk_summary.Critical > 0 && (
                          <Chip
                            label={`${project.risk_summary.Critical} Critical`}
                            size="small"
                            sx={{ bgcolor: '#d32f2f', color: 'white' }}
                          />
                        )}
                        {project.risk_summary.High > 0 && (
                          <Chip
                            label={`${project.risk_summary.High} High`}
                            size="small"
                            sx={{ bgcolor: '#f57c00', color: 'white' }}
                          />
                        )}
                        {project.risk_summary.Medium > 0 && (
                          <Chip
                            label={`${project.risk_summary.Medium} Medium`}
                            size="small"
                            sx={{ bgcolor: '#fbc02d', color: 'black' }}
                          />
                        )}
                        {project.risk_summary.Low > 0 && (
                          <Chip
                            label={`${project.risk_summary.Low} Low`}
                            size="small"
                            sx={{ bgcolor: '#689f38', color: 'white' }}
                          />
                        )}
                      </>
                    )}
                  </Box>
                  
                  {project.is_archived && (
                    <Typography variant="caption" color="textSecondary" sx={{ display: 'block', mt: 1 }}>
                      Archived: {new Date(project.archived_at!).toLocaleDateString()}
                    </Typography>
                  )}
                </>
              )}
            </CardContent>
            <Box sx={{ p: 2, display: 'flex', gap: 1, alignItems: 'center' }}>
              <Button
                component={Link}
                to={`/projects/${project.id}`}
                variant="contained"
                color="primary"
                disabled={project.is_archived}
                aria-label={`View dashboard for ${project.name}`}
              >
                View Dashboard
              </Button>
              <Tooltip title="More actions">
                <IconButton
                  size="small"
                  onClick={(e) => handleMenuOpen(e, project.id)}
                  aria-label={`More actions for ${project.name}`}
                  aria-haspopup="true"
                >
                  <MoreVertIcon />
                </IconButton>
              </Tooltip>
            </Box>
          </Card>
        ))
      )}

      {/* Menu for quick actions */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
        aria-label="Project actions menu"
      >
        {selectedProjectId && (
          <>
            <MenuItem
              onClick={() => {
                const project = projects.find((p) => p.id === selectedProjectId);
                if (project) handleOpenRenameDialog(project);
                handleMenuClose();
              }}
            >
              <EditIcon sx={{ mr: 1 }} fontSize="small" />
              Rename
            </MenuItem>
            <MenuItem
              onClick={() => {
                const project = projects.find((p) => p.id === selectedProjectId);
                if (project) handleExportProject(project);
                handleMenuClose();
              }}
            >
              <DownloadIcon sx={{ mr: 1 }} fontSize="small" />
              Export
            </MenuItem>
            <MenuItem
              onClick={() => {
                const project = projects.find((p) => p.id === selectedProjectId);
                if (project) handleToggleArchive(project);
                handleMenuClose();
              }}
            >
              {projects.find((p) => p.id === selectedProjectId)?.is_archived ? (
                <>
                  <UnarchiveIcon sx={{ mr: 1 }} fontSize="small" />
                  Unarchive
                </>
              ) : (
                <>
                  <ArchiveIcon sx={{ mr: 1 }} fontSize="small" />
                  Archive
                </>
              )}
            </MenuItem>
            <MenuItem
              onClick={() => {
                const project = projects.find((p) => p.id === selectedProjectId);
                if (project) handleOpenDeleteDialog(project);
                handleMenuClose();
              }}
              sx={{ color: 'error.main' }}
            >
              <DeleteIcon sx={{ mr: 1 }} fontSize="small" />
              Delete
            </MenuItem>
          </>
        )}
      </Menu>

      {/* Create Project Dialog */}
      <Dialog 
        open={createDialogOpen} 
        onClose={() => setCreateDialogOpen(false)}
        aria-labelledby="create-project-dialog-title"
        aria-describedby="create-project-dialog-description"
      >
        <DialogTitle id="create-project-dialog-title">Create New Project</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Project Name"
            fullWidth
            variant="outlined"
            value={createFormData.name}
            onChange={(e) =>
              setCreateFormData({ ...createFormData, name: e.target.value })
            }
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleCreateProject();
              }
            }}
            inputProps={{
              'aria-label': 'Project name',
              'aria-required': 'true',
            }}
            sx={{ mt: 2 }}
          />
          <TextField
            margin="dense"
            label="Consultant Name (optional)"
            fullWidth
            variant="outlined"
            value={createFormData.consultant_name}
            onChange={(e) =>
              setCreateFormData({ ...createFormData, consultant_name: e.target.value })
            }
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleCreateProject();
              }
            }}
            inputProps={{
              'aria-label': 'Consultant name (optional)',
            }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateDialogOpen(false)} aria-label="Cancel project creation">
            Cancel
          </Button>
          <Button 
            onClick={handleCreateProject} 
            variant="contained" 
            color="primary"
            aria-label="Create new project"
          >
            Create
          </Button>
        </DialogActions>
      </Dialog>

      {/* Rename Project Dialog */}
      <Dialog 
        open={renameDialogOpen} 
        onClose={() => setRenameDialogOpen(false)}
        aria-labelledby="rename-project-dialog-title"
      >
        <DialogTitle id="rename-project-dialog-title">Rename Project</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Project Name"
            fullWidth
            variant="outlined"
            value={renameFormData.name}
            onChange={(e) =>
              setRenameFormData({ ...renameFormData, name: e.target.value })
            }
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleRenameProject();
              }
            }}
            inputProps={{
              'aria-label': 'Project name',
              'aria-required': 'true',
            }}
            sx={{ mt: 2 }}
          />
          <TextField
            margin="dense"
            label="Consultant Name"
            fullWidth
            variant="outlined"
            value={renameFormData.consultant_name}
            onChange={(e) =>
              setRenameFormData({ ...renameFormData, consultant_name: e.target.value })
            }
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleRenameProject();
              }
            }}
            inputProps={{
              'aria-label': 'Consultant name',
            }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRenameDialogOpen(false)} aria-label="Cancel rename">
            Cancel
          </Button>
          <Button 
            onClick={handleRenameProject} 
            variant="contained" 
            color="primary"
            aria-label="Save project changes"
          >
            Save
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog 
        open={deleteConfirmOpen} 
        onClose={() => setDeleteConfirmOpen(false)}
        aria-labelledby="delete-project-dialog-title"
        aria-describedby="delete-project-dialog-description"
      >
        <DialogTitle id="delete-project-dialog-title">Delete Project</DialogTitle>
        <DialogContent>
          <DialogContentText id="delete-project-dialog-description">
            Are you sure you want to delete "{deleteProjectName}"? This action cannot be
            undone. All findings and instances will be permanently deleted.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={() => setDeleteConfirmOpen(false)}
            aria-label="Cancel deletion"
          >
            Cancel
          </Button>
          <Button
            onClick={handleDeleteProject}
            variant="contained"
            color="error"
            aria-label={`Delete project ${deleteProjectName}`}
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ProjectsLists;
