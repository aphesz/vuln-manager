import React, { useState, useEffect } from 'react'
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom'
import { Box } from '@mui/material'
import AppHeader from './components/AppHeader'
import { Sidebar } from './components/Sidebar'
import ProjectsLists from './components/ProjectsLists'
import Dashboard from './components/Dashboard'
import HolisticDashboard from './components/HolisticDashboard'
import SLADashboard from './components/SLADashboard'
import VulnerabilityTemplateManager from './components/VulnerabilityTemplateManager'
import TagManager from './components/TagManager'
import CVSSCalculatorPage from './components/CVSSCalculatorPage'
import OWASPCalculatorPage from './components/OWASPCalculatorPage'
import TrendAnalysisPage from './components/TrendAnalysisPage'
import AttackSurfacePage from './components/AttackSurfacePage'
import ExecutiveDashboard from './components/ExecutiveDashboard'
import ReportBuilderPage from './components/ReportBuilderPage'
import BrandingSettingsPage from './components/BrandingSettingsPage'
import CustomTemplateLibrary from './components/CustomTemplateLibrary'
import CustomTemplateBuilder from './components/CustomTemplateBuilder'
import LoginPage from './components/LoginPage'
import RegisterPage from './components/RegisterPage'
import ProfilePage from './components/ProfilePage'
import UserManagementPage from './components/UserManagementPage'
import ProtectedRoute from './components/ProtectedRoute'
import KeyboardShortcutsDialog from './components/KeyboardShortcutsDialog'
import { NotificationProvider } from './contexts/NotificationContext'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { useSidebarState } from './hooks/useSidebarState'

// Layout wrapper that conditionally renders header/sidebar
const AuthenticatedLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated } = useAuth();
  const { state: sidebarState, toggle: toggleSidebar, isHidden } = useSidebarState();
  const [mobileOpen, setMobileOpen] = useState(false);

  if (!isAuthenticated) {
    // No header/sidebar for unauthenticated users
    return <>{children}</>;
  }

  return (
    <Box sx={{ display: 'flex' }}>
      <AppHeader
        onMenuClick={() => setMobileOpen(true)}
        showMenuButton={true}
        sidebarHidden={isHidden}
        onShowSidebar={toggleSidebar}
      />
      <Sidebar
        state={sidebarState}
        onToggle={toggleSidebar}
        mobileOpen={mobileOpen}
        onMobileClose={() => setMobileOpen(false)}
      />
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          marginTop: '64px',
          minHeight: 'calc(100vh - 64px)',
          width: '100%',
          p: { xs: 1, sm: 1.5, md: 2 },
        }}
      >
        {children}
      </Box>
    </Box>
  );
};

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
    <AuthProvider>
      <NotificationProvider>
        <Router>
          <AuthenticatedLayout>
            <Routes>
              {/* Public routes */}
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />
              
              {/* Protected routes - require authentication */}
              <Route path="/" element={<ProtectedRoute><HolisticDashboard /></ProtectedRoute>} />
              <Route path="/projects" element={<ProtectedRoute><ProjectsLists /></ProtectedRoute>} />
              <Route path="/executive" element={<ProtectedRoute><ExecutiveDashboard /></ProtectedRoute>} />
              <Route path="/reports" element={<ProtectedRoute><ReportBuilderPage /></ProtectedRoute>} />
              <Route path="/settings/branding" element={<ProtectedRoute><BrandingSettingsPage /></ProtectedRoute>} />
              <Route path="/projects/:projectId" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
              <Route path="/projects/:projectId/trends" element={<ProtectedRoute><TrendAnalysisPage /></ProtectedRoute>} />
              <Route path="/projects/:projectId/attack-surface" element={<ProtectedRoute><AttackSurfacePage /></ProtectedRoute>} />
              <Route path="/sla" element={<ProtectedRoute><SLADashboard /></ProtectedRoute>} />
              <Route path="/vulnerability-repository" element={<ProtectedRoute><VulnerabilityTemplateManager /></ProtectedRoute>} />
              <Route path="/tags" element={<ProtectedRoute><TagManager /></ProtectedRoute>} />
              <Route path="/calculators/cvss" element={<ProtectedRoute><CVSSCalculatorPage /></ProtectedRoute>} />
              <Route path="/calculators/owasp" element={<ProtectedRoute><OWASPCalculatorPage /></ProtectedRoute>} />
              <Route path="/custom-templates" element={<ProtectedRoute><CustomTemplateLibrary /></ProtectedRoute>} />
              <Route path="/custom-templates/new" element={<ProtectedRoute><CustomTemplateBuilder /></ProtectedRoute>} />
              <Route path="/custom-templates/:templateId/edit" element={<ProtectedRoute><CustomTemplateBuilder /></ProtectedRoute>} />
              
              {/* User profile route */}
              <Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
              
              {/* Admin routes - require admin role */}
              <Route path="/admin/users" element={<ProtectedRoute requiredRoles={['admin']}><UserManagementPage /></ProtectedRoute>} />
            </Routes>
          </AuthenticatedLayout>

          {/* Global Keyboard Shortcuts Dialog */}
          <KeyboardShortcutsDialog
            open={keyboardShortcutsOpen}
            onClose={() => setKeyboardShortcutsOpen(false)}
          />
        </Router>
      </NotificationProvider>
    </AuthProvider>
  )
}

export default App
