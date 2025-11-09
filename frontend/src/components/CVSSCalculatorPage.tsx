/** @jsxRuntime classic */
/** @jsx React.createElement */
/** @jsxFrag React.Fragment */

import React from 'react';
import { Box, Paper, Typography } from '@mui/material';
import CVSSCalculator from './CVSSCalculator';

const CVSSCalculatorPage: React.FC = () => {
  return (
    <Box sx={{ p: 3 }}>
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h4" gutterBottom fontWeight="600">
          CVSS 3.1 Calculator
        </Typography>
        <Typography variant="body1" color="text.secondary" paragraph>
          Calculate CVSS v3.1 Base Scores using the official scoring formula. 
          Select metric values to generate a CVSS vector string and calculate the severity rating.
        </Typography>
        <Typography variant="body2" color="text.secondary">
          <strong>CVSS (Common Vulnerability Scoring System)</strong> provides a standardized method 
          for rating IT vulnerabilities. The Base Score represents the intrinsic characteristics of a 
          vulnerability that are constant over time and across user environments.
        </Typography>
      </Paper>

      <Paper sx={{ p: 3 }}>
        <CVSSCalculator />
      </Paper>
    </Box>
  );
};

export default CVSSCalculatorPage;
