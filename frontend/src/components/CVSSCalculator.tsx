/** @jsxRuntime classic */
/** @jsx React.createElement */
/** @jsxFrag React.Fragment */

import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Stack,
  Chip,
  Alert,
  Button,
  Tooltip,
  IconButton,
  CircularProgress,
} from '@mui/material';
import {
  Info as InfoIcon,
  ContentCopy as CopyIcon,
} from '@mui/icons-material';
import axios from 'axios';

interface CVSSCalculatorProps {
  onScoreCalculated?: (score: number, vector: string) => void;
  initialVector?: string;
}

const CVSSCalculator: React.FC<CVSSCalculatorProps> = ({
  onScoreCalculated,
  initialVector = '',
}) => {
  // CVSS 3.1 Metrics
  const [attackVector, setAttackVector] = useState('N');
  const [attackComplexity, setAttackComplexity] = useState('L');
  const [privilegesRequired, setPrivilegesRequired] = useState('N');
  const [userInteraction, setUserInteraction] = useState('N');
  const [scope, setScope] = useState('U');
  const [confidentiality, setConfidentiality] = useState('N');
  const [integrity, setIntegrity] = useState('N');
  const [availability, setAvailability] = useState('N');

  // Score state
  const [score, setScore] = useState(0);
  const [severity, setSeverity] = useState('None');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generateVector = () => {
    return `CVSS:3.1/AV:${attackVector}/AC:${attackComplexity}/PR:${privilegesRequired}/UI:${userInteraction}/S:${scope}/C:${confidentiality}/I:${integrity}/A:${availability}`;
  };

  const vector = generateVector();

  // Calculate score from backend whenever metrics change
  useEffect(() => {
    const calculateScore = async () => {
      setLoading(true);
      setError(null);

      try {
        const response = await axios.post('/api/cvss/calculate', {
          vector: vector,
        });

        if (response.data.is_valid) {
          setScore(response.data.base_score);
          setSeverity(response.data.severity);
        } else {
          setError(response.data.error || 'Invalid CVSS vector');
          setScore(0);
          setSeverity('None');
        }
      } catch (err) {
        console.error('CVSS calculation error:', err);
        setError('Failed to calculate CVSS score');
        setScore(0);
        setSeverity('None');
      } finally {
        setLoading(false);
      }
    };

    calculateScore();
  }, [attackVector, attackComplexity, privilegesRequired, userInteraction, scope, confidentiality, integrity, availability]);

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'Critical': return 'error' as const;
      case 'High': return 'warning' as const;
      case 'Medium': return 'info' as const;
      case 'Low': return 'success' as const;
      default: return 'default' as const;
    }
  };

  const handleCopyVector = () => {
    navigator.clipboard.writeText(vector);
  };

  const handleApply = () => {
    if (onScoreCalculated) {
      onScoreCalculated(score, vector);
    }
  };

  return (
    <Paper sx={{ p: 3 }}>
      <Stack spacing={3}>
        <Box>
          <Typography variant="h6" gutterBottom>
            CVSS 3.1 Calculator
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Calculate vulnerability severity using CVSS 3.1 metrics
          </Typography>
        </Box>

        <Alert severity="info" icon={<InfoIcon />}>
          <Typography variant="body2">
            <strong>Official CVSS 3.1 Calculator</strong> - Real-time score calculation using the official CVSS v3.1 specification formula.
          </Typography>
        </Alert>

        {error && (
          <Alert severity="error">
            {error}
          </Alert>
        )}

        <Stack spacing={2}>
          <FormControl fullWidth>
            <InputLabel>Attack Vector (AV)</InputLabel>
            <Select
              value={attackVector}
              label="Attack Vector (AV)"
              onChange={(e) => setAttackVector(e.target.value)}
            >
              <MenuItem value="N">Network (N) - Remotely exploitable</MenuItem>
              <MenuItem value="A">Adjacent (A) - Local network</MenuItem>
              <MenuItem value="L">Local (L) - Requires local access</MenuItem>
              <MenuItem value="P">Physical (P) - Requires physical access</MenuItem>
            </Select>
          </FormControl>

          <FormControl fullWidth>
            <InputLabel>Attack Complexity (AC)</InputLabel>
            <Select
              value={attackComplexity}
              label="Attack Complexity (AC)"
              onChange={(e) => setAttackComplexity(e.target.value)}
            >
              <MenuItem value="L">Low (L) - No special conditions</MenuItem>
              <MenuItem value="H">High (H) - Requires special conditions</MenuItem>
            </Select>
          </FormControl>

          <FormControl fullWidth>
            <InputLabel>Privileges Required (PR)</InputLabel>
            <Select
              value={privilegesRequired}
              label="Privileges Required (PR)"
              onChange={(e) => setPrivilegesRequired(e.target.value)}
            >
              <MenuItem value="N">None (N) - No authentication</MenuItem>
              <MenuItem value="L">Low (L) - Basic user privileges</MenuItem>
              <MenuItem value="H">High (H) - Admin/elevated privileges</MenuItem>
            </Select>
          </FormControl>

          <FormControl fullWidth>
            <InputLabel>User Interaction (UI)</InputLabel>
            <Select
              value={userInteraction}
              label="User Interaction (UI)"
              onChange={(e) => setUserInteraction(e.target.value)}
            >
              <MenuItem value="N">None (N) - No user action required</MenuItem>
              <MenuItem value="R">Required (R) - User must take action</MenuItem>
            </Select>
          </FormControl>

          <FormControl fullWidth>
            <InputLabel>Scope (S)</InputLabel>
            <Select
              value={scope}
              label="Scope (S)"
              onChange={(e) => setScope(e.target.value)}
            >
              <MenuItem value="U">Unchanged (U) - Limited to vulnerable component</MenuItem>
              <MenuItem value="C">Changed (C) - Impacts beyond vulnerable component</MenuItem>
            </Select>
          </FormControl>

          <FormControl fullWidth>
            <InputLabel>Confidentiality Impact (C)</InputLabel>
            <Select
              value={confidentiality}
              label="Confidentiality Impact (C)"
              onChange={(e) => setConfidentiality(e.target.value)}
            >
              <MenuItem value="N">None (N) - No impact</MenuItem>
              <MenuItem value="L">Low (L) - Limited information disclosed</MenuItem>
              <MenuItem value="H">High (H) - Total information disclosure</MenuItem>
            </Select>
          </FormControl>

          <FormControl fullWidth>
            <InputLabel>Integrity Impact (I)</InputLabel>
            <Select
              value={integrity}
              label="Integrity Impact (I)"
              onChange={(e) => setIntegrity(e.target.value)}
            >
              <MenuItem value="N">None (N) - No impact</MenuItem>
              <MenuItem value="L">Low (L) - Limited data modification</MenuItem>
              <MenuItem value="H">High (H) - Total data modification</MenuItem>
            </Select>
          </FormControl>

          <FormControl fullWidth>
            <InputLabel>Availability Impact (A)</InputLabel>
            <Select
              value={availability}
              label="Availability Impact (A)"
              onChange={(e) => setAvailability(e.target.value)}
            >
              <MenuItem value="N">None (N) - No impact</MenuItem>
              <MenuItem value="L">Low (L) - Reduced performance</MenuItem>
              <MenuItem value="H">High (H) - Total denial of service</MenuItem>
            </Select>
          </FormControl>
        </Stack>

        <Box
          sx={{
            p: 2,
            bgcolor: 'background.default',
            borderRadius: 1,
            border: '1px solid',
            borderColor: 'divider',
          }}
        >
          <Stack spacing={2}>
            {loading ? (
              <Box display="flex" justifyContent="center" alignItems="center" minHeight={100}>
                <CircularProgress />
              </Box>
            ) : (
              <>
                <Stack direction="row" justifyContent="space-between" alignItems="center">
                  <Typography variant="h4" fontWeight="bold">
                    Score: {score.toFixed(1)}
                  </Typography>
                  <Chip
                    label={severity}
                    color={getSeverityColor(severity)}
                    size="large"
                    sx={{ fontSize: '1.1rem', fontWeight: 'bold', px: 2 }}
                  />
                </Stack>

                <Stack direction="row" alignItems="center" spacing={1}>
                  <Typography variant="body2" color="text.secondary" sx={{ fontFamily: 'monospace', flex: 1 }}>
                    {vector}
                  </Typography>
                  <Tooltip title="Copy vector">
                    <IconButton size="small" onClick={handleCopyVector}>
                      <CopyIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </Stack>

                {onScoreCalculated && (
                  <Button variant="contained" onClick={handleApply} fullWidth>
                    Apply Score
                  </Button>
                )}
              </>
            )}
          </Stack>
        </Box>
      </Stack>
    </Paper>
  );
};

export default CVSSCalculator;
