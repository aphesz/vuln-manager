/**
 * FindingsTimelineChart - Stacked area chart showing finding counts by risk over time
 */

import React from 'react';
import { Box, Typography, Card, CardContent, useTheme } from '@mui/material';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
  TooltipItem,
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import type { FindingsTimelineResponse } from '../services/TrendService';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

interface FindingsTimelineChartProps {
  data: FindingsTimelineResponse;
  loading?: boolean;
}

const FindingsTimelineChart: React.FC<FindingsTimelineChartProps> = ({ data, loading }) => {
  const theme = useTheme();

  // Risk rating colors matching backend
  const riskColors = {
    Critical: { bg: 'rgba(211, 47, 47, 0.2)', border: 'rgb(211, 47, 47)' },
    High: { bg: 'rgba(245, 124, 0, 0.2)', border: 'rgb(245, 124, 0)' },
    Medium: { bg: 'rgba(251, 192, 45, 0.2)', border: 'rgb(251, 192, 45)' },
    Low: { bg: 'rgba(66, 165, 245, 0.2)', border: 'rgb(66, 165, 245)' },
    Informational: { bg: 'rgba(158, 158, 158, 0.2)', border: 'rgb(158, 158, 158)' },
  };

  const chartData = {
    labels: data.labels,
    datasets: [
      {
        label: 'Critical',
        data: data.datasets.Critical,
        fill: true,
        backgroundColor: riskColors.Critical.bg,
        borderColor: riskColors.Critical.border,
        borderWidth: 2,
        tension: 0.4,
      },
      {
        label: 'High',
        data: data.datasets.High,
        fill: true,
        backgroundColor: riskColors.High.bg,
        borderColor: riskColors.High.border,
        borderWidth: 2,
        tension: 0.4,
      },
      {
        label: 'Medium',
        data: data.datasets.Medium,
        fill: true,
        backgroundColor: riskColors.Medium.bg,
        borderColor: riskColors.Medium.border,
        borderWidth: 2,
        tension: 0.4,
      },
      {
        label: 'Low',
        data: data.datasets.Low,
        fill: true,
        backgroundColor: riskColors.Low.bg,
        borderColor: riskColors.Low.border,
        borderWidth: 2,
        tension: 0.4,
      },
      {
        label: 'Informational',
        data: data.datasets.Informational,
        fill: true,
        backgroundColor: riskColors.Informational.bg,
        borderColor: riskColors.Informational.border,
        borderWidth: 2,
        tension: 0.4,
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
          footer: (tooltipItems: TooltipItem<'line'>[]) => {
            const total = tooltipItems.reduce((sum, item) => sum + (item.parsed.y || 0), 0);
            return `Total: ${total}`;
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
        stacked: true,
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

  if (loading) {
    return (
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Findings Timeline
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
            Findings Timeline
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Total findings by risk rating over time
          </Typography>
        </Box>
        
        {/* Summary stats */}
        <Box sx={{ display: 'flex', gap: 2, mb: 2, flexWrap: 'wrap' }}>
          {Object.entries(data.totals).map(([risk, count]) => (
            <Box key={risk} sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <Box
                sx={{
                  width: 12,
                  height: 12,
                  borderRadius: '50%',
                  bgcolor: riskColors[risk as keyof typeof riskColors].border,
                }}
              />
              <Typography variant="body2">
                {risk}: <strong>{count}</strong>
              </Typography>
            </Box>
          ))}
        </Box>

        <Box sx={{ height: 400 }}>
          <Line data={chartData} options={options} />
        </Box>
      </CardContent>
    </Card>
  );
};

export default FindingsTimelineChart;
