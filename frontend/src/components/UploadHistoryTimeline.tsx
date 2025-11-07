/**
 * UploadHistoryTimeline - Vertical timeline showing upload events with risk distribution
 */

import React from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Paper,
  Chip,
  Divider,
} from '@mui/material';
import {
  Upload as UploadIcon,
  Assessment as AssessmentIcon,
  FiberManualRecord as DotIcon,
} from '@mui/icons-material';
import { format } from 'date-fns';
import type { UploadHistoryResponse } from '../services/TrendService';

interface UploadHistoryTimelineProps {
  data: UploadHistoryResponse;
  loading?: boolean;
}

const UploadHistoryTimeline: React.FC<UploadHistoryTimelineProps> = ({ data, loading }) => {
  // Risk colors
  const riskColors: { [key: string]: string } = {
    Critical: '#d32f2f',
    High: '#f57c00',
    Medium: '#fbc02d',
    Low: '#42a5f5',
    Informational: '#9e9e9e',
  };

  if (loading) {
    return (
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Upload History
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
            Upload History
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Timeline of scan uploads and their findings
          </Typography>
        </Box>

        {/* Summary Stats */}
        <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
          <Paper sx={{ p: 2, bgcolor: 'background.default', flex: 1, minWidth: 150 }}>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              Total Uploads
            </Typography>
            <Typography variant="h4" fontWeight="bold">
              {data.total_uploads}
            </Typography>
          </Paper>
          <Paper sx={{ p: 2, bgcolor: 'background.default', flex: 1, minWidth: 150 }}>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              Avg Findings per Upload
            </Typography>
            <Typography variant="h4" fontWeight="bold">
              {data.average_findings_per_upload.toFixed(1)}
            </Typography>
          </Paper>
        </Box>

        {/* Timeline */}
        {data.timeline && data.timeline.length > 0 ? (
          <Box sx={{ maxHeight: 500, overflowY: 'auto' }}>
            {data.timeline.map((upload, index) => {
              const uploadDate = new Date(upload.date);
              const totalFindings = Object.values(upload.risk_distribution).reduce((a, b) => a + b, 0);

              return (
                <Box key={index} sx={{ position: 'relative', pl: 4, pb: 3 }}>
                  {/* Timeline connector */}
                  {index < data.timeline!.length - 1 && (
                    <Box
                      sx={{
                        position: 'absolute',
                        left: '11px',
                        top: '24px',
                        bottom: '-12px',
                        width: '2px',
                        bgcolor: 'divider',
                      }}
                    />
                  )}

                  {/* Timeline dot */}
                  <Box
                    sx={{
                      position: 'absolute',
                      left: 0,
                      top: '8px',
                      width: '24px',
                      height: '24px',
                      borderRadius: '50%',
                      bgcolor: 'primary.main',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <UploadIcon sx={{ fontSize: 14, color: 'white' }} />
                  </Box>

                  {/* Upload card */}
                  <Paper
                    elevation={2}
                    sx={{
                      p: 2,
                      '&:hover': {
                        boxShadow: 4,
                      },
                    }}
                  >
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', mb: 1 }}>
                      <Box>
                        <Typography variant="subtitle1" fontWeight="bold">
                          {format(uploadDate, 'PPP')}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {format(uploadDate, 'p')}
                        </Typography>
                      </Box>
                      <Chip
                        icon={<AssessmentIcon />}
                        label={`${totalFindings} findings`}
                        size="small"
                        color="primary"
                        variant="outlined"
                      />
                    </Box>

                    {/* Risk Distribution */}
                    <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mt: 1 }}>
                      {Object.entries(upload.risk_distribution)
                        .filter(([_, count]) => count > 0)
                        .map(([risk, count]) => (
                          <Chip
                            key={risk}
                            label={`${risk}: ${count}`}
                            size="small"
                            sx={{
                              bgcolor: riskColors[risk],
                              color: 'white',
                              fontWeight: 'bold',
                              fontSize: '0.75rem',
                            }}
                          />
                        ))}
                    </Box>
                  </Paper>
                </Box>
              );
            })}
          </Box>
        ) : (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <Typography variant="body1" color="text.secondary">
              No uploads found in the selected time range
            </Typography>
          </Box>
        )}
      </CardContent>
    </Card>
  );
};

export default UploadHistoryTimeline;
