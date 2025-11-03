/** @jsxRuntime classic */
/** @jsx React.createElement */

import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import OWASPCalculatorPage from '../components/OWASPCalculatorPage';

describe('OWASPCalculatorPage', () => {
  it('should render page title', () => {
    render(
      <BrowserRouter>
        <OWASPCalculatorPage />
      </BrowserRouter>
    );
    
    expect(screen.getByText('OWASP Risk Rating Calculator')).toBeInTheDocument();
  });

  it('should render description', () => {
    render(
      <BrowserRouter>
        <OWASPCalculatorPage />
      </BrowserRouter>
    );
    
    expect(screen.getByText(/OWASP Risk Rating Methodology/)).toBeInTheDocument();
  });

  it('should render OWASP Calculator component', () => {
    render(
      <BrowserRouter>
        <OWASPCalculatorPage />
      </BrowserRouter>
    );
    
    // Check for OWASP-specific elements
    expect(screen.getByText(/OWASP/)).toBeInTheDocument();
  });
});
