"""Refactored Base class for all LIFEOS intelligence modules with design patterns.

This module provides:
- Enhanced BaseModule with Strategy pattern for AI/fallback processing
- Factory pattern for module creation
- Observer pattern support for event notifications
- Common utilities and error handling
"""

import time
import uuid
from abc import ABC, abstractmethod
from typing import Dict, Any, List, Optional, Type, TypeVar, Callable, Union
import logging

from core.utils import AIHelper, ValidationHelper, DataNormalizer, ErrorHandler
from core.patterns import StrategyPattern, FactoryPattern, Subject, Observer
from core.exceptions import ModuleError, ProcessingError, ValidationError

T = TypeVar('T')

logger = logging.getLogger(__name__)


# ============================================================================
# Strategy Classes for AI Processing
# ============================================================================

class AIProcessingStrategy(StrategyPattern[Dict[str, Any]]):
    """Strategy for AI-powered processing."""
    
    def __init__(self, module_id: str, ai_helper: AIHelper = None):
        self.module_id = module_id
        self.ai_helper = ai_helper or AIHelper()
    
    async def execute(self, data: Dict[str, Any], **kwargs) -> Dict[str, Any]:
        """Execute AI processing strategy."""
        if not self.ai_helper.is_ai_available():
            raise ProcessingError(
                f"AI not available for {self.module_id}",
                details={"module_id": self.module_id}
            )
        return await self._process_with_ai(data, **kwargs)
    
    async def _process_with_ai(self, data: Dict[str, Any], **kwargs) -> Dict[str, Any]:
        """Process data with AI - to be implemented by subclasses."""
        raise NotImplementedError("Subclasses must implement _process_with_ai")


class FallbackProcessingStrategy(StrategyPattern[Dict[str, Any]]):
    """Strategy for fallback processing when AI is not available."""
    
    def __init__(self, module_id: str, fallback_func: Callable[..., Dict[str, Any]]):
        self.module_id = module_id
        self.fallback_func = fallback_func
    
    async def execute(self, data: Dict[str, Any], **kwargs) -> Dict[str, Any]:
        """Execute fallback processing."""
        logger.info(f"Using fallback processing for {self.module_id}")
        return self.fallback_func(data, **kwargs)


class HybridProcessingStrategy(StrategyPattern[Dict[str, Any]]):
    """Strategy that tries AI first, then falls back to local processing."""
    
    def __init__(
        self,
        module_id: str,
        ai_strategy: AIProcessingStrategy,
        fallback_strategy: FallbackProcessingStrategy
    ):
        self.module_id = module_id
        self.ai_strategy = ai_strategy
        self.fallback_strategy = fallback_strategy
    
    async def execute(self, data: Dict[str, Any], **kwargs) -> Dict[str, Any]:
        """Execute hybrid processing - AI first, then fallback."""
        try:
            if self.ai_strategy.ai_helper.is_ai_available():
                return await self.ai_strategy.execute(data, **kwargs)
        except Exception as e:
            logger.warning(f"AI processing failed for {self.module_id}: {e}")
        
        return await self.fallback_strategy.execute(data, **kwargs)


# ============================================================================
# Module Factory
# ============================================================================

class ModuleFactory(FactoryPattern):
    """Factory for creating intelligence modules."""
    
    _registry: Dict[str, Type['BaseModuleRefactored']] = {}
    
    @classmethod
    def register(cls, module_id: str, module_class: Type['BaseModuleRefactored']) -> None:
        """Register a module class."""
        cls._registry[module_id] = module_class
        logger.debug(f"Registered module: {module_id}")
    
    @classmethod
    def create(cls, module_id: str, *args, **kwargs) -> 'BaseModuleRefactored':
        """Create a module instance."""
        if module_id not in cls._registry:
            raise ModuleError(
                f"Unknown module: {module_id}",
                module_id=module_id,
                details={"available": list(cls._registry.keys())}
            )
        logger.debug(f"Creating module instance: {module_id}")
        return cls._registry[module_id](*args, **kwargs)
    
    @classmethod
    def get_registered_modules(cls) -> List[str]:
        """Get list of registered module IDs."""
        return list(cls._registry.keys())
    
    @classmethod
    def create_all(cls, *args, **kwargs) -> Dict[str, 'BaseModuleRefactored']:
        """Create instances of all registered modules."""
        return {module_id: cls.create(module_id, *args, **kwargs) 
                for module_id in cls._registry}


