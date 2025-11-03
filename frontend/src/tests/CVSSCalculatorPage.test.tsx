/** @jsxRuntime classic */
/** @jsx React.createElement */

import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import CVSSCalculatorPage from '../components/CVSSCalculatorPage';

describe('CVSSCalculatorPage', () => {
  it('should render page title', () => {
    render(
      <BrowserRouter>
        <CVSSCalculatorPage />
      </BrowserRouter>
    );
    
    expect(screen.getByText('CVSS 3.1 Calculator')).toBeInTheDocument();
  });

  it('should render description', () => {
    render(
      <BrowserRouter>
        <CVSSCalculatorPage />
      </BrowserRouter>
    );
    
    expect(screen.getByText(/Calculate CVSS v3.1 Base Scores/)).toBeInTheDocument();
  });

  it('should render CVSS Calculator component', () => {
    render(
      <BrowserRouter>
        <CVSSCalculatorPage />
      </BrowserRouter>
    );
    
    // Check for CVSS-specific elements
    expect(screen.getByText(/CVSS/)).toBeInTheDocument();
  });
});
