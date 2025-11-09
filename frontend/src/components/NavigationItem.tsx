import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Badge,
  Tooltip,
  Box,
  useTheme,
} from '@mui/material';
import { NavigationItem as NavigationItemType } from '../types';

interface NavigationItemProps {
  item: NavigationItemType;
  collapsed: boolean;
  nested?: boolean;
  onClick?: () => void;
}

/**
 * NavigationItem component for sidebar navigation
 * Displays icon, label, and optional badge with active state styling
 */
export const NavigationItem: React.FC<NavigationItemProps> = ({
  item,
  collapsed,
  nested = false,
  onClick,
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const theme = useTheme();

  // Determine if this item is active based on current route
  const isActive = item.path ? location.pathname === item.path : false;

  const handleClick = () => {
    if (item.path) {
      navigate(item.path);
    }
    if (onClick) {
      onClick();
    }
  };

  const content = (
    <ListItem
      disablePadding
      sx={{
        display: 'block',
        mb: 0.5,
      }}
    >
      <ListItemButton
        onClick={handleClick}
        sx={{
          minHeight: 48,
          justifyContent: collapsed ? 'center' : 'flex-start',
          px: nested ? 4 : 2.5,
          borderRadius: 1,
          transition: theme.transitions.create(['background-color', 'padding'], {
            duration: theme.transitions.duration.short,
          }),
          backgroundColor: isActive
            ? theme.palette.mode === 'dark'
              ? theme.palette.primary.dark
              : theme.palette.primary.light + '20'
            : 'transparent',
          color: isActive
            ? theme.palette.primary.main
            : theme.palette.text.primary,
          '&:hover': {
            backgroundColor: isActive
              ? theme.palette.mode === 'dark'
                ? theme.palette.primary.dark
                : theme.palette.primary.light + '40'
              : theme.palette.action.hover,
          },
          '&:focus-visible': {
            outline: `2px solid ${theme.palette.primary.main}`,
            outlineOffset: -2,
          },
        }}
        aria-current={isActive ? 'page' : undefined}
      >
        <ListItemIcon
          sx={{
            minWidth: 0,
            mr: collapsed ? 0 : 2,
            justifyContent: 'center',
            color: 'inherit',
          }}
        >
          {item.badge && !collapsed ? (
            <Badge
              badgeContent={item.badge}
              color={item.badgeColor || 'primary'}
              max={99}
            >
              {item.icon}
            </Badge>
          ) : (
            item.icon
          )}
        </ListItemIcon>

        {!collapsed && (
          <ListItemText
            primary={item.label}
            sx={{
              opacity: 1,
              '& .MuiTypography-root': {
                fontSize: nested ? '0.8rem' : '0.85rem',
                fontWeight: isActive ? 600 : 500,
              },
            }}
          />
        )}

        {/* Show badge as dot when collapsed */}
        {item.badge && collapsed && (
          <Box
            sx={{
              position: 'absolute',
              top: 8,
              right: 8,
              width: 8,
              height: 8,
              borderRadius: '50%',
              backgroundColor:
                item.badgeColor && item.badgeColor !== 'default'
                  ? theme.palette[item.badgeColor].main
                  : theme.palette.primary.main,
            }}
          />
        )}
      </ListItemButton>
    </ListItem>
  );

  // Wrap with tooltip when sidebar is collapsed to show full label
  if (collapsed) {
    return (
      <Tooltip
        title={item.label}
        placement="right"
        arrow
        enterDelay={500}
      >
        {content}
      </Tooltip>
    );
  }

  return content;
};
