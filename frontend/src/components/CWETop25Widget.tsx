/**
 * CWE Top 25 2024 Compliance Widget
 * 
 * Shows MITRE CWE Top 25 Most Dangerous Software Weaknesses coverage:
 * - List view of top weaknesses by finding count
 * - Severity indicators
 * - Coverage statistics
 * - Link to detailed compliance view
 */

import React, { useEffect, useState } from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  Chip,
  Alert,
  Skeleton,
  Button,
  List,
  ListItem,
  ListItemText,
  LinearProgress
} from '@mui/material';
import {
  Shield as ShieldIcon,
  ArrowForward as ArrowForwardIcon,
  CheckCircle as CheckCircleIcon,
  Warning as WarningIcon,
  Error as ErrorIcon
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import CWETop25Service, {
  CWEWeakness,
  CWEStatistics
} from '../services/CWETop25Service';

interface CWETop25WidgetProps {
  projectId: number;
}

const CWETop25Widget: React.FC<CWETop25WidgetProps> = ({ projectId }) => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [weaknesses, setWeaknesses] = useState<CWEWeakness[]>([]);
  const [statistics, setStatistics] = useState<CWEStatistics | null>(null);

  useEffect(() => {
    loadCoverage();
  }, [projectId]);

  const loadCoverage = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await CWETop25Service.getCoverage(projectId);
      setWeaknesses(data.weaknesses.slice(0, 5)); // Top 5
      setStatistics(data.statistics);
    } catch (err) {
      setError('Failed to load CWE Top 25 data');
      console.error('Error loading CWE coverage:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
            <ShieldIcon sx={{ mr: 1, color: 'primary.main' }} />
            <Typography variant="h6">CWE Top 25 Coverage</Typography>
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
            <ShieldIcon sx={{ mr: 1, color: 'primary.main' }} />
            <Typography variant="h6">CWE Top 25 Coverage</Typography>
          </Box>
          <Alert severity="error">{error}</Alert>
        </CardContent>
      </Card>
    );
  }

  const maxCount = weaknesses[0]?.finding_count || 1;

  return (
    <Card>
      <CardContent>
        {/* Header */}
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <ShieldIcon sx={{ mr: 1, color: 'primary.main' }} />
          <Typography variant="h6">CWE Top 25 Coverage</Typography>
          {statistics && (
            <Chip
              label={`${statistics.coverage_percentage}%`}
              size="small"
              sx={{
                ml: 'auto',
                bgcolor: CWETop25Service.getCoverageStatusColor(
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
                {statistics.weaknesses_found === 0 ? (
                  <CheckCircleIcon sx={{ color: 'success.main', fontSize: 16, mr: 0.5 }} />
                ) : statistics.critical_findings > 0 ? (
                  <ErrorIcon sx={{ color: 'error.main', fontSize: 16, mr: 0.5 }} />
                ) : (
                  <WarningIcon sx={{ color: 'warning.main', fontSize: 16, mr: 0.5 }} />
                )}
                <Typography variant="body2" color="text.secondary">
                  {statistics.weaknesses_found} of 25 weaknesses found
                </Typography>
              </Box>
              <Typography variant="body2" fontWeight="bold">
                {statistics.total_findings} findings
              </Typography>
            </Box>

            {statistics.critical_findings > 0 && (
              <Typography variant="caption" color="error.main">
                ⚠️ {statistics.critical_findings} critical severity findings
              </Typography>
            )}
          </Box>
        )}

        {/* Top 5 Weaknesses List */}
        <Box sx={{ mb: 2 }}>
          {weaknesses.length === 0 ? (
            <Alert severity="success" icon={<CheckCircleIcon />}>
              No CWE Top 25 weaknesses detected! 🎉
            </Alert>
          ) : (
            <List dense sx={{ py: 0 }}>
              {weaknesses.map((weakness) => {
                const percentage = (weakness.finding_count / maxCount) * 100;
                const severityColor = CWETop25Service.getSeverityColor(weakness.severity);

                return (
                  <ListItem
                    key={weakness.cwe_id}
                    sx={{
                      px: 0,
                      py: 1,
                      borderBottom: '1px solid',
                      borderColor: 'divider',
                      '&:last-child': { borderBottom: 'none' }
                    }}
                  >
                    <Box sx={{ width: '100%' }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Chip
                            label={CWETop25Service.formatCweId(weakness.cwe_id)}
                            size="small"
                            sx={{
                              height: 20,
                              fontSize: '0.7rem',
                              fontWeight: 'bold',
                              bgcolor: severityColor,
                              color: 'white'
                            }}
                          />
                          <Typography variant="caption" color="text.secondary">
                            #{weakness.rank}
                          </Typography>
                        </Box>
                        <Chip
                          label={weakness.finding_count}
                          size="small"
                          sx={{
                            height: 20,
                            fontSize: '0.7rem',
                            bgcolor: severityColor,
                            color: 'white'
                          }}
                        />
                      </Box>
                      <Typography variant="body2" sx={{ mb: 0.5, fontSize: '0.85rem' }}>
                        {CWETop25Service.truncateName(weakness.name, 60)}
                      </Typography>
                      <LinearProgress
                        variant="determinate"
                        value={percentage}
                        sx={{
                          height: 6,
                          borderRadius: 1,
                          bgcolor: 'grey.200',
                          '& .MuiLinearProgress-bar': {
                            bgcolor: severityColor,
                            borderRadius: 1
                          }
                        }}
                      />
                    </Box>
                  </ListItem>
                );
              })}
            </List>
          )}
        </Box>

        {/* Footer */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 2 }}>
          <Typography variant="caption" color="text.secondary">
            MITRE CWE Top 25 2024
          </Typography>
          <Button
            size="small"
            endIcon={<ArrowForwardIcon />}
            onClick={() => navigate(`/projects/${projectId}/compliance/cwe`)}
            disabled
            sx={{ textTransform: 'none' }}
          >
            View Full List
          </Button>
        </Box>
      </CardContent>
    </Card>
  );
};

export default CWETop25Widget;
