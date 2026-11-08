"""Decorator Pattern implementation for Intelligence Engine."""

from typing import Callable, Any, Dict, List, Optional, TypeVar, Awaitable
from functools import wraps
import time
import logging

T = TypeVar('T')

logger = logging.getLogger(__name__)


class DecoratorPattern:
    """Base class for decorators."""
    
    def __init__(self, func: Callable):
        self._func = func
        wraps(func)(self)
    
    def __call__(self, *args, **kwargs) -> Any:
        return self._func(*args, **kwargs)


class TimingDecorator:
    """Decorator for timing function execution."""
    
    def __init__(self, name: str = None):
        self.name = name
    
    def __call__(self, func: Callable) -> Callable:
        @wraps(func)
        async def wrapper(*args, **kwargs) -> Any:
            start = time.time()
            try:
                result = await func(*args, **kwargs)
                return result
            finally:
                elapsed = (time.time() - start) * 1000
                func_name = self.name or func.__name__
                logger.debug(f"{func_name} executed in {elapsed:.2f}ms")
        return wrapper


class RetryDecorator:
    """Decorator for retrying failed operations."""
    
    def __init__(self, max_retries: int = 3, delay: float = 1.0, backoff: float = 2.0):
        self.max_retries = max_retries
        self.delay = delay
        self.backoff = backoff
    
    def __call__(self, func: Callable) -> Callable:
        @wraps(func)
        async def wrapper(*args, **kwargs) -> Any:
            last_error = None
            for attempt in range(self.max_retries):
                try:
                    return await func(*args, **kwargs)
                except Exception as e:
                    last_error = e
                    if attempt < self.max_retries - 1:
                        sleep_time = self.delay * (self.backoff ** attempt)
                        logger.warning(f"Attempt {attempt + 1} failed, retrying in {sleep_time}s: {e}")
                        await asyncio.sleep(sleep_time)
            raise last_error
        return wrapper


class CacheDecorator:
    """Decorator for caching function results."""
    
    def __init__(self, ttl: int = 60):
        self.ttl = ttl
        self._cache: Dict[str, Any] = {}
        self._timestamps: Dict[str, float] = {}
    
    def _make_key(self, *args, **kwargs) -> str:
        """Create a cache key from arguments."""
        key_parts = []
        for arg in args:
            key_parts.append(str(arg))
        for key, value in sorted(kwargs.items()):
            key_parts.append(f"{key}={value}")
        return ":".join(key_parts)
    
    def _is_expired(self, key: str) -> bool:
        """Check if a cache entry is expired."""
        if key not in self._timestamps:
            return True
        return time.time() - self._timestamps[key] > self.ttl
    
    def __call__(self, func: Callable) -> Callable:
        @wraps(func)
        async def wrapper(*args, **kwargs) -> Any:
            key = self._make_key(*args, **kwargs)
            if key in self._cache and not self._is_expired(key):
                logger.debug(f"Cache hit for {func.__name__}")
                return self._cache[key]
            result = await func(*args, **kwargs)
            self._cache[key] = result
            self._timestamps[key] = time.time()
            return result
        return wrapper
    
    def clear(self) -> None:
        """Clear the cache."""
        self._cache.clear()
        self._timestamps.clear()


class ValidationDecorator:
    """Decorator for validating input and output."""
    
    def __init__(self, input_validator: Callable = None, output_validator: Callable = None):
        self.input_validator = input_validator
        self.output_validator = output_validator
    
    def __call__(self, func: Callable) -> Callable:
        @wraps(func)
        async def wrapper(*args, **kwargs) -> Any:
            if self.input_validator:
                self.input_validator(*args, **kwargs)
            result = await func(*args, **kwargs)
            if self.output_validator:
                self.output_validator(result)
            return result
        return wrapper


class LoggingDecorator:
    """Decorator for logging function calls."""
    
    def __init__(self, log_level: str = "info"):
        self.log_level = log_level
    
    def __call__(self, func: Callable) -> Callable:
        @wraps(func)
        async def wrapper(*args, **kwargs) -> Any:
            logger.log(
                getattr(logging, self.log_level.upper()),
                f"Calling {func.__name__} with args: {args}, kwargs: {kwargs}"
            )
            try:
                result = await func(*args, **kwargs)
                logger.log(
                    getattr(logging, self.log_level.upper()),
                    f"{func.__name__} returned: {result}"
                )
                return result
            except Exception as e:
                logger.error(f"{func.__name__} raised: {e}")
                raise
        return wrapper


# Import asyncio for RetryDecorator
import asyncio
