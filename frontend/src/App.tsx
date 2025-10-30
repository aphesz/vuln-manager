import React from 'react'
import { BrowserRouter as Router, Route, Routes, Link } from 'react-router-dom'
import { useTheme, Box, Container } from '@mui/material'
import ProjectsLists from './components/ProjectsLists'
import Dashboard from './components/Dashboard'

const App = () => {
  const theme = useTheme()
  
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
