/**
 * MITRE ATT&CK Matrix Widget
 * 
 * Compact dashboard widget showing ATT&CK coverage summary.
 * Displays top tactics with heatmap visualization.
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Card,
  CardContent,
  Typography,
  Box,
  Button,
  LinearProgress,
  Chip,
  Grid,
  useTheme,
  Skeleton
} from '@mui/material';
import {
  Security as SecurityIcon,
  ArrowForward as ArrowForwardIcon,
  Shield as ShieldIcon
} from '@mui/icons-material';
import AttackTechniqueService, { TacticStats } from '../services/AttackTechniqueService';

interface AttackMatrixWidgetProps {
  projectId: number;
}

const AttackMatrixWidget: React.FC<AttackMatrixWidgetProps> = ({ projectId }) => {
  const navigate = useNavigate();
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';

  // State
  const [loading, setLoading] = useState<boolean>(true);
  const [tacticStats, setTacticStats] = useState<TacticStats[]>([]);
  const [totalTechniques, setTotalTechniques] = useState<number>(0);

  // Fetch techniques on mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
        const techniques = await AttackTechniqueService.getAllTechniques();
        const stats = AttackTechniqueService.getTacticStats(techniques);
        
        setTacticStats(stats);
        setTotalTechniques(techniques.length);
        
      } catch (error) {
        console.error('Error fetching ATT&CK data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [projectId]);

  // Navigate to full attack surface page
  const handleViewFullMatrix = () => {
    navigate(`/projects/${projectId}/attack-surface`);
  };

  // Get intensity color for heatmap
  const getIntensityColor = (techniqueCount: number, maxCount: number): string => {
    const intensity = maxCount > 0 ? techniqueCount / maxCount : 0;
    
    if (isDark) {
      return `rgba(33, 150, 243, ${0.2 + intensity * 0.6})`;  // Blue in dark mode
    } else {
      return `rgba(33, 150, 243, ${0.1 + intensity * 0.4})`;  // Blue in light mode
    }
  };

  // Get max technique count for scaling
  const maxTechniqueCount = Math.max(...tacticStats.map(s => s.technique_count), 1);

  if (loading) {
    return (
      <Card sx={{ height: '100%' }}>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
            <SecurityIcon sx={{ mr: 1, color: theme.palette.primary.main }} />
            <Typography variant="h6" component="h2">
              MITRE ATT&CK Coverage
            </Typography>
          </Box>
          <Skeleton variant="rectangular" height={150} />
          <Skeleton variant="text" sx={{ mt: 2 }} />
          <Skeleton variant="rectangular" height={36} sx={{ mt: 2 }} />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <CardContent sx={{ flexGrow: 1 }}>
        {/* Widget Header */}
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <SecurityIcon sx={{ mr: 1, color: theme.palette.primary.main }} />
            <Typography variant="h6" component="h2">
              MITRE ATT&CK Coverage
            </Typography>
          </Box>
          <Chip
            icon={<ShieldIcon />}
            label={`${totalTechniques} Techniques`}
            size="small"
            color="primary"
            variant="outlined"
          />
        </Box>

        {/* Summary */}
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          {tacticStats.length} adversary tactics covered across the attack lifecycle
        </Typography>

        {/* Top Tactics - Heatmap Style */}
        <Box sx={{ mb: 2 }}>
          <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block', fontWeight: 600 }}>
            TOP TACTICS
          </Typography>
          
          <Grid container spacing={1}>
            {tacticStats.slice(0, 5).map((stat) => (
              <Grid item xs={12} key={stat.tactic}>
                <Box
                  sx={{
                    p: 1.5,
                    borderRadius: 1,
                    backgroundColor: getIntensityColor(stat.technique_count, maxTechniqueCount),
                    border: `1px solid ${isDark ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.12)'}`,
                    transition: 'all 0.2s ease',
                    cursor: 'pointer',
                    '&:hover': {
                      backgroundColor: theme.palette.primary.main + (isDark ? '30' : '20'),
                      borderColor: theme.palette.primary.main
                    }
                  }}
                  onClick={handleViewFullMatrix}
                >
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography
                      variant="body2"
                      sx={{
                        fontWeight: 600,
                        color: theme.palette.text.primary,
                        fontSize: '0.875rem'
                      }}
                    >
                      {stat.tactic}
                    </Typography>
                    <Chip
                      label={stat.technique_count}
                      size="small"
                      sx={{
                        minWidth: 32,
                        height: 20,
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        backgroundColor: theme.palette.primary.main,
                        color: 'white'
                      }}
                    />
                  </Box>
                  
                  {/* Progress Bar */}
                  <LinearProgress
                    variant="determinate"
                    value={(stat.technique_count / maxTechniqueCount) * 100}
                    sx={{
                      mt: 1,
                      height: 4,
                      borderRadius: 2,
                      backgroundColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
                      '& .MuiLinearProgress-bar': {
                        backgroundColor: theme.palette.primary.main
                      }
                    }}
                  />
                </Box>
              </Grid>
            ))}
          </Grid>

          {/* More tactics indicator */}
          {tacticStats.length > 5 && (
            <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block', textAlign: 'center' }}>
              + {tacticStats.length - 5} more tactic{tacticStats.length - 5 !== 1 ? 's' : ''}
            </Typography>
          )}
        </Box>

        {/* View Full Matrix Button */}
        <Button
          variant="outlined"
          fullWidth
          endIcon={<ArrowForwardIcon />}
          onClick={handleViewFullMatrix}
          sx={{ mt: 1 }}
        >
          View Full ATT&CK Matrix
        </Button>
      </CardContent>

      {/* Footer Info */}
      <Box
        sx={{
          px: 2,
          py: 1,
          backgroundColor: isDark ? 'rgba(255, 255, 255, 0.03)' : 'rgba(0, 0, 0, 0.02)',
          borderTop: `1px solid ${isDark ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.12)'}`
        }}
      >
        <Typography variant="caption" color="text.secondary">
          MITRE ATT&CK® framework mapping for threat modeling
        </Typography>
      </Box>
    </Card>
  );
};

export default AttackMatrixWidget;
