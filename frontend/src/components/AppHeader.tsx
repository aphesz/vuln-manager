import React from 'react'
import { Link } from 'react-router-dom'
import { useTheme, AppBar, Toolbar, Box, IconButton, Typography, useMediaQuery } from '@mui/material'
import {
  Brightness4 as DarkModeIcon,
  Brightness7 as LightModeIcon,
  Menu as MenuIcon,
  MenuOpen as MenuOpenIcon,
} from '@mui/icons-material'
import { useThemeContext } from '../theme/ThemeProvider'
import UserMenu from './UserMenu'
import { useAuth } from '../contexts/AuthContext'

interface AppHeaderProps {
  onMenuClick?: () => void;
  showMenuButton?: boolean;
  sidebarHidden?: boolean;
  onShowSidebar?: () => void;
}

const AppHeader: React.FC<AppHeaderProps> = ({ onMenuClick, showMenuButton = false, sidebarHidden = false, onShowSidebar }) => {
  const theme = useTheme()
  const { mode, toggleTheme } = useThemeContext()
  const { isAuthenticated } = useAuth()
  const isMobile = useMediaQuery(theme.breakpoints.down('md'))
  
  return (
    <AppBar
      position="fixed"
      sx={{
        zIndex: (theme) => theme.zIndex.drawer + 1,
        backgroundColor: theme.palette.mode === 'dark' ? '#1a1a1a' : '#343a40',
      }}
      role="banner"
      aria-label="Application header"
    >
      <Toolbar>
        {showMenuButton && isMobile && (
          <IconButton
            edge="start"
            color="inherit"
            aria-label="Open navigation menu"
            onClick={onMenuClick}
            sx={{ mr: 2 }}
          >
            <MenuIcon />
          </IconButton>
        )}
        
        {/* Show sidebar button when hidden on desktop */}
        {showMenuButton && !isMobile && sidebarHidden && onShowSidebar && (
          <IconButton
            edge="start"
            color="inherit"
            aria-label="Show navigation sidebar"
            onClick={onShowSidebar}
            sx={{ mr: 2 }}
          >
            <MenuOpenIcon />
          </IconButton>
        )}
        
        <Link to="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center' }} aria-label="Go to dashboard home">
          <Typography
            variant="h6"
            component="h1"
            sx={{
              fontWeight: 500,
              color: '#ffffff',
              '&:hover': {
                color: theme.palette.primary.light,
              },
              cursor: 'pointer',
              fontSize: { xs: '1.1rem', sm: '1.2rem' },
            }}
          >
            🛡️ VulnManager
          </Typography>
        </Link>
        
        <Box sx={{ flexGrow: 1 }} />
        
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <IconButton 
            onClick={toggleTheme}
            size="large"
            aria-label={`Switch to ${mode === 'dark' ? 'light' : 'dark'} mode (current: ${mode} mode)`}
            aria-pressed={mode === 'dark'}
            sx={{
              color: '#ffffff',
              '&:hover': {
                backgroundColor: 'rgba(255, 255, 255, 0.1)',
              },
              '&:focus-visible': {
                outline: `2px solid ${theme.palette.primary.main}`,
                outlineOffset: '2px',
              },
            }}
            title={`Switch to ${mode === 'dark' ? 'light' : 'dark'} mode`}
          >
            {mode === 'dark' ? <LightModeIcon aria-hidden="true" /> : <DarkModeIcon aria-hidden="true" />}
          </IconButton>
          
          {/* User Menu - only show when authenticated */}
          {isAuthenticated && <UserMenu />}
        </Box>
      </Toolbar>
    </AppBar>
  )
}

export default AppHeader

