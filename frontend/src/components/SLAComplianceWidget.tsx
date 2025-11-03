import React from 'react';
import { Card, CardContent, Typography, Box, CircularProgress } from '@mui/material';
import { CheckCircle, Warning, Error as ErrorIcon } from '@mui/icons-material';

interface SLAComplianceProps {
  onTrack: number;
  atRisk: number;
  overdue: number;
  total: number;
  complianceRate: number;
}

export default function SLAComplianceWidget({
  onTrack,
  atRisk,
  overdue,
  total,
  complianceRate,
}: SLAComplianceProps) {
  const getStatusColor = () => {
    if (complianceRate >= 80) return '#4caf50'; // Green
    if (complianceRate >= 60) return '#ff9800'; // Orange
    return '#f44336'; // Red
  };

  return (
    <Card>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          SLA Compliance
        </Typography>
        
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', my: 3 }}>
          <Box sx={{ position: 'relative', display: 'inline-flex' }}>
            <CircularProgress
              variant="determinate"
              value={complianceRate}
              size={120}
              thickness={4}
              sx={{
                color: getStatusColor(),
              }}
            />
            <Box
              sx={{
                top: 0,
                left: 0,
                bottom: 0,
                right: 0,
                position: 'absolute',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexDirection: 'column',
              }}
            >
              <Typography variant="h4" component="div" fontWeight="bold">
                {Math.round(complianceRate)}%
              </Typography>
              <Typography variant="caption" color="text.secondary">
                On Track
              </Typography>
            </Box>
          </Box>
        </Box>

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <CheckCircle sx={{ color: '#4caf50', fontSize: 20 }} />
              <Typography variant="body2" color="text.secondary">
                On Track
              </Typography>
            </Box>
            <Typography variant="body1" fontWeight="bold">
              {onTrack}
            </Typography>
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Warning sx={{ color: '#ff9800', fontSize: 20 }} />
              <Typography variant="body2" color="text.secondary">
                At Risk
              </Typography>
            </Box>
            <Typography variant="body1" fontWeight="bold">
              {atRisk}
            </Typography>
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <ErrorIcon sx={{ color: '#f44336', fontSize: 20 }} />
              <Typography variant="body2" color="text.secondary">
                Overdue
              </Typography>
            </Box>
            <Typography variant="body1" fontWeight="bold">
              {overdue}
            </Typography>
          </Box>
        </Box>

        <Box sx={{ mt: 2, pt: 2, borderTop: '1px solid', borderColor: 'divider' }}>
          <Typography variant="body2" color="text.secondary" align="center">
            Total: {total} finding{total !== 1 ? 's' : ''}
          </Typography>
        </Box>
      </CardContent>
    </Card>
  );
}
