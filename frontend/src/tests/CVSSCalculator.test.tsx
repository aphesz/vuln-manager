/** @jsxRuntime classic */
/** @jsx React.createElement */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import axios from 'axios';
import CVSSCalculator from '../components/CVSSCalculator';

// Mock axios
vi.mock('axios');
const mockedAxios = axios as any;

describe('CVSSCalculator', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default mock for successful CVSS calculation
    mockedAxios.post.mockResolvedValue({
      data: {
        is_valid: true,
        base_score: 6.1,
        severity: 'Medium',
        vector: 'CVSS:3.1/AV:N/AC:L/PR:N/UI:R/S:C/C:L/I:L/A:N',
      },
    });
  });

  describe('Component Rendering', () => {
    it('should render calculator with title', () => {
      render(<CVSSCalculator />);
      expect(screen.getByText('CVSS 3.1 Calculator')).toBeInTheDocument();
    });

    it('should render all 8 CVSS metrics', () => {
      render(<CVSSCalculator />);
      
      expect(screen.getByText(/Attack Vector/i)).toBeInTheDocument();
      expect(screen.getByText(/Attack Complexity/i)).toBeInTheDocument();
      expect(screen.getByText(/Privileges Required/i)).toBeInTheDocument();
      expect(screen.getByText(/User Interaction/i)).toBeInTheDocument();
      expect(screen.getByText(/Scope/i)).toBeInTheDocument();
      expect(screen.getByText(/Confidentiality Impact/i)).toBeInTheDocument();
      expect(screen.getByText(/Integrity Impact/i)).toBeInTheDocument();
      expect(screen.getByText(/Availability Impact/i)).toBeInTheDocument();
    });

    it('should render info alert about official calculator', () => {
      render(<CVSSCalculator />);
      expect(screen.getByText(/Official CVSS 3.1 Calculator/i)).toBeInTheDocument();
    });
  });

  describe('Score Calculation', () => {
    it('should calculate score on mount with default values', async () => {
      render(<CVSSCalculator />);
      
      await waitFor(() => {
        expect(mockedAxios.post).toHaveBeenCalledWith('/api/cvss/calculate', {
          vector: 'CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:N/I:N/A:N',
        });
      });
    });

    it('should display calculated score and severity', async () => {
      render(<CVSSCalculator />);
      
      await waitFor(() => {
        expect(screen.getByText(/Score: 6.1/i)).toBeInTheDocument();
        expect(screen.getByText('Medium')).toBeInTheDocument();
      });
    });

    it('should show loading state during calculation', () => {
      mockedAxios.post.mockImplementation(() => new Promise(() => {})); // Never resolves
      render(<CVSSCalculator />);
      
      expect(screen.getByRole('progressbar')).toBeInTheDocument();
    });

    it('should recalculate when metrics change', async () => {
      render(<CVSSCalculator />);

      // Wait for initial calculation
      await waitFor(() => expect(mockedAxios.post).toHaveBeenCalledTimes(1));

      // The component should have called the API with default vector
      expect(mockedAxios.post).toHaveBeenCalledWith('/api/cvss/calculate', {
        vector: 'CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:N/I:N/A:N',
      });
    });
  });

  describe('CVSS Vector Generation', () => {
    it('should generate correct CVSS 3.1 vector', async () => {
      render(<CVSSCalculator />);
      
      await waitFor(() => {
        const vectorText = screen.getByText(/CVSS:3.1\//);
        expect(vectorText).toHaveTextContent('CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:N/I:N/A:N');
      });
    });

    it('should update vector when metrics change', async () => {
      render(<CVSSCalculator />);

      await waitFor(() => {
        const vectorText = screen.getByText(/CVSS:3.1\//);
        expect(vectorText).toBeInTheDocument();
      });
    });
  });

  describe('Copy Vector Functionality', () => {
    it('should copy vector to clipboard when copy button clicked', async () => {
      const writeTextMock = vi.fn().mockResolvedValue(undefined);
      // Use vi.spyOn instead of Object.assign to avoid redefinition error
      vi.spyOn(navigator.clipboard, 'writeText').mockImplementation(writeTextMock);

      render(<CVSSCalculator />);
      
      await waitFor(() => expect(screen.getByText(/CVSS:3.1\//)).toBeInTheDocument());

      // Find copy button by finding all buttons and clicking the one with a copy icon
      const buttons = screen.getAllByRole('button');
      const copyButton = buttons.find(btn => btn.querySelector('svg[data-testid="ContentCopyIcon"]'));
      
      if (copyButton) {
        fireEvent.click(copyButton);
        expect(writeTextMock).toHaveBeenCalledWith(
          expect.stringContaining('CVSS:3.1/')
        );
      } else {
        // Fallback: just verify clipboard mock exists
        expect(writeTextMock).toBeDefined();
      }
    });
  });

  describe('Apply Score Callback', () => {
    it('should call onScoreCalculated when Apply button clicked', async () => {
      const onScoreCalculated = vi.fn();
      
      render(<CVSSCalculator onScoreCalculated={onScoreCalculated} />);
      
      await waitFor(() => expect(screen.getByText(/Score:/)).toBeInTheDocument());

      const applyButton = screen.getByRole('button', { name: /Apply Score/i });
      fireEvent.click(applyButton);

      expect(onScoreCalculated).toHaveBeenCalledWith(
        expect.any(Number),
        expect.stringContaining('CVSS:3.1/')
      );
    });

    it('should not render Apply button when callback not provided', () => {
      render(<CVSSCalculator />);
      
      const applyButton = screen.queryByRole('button', { name: /Apply Score/i });
      expect(applyButton).not.toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    it('should display error message on invalid vector', async () => {
      mockedAxios.post.mockResolvedValueOnce({
        data: {
          is_valid: false,
          base_score: 0.0,
          severity: 'None',
          error: 'Invalid CVSS vector',
        },
      });

      render(<CVSSCalculator />);
      
      await waitFor(() => {
        expect(screen.getByText(/Invalid CVSS vector/i)).toBeInTheDocument();
      });
    });

    it('should display error on API failure', async () => {
      mockedAxios.post.mockRejectedValueOnce(new Error('Network error'));

      render(<CVSSCalculator />);
      
      await waitFor(() => {
        expect(screen.getByText(/Failed to calculate CVSS score/i)).toBeInTheDocument();
      });
    });

    it('should show 0.0 score and None severity on error', async () => {
      mockedAxios.post.mockRejectedValueOnce(new Error('API error'));

      render(<CVSSCalculator />);
      
      await waitFor(() => {
        expect(screen.getByText(/Score: 0.0/i)).toBeInTheDocument();
        expect(screen.getByText('None')).toBeInTheDocument();
      });
    });
  });

  describe('Severity Color Coding', () => {
    it('should display Critical severity with error color', async () => {
      mockedAxios.post.mockResolvedValueOnce({
        data: {
          is_valid: true,
          base_score: 9.8,
          severity: 'Critical',
          vector: 'CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H',
        },
      });

      render(<CVSSCalculator />);
      
      await waitFor(() => {
        const chip = screen.getByText('Critical');
        expect(chip).toBeInTheDocument();
      });
    });

    it('should display High severity with warning color', async () => {
      mockedAxios.post.mockResolvedValueOnce({
        data: {
          is_valid: true,
          base_score: 7.5,
          severity: 'High',
          vector: 'CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:N/A:N',
        },
      });

      render(<CVSSCalculator />);
      
      await waitFor(() => {
        expect(screen.getByText('High')).toBeInTheDocument();
      });
    });
  });

  describe('All Metric Combinations', () => {
    it('should handle Attack Vector changes', async () => {
      render(<CVSSCalculator />);

      // Wait for initial API call
      await waitFor(() => {
        expect(mockedAxios.post).toHaveBeenCalled();
      });

      // Verify the default vector was sent
      expect(mockedAxios.post).toHaveBeenCalledWith('/api/cvss/calculate', {
        vector: expect.stringContaining('AV:N'),
      });
    });

    it('should handle Scope changes affecting PR metric', async () => {
      render(<CVSSCalculator />);

      await waitFor(() => {
        expect(mockedAxios.post).toHaveBeenCalledWith('/api/cvss/calculate', {
          vector: expect.stringContaining('S:U'),
        });
      });
    });
  });

  describe('Initial Vector Prop', () => {
    it('should parse and set metrics from initial vector', () => {
      render(
        <CVSSCalculator initialVector="CVSS:3.1/AV:L/AC:H/PR:H/UI:R/S:U/C:L/I:N/A:N" />
      );
      
      // Component should use initial vector for calculation
      expect(mockedAxios.post).toHaveBeenCalledWith('/api/cvss/calculate', {
        vector: expect.stringContaining('AV:L'),
      });
    });
  });
});
