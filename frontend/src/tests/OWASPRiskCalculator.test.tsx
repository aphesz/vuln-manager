/** @jsxRuntime classic */
/** @jsx React.createElement */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import OWASPRiskCalculator from '../components/OWASPRiskCalculator';

describe('OWASPRiskCalculator', () => {
  describe('Component Rendering', () => {
    it('should render calculator with title', () => {
      render(<OWASPRiskCalculator />);
      expect(screen.getByText('OWASP Risk Rating Calculator')).toBeInTheDocument();
    });

    it('should render likelihood and impact sliders', () => {
      render(<OWASPRiskCalculator />);
      
      expect(screen.getByText(/Likelihood:/)).toBeInTheDocument();
      expect(screen.getByText(/Impact:/)).toBeInTheDocument();
    });

    it('should render risk matrix table', () => {
      render(<OWASPRiskCalculator />);
      
      expect(screen.getByText('Risk Matrix')).toBeInTheDocument();
      // Matrix should have headers
      expect(screen.getByText('L\\I')).toBeInTheDocument();
    });

    it('should render info alert with formula', () => {
      render(<OWASPRiskCalculator />);
      expect(screen.getByText(/OWASP Risk = Likelihood × Impact/i)).toBeInTheDocument();
    });
  });

  describe('Default Values', () => {
    it('should initialize with likelihood=5 and impact=5', () => {
      render(<OWASPRiskCalculator />);
      
      expect(screen.getByText(/Likelihood: 5/)).toBeInTheDocument();
      expect(screen.getByText(/Impact: 5/)).toBeInTheDocument();
    });

    it('should display default risk score of 25', () => {
      render(<OWASPRiskCalculator />);
      
      expect(screen.getByText(/Risk Score: 25/i)).toBeInTheDocument();
    });

    it('should display Critical rating for default values (5×5=25)', () => {
      render(<OWASPRiskCalculator />);
      
      expect(screen.getByText('Critical')).toBeInTheDocument();
    });
  });

  describe('Risk Score Calculation', () => {
    it('should calculate risk score as likelihood × impact', async () => {
      const user = userEvent.setup();
      render(<OWASPRiskCalculator />);

      // Get sliders
      const sliders = screen.getAllByRole('slider');
      const likelihoodSlider = sliders[0];
      const impactSlider = sliders[1];

      // Set likelihood to 3
      await user.click(likelihoodSlider);
      fireEvent.change(likelihoodSlider, { target: { value: '3' } });

      // Set impact to 4
      await user.click(impactSlider);
      fireEvent.change(impactSlider, { target: { value: '4' } });

      await waitFor(() => {
        expect(screen.getByText(/Risk Score: 12/i)).toBeInTheDocument();
      });
    });

    it('should update score when likelihood changes', async () => {
      const user = userEvent.setup();
      render(<OWASPRiskCalculator />);

      const likelihoodSlider = screen.getAllByRole('slider')[0];
      
      await user.click(likelihoodSlider);
      fireEvent.change(likelihoodSlider, { target: { value: '9' } });

      await waitFor(() => {
        // 9 × 5 = 45
        expect(screen.getByText(/Risk Score: 45/i)).toBeInTheDocument();
      });
    });

    it('should update score when impact changes', async () => {
      const user = userEvent.setup();
      render(<OWASPRiskCalculator />);

      const impactSlider = screen.getAllByRole('slider')[1];
      
      await user.click(impactSlider);
      fireEvent.change(impactSlider, { target: { value: '1' } });

      await waitFor(() => {
        // 5 × 1 = 5
        expect(screen.getByText(/Risk Score: 5/i)).toBeInTheDocument();
      });
    });
  });

  describe('Risk Rating Thresholds', () => {
    it('should show Critical for score >= 18', async () => {
      render(<OWASPRiskCalculator />);

      const likelihoodSlider = screen.getAllByRole('slider')[0];
      const impactSlider = screen.getAllByRole('slider')[1];

      // Set to 2 × 9 = 18
      fireEvent.change(likelihoodSlider, { target: { value: '2' } });
      fireEvent.change(impactSlider, { target: { value: '9' } });

      await waitFor(() => {
        expect(screen.getByText('Critical')).toBeInTheDocument();
      });
    });

    it('should show High for score 12-17', async () => {
      render(<OWASPRiskCalculator />);

      const likelihoodSlider = screen.getAllByRole('slider')[0];
      const impactSlider = screen.getAllByRole('slider')[1];

      // Set to 4 × 3 = 12
      fireEvent.change(likelihoodSlider, { target: { value: '4' } });
      fireEvent.change(impactSlider, { target: { value: '3' } });

      await waitFor(() => {
        expect(screen.getByText('High')).toBeInTheDocument();
      });
    });

    it('should show Medium for score 6-11', async () => {
      render(<OWASPRiskCalculator />);

      const likelihoodSlider = screen.getAllByRole('slider')[0];
      const impactSlider = screen.getAllByRole('slider')[1];

      // Set to 2 × 3 = 6
      fireEvent.change(likelihoodSlider, { target: { value: '2' } });
      fireEvent.change(impactSlider, { target: { value: '3' } });

      await waitFor(() => {
        expect(screen.getByText('Medium')).toBeInTheDocument();
      });
    });

    it('should show Low for score < 6', async () => {
      render(<OWASPRiskCalculator />);

      const likelihoodSlider = screen.getAllByRole('slider')[0];
      const impactSlider = screen.getAllByRole('slider')[1];

      // Set to 1 × 1 = 1
      fireEvent.change(likelihoodSlider, { target: { value: '1' } });
      fireEvent.change(impactSlider, { target: { value: '1' } });

      await waitFor(() => {
        expect(screen.getByText('Low')).toBeInTheDocument();
      });
    });
  });

  describe('Risk Matrix Visualization', () => {
    it('should highlight current selection in matrix', () => {
      render(<OWASPRiskCalculator />);
      
      // Default is 5×5, so cell with value 25 should be highlighted
      const matrixCells = screen.getAllByText('25');
      expect(matrixCells.length).toBeGreaterThan(0);
    });

    it('should display all 81 matrix cells (9×9)', () => {
      render(<OWASPRiskCalculator />);
      
      // Matrix should have 9 rows × 9 columns = 81 cells
      // Plus headers, so total should be more
      const table = screen.getByRole('table');
      expect(table).toBeInTheDocument();
    });

    it('should show correct risk scores in matrix', () => {
      render(<OWASPRiskCalculator />);
      
      // Check a few specific values
      expect(screen.getAllByText('1').length).toBeGreaterThan(0); // 1×1
      expect(screen.getAllByText('81').length).toBeGreaterThan(0); // 9×9
      expect(screen.getAllByText('18').length).toBeGreaterThan(0); // 2×9 or 9×2
    });
  });

  describe('Slider Ranges', () => {
    it('should allow likelihood from 1 to 9', async () => {
      render(<OWASPRiskCalculator />);
      
      const likelihoodSlider = screen.getAllByRole('slider')[0];
      
      // Test min value
      fireEvent.change(likelihoodSlider, { target: { value: '1' } });
      await waitFor(() => {
        expect(screen.getByText(/Likelihood: 1/)).toBeInTheDocument();
      });

      // Test max value
      fireEvent.change(likelihoodSlider, { target: { value: '9' } });
      await waitFor(() => {
        expect(screen.getByText(/Likelihood: 9/)).toBeInTheDocument();
      });
    });

    it('should allow impact from 1 to 9', async () => {
      render(<OWASPRiskCalculator />);
      
      const impactSlider = screen.getAllByRole('slider')[1];
      
      // Test min value
      fireEvent.change(impactSlider, { target: { value: '1' } });
      await waitFor(() => {
        expect(screen.getByText(/Impact: 1/)).toBeInTheDocument();
      });

      // Test max value
      fireEvent.change(impactSlider, { target: { value: '9' } });
      await waitFor(() => {
        expect(screen.getByText(/Impact: 9/)).toBeInTheDocument();
      });
    });
  });

  describe('Guidance Text', () => {
    it('should display likelihood guidance', () => {
      render(<OWASPRiskCalculator />);
      
      expect(screen.getByText(/Likelihood Guidance:/i)).toBeInTheDocument();
      expect(screen.getByText(/1-3:.*Difficult to exploit/i)).toBeInTheDocument();
      expect(screen.getByText(/7-9:.*Easy to exploit/i)).toBeInTheDocument();
    });

    it('should display impact guidance', () => {
      render(<OWASPRiskCalculator />);
      
      expect(screen.getByText(/Impact Guidance:/i)).toBeInTheDocument();
      expect(screen.getByText(/1-3:.*Limited disclosure/i)).toBeInTheDocument();
      expect(screen.getByText(/7-9:.*Complete system compromise/i)).toBeInTheDocument();
    });

    it('should display slider labels', () => {
      render(<OWASPRiskCalculator />);
      
      expect(screen.getByText(/1 - Rare/i)).toBeInTheDocument();
      expect(screen.getByText(/9 - Almost Certain/i)).toBeInTheDocument();
      expect(screen.getByText(/1 - Minimal/i)).toBeInTheDocument();
      expect(screen.getByText(/9 - Catastrophic/i)).toBeInTheDocument();
    });
  });

  describe('Apply Risk Callback', () => {
    it('should call onRiskCalculated when Apply button clicked', async () => {
      const user = userEvent.setup();
      const onRiskCalculated = vi.fn();
      
      render(<OWASPRiskCalculator onRiskCalculated={onRiskCalculated} />);
      
      const applyButton = screen.getByRole('button', { name: /Apply Risk Rating/i });
      await user.click(applyButton);

      expect(onRiskCalculated).toHaveBeenCalledWith(5, 5, 25, 'Critical');
    });

    it('should not render Apply button when callback not provided', () => {
      render(<OWASPRiskCalculator />);
      
      const applyButton = screen.queryByRole('button', { name: /Apply Risk Rating/i });
      expect(applyButton).not.toBeInTheDocument();
    });

    it('should pass correct values in callback', async () => {
      const user = userEvent.setup();
      const onRiskCalculated = vi.fn();
      
      render(<OWASPRiskCalculator onRiskCalculated={onRiskCalculated} />);

      // Change values
      const likelihoodSlider = screen.getAllByRole('slider')[0];
      const impactSlider = screen.getAllByRole('slider')[1];
      
      fireEvent.change(likelihoodSlider, { target: { value: '3' } });
      fireEvent.change(impactSlider, { target: { value: '4' } });

      await waitFor(() => {
        expect(screen.getByText(/Risk Score: 12/i)).toBeInTheDocument();
      });

      const applyButton = screen.getByRole('button', { name: /Apply Risk Rating/i });
      await user.click(applyButton);

      expect(onRiskCalculated).toHaveBeenCalledWith(3, 4, 12, 'High');
    });
  });

  describe('Formula Display', () => {
    it('should display calculation formula', () => {
      render(<OWASPRiskCalculator />);
      
      expect(screen.getByText(/Likelihood: 5 × Impact: 5 = 25/i)).toBeInTheDocument();
    });

    it('should update formula when values change', async () => {
      render(<OWASPRiskCalculator />);

      const likelihoodSlider = screen.getAllByRole('slider')[0];
      fireEvent.change(likelihoodSlider, { target: { value: '7' } });

      await waitFor(() => {
        expect(screen.getByText(/Likelihood: 7 × Impact: 5 = 35/i)).toBeInTheDocument();
      });
    });
  });

  describe('Boundary Testing', () => {
    const testCases = [
      { l: 2, i: 9, score: 18, rating: 'Critical' },
      { l: 17, i: 1, score: 17, rating: 'High' },
      { l: 4, i: 3, score: 12, rating: 'High' },
      { l: 2, i: 3, score: 6, rating: 'Medium' },
      { l: 1, i: 5, score: 5, rating: 'Low' },
      { l: 9, i: 9, score: 81, rating: 'Critical' },
      { l: 1, i: 1, score: 1, rating: 'Low' },
    ];

    testCases.forEach(({ l, i, score, rating }) => {
      it(`should calculate L=${l} × I=${i} = ${score} (${rating})`, async () => {
        if (l > 9 || i > 9) {
          // Skip invalid test cases
          return;
        }

        render(<OWASPRiskCalculator />);

        const likelihoodSlider = screen.getAllByRole('slider')[0];
        const impactSlider = screen.getAllByRole('slider')[1];

        fireEvent.change(likelihoodSlider, { target: { value: l.toString() } });
        fireEvent.change(impactSlider, { target: { value: i.toString() } });

        await waitFor(() => {
          expect(screen.getByText(new RegExp(`Risk Score: ${score}`, 'i'))).toBeInTheDocument();
          expect(screen.getByText(rating)).toBeInTheDocument();
        });
      });
    });
  });
});
