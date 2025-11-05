// frontend/src/components/VersionHistoryDialog.tsx

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  Chip,
  IconButton,
  Tooltip,
  Alert,
  CircularProgress,
  Divider,
  List,
  ListItem,
  Paper,
} from '@mui/material';
import {
  History as HistoryIcon,
  RestorePage as RestoreIcon,
  Person as PersonIcon,
  CalendarToday as CalendarIcon,
  Close as CloseIcon,
  ArrowRight as ArrowRightIcon,
} from '@mui/icons-material';

interface TemplateVersion {
  id: number;
  template_id: number;
  version_number: number;
  title: string;
  description: string;
  cwe_id?: string;
  cve_id?: string;
  cvss_score?: number;
  default_risk_rating?: string;
  changed_by?: string;
  change_reason?: string;
  created_at: string;
}

interface VersionHistoryDialogProps {
  open: boolean;
  onClose: () => void;
  templateId: number;
  templateTitle: string;
  onRollback?: () => void; // Callback after successful rollback
}

const VersionHistoryDialog: React.FC<VersionHistoryDialogProps> = ({
  open,
  onClose,
  templateId,
  templateTitle,
  onRollback,
}) => {
  const [versions, setVersions] = useState<TemplateVersion[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rollbackLoading, setRollbackLoading] = useState<number | null>(null);

  useEffect(() => {
    if (open) {
      fetchVersionHistory();
    }
  }, [open, templateId]);

  const fetchVersionHistory = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(
        `http://localhost:8000/vulnerability-templates/${templateId}/versions`
      );
      if (!response.ok) {
        throw new Error('Failed to fetch version history');
      }
      const data = await response.json();
      // Reverse to show newest first
      setVersions(data.reverse());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const handleRollback = async (versionNumber: number) => {
    if (
      !window.confirm(
        `Are you sure you want to rollback to version ${versionNumber}?\n\nThis will restore all template fields to their state at that version. A snapshot of the current state will be saved.`
      )
    ) {
      return;
    }

    setRollbackLoading(versionNumber);
    try {
      const response = await fetch(
        `http://localhost:8000/vulnerability-templates/${templateId}/rollback/${versionNumber}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            changed_by: 'frontend_user',
            change_reason: `Rolled back to version ${versionNumber} via UI`,
          }),
        }
      );

      if (!response.ok) {
        throw new Error('Failed to rollback template');
      }

      // Refresh version history
      await fetchVersionHistory();

      // Call parent callback to refresh template list
      if (onRollback) {
        onRollback();
      }

      alert(`Successfully rolled back to version ${versionNumber}!`);
    } catch (err) {
      alert(`Rollback failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setRollbackLoading(null);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getRiskColor = (rating?: string) => {
    switch (rating?.toLowerCase()) {
      case 'critical':
        return 'error';
      case 'high':
        return 'warning';
      case 'medium':
        return 'info';
      case 'low':
        return 'success';
      default:
        return 'default';
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Box display="flex" alignItems="center" justifyContent="space-between">
          <Box display="flex" alignItems="center" gap={1}>
            <HistoryIcon />
            <Typography variant="h6">Version History</Typography>
          </Box>
          <IconButton onClick={onClose} size="small">
            <CloseIcon />
          </IconButton>
        </Box>
        <Typography variant="subtitle2" color="text.secondary" sx={{ mt: 0.5 }}>
          {templateTitle}
        </Typography>
      </DialogTitle>

      <DialogContent dividers>
        {loading && (
          <Box display="flex" justifyContent="center" p={4}>
            <CircularProgress />
          </Box>
        )}

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {!loading && !error && versions.length === 0 && (
          <Alert severity="info">
            No version history available yet. Versions are created when you update a template.
          </Alert>
        )}

        {!loading && !error && versions.length > 0 && (
          <List sx={{ p: 0 }}>
            {versions.map((version, index) => {
              const isLatest = index === 0;
              const isRollback = version.change_reason?.toLowerCase().includes('rollback');

              return (
                <ListItem
                  key={version.id}
                  sx={{
                    display: 'block',
                    p: 0,
                    mb: 2,
                  }}
                >
                  <Paper
                    elevation={isLatest ? 3 : 1}
                    sx={{
                      border: isLatest ? '2px solid' : '1px solid',
                      borderColor: isLatest ? 'primary.main' : 'divider',
                      borderRadius: 2,
                      p: 2,
                      bgcolor: isLatest ? 'primary.50' : 'background.paper',
                      position: 'relative',
                    }}
                  >
                    {/* Left Border Indicator */}
                    <Box
                      sx={{
                        position: 'absolute',
                        left: 0,
                        top: 0,
                        bottom: 0,
                        width: 4,
                        bgcolor: isLatest
                          ? 'primary.main'
                          : isRollback
                          ? 'secondary.main'
                          : 'grey.300',
                        borderTopLeftRadius: 8,
                        borderBottomLeftRadius: 8,
                      }}
                    />

                    {/* Version Header */}
                    <Box display="flex" alignItems="center" justifyContent="space-between" mb={1}>
                      <Box display="flex" alignItems="center" gap={1}>
                        <Chip
                          label={`v${version.version_number}`}
                          size="small"
                          color={isLatest ? 'primary' : 'default'}
                        />
                        {isLatest && <Chip label="CURRENT" size="small" color="success" />}
                        <Typography variant="caption" color="text.secondary">
                          {formatDate(version.created_at)}
                        </Typography>
                      </Box>

                      {!isLatest && (
                        <Tooltip title="Rollback to this version">
                          <IconButton
                            size="small"
                            onClick={() => handleRollback(version.version_number)}
                            disabled={rollbackLoading !== null}
                            color="primary"
                          >
                            {rollbackLoading === version.version_number ? (
                              <CircularProgress size={20} />
                            ) : (
                              <RestoreIcon fontSize="small" />
                            )}
                          </IconButton>
                        </Tooltip>
                      )}
                    </Box>

                    {/* Title */}
                    <Typography variant="subtitle1" fontWeight={500} gutterBottom>
                      {version.title}
                    </Typography>

                    {/* Description Preview */}
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
                      {version.description.substring(0, 150)}
                      {version.description.length > 150 ? '...' : ''}
                    </Typography>

                    <Divider sx={{ my: 1 }} />

                    {/* Metadata Grid */}
                    <Box display="grid" gridTemplateColumns="1fr 1fr" gap={1} mb={1}>
                      {version.cwe_id && (
                        <Box>
                          <Typography variant="caption" color="text.secondary">
                            CWE
                          </Typography>
                          <Typography variant="body2">{version.cwe_id}</Typography>
                        </Box>
                      )}
                      {version.cve_id && (
                        <Box>
                          <Typography variant="caption" color="text.secondary">
                            CVE
                          </Typography>
                          <Typography variant="body2">{version.cve_id}</Typography>
                        </Box>
                      )}
                      {version.cvss_score !== null && version.cvss_score !== undefined && (
                        <Box>
                          <Typography variant="caption" color="text.secondary">
                            CVSS Score
                          </Typography>
                          <Typography variant="body2">{version.cvss_score.toFixed(1)}</Typography>
                        </Box>
                      )}
                      {version.default_risk_rating && (
                        <Box>
                          <Typography variant="caption" color="text.secondary">
                            Risk Rating
                          </Typography>
                          <Chip
                            label={version.default_risk_rating}
                            size="small"
                            color={getRiskColor(version.default_risk_rating) as any}
                            sx={{ mt: 0.5 }}
                          />
                        </Box>
                      )}
                    </Box>

                    {/* Change Metadata */}
                    <Box display="flex" flexDirection="column" gap={0.5} mt={1.5}>
                      {version.changed_by && (
                        <Box display="flex" alignItems="center" gap={0.5}>
                          <PersonIcon fontSize="small" color="action" />
                          <Typography variant="caption" color="text.secondary">
                            Changed by: <strong>{version.changed_by}</strong>
                          </Typography>
                        </Box>
                      )}
                      {version.change_reason && (
                        <Box display="flex" alignItems="center" gap={0.5}>
                          <CalendarIcon fontSize="small" color="action" />
                          <Typography variant="caption" color="text.secondary">
                            Reason: <em>{version.change_reason}</em>
                          </Typography>
                        </Box>
                      )}
                    </Box>
                  </Paper>
                </ListItem>
              );
            })}
          </List>
        )}
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
};

export default VersionHistoryDialog;
