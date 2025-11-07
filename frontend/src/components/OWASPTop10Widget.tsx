/**
 * OWASP Top 10 2021 Compliance Widget
 * 
 * Shows OWASP Top 10 coverage for a project with:
 * - Bar chart showing findings per category
 * - Coverage statistics
 * - Color-coded risk levels
 * - Link to detailed compliance view
 */

import React, { useEffect, useState } from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  Chip,
  LinearProgress,
  Alert,
  Skeleton,
  Button
} from '@mui/material';
import {
  Security as SecurityIcon,
  ArrowForward as ArrowForwardIcon,
  CheckCircle as CheckCircleIcon,
  Warning as WarningIcon
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import OWASPComplianceService, {
  OWASPCategory,
  OWASPStatistics
} from '../services/OWASPComplianceService';

interface OWASPTop10WidgetProps {
  projectId: number;
}

const OWASPTop10Widget: React.FC<OWASPTop10WidgetProps> = ({ projectId }) => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [categories, setCategories] = useState<Record<string, OWASPCategory>>({});
  const [statistics, setStatistics] = useState<OWASPStatistics | null>(null);

  useEffect(() => {
    loadCoverage();
  }, [projectId]);

  const loadCoverage = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await OWASPComplianceService.getCoverage(projectId);
      setCategories(data.categories);
      setStatistics(data.statistics);
    } catch (err) {
      setError('Failed to load OWASP coverage data');
      console.error('Error loading OWASP coverage:', err);
    } finally {
      setLoading(false);
    }
  };

  // Get top 5 categories by finding count
  const getTopCategories = () => {
    const sorted = OWASPComplianceService.sortCategoriesByCount(categories);
    return sorted.slice(0, 5);
  };

  if (loading) {
    return (
      <Card>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
            <SecurityIcon sx={{ mr: 1, color: 'primary.main' }} />
            <Typography variant="h6">OWASP Top 10 Coverage</Typography>
            <Skeleton variant="rectangular" sx={{ ml: 'auto', width: 60, height: 24 }} />
          </Box>
          <Skeleton variant="rectangular" height={200} />
          <Box sx={{ mt: 2 }}>
            <Skeleton variant="rectangular" height={36} />
          </Box>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
            <SecurityIcon sx={{ mr: 1, color: 'primary.main' }} />
            <Typography variant="h6">OWASP Top 10 Coverage</Typography>
          </Box>
          <Alert severity="error">{error}</Alert>
        </CardContent>
      </Card>
    );
  }

  const topCategories = getTopCategories();
  const maxCount = topCategories[0]?.[1].finding_count || 1;

  return (
    <Card>
      <CardContent>
        {/* Header */}
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <SecurityIcon sx={{ mr: 1, color: 'primary.main' }} />
          <Typography variant="h6">OWASP Top 10 Coverage</Typography>
          {statistics && (
            <Chip
              label={`${statistics.coverage_percentage}%`}
              size="small"
              sx={{
                ml: 'auto',
                bgcolor: OWASPComplianceService.getCoverageStatusColor(
                  statistics.coverage_percentage
                ),
                color: 'white'
              }}
            />
          )}
        </Box>

        {/* Summary Statistics */}
        {statistics && (
          <Box sx={{ mb: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                {statistics.categories_with_findings === statistics.total_categories ? (
                  <WarningIcon sx={{ color: 'error.main', fontSize: 16, mr: 0.5 }} />
                ) : (
                  <CheckCircleIcon sx={{ color: 'success.main', fontSize: 16, mr: 0.5 }} />
                )}
                <Typography variant="body2" color="text.secondary">
                  {statistics.categories_with_findings} of {statistics.total_categories} categories affected
                </Typography>
              </Box>
              <Typography variant="body2" fontWeight="bold">
                {statistics.total_findings} findings
              </Typography>
            </Box>

            {statistics.unmapped_findings > 0 && (
              <Typography variant="caption" color="warning.main">
                {statistics.unmapped_findings} findings not mapped to OWASP categories
              </Typography>
            )}
          </Box>
        )}

        {/* Top 5 Categories Bar Chart */}
        <Box sx={{ mb: 2 }}>
          {topCategories.length === 0 ? (
            <Alert severity="success" icon={<CheckCircleIcon />}>
              No OWASP Top 10 vulnerabilities detected! 🎉
            </Alert>
          ) : (
            topCategories.map(([categoryId, category]) => {
              const percentage = (category.finding_count / maxCount) * 100;
              const color = OWASPComplianceService.getCategoryColor(category.finding_count);

              return (
                <Box key={categoryId} sx={{ mb: 1.5 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                    <Typography variant="body2" fontWeight="bold">
                      {categoryId}: {category.name}
                    </Typography>
                    <Chip
                      label={category.finding_count}
                      size="small"
                      sx={{
                        bgcolor: color,
                        color: 'white',
                        height: 20,
                        fontSize: '0.7rem'
                      }}
                    />
                  </Box>
                  <LinearProgress
                    variant="determinate"
                    value={percentage}
                    sx={{
                      height: 8,
                      borderRadius: 1,
                      bgcolor: 'grey.200',
                      '& .MuiLinearProgress-bar': {
                        bgcolor: color,
                        borderRadius: 1
                      }
                    }}
                  />
                </Box>
              );
            })
          )}
        </Box>

        {/* Footer */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 2 }}>
          <Typography variant="caption" color="text.secondary">
            OWASP Top 10 2021
          </Typography>
          <Button
            size="small"
            endIcon={<ArrowForwardIcon />}
            onClick={() => navigate(`/projects/${projectId}/compliance/owasp`)}
            disabled
            sx={{ textTransform: 'none' }}
          >
            View Full Report
          </Button>
        </Box>
      </CardContent>
    </Card>
  );
};

export default OWASPTop10Widget;
