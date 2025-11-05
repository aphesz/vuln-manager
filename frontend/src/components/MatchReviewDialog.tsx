import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  Card,
  CardContent,
  Chip,
  LinearProgress,
  Alert,
  Checkbox,
  Stack,
  Divider,
  IconButton,
  Tooltip,
} from '@mui/material';
import {
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
  Info as InfoIcon,
  AutoAwesome as AutoAwesomeIcon,
} from '@mui/icons-material';

interface MatchSuggestion {
  finding_id: number;
  finding_title: string;
  template_id: number;
  template_title: string;
  similarity_score: number;
  match_method: string;
  created: boolean;
}

interface MatchReviewDialogProps {
  open: boolean;
  onClose: () => void;
  projectId: number;
  onMatchesCreated?: () => void;
}

const MatchReviewDialog: React.FC<MatchReviewDialogProps> = ({
  open,
  onClose,
  projectId,
  onMatchesCreated,
}) => {
  const [loading, setLoading] = useState(false);
  const [matches, setMatches] = useState<MatchSuggestion[]>([]);
  const [selectedMatches, setSelectedMatches] = useState<Set<number>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [minScore, setMinScore] = useState(0.7);

  // Fetch match suggestions when dialog opens
  useEffect(() => {
    if (open && projectId) {
      fetchMatchSuggestions();
    }
  }, [open, projectId, minScore]);

  const fetchMatchSuggestions = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(
        `/api/projects/${projectId}/auto-match?min_score=${minScore}&auto_create=false`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        }
      );
      
      if (!response.ok) {
        throw new Error(`Failed to fetch matches: ${response.statusText}`);
      }

      const data = await response.json();
      setMatches(data.matches || []);
      
      // Auto-select high-confidence matches (>=85%)
      const highConfidence = new Set(
        data.matches
          .filter((m: MatchSuggestion) => m.similarity_score >= 0.85)
          .map((m: MatchSuggestion) => m.finding_id)
      );
      setSelectedMatches(highConfidence);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch match suggestions');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleMatch = (findingId: number) => {
    const newSelected = new Set(selectedMatches);
    if (newSelected.has(findingId)) {
      newSelected.delete(findingId);
    } else {
      newSelected.add(findingId);
    }
    setSelectedMatches(newSelected);
  };

  const handleSelectAll = () => {
    if (selectedMatches.size === matches.length) {
      setSelectedMatches(new Set());
    } else {
      setSelectedMatches(new Set(matches.map(m => m.finding_id)));
    }
  };

  const handleSelectHighConfidence = () => {
    const highConfidence = new Set(
      matches
        .filter(m => m.similarity_score >= 0.85)
        .map(m => m.finding_id)
    );
    setSelectedMatches(highConfidence);
  };

  const handleApproveSelected = async () => {
    if (selectedMatches.size === 0) {
      setError('No matches selected');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      // Create matches for selected findings
      const selectedMatchData = matches.filter(m => selectedMatches.has(m.finding_id));
      
      // Call backend to create VulnerabilityMatch records
      const response = await fetch(
        `/api/projects/${projectId}/auto-match?min_score=${minScore}&auto_create=true`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to create matches: ${response.statusText}`);
      }

      const result = await response.json();
      setSuccess(`Successfully created ${result.matched_count} matches!`);
      
      // Clear selections
      setSelectedMatches(new Set());
      
      // Notify parent component
      if (onMatchesCreated) {
        onMatchesCreated();
      }

      // Close dialog after short delay
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create matches');
    } finally {
      setLoading(false);
    }
  };

  const getConfidenceColor = (score: number): 'success' | 'warning' | 'info' => {
    if (score >= 0.85) return 'success';
    if (score >= 0.70) return 'warning';
    return 'info';
  };

  const getConfidenceLabel = (score: number): string => {
    if (score >= 0.85) return 'High Confidence';
    if (score >= 0.70) return 'Medium Confidence';
    return 'Low Confidence';
  };

  const getMethodLabel = (method: string): string => {
    const labels: Record<string, string> = {
      fuzzy_title: 'Title Match',
      fuzzy_description: 'Description Match',
      exact_cwe: 'CWE Match',
      exact_cve: 'CVE Match',
      ai_embedding: 'AI Match',
    };
    return labels[method] || method;
  };

  return (
    <Dialog 
      open={open} 
      onClose={onClose} 
      maxWidth="md" 
      fullWidth
      PaperProps={{
        sx: { minHeight: '60vh', maxHeight: '90vh' }
      }}
    >
      <DialogTitle>
        <Box display="flex" alignItems="center" gap={1}>
          <AutoAwesomeIcon color="primary" />
          <Typography variant="h6">Auto-Match Findings to Templates</Typography>
        </Box>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          Review and approve suggestions from the fuzzy matching engine
        </Typography>
      </DialogTitle>

      <DialogContent dividers>
        {loading && <LinearProgress sx={{ mb: 2 }} />}
        
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

        {!loading && matches.length === 0 && (
          <Alert severity="info">
            No match suggestions found. Try lowering the minimum score threshold.
          </Alert>
        )}

        {matches.length > 0 && (
          <>
            {/* Summary bar */}
            <Box sx={{ mb: 2, p: 2, bgcolor: 'background.paper', borderRadius: 1, border: '1px solid', borderColor: 'divider' }}>
              <Stack direction="row" spacing={3} alignItems="center">
                <Typography variant="body2">
                  <strong>{matches.length}</strong> suggestions found
                </Typography>
                <Typography variant="body2">
                  <strong>{selectedMatches.size}</strong> selected
                </Typography>
                <Box sx={{ flexGrow: 1 }} />
                <Button
                  size="small"
                  onClick={handleSelectAll}
                  variant="outlined"
                >
                  {selectedMatches.size === matches.length ? 'Deselect All' : 'Select All'}
                </Button>
                <Button
                  size="small"
                  onClick={handleSelectHighConfidence}
                  variant="outlined"
                  color="success"
                >
                  High Confidence Only
                </Button>
              </Stack>
            </Box>

            {/* Match cards */}
            <Stack spacing={2}>
              {matches.map((match) => (
                <Card 
                  key={match.finding_id}
                  variant="outlined"
                  sx={{
                    border: selectedMatches.has(match.finding_id) ? 2 : 1,
                    borderColor: selectedMatches.has(match.finding_id) ? 'primary.main' : 'divider',
                    transition: 'all 0.2s',
                    '&:hover': {
                      boxShadow: 2,
                    }
                  }}
                >
                  <CardContent>
                    <Stack direction="row" spacing={2} alignItems="flex-start">
                      <Checkbox
                        checked={selectedMatches.has(match.finding_id)}
                        onChange={() => handleToggleMatch(match.finding_id)}
                        sx={{ mt: -1 }}
                      />
                      
                      <Box sx={{ flexGrow: 1 }}>
                        {/* Finding title */}
                        <Typography variant="subtitle1" fontWeight="medium" gutterBottom>
                          {match.finding_title}
                        </Typography>

                        {/* Arrow + Template */}
                        <Box display="flex" alignItems="center" gap={1} sx={{ my: 1 }}>
                          <Typography variant="body2" color="text.secondary">
                            →
                          </Typography>
                          <Chip
                            label={match.template_title}
                            size="small"
                            color="primary"
                            variant="outlined"
                          />
                        </Box>

                        {/* Match details */}
                        <Stack direction="row" spacing={1} sx={{ mt: 1.5 }}>
                          <Chip
                            label={`${Math.round(match.similarity_score * 100)}% match`}
                            size="small"
                            color={getConfidenceColor(match.similarity_score)}
                            icon={<InfoIcon />}
                          />
                          <Chip
                            label={getConfidenceLabel(match.similarity_score)}
                            size="small"
                            variant="outlined"
                            color={getConfidenceColor(match.similarity_score)}
                          />
                          <Chip
                            label={getMethodLabel(match.match_method)}
                            size="small"
                            variant="outlined"
                          />
                        </Stack>
                      </Box>

                      {/* Quick actions */}
                      <Stack direction="row" spacing={0.5}>
                        <Tooltip title="Approve match">
                          <IconButton
                            size="small"
                            color="success"
                            onClick={() => {
                              const newSelected = new Set(selectedMatches);
                              newSelected.add(match.finding_id);
                              setSelectedMatches(newSelected);
                            }}
                          >
                            <CheckCircleIcon />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Reject match">
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => {
                              const newSelected = new Set(selectedMatches);
                              newSelected.delete(match.finding_id);
                              setSelectedMatches(newSelected);
                            }}
                          >
                            <CancelIcon />
                          </IconButton>
                        </Tooltip>
                      </Stack>
                    </Stack>
                  </CardContent>
                </Card>
              ))}
            </Stack>
          </>
        )}
      </DialogContent>

      <DialogActions sx={{ p: 2, gap: 1 }}>
        <Typography variant="body2" color="text.secondary" sx={{ flexGrow: 1, ml: 1 }}>
          Threshold: {Math.round(minScore * 100)}%
        </Typography>
        <Button onClick={onClose} disabled={loading}>
          Cancel
        </Button>
        <Button
          onClick={handleApproveSelected}
          variant="contained"
          disabled={loading || selectedMatches.size === 0}
          startIcon={<CheckCircleIcon />}
        >
          Approve {selectedMatches.size > 0 ? `(${selectedMatches.size})` : ''}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default MatchReviewDialog;
