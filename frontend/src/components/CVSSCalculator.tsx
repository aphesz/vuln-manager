/** @jsxRuntime classic */
/** @jsx React.createElement */
/** @jsxFrag React.Fragment */

import React, { useState } from 'react';
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
} from '@mui/material';
import {
  Info as InfoIcon,
  ContentCopy as CopyIcon,
} from '@mui/icons-material';

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

  // Calculate CVSS score (simplified - real implementation would use official formula)
  const calculateScore = () => {
    // Simplified scoring logic (placeholder for now)
    // TODO: Implement official CVSS 3.1 calculation in backend
    let baseScore = 0;

    // Attack Vector scoring
    const avScore = attackVector === 'N' ? 0.85 : attackVector === 'A' ? 0.62 : attackVector === 'L' ? 0.55 : 0.2;
    
    // Attack Complexity
    const acScore = attackComplexity === 'L' ? 0.77 : 0.44;
    
    // Privileges Required
    let prScore = privilegesRequired === 'N' ? 0.85 : privilegesRequired === 'L' ? 0.62 : 0.27;
    if (scope === 'C' && privilegesRequired === 'L') prScore = 0.68;
    if (scope === 'C' && privilegesRequired === 'H') prScore = 0.50;
    
    // User Interaction
    const uiScore = userInteraction === 'N' ? 0.85 : 0.62;
    
    // Impact scores
    const cScore = confidentiality === 'H' ? 0.56 : confidentiality === 'L' ? 0.22 : 0;
    const iScore = integrity === 'H' ? 0.56 : integrity === 'L' ? 0.22 : 0;
    const aScore = availability === 'H' ? 0.56 : availability === 'L' ? 0.22 : 0;
    
    // Simplified calculation (not official CVSS formula)
    const impact = 1 - ((1 - cScore) * (1 - iScore) * (1 - aScore));
    const exploitability = 8.22 * avScore * acScore * prScore * uiScore;
    
    if (impact <= 0) {
      baseScore = 0;
    } else if (scope === 'U') {
      baseScore = Math.min(exploitability * impact, 10);
    } else {
      baseScore = Math.min(1.08 * exploitability * impact, 10);
    }
    
    return Math.round(baseScore * 10) / 10;
  };

  const score = calculateScore();
  
  const getSeverity = (score: number) => {
    if (score === 0) return { label: 'None', color: 'default' as const };
    if (score < 4.0) return { label: 'Low', color: 'success' as const };
    if (score < 7.0) return { label: 'Medium', color: 'info' as const };
    if (score < 9.0) return { label: 'High', color: 'warning' as const };
    return { label: 'Critical', color: 'error' as const };
  };

  const severity = getSeverity(score);

  const generateVector = () => {
    return `CVSS:3.1/AV:${attackVector}/AC:${attackComplexity}/PR:${privilegesRequired}/UI:${userInteraction}/S:${scope}/C:${confidentiality}/I:${integrity}/A:${availability}`;
  };

  const vector = generateVector();

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
            <strong>Note:</strong> This is a simplified calculator. For production use, implement the official CVSS 3.1 formula in the backend.
          </Typography>
        </Alert>

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
            <Stack direction="row" justifyContent="space-between" alignItems="center">
              <Typography variant="h4" fontWeight="bold">
                Score: {score.toFixed(1)}
              </Typography>
              <Chip
                label={severity.label}
                color={severity.color}
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
          </Stack>
        </Box>
      </Stack>
    </Paper>
  );
};

export default CVSSCalculator;
