import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Drawer,
  List,
  Divider,
  IconButton,
  Toolbar,
  useTheme,
  useMediaQuery,
  Typography,
} from '@mui/material';
import {
  ChevronLeft as ChevronLeftIcon,
  ChevronRight as ChevronRightIcon,
  Dashboard as DashboardIcon,
  Folder as FolderIcon,
  LibraryBooks as LibraryBooksIcon,
  Calculate as CalculateIcon,
  TrendingUp as TrendingUpIcon,
  Assessment as AssessmentIcon,
  BarChart as BarChartIcon,
  Business as BusinessIcon,
  Description as DescriptionIcon,
  LocalOffer as LocalOfferIcon,
  Schedule as ScheduleIcon,
  Build as BuildIcon,
} from '@mui/icons-material';
import { NavigationItem as NavigationItemType } from '../types';
import { NavigationItem } from './NavigationItem';
import { NavigationGroup } from './NavigationGroup';
import { SidebarState } from '../hooks/useSidebarState';

interface SidebarProps {
  state: SidebarState;
  onToggle: () => void;
  mobileOpen: boolean;
  onMobileClose: () => void;
}

// Sidebar width constants
const DRAWER_WIDTH_EXPANDED = 280;
const DRAWER_WIDTH_COLLAPSED = 64;

/**
 * Main navigation sidebar component
 * Provides primary navigation with collapsible groups and responsive behavior
 */
