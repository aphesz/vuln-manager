/** @jsxRuntime classic */
/** @jsx React.createElement */
/** @jsxFrag React.Fragment */

import React, { useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  Slider,
  Stack,
  Chip,
  Grid,
  Alert,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from '@mui/material';
import {
  Info as InfoIcon,
} from '@mui/icons-material';

interface OWASPRiskCalculatorProps {
  onRiskCalculated?: (likelihood: number, impact: number, riskScore: number, riskRating: string) => void;
}

const OWASPRiskCalculator: React.FC<OWASPRiskCalculatorProps> = ({
  onRiskCalculated,
}) => {
  const [likelihood, setLikelihood] = useState(5);
  const [impact, setImpact] = useState(5);

  // Calculate risk score (simple multiplication)
  const riskScore = likelihood * impact;

  // Determine risk rating based on OWASP methodology
  const getRiskRating = (score: number) => {
    if (score >= 18) return { label: 'Critical', color: 'error' as const, bgcolor: '#d32f2f', textColor: '#fff' };
    if (score >= 12) return { label: 'High', color: 'warning' as const, bgcolor: '#ed6c02', textColor: '#fff' };
    if (score >= 6) return { label: 'Medium', color: 'info' as const, bgcolor: '#0288d1', textColor: '#fff' };
    return { label: 'Low', color: 'success' as const, bgcolor: '#2e7d32', textColor: '#fff' };
  };

  const riskRating = getRiskRating(riskScore);

  const handleApply = () => {
    if (onRiskCalculated) {
      onRiskCalculated(likelihood, impact, riskScore, riskRating.label);
    }
  };

  // Risk matrix data
  const getRiskMatrixColor = (l: number, i: number) => {
    const score = l * i;
    if (score >= 18) return '#d32f2f';
    if (score >= 12) return '#ed6c02';
    if (score >= 6) return '#0288d1';
    return '#2e7d32';
  };

  return (
    <Paper sx={{ p: 3 }}>
      <Stack spacing={3}>
        <Box>
          <Typography variant="h6" gutterBottom>
            OWASP Risk Rating Calculator
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Evaluate risk based on likelihood and impact using OWASP methodology
          </Typography>
        </Box>

        <Alert severity="info" icon={<InfoIcon />}>
          <Typography variant="body2">
            <strong>OWASP Risk = Likelihood × Impact</strong>
            <br />
            Critical: ≥18 | High: 12-17 | Medium: 6-11 | Low: &lt;6
          </Typography>
        </Alert>

        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Stack spacing={2}>
              <Box>
                <Typography gutterBottom>
                  Likelihood: <strong>{likelihood}</strong>
                </Typography>
                <Slider
                  value={likelihood}
                  onChange={(_, value) => setLikelihood(value as number)}
                  min={1}
                  max={9}
                  step={1}
                  marks
                  valueLabelDisplay="auto"
                  color="primary"
                />
                <Stack direction="row" justifyContent="space-between">
                  <Typography variant="caption" color="text.secondary">
                    1 - Rare
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    9 - Almost Certain
                  </Typography>
                </Stack>
              </Box>

              <Box sx={{ mt: 2 }}>
                <Typography variant="body2" color="text.secondary">
                  <strong>Likelihood Guidance:</strong>
                </Typography>
                <Typography variant="caption" display="block" color="text.secondary">
                  • <strong>1-3:</strong> Difficult to exploit, requires special conditions
                </Typography>
                <Typography variant="caption" display="block" color="text.secondary">
                  • <strong>4-6:</strong> Moderately difficult, some skill required
                </Typography>
                <Typography variant="caption" display="block" color="text.secondary">
                  • <strong>7-9:</strong> Easy to exploit, publicly available tools
                </Typography>
              </Box>
            </Stack>
          </Grid>

          <Grid item xs={12} md={6}>
            <Stack spacing={2}>
              <Box>
                <Typography gutterBottom>
                  Impact: <strong>{impact}</strong>
                </Typography>
                <Slider
                  value={impact}
                  onChange={(_, value) => setImpact(value as number)}
                  min={1}
                  max={9}
                  step={1}
                  marks
                  valueLabelDisplay="auto"
                  color="secondary"
                />
                <Stack direction="row" justifyContent="space-between">
                  <Typography variant="caption" color="text.secondary">
                    1 - Minimal
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    9 - Catastrophic
                  </Typography>
                </Stack>
              </Box>

              <Box sx={{ mt: 2 }}>
                <Typography variant="body2" color="text.secondary">
                  <strong>Impact Guidance:</strong>
                </Typography>
                <Typography variant="caption" display="block" color="text.secondary">
                  • <strong>1-3:</strong> Limited disclosure, minimal data loss
                </Typography>
                <Typography variant="caption" display="block" color="text.secondary">
                  • <strong>4-6:</strong> Moderate data loss, some service disruption
                </Typography>
                <Typography variant="caption" display="block" color="text.secondary">
                  • <strong>7-9:</strong> Complete system compromise, critical data breach
                </Typography>
              </Box>
            </Stack>
          </Grid>
        </Grid>

        {/* Risk Matrix Visualization */}
        <Box>
          <Typography variant="subtitle2" gutterBottom>
            Risk Matrix
          </Typography>
          <TableContainer>
            <Table size="small" sx={{ border: '1px solid', borderColor: 'divider' }}>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 'bold', bgcolor: 'background.default' }}>L\I</TableCell>
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((i) => (
                    <TableCell
                      key={i}
                      align="center"
                      sx={{
                        fontWeight: 'bold',
                        bgcolor: 'background.default',
                        fontSize: '0.75rem',
                      }}
                    >
                      {i}
                    </TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {[9, 8, 7, 6, 5, 4, 3, 2, 1].map((l) => (
                  <TableRow key={l}>
                    <TableCell
                      sx={{
                        fontWeight: 'bold',
                        bgcolor: 'background.default',
                        fontSize: '0.75rem',
                      }}
                    >
                      {l}
                    </TableCell>
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((i) => (
                      <TableCell
                        key={`${l}-${i}`}
                        align="center"
                        sx={{
                          bgcolor: getRiskMatrixColor(l, i),
                          color: '#fff',
                          fontWeight: l === likelihood && i === impact ? 'bold' : 'normal',
                          border: l === likelihood && i === impact ? '3px solid #000' : '1px solid rgba(255,255,255,0.2)',
                          fontSize: '0.7rem',
                        }}
                      >
                        {l * i}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>

        {/* Result Display */}
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
                Risk Score: {riskScore}
              </Typography>
              <Chip
                label={riskRating.label}
                sx={{
                  bgcolor: riskRating.bgcolor,
                  color: riskRating.textColor,
                  fontSize: '1.1rem',
                  fontWeight: 'bold',
                  px: 2,
                }}
                size="large"
              />
            </Stack>

            <Typography variant="body2" color="text.secondary">
              Likelihood: {likelihood} × Impact: {impact} = {riskScore}
            </Typography>

            {onRiskCalculated && (
              <Button variant="contained" onClick={handleApply} fullWidth>
                Apply Risk Rating
              </Button>
            )}
          </Stack>
        </Box>
      </Stack>
    </Paper>
  );
};

export default OWASPRiskCalculator;
