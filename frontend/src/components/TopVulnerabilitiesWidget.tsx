import React from 'react';
import { Card, CardContent, Typography, Box, Grid } from '@mui/material';
import {
  TrendingUp,
  BugReport,
} from '@mui/icons-material';

interface TopVulnerability {
  title: string;
  risk_rating: string;
  instance_count: number;
  finding_id: number;
}

interface TopVulnerabilitiesWidgetProps {
  vulnerabilities: TopVulnerability[];
}

const getRiskColor = (risk: string) => {
  switch (risk) {
    case 'Critical':
      return '#d32f2f';
    case 'High':
      return '#f57c00';
    case 'Medium':
      return '#fbc02d';
    case 'Low':
      return '#388e3c';
    default:
      return '#757575';
  }
};

export default function TopVulnerabilitiesWidget({
  vulnerabilities,
}: TopVulnerabilitiesWidgetProps) {
  return (
    <Card>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
          <TrendingUp sx={{ color: '#2196f3' }} />
          <Typography variant="h6">
            Top Vulnerabilities
          </Typography>
        </Box>
        
        {vulnerabilities.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 3 }}>
            <Typography variant="body2" color="text.secondary">
              No vulnerabilities found
            </Typography>
          </Box>
        ) : (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
            {vulnerabilities.map((vuln, index) => (
              <Box
                key={vuln.finding_id}
                sx={{
                  p: 1.5,
                  borderRadius: 1,
                  border: '1px solid',
                  borderColor: 'divider',
                  '&:hover': {
                    backgroundColor: 'action.hover',
                  },
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                      <Typography variant="body2" fontWeight="bold">
                        #{index + 1}
                      </Typography>
                      <Box
                        sx={{
                          px: 1,
                          py: 0.25,
                          borderRadius: 0.5,
                          backgroundColor: getRiskColor(vuln.risk_rating),
                          color: 'white',
                        }}
                      >
                        <Typography variant="caption" fontWeight="bold">
                          {vuln.risk_rating}
                        </Typography>
                      </Box>
                    </Box>
                    <Typography
                      variant="body2"
                      sx={{
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {vuln.title}
                    </Typography>
                  </Box>
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 0.5,
                      ml: 2,
                      flexShrink: 0,
                    }}
                  >
                    <BugReport sx={{ fontSize: 16, color: 'text.secondary' }} />
                    <Typography variant="body2" fontWeight="bold">
                      {vuln.instance_count}
                    </Typography>
                  </Box>
                </Box>
              </Box>
            ))}
          </Box>
        )}
        
        <Box sx={{ mt: 2, pt: 2, borderTop: '1px solid', borderColor: 'divider' }}>
          <Typography variant="caption" color="text.secondary" align="center" display="block">
            Ranked by number of instances
          </Typography>
        </Box>
      </CardContent>
    </Card>
  );
}
