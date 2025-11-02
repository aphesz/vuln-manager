import React from 'react';
import { Box, Card, CardContent, Skeleton, Grid } from '@mui/material';

/**
 * Loading skeleton for risk cards
 */
export const RiskCardSkeleton = () => (
  <Grid container spacing={2} sx={{ mb: 3 }}>
    {[1, 2, 3, 4, 5].map((i) => (
      <Grid item xs={12} sm={6} md={4} lg={2.4} key={i}>
        <Card>
          <CardContent>
            <Skeleton variant="text" width="60%" height={24} sx={{ mb: 1 }} />
            <Skeleton variant="text" width="40%" height={32} />
          </CardContent>
        </Card>
      </Grid>
    ))}
  </Grid>
);

/**
 * Loading skeleton for project header
 */
export const ProjectHeaderSkeleton = () => (
  <Box sx={{ mb: 3 }}>
    <Skeleton variant="text" width="40%" height={40} sx={{ mb: 1 }} />
    <Skeleton variant="text" width="25%" height={24} />
  </Box>
);

/**
 * Loading skeleton for risk chart
 */
export const RiskChartSkeleton = () => (
  <Card sx={{ mb: 3 }}>
    <CardContent>
      <Skeleton variant="text" width="30%" height={28} sx={{ mb: 2 }} />
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
        <Skeleton variant="circular" width={200} height={200} />
      </Box>
    </CardContent>
  </Card>
);

/**
 * Loading skeleton for findings table
 */
export const FindingsTableSkeleton = () => (
  <Card>
    <CardContent>
      <Skeleton variant="text" width="30%" height={28} sx={{ mb: 2 }} />
      <Box>
        {[1, 2, 3, 4, 5].map((i) => (
          <Box key={i} sx={{ mb: 2 }}>
            <Skeleton variant="rectangular" height={52} />
          </Box>
        ))}
      </Box>
    </CardContent>
  </Card>
);

/**
 * Full dashboard loading skeleton
 */
export const DashboardSkeleton = () => (
  <Box>
    <ProjectHeaderSkeleton />
    <RiskCardSkeleton />
    <Grid container spacing={3}>
      <Grid item xs={12} md={4}>
        <RiskChartSkeleton />
      </Grid>
      <Grid item xs={12} md={8}>
        <FindingsTableSkeleton />
      </Grid>
    </Grid>
  </Box>
);

/**
 * Loading skeleton for project cards list
 */
export const ProjectCardSkeleton = () => (
  <Grid container spacing={3}>
    {[1, 2, 3, 4].map((i) => (
      <Grid item xs={12} sm={6} md={4} key={i}>
        <Card>
          <CardContent>
            <Skeleton variant="text" width="70%" height={28} sx={{ mb: 1 }} />
            <Skeleton variant="text" width="50%" height={20} sx={{ mb: 2 }} />
            <Box sx={{ display: 'flex', gap: 1, mb: 1 }}>
              <Skeleton variant="rectangular" width={60} height={24} />
              <Skeleton variant="rectangular" width={60} height={24} />
              <Skeleton variant="rectangular" width={60} height={24} />
            </Box>
            <Skeleton variant="text" width="40%" height={20} />
          </CardContent>
        </Card>
      </Grid>
    ))}
  </Grid>
);

/**
 * Loading skeleton for SLA dashboard
 */
export const SLADashboardSkeleton = () => (
  <Box>
    <Skeleton variant="text" width="30%" height={40} sx={{ mb: 3 }} />
    <Grid container spacing={3} sx={{ mb: 3 }}>
      {[1, 2, 3].map((i) => (
        <Grid item xs={12} md={4} key={i}>
          <Card>
            <CardContent>
              <Skeleton variant="text" width="60%" height={24} sx={{ mb: 1 }} />
              <Skeleton variant="text" width="40%" height={48} />
            </CardContent>
          </Card>
        </Grid>
      ))}
    </Grid>
    <Card>
      <CardContent>
        <Skeleton variant="text" width="40%" height={28} sx={{ mb: 2 }} />
        {[1, 2, 3, 4, 5].map((i) => (
          <Skeleton key={i} variant="rectangular" height={52} sx={{ mb: 1 }} />
        ))}
      </CardContent>
    </Card>
  </Box>
);

/**
 * Generic loading spinner with message
 */
interface LoadingSpinnerProps {
  message?: string;
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ message = 'Loading...' }) => (
  <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 8 }}>
    <Skeleton variant="circular" width={60} height={60} sx={{ mb: 2 }} />
    <Skeleton variant="text" width={150} height={24} />
  </Box>
);
