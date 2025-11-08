import React, { useState, useEffect } from 'react'
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom'
import { Container } from '@mui/material'
import AppHeader from './components/AppHeader'
import ProjectsLists from './components/ProjectsLists'
import Dashboard from './components/Dashboard'
import SLADashboard from './components/SLADashboard'
import VulnerabilityTemplateManager from './components/VulnerabilityTemplateManager'
import TagManager from './components/TagManager'
import CVSSCalculatorPage from './components/CVSSCalculatorPage'
import OWASPCalculatorPage from './components/OWASPCalculatorPage'
import TrendAnalysisPage from './components/TrendAnalysisPage'
import AttackSurfacePage from './components/AttackSurfacePage'
import ExecutiveDashboard from './components/ExecutiveDashboard'
import KeyboardShortcutsDialog from './components/KeyboardShortcutsDialog'
import { NotificationProvider } from './contexts/NotificationContext'

const App = () => {
  const [keyboardShortcutsOpen, setKeyboardShortcutsOpen] = useState(false);

  // Global keyboard shortcuts listener
  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      // Ignore if user is typing in an input/textarea
      const target = event.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
        return;
      }

      // Show keyboard shortcuts on '?' (Shift + /)
      if (event.key === '?' && !event.ctrlKey && !event.metaKey) {
        event.preventDefault();
        setKeyboardShortcutsOpen(true);
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, []);

  return (
    <NotificationProvider>
      <Router>
        <AppHeader />
        <Container maxWidth={false} sx={{ px: { xs: 2, sm: 3, md: 4, lg: 6 }, pb: 4 }}>
          <Routes>
            <Route path="/" element={<ProjectsLists />} />
            {/* Executive Dashboard route */}
            <Route path="/executive" element={<ExecutiveDashboard />} />
            {/* The project ID is passed as a route parameter */}
            <Route path="/projects/:projectId" element={<Dashboard />} />
            {/* Trend Analysis route */}
            <Route path="/projects/:projectId/trends" element={<TrendAnalysisPage />} />
            {/* MITRE ATT&CK Attack Surface route */}
            <Route path="/projects/:projectId/attack-surface" element={<AttackSurfacePage />} />
            {/* SLA Dashboard route */}
            <Route path="/sla" element={<SLADashboard />} />
            {/* Vulnerability Repository route */}
            <Route path="/vulnerability-repository" element={<VulnerabilityTemplateManager />} />
            {/* Tag Management route */}
            <Route path="/tags" element={<TagManager />} />
            {/* Calculator routes */}
            <Route path="/calculators/cvss" element={<CVSSCalculatorPage />} />
            <Route path="/calculators/owasp" element={<OWASPCalculatorPage />} />
          </Routes>
        </Container>

        {/* Global Keyboard Shortcuts Dialog */}
        <KeyboardShortcutsDialog
          open={keyboardShortcutsOpen}
          onClose={() => setKeyboardShortcutsOpen(false)}
        />
      </Router>
    </NotificationProvider>
  )
}

export default App
