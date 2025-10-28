// frontend/src/components/Dashboard.js
import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import RiskChart from './RiskChart';
import FindingsTable from './FindingsTable';

const API_BASE_URL = 'http://localhost:8000'; 

const headerStyle = {
    backgroundColor: '#e9ecef',
    padding: '20px',
    borderRadius: '5px',
    marginBottom: '20px'
};

const buttonContainerStyle = {
    display: 'flex', 
    gap: '15px', 
    marginTop: '15px'
};

const downloadButtonStyle = {
    padding: '10px 20px',
    borderRadius: '4px',
    fontWeight: 'bold',
    cursor: 'pointer',
    border: 'none',
    textDecoration: 'none',
    textAlign: 'center',
    color: 'white',
};

const Dashboard = () => {
    const { projectId } = useParams();
    const [project, setProject] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchProject = async () => {
            try {
                // Fetch the project details (including all findings and instances)
                const projectResponse = await axios.get(`${API_BASE_URL}/projects/${projectId}`);
                setProject(projectResponse.data);
            } catch (err) {
                console.error("Failed to fetch project details:", err);
                setError("Failed to load project dashboard data.");
            } finally {
                setLoading(false);
            }
        };

        fetchProject();
    }, [projectId]);

    if (loading) return <h2>Loading Dashboard for Project {projectId}...</h2>;
    if (error) return <h2 style={{ color: 'red' }}>{error}</h2>;
    if (!project) return <h2>Project not found.</h2>;

    return (
        <div>
            <div style={headerStyle}>
                <h1>Project: {project.name}</h1>
                <p>Consultant: {project.consultant_name || 'N/A'}</p>
                
                <div style={buttonContainerStyle}>
                    {/* DOCX Download Link */}
                    <a 
                        href={`${API_BASE_URL}/projects/${projectId}/report.docx`} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        style={{ ...downloadButtonStyle, backgroundColor: '#28a745' }}
                    >
                        ⬇️ Download DOCX Report
                    </a>
                    
                    {/* PDF Download Link */}
                    <a 
                        href={`${API_BASE_URL}/projects/${projectId}/report.pdf`} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        style={{ ...downloadButtonStyle, backgroundColor: '#dc3545' }}
                    >
                        ⬇️ Download PDF Report
                    </a>
                </div>
            </div>

            {/* Risk Chart Component */}
            <RiskChart projectId={projectId} />

            {/* Findings Table Component <-- NEW ADDITION */}
            <FindingsTable findings={project.findings} />
        </div>
    );
};

export default Dashboard;