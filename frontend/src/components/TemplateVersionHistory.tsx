import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  IconButton,
  Typography,
  Box,
  Alert,
  CircularProgress,
  Chip,
  TextField,
  Divider,
  Stack,
  Tooltip,
} from '@mui/material';
import {
  History as HistoryIcon,
  Restore as RestoreIcon,
  SaveAlt as SaveIcon,
  CheckCircle as CheckCircleIcon,
  Description as DescriptionIcon,
  Storage as StorageIcon,
} from '@mui/icons-material';
import axios from 'axios';
import { format } from 'date-fns';

interface TemplateVersion {
  id: number;
  template_id: number;
  version_number: number;
  name: string;
  description: string;
  template_type: string;
  change_description: string | null;
  file_size_bytes: number;
  file_hash: string;
  version_file_path: string;
  created_at: string;
  is_current: boolean;
}

interface TemplateVersionHistoryProps {
  open: boolean;
  onClose: () => void;
  templateId: number;
  templateName: string;
  onVersionRestored?: () => void;
}

const TemplateVersionHistory: React.FC<TemplateVersionHistoryProps> = ({
  open,
  onClose,
  templateId,
  templateName,
  onVersionRestored,
}) => {
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [restoring, setRestoring] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [versions, setVersions] = useState<TemplateVersion[]>([]);
  const [changeDescription, setChangeDescription] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);

  useEffect(() => {
    if (open) {
      fetchVersions();
    }
  }, [open, templateId]);

  const fetchVersions = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await axios.get(`/api/templates/${templateId}/versions`);
      setVersions(response.data);
    } catch (err: any) {
      console.error('Error fetching versions:', err);
      setError(err.response?.data?.detail || 'Failed to load version history');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateVersion = async () => {
    if (!changeDescription.trim()) {
      setError('Please provide a change description');
      return;
    }

    setCreating(true);
    setError(null);
    
    try {
      await axios.post(`/api/templates/${templateId}/versions`, {
        change_description: changeDescription.trim(),
      });
      
      setSuccess('Version created successfully!');
      setChangeDescription('');
      setShowCreateForm(false);
      await fetchVersions();
    } catch (err: any) {
      console.error('Error creating version:', err);
      setError(err.response?.data?.detail || 'Failed to create version');
    } finally {
      setCreating(false);
    }
  };

  const handleRestoreVersion = async (versionId: number, versionNumber: number) => {
    if (!window.confirm(`Are you sure you want to restore to version ${versionNumber}? The current version will be backed up automatically.`)) {
      return;
    }

    setRestoring(versionId);
    setError(null);
    
    try {
      await axios.post(`/api/templates/${templateId}/versions/${versionId}/restore`);
      
      setSuccess(`Successfully restored to version ${versionNumber}!`);
      await fetchVersions();
      
      if (onVersionRestored) {
        onVersionRestored();
      }
    } catch (err: any) {
      console.error('Error restoring version:', err);
      setError(err.response?.data?.detail || 'Failed to restore version');
    } finally {
      setRestoring(null);
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const formatDate = (dateString: string): string => {
    try {
      return format(new Date(dateString), 'MMM d, yyyy h:mm a');
    } catch {
      return dateString;
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Box display="flex" alignItems="center" gap={1}>
          <HistoryIcon />
          <Box>
            <Typography variant="h6">Version History</Typography>
            <Typography variant="body2" color="text.secondary">
              {templateName}
            </Typography>
          </Box>
        </Box>
      </DialogTitle>
      
      <DialogContent>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}
        
        {success && (
          <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess(null)}>
            {success}
          </Alert>
        )}

        {/* Create New Version Section */}
        <Box sx={{ mb: 3 }}>
          {!showCreateForm ? (
            <Button
              variant="outlined"
              startIcon={<SaveIcon />}
              onClick={() => setShowCreateForm(true)}
              fullWidth
            >
              Create New Version
            </Button>
          ) : (
            <Box sx={{ p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
              <Typography variant="subtitle2" gutterBottom>
                Create Version Snapshot
              </Typography>
              <TextField
                fullWidth
                multiline
                rows={2}
                label="Change Description"
                placeholder="Describe what changed in this version..."
                value={changeDescription}
                onChange={(e) => setChangeDescription(e.target.value)}
                sx={{ mt: 1, mb: 2 }}
              />
              <Stack direction="row" spacing={1}>
                <Button
                  variant="contained"
                  startIcon={<SaveIcon />}
                  onClick={handleCreateVersion}
                  disabled={creating || !changeDescription.trim()}
                >
                  {creating ? 'Creating...' : 'Save Version'}
                </Button>
                <Button
                  variant="outlined"
                  onClick={() => {
                    setShowCreateForm(false);
                    setChangeDescription('');
                  }}
                  disabled={creating}
                >
                  Cancel
                </Button>
              </Stack>
            </Box>
          )}
        </Box>

        <Divider sx={{ my: 2 }} />

        {/* Version List */}
        {loading ? (
          <Box display="flex" justifyContent="center" alignItems="center" py={4}>
            <CircularProgress />
          </Box>
        ) : versions.length === 0 ? (
          <Alert severity="info">
            No versions yet. Create your first version snapshot to track changes over time.
          </Alert>
        ) : (
          <List>
            {versions.map((version, index) => (
              <React.Fragment key={version.id}>
                <ListItem
                  sx={{
                    flexDirection: 'column',
                    alignItems: 'stretch',
                    bgcolor: version.is_current ? 'action.selected' : 'transparent',
                    borderRadius: 1,
                    mb: 1,
                  }}
                >
                  <Box display="flex" alignItems="flex-start" width="100%">
                    <ListItemIcon sx={{ mt: 1 }}>
                      <DescriptionIcon />
                    </ListItemIcon>
                    
                    <ListItemText
                      primary={
                        <Box display="flex" alignItems="center" gap={1}>
                          <Typography variant="subtitle1" fontWeight="bold">
                            Version {version.version_number}
                          </Typography>
                          {version.is_current && (
                            <Chip
                              label="Current"
                              size="small"
                              color="primary"
                              icon={<CheckCircleIcon />}
                            />
                          )}
                        </Box>
                      }
                      secondary={
                        <Stack spacing={0.5} sx={{ mt: 1 }}>
                          {version.change_description && (
                            <Typography variant="body2" color="text.primary">
                              {version.change_description}
                            </Typography>
                          )}
                          <Typography variant="caption" color="text.secondary">
                            Created {formatDate(version.created_at)}
                          </Typography>
                          <Box display="flex" alignItems="center" gap={2}>
                            <Chip
                              icon={<StorageIcon />}
                              label={formatFileSize(version.file_size_bytes)}
                              size="small"
                              variant="outlined"
                            />
                            <Tooltip title={version.file_hash}>
                              <Typography variant="caption" color="text.secondary">
                                Hash: {version.file_hash.substring(0, 12)}...
                              </Typography>
                            </Tooltip>
                          </Box>
                        </Stack>
                      }
                    />

                    {!version.is_current && (
                      <Tooltip title="Restore this version">
                        <span>
                          <IconButton
                            color="primary"
                            onClick={() => handleRestoreVersion(version.id, version.version_number)}
                            disabled={restoring === version.id}
                          >
                            {restoring === version.id ? (
                              <CircularProgress size={24} />
                            ) : (
                              <RestoreIcon />
                            )}
                          </IconButton>
                        </span>
                      </Tooltip>
                    )}
                  </Box>
                </ListItem>
                {index < versions.length - 1 && <Divider />}
              </React.Fragment>
            ))}
          </List>
        )}
      </DialogContent>
      
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
};

export default TemplateVersionHistory;
