/** @jsxRuntime classic */
/** @jsx React.createElement */
/** @jsxFrag React.Fragment */

import React, { useState, useEffect } from 'react';
import {
  Card,
  CardHeader,
  CardContent,
  Grid,
  Typography,
  Box,
  Chip,
  LinearProgress,
  Stack,
  Divider,
} from '@mui/material';
import {
  Storage as StorageIcon,
  VerifiedUser as VerifiedIcon,
  Security as SecurityIcon,
  Insights as InsightsIcon,
} from '@mui/icons-material';
import axios from 'axios';

interface TemplateAnalyticsData {
  total_templates: number;
  by_source: Record<string, number>;
  by_risk_rating: Record<string, number>;
  most_used: Array<{
    template_id: number;
    title: string;
    usage_count: number;
    risk_rating: string | null;
  }>;
  quality_metrics: {
    with_cvss: number;
    with_cwe: number;
    verified: number;
    cvss_coverage_pct: number;
    cwe_coverage_pct: number;
    verification_rate_pct: number;
  };
  attack_techniques: {
    templates_with_attack: number;
    total_techniques_mapped: number;
    most_common_tactics: Array<{
      tactic: string;
      count: number;
    }>;
  };
}

const TemplateAnalytics: React.FC = () => {
  const [analytics, setAnalytics] = useState<TemplateAnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    try {
      const response = await axios.get('/api/vulnerability-templates/analytics');
      setAnalytics(response.data);
    } catch (error) {
      console.error('Error fetching template analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader
          title={
            <Box display="flex" alignItems="center" gap={1}>
              <InsightsIcon color="primary" />
              <Typography variant="h6">Repository Analytics</Typography>
            </Box>
          }
        />
        <CardContent>
          <LinearProgress />
        </CardContent>
      </Card>
    );
  }

  if (!analytics) {
    return null;
  }

  const getRiskColor = (risk: string) => {
    const colors: Record<string, string> = {
      Critical: '#d32f2f',
      High: '#f57c00',
      Medium: '#fbc02d',
      Low: '#388e3c',
      None: '#9e9e9e',
    };
    return colors[risk] || '#9e9e9e';
  };

  return (
    <Card sx={{ mb: 3 }}>
      <CardHeader
        title={
          <Box display="flex" alignItems="center" gap={1}>
            <InsightsIcon color="primary" />
            <Typography variant="h6">Repository Analytics</Typography>
          </Box>
        }
        subheader={`${analytics.total_templates} templates in repository`}
      />
      <CardContent>
        <Grid container spacing={3}>
          {/* Quality Metrics */}
          <Grid item xs={12} md={4}>
            <Box>
              <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
                <VerifiedIcon sx={{ fontSize: 16, mr: 0.5, verticalAlign: 'middle' }} />
                Data Quality
              </Typography>
              
              <Box sx={{ mb: 1.5 }}>
                <Box display="flex" justifyContent="space-between" alignItems="center" sx={{ mb: 0.5 }}>
                  <Typography variant="body2">CVSS Coverage</Typography>
                  <Typography variant="body2" fontWeight="600">
                    {analytics.quality_metrics.cvss_coverage_pct}%
                  </Typography>
                </Box>
                <LinearProgress
                  variant="determinate"
                  value={analytics.quality_metrics.cvss_coverage_pct}
                  sx={{ height: 6, borderRadius: 1 }}
                />
              </Box>

              <Box sx={{ mb: 1.5 }}>
                <Box display="flex" justifyContent="space-between" alignItems="center" sx={{ mb: 0.5 }}>
                  <Typography variant="body2">CWE Coverage</Typography>
                  <Typography variant="body2" fontWeight="600">
                    {analytics.quality_metrics.cwe_coverage_pct}%
                  </Typography>
                </Box>
                <LinearProgress
                  variant="determinate"
                  value={analytics.quality_metrics.cwe_coverage_pct}
                  sx={{ height: 6, borderRadius: 1 }}
                  color="secondary"
                />
              </Box>

              <Box>
                <Box display="flex" justifyContent="space-between" alignItems="center" sx={{ mb: 0.5 }}>
                  <Typography variant="body2">Verification Rate</Typography>
                  <Typography variant="body2" fontWeight="600">
                    {analytics.quality_metrics.verification_rate_pct}%
                  </Typography>
                </Box>
                <LinearProgress
                  variant="determinate"
                  value={analytics.quality_metrics.verification_rate_pct}
                  sx={{ height: 6, borderRadius: 1 }}
                  color="success"
                />
              </Box>
            </Box>
          </Grid>

          {/* Source Distribution */}
          <Grid item xs={12} md={4}>
            <Box>
              <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
                <StorageIcon sx={{ fontSize: 16, mr: 0.5, verticalAlign: 'middle' }} />
                By Source
              </Typography>
              <Stack spacing={1}>
                {Object.entries(analytics.by_source)
                  .sort((a, b) => b[1] - a[1])
                  .map(([source, count]) => (
                    <Box
                      key={source}
                      display="flex"
                      justifyContent="space-between"
                      alignItems="center"
                    >
                      <Chip
                        label={source}
                        size="small"
                        variant="outlined"
                        sx={{ minWidth: 80 }}
                      />
                      <Typography variant="body2" fontWeight="600">
                        {count}
                      </Typography>
                    </Box>
                  ))}
              </Stack>
            </Box>
          </Grid>

          {/* Risk Distribution */}
          <Grid item xs={12} md={4}>
            <Box>
              <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
                <SecurityIcon sx={{ fontSize: 16, mr: 0.5, verticalAlign: 'middle' }} />
                By Risk Rating
              </Typography>
              <Stack spacing={1}>
                {Object.entries(analytics.by_risk_rating)
                  .filter(([risk]) => risk !== 'None')
                  .sort((a, b) => {
                    const order = ['Critical', 'High', 'Medium', 'Low'];
                    return order.indexOf(a[0]) - order.indexOf(b[0]);
                  })
                  .map(([risk, count]) => (
                    <Box
                      key={risk}
                      display="flex"
                      justifyContent="space-between"
                      alignItems="center"
                    >
                      <Chip
                        label={risk}
                        size="small"
                        sx={{
                          bgcolor: getRiskColor(risk),
                          color: 'white',
                          fontWeight: 600,
                          minWidth: 80,
                        }}
                      />
                      <Typography variant="body2" fontWeight="600">
                        {count}
                      </Typography>
                    </Box>
                  ))}
              </Stack>
            </Box>
          </Grid>

          {/* ATT&CK Techniques */}
          {analytics.attack_techniques.templates_with_attack > 0 && (
            <>
              <Grid item xs={12}>
                <Divider sx={{ my: 1 }} />
              </Grid>
              <Grid item xs={12}>
                <Box>
                  <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
                    <SecurityIcon sx={{ fontSize: 16, mr: 0.5, verticalAlign: 'middle' }} />
                    MITRE ATT&CK Coverage
                  </Typography>
                  <Grid container spacing={2}>
                    <Grid item xs={12} sm={6} md={3}>
                      <Box textAlign="center" sx={{ p: 1.5, bgcolor: 'background.default', borderRadius: 1 }}>
                        <Typography variant="h4" color="primary" fontWeight="700">
                          {analytics.attack_techniques.templates_with_attack}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          Templates Mapped
                        </Typography>
                      </Box>
                    </Grid>
                    <Grid item xs={12} sm={6} md={3}>
                      <Box textAlign="center" sx={{ p: 1.5, bgcolor: 'background.default', borderRadius: 1 }}>
                        <Typography variant="h4" color="secondary" fontWeight="700">
                          {analytics.attack_techniques.total_techniques_mapped}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          Total Techniques
                        </Typography>
                      </Box>
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 0.5 }}>
                        Top Tactics:
                      </Typography>
                      <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
                        {analytics.attack_techniques.most_common_tactics.map((tactic) => (
                          <Chip
                            key={tactic.tactic}
                            label={`${tactic.tactic} (${tactic.count})`}
                            size="small"
                            variant="outlined"
                            color="secondary"
                          />
                        ))}
                      </Stack>
                    </Grid>
                  </Grid>
                </Box>
              </Grid>
            </>
          )}
        </Grid>
      </CardContent>
    </Card>
  );
};

export default TemplateAnalytics;
