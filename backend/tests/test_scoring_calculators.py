"""
Tests for CVSS 3.1 and OWASP Risk calculators (Task #10).

Validates:
- CVSS 3.1 calculation accuracy against official specification
- OWASP Risk Rating calculation
- Vector parsing and validation
- Edge cases and error handling
"""
import pytest
from app.scoring import (
    parse_cvss_vector,
    calculate_cvss_score,
    calculate_owasp_risk
)


class TestCVSSVectorParsing:
    """Test CVSS vector string parsing."""
    
    def test_parse_valid_cvss_31_vector(self):
        """Test parsing a valid CVSS 3.1 vector."""
        vector = "CVSS:3.1/AV:N/AC:L/PR:N/UI:R/S:C/C:L/I:L/A:N"
        result = parse_cvss_vector(vector)
        
        assert result is not None
        assert result['AV'] == 'N'
        assert result['AC'] == 'L'
        assert result['PR'] == 'N'
        assert result['UI'] == 'R'
        assert result['S'] == 'C'
        assert result['C'] == 'L'
        assert result['I'] == 'L'
        assert result['A'] == 'N'
    
    def test_parse_invalid_version(self):
        """Test parsing with invalid CVSS version."""
        vector = "CVSS:2.0/AV:N/AC:L/Au:N/C:P/I:P/A:P"
        result = parse_cvss_vector(vector)
        
        assert result is None
    
    def test_parse_incomplete_vector(self):
        """Test parsing incomplete vector (missing metrics)."""
        vector = "CVSS:3.1/AV:N/AC:L/PR:N"
        result = parse_cvss_vector(vector)
        
        assert result is None


class TestCVSSCalculation:
    """Test CVSS 3.1 score calculation accuracy."""
    
    def test_cvss_xss_reflected(self):
        """Test XSS (Reflected) - Official CVSS example."""
        vector = "CVSS:3.1/AV:N/AC:L/PR:N/UI:R/S:C/C:L/I:L/A:N"
        result = calculate_cvss_score(vector)
        
        assert result is not None
        score, severity = result
        assert score == 6.1
        assert severity == 'Medium'
    
    def test_cvss_sql_injection(self):
        """Test SQL Injection - Critical severity."""
        vector = "CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H"
        result = calculate_cvss_score(vector)
        
        assert result is not None
        score, severity = result
        assert score == 9.8
        assert severity == 'Critical'
    
    def test_cvss_all_low_impact(self):
        """Test all low/none impacts results in 0.0 score."""
        vector = "CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:N/I:N/A:N"
        result = calculate_cvss_score(vector)
        
        assert result is not None
        score, severity = result
        assert score == 0.0
        assert severity == 'None'
    
    def test_cvss_scope_changed_high(self):
        """Test scope changed with high impact."""
        vector = "CVSS:3.1/AV:N/AC:L/PR:L/UI:N/S:C/C:H/I:H/A:H"
        result = calculate_cvss_score(vector)
        
        assert result is not None
        score, severity = result
        assert score >= 9.0
        assert severity in ['Critical', 'High']
    
    def test_cvss_max_score(self):
        """Test maximum possible CVSS score."""
        vector = "CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:C/C:H/I:H/A:H"
        result = calculate_cvss_score(vector)
        
        assert result is not None
        score, severity = result
        assert score == 10.0
        assert severity == 'Critical'
    
    def test_cvss_invalid_vector(self):
        """Test invalid vector returns None."""
        vector = "INVALID_VECTOR"
        result = calculate_cvss_score(vector)
        
        assert result is None


class TestOWASPRiskCalculation:
    """Test OWASP Risk Rating calculations."""
    
    def test_owasp_critical_risk(self):
        """Test critical risk (9×9 = 81)."""
        risk_score, risk_rating = calculate_owasp_risk(likelihood=9, impact=9)
        
        assert risk_score == 81
        assert risk_rating == 'Critical'
    
    def test_owasp_high_risk(self):
        """Test high risk (5×3 = 15)."""
        risk_score, risk_rating = calculate_owasp_risk(likelihood=5, impact=3)
        
        assert risk_score == 15
        assert risk_rating == 'High'
    
    def test_owasp_medium_risk(self):
        """Test medium risk (3×3 = 9)."""
        risk_score, risk_rating = calculate_owasp_risk(likelihood=3, impact=3)
        
        assert risk_score == 9
        assert risk_rating == 'Medium'
    
    def test_owasp_low_risk(self):
        """Test low risk (2×2 = 4)."""
        risk_score, risk_rating = calculate_owasp_risk(likelihood=2, impact=2)
        
        assert risk_score == 4
        assert risk_rating == 'Low'
    
    def test_owasp_minimal_risk(self):
        """Test minimal risk (1×1 = 1)."""
        risk_score, risk_rating = calculate_owasp_risk(likelihood=1, impact=1)
        
        assert risk_score == 1
        assert risk_rating == 'Low'
    
    def test_owasp_boundary_critical(self):
        """Test OWASP boundary for Critical (>= 18)."""
        risk_score, risk_rating = calculate_owasp_risk(likelihood=2, impact=9)
        
        assert risk_score == 18
        assert risk_rating == 'Critical'
    
    def test_owasp_boundary_high(self):
        """Test OWASP boundary for High (12-17)."""
        risk_score, risk_rating = calculate_owasp_risk(likelihood=4, impact=3)
        
        assert risk_score == 12
        assert risk_rating == 'High'
    
    def test_owasp_boundary_medium(self):
        """Test OWASP boundary for Medium (6-11)."""
        risk_score, risk_rating = calculate_owasp_risk(likelihood=2, impact=3)
        
        assert risk_score == 6
        assert risk_rating == 'Medium'
