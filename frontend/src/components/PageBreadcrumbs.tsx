/**
 * Reusable Breadcrumb Navigation Component
 * 
 * Provides consistent breadcrumb navigation across all pages.
 * Automatically generates breadcrumbs based on current route and context.
 */

import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Breadcrumbs,
  Link,
  Typography,
  Box
} from '@mui/material';
import {
  Home as HomeIcon,
  Dashboard as DashboardIcon,
  Security as SecurityIcon,
  Assessment as AssessmentIcon,
  TrendingUp as TrendingUpIcon,
  Calculate as CalculateIcon,
  List as ListIcon,
  BugReport as BugReportIcon,
  Policy as PolicyIcon,
  Shield as ShieldIcon,
  Article as ArticleIcon,
  LocalOffer as TagIcon,
  Schedule as ScheduleIcon
} from '@mui/icons-material';

interface BreadcrumbItem {
  label: string;
  path?: string;
  icon?: React.ReactNode;
}

interface PageBreadcrumbsProps {
  projectId?: number | string;
  projectName?: string;
  items?: BreadcrumbItem[];
}

const PageBreadcrumbs: React.FC<PageBreadcrumbsProps> = ({ 
  projectId, 
  projectName,
  items = [] 
}) => {
  const navigate = useNavigate();
  const location = useLocation();

  // Auto-generate breadcrumbs based on path if not provided
  const generateBreadcrumbs = (): BreadcrumbItem[] => {
    if (items.length > 0) return items;

    const breadcrumbs: BreadcrumbItem[] = [];
    
    // Only add "Projects" link if we're not on the home page
    const path = location.pathname;
    if (path !== '/') {
      breadcrumbs.push({ label: 'Projects', path: '/', icon: <HomeIcon fontSize="small" /> });
    }

    // Add project breadcrumb if projectId is provided
    if (projectId) {
      breadcrumbs.push({
        label: projectName || `Project ${projectId}`,
        path: `/projects/${projectId}`,
        icon: <DashboardIcon fontSize="small" />
      });
    }

    // Determine current page from path
    if (path === '/') {
      // Home page - no breadcrumb needed (we're already there)
      return breadcrumbs;
    } else if (path === '/executive') {
      breadcrumbs.push({
        label: 'Executive Dashboard',
        icon: <DashboardIcon fontSize="small" />
      });
    } else if (path === '/sla') {
      breadcrumbs.push({
        label: 'SLA & Remediation Tracking',
        icon: <ScheduleIcon fontSize="small" />
      });
    } else if (path === '/vulnerability-repository') {
      breadcrumbs.push({
        label: 'Vulnerability Repository',
        icon: <BugReportIcon fontSize="small" />
      });
    } else if (path === '/tags') {
      breadcrumbs.push({
        label: 'Tag Management',
        icon: <TagIcon fontSize="small" />
      });
    } else if (path === '/calculators/cvss') {
      breadcrumbs.push({
        label: 'CVSS 3.1 Calculator',
        icon: <CalculateIcon fontSize="small" />
      });
    } else if (path === '/calculators/owasp') {
      breadcrumbs.push({
        label: 'OWASP Risk Calculator',
        icon: <CalculateIcon fontSize="small" />
      });
    } else if (path.includes('/attack-surface')) {
      breadcrumbs.push({
        label: 'MITRE ATT&CK Matrix',
        icon: <SecurityIcon fontSize="small" />
      });
    } else if (path.includes('/trends')) {
      breadcrumbs.push({
        label: 'Trend Analysis',
        icon: <TrendingUpIcon fontSize="small" />
      });
    } else if (path.includes('/findings')) {
      breadcrumbs.push({
        label: 'Findings',
        icon: <BugReportIcon fontSize="small" />
      });
    } else if (path.includes('/templates')) {
      breadcrumbs.push({
        label: 'Vulnerability Templates',
        icon: <ListIcon fontSize="small" />
      });
    } else if (path.includes('/sla-policy')) {
      breadcrumbs.push({
        label: 'SLA Policy',
        icon: <PolicyIcon fontSize="small" />
      });
    } else if (path.includes('/compliance')) {
      if (path.includes('/owasp')) {
        breadcrumbs.push({
          label: 'OWASP Top 10 Compliance',
          icon: <ShieldIcon fontSize="small" />
        });
      } else if (path.includes('/cwe')) {
        breadcrumbs.push({
          label: 'CWE Top 25 Compliance',
          icon: <ShieldIcon fontSize="small" />
        });
      } else {
        breadcrumbs.push({
          label: 'Compliance',
          icon: <ShieldIcon fontSize="small" />
        });
      }
    } else if (path.includes('/reports')) {
      breadcrumbs.push({
        label: 'Reports',
        icon: <ArticleIcon fontSize="small" />
      });
    } else if (projectId && path === `/projects/${projectId}`) {
      // Dashboard - already added above
    }

    return breadcrumbs;
  };

  const breadcrumbItems = generateBreadcrumbs();

  return (
    <Breadcrumbs aria-label="breadcrumb" sx={{ mb: 3 }}>
      {breadcrumbItems.map((item, index) => {
        const isLast = index === breadcrumbItems.length - 1;

        if (isLast) {
          // Last item - current page (not clickable)
          return (
            <Typography
              key={index}
              sx={{ display: 'flex', alignItems: 'center' }}
              color="text.primary"
            >
              {item.icon && <Box sx={{ mr: 0.5, display: 'flex' }}>{item.icon}</Box>}
              {item.label}
            </Typography>
          );
        } else {
          // Clickable breadcrumb
          return (
            <Link
              key={index}
              underline="hover"
              sx={{ 
                display: 'flex', 
                alignItems: 'center', 
                cursor: 'pointer',
                '&:hover': {
                  color: 'primary.main'
                }
              }}
              color="inherit"
              onClick={() => item.path && navigate(item.path)}
            >
              {item.icon && <Box sx={{ mr: 0.5, display: 'flex' }}>{item.icon}</Box>}
              {item.label}
            </Link>
          );
        }
      })}
    </Breadcrumbs>
  );
};

export default PageBreadcrumbs;
