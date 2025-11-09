import React, { useState, useEffect } from 'react';
import {
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Collapse,
  Box,
  Typography,
  useTheme,
} from '@mui/material';
import {
  ExpandLess as ExpandLessIcon,
  ExpandMore as ExpandMoreIcon,
} from '@mui/icons-material';
import { NavigationItem as NavigationItemType } from '../types';
import { NavigationItem } from './NavigationItem';

interface NavigationGroupProps {
  label: string;
  icon?: React.ReactNode;
  children: NavigationItemType[];
  collapsed: boolean;
  defaultExpanded?: boolean;
  onItemClick?: () => void;
}

/**
 * NavigationGroup component for collapsible navigation sections
 * Groups related navigation items together with expand/collapse functionality
 */
export const NavigationGroup: React.FC<NavigationGroupProps> = ({
  label,
  icon,
  children,
  collapsed,
  defaultExpanded = false,
  onItemClick,
}) => {
  const theme = useTheme();
  const [expanded, setExpanded] = useState(defaultExpanded);
  const storageKey = `nav_group_${label.toLowerCase().replace(/\s+/g, '_')}_expanded`;

  // Load expanded state from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved !== null) {
        setExpanded(JSON.parse(saved));
      }
    } catch (error) {
      console.error('Error loading navigation group state:', error);
    }
  }, [storageKey]);

  // Save expanded state to localStorage when it changes
  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(expanded));
    } catch (error) {
      console.error('Error saving navigation group state:', error);
    }
  }, [expanded, storageKey]);

  // Auto-collapse groups when sidebar is collapsed
  useEffect(() => {
    if (collapsed) {
      setExpanded(false);
    }
  }, [collapsed]);

  const handleToggle = () => {
    if (!collapsed) {
      setExpanded((prev) => !prev);
    }
  };

  // When sidebar is collapsed, show as simple item without expansion
  if (collapsed) {
    return (
      <Box sx={{ mb: 0.5 }}>
        <ListItem disablePadding>
          <ListItemButton
            onClick={handleToggle}
            sx={{
              minHeight: 48,
              justifyContent: 'center',
              px: 2.5,
              borderRadius: 1,
              '&:hover': {
                backgroundColor: theme.palette.action.hover,
              },
            }}
          >
            {icon && (
              <ListItemIcon
                sx={{
                  minWidth: 0,
                  mr: 0,
                  justifyContent: 'center',
                  color: theme.palette.text.secondary,
                }}
              >
                {icon}
              </ListItemIcon>
            )}
          </ListItemButton>
        </ListItem>
      </Box>
    );
  }

  // Expanded sidebar with full group display
  return (
    <Box sx={{ mb: 1 }}>
      {/* Group Header */}
      <ListItem disablePadding>
        <ListItemButton
          onClick={handleToggle}
          sx={{
            minHeight: 48,
            px: 2.5,
            borderRadius: 1,
            '&:hover': {
              backgroundColor: theme.palette.action.hover,
            },
          }}
          aria-expanded={expanded}
          aria-label={`${expanded ? 'Collapse' : 'Expand'} ${label} group`}
        >
          {icon && (
            <ListItemIcon
              sx={{
                minWidth: 0,
                mr: 2,
                color: theme.palette.text.secondary,
              }}
            >
              {icon}
            </ListItemIcon>
          )}
          <ListItemText
            primary={
              <Typography
                variant="body2"
                sx={{
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  color: theme.palette.text.secondary,
                }}
              >
                {label}
              </Typography>
            }
          />
          {expanded ? (
            <ExpandLessIcon fontSize="small" sx={{ color: theme.palette.text.secondary }} />
          ) : (
            <ExpandMoreIcon fontSize="small" sx={{ color: theme.palette.text.secondary }} />
          )}
        </ListItemButton>
      </ListItem>

      {/* Group Items */}
      <Collapse in={expanded} timeout="auto" unmountOnExit>
        <List component="div" disablePadding>
          {children.map((item) => (
            <NavigationItem
              key={item.id}
              item={item}
              collapsed={false}
              nested={true}
              onClick={onItemClick}
            />
          ))}
        </List>
      </Collapse>
    </Box>
  );
};
