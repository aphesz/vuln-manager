import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import { Box, Card, CardContent, Typography, Button, CircularProgress, Alert } from '@mui/material';
import { useTheme } from '@mui/material/styles';

// Use relative path for API calls - proxied through Nginx in Docker
const API_BASE_URL = process.env.REACT_APP_API_URL || '/api';

interface Project {
  id: string;
  name: string;
  consultant_name?: string;
}

const ProjectsLists: React.FC = () => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const theme = useTheme();

  useEffect(() => {
    const fetchProjects = async () => {
      try {
        const response = await axios.get(`${API_BASE_URL}/projects/`);
        setProjects(response.data);
      } catch (err) {
        console.error('Failed to fetch projects:', err);
        setError('Failed to load projects. Ensure the backend API is running.');
      } finally {
        setLoading(false);
      }
    };

    fetchProjects();
  }, []);

  if (loading) return <CircularProgress />;
  if (error) return <Alert severity="error">{error}</Alert>;

  if (projects.length === 0) {
    return (
      <Alert severity="info">
        No projects found. Create one via the API docs first!
      </Alert>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Active Assessment Projects
      </Typography>
      {projects.map((project) => (
        <Card key={project.id} sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <CardContent sx={{ flex: 1 }}>
            <Typography variant="h6">{project.name}</Typography>
            <Typography variant="body2" color="textSecondary">
              Consultant: {project.consultant_name || 'N/A'}
            </Typography>
          </CardContent>
          <Box sx={{ p: 2 }}>
            <Button
              component={Link}
              to={`/projects/${project.id}`}
              variant="contained"
              color="primary"
            >
              View Dashboard
            </Button>
          </Box>
        </Card>
      ))}
    </Box>
  );
};

export default ProjectsLists;
