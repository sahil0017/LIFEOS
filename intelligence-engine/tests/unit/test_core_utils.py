"""Unit tests for core utilities."""

import unittest
import asyncio
from typing import Dict, Any, List

import sys
sys.path.insert(0, '/Users/sahilkanungo/Desktop/LIFEOS/intelligence-engine')

from core.utils import (
    AIHelper,
    ValidationHelper,
    DataNormalizer,
    ResponseFormatter,
    ErrorHandler,
)
from core.exceptions import ValidationError


class TestValidationHelper(unittest.IsolatedAsyncioTestCase):
    """Tests for ValidationHelper."""
    
    def setUp(self):
        self.validator = ValidationHelper()
    
    def test_validate_type_success(self):
        """Test type validation with correct type."""
        self.validator.validate_type("test", str, "field")
        self.validator.validate_type(42, int, "field")
        self.validator.validate_type(3.14, float, "field")
        self.validator.validate_type([], list, "field")
        self.validator.validate_type({}, dict, "field")
    
    def test_validate_type_failure(self):
        """Test type validation with incorrect type."""
        with self.assertRaises(ValidationError):
            self.validator.validate_type("test", int, "field")
        
        with self.assertRaises(ValidationError):
            self.validator.validate_type(42, str, "field")
    
    def test_validate_dict_success(self):
        """Test dict validation with required fields present."""
        data = {"a": 1, "b": 2, "c": 3}
        self.validator.validate_dict(data, ["a", "b"], "test_data")
    
    def test_validate_dict_failure(self):
        """Test dict validation with missing fields."""
        data = {"a": 1, "b": 2}
        with self.assertRaises(ValidationError):
            self.validator.validate_dict(data, ["a", "c"], "test_data")
    
    def test_validate_list_length(self):
        """Test list length validation."""
        # Min length
        with self.assertRaises(ValidationError):
            self.validator.validate_list([], min_length=1)
        
        # Max length
        with self.assertRaises(ValidationError):
            self.validator.validate_list([1, 2, 3, 4, 5], max_length=3)
        
        # Valid length
        self.validator.validate_list([1, 2, 3], min_length=2, max_length=4)
    
    def test_validate_range(self):
        """Test range validation."""
        # Min value
        with self.assertRaises(ValidationError):
            self.validator.validate_range(5, min_val=10)
        
        # Max value
        with self.assertRaises(ValidationError):
            self.validator.validate_range(15, max_val=10)
        
        # Valid range
        self.validator.validate_range(5, min_val=0, max_val=10)
    
    def test_validate_choice(self):
        """Test choice validation."""
        choices = {"a", "b", "c"}
        
        # Valid choice
        self.validator.validate_choice("a", choices)
        
        # Invalid choice
        with self.assertRaises(ValidationError):
            self.validator.validate_choice("d", choices)
    
    def test_validate_string(self):
        """Test string validation."""
        # Valid string
        self.validator.validate_string("test", min_length=2, max_length=10)
        
        # Too short
        with self.assertRaises(ValidationError):
            self.validator.validate_string("a", min_length=2)
        
        # Too long
        with self.assertRaises(ValidationError):
            self.validator.validate_string("test", max_length=2)
        
        # Not a string
        with self.assertRaises(ValidationError):
            self.validator.validate_string(123)


