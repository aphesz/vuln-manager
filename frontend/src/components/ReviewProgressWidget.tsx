import React from 'react';
import { Card, CardContent, Typography, Box, LinearProgress } from '@mui/material';
import {
  HourglassEmpty,
  RateReview,
  CheckCircle,
  Cancel,
} from '@mui/icons-material';

interface ReviewProgressWidgetProps {
  pending: number;
  inReview: number;
  approved: number;
  rejected: number;
  total: number;
  approvalRate: number;
}

export default function ReviewProgressWidget({
  pending,
  inReview,
  approved,
  rejected,
  total,
  approvalRate,
}: ReviewProgressWidgetProps) {
  const getPercentage = (value: number) => {
    return total > 0 ? (value / total) * 100 : 0;
  };

  return (
    <Card>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          Review Progress
        </Typography>
        
        <Box sx={{ my: 3 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
            <Typography variant="body2" color="text.secondary">
              Approval Rate
            </Typography>
            <Typography variant="body2" fontWeight="bold">
              {Math.round(approvalRate)}%
            </Typography>
          </Box>
          <LinearProgress
            variant="determinate"
            value={approvalRate}
            sx={{
              height: 8,
              borderRadius: 4,
              backgroundColor: 'action.hover',
              '& .MuiLinearProgress-bar': {
                backgroundColor: approvalRate >= 70 ? '#4caf50' : approvalRate >= 40 ? '#ff9800' : '#f44336',
                borderRadius: 4,
              },
            }}
          />
        </Box>

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <HourglassEmpty sx={{ color: '#757575', fontSize: 20 }} />
              <Typography variant="body2" color="text.secondary">
                Pending
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography variant="body1" fontWeight="bold">
                {pending}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                ({Math.round(getPercentage(pending))}%)
              </Typography>
            </Box>
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <RateReview sx={{ color: '#2196f3', fontSize: 20 }} />
              <Typography variant="body2" color="text.secondary">
                In Review
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography variant="body1" fontWeight="bold">
                {inReview}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                ({Math.round(getPercentage(inReview))}%)
              </Typography>
            </Box>
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <CheckCircle sx={{ color: '#4caf50', fontSize: 20 }} />
              <Typography variant="body2" color="text.secondary">
                Approved
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography variant="body1" fontWeight="bold">
                {approved}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                ({Math.round(getPercentage(approved))}%)
              </Typography>
            </Box>
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Cancel sx={{ color: '#f44336', fontSize: 20 }} />
              <Typography variant="body2" color="text.secondary">
                Rejected
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography variant="body1" fontWeight="bold">
                {rejected}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                ({Math.round(getPercentage(rejected))}%)
              </Typography>
            </Box>
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
