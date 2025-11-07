/**
 * RemediationProgressChart - Dual-axis chart showing open vs closed findings with velocity metrics
 */

import React from 'react';
import { Box, Typography, Card, CardContent, Grid, Paper, useTheme } from '@mui/material';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import type { RemediationProgressResponse } from '../services/TrendService';
import type { RiskRating } from '../types';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend
);

interface RemediationProgressChartProps {
  data: RemediationProgressResponse;
  loading?: boolean;
}

const RemediationProgressChart: React.FC<RemediationProgressChartProps> = ({ data, loading }) => {
  const theme = useTheme();

  const chartData = {
    labels: data.labels,
    datasets: [
      {
        label: 'Open Findings',
        data: data.open_findings,
        borderColor: 'rgb(211, 47, 47)',
        backgroundColor: 'rgba(211, 47, 47, 0.5)',
        borderWidth: 3,
        tension: 0.4,
        pointRadius: 4,
        pointHoverRadius: 6,
      },
      {
        label: 'Closed Findings',
        data: data.closed_findings,
        borderColor: 'rgb(76, 175, 80)',
        backgroundColor: 'rgba(76, 175, 80, 0.5)',
        borderWidth: 3,
        tension: 0.4,
        pointRadius: 4,
        pointHoverRadius: 6,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: 'index' as const,
      intersect: false,
    },
    plugins: {
      legend: {
        position: 'top' as const,
        labels: {
          color: theme.palette.text.primary,
          usePointStyle: true,
          padding: 15,
        },
      },
      tooltip: {
        callbacks: {
          footer: (tooltipItems: any[]) => {
            const open = tooltipItems[0]?.parsed.y || 0;
            const closed = tooltipItems[1]?.parsed.y || 0;
            const total = open + closed;
            const closedPercent = total > 0 ? ((closed / total) * 100).toFixed(1) : 0;
            return `Total: ${total} | Closed: ${closedPercent}%`;
          },
        },
      },
    },
    scales: {
      x: {
        grid: {
          color: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
        },
        ticks: {
          color: theme.palette.text.secondary,
          maxRotation: 45,
          minRotation: 0,
        },
      },
      y: {
        grid: {
          color: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
        },
        ticks: {
          color: theme.palette.text.secondary,
          precision: 0,
        },
        title: {
          display: true,
          text: 'Number of Findings',
          color: theme.palette.text.secondary,
        },
      },
    },
  };

  // Format MTTR (days)
  const formatMTTR = (days: number | null) => {
    if (days === null) return 'N/A';
    if (days < 1) return '<1 day';
    if (days === 1) return '1 day';
    return `${Math.round(days)} days`;
  };

  if (loading) {
    return (
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Remediation Progress
          </Typography>
          <Box sx={{ height: 400, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Typography color="text.secondary">Loading...</Typography>
          </Box>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent>
        <Box sx={{ mb: 2 }}>
          <Typography variant="h6" gutterBottom>
            Remediation Progress
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Open vs closed findings over time with remediation metrics
          </Typography>
        </Box>

        {/* Key Metrics */}
        <Grid container spacing={2} sx={{ mb: 2 }}>
          <Grid item xs={12} sm={4}>
            <Paper sx={{ p: 2, bgcolor: 'background.default' }}>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Remediation Velocity
              </Typography>
              <Typography variant="h5" fontWeight="bold">
                {data.remediation_velocity.toFixed(1)}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                findings closed per week
              </Typography>
            </Paper>
          </Grid>

          <Grid item xs={12} sm={4}>
            <Paper sx={{ p: 2, bgcolor: 'background.default' }}>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Current Status
              </Typography>
              <Box sx={{ display: 'flex', gap: 1, alignItems: 'baseline' }}>
                <Typography variant="h5" fontWeight="bold" color="error.main">
                  {data.by_risk.Critical.open + data.by_risk.High.open + 
                   data.by_risk.Medium.open + data.by_risk.Low.open + 
                   data.by_risk.Informational.open}
                </Typography>
                <Typography variant="body2" color="text.secondary">open</Typography>
                <Typography variant="h5" fontWeight="bold" color="success.main">
                  {data.by_risk.Critical.closed + data.by_risk.High.closed + 
                   data.by_risk.Medium.closed + data.by_risk.Low.closed + 
                   data.by_risk.Informational.closed}
                </Typography>
                <Typography variant="body2" color="text.secondary">closed</Typography>
              </Box>
            </Paper>
          </Grid>

          <Grid item xs={12} sm={4}>
            <Paper sx={{ p: 2, bgcolor: 'background.default' }}>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Mean Time To Remediate
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                <Typography variant="body2">
                  <strong>Critical:</strong> {formatMTTR(data.mean_time_to_remediate.Critical)}
                </Typography>
                <Typography variant="body2">
                  <strong>High:</strong> {formatMTTR(data.mean_time_to_remediate.High)}
                </Typography>
              </Box>
            </Paper>
          </Grid>
        </Grid>

        {/* By Risk Breakdown */}
        <Box sx={{ mb: 2 }}>
          <Typography variant="subtitle2" gutterBottom>
            By Risk Level
          </Typography>
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
            {(Object.entries(data.by_risk) as [RiskRating, { open: number; closed: number }][]).map(([risk, counts]) => (
              <Box key={risk} sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <Typography variant="body2">
                  <strong>{risk}:</strong> {counts.open} open, {counts.closed} closed
                </Typography>
              </Box>
            ))}
          </Box>
        </Box>

        <Box sx={{ height: 350 }}>
          <Line data={chartData} options={options} />
        </Box>
      </CardContent>
    </Card>
  );
};

export default RemediationProgressChart;
