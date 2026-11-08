"""Base exceptions for Intelligence Engine."""


class IntelligenceEngineError(Exception):
    """Base exception for all Intelligence Engine errors."""
    
    def __init__(self, message: str, code: int = 500, details: dict = None):
        super().__init__(message)
        self.message = message
        self.code = code
        self.details = details or {}
    
    def __str__(self) -> str:
        return f"IntelligenceEngineError({self.code}): {self.message}"
    
    def to_dict(self) -> dict:
        """Convert exception to dictionary for API responses."""
        return {
            "error": self.__class__.__name__,
            "message": self.message,
            "code": self.code,
            "details": self.details,
        }


class AIServiceError(IntelligenceEngineError):
    """Exception for AI service related errors."""
    
    def __init__(self, message: str, code: int = 503, details: dict = None):
        super().__init__(message, code, details)


class ValidationError(IntelligenceEngineError):
    """Exception for validation errors."""
    
    def __init__(self, message: str, code: int = 400, details: dict = None):
        super().__init__(message, code, details)


class ConfigurationError(IntelligenceEngineError):
    """Exception for configuration errors."""
    
    def __init__(self, message: str, code: int = 500, details: dict = None):
        super().__init__(message, code, details)


class ProcessingError(IntelligenceEngineError):
    """Exception for processing errors."""
    
    def __init__(self, message: str, code: int = 422, details: dict = None):
        super().__init__(message, code, details)


class ModuleError(IntelligenceEngineError):
    """Exception for module-specific errors."""
    
    def __init__(self, message: str, module_id: str = None, code: int = 500, details: dict = None):
        super().__init__(message, code, details)
        self.module_id = module_id
    
    def to_dict(self) -> dict:
        result = super().to_dict()
        if self.module_id:
            result["module_id"] = self.module_id
        return result


class DataError(IntelligenceEngineError):
    """Exception for data-related errors."""
    
    def __init__(self, message: str, code: int = 400, details: dict = None):
        super().__init__(message, code, details)
