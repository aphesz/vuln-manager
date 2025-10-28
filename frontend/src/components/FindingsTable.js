// frontend/src/components/FindingsTable.js
import React, { useState, useMemo } from 'react';

// Simple mapping for risk colors
const riskColors = {
    'Critical': '#dc3545',
    'High': '#ffc107',
    'Medium': '#007bff',
    'Low': '#28a745',
    'Informational': '#6c757d',
};

// Map risk names to a numerical value for reliable sorting (Critical = 1, Info = 5)
const riskOrder = {
    'Critical': 1,
    'High': 2,
    'Medium': 3,
    'Low': 4,
    'Informational': 5,
};

// --- Styling ---

const tableStyle = {
    width: '100%',
    borderCollapse: 'collapse',
    marginTop: '20px',
};

const thTdStyle = {
    padding: '12px 15px',
    textAlign: 'left',
    borderBottom: '1px solid #ddd',
};

const thSortableStyle = (isActive) => ({
    ...thTdStyle,
    cursor: 'pointer',
    backgroundColor: isActive ? '#e6f7ff' : '#f2f2f2',
    userSelect: 'none',
});

const riskBadgeStyle = (risk) => ({
    padding: '4px 8px',
    borderRadius: '4px',
    color: 'white',
    fontWeight: 'bold',
    fontSize: '0.85em',
    backgroundColor: riskColors[risk] || '#6c757d',
});

const filterContainerStyle = {
    marginBottom: '15px',
    display: 'flex',
    gap: '15px',
    alignItems: 'center'
};

// --- Component ---