export const Sidebar: React.FC<SidebarProps> = ({
  state,
  onToggle,
  mobileOpen,
  onMobileClose,
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const navigate = useNavigate();

  const isCollapsed = state === 'collapsed';
  const isHidden = state === 'hidden';

  // Define navigation structure
  const navigationItems: NavigationItemType[] = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: <DashboardIcon />,
      path: '/',
    },
    {
      id: 'projects',
      label: 'Projects',
      icon: <FolderIcon />,
      path: '/projects',
    },
    {
      id: 'vulnerability-repository',
      label: 'Vulnerability Repository',
      icon: <LibraryBooksIcon />,
      path: '/vulnerability-repository',
    },
    {
      id: 'sla',
      label: 'SLA Tracking',
      icon: <ScheduleIcon />,
      path: '/sla',
    },
  ];

  const calculatorItems: NavigationItemType[] = [
    {
      id: 'cvss-calculator',
      label: 'CVSS 3.1 Calculator',
      icon: <AssessmentIcon />,
      path: '/calculators/cvss',
    },
    {
      id: 'owasp-calculator',
      label: 'OWASP Risk Calculator',
      icon: <BarChartIcon />,
      path: '/calculators/owasp',
    },
  ];

  const reportingItems: NavigationItemType[] = [
    {
      id: 'reports',
      label: 'Report Builder',
      icon: <DescriptionIcon />,
      path: '/reports',
    },
    {
      id: 'report-templates',
      label: 'Report Templates',
      icon: <BuildIcon />,
      path: '/templates/reports',
    },
  ];

  const analyticsItems: NavigationItemType[] = [
    {
      id: 'executive',
      label: 'Executive Dashboard',
      icon: <BusinessIcon />,
      path: '/executive',
    },
  ];

  const bottomItems: NavigationItemType[] = [
    {
      id: 'tags',
      label: 'Tag Manager',
      icon: <LocalOfferIcon />,
      path: '/tags',
    },
  ];

  // Handle item click - close mobile drawer
  const handleItemClick = () => {
    if (isMobile) {
      onMobileClose();
    }
  };

  // Sidebar content
  const drawerContent = (
    <Box
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: theme.palette.mode === 'dark' ? '#1e1e1e' : '#ffffff',
      }}
    >
      {/* Sidebar Header with Toggle Button */}
      <Toolbar
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: isCollapsed ? 'center' : 'space-between',
          px: isCollapsed ? 1 : 2,
          minHeight: 64,
          borderBottom: `1px solid ${theme.palette.divider}`,
        }}
      >
        {!isCollapsed && (
          <Typography
            variant="h6"
            noWrap
            sx={{
              fontWeight: 600,
              color: theme.palette.primary.main,
              fontSize: '1rem',
            }}
          >
            VulnManager
          </Typography>
        )}
        <IconButton
          onClick={onToggle}
          size="small"
          sx={{
            color: theme.palette.primary.main,
            backgroundColor: theme.palette.primary.light + '40',
            border: `1px solid ${theme.palette.primary.main}`,
            '&:hover': {
              backgroundColor: theme.palette.primary.light + '60',
              borderColor: theme.palette.primary.dark,
            },
            ml: !isCollapsed ? 1 : 0,
          }}
          aria-label={state === 'expanded' ? 'Collapse sidebar' : state === 'collapsed' ? 'Hide sidebar' : 'Show sidebar'}
        >
          {state === 'expanded' && <ChevronLeftIcon fontSize="small" />}
          {state === 'collapsed' && <ChevronRightIcon fontSize="small" />}
          {state === 'hidden' && <ChevronRightIcon fontSize="small" />}
        </IconButton>
      </Toolbar>

      {/* Navigation Items */}
      <Box
        sx={{
          flexGrow: 1,
          overflowY: 'auto',
          overflowX: 'hidden',
          px: 1,
          py: 2,
          '&::-webkit-scrollbar': {
            width: '6px',
          },
          '&::-webkit-scrollbar-track': {
            backgroundColor: 'transparent',
          },
          '&::-webkit-scrollbar-thumb': {
            backgroundColor: theme.palette.action.hover,
            borderRadius: '3px',
          },
        }}
      >
        <List component="nav" aria-label="Main navigation">
          {/* Top-level navigation items */}
          {navigationItems.map((item) => (
            <NavigationItem
              key={item.id}
              item={item}
              collapsed={isCollapsed}
              onClick={handleItemClick}
            />
          ))}

          <Divider sx={{ my: 2 }} />

          {/* Calculators Group */}
          <NavigationGroup
            label="Calculators"
            icon={<CalculateIcon />}
            children={calculatorItems}
            collapsed={isCollapsed}
            defaultExpanded={false}
            onItemClick={handleItemClick}
          />

          {/* Reporting Group */}
          <NavigationGroup
            label="Reporting"
            icon={<DescriptionIcon />}
            children={reportingItems}
            collapsed={isCollapsed}
            defaultExpanded={false}
            onItemClick={handleItemClick}
          />

          {/* Analytics Group */}
          <NavigationGroup
            label="Analytics"
            icon={<TrendingUpIcon />}
            children={analyticsItems}
            collapsed={isCollapsed}
            defaultExpanded={false}
            onItemClick={handleItemClick}
          />

          <Divider sx={{ my: 2 }} />

          {/* Bottom-level navigation items */}
          {bottomItems.map((item) => (
            <NavigationItem
              key={item.id}
              item={item}
              collapsed={isCollapsed}
              onClick={handleItemClick}
            />
          ))}
        </List>
      </Box>

      {/* Sidebar Footer (optional - for future use) */}
      {!isCollapsed && (
        <Box
          sx={{
            px: 2,
            py: 1.5,
            borderTop: `1px solid ${theme.palette.divider}`,
          }}
        >
          <Typography
            variant="caption"
            sx={{
              color: theme.palette.text.secondary,
              display: 'block',
            }}
          >
            v0.9.0
          </Typography>
        </Box>
      )}
    </Box>
  );

  // Desktop: Permanent drawer
  // Mobile: Temporary drawer (overlay)
  // Hidden: Don't render on desktop
  if (isHidden && !isMobile) {
    return null;
  }

  const drawerWidth = isCollapsed ? DRAWER_WIDTH_COLLAPSED : DRAWER_WIDTH_EXPANDED;

  return (
    <Box
      component="nav"
      sx={{
        width: { md: isHidden ? 0 : drawerWidth },
        flexShrink: { md: 0 },
      }}
      aria-label="Navigation sidebar"
    >
      {/* Mobile Drawer */}
      {isMobile && (
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={onMobileClose}
          ModalProps={{
            keepMounted: true, // Better mobile performance
          }}
          sx={{
            display: { xs: 'block', md: 'none' },
            '& .MuiDrawer-paper': {
              boxSizing: 'border-box',
              width: DRAWER_WIDTH_EXPANDED,
              borderRight: `1px solid ${theme.palette.divider}`,
            },
          }}
        >
          {drawerContent}
        </Drawer>
      )}

      {/* Desktop Drawer */}
      {!isMobile && !isHidden && (
        <Drawer
          variant="permanent"
          open
          sx={{
            display: { xs: 'none', md: 'block' },
            '& .MuiDrawer-paper': {
              boxSizing: 'border-box',
              width: drawerWidth,
              borderRight: `1px solid ${theme.palette.divider}`,
              transition: theme.transitions.create('width', {
                easing: theme.transitions.easing.sharp,
                duration: theme.transitions.duration.enteringScreen,
              }),
              overflowX: 'hidden',
              marginTop: '64px', // Push drawer below AppBar
              height: 'calc(100vh - 64px)', // Adjust height
            },
          }}
        >
          {drawerContent}
        </Drawer>
      )}
    </Box>
  );
};
