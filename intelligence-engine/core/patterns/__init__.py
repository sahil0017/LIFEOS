"""Design patterns for Intelligence Engine."""

from .strategy import StrategyPattern, StrategyContext, AIStrategy, FallbackStrategy, HybridStrategy
from .factory import FactoryPattern, ModuleFactory, AIStrategyFactory, SingletonFactory
from .observer import ObserverPattern, Subject, Observer, EventObserver, ModuleObserver
from .singleton import SingletonPattern, SingletonRegistry
from .decorator import DecoratorPattern, TimingDecorator, RetryDecorator, CacheDecorator, ValidationDecorator, LoggingDecorator

__all__ = [
    # Strategy
    "StrategyPattern",
    "StrategyContext",
    "AIStrategy",
    "FallbackStrategy",
    "HybridStrategy",
    # Factory
    "FactoryPattern",
    "ModuleFactory",
    "AIStrategyFactory",
    "SingletonFactory",
    # Observer
    "ObserverPattern",
    "Subject",
    "Observer",
    "EventObserver",
    "ModuleObserver",
    # Singleton
    "SingletonPattern",
    "SingletonRegistry",
    # Decorator
    "DecoratorPattern",
    "TimingDecorator",
    "RetryDecorator",
    "CacheDecorator",
    "ValidationDecorator",
    "LoggingDecorator",
]
