/**
 * MITRE ATT&CK Technique Card Component
 * 
 * Displays a single ATT&CK technique with:
 * - Technique ID and name
 * - Description
 * - Finding count badge (if applicable)
 * - Color-coded by finding count
 */

import React from 'react';
import {
  Card,
  CardContent,
  Typography,
  Chip,
  Box,
  Tooltip,
  useTheme
} from '@mui/material';
import {
  Security as SecurityIcon,
  CheckCircle as CheckCircleIcon
} from '@mui/icons-material';
import { AttackTechnique } from '../services/AttackTechniqueService';

interface AttackTechniqueCardProps {
  technique: AttackTechnique;
  findingCount?: number;  // Number of findings using this technique
  onClick?: () => void;    // Optional click handler
  compact?: boolean;       // Compact mode for widgets
}

const AttackTechniqueCard: React.FC<AttackTechniqueCardProps> = ({
  technique,
  findingCount = 0,
  onClick,
  compact = false
}) => {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';

  // Determine card color based on finding count
  const getCardColor = (): string => {
    if (findingCount === 0) {
      return isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.02)';
    } else if (findingCount <= 2) {
      return isDark ? 'rgba(255, 193, 7, 0.15)' : 'rgba(255, 193, 7, 0.1)'; // Yellow
    } else if (findingCount <= 5) {
      return isDark ? 'rgba(255, 152, 0, 0.2)' : 'rgba(255, 152, 0, 0.15)'; // Orange
    } else {
      return isDark ? 'rgba(244, 67, 54, 0.25)' : 'rgba(244, 67, 54, 0.15)'; // Red
    }
  };

  // Determine border color
  const getBorderColor = (): string => {
    if (findingCount === 0) {
      return isDark ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.12)';
    } else if (findingCount <= 2) {
      return theme.palette.warning.main;
    } else if (findingCount <= 5) {
      return theme.palette.warning.dark;
    } else {
      return theme.palette.error.main;
    }
  };

  // Truncate description for compact mode
  const getDescription = (): string => {
    if (compact && technique.description.length > 100) {
      return technique.description.substring(0, 100) + '...';
    }
    return technique.description;
  };

  return (
    <Card
      sx={{
        backgroundColor: getCardColor(),
        border: `1px solid ${getBorderColor()}`,
        cursor: onClick ? 'pointer' : 'default',
        transition: 'all 0.2s ease-in-out',
        '&:hover': onClick ? {
          transform: 'translateY(-2px)',
          boxShadow: 3,
          borderColor: theme.palette.primary.main
        } : {},
        height: compact ? 'auto' : '100%',
        display: 'flex',
        flexDirection: 'column'
      }}
      onClick={onClick}
    >
      <CardContent sx={{ flexGrow: 1, p: compact ? 1.5 : 2 }}>
        {/* Header: Technique ID and Finding Count */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
          <Tooltip title={technique.tactic}>
            <Chip
              label={technique.technique_id}
              size={compact ? 'small' : 'medium'}
              icon={<SecurityIcon />}
              color="primary"
              variant="outlined"
              sx={{ fontWeight: 600, fontFamily: 'monospace' }}
            />
          </Tooltip>
          
          {findingCount > 0 && (
            <Tooltip title={`${findingCount} finding${findingCount !== 1 ? 's' : ''} using this technique`}>
              <Chip
                label={findingCount}
                size="small"
                color={findingCount > 5 ? 'error' : findingCount > 2 ? 'warning' : 'info'}
                sx={{ fontWeight: 700, minWidth: 32 }}
              />
            </Tooltip>
          )}
          
          {findingCount === 0 && !compact && (
            <Tooltip title="No findings using this technique">
              <CheckCircleIcon
                sx={{
                  color: isDark ? 'rgba(76, 175, 80, 0.5)' : 'rgba(76, 175, 80, 0.7)',
                  fontSize: 20
                }}
              />
            </Tooltip>
          )}
        </Box>

        {/* Technique Name */}
        <Typography
          variant={compact ? 'body2' : 'h6'}
          sx={{
            fontWeight: 600,
            mb: compact ? 0.5 : 1,
            lineHeight: 1.3,
            color: theme.palette.text.primary
          }}
        >
          {technique.technique_name}
        </Typography>

        {/* Description */}
        <Typography
          variant={compact ? 'caption' : 'body2'}
          color="text.secondary"
          sx={{
            display: '-webkit-box',
            WebkitLineClamp: compact ? 2 : 3,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
            lineHeight: 1.5
          }}
        >
          {getDescription()}
        </Typography>

        {/* Keywords (only in non-compact mode) */}
        {!compact && technique.keywords && technique.keywords.length > 0 && (
          <Box sx={{ mt: 1.5, display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
            {technique.keywords.slice(0, 4).map((keyword, index) => (
              <Chip
                key={index}
                label={keyword}
                size="small"
                variant="outlined"
                sx={{
                  fontSize: '0.7rem',
                  height: 20,
                  borderColor: isDark ? 'rgba(255, 255, 255, 0.23)' : 'rgba(0, 0, 0, 0.23)'
                }}
              />
            ))}
            {technique.keywords.length > 4 && (
              <Chip
                label={`+${technique.keywords.length - 4}`}
                size="small"
                variant="outlined"
                sx={{
                  fontSize: '0.7rem',
                  height: 20,
                  borderColor: isDark ? 'rgba(255, 255, 255, 0.23)' : 'rgba(0, 0, 0, 0.23)'
                }}
              />
            )}
          </Box>
        )}

        {/* Relevance Score (only if present - from suggestions) */}
        {technique.relevance_score !== undefined && technique.relevance_score > 0 && (
          <Box sx={{ mt: 1 }}>
            <Chip
              label={`Relevance: ${technique.relevance_score}/10`}
              size="small"
              color="success"
              variant="filled"
              sx={{ fontWeight: 600 }}
            />
          </Box>
        )}
      </CardContent>
    </Card>
  );
};

export default AttackTechniqueCard;
