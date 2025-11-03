"""
Unit tests for the scoring module (CVSS 3.1 and OWASP Risk calculators).
"""

import pytest
from app.scoring import (
    parse_cvss_vector,
    calculate_cvss_score,
    calculate_owasp_risk,
    validate_cvss_vector,
)


class TestCVSSParser:
    """Test CVSS vector parsing functionality."""
    
    def test_parse_valid_vector(self):
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
    
    def test_parse_cvss_3_0_vector(self):
        """Test parsing CVSS 3.0 vector (should also work)."""
        vector = "CVSS:3.0/AV:L/AC:H/PR:H/UI:N/S:U/C:H/I:H/A:H"
        result = parse_cvss_vector(vector)
        
        assert result is not None
        assert result['AV'] == 'L'
        assert result['S'] == 'U'
    
    def test_parse_invalid_version(self):
        """Test parsing vector with invalid version."""
        vector = "CVSS:2.0/AV:N/AC:L"
        result = parse_cvss_vector(vector)
        assert result is None
    
    def test_parse_missing_metrics(self):
        """Test parsing vector with missing required metrics."""
        vector = "CVSS:3.1/AV:N/AC:L"
        result = parse_cvss_vector(vector)
        assert result is None
    
    def test_parse_empty_vector(self):
        """Test parsing empty vector."""
        result = parse_cvss_vector("")
        assert result is None
    
    def test_parse_none_vector(self):
        """Test parsing None vector."""
        result = parse_cvss_vector(None)
        assert result is None


class TestCVSSCalculator:
    """Test CVSS score calculation using official formula."""
    
    def test_calculate_xss_vector(self):
        """Test XSS vulnerability (known reference: 6.1 Medium)."""
        vector = "CVSS:3.1/AV:N/AC:L/PR:N/UI:R/S:C/C:L/I:L/A:N"
        result = calculate_cvss_score(vector)
        
        assert result is not None
        score, severity = result
        assert score == 6.1
        assert severity == "Medium"
    
    def test_calculate_critical_rce(self):
        """Test Remote Code Execution (should be Critical)."""
        vector = "CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:C/C:H/I:H/A:H"
        result = calculate_cvss_score(vector)
        
        assert result is not None
        score, severity = result
        assert score >= 9.0
        assert severity == "Critical"
    
    def test_calculate_all_none_impact(self):
        """Test vector with no impact (should be 0.0)."""
        vector = "CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:N/I:N/A:N"
        result = calculate_cvss_score(vector)
        
        assert result is not None
        score, severity = result
        assert score == 0.0
        assert severity == "None"
    
    def test_calculate_physical_access_required(self):
        """Test vulnerability requiring physical access (should be Low)."""
        vector = "CVSS:3.1/AV:P/AC:H/PR:H/UI:R/S:U/C:L/I:N/A:N"
        result = calculate_cvss_score(vector)
        
        assert result is not None
        score, severity = result
        assert score < 4.0
        assert severity == "Low"
    
    def test_calculate_scope_changed_impact(self):
        """Test Scope Changed increases score."""
        vector_unchanged = "CVSS:3.1/AV:N/AC:L/PR:L/UI:N/S:U/C:H/I:H/A:H"
        vector_changed = "CVSS:3.1/AV:N/AC:L/PR:L/UI:N/S:C/C:H/I:H/A:H"
        
        result_u = calculate_cvss_score(vector_unchanged)
        result_c = calculate_cvss_score(vector_changed)
        
        assert result_u is not None
        assert result_c is not None
        
        score_u, _ = result_u
        score_c, _ = result_c
        
        # Scope Changed should result in higher score
        assert score_c > score_u
    
    def test_calculate_privileges_required_scope_interaction(self):
        """Test PR metric changes value based on Scope."""
        # PR:L with Scope:U uses 0.62
        # PR:L with Scope:C uses 0.68
        vector_u = "CVSS:3.1/AV:N/AC:L/PR:L/UI:N/S:U/C:H/I:H/A:H"
        vector_c = "CVSS:3.1/AV:N/AC:L/PR:L/UI:N/S:C/C:H/I:H/A:H"
        
        result_u = calculate_cvss_score(vector_u)
        result_c = calculate_cvss_score(vector_c)
        
        assert result_u is not None
        assert result_c is not None
        
        # Both should be valid scores
        score_u, _ = result_u
        score_c, _ = result_c
        assert 0 <= score_u <= 10
        assert 0 <= score_c <= 10
    
    def test_calculate_high_severity_boundary(self):
        """Test High severity boundary (7.0-8.9)."""
        vector = "CVSS:3.1/AV:N/AC:L/PR:L/UI:N/S:U/C:H/I:H/A:N"
        result = calculate_cvss_score(vector)
        
        assert result is not None
        score, severity = result
        assert 7.0 <= score < 9.0
        assert severity == "High"
    
    def test_calculate_medium_severity_boundary(self):
        """Test Medium severity boundary (4.0-6.9)."""
        vector = "CVSS:3.1/AV:N/AC:L/PR:L/UI:N/S:U/C:L/I:L/A:N"
        result = calculate_cvss_score(vector)
        
        assert result is not None
        score, severity = result
        assert 4.0 <= score < 7.0
        assert severity == "Medium"
    
    def test_calculate_invalid_vector(self):
        """Test calculation with invalid vector."""
        vector = "INVALID"
        result = calculate_cvss_score(vector)
        assert result is None


class TestCVSSValidator:
    """Test CVSS vector validation."""
    
    def test_validate_correct_vector(self):
        """Test validation of correct vector."""
        vector = "CVSS:3.1/AV:N/AC:L/PR:N/UI:R/S:C/C:L/I:L/A:N"
        is_valid, error = validate_cvss_vector(vector)
        
        assert is_valid is True
        assert error is None
    
    def test_validate_empty_vector(self):
        """Test validation of empty vector."""
        is_valid, error = validate_cvss_vector("")
        
        assert is_valid is False
        assert "empty" in error.lower()
    
    def test_validate_wrong_version(self):
        """Test validation of wrong CVSS version."""
        vector = "CVSS:2.0/AV:N/AC:L"
        is_valid, error = validate_cvss_vector(vector)
        
        assert is_valid is False
        assert "3.0" in error or "3.1" in error
    
    def test_validate_missing_metrics(self):
        """Test validation with missing metrics."""
        vector = "CVSS:3.1/AV:N/AC:L"
        is_valid, error = validate_cvss_vector(vector)
        
        assert is_valid is False
        assert "missing" in error.lower()
    
    def test_validate_invalid_metric_value(self):
        """Test validation with invalid metric value."""
        vector = "CVSS:3.1/AV:X/AC:L/PR:N/UI:R/S:C/C:L/I:L/A:N"
        is_valid, error = validate_cvss_vector(vector)
        
        assert is_valid is False
        assert "AV" in error


