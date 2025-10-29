import React from 'react';
import { Pie } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
  ChartData,
  ChartOptions
} from 'chart.js';
import { Finding } from '../types';

ChartJS.register(ArcElement, Tooltip, Legend);

interface RiskChartProps {
  findings: Finding[];
}

const RiskChart: React.FC<RiskChartProps> = ({ findings }) => {
  // Count findings by risk level
  const riskCounts = findings.reduce((acc, finding) => {
    const { risk_rating } = finding;
    acc[risk_rating] = (acc[risk_rating] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const chartData: ChartData<'pie'> = {
    labels: Object.keys(riskCounts),
    datasets: [
      {
        data: Object.values(riskCounts),
        backgroundColor: [
          '#dc3545', // Critical
          '#ff9800', // High
          '#2196f3', // Medium
          '#4caf50', // Low
          '#757575', // Informational
        ],
        borderWidth: 1,
      },
    ],
  };

  const options: ChartOptions<'pie'> = {
    responsive: true,
    plugins: {
      legend: {
        position: 'bottom' as const,
      },
      title: {
        display: false,
      },
    },
  };

  return (
    <div style={{ maxWidth: '400px', margin: '0 auto' }}>
      <Pie data={chartData} options={options} />
    </div>
  );
};

export default RiskChart;