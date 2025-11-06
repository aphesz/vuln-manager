import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  IconButton,
  Typography,
  Box,
  CircularProgress,
  Alert,
  Tooltip,
} from '@mui/material';
import {
  Delete as DeleteIcon,
  Refresh as RefreshIcon,
  History as HistoryIcon,
} from '@mui/icons-material';
import axios from 'axios';

interface ImportHistoryRecord {
  id: number;
  source: string;
  import_type: string;
  file_name: string | null;
  file_size: number | null;
  templates_created: number;
  templates_updated: number;
  templates_skipped: number;
  errors: number;
  total_parsed: number;
  success_rate: number;
  imported_by: string;
  imported_at: string;
  duration_seconds: number | null;
  error_details_parsed: string[] | null;
}

interface ImportHistoryDialogProps {
  open: boolean;
  onClose: () => void;
}

const ImportHistoryDialog: React.FC<ImportHistoryDialogProps> = ({ open, onClose }) => {
  const [history, setHistory] = useState<ImportHistoryRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchHistory = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await axios.get('/api/import-history', {
        params: { limit: 100 },
      });
      setHistory(response.data);
    } catch (err: any) {
      console.error('Failed to fetch import history:', err);
      setError(err.response?.data?.detail || 'Failed to load import history');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
      fetchHistory();
    }
  }, [open]);

  const handleDelete = async (id: number) => {
    if (!window.confirm('Delete this import history record? This will not affect imported templates.')) {
      return;
    }

    try {
      await axios.delete(`/api/import-history/${id}`);
      // Refresh history after deletion
      fetchHistory();
    } catch (err: any) {
      console.error('Failed to delete import history:', err);
      alert(err.response?.data?.detail || 'Failed to delete import history record');
    }
  };

  const getSourceChipColor = (source: string) => {
    switch (source) {
      case 'cwe':
        return 'primary';
      case 'nvd':
        return 'secondary';
      case 'manual':
        return 'default';
      default:
        return 'default';
    }
  };

  const getSuccessRateColor = (rate: number) => {
    if (rate >= 90) return 'success';
    if (rate >= 70) return 'warning';
    return 'error';
  };

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return 'N/A';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString();
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth>
      <DialogTitle>
        <Box display="flex" alignItems="center" justifyContent="space-between">
          <Box display="flex" alignItems="center" gap={1}>
            <HistoryIcon />
            <span>Import History</span>
          </Box>
          <Tooltip title="Refresh">
            <IconButton onClick={fetchHistory} disabled={loading} size="small">
              <RefreshIcon />
            </IconButton>
          </Tooltip>
        </Box>
      </DialogTitle>

      <DialogContent>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {loading ? (
          <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
            <CircularProgress />
          </Box>
        ) : history.length === 0 ? (
          <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
            <Typography variant="body1" color="text.secondary">
              No import history records found. Import a CWE or CVE database to see history.
            </Typography>
          </Box>
        ) : (
          <TableContainer component={Paper} variant="outlined">
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Date/Time</TableCell>
                  <TableCell>Source</TableCell>
                  <TableCell>Type</TableCell>
                  <TableCell>File</TableCell>
                  <TableCell align="right">Created</TableCell>
                  <TableCell align="right">Updated</TableCell>
                  <TableCell align="right">Skipped</TableCell>
                  <TableCell align="right">Errors</TableCell>
                  <TableCell align="right">Total</TableCell>
                  <TableCell align="right">Success Rate</TableCell>
                  <TableCell>Imported By</TableCell>
                  <TableCell align="center">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {history.map((record) => (
                  <TableRow key={record.id} hover>
                    <TableCell>
                      <Typography variant="body2" noWrap>
                        {formatDate(record.imported_at)}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={record.source.toUpperCase()}
                        color={getSourceChipColor(record.source)}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" noWrap>
                        {record.import_type.replace('_', ' ').toUpperCase()}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Tooltip title={`Size: ${formatFileSize(record.file_size)}`}>
                        <Typography variant="body2" noWrap sx={{ maxWidth: 150 }}>
                          {record.file_name || 'N/A'}
                        </Typography>
                      </Tooltip>
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="body2" color="success.main" fontWeight="medium">
                        {record.templates_created}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="body2" color="info.main">
                        {record.templates_updated}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="body2" color="text.secondary">
                        {record.templates_skipped}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Typography
                        variant="body2"
                        color={record.errors > 0 ? 'error.main' : 'text.secondary'}
                      >
                        {record.errors}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="body2" fontWeight="medium">
                        {record.total_parsed}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Chip
                        label={`${record.success_rate}%`}
                        color={getSuccessRateColor(record.success_rate)}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">{record.imported_by}</Typography>
                    </TableCell>
                    <TableCell align="center">
                      <Tooltip title="Delete history record">
                        <IconButton
                          size="small"
                          onClick={() => handleDelete(record.id)}
                          color="error"
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}

        {!loading && history.length > 0 && (
          <Box mt={2}>
            <Typography variant="caption" color="text.secondary">
              Total records: {history.length} | Showing last 100 imports
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

export default ImportHistoryDialog;