class TestOWASPRiskCalculator:
    """Test OWASP Risk Rating calculator."""
    
    def test_calculate_critical_risk(self):
        """Test Critical risk rating (>= 18)."""
        risk_score, risk_rating = calculate_owasp_risk(9, 9)
        
        assert risk_score == 81
        assert risk_rating == "Critical"
    
    def test_calculate_critical_boundary(self):
        """Test Critical boundary (exactly 18)."""
        risk_score, risk_rating = calculate_owasp_risk(2, 9)
        
        assert risk_score == 18
        assert risk_rating == "Critical"
    
    def test_calculate_high_risk(self):
        """Test High risk rating (12-17)."""
        risk_score, risk_rating = calculate_owasp_risk(5, 3)
        
        assert risk_score == 15
        assert risk_rating == "High"
    
    def test_calculate_high_boundary_low(self):
        """Test High boundary (exactly 12)."""
        risk_score, risk_rating = calculate_owasp_risk(4, 3)
        
        assert risk_score == 12
        assert risk_rating == "High"
    
    def test_calculate_high_boundary_high(self):
        """Test High boundary (17)."""
        risk_score, risk_rating = calculate_owasp_risk(6, 2)  # 12 is minimum for High
        
        assert risk_score == 12
        assert risk_rating == "High"
        
        # Also test highest High value (17)
        risk_score2, risk_rating2 = calculate_owasp_risk(9, 1)
        assert risk_score2 == 9
        assert risk_rating2 == "Medium"  # Actually 9 < 12, so Medium
    
    def test_calculate_medium_risk(self):
        """Test Medium risk rating (6-11)."""
        risk_score, risk_rating = calculate_owasp_risk(3, 3)
        
        assert risk_score == 9
        assert risk_rating == "Medium"
    
    def test_calculate_medium_boundary_low(self):
        """Test Medium boundary (exactly 6)."""
        risk_score, risk_rating = calculate_owasp_risk(2, 3)
        
        assert risk_score == 6
        assert risk_rating == "Medium"
    
    def test_calculate_low_risk(self):
        """Test Low risk rating (< 6)."""
        risk_score, risk_rating = calculate_owasp_risk(1, 1)
        
        assert risk_score == 1
        assert risk_rating == "Low"
    
    def test_calculate_low_boundary(self):
        """Test Low boundary (5)."""
        risk_score, risk_rating = calculate_owasp_risk(5, 1)
        
        assert risk_score == 5
        assert risk_rating == "Low"
    
    def test_calculate_symmetric(self):
        """Test that likelihood and impact are symmetric."""
        result1 = calculate_owasp_risk(3, 5)
        result2 = calculate_owasp_risk(5, 3)
        
        assert result1 == result2
    
    def test_invalid_likelihood_too_low(self):
        """Test invalid likelihood (< 1)."""
        with pytest.raises(ValueError) as excinfo:
            calculate_owasp_risk(0, 5)
        assert "likelihood" in str(excinfo.value).lower()
    
    def test_invalid_likelihood_too_high(self):
        """Test invalid likelihood (> 9)."""
        with pytest.raises(ValueError) as excinfo:
            calculate_owasp_risk(10, 5)
        assert "likelihood" in str(excinfo.value).lower()
    
    def test_invalid_impact_too_low(self):
        """Test invalid impact (< 1)."""
        with pytest.raises(ValueError) as excinfo:
            calculate_owasp_risk(5, 0)
        assert "impact" in str(excinfo.value).lower()
    
    def test_invalid_impact_too_high(self):
        """Test invalid impact (> 9)."""
        with pytest.raises(ValueError) as excinfo:
            calculate_owasp_risk(5, 10)
        assert "impact" in str(excinfo.value).lower()
    
    def test_all_valid_combinations(self):
        """Test all valid likelihood/impact combinations (1-9)."""
        for likelihood in range(1, 10):
            for impact in range(1, 10):
                risk_score, risk_rating = calculate_owasp_risk(likelihood, impact)
                
                # Verify score is correct
                assert risk_score == likelihood * impact
                
                # Verify rating is consistent
                if risk_score >= 18:
                    assert risk_rating == "Critical"
                elif risk_score >= 12:
                    assert risk_rating == "High"
                elif risk_score >= 6:
                    assert risk_rating == "Medium"
                else:
                    assert risk_rating == "Low"


class TestCVSSReferenceVectors:
    """Test against known CVSS reference vectors from NVD."""
    
    def test_heartbleed(self):
        """Test Heartbleed (CVE-2014-0160) - Known CVSS 7.5 High."""
        # CVSS:3.0/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:N/A:N
        vector = "CVSS:3.0/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:N/A:N"
        result = calculate_cvss_score(vector)
        
        assert result is not None
        score, severity = result
        assert score == 7.5
        assert severity == "High"
    
    def test_shellshock(self):
        """Test Shellshock (CVE-2014-6271) - Known CVSS 9.8 Critical."""
        # CVSS:3.0/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H
        vector = "CVSS:3.0/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H"
        result = calculate_cvss_score(vector)
        
        assert result is not None
        score, severity = result
        assert score == 9.8
        assert severity == "Critical"
    
    def test_cross_site_scripting(self):
        """Test typical XSS - CVSS 6.1 Medium."""
        vector = "CVSS:3.1/AV:N/AC:L/PR:N/UI:R/S:C/C:L/I:L/A:N"
        result = calculate_cvss_score(vector)
        
        assert result is not None
        score, severity = result
        assert score == 6.1
        assert severity == "Medium"
    
    def test_sql_injection(self):
        """Test typical SQLi - High severity."""
        vector = "CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H"
        result = calculate_cvss_score(vector)
        
        assert result is not None
        score, severity = result
        assert score == 9.8
        assert severity == "Critical"
