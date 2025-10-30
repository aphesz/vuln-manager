import React from 'react'
import { BrowserRouter as Router, Route, Routes, Link } from 'react-router-dom'
import { useTheme, Box, Container, IconButton } from '@mui/material'
import {
  Brightness4 as DarkModeIcon,
  Brightness7 as LightModeIcon,
} from '@mui/icons-material'
import ProjectsLists from './components/ProjectsLists'
import Dashboard from './components/Dashboard'
import { useThemeContext } from './theme/ThemeProvider'

const App = () => {
  const theme = useTheme()
  const { mode, toggleTheme } = useThemeContext()
  
  return (
    <Router>
      <Box
        component="header"
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
        <Link to="/" style={{ textDecoration: 'none' }}>
          <Box
            sx={{
              fontSize: '1.2em',
              fontWeight: 500,
              color: theme.palette.text.primary,
              '&:hover': {
                color: theme.palette.primary.main,
              },
            }}
          >
            🛡️ VulnManager Dashboard
          </Box>
        </Link>
        <IconButton 
          onClick={toggleTheme}
          size="large"
          sx={{
            color: theme.palette.text.primary,
            '&:hover': {
              backgroundColor: theme.palette.mode === 'dark' 
                ? 'rgba(255, 255, 255, 0.1)' 
                : 'rgba(0, 0, 0, 0.05)',
            },
          }}
          title={`Switch to ${mode === 'dark' ? 'light' : 'dark'} mode`}
        >
          {mode === 'dark' ? <LightModeIcon /> : <DarkModeIcon />}
        </IconButton>
      </Box>
      <Container maxWidth="lg" sx={{ pb: 4 }}>
        <Routes>
          <Route path="/" element={<ProjectsLists />} />
          {/* The project ID is passed as a route parameter */}
          <Route path="/projects/:projectId" element={<Dashboard />} />
        </Routes>
      </Container>
    </Router>
  )
}

export default App
