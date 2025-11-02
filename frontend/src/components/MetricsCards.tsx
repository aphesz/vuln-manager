import React from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  useTheme,
} from '@mui/material';
import {
  BugReport,
  Error,
  Warning,
  Info,
} from '@mui/icons-material';

interface Finding {
  risk_rating: string;
  [key: string]: any;
}

interface MetricsCardsProps {
  findings: Finding[];
}

const MetricsCards: React.FC<MetricsCardsProps> = ({ findings }) => {
  const theme = useTheme();

  // Calculate metrics
  const totalFindings = findings.length;
  const criticalCount = findings.filter(f => f.risk_rating === 'Critical').length;
  const highCount = findings.filter(f => f.risk_rating === 'High').length;
  const mediumLowCount = findings.filter(f => 
    f.risk_rating === 'Medium' || f.risk_rating === 'Low' || f.risk_rating === 'None'
  ).length;

  const metrics = [
    {
      title: 'Total Findings',
      value: totalFindings,
      icon: <BugReport />,
      color: theme.palette.primary.main,
      bgColor: theme.palette.mode === 'dark' 
        ? 'rgba(144, 202, 249, 0.08)' 
        : 'rgba(25, 118, 210, 0.08)',
    },
    {
      title: 'Critical',
      value: criticalCount,
      icon: <Error />,
      color: '#d32f2f',
      bgColor: theme.palette.mode === 'dark'
        ? 'rgba(244, 67, 54, 0.08)'
        : 'rgba(211, 47, 47, 0.08)',
    },
    {
      title: 'High',
      value: highCount,
      icon: <Warning />,
      color: '#f57c00',
      bgColor: theme.palette.mode === 'dark'
        ? 'rgba(255, 152, 0, 0.08)'
        : 'rgba(245, 124, 0, 0.08)',
    },
    {
      title: 'Medium / Low',
      value: mediumLowCount,
      icon: <Info />,
      color: theme.palette.mode === 'dark' ? '#81c784' : '#388e3c',
      bgColor: theme.palette.mode === 'dark'
        ? 'rgba(129, 199, 132, 0.08)'
        : 'rgba(56, 142, 60, 0.08)',
    },
  ];

  return (
    <Box sx={{ mb: 3 }}>
      <Grid container spacing={2}>
        {metrics.map((metric, index) => (
          <Grid item xs={12} sm={6} md={3} key={index}>
            <Card
              sx={{
                backgroundColor: metric.bgColor,
                border: `1px solid ${metric.color}20`,
                transition: 'transform 0.2s, box-shadow 0.2s',
                '&:hover': {
                  transform: 'translateY(-4px)',
                  boxShadow: theme.shadows[4],
                },
              }}
            >
              <CardContent>
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <Box>
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      gutterBottom
                      sx={{ fontSize: '0.875rem' }}
                    >
                      {metric.title}
                    </Typography>
                    <Typography
                      variant="h3"
                      component="div"
                      sx={{
                        color: metric.color,
                        fontWeight: 600,
                        fontSize: { xs: '2rem', md: '2.5rem' },
                      }}
                    >
                      {metric.value}
                    </Typography>
                  </Box>
                  <Box
                    sx={{
                      color: metric.color,
                      opacity: 0.7,
                      '& > svg': {
                        fontSize: { xs: '2.5rem', md: '3rem' },
                      },
                    }}
                  >
                    {metric.icon}
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
};

export default MetricsCards;
