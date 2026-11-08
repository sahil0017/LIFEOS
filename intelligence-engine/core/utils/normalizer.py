"""Data normalization utilities for Intelligence Engine."""

from typing import Dict, Any, List, Optional, Union, TypeVar
from datetime import datetime
import json

T = TypeVar('T')


class DataNormalizer:
    """Helper class for normalizing data structures."""
    
    @staticmethod
    def normalize_goal(goal: Union[str, Dict[str, Any]]) -> Dict[str, Any]:
        """Normalize a goal to a dict."""
        if isinstance(goal, dict):
            return {
                "title": goal.get("title", ""),
                "description": goal.get("description", ""),
                "priority": goal.get("priority", "medium"),
                "category": goal.get("category", "general"),
                "target_date": goal.get("target_date", ""),
                "completed": goal.get("completed", False),
            }
        else:
            return {
                "title": str(goal),
                "description": "",
                "priority": "medium",
                "category": "general",
                "target_date": "",
                "completed": False,
            }
    
    @staticmethod
    def normalize_observation(obs: Dict[str, Any]) -> Dict[str, Any]:
        """Normalize an observation to a standard format."""
        return {
            "id": obs.get("id", ""),
            "category": obs.get("category", "unknown"),
            "label": obs.get("label", obs.get("text", "")),
            "text": obs.get("text", ""),
            "occurred_at": obs.get("occurred_at", obs.get("date", "")),
            "value": obs.get("value", None),
            "metadata": obs.get("metadata", {}),
        }
    
    @staticmethod
    def normalize_observations(observations: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Normalize a list of observations."""
        return [DataNormalizer.normalize_observation(obs) for obs in observations]
    
    @staticmethod
    def normalize_goals(goals: List[Union[str, Dict[str, Any]]]) -> List[Dict[str, Any]]:
        """Normalize a list of goals."""
        return [DataNormalizer.normalize_goal(goal) for goal in goals]
    
    @staticmethod
    def normalize_state(state: Dict[str, Any]) -> Dict[str, float]:
        """Normalize a state dict to ensure all values are floats between 0 and 1."""
        normalized = {}
        for key, value in state.items():
            if isinstance(value, (int, float)):
                normalized[key] = float(value)
            else:
                try:
                    normalized[key] = float(value)
                except (ValueError, TypeError):
                    normalized[key] = 0.5
        return normalized
    
    @staticmethod
    def normalize_confidence(confidence: Any) -> float:
        """Normalize a confidence value to a float between 0 and 1."""
        if isinstance(confidence, (int, float)):
            return max(0.0, min(1.0, float(confidence)))
        try:
            return max(0.0, min(1.0, float(confidence)))
        except (ValueError, TypeError):
            return 0.5
    
    @staticmethod
    def normalize_consensus(consensus: Dict[str, Any]) -> Dict[str, Dict[str, float]]:
        """Normalize consensus data to ensure proper structure."""
        normalized = {}
        for option, data in consensus.items():
            if isinstance(data, dict):
                normalized[option] = {
                    "average": DataNormalizer.normalize_confidence(data.get("average", data.get("average_score", 0.5))),
                    "agreement": DataNormalizer.normalize_confidence(data.get("agreement", data.get("consistency", 0.5))),
                    "agent_count": int(data.get("agent_count", data.get("count", 1))),
                    "confidence": DataNormalizer.normalize_confidence(data.get("confidence", data.get("confidence_score", 0.7))),
                }
            else:
                normalized[option] = {
                    "average": 0.5,
                    "agreement": 0.5,
                    "agent_count": 1,
                    "confidence": 0.5,
                }
        return normalized
    
    @staticmethod
    def normalize_text(text: Any) -> str:
        """Normalize text to a string."""
        if text is None:
            return ""
        if isinstance(text, str):
            return text
        if isinstance(text, (int, float)):
            return str(text)
        if isinstance(text, dict):
            return json.dumps(text)
        if isinstance(text, list):
            return json.dumps(text)
        return str(text)
    
    @staticmethod
    def normalize_date(date_str: str) -> str:
        """Normalize a date string to ISO format."""
        if not date_str:
            return ""
        try:
            dt = datetime.fromisoformat(date_str.replace("Z", "+00:00"))
            return dt.strftime("%Y-%m-%dT%H:%M:%S%z")
        except (ValueError, TypeError):
            return date_str
    
    @staticmethod
    def normalize_list(items: List[Any]) -> List[Any]:
        """Normalize a list to ensure all items are valid."""
        if not items:
            return []
        return [item for item in items if item is not None]
    
    @staticmethod
    def ensure_dict(value: Any, default: Dict = None) -> Dict:
        """Ensure a value is a dict."""
        if isinstance(value, dict):
            return value
        if default is not None:
            return default
        return {}
    
    @staticmethod
    def ensure_list(value: Any, default: List = None) -> List:
        """Ensure a value is a list."""
        if isinstance(value, list):
            return value
        if value is None:
            return default or []
        return [value] if default is None else default
