"""Singleton Pattern implementation for Intelligence Engine."""

from typing import TypeVar, Any, Dict
from abc import ABC

T = TypeVar('T')


class SingletonPattern(ABC):
    """Abstract base class for Singleton pattern."""
    
    _instance = None
    
    @classmethod
    def get_instance(cls) -> 'SingletonPattern':
        """Get the singleton instance."""
        if cls._instance is None:
            cls._instance = cls()
        return cls._instance
    
    def __new__(cls, *args, **kwargs):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance


class SingletonRegistry:
    """Registry for managing multiple singleton instances."""
    
    _instances: Dict[str, Any] = {}
    
    @classmethod
    def get_instance(cls, key: str, creator: callable) -> Any:
        """Get or create a singleton instance with a key."""
        if key not in cls._instances:
            cls._instances[key] = creator()
        return cls._instances[key]
    
    @classmethod
    def register(cls, key: str, instance: Any) -> None:
        """Register a singleton instance."""
        cls._instances[key] = instance
    
    @classmethod
    def unregister(cls, key: str) -> None:
        """Unregister a singleton instance."""
        if key in cls._instances:
            del cls._instances[key]
    
    @classmethod
    def clear(cls) -> None:
        """Clear all instances."""
        cls._instances.clear()
    
    @classmethod
    def has(cls, key: str) -> bool:
        """Check if an instance exists for a key."""
        return key in cls._instances
