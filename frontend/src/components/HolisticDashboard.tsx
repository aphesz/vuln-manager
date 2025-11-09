import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  CircularProgress,
  Alert,
  Chip,
  useTheme,
  alpha,
} from '@mui/material';
import {
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  Folder as FolderIcon,
  BugReport as BugReportIcon,
  CheckCircle as CheckCircleIcon,
  Schedule as ScheduleIcon,
} from '@mui/icons-material';

const API_BASE_URL = process.env.REACT_APP_API_URL || '/api';

interface ProjectStats {
  total_projects: number;
  active_projects: number;
  archived_projects: number;
  total_findings: number;
  critical_findings: number;
  high_findings: number;
  medium_findings: number;
  low_findings: number;
  informational_findings: number;
  avg_findings_per_project: number;
  projects_with_critical: number;
  most_recent_upload?: string;
}

interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  color: string;
  subtitle?: string;
  trend?: {
    value: number;
    direction: 'up' | 'down';
  };
}

const StatCard: React.FC<StatCardProps> = ({ title, value, icon, color, subtitle, trend }) => {
  const theme = useTheme();

  return (
    <Card
      sx={{
        height: '100%',
        background: `linear-gradient(135deg, ${alpha(color, 0.1)} 0%, ${alpha(color, 0.05)} 100%)`,
        border: `1px solid ${alpha(color, 0.2)}`,
      }}
    >
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 2 }}>
          <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500 }}>
            {title}
          </Typography>
          <Box
            sx={{
              backgroundColor: alpha(color, 0.15),
              borderRadius: 1,
              p: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {icon}
          </Box>
        </Box>
        <Typography variant="h3" sx={{ fontWeight: 700, color, mb: 1 }}>
          {value}
        </Typography>
        {subtitle && (
          <Typography variant="body2" color="text.secondary">
            {subtitle}
          </Typography>
        )}
        {trend && (
          <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
            {trend.direction === 'up' ? (
              <TrendingUpIcon fontSize="small" sx={{ color: theme.palette.success.main, mr: 0.5 }} />
            ) : (
              <TrendingDownIcon fontSize="small" sx={{ color: theme.palette.error.main, mr: 0.5 }} />
            )}
            <Typography variant="caption" color={trend.direction === 'up' ? 'success.main' : 'error.main'}>
              {trend.value}% vs last month
            </Typography>
          </Box>
        )}
      </CardContent>
    </Card>
  );
};

const HolisticDashboard: React.FC = () => {
  const [stats, setStats] = useState<ProjectStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const theme = useTheme();

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await axios.get(`${API_BASE_URL}/projects/stats`);
      setStats(response.data);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to load dashboard statistics');
      console.error('Dashboard stats error:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error" sx={{ mt: 2 }}>
          {error}
        </Alert>
      </Box>
    );
  }

  if (!stats) {
    return null;
  }

  const riskDistribution = [
    { label: 'Critical', count: stats.critical_findings, color: theme.palette.error.main },
    { label: 'High', count: stats.high_findings, color: '#ff9800' },
    { label: 'Medium', count: stats.medium_findings, color: '#ffc107' },
    { label: 'Low', count: stats.low_findings, color: '#4caf50' },
    { label: 'Info', count: stats.informational_findings, color: theme.palette.info.main },
  ];

  const criticalHighPercentage = stats.total_findings > 0
    ? (((stats.critical_findings + stats.high_findings) / stats.total_findings) * 100).toFixed(1)
    : 0;

  return (
    <Box sx={{ p: { xs: 2, sm: 3 } }}>
      <Box sx={{ mb: 4, mt: 2 }}>
        <Typography variant="h4" sx={{ fontWeight: 700, mb: 1 }}>
          Portfolio Overview
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Holistic view of all security assessments and findings across your projects
        </Typography>
      </Box>

      {/* Key Metrics */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Total Projects"
            value={stats.total_projects}
            icon={<FolderIcon sx={{ color: theme.palette.primary.main }} />}
            color={theme.palette.primary.main}
            subtitle={`${stats.active_projects} active, ${stats.archived_projects} archived`}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Total Findings"
            value={stats.total_findings}
            icon={<BugReportIcon sx={{ color: theme.palette.warning.main }} />}
            color={theme.palette.warning.main}
            subtitle={`Avg ${stats.avg_findings_per_project.toFixed(1)} per project`}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Critical Findings"
            value={stats.critical_findings}
            icon={<BugReportIcon sx={{ color: theme.palette.error.main }} />}
            color={theme.palette.error.main}
            subtitle={`${stats.projects_with_critical} projects affected`}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="High Risk Ratio"
            value={`${criticalHighPercentage}%`}
            icon={<TrendingUpIcon sx={{ color: '#ff9800' }} />}
            color="#ff9800"
            subtitle="Critical + High findings"
          />
        </Grid>
      </Grid>

      {/* Risk Distribution */}
      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 3, fontWeight: 600 }}>
                Risk Distribution
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {riskDistribution.map((risk) => {
                  const percentage = stats.total_findings > 0
                    ? ((risk.count / stats.total_findings) * 100).toFixed(1)
                    : 0;
                  
                  return (
                    <Box key={risk.label}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Box
                            sx={{
                              width: 12,
                              height: 12,
                              borderRadius: '50%',
                              backgroundColor: risk.color,
                            }}
                          />
                          <Typography variant="body2" sx={{ fontWeight: 500 }}>
                            {risk.label}
                          </Typography>
                        </Box>
                        <Typography variant="body2" color="text.secondary">
                          {risk.count} ({percentage}%)
                        </Typography>
                      </Box>
                      <Box
                        sx={{
                          height: 8,
                          backgroundColor: alpha(risk.color, 0.1),
                          borderRadius: 1,
                          overflow: 'hidden',
                        }}
                      >
                        <Box
                          sx={{
                            height: '100%',
                            width: `${percentage}%`,
                            backgroundColor: risk.color,
                            transition: 'width 0.3s ease',
                          }}
                        />
                      </Box>
                    </Box>
                  );
                })}
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 3, fontWeight: 600 }}>
                Quick Stats
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="body2" color="text.secondary">
                    Active Projects
                  </Typography>
                  <Chip
                    label={stats.active_projects}
                    size="small"
                    color="primary"
                    sx={{ fontWeight: 600 }}
                  />
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="body2" color="text.secondary">
                    Archived Projects
                  </Typography>
                  <Chip
                    label={stats.archived_projects}
                    size="small"
                    variant="outlined"
                    sx={{ fontWeight: 600 }}
                  />
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="body2" color="text.secondary">
                    Projects with Critical Issues
                  </Typography>
                  <Chip
                    label={stats.projects_with_critical}
                    size="small"
                    color="error"
                    sx={{ fontWeight: 600 }}
                  />
                </Box>
                {stats.most_recent_upload && (
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography variant="body2" color="text.secondary">
                      Last Upload
                    </Typography>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      {new Date(stats.most_recent_upload).toLocaleDateString()}
                    </Typography>
                  </Box>
                )}
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default HolisticDashboard;
