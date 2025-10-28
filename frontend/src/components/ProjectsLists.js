// frontend/src/components/ProjectsList.js
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';

const API_BASE_URL = 'http://localhost:8000'; // Target the FastAPI service

const cardStyle = {
    border: '1px solid #ddd',
    padding: '15px',
    borderRadius: '5px',
    marginBottom: '10px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#f8f9fa'
};

const buttonStyle = {
    padding: '8px 15px',
    backgroundColor: '#007bff',
    color: 'white',
    textDecoration: 'none',
    borderRadius: '4px',
    fontSize: '0.9em'
};

const ProjectsList = () => {
    const [projects, setProjects] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchProjects = async () => {
            try {
                // Fetch list of all projects
                const response = await axios.get(`${API_BASE_URL}/projects/`);
                setProjects(response.data);
            } catch (err) {
                console.error("Failed to fetch projects:", err);
                setError("Failed to load projects. Ensure the backend API is running.");
            } finally {
                setLoading(false);
            }
        };

        fetchProjects();
    }, []);

    if (loading) return <h2>Loading Projects...</h2>;
    if (error) return <h2 style={{ color: 'red' }}>{error}</h2>;
    
    // Simple prompt if no projects exist
    if (projects.length === 0) return <h2>No projects found. Create one via the API docs first!</h2>;

    return (
        <div>
            <h2>Active Assessment Projects</h2>
            {projects.map(project => (
                <div key={project.id} style={cardStyle}>
                    <div>
                        <h3>{project.name}</h3>
                        <p>Consultant: {project.consultant_name || 'N/A'}</p>
                    </div>
                    {/* Link to the detailed dashboard */}
                    <Link to={`/projects/${project.id}`} style={buttonStyle}>
                        View Dashboard
                    </Link>
                </div>
            ))}
        </div>
    );
};

export default ProjectsList;