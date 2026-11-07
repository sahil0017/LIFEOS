"""Base class for all LIFEOS intelligence modules."""

import time
import uuid
from abc import ABC, abstractmethod
from typing import Dict, Any, List, Optional


class BaseModule(ABC):
    """Base class for intelligence modules."""

    def __init__(self, module_id: str, name: str, description: str, status: str = "ready"):
        self.module_id = module_id
        self.name = name
        self.description = description
        self.status = status
        self.execution_count = 0

    @abstractmethod
    async def process(self, data: Dict[str, Any], user_id: str, context: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """Process input data and return results."""
        pass

    @abstractmethod
    def get_related_modules(self) -> List[str]:
        """Return list of related module IDs."""
        pass

    def get_confidence(self, result: Dict[str, Any]) -> float:
        """Extract confidence score from result."""
        return result.get("confidence", 0.5)

    def get_recommendations(self, result: Dict[str, Any]) -> List[str]:
        """Extract recommendations from result."""
        return result.get("recommendations", [])

    async def run(self, data: Dict[str, Any], user_id: str, context: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """Run the module with timing and metadata."""
        start = time.time()
        self.execution_count += 1
        result = await self.process(data, user_id, context)
        execution_time_ms = (time.time() - start) * 1000

        return {
            "module": self.module_id,
            "result": result,
            "confidence": self.get_confidence(result),
            "execution_time_ms": round(execution_time_ms, 2),
            "recommendations": self.get_recommendations(result),
            "related_modules": self.get_related_modules(),
            "execution_id": str(uuid.uuid4()),
        }