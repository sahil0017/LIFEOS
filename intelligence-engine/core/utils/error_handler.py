"""Error handling utilities for Intelligence Engine."""

from typing import Dict, Any, Optional, Union, Callable, TypeVar
import logging
import traceback

from ..exceptions import IntelligenceEngineError, AIServiceError, ValidationError

T = TypeVar('T')

logger = logging.getLogger(__name__)


class ErrorHandler:
    """Helper class for error handling."""
    
    @staticmethod
    def wrap_async(func: Callable[..., T], error_handler: Callable[[Exception], Any] = None) -> Callable[..., T]:
        """Wrap an async function with error handling."""
        async def wrapper(*args, **kwargs) -> T:
            try:
                return await func(*args, **kwargs)
            except IntelligenceEngineError as e:
                if error_handler:
                    return error_handler(e)
                logger.error(f"IntelligenceEngineError: {e}")
                raise
            except Exception as e:
                if error_handler:
                    return error_handler(e)
                logger.error(f"Unexpected error in {func.__name__}: {e}")
                raise IntelligenceEngineError(f"Unexpected error: {e}") from e
        return wrapper
    
    @staticmethod
    async def execute_with_retry(
        func: Callable[..., T],
        max_retries: int = 3,
        delay: float = 1.0,
        backoff: float = 2.0,
        error_handler: Callable[[Exception, int], bool] = None
    ) -> T:
        """Execute a function with retry logic."""
        import asyncio
        
        last_error = None
        for attempt in range(max_retries):
            try:
                return await func()
            except Exception as e:
                last_error = e
                if error_handler and not error_handler(e, attempt):
                    break
                if attempt < max_retries - 1:
                    sleep_time = delay * (backoff ** attempt)
                    logger.warning(f"Attempt {attempt + 1} failed, retrying in {sleep_time}s: {e}")
                    await asyncio.sleep(sleep_time)
        raise last_error
    
    @staticmethod
    def get_error_info(error: Exception) -> Dict[str, Any]:
        """Extract error information from an exception."""
        error_info = {
            "type": type(error).__name__,
            "message": str(error),
            "traceback": traceback.format_exc(),
        }
        
        if isinstance(error, IntelligenceEngineError):
            error_info["code"] = error.code
            error_info["details"] = error.details
        
        return error_info
    
    @staticmethod
    def log_error(error: Exception, context: Dict[str, Any] = None) -> None:
        """Log an error with context."""
        context = context or {}
        error_info = ErrorHandler.get_error_info(error)
        
        logger.error(
            f"Error: {error_info['type']} - {error_info['message']}",
            extra={"context": context, **error_info}
        )
    
    @staticmethod
    def create_error_response(error: Exception, default_code: int = 500) -> Dict[str, Any]:
        """Create an error response dict."""
        if isinstance(error, IntelligenceEngineError):
            return {
                "error": error.__class__.__name__,
                "message": error.message,
                "code": error.code,
                "details": error.details,
            }
        return {
            "error": type(error).__name__,
            "message": str(error),
            "code": default_code,
            "details": {},
        }
    
    @staticmethod
    def handle_ai_error(error: Exception, fallback: Any = None, context: str = "") -> Any:
        """Handle AI service errors with fallback."""
        if isinstance(error, AIServiceError):
            logger.warning(f"AI service error in {context}: {error}")
            if fallback is not None:
                return fallback
            return None
        raise error
    
    @staticmethod
    def handle_validation_error(error: Exception, default: Any = None, context: str = "") -> Any:
        """Handle validation errors."""
        if isinstance(error, ValidationError):
            logger.warning(f"Validation error in {context}: {error}")
            if default is not None:
                return default
            raise
        raise error
    
    @staticmethod
    def safe_execute(
        func: Callable[..., T],
        fallback: Any = None,
        error_handler: Callable[[Exception], Any] = None
    ) -> Callable[..., T]:
        """Create a function that safely executes with fallback."""
        def wrapper(*args, **kwargs) -> T:
            try:
                return func(*args, **kwargs)
            except Exception as e:
                if error_handler:
                    return error_handler(e)
                if fallback is not None:
                    return fallback
                raise
        return wrapper
    
    @staticmethod
    async def safe_execute_async(
        func: Callable[..., T],
        fallback: Any = None,
        error_handler: Callable[[Exception], Any] = None
    ) -> T:
        """Safely execute an async function with fallback."""
        try:
            return await func()
        except Exception as e:
            if error_handler:
                return error_handler(e)
            if fallback is not None:
                return fallback
            raise
    
    @staticmethod
    def suppress_errors(func: Callable[..., T], default: Any = None) -> Callable[..., T]:
        """Create a function that suppresses all errors."""
        def wrapper(*args, **kwargs) -> T:
            try:
                return func(*args, **kwargs)
            except Exception:
                return default
        return wrapper
    
    @staticmethod
    async def suppress_errors_async(func: Callable[..., T], default: Any = None) -> T:
        """Create an async function that suppresses all errors."""
        try:
            return await func()
        except Exception:
            return default