class TestDataNormalizer(unittest.IsolatedAsyncioTestCase):
    """Tests for DataNormalizer."""
    
    def setUp(self):
        self.normalizer = DataNormalizer()
    
    def test_normalize_goal_string(self):
        """Test normalizing a string goal."""
        result = self.normalizer.normalize_goal("Test Goal")
        self.assertIsInstance(result, dict)
        self.assertEqual(result["title"], "Test Goal")
        self.assertEqual(result["priority"], "medium")
    
    def test_normalize_goal_dict(self):
        """Test normalizing a dict goal."""
        goal = {"title": "Test", "description": "Desc", "priority": "high"}
        result = self.normalizer.normalize_goal(goal)
        self.assertEqual(result["title"], "Test")
        self.assertEqual(result["description"], "Desc")
        self.assertEqual(result["priority"], "high")
    
    def test_normalize_observation(self):
        """Test normalizing an observation."""
        obs = {
            "category": "test",
            "text": "Test observation",
            "occurred_at": "2024-01-01",
        }
        result = self.normalizer.normalize_observation(obs)
        self.assertEqual(result["category"], "test")
        self.assertEqual(result["label"], "Test observation")
        self.assertEqual(result["text"], "Test observation")
    
    def test_normalize_state(self):
        """Test normalizing a state dict."""
        state = {"energy": 0.8, "focus": "high", "health": 1.5}
        result = self.normalizer.normalize_state(state)
        self.assertAlmostEqual(result["energy"], 0.8)
        self.assertAlmostEqual(result["focus"], 0.5)  # Invalid string converted to 0.5
        self.assertAlmostEqual(result["health"], 1.5)  # Converted to float, not clamped
    
    def test_normalize_confidence(self):
        """Test normalizing confidence values."""
        self.assertEqual(self.normalizer.normalize_confidence(0.5), 0.5)
        self.assertEqual(self.normalizer.normalize_confidence(-0.5), 0.0)
        self.assertEqual(self.normalizer.normalize_confidence(1.5), 1.0)
        self.assertEqual(self.normalizer.normalize_confidence("0.5"), 0.5)
    
    def test_normalize_consensus(self):
        """Test normalizing consensus data."""
        consensus = {
            "option1": {"average_score": 0.8, "agreement": 0.9, "count": 5},
            "option2": {"average": 0.6, "agreement": 0.7, "agent_count": 3},
        }
        result = self.normalizer.normalize_consensus(consensus)
        
        self.assertIn("option1", result)
        self.assertIn("option2", result)
        self.assertIn("average", result["option1"])
        self.assertIn("agreement", result["option1"])
    
    def test_normalize_text(self):
        """Test normalizing text."""
        self.assertEqual(self.normalizer.normalize_text("test"), "test")
        self.assertEqual(self.normalizer.normalize_text(123), "123")
        self.assertEqual(self.normalizer.normalize_text(None), "")
        self.assertEqual(self.normalizer.normalize_text({"a": 1}), '{"a": 1}')
    
    def test_ensure_dict(self):
        """Test ensuring a value is a dict."""
        self.assertEqual(self.normalizer.ensure_dict({"a": 1}), {"a": 1})
        self.assertEqual(self.normalizer.ensure_dict(None), {})
        self.assertEqual(self.normalizer.ensure_dict(None, {"default": "value"}), {"default": "value"})
    
    def test_ensure_list(self):
        """Test ensuring a value is a list."""
        self.assertEqual(self.normalizer.ensure_list([1, 2, 3]), [1, 2, 3])
        self.assertEqual(self.normalizer.ensure_list(None), [])
        self.assertEqual(self.normalizer.ensure_list("test"), ["test"])


class TestResponseFormatter(unittest.IsolatedAsyncioTestCase):
    """Tests for ResponseFormatter."""
    
    def test_format_success(self):
        """Test formatting a success response."""
        result = ResponseFormatter.format_success(
            {"data": "test"},
            message="Test success",
            status="ok"
        )
        self.assertEqual(result["status"], "ok")
        self.assertEqual(result["message"], "Test success")
        self.assertIn("timestamp", result)
    
    def test_format_error(self):
        """Test formatting an error response."""
        result = ResponseFormatter.format_error(
            "Test error",
            code=400,
            details={"field": "test"}
        )
        self.assertEqual(result["error"], "Test error")
        self.assertEqual(result["code"], 400)
        self.assertIn("timestamp", result)
    
    def test_format_module_result(self):
        """Test formatting a module result."""
        result = ResponseFormatter.format_module_result(
            module_id="test",
            result={"output": "test"},
            execution_time_ms=100.5,
            confidence=0.85,
            recommendations=["test recommendation"],
            related_modules=["module1", "module2"],
            execution_id="test-123"
        )
        self.assertEqual(result["module"], "test")
        self.assertEqual(result["confidence"], 0.85)
        self.assertEqual(result["execution_time_ms"], 100.5)
    
    def test_truncate_text(self):
        """Test truncating text."""
        long_text = "a" * 1000
        result = ResponseFormatter.truncate_text(long_text, max_length=100)
        self.assertEqual(len(result), 103)  # 100 chars + "..."
        
        short_text = "short"
        result = ResponseFormatter.truncate_text(short_text, max_length=100)
        self.assertEqual(result, short_text)


class TestErrorHandler(unittest.IsolatedAsyncioTestCase):
    """Tests for ErrorHandler."""
    
    def test_get_error_info(self):
        """Test extracting error information."""
        try:
            raise ValueError("Test error")
        except ValueError as e:
            info = ErrorHandler.get_error_info(e)
            self.assertEqual(info["type"], "ValueError")
            self.assertEqual(info["message"], "Test error")
            self.assertIn("traceback", info)
    
    def test_create_error_response(self):
        """Test creating an error response."""
        from core.exceptions import ValidationError
        
        error = ValidationError("Test validation", code=400, details={"field": "test"})
        response = ErrorHandler.create_error_response(error)
        
        self.assertEqual(response["error"], "ValidationError")
        self.assertEqual(response["message"], "Test validation")
        self.assertEqual(response["code"], 400)


if __name__ == "__main__":
    unittest.main()
