import React from 'react'
import { Link } from 'react-router-dom'
import { useTheme, Box, IconButton } from '@mui/material'
import {
  Brightness4 as DarkModeIcon,
  Brightness7 as LightModeIcon,
} from '@mui/icons-material'
import { useThemeContext } from '../theme/ThemeProvider'

const AppHeader = () => {
  const theme = useTheme()
  const { mode, toggleTheme } = useThemeContext()
  
  return (
    <Box
      component="header"
      role="banner"
      aria-label="Application header"
      sx={{
        backgroundColor: theme.palette.mode === 'dark' ? '#1a1a1a' : '#343a40',
        color: theme.palette.text.primary,
        padding: '15px 20px',
        marginBottom: '20px',
        boxShadow: theme.shadows[1],
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}
    >
      <Link to="/" style={{ textDecoration: 'none' }} aria-label="Go to dashboard home">
        <Box
          component="h1"
          sx={{
            fontSize: '1.2em',
            fontWeight: 500,
            color: theme.palette.text.primary,
            '&:hover': {
              color: theme.palette.primary.main,
            },
            cursor: 'pointer',
            margin: 0,
          }}
        >
          🛡️ VulnManager Dashboard
        </Box>
      </Link>
      <IconButton 
        onClick={toggleTheme}
        size="large"
        aria-label={`Switch to ${mode === 'dark' ? 'light' : 'dark'} mode (current: ${mode} mode)`}
        aria-pressed={mode === 'dark'}
        sx={{
          color: theme.palette.text.primary,
          '&:hover': {
            backgroundColor: theme.palette.mode === 'dark' 
              ? 'rgba(255, 255, 255, 0.1)' 
              : 'rgba(0, 0, 0, 0.05)',
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
    </Box>
  )
}

export default AppHeader

