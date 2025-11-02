import React from 'react'
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom'
import { Container } from '@mui/material'
import AppHeader from './components/AppHeader'
import ProjectsLists from './components/ProjectsLists'
import Dashboard from './components/Dashboard'
import SLADashboard from './components/SLADashboard'
import { NotificationProvider } from './contexts/NotificationContext'

const App = () => {
  return (
    <NotificationProvider>
      <Router>
        <AppHeader />
        <Container maxWidth={false} sx={{ px: { xs: 2, sm: 3, md: 4, lg: 6 }, pb: 4 }}>
          <Routes>
            <Route path="/" element={<ProjectsLists />} />
            {/* The project ID is passed as a route parameter */}
            <Route path="/projects/:projectId" element={<Dashboard />} />
            {/* SLA Dashboard route */}
            <Route path="/sla" element={<SLADashboard />} />
          </Routes>
        </Container>
      </Router>
    </NotificationProvider>
  )
}

export default App
