/**
 * TrendAnalysisPage - Main page for trend analysis and historical data visualization
 */

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Container,
  Typography,
  Button,
  Grid,
  Paper,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  IconButton,
  Breadcrumbs,
  Link,
  Alert,
  CircularProgress,
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  Refresh as RefreshIcon,
  DateRange as DateRangeIcon,
  TrendingUp as TrendingUpIcon,
} from '@mui/icons-material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { format, subDays } from 'date-fns';

import TrendService, {
  type FindingsTimelineResponse,
  type RemediationProgressResponse,
  type RiskScoreTrendResponse,
  type UploadHistoryResponse,
  type Granularity,
} from '../services/TrendService';
import PageBreadcrumbs from './PageBreadcrumbs';
import FindingsTimelineChart from './FindingsTimelineChart';
import RiskScoreTrendChart from './RiskScoreTrendChart';
import RemediationProgressChart from './RemediationProgressChart';
import UploadHistoryTimeline from './UploadHistoryTimeline';
import { useNotification } from '../contexts/NotificationContext';

const TrendAnalysisPage: React.FC = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const { showError, showSuccess } = useNotification();

  // Date range state
  const [startDate, setStartDate] = useState<Date>(subDays(new Date(), 30));
  const [endDate, setEndDate] = useState<Date>(new Date());
  const [granularity, setGranularity] = useState<Granularity>('daily');

  // Data state
  const [findingsData, setFindingsData] = useState<FindingsTimelineResponse | null>(null);
  const [remediationData, setRemediationData] = useState<RemediationProgressResponse | null>(null);
  const [riskScoreData, setRiskScoreData] = useState<RiskScoreTrendResponse | null>(null);
  const [uploadData, setUploadData] = useState<UploadHistoryResponse | null>(null);

  // Loading state
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch all trend data
  const fetchTrendData = async () => {
    if (!projectId) return;

    setLoading(true);
    setError(null);

    try {
      const params = {
        start_date: format(startDate, 'yyyy-MM-dd'),
        end_date: format(endDate, 'yyyy-MM-dd'),
        granularity,
      };

      // Fetch all trend endpoints in parallel
      const [findings, remediation, riskScore, uploads] = await Promise.all([
        TrendService.getFindingsTimeline(parseInt(projectId), params),
        TrendService.getRemediationProgress(parseInt(projectId), params),
        TrendService.getRiskScoreTrend(parseInt(projectId), params),
        TrendService.getUploadHistory(parseInt(projectId), {
          start_date: params.start_date,
          end_date: params.end_date,
        }),
      ]);

      setFindingsData(findings);
      setRemediationData(remediation);
      setRiskScoreData(riskScore);
      setUploadData(uploads);
    } catch (err: any) {
      console.error('Error fetching trend data:', err);
      setError(err.response?.data?.detail || 'Failed to load trend data');
      showError('Failed to load trend data');
    } finally {
      setLoading(false);
    }
  };

  // Load data on mount and when params change
  useEffect(() => {
    fetchTrendData();
  }, [projectId, startDate, endDate, granularity]);

  // Handle date range preset
  const setDateRangePreset = (days: number) => {
    setEndDate(new Date());
    setStartDate(subDays(new Date(), days));
  };

  if (!projectId) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Alert severity="error">Project ID is required</Alert>
      </Container>
    );
  }

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <Container maxWidth={false} sx={{ py: 4, px: { xs: 2, sm: 3, md: 4 } }}>
        {/* Breadcrumbs */}
        <PageBreadcrumbs projectId={projectId} />

        {/* Header */}
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <IconButton onClick={() => navigate(`/projects/${projectId}`)} size="small">
              <ArrowBackIcon />
            </IconButton>
            <Box>
              <Typography variant="h4" fontWeight="bold">
                <TrendingUpIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                Trend Analysis
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Historical data and security posture trends
              </Typography>
            </Box>
          </Box>
          <IconButton onClick={fetchTrendData} disabled={loading}>
            <RefreshIcon />
          </IconButton>
        </Box>

        {/* Controls */}
        <Paper sx={{ p: 2, mb: 3 }}>
          <Grid container spacing={2} alignItems="center">
            {/* Date Range Presets */}
            <Grid item xs={12} sm="auto">
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Quick Select
              </Typography>
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                <Button
                  size="small"
                  variant={startDate.getTime() === subDays(new Date(), 7).getTime() ? 'contained' : 'outlined'}
                  onClick={() => setDateRangePreset(7)}
                >
                  7 Days
                </Button>
                <Button
                  size="small"
                  variant={startDate.getTime() === subDays(new Date(), 30).getTime() ? 'contained' : 'outlined'}
                  onClick={() => setDateRangePreset(30)}
                >
                  30 Days
                </Button>
                <Button
                  size="small"
                  variant={startDate.getTime() === subDays(new Date(), 90).getTime() ? 'contained' : 'outlined'}
                  onClick={() => setDateRangePreset(90)}
                >
                  90 Days
                </Button>
              </Box>
            </Grid>

            {/* Date Pickers */}
            <Grid item xs={12} sm={3}>
              <DatePicker
                label="Start Date"
                value={startDate}
                onChange={(newValue) => newValue && setStartDate(newValue)}
                slotProps={{
                  textField: { size: 'small', fullWidth: true },
                }}
              />
            </Grid>
            <Grid item xs={12} sm={3}>
              <DatePicker
                label="End Date"
                value={endDate}
                onChange={(newValue) => newValue && setEndDate(newValue)}
                slotProps={{
                  textField: { size: 'small', fullWidth: true },
                }}
              />
            </Grid>

            {/* Granularity */}
            <Grid item xs={12} sm={2}>
              <FormControl fullWidth size="small">
                <InputLabel>Granularity</InputLabel>
                <Select
                  value={granularity}
                  label="Granularity"
                  onChange={(e) => setGranularity(e.target.value as Granularity)}
                >
                  <MenuItem value="daily">Daily</MenuItem>
                  <MenuItem value="weekly">Weekly</MenuItem>
                  <MenuItem value="monthly">Monthly</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </Paper>

        {/* Error Display */}
        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}

        {/* Loading State */}
        {loading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
            <CircularProgress />
          </Box>
        )}

        {/* Charts */}
        {!loading && !error && (
          <Grid container spacing={3}>
            {/* Findings Timeline */}
            <Grid item xs={12}>
              {findingsData && <FindingsTimelineChart data={findingsData} loading={loading} />}
            </Grid>

            {/* Risk Score Trend */}
            <Grid item xs={12} md={6}>
              {riskScoreData && <RiskScoreTrendChart data={riskScoreData} loading={loading} />}
            </Grid>

            {/* Remediation Progress */}
            <Grid item xs={12} md={6}>
              {remediationData && <RemediationProgressChart data={remediationData} loading={loading} />}
            </Grid>

            {/* Upload History */}
            <Grid item xs={12}>
              {uploadData && <UploadHistoryTimeline data={uploadData} loading={loading} />}
            </Grid>
          </Grid>
        )}
      </Container>
    </LocalizationProvider>
  );
};

export default TrendAnalysisPage;