const FindingsTable = ({ findings }) => {
    // Accordion state
    const [openFindingId, setOpenFindingId] = useState(null);
    
    // Filtering state
    const [riskFilter, setRiskFilter] = useState('All');
    
    // Sorting state: { key: 'risk_rating' | 'title' | 'instances', direction: 'ascending' | 'descending' }
    const [sortConfig, setSortConfig] = useState({ key: 'risk_rating', direction: 'ascending' });

    if (!findings || findings.length === 0) {
        return <p>No detailed findings have been parsed for this project yet.</p>;
    }

    // --- Core Sorting and Filtering Logic (Memoized for performance) ---
    const sortedAndFilteredFindings = useMemo(() => {
        let sortedArray = [...findings];

        // 1. Filtering
        if (riskFilter !== 'All') {
            sortedArray = sortedArray.filter(f => f.risk_rating === riskFilter);
        }

        // 2. Sorting
        if (sortConfig.key) {
            sortedArray.sort((a, b) => {
                let aValue, bValue;

                // Handle sorting based on the key
                if (sortConfig.key === 'risk_rating') {
                    aValue = riskOrder[a.risk_rating];
                    bValue = riskOrder[b.risk_rating];
                } else if (sortConfig.key === 'instances') {
                    aValue = a.instances.length;
                    bValue = b.instances.length;
                } else { // Sort by title (string)
                    aValue = a.title.toLowerCase();
                    bValue = b.title.toLowerCase();
                }

                if (aValue < bValue) {
                    return sortConfig.direction === 'ascending' ? -1 : 1;
                }
                if (aValue > bValue) {
                    return sortConfig.direction === 'ascending' ? 1 : -1;
                }
                return 0; // Values are equal
            });
        }
        
        return sortedArray;
    }, [findings, riskFilter, sortConfig]);

    // --- Event Handlers ---
    const toggleDetails = (findingId) => {
        setOpenFindingId(openFindingId === findingId ? null : findingId);
    };

    const requestSort = (key) => {
        let direction = 'ascending';
        if (sortConfig.key === key && sortConfig.direction === 'ascending') {
            direction = 'descending';
        }
        setSortConfig({ key, direction });
    };

    const getSortIndicator = (key) => {
        if (sortConfig.key !== key) return null;
        return sortConfig.direction === 'ascending' ? ' ▲' : ' ▼';
    };

    // --- Render ---
    const riskOptions = ['All', ...Object.keys(riskColors)];

    return (
        <div style={{ padding: '20px 0' }}>
            <h2>Detailed Vulnerability Findings ({sortedAndFilteredFindings.length} / {findings.length} Shown)</h2>
            
            {/* Filter Controls */}
            <div style={filterContainerStyle}>
                <label>Filter by Risk:</label>
                <select 
                    value={riskFilter} 
                    onChange={(e) => setRiskFilter(e.target.value)}
                    style={{ padding: '8px', borderRadius: '4px' }}
                >
                    {riskOptions.map(risk => (
                        <option key={risk} value={risk}>{risk}</option>
                    ))}
                </select>
            </div>

            <table style={tableStyle}>
                <thead>
                    <tr style={{ backgroundColor: '#f2f2f2' }}>
                        <th style={{ ...thTdStyle, width: '5%' }}>#</th>
                        
                        {/* Sortable Header: Title */}
                        <th 
                            style={thSortableStyle(sortConfig.key === 'title')} 
                            onClick={() => requestSort('title')}
                        >
                            Title {getSortIndicator('title')}
                        </th>
                        
                        {/* Sortable Header: Risk */}
                        <th 
                            style={thSortableStyle(sortConfig.key === 'risk_rating')} 
                            onClick={() => requestSort('risk_rating')}
                        >
                            Risk {getSortIndicator('risk_rating')}
                        </th>
                        
                        {/* Sortable Header: Instances */}
                        <th 
                            style={thSortableStyle(sortConfig.key === 'instances')} 
                            onClick={() => requestSort('instances')}
                        >
                            Instances {getSortIndicator('instances')}
                        </th>

                        <th style={{ ...thTdStyle, width: '20%' }}>Action</th>
                    </tr>
                </thead>
                <tbody>
                    {sortedAndFilteredFindings.map((finding, index) => (
                        <React.Fragment key={finding.id}>
                            <tr style={{ cursor: 'pointer', backgroundColor: index % 2 === 0 ? '#ffffff' : '#f9f9f9' }} onClick={() => toggleDetails(finding.id)}>
                                <td style={thTdStyle}>{index + 1}</td>
                                <td style={thTdStyle}>{finding.title}</td>
                                <td style={thTdStyle}>
                                    <span style={riskBadgeStyle(finding.risk_rating)}>
                                        {finding.risk_rating}
                                    </span>
                                </td>
                                <td style={thTdStyle}>{finding.instances.length}</td>
                                <td style={thTdStyle}>
                                    <button 
                                        onClick={(e) => { e.stopPropagation(); toggleDetails(finding.id); }}
                                        style={{ background: openFindingId === finding.id ? '#dc3545' : '#007bff', color: 'white', border: 'none', padding: '5px 10px', borderRadius: '4px', cursor: 'pointer' }}
                                    >
                                        {openFindingId === finding.id ? 'Close Details' : 'View Details'}
                                    </button>
                                </td>
                            </tr>
                            {/* Accordion Row for Details */}
                            {openFindingId === finding.id && (
                                <tr>
                                    <td colSpan="5" style={{ padding: '20px', backgroundColor: '#fff8e1' }}>
                                        <strong>Description:</strong> 
                                        <p style={{ whiteSpace: 'pre-wrap', fontSize: '0.9em' }}>{finding.description}</p>
                                        
                                        <strong>Remediation:</strong> 
                                        <p style={{ whiteSpace: 'pre-wrap', fontSize: '0.9em' }}>{finding.remediation}</p>

                                        <hr style={{ margin: '10px 0' }}/>
                                        
                                        <h4>Instances Found ({finding.instances.length}):</h4>
                                        <ul style={{ listStyleType: 'disc', paddingLeft: '20px' }}>
                                            {finding.instances.map((instance, instIndex) => (
                                                <li key={instIndex} style={{ marginBottom: '10px' }}>
                                                    <strong>Location:</strong> <code>{instance.location}</code><br/>
                                                    <strong>Status:</strong> <span style={riskBadgeStyle(instance.status.split(' ')[0])}>{instance.status}</span>
                                                    <p style={{ margin: '5px 0 0 0', whiteSpace: 'pre-wrap', fontSize: '0.85em', color: '#555' }}>
                                                        {instance.details}
                                                    </p>
                                                </li>
                                            ))}
                                        </ul>
                                    </td>
                                </tr>
                            )}
                        </React.Fragment>
                    ))}
                </tbody>
            </table>
        </div>
    );
};

export default FindingsTable;