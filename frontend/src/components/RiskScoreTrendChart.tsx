/**
 * RiskScoreTrendChart - Line chart showing weighted risk score evolution with trend indicator
 */

import React from 'react';
import { Box, Typography, Card, CardContent, Chip, useTheme } from '@mui/material';
import {
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  TrendingFlat as TrendingFlatIcon,
} from '@mui/icons-material';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import type { RiskScoreTrendResponse } from '../services/TrendService';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

interface RiskScoreTrendChartProps {
  data: RiskScoreTrendResponse;
  loading?: boolean;
}

const RiskScoreTrendChart: React.FC<RiskScoreTrendChartProps> = ({ data, loading }) => {
  const theme = useTheme();

  // Determine trend color and icon
  const getTrendConfig = () => {
    if (data.trend === 'improving') {
      return {
        color: 'success' as const,
        icon: <TrendingDownIcon />,
        label: 'Improving',
        description: 'Risk score is decreasing',
      };
    } else if (data.trend === 'worsening') {
      return {
        color: 'error' as const,
        icon: <TrendingUpIcon />,
        label: 'Worsening',
        description: 'Risk score is increasing',
      };
    } else {
      return {
        color: 'default' as const,
        icon: <TrendingFlatIcon />,
        label: 'Stable',
        description: 'Risk score is stable',
      };
    }
  };

  const trendConfig = getTrendConfig();

  const chartData = {
    labels: data.labels,
    datasets: [
      {
        label: 'Risk Score',
        data: data.risk_scores,
        fill: false,
        borderColor: data.trend === 'improving' 
          ? 'rgb(76, 175, 80)' 
          : data.trend === 'worsening'
          ? 'rgb(211, 47, 47)'
          : 'rgb(158, 158, 158)',
        backgroundColor: data.trend === 'improving'
          ? 'rgba(76, 175, 80, 0.5)'
          : data.trend === 'worsening'
          ? 'rgba(211, 47, 47, 0.5)'
          : 'rgba(158, 158, 158, 0.5)',
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
        display: false,
      },
      tooltip: {
        callbacks: {
          label: (context: any) => {
            return `Risk Score: ${context.parsed.y}`;
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
          text: 'Weighted Risk Score',
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
            Risk Score Trend
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
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
            <Typography variant="h6">
              Risk Score Trend
            </Typography>
            <Chip
              icon={trendConfig.icon}
              label={trendConfig.label}
              color={trendConfig.color}
              size="small"
            />
          </Box>
          <Typography variant="body2" color="text.secondary">
            Weighted aggregate risk score (Critical=10, High=5, Medium=3, Low=1)
          </Typography>
        </Box>

        {/* Metrics */}
        <Box sx={{ display: 'flex', gap: 3, mb: 2, flexWrap: 'wrap' }}>
          <Box>
            <Typography variant="body2" color="text.secondary">
              Current Score
            </Typography>
            <Typography variant="h5" fontWeight="bold">
              {data.current_score}
            </Typography>
          </Box>
          <Box>
            <Typography variant="body2" color="text.secondary">
              Start Score
            </Typography>
            <Typography variant="h5">
              {data.start_score}
            </Typography>
          </Box>
          <Box>
            <Typography variant="body2" color="text.secondary">
              Change
            </Typography>
            <Typography
              variant="h5"
              color={
                data.change_percent < 0
                  ? 'success.main'
                  : data.change_percent > 0
                  ? 'error.main'
                  : 'text.primary'
              }
              fontWeight="bold"
            >
              {data.change_percent > 0 ? '+' : ''}{data.change_percent.toFixed(1)}%
            </Typography>
          </Box>
        </Box>

        <Box sx={{ height: 350 }}>
          <Line data={chartData} options={options} />
        </Box>
      </CardContent>
    </Card>
  );
};

export default RiskScoreTrendChart;
