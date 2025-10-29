import React from 'react'
import { BrowserRouter as Router, Route, Routes, Link } from 'react-router-dom'
import ProjectsLists from './components/ProjectsLists'
import Dashboard from './components/Dashboard'

const App = () => {
  return (
    <Router>
      <div style={headerStyle}>
        <Link to="/" style={navLinkStyle}>
          🛡️ VulnManager Dashboard
        </Link>
      </div>
      <div style={containerStyle}>
        <Routes>
          <Route path="/" element={<ProjectsLists />} />
          {/* The project ID is passed as a route parameter */}
          <Route path="/projects/:projectId" element={<Dashboard />} />
        </Routes>
      </div>
    </Router>
  )
}

const headerStyle: React.CSSProperties = {
  backgroundColor: '#343a40',
  color: 'white',
  padding: '15px 20px',
  marginBottom: '20px',
}

const navLinkStyle: React.CSSProperties = {
  color: 'white',
  textDecoration: 'none',
  fontSize: '1.2em',
}

const containerStyle: React.CSSProperties = {
  maxWidth: '1200px',
  margin: '0 auto',
  padding: '0 20px',
}

export default App
