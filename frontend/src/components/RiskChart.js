// frontend/src/components/RiskChart.js
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Bar } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);
const API_BASE_URL = 'http://localhost:8000';

const RiskChart = ({ projectId }) => {
    const [chartData, setChartData] = useState(null);
    const [loading, setLoading] = useState(true);

    const riskColors = {
        'Critical': '#dc3545', // Red
        'High': '#ffc107',     // Yellow/Orange
        'Medium': '#007bff',   // Blue
        'Low': '#28a745',      // Green
        'Informational': '#6c757d',// Gray
    };

    useEffect(() => {
        const fetchChartData = async () => {
            try {
                // Fetch the aggregated risk summary data
                const response = await axios.get(`${API_BASE_URL}/projects/${projectId}/risk_summary`);
                const data = response.data;
                
                const labels = Object.keys(data);
                const counts = Object.values(data);
                
                // Map the labels to their corresponding colors
                const colors = labels.map(label => riskColors[label]);

                setChartData({
                    labels: labels,
                    datasets: [
                        {
                            label: 'Total Vulnerability Instances',
                            data: counts,
                            backgroundColor: colors,
                        },
                    ],
                });
            } catch (err) {
                console.error("Error fetching chart data:", err);
                setChartData(null);
            } finally {
                setLoading(false);
            }
        };

        fetchChartData();
    }, [projectId]);

    if (loading) return <h3>Loading Risk Summary...</h3>;

    const options = {
        responsive: true,
        plugins: {
            legend: { display: false },
            title: {
                display: true,
                text: 'Vulnerability Instances by Risk Rating',
            },
        },
        scales: {
            y: { 
                beginAtZero: true, 
                title: { display: true, text: 'Number of Instances' },
                ticks: {
                    // Ensure y-axis labels are integers
                    callback: function(value) { if (value % 1 === 0) { return value; } }
                }
            }
        }
    };

    return (
        <div style={{ padding: '20px 0' }}>
            <h2>Risk Summary</h2>
            {chartData ? (
                <div style={{ maxWidth: '800px', margin: '0 auto' }}>
                    <Bar data={chartData} options={options} />
                </div>
            ) : (
                <p>No finding data available to generate chart.</p>
            )}
        </div>
    );
};

export default RiskChart;