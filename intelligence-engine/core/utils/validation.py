"""Validation utilities for Intelligence Engine."""

from typing import Dict, Any, List, Optional, Set, Union, TypeVar, Callable
from datetime import datetime
from ..exceptions import ValidationError

T = TypeVar('T')


class ValidationHelper:
    """Helper class for data validation."""
    
    @staticmethod
    def validate_type(value: Any, expected_type: type, field_name: str = "field") -> None:
        """Validate that a value is of expected type."""
        if not isinstance(value, expected_type):
            raise ValidationError(
                f"{field_name} must be {expected_type.__name__}, got {type(value).__name__}",
                details={"field": field_name, "expected": expected_type.__name__, "actual": type(value).__name__}
            )
    
    @staticmethod
    def validate_dict(data: Dict[str, Any], required_fields: List[str], field_name: str = "data") -> None:
        """Validate that a dict contains required fields."""
        missing = [f for f in required_fields if f not in data]
        if missing:
            raise ValidationError(
                f"{field_name} missing required fields: {missing}",
                details={"field": field_name, "missing": missing}
            )
    
    @staticmethod
    def validate_list(data: List[Any], min_length: int = 0, max_length: int = None, field_name: str = "list") -> None:
        """Validate list constraints."""
        if len(data) < min_length:
            raise ValidationError(
                f"{field_name} must have at least {min_length} items",
                details={"field": field_name, "min_length": min_length, "actual": len(data)}
            )
        if max_length is not None and len(data) > max_length:
            raise ValidationError(
                f"{field_name} must have at most {max_length} items",
                details={"field": field_name, "max_length": max_length, "actual": len(data)}
            )
    
    @staticmethod
    def validate_range(value: Union[int, float], min_val: float = None, max_val: float = None, field_name: str = "value") -> None:
        """Validate that a numeric value is within range."""
        if min_val is not None and value < min_val:
            raise ValidationError(
                f"{field_name} must be >= {min_val}",
                details={"field": field_name, "min": min_val, "actual": value}
            )
        if max_val is not None and value > max_val:
            raise ValidationError(
                f"{field_name} must be <= {max_val}",
                details={"field": field_name, "max": max_val, "actual": value}
            )
    
    @staticmethod
    def validate_choice(value: Any, choices: Set[Any], field_name: str = "value") -> None:
        """Validate that a value is one of the allowed choices."""
        if value not in choices:
            raise ValidationError(
                f"{field_name} must be one of {choices}",
                details={"field": field_name, "choices": list(choices), "actual": value}
            )
    
    @staticmethod
    def validate_string(value: str, min_length: int = 0, max_length: int = None, pattern: str = None, field_name: str = "string") -> None:
        """Validate string constraints."""
        if not isinstance(value, str):
            raise ValidationError(
                f"{field_name} must be a string",
                details={"field": field_name, "actual_type": type(value).__name__}
            )
        if len(value) < min_length:
            raise ValidationError(
                f"{field_name} must be at least {min_length} characters",
                details={"field": field_name, "min_length": min_length, "actual": len(value)}
            )
        if max_length is not None and len(value) > max_length:
            raise ValidationError(
                f"{field_name} must be at most {max_length} characters",
                details={"field": field_name, "max_length": max_length, "actual": len(value)}
            )
        if pattern:
            import re
            if not re.match(pattern, value):
                raise ValidationError(
                    f"{field_name} does not match pattern {pattern}",
                    details={"field": field_name, "pattern": pattern}
                )
    
    @staticmethod
    def validate_date(value: str, field_name: str = "date") -> None:
        """Validate that a string is a valid ISO date."""
        try:
            datetime.fromisoformat(value.replace("Z", "+00:00"))
        except (ValueError, TypeError):
            raise ValidationError(
                f"{field_name} must be a valid ISO date",
                details={"field": field_name, "value": value}
            )
    
    @staticmethod
    def validate_nested(data: Dict[str, Any], schema: Dict[str, Any], field_name: str = "data") -> None:
        """Validate nested data structure against a schema."""
        for key, validation in schema.items():
            if key not in data:
                if validation.get("required", True):
                    raise ValidationError(
                        f"{field_name}.{key} is required",
                        details={"field": f"{field_name}.{key}"}
                    )
                continue
            
            value = data[key]
            if "type" in validation:
                ValidationHelper.validate_type(value, validation["type"], f"{field_name}.{key}")
            
            if "validator" in validation:
                validation["validator"](value, f"{field_name}.{key}")
            
            if "nested" in validation:
                ValidationHelper.validate_nested(value, validation["nested"], f"{field_name}.{key}")
    
    @staticmethod
    def validate_observations(observations: List[Dict[str, Any]]) -> None:
        """Validate observations list."""
        ValidationHelper.validate_type(observations, list, "observations")
        for i, obs in enumerate(observations):
            if not isinstance(obs, dict):
                raise ValidationError(
                    f"Observation at index {i} must be a dict",
                    details={"index": i, "type": type(obs).__name__}
                )
    
    @staticmethod
    def validate_module_data(data: Dict[str, Any], module_id: str) -> None:
        """Validate data for a specific module."""
        # Common validation for all modules
        ValidationHelper.validate_type(data, dict, "data")
        
        # Module-specific validation can be added here
        module_validators = {
            "cognitive_memory": lambda d: ValidationHelper.validate_dict(
                d, ["observations"], "cognitive_memory data"
            ) if "observations" in d else None,
            "world_model": lambda d: ValidationHelper.validate_dict(
                d, ["current_state", "action"], "world_model data"
            ) if "current_state" in d or "action" in d else None,
        }
        
        if module_id in module_validators:
            validator = module_validators[module_id]
            if validator:
                validator(data)
    
    @staticmethod
    def sanitize_string(value: str, max_length: int = 1000) -> str:
        """Sanitize a string value."""
        if not isinstance(value, str):
            return ""
        return value[:max_length]
    
    @staticmethod
    def sanitize_dict(data: Dict[str, Any], max_depth: int = 5) -> Dict[str, Any]:
        """Sanitize a dict to prevent circular references."""
        if max_depth <= 0:
            return {"...": "max depth reached"}
        
        result = {}
        for key, value in data.items():
            if isinstance(value, dict):
                result[key] = ValidationHelper.sanitize_dict(value, max_depth - 1)
            elif isinstance(value, list):
                result[key] = [
                    ValidationHelper.sanitize_dict(item, max_depth - 1) if isinstance(item, dict) else item
                    for item in value
                ]
            else:
                result[key] = value
        return result
