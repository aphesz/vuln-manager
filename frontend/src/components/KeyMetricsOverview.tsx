import React from 'react';
import { Card, CardContent, Typography, Box, Grid } from '@mui/material';
import {
  BugReport,
  Layers,
  Link as LinkIcon,
  Timer,
} from '@mui/icons-material';

interface MetricCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ReactNode;
  color: string;
}

function MetricCard({ title, value, subtitle, icon, color }: MetricCardProps) {
  return (
    <Card>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <Box>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              {title}
            </Typography>
            <Typography variant="h4" fontWeight="bold">
              {value}
            </Typography>
            {subtitle && (
              <Typography variant="caption" color="text.secondary">
                {subtitle}
              </Typography>
            )}
          </Box>
          <Box
            sx={{
              backgroundColor: color,
              borderRadius: 2,
              p: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {icon}
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
}

interface KeyMetricsProps {
  totalFindings: number;
  totalInstances: number;
  jiraSyncRate: number;
  findingsWithJira: number;
}

export default function KeyMetricsOverview({
  totalFindings,
  totalInstances,
  jiraSyncRate,
  findingsWithJira,
}: KeyMetricsProps) {
  return (
    <Grid container spacing={2}>
      <Grid item xs={12} sm={6} md={4}>
        <MetricCard
          title="Total Findings"
          value={totalFindings}
          subtitle={totalFindings === 1 ? '1 unique vulnerability' : `${totalFindings} unique vulnerabilities`}
          icon={<BugReport sx={{ color: 'white', fontSize: 28 }} />}
          color="#2196f3"
        />
      </Grid>

      <Grid item xs={12} sm={6} md={4}>
        <MetricCard
          title="Total Instances"
          value={totalInstances}
          subtitle={totalInstances === 1 ? '1 occurrence' : `${totalInstances} occurrences`}
          icon={<Layers sx={{ color: 'white', fontSize: 28 }} />}
          color="#9c27b0"
        />
      </Grid>

      <Grid item xs={12} sm={6} md={4}>
        <MetricCard
          title="Jira Integration"
          value={`${Math.round(jiraSyncRate)}%`}
          subtitle={`${findingsWithJira}/${totalFindings} linked`}
          icon={<LinkIcon sx={{ color: 'white', fontSize: 28 }} />}
          color="#ff9800"
        />
      </Grid>
    </Grid>
  );
}
