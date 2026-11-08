"""Factory Pattern implementation for Intelligence Engine."""

from typing import Type, Dict, Any, Optional, TypeVar, Callable
from abc import ABC, abstractmethod

T = TypeVar('T')


class FactoryPattern(ABC):
    """Abstract base class for Factory pattern."""
    
    @abstractmethod
    def create(self, *args, **kwargs) -> Any:
        """Create an instance."""
        pass


class ModuleFactory(FactoryPattern):
    """Factory for creating intelligence modules."""
    
    def __init__(self):
        self._modules: Dict[str, Type] = {}
    
    def register(self, module_id: str, module_class: Type) -> None:
        """Register a module class."""
        self._modules[module_id] = module_class
    
    def create(self, module_id: str, *args, **kwargs) -> Any:
        """Create a module instance."""
        if module_id not in self._modules:
            raise ValueError(f"Unknown module: {module_id}")
        return self._modules[module_id](*args, **kwargs)
    
    def get_available_modules(self) -> List[str]:
        """Get list of available module IDs."""
        return list(self._modules.keys())


class AIStrategyFactory(FactoryPattern):
    """Factory for creating AI strategies."""
    
    def __init__(self):
        self._strategies: Dict[str, Callable] = {}
    
    def register(self, strategy_name: str, strategy_func: Callable) -> None:
        """Register a strategy function."""
        self._strategies[strategy_name] = strategy_func
    
    def create(self, strategy_name: str, *args, **kwargs) -> Callable:
        """Get a strategy function."""
        if strategy_name not in self._strategies:
            raise ValueError(f"Unknown strategy: {strategy_name}")
        return self._strategies[strategy_name]


class SingletonFactory:
    """Factory that creates singleton instances."""
    
    _instances: Dict[str, Any] = {}
    
    @classmethod
    def get_instance(cls, key: str, creator: Callable[[], Any]) -> Any:
        """Get or create a singleton instance."""
        if key not in cls._instances:
            cls._instances[key] = creator()
        return cls._instances[key]
    
    @classmethod
    def clear(cls):
        """Clear all instances."""
        cls._instances.clear()
