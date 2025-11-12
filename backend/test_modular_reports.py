#!/usr/bin/env python3
"""
Quick validation script for modular report system.

Tests:
1. Import all modules without errors
2. Validate module structure
3. Check available modules list
"""
import sys
from pathlib import Path

# Add backend to path
backend_path = Path(__file__).parent.parent
sys.path.insert(0, str(backend_path))

def test_imports():
    """Test that all modules can be imported."""
    print("Testing imports...")
    try:
        from app.report_poc_simple import _strip_html, _fmt_dt, _normalize_risk_label
        print("✅ report_poc_simple imports successful")
        
        from app.report_modular import (
            assemble_report,
            list_available_modules,
            build_context,
            get_module_path,
            AVAILABLE_MODULES
        )
        print("✅ report_modular imports successful")
        
        return True
    except Exception as e:
        print(f"❌ Import failed: {e}")
        return False


def test_module_listing():
    """Test module discovery."""
    print("\nTesting module listing...")
    try:
        from app.report_modular import list_available_modules
        
        modules = list_available_modules()
        print(f"✅ Found {len(modules)} modules")
        
        for mod in modules:
            status = "✅" if mod["exists"] else "⚠️"
            print(f"  {status} {mod['name']}: {mod['description']}")
        
        return True
    except Exception as e:
        print(f"❌ Module listing failed: {e}")
        return False


def test_date_formatter():
    """Test the date formatter helper."""
    print("\nTesting date formatter...")
    try:
        from datetime import datetime
        from app.report_poc_simple import _fmt_dt
        
        # Test with datetime
        dt = datetime(2024, 11, 12, 10, 30, 0)
        result = _fmt_dt(dt)
        assert result == "2024-11-12", f"Expected '2024-11-12', got '{result}'"
        print(f"✅ datetime formatting: {result}")
        
        # Test with None
        result = _fmt_dt(None)
        assert result == "N/A", f"Expected 'N/A', got '{result}'"
        print(f"✅ None handling: {result}")
        
        return True
    except Exception as e:
        print(f"❌ Date formatter failed: {e}")
        return False


def test_html_stripper():
    """Test HTML stripping."""
    print("\nTesting HTML stripper...")
    try:
        from app.report_poc_simple import _strip_html
        
        html_text = "<p>This is a <strong>test</strong> with &amp; entities.</p>"
        result = _strip_html(html_text)
        expected = "This is a test with & entities."
        assert result == expected, f"Expected '{expected}', got '{result}'"
        print(f"✅ HTML stripping: '{result}'")
        
        return True
    except Exception as e:
        print(f"❌ HTML stripper failed: {e}")
        return False


def test_module_paths():
    """Test module path resolution."""
    print("\nTesting module path resolution...")
    try:
        from app.report_modular import get_module_path, AVAILABLE_MODULES
        
        print(f"Available modules: {', '.join(AVAILABLE_MODULES)}")
        
        # Test valid module
        try:
            path = get_module_path("title_page")
            print(f"✅ title_page path: {path}")
        except FileNotFoundError:
            print(f"⚠️  title_page.docx not generated yet (run generate_templates.py)")
        
        # Test invalid module
        try:
            path = get_module_path("nonexistent_module")
            print(f"❌ Should have raised FileNotFoundError")
            return False
        except FileNotFoundError:
            print(f"✅ FileNotFoundError raised for invalid module")
        
        return True
    except Exception as e:
        print(f"❌ Module path test failed: {e}")
        return False


def main():
    """Run all tests."""
    print("=" * 60)
    print("Modular Report System Validation")
    print("=" * 60)
    
    tests = [
        ("Imports", test_imports),
        ("Module Listing", test_module_listing),
        ("Date Formatter", test_date_formatter),
        ("HTML Stripper", test_html_stripper),
        ("Module Paths", test_module_paths),
    ]
    
    results = []
    for name, test_func in tests:
        try:
            passed = test_func()
            results.append((name, passed))
        except Exception as e:
            print(f"❌ {name} test crashed: {e}")
            results.append((name, False))
    
    print("\n" + "=" * 60)
    print("Test Summary")
    print("=" * 60)
    
    passed = sum(1 for _, result in results if result)
    total = len(results)
    
    for name, result in results:
        status = "✅ PASS" if result else "❌ FAIL"
        print(f"{status}: {name}")
    
    print(f"\nTotal: {passed}/{total} tests passed")
    
    if passed == total:
        print("\n🎉 All tests passed! System is ready.")
        return 0
    else:
        print(f"\n⚠️  {total - passed} test(s) failed. Review errors above.")
        return 1


if __name__ == "__main__":
    sys.exit(main())
