import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  LinearProgress,
  Alert,
  AlertTitle,
  FormControlLabel,
  Checkbox,
  Stack,
  Chip,
  Link,
} from '@mui/material';
import {
  CloudUpload as CloudUploadIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Info as InfoIcon,
} from '@mui/icons-material';

interface ImportStatistics {
  total_parsed: number;
  templates_created: number;
  templates_skipped: number;
  errors: number;
  success_rate: number;
  imported_at: string;
}

interface CWEImportDialogProps {
  open: boolean;
  onClose: () => void;
  onImportComplete?: () => void;
}

const CWEImportDialog: React.FC<CWEImportDialogProps> = ({
  open,
  onClose,
  onImportComplete,
}) => {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [overwriteExisting, setOverwriteExisting] = useState(false);
  const [statistics, setStatistics] = useState<ImportStatistics | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      const selectedFile = event.target.files[0];
      
      // Validate file type
      if (!selectedFile.name.endsWith('.xml')) {
        setError('Please select an XML file (.xml extension)');
        setFile(null);
        return;
      }
      
      // Validate file size (50 MB limit)
      if (selectedFile.size > 50 * 1024 * 1024) {
        setError('File too large. Maximum size is 50 MB.');
        setFile(null);
        return;
      }
      
      setFile(selectedFile);
      setError(null);
    }
  };

  const handleImport = async () => {
    if (!file) {
      setError('Please select a CWE XML file first');
      return;
    }

    setLoading(true);
    setError(null);
    setStatistics(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch(
        `/api/vulnerability-templates/import-cwe-database?overwrite_existing=${overwriteExisting}`,
        {
          method: 'POST',
          body: formData,
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || `Import failed: ${response.statusText}`);
      }

      const stats: ImportStatistics = await response.json();
      setStatistics(stats);
      
      // Call parent callback if provided
      if (onImportComplete) {
        onImportComplete();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to import CWE database');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      setFile(null);
      setStatistics(null);
      setError(null);
      setOverwriteExisting(false);
      onClose();
    }
  };

  const handleDownloadCWE = () => {
    window.open('https://cwe.mitre.org/data/downloads.html', '_blank');
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Stack direction="row" alignItems="center" spacing={1}>
          <CloudUploadIcon />
          <Typography variant="h6">Import CWE Database</Typography>
        </Stack>
      </DialogTitle>

      <DialogContent>
        <Stack spacing={3}>
          {/* Instructions */}
          <Alert severity="info" icon={<InfoIcon />}>
            <AlertTitle>Download CWE Database from MITRE</AlertTitle>
            <Typography variant="body2" sx={{ mb: 1 }}>
              1. Visit{' '}
              <Link
                href="https://cwe.mitre.org/data/downloads.html"
                target="_blank"
                rel="noopener"
              >
                cwe.mitre.org/data/downloads.html
              </Link>
            </Typography>
            <Typography variant="body2" sx={{ mb: 1 }}>
              2. Download <strong>cwec_latest.xml.zip</strong> (CWE List XML)
            </Typography>
            <Typography variant="body2" sx={{ mb: 1 }}>
              3. Extract <code>cwec_latest.xml</code> from the ZIP
            </Typography>
            <Typography variant="body2">
              4. Upload the extracted XML file below
            </Typography>
            <Box mt={2}>
              <Button
                size="small"
                variant="outlined"
                onClick={handleDownloadCWE}
                startIcon={<CloudUploadIcon />}
              >
                Open MITRE Downloads Page
              </Button>
            </Box>
          </Alert>

          {/* File Upload */}
          <Box>
            <Typography variant="subtitle2" gutterBottom>
              Select CWE XML File:
            </Typography>
            <Button
              variant="contained"
              component="label"
              startIcon={<CloudUploadIcon />}
              disabled={loading}
            >
              Choose File
              <input
                type="file"
                accept=".xml"
                hidden
                onChange={handleFileChange}
              />
            </Button>
            {file && (
              <Box mt={1}>
                <Chip
                  label={`${file.name} (${(file.size / 1024 / 1024).toFixed(2)} MB)`}
                  color="primary"
                  variant="outlined"
                />
              </Box>
            )}
          </Box>

          {/* Options */}
          <FormControlLabel
            control={
              <Checkbox
                checked={overwriteExisting}
                onChange={(e) => setOverwriteExisting(e.target.checked)}
                disabled={loading}
              />
            }
            label={
              <Typography variant="body2">
                Overwrite existing CWE templates (update if already imported)
              </Typography>
            }
          />

          {/* Loading */}
          {loading && (
            <Box>
              <Typography variant="body2" gutterBottom>
                Importing CWE database... This may take a minute.
              </Typography>
              <LinearProgress />
            </Box>
          )}

          {/* Error */}
          {error && (
            <Alert severity="error" icon={<ErrorIcon />}>
              <AlertTitle>Import Failed</AlertTitle>
              {error}
            </Alert>
          )}

          {/* Success Statistics */}
          {statistics && (
            <Alert severity="success" icon={<CheckCircleIcon />}>
              <AlertTitle>Import Complete!</AlertTitle>
              <Stack spacing={1} mt={1}>
                <Typography variant="body2">
                  <strong>Total Parsed:</strong> {statistics.total_parsed} CWE entries
                </Typography>
                <Typography variant="body2">
                  <strong>Templates Created:</strong> {statistics.templates_created}
                </Typography>
                <Typography variant="body2">
                  <strong>Templates Skipped:</strong> {statistics.templates_skipped} (already exist)
                </Typography>
                {statistics.errors > 0 && (
                  <Typography variant="body2" color="warning.main">
                    <strong>Errors:</strong> {statistics.errors}
                  </Typography>
                )}
                <Typography variant="body2">
                  <strong>Success Rate:</strong> {statistics.success_rate.toFixed(2)}%
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Imported at: {new Date(statistics.imported_at).toLocaleString()}
                </Typography>
              </Stack>
            </Alert>
          )}
        </Stack>
      </DialogContent>

      <DialogActions>
        <Button onClick={handleClose} disabled={loading}>
          {statistics ? 'Close' : 'Cancel'}
        </Button>
        <Button
          onClick={handleImport}
          variant="contained"
          color="primary"
          disabled={!file || loading}
          startIcon={<CloudUploadIcon />}
        >
          {loading ? 'Importing...' : 'Import CWE Database'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default CWEImportDialog;
