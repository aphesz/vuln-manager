// frontend/src/App.js
import React from 'react';
import { BrowserRouter as Router, Route, Routes, Link } from 'react-router-dom';
import ProjectsList from './components/ProjectsList';
import Dashboard from './components/Dashboard';

// Basic inline styles for a clean, minimal look
const headerStyle = {
  backgroundColor: '#343a40',
  color: 'white',
  padding: '15px 20px',
  marginBottom: '20px'
};

const navLinkStyle = {
  color: 'white',
  textDecoration: 'none',
  fontSize: '1.2em'
};

const containerStyle = {
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '0 20px'
};

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
          <Route path="/" element={<ProjectsList />} />
          {/* The project ID is passed as a route parameter */}
          <Route path="/projects/:projectId" element={<Dashboard />} /> 
        </Routes>
      </div>
    </Router>
  );
};

export default App;