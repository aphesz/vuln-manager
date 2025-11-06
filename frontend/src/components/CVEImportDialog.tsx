import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Typography,
  Box,
  CircularProgress,
  Alert,
  Paper,
  Divider,
  Chip,
  FormControlLabel,
  Checkbox,
  Link,
} from '@mui/material';
import {
  Search as SearchIcon,
  CloudDownload as ImportIcon,
  CheckCircle as SuccessIcon,
} from '@mui/icons-material';
import axios from 'axios';

interface CVETemplate {
  id?: number;
  title: string;
  description: string;
  cve_id: string;
  cvss_score: number | null;
  cvss_vector: string | null;
  default_risk_rating: string | null;
  vulnerability_type: string | null;
  remediation_summary: string | null;
  references: string | null;
  source: string;
  is_verified: boolean;
}

interface CVEImportDialogProps {
  open: boolean;
  onClose: () => void;
  onImportComplete?: () => void;
}

const CVEImportDialog: React.FC<CVEImportDialogProps> = ({ open, onClose, onImportComplete }) => {
  const [cveId, setCveId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewData, setPreviewData] = useState<CVETemplate | null>(null);
  const [imported, setImported] = useState(false);
  const [overwrite, setOverwrite] = useState(false);

  const handleSearch = async () => {
    if (!cveId.trim()) {
      setError('Please enter a CVE ID');
      return;
    }

    setLoading(true);
    setError(null);
    setPreviewData(null);

    try {
      const response = await axios.post(
        `/api/vulnerability-templates/import-cve`,
        null,
        {
          params: {
            cve_id: cveId.trim(),
            overwrite_existing: overwrite,
          },
        }
      );

      setPreviewData(response.data);
      setImported(true);
      setError(null);
    } catch (err: any) {
      console.error('CVE import error:', err);
      if (err.response?.status === 409) {
        setError(
          `${cveId} already exists in the database. Check "Overwrite existing" to update it.`
        );
      } else if (err.response?.status === 404) {
        setError(`${cveId} not found in NIST NVD database. Please verify the CVE ID.`);
      } else {
        setError(err.response?.data?.detail || 'Failed to import CVE');
      }
      setPreviewData(null);
      setImported(false);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setCveId('');
    setPreviewData(null);
    setError(null);
    setImported(false);
    setOverwrite(false);
    onClose();
  };

  const handleImportComplete = () => {
    if (onImportComplete) {
      onImportComplete();
    }
    handleClose();
  };

  const getRiskColor = (rating: string | null) => {
    if (!rating) return 'default';
    switch (rating.toLowerCase()) {
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
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
      <DialogTitle>Import CVE from NIST NVD</DialogTitle>

      <DialogContent>
        <Box sx={{ mb: 3 }}>
          <Typography variant="body2" color="text.secondary" paragraph>
            Import a single CVE (Common Vulnerabilities and Exposures) from the{' '}
            <Link
              href="https://nvd.nist.gov/"
              target="_blank"
              rel="noopener noreferrer"
            >
              NIST National Vulnerability Database
            </Link>
            .
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Example CVE IDs: CVE-2021-44228 (Log4Shell), CVE-2024-3094 (XZ backdoor)
          </Typography>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        {imported && previewData && (
          <Alert
            severity="success"
            icon={<SuccessIcon />}
            sx={{ mb: 2 }}
            onClose={() => setImported(false)}
          >
            CVE imported successfully! Template ID: {previewData.id}
          </Alert>
        )}

        <Box sx={{ mb: 3 }}>
          <TextField
            fullWidth
            label="CVE ID"
            placeholder="CVE-2024-1234 or 2024-1234"
            value={cveId}
            onChange={(e) => setCveId(e.target.value.toUpperCase())}
            onKeyPress={(e) => {
              if (e.key === 'Enter' && !loading) {
                handleSearch();
              }
            }}
            disabled={loading}
            variant="outlined"
            sx={{ mb: 2 }}
          />

          <FormControlLabel
            control={
              <Checkbox
                checked={overwrite}
                onChange={(e) => setOverwrite(e.target.checked)}
                disabled={loading}
              />
            }
            label="Overwrite existing CVE template if found"
          />

          <Button
            fullWidth
            variant="contained"
            color="primary"
            startIcon={loading ? <CircularProgress size={20} /> : <SearchIcon />}
            onClick={handleSearch}
            disabled={loading || !cveId.trim()}
            sx={{ mt: 1 }}
          >
            {loading ? 'Importing from NVD...' : 'Import CVE'}
          </Button>
        </Box>

        {previewData && (
          <>
            <Divider sx={{ my: 2 }} />

            <Paper variant="outlined" sx={{ p: 2, bgcolor: 'background.default' }}>
              <Typography variant="h6" gutterBottom>
                {previewData.title}
              </Typography>

              <Box sx={{ mb: 2, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                <Chip label={previewData.cve_id} color="primary" size="small" />
                {previewData.cvss_score !== null && (
                  <Chip
                    label={`CVSS ${previewData.cvss_score}/10`}
                    color={getRiskColor(previewData.default_risk_rating)}
                    size="small"
                  />
                )}
                {previewData.default_risk_rating && (
                  <Chip
                    label={previewData.default_risk_rating}
                    color={getRiskColor(previewData.default_risk_rating)}
                    size="small"
                  />
                )}
                {previewData.vulnerability_type && (
                  <Chip label={previewData.vulnerability_type} size="small" />
                )}
                <Chip
                  label={`Source: ${previewData.source.toUpperCase()}`}
                  color="secondary"
                  size="small"
                />
              </Box>

              <Typography variant="body2" color="text.secondary" paragraph>
                <strong>Description:</strong>
              </Typography>
              <Typography variant="body2" paragraph sx={{ whiteSpace: 'pre-wrap' }}>
                {previewData.description}
              </Typography>

              {previewData.cvss_vector && (
                <Typography variant="caption" color="text.secondary" paragraph>
                  <strong>CVSS Vector:</strong> {previewData.cvss_vector}
                </Typography>
              )}

              {previewData.remediation_summary && (
                <>
                  <Typography variant="body2" color="text.secondary" paragraph>
                    <strong>Remediation:</strong>
                  </Typography>
                  <Typography variant="body2" paragraph>
                    {previewData.remediation_summary}
                  </Typography>
                </>
              )}

              {previewData.references && (
                <>
                  <Typography variant="body2" color="text.secondary" paragraph>
                    <strong>References:</strong>
                  </Typography>
                  <Typography variant="caption" sx={{ whiteSpace: 'pre-wrap' }}>
                    {previewData.references}
                  </Typography>
                </>
              )}
            </Paper>
          </>
        )}
      </DialogContent>

      <DialogActions>
        <Button onClick={handleClose} disabled={loading}>
          {imported ? 'Done' : 'Cancel'}
        </Button>
        {imported && previewData && (
          <Button
            variant="contained"
            color="success"
            startIcon={<SuccessIcon />}
            onClick={handleImportComplete}
          >
            View in Template Library
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};

export default CVEImportDialog;
