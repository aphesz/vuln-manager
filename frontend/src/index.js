import React from 'react';
import ReactDOM from 'react-dom/client';

// Simple placeholder component
const App = () => {
  return (
    <div style={{ padding: '20px', textAlign: 'center' }}>
      <h1>VulnManager Frontend (React Placeholder)</h1>
      <p>The build process is now successful! Please develop your application in the <code>/frontend</code> directory.</p>
      <p>API is running on port 8000, Frontend on port 3000.</p>
    </div>
  );
};

// Render the application
const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);