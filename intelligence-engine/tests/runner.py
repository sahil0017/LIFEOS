#!/usr/bin/env python3
"""Test runner for Intelligence Engine."""

import sys
import os
import unittest
import asyncio
from datetime import datetime

# Add the project root to the path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))


def run_tests():
    """Run all tests."""
    print("=" * 80)
    print("Intelligence Engine - Test Suite")
    print("=" * 80)
    print(f"Start time: {datetime.now().isoformat()}")
    print()
    
    # Discover and load all tests
    loader = unittest.TestLoader()
    suite = unittest.TestSuite()
    
    # Add unit tests
    print("Loading unit tests...")
    unit_tests = loader.discover('tests/unit', pattern='test_*.py')
    suite.addTests(unit_tests)
    
    # Add integration tests (if any)
    print("Loading integration tests...")
    integration_tests = loader.discover('tests/integration', pattern='test_*.py')
    suite.addTests(integration_tests)
    
    # Run tests
    runner = unittest.TextTestRunner(verbosity=2)
    result = runner.run(suite)
    
    # Print summary
    print()
    print("=" * 80)
    print("Test Summary")
    print("=" * 80)
    print(f"Total tests: {result.testsRun}")
    print(f"Successes: {result.testsRun - len(result.failures) - len(result.errors)}")
    print(f"Failures: {len(result.failures)}")
    print(f"Errors: {len(result.errors)}")
    print(f"End time: {datetime.now().isoformat()}")
    print("=" * 80)
    
    return result.wasSuccessful()


if __name__ == "__main__":
    success = run_tests()
    sys.exit(0 if success else 1)