# ============================================================================
# Base Module with Design Patterns
# ============================================================================

class BaseModuleRefactored(ABC, Subject):
    """Refactored base class for intelligence modules with design patterns.
    
    Features:
    - Strategy pattern for AI/fallback processing
    - Factory pattern support
    - Observer pattern for event notifications
    - Built-in validation and error handling
    - Standardized response formatting
    """
    
    def __init__(
        self,
        module_id: str,
        name: str,
        description: str,
        status: str = "ready",
        version: str = "1.0.0"
    ):
        self.module_id = module_id
        self.name = name
        self.description = description
        self.status = status
        self.version = version
        self.execution_count = 0
        self.last_execution_time_ms = 0.0
        self.total_execution_time_ms = 0.0
        
        # Initialize utilities
        self.ai_helper = AIHelper()
        self.validator = ValidationHelper()
        self.normalizer = DataNormalizer()
        self.error_handler = ErrorHandler()
        
        # Initialize strategies
        self._ai_strategy = None
        self._fallback_strategy = None
        self._processing_strategy: StrategyPattern[Dict[str, Any]] = None
        
        # Observer pattern support
        super().__init__()
        
        logger.info(f"Initialized module: {module_id} (v{version})")
    
    # ========================================================================
    # Abstract Methods
    # ========================================================================
    
    @abstractmethod
    async def _process_ai(self, data: Dict[str, Any], user_id: str, context: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """Process data with AI - to be implemented by subclasses."""
        pass
    
    @abstractmethod
    async def _process_fallback(self, data: Dict[str, Any], user_id: str, context: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """Fallback processing when AI is not available - to be implemented by subclasses."""
        pass
    
    @abstractmethod
    def get_related_modules(self) -> List[str]:
        """Return list of related module IDs."""
        pass
    
    # ========================================================================
    # Strategy Pattern Methods
    # ========================================================================
    
    def set_processing_strategy(self, strategy: StrategyPattern[Dict[str, Any]]) -> None:
        """Set the processing strategy."""
        self._processing_strategy = strategy
        logger.debug(f"Set processing strategy for {self.module_id}")
    
    def get_processing_strategy(self) -> StrategyPattern[Dict[str, Any]]:
        """Get the current processing strategy."""
        if self._processing_strategy is None:
            # Default to hybrid strategy
            self._ai_strategy = AIProcessingStrategy(self.module_id, self.ai_helper)
            self._fallback_strategy = FallbackProcessingStrategy(
                self.module_id,
                self._process_fallback
            )
            self._processing_strategy = HybridProcessingStrategy(
                self.module_id,
                self._ai_strategy,
                self._fallback_strategy
            )
        return self._processing_strategy
    
    # ========================================================================
    # Public Interface
    # ========================================================================
    
    @abstractmethod
    async def process(self, data: Dict[str, Any], user_id: str, context: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """Process input data and return results.
        
        This method should be implemented by subclasses, but they can use
        the strategy pattern by calling self._execute_with_strategy().
        """
        pass
    
    async def _execute_with_strategy(
        self,
        data: Dict[str, Any],
        user_id: str,
        context: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """Execute processing using the current strategy."""
        # Validate input
        self._validate_input(data, user_id)
        
        # Normalize data
        normalized_data = self._normalize_input(data)
        
        # Execute with strategy
        strategy = self.get_processing_strategy()
        result = await strategy.execute(normalized_data, user_id=user_id, context=context)
        
        # Validate output
        self._validate_output(result)
        
        # Notify observers
        await self.notify({
            "module_id": self.module_id,
            "event": "processing_complete",
            "data": result,
            "user_id": user_id,
        })
        
        return result
    
    async def run(
        self,
        data: Dict[str, Any],
        user_id: str,
        context: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """Run the module with timing and metadata."""
        start = time.time()
        self.execution_count += 1
        
        try:
            # Process with error handling
            result = await self.error_handler.wrap_async(
                lambda: self.process(data, user_id, context),
                error_handler=lambda e: self._handle_processing_error(e, data, user_id)
            )
            
            execution_time_ms = (time.time() - start) * 1000
            self.last_execution_time_ms = execution_time_ms
            self.total_execution_time_ms += execution_time_ms
            
            return {
                "module": self.module_id,
                "result": result,
                "confidence": self.get_confidence(result),
                "execution_time_ms": round(execution_time_ms, 2),
                "recommendations": self.get_recommendations(result),
                "related_modules": self.get_related_modules(),
                "execution_id": str(uuid.uuid4()),
                "status": self.status,
                "version": self.version,
            }
        except Exception as e:
            execution_time_ms = (time.time() - start) * 1000
            logger.error(f"Module {self.module_id} failed: {e}")
            return {
                "module": self.module_id,
                "error": str(e),
                "execution_time_ms": round(execution_time_ms, 2),
                "execution_id": str(uuid.uuid4()),
                "status": "error",
            }
    
    # ========================================================================
    # Input/Output Handling
    # ========================================================================
    
    def _validate_input(self, data: Dict[str, Any], user_id: str) -> None:
        """Validate input data."""
        self.validator.validate_type(data, dict, "data")
        self.validator.validate_type(user_id, str, "user_id")
    
    def _normalize_input(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Normalize input data."""
        normalized = data.copy()
        
        # Normalize common fields
        if "observations" in normalized:
            normalized["observations"] = self.normalizer.normalize_observations(
                normalized["observations"]
            )
        
        if "goals" in normalized:
            normalized["goals"] = self.normalizer.normalize_goals(
                normalized["goals"]
            )
        
        if "current_state" in normalized:
            normalized["current_state"] = self.normalizer.normalize_state(
                normalized["current_state"]
            )
        
        return normalized
    
    def _validate_output(self, result: Dict[str, Any]) -> None:
        """Validate output data."""
        if not isinstance(result, dict):
            raise ProcessingError(
                f"Output must be a dict, got {type(result).__name__}",
                details={"module_id": self.module_id}
            )
    
    def _handle_processing_error(self, error: Exception, data: Dict[str, Any], user_id: str) -> Dict[str, Any]:
        """Handle processing errors."""
        logger.error(f"Processing error in {self.module_id}: {error}")
        return {
            "error": str(error),
            "module": self.module_id,
            "input": self.normalizer.truncate_dict(data),
        }
    
    # ========================================================================
    # Utility Methods
    # ========================================================================
    
    def get_confidence(self, result: Dict[str, Any]) -> float:
        """Extract confidence score from result."""
        if isinstance(result, dict):
            confidence = result.get("confidence", 0.5)
            return self.normalizer.normalize_confidence(confidence)
        return 0.5
    
    def get_recommendations(self, result: Dict[str, Any]) -> List[str]:
        """Extract recommendations from result."""
        if isinstance(result, dict):
            recommendations = result.get("recommendations", [])
            return self.validator.validate_list(recommendations)
        return []
    
    def get_module_info(self) -> Dict[str, Any]:
        """Get module metadata."""
        return {
            "module_id": self.module_id,
            "name": self.name,
            "description": self.description,
            "status": self.status,
            "version": self.version,
            "execution_count": self.execution_count,
            "last_execution_time_ms": self.last_execution_time_ms,
            "total_execution_time_ms": self.total_execution_time_ms,
            "related_modules": self.get_related_modules(),
        }
    
    def reset_stats(self) -> None:
        """Reset execution statistics."""
        self.execution_count = 0
        self.last_execution_time_ms = 0.0
        self.total_execution_time_ms = 0.0
    
    # ========================================================================
    # Observer Pattern Support
    # ========================================================================
    
    async def notify_observers(self, event: str, data: Dict[str, Any]) -> None:
        """Notify all observers of an event."""
        await self.notify({
            "module_id": self.module_id,
            "event": event,
            "data": data,
            "timestamp": time.time(),
        })
