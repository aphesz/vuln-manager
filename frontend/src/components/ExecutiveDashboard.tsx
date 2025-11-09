/**
 * ExecutiveDashboard - High-level KPIs and visualizations for C-level stakeholders
 * 
 * Features:
 * - Total projects and findings overview
 * - MTTR (Mean Time To Remediation) metric
 * - Trend direction with percentage change
 * - Compliance coverage gauges (OWASP, CWE, ATT&CK)
 * - Open critical/high findings alert
 * - Risk heat map grid
 * - Top 5 risky projects list
 */

import React, { useEffect, useState } from 'react';
import {
  Typography,
  Grid,
  Card,
  CardContent,
  CircularProgress,
  Alert,
  Box,
  Chip,
  LinearProgress,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tooltip,
  IconButton,
} from '@mui/material';
import {
  TrendingUp,
  TrendingDown,
  TrendingFlat,
  Business,
  BugReport,
  Schedule,
  Shield,
  Warning,
  CheckCircle,
  Launch,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import {
  getExecutiveSummary,
  getRiskHeatMap,
  type ExecutiveSummaryResponse,
  type RiskHeatMapResponse,
} from '../services/ExecutiveService';

const ExecutiveDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [summary, setSummary] = useState<ExecutiveSummaryResponse | null>(null);
  const [heatMap, setHeatMap] = useState<RiskHeatMapResponse>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadExecutiveData();
  }, []);

  const loadExecutiveData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [summaryData, heatMapData] = await Promise.all([
        getExecutiveSummary(),
        getRiskHeatMap(),
      ]);
      setSummary(summaryData);
      setHeatMap(heatMapData);
    } catch (err: any) {
      console.error('Error loading executive data:', err);
      setError(err.response?.data?.detail || 'Failed to load executive dashboard');
    } finally {
      setLoading(false);
    }
  };

  const getTrendIcon = (direction: string) => {
    switch (direction) {
      case 'improving':
        return <TrendingDown color="success" />;
      case 'worsening':
        return <TrendingUp color="error" />;
      default:
        return <TrendingFlat color="action" />;
    }
  };

  const getTrendColor = (direction: string) => {
    switch (direction) {
      case 'improving':
        return 'success';
      case 'worsening':
        return 'error';
      default:
        return 'default';
    }
  };

  const getColorHex = (color: string): string => {
    switch (color) {
      case 'red':
        return '#f44336';
      case 'orange':
        return '#ff9800';
      case 'yellow':
        return '#ffc107';
      case 'green':
        return '#4caf50';
      default:
        return '#9e9e9e';
    }
  };

  if (loading) {
    return (
      <Box sx={{ p: { xs: 1, sm: 2, md: 3 } }}>
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 8 }}>
          <CircularProgress size={60} />
        </Box>
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: { xs: 1, sm: 2, md: 3 } }}>
        <Alert severity="error" sx={{ mt: 2 }}>
          {error}
        </Alert>
      </Box>
    );
  }

  if (!summary) {
    return (
      <Box sx={{ p: { xs: 1, sm: 2, md: 3 } }}>
        <Alert severity="info" sx={{ mt: 2 }}>
          No executive data available.
        </Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ p: { xs: 1, sm: 2, md: 3 } }}>
      <Typography variant="h4" gutterBottom sx={{ mt: 2, mb: 3, fontWeight: 'bold' }}>
        Executive Dashboard
      </Typography>

      {/* Alert for open critical/high findings */}
      {summary.open_critical_high > 0 && (
        <Alert severity="error" icon={<Warning />} sx={{ mb: 3 }}>
          <strong>{summary.open_critical_high}</strong> open critical/high severity findings require immediate attention.
        </Alert>
      )}

      {/* Key Metrics Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {/* Total Projects */}
        <Grid item xs={12} sm={6} md={3}>
          <Card elevation={2}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <Business color="primary" sx={{ mr: 1 }} />
                <Typography color="textSecondary" variant="body2">
                  Active Projects
                </Typography>
              </Box>
              <Typography variant="h3" fontWeight="bold">
                {summary.total_projects}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* Total Findings */}
        <Grid item xs={12} sm={6} md={3}>
          <Card elevation={2}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <BugReport color="secondary" sx={{ mr: 1 }} />
                <Typography color="textSecondary" variant="body2">
                  Total Findings
                </Typography>
              </Box>
              <Typography variant="h3" fontWeight="bold">
                {summary.total_findings}
              </Typography>
              <Box sx={{ mt: 1 }}>
                <Chip
                  label={`${summary.findings_by_severity.critical} Critical`}
                  color="error"
                  size="small"
                  sx={{ mr: 0.5, mb: 0.5 }}
                />
                <Chip
                  label={`${summary.findings_by_severity.high} High`}
                  color="warning"
                  size="small"
                  sx={{ mr: 0.5, mb: 0.5 }}
                />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* MTTR */}
        <Grid item xs={12} sm={6} md={3}>
          <Card elevation={2}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <Schedule color="info" sx={{ mr: 1 }} />
                <Typography color="textSecondary" variant="body2">
                  MTTR (Days)
                </Typography>
              </Box>
              <Typography variant="h3" fontWeight="bold">
                {summary.mttr_days}
              </Typography>
              <Typography variant="caption" color="textSecondary">
                Mean Time To Remediation
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* Trend Direction */}
        <Grid item xs={12} sm={6} md={3}>
          <Card elevation={2}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                {getTrendIcon(summary.trend.trend_direction)}
                <Typography color="textSecondary" variant="body2" sx={{ ml: 1 }}>
                  Trend (30 Days)
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'baseline' }}>
                <Typography variant="h3" fontWeight="bold">
                  {summary.trend.trend_direction}
                </Typography>
              </Box>
              <Chip
                label={`${summary.trend.percentage_change > 0 ? '+' : ''}${summary.trend.percentage_change}%`}
                color={getTrendColor(summary.trend.trend_direction) as any}
                size="small"
                sx={{ mt: 1 }}
              />
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Compliance Coverage */}
      <Card elevation={2} sx={{ mb: 4 }}>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
            <Shield color="primary" sx={{ mr: 1 }} />
            <Typography variant="h6" fontWeight="bold">
              Compliance Coverage
            </Typography>
          </Box>
          <Grid container spacing={3}>
            <Grid item xs={12} md={4}>
              <Typography variant="body2" color="textSecondary" gutterBottom>
                OWASP Top 10 (2021)
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <Box sx={{ width: '100%', mr: 1 }}>
                  <LinearProgress
                    variant="determinate"
                    value={summary.compliance_coverage.owasp_coverage}
                    sx={{ height: 10, borderRadius: 5 }}
                  />
                </Box>
                <Typography variant="body2" fontWeight="bold" sx={{ minWidth: 50 }}>
                  {summary.compliance_coverage.owasp_coverage.toFixed(1)}%
                </Typography>
              </Box>
            </Grid>
            <Grid item xs={12} md={4}>
              <Typography variant="body2" color="textSecondary" gutterBottom>
                CWE Top 25
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <Box sx={{ width: '100%', mr: 1 }}>
                  <LinearProgress
                    variant="determinate"
                    value={summary.compliance_coverage.cwe_coverage}
                    color="secondary"
                    sx={{ height: 10, borderRadius: 5 }}
                  />
                </Box>
                <Typography variant="body2" fontWeight="bold" sx={{ minWidth: 50 }}>
                  {summary.compliance_coverage.cwe_coverage.toFixed(1)}%
                </Typography>
              </Box>
            </Grid>
            <Grid item xs={12} md={4}>
              <Typography variant="body2" color="textSecondary" gutterBottom>
                MITRE ATT&CK
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <Box sx={{ width: '100%', mr: 1 }}>
                  <LinearProgress
                    variant="determinate"
                    value={summary.compliance_coverage.attack_coverage}
                    color="info"
                    sx={{ height: 10, borderRadius: 5 }}
                  />
                </Box>
                <Typography variant="body2" fontWeight="bold" sx={{ minWidth: 50 }}>
                  {summary.compliance_coverage.attack_coverage.toFixed(1)}%
                </Typography>
              </Box>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Top Risky Projects */}
      <Card elevation={2} sx={{ mb: 4 }}>
        <CardContent>
          <Typography variant="h6" fontWeight="bold" gutterBottom>
            Top 5 Risky Projects
          </Typography>
          <TableContainer component={Paper} variant="outlined" sx={{ mt: 2 }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell><strong>Project</strong></TableCell>
                  <TableCell align="center"><strong>Risk Score</strong></TableCell>
                  <TableCell align="center"><strong>Total Findings</strong></TableCell>
                  <TableCell align="center"><strong>Open Crit/High</strong></TableCell>
                  <TableCell align="center"><strong>Critical</strong></TableCell>
                  <TableCell align="center"><strong>High</strong></TableCell>
                  <TableCell align="center"><strong>Medium</strong></TableCell>
                  <TableCell align="center"><strong>Actions</strong></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {summary.top_risky_projects.map((project) => (
                  <TableRow key={project.project_id} hover>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <Box
                          sx={{
                            width: 12,
                            height: 12,
                            borderRadius: '50%',
                            bgcolor: getColorHex(project.color),
                            mr: 1,
                          }}
                        />
                        {project.project_name}
                      </Box>
                    </TableCell>
                    <TableCell align="center">
                      <Chip
                        label={project.risk_score}
                        sx={{
                          bgcolor: getColorHex(project.color),
                          color: 'white',
                          fontWeight: 'bold',
                        }}
                        size="small"
                      />
                    </TableCell>
                    <TableCell align="center">{project.total_findings}</TableCell>
                    <TableCell align="center">
                      {project.open_critical_high > 0 ? (
                        <Chip
                          label={project.open_critical_high}
                          color="error"
                          size="small"
                        />
                      ) : (
                        <CheckCircle color="success" fontSize="small" />
                      )}
                    </TableCell>
                    <TableCell align="center">{project.severity_counts.critical}</TableCell>
                    <TableCell align="center">{project.severity_counts.high}</TableCell>
                    <TableCell align="center">{project.severity_counts.medium}</TableCell>
                    <TableCell align="center">
                      <Tooltip title="View Project">
                        <IconButton
                          size="small"
                          onClick={() => navigate(`/projects/${project.project_id}`)}
                        >
                          <Launch fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>

      {/* Risk Heat Map */}
      <Card elevation={2}>
        <CardContent>
          <Typography variant="h6" fontWeight="bold" gutterBottom>
            Risk Heat Map - All Projects
          </Typography>
          <TableContainer component={Paper} variant="outlined" sx={{ mt: 2, maxHeight: 600 }}>
            <Table size="small" stickyHeader>
              <TableHead>
                <TableRow>
                  <TableCell><strong>Project</strong></TableCell>
                  <TableCell align="center"><strong>Risk Score</strong></TableCell>
                  <TableCell align="center"><strong>Total Findings</strong></TableCell>
                  <TableCell align="center"><strong>Open Crit/High</strong></TableCell>
                  <TableCell align="center"><strong>Critical</strong></TableCell>
                  <TableCell align="center"><strong>High</strong></TableCell>
                  <TableCell align="center"><strong>Medium</strong></TableCell>
                  <TableCell align="center"><strong>Low</strong></TableCell>
                  <TableCell align="center"><strong>Info</strong></TableCell>
                  <TableCell align="center"><strong>Actions</strong></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {heatMap.map((project) => (
                  <TableRow
                    key={project.project_id}
                    hover
                    sx={{
                      opacity: project.is_archived ? 0.6 : 1,
                      bgcolor: project.is_archived ? 'action.hover' : 'inherit',
                    }}
                  >
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <Box
                          sx={{
                            width: 12,
                            height: 12,
                            borderRadius: '50%',
                            bgcolor: getColorHex(project.color),
                            mr: 1,
                          }}
                        />
                        {project.project_name}
                        {project.is_archived && (
                          <Chip label="Archived" size="small" sx={{ ml: 1 }} />
                        )}
                      </Box>
                    </TableCell>
                    <TableCell align="center">
                      <Chip
                        label={project.risk_score}
                        sx={{
                          bgcolor: getColorHex(project.color),
                          color: 'white',
                          fontWeight: 'bold',
                        }}
                        size="small"
                      />
                    </TableCell>
                    <TableCell align="center">{project.total_findings}</TableCell>
                    <TableCell align="center">
                      {project.open_critical_high > 0 ? (
                        <Chip
                          label={project.open_critical_high}
                          color="error"
                          size="small"
                        />
                      ) : (
                        <CheckCircle color="success" fontSize="small" />
                      )}
                    </TableCell>
                    <TableCell align="center">{project.severity_counts.critical}</TableCell>
                    <TableCell align="center">{project.severity_counts.high}</TableCell>
                    <TableCell align="center">{project.severity_counts.medium}</TableCell>
                    <TableCell align="center">{project.severity_counts.low}</TableCell>
                    <TableCell align="center">{project.severity_counts.informational}</TableCell>
                    <TableCell align="center">
                      <Tooltip title="View Project">
                        <IconButton
                          size="small"
                          onClick={() => navigate(`/projects/${project.project_id}`)}
                        >
                          <Launch fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>

      <Box sx={{ mt: 2, textAlign: 'right' }}>
        <Typography variant="caption" color="textSecondary">
          Generated at: {new Date(summary.generated_at).toLocaleString()}
        </Typography>
      </Box>
    </Box>
  );
};

export default ExecutiveDashboard;
