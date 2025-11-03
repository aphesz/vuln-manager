/** @jsxRuntime classic */
/** @jsx React.createElement */
/** @jsxFrag React.Fragment */

import React from 'react';
import { Box, Paper, Typography } from '@mui/material';
import OWASPRiskCalculator from './OWASPRiskCalculator';

const OWASPCalculatorPage: React.FC = () => {
  return (
    <Box sx={{ p: 3 }}>
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h4" gutterBottom fontWeight="600">
          OWASP Risk Rating Calculator
        </Typography>
        <Typography variant="body1" color="text.secondary" paragraph>
          Calculate risk ratings using the OWASP Risk Rating Methodology. 
          Assess both the likelihood and impact of vulnerabilities to determine overall risk severity.
        </Typography>
        <Typography variant="body2" color="text.secondary">
          <strong>OWASP Risk Rating</strong> combines Likelihood (how probable is exploitation?) 
          and Impact (what's the damage if exploited?) to produce a comprehensive risk assessment. 
          This methodology helps prioritize security efforts based on realistic threat scenarios.
        </Typography>
      </Paper>

      <Paper sx={{ p: 3 }}>
        <OWASPRiskCalculator />
      </Paper>
    </Box>
  );
};

export default OWASPCalculatorPage;
