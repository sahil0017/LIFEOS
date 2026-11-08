"""Strategy Pattern implementation for Intelligence Engine."""

from abc import ABC, abstractmethod
from typing import TypeVar, Generic, Callable, Any, Dict, List, Optional

T = TypeVar('T')


class StrategyPattern(ABC, Generic[T]):
    """Abstract base class for Strategy pattern."""
    
    @abstractmethod
    async def execute(self, *args, **kwargs) -> T:
        """Execute the strategy."""
        pass


class AIStrategy(StrategyPattern[Dict[str, Any]]):
    """Strategy for AI-based processing."""
    
    def __init__(self, model: str = "gemma-4-26b-it", temperature: float = 0.3, max_tokens: int = 2048):
        self.model = model
        self.temperature = temperature
        self.max_tokens = max_tokens
    
    async def execute(self, prompt: str, system_prompt: str = "", **kwargs) -> Dict[str, Any]:
        """Execute AI strategy."""
        from services.cloudflare_ai import get_ai_client
        ai = get_ai_client()
        
        response = await ai.generate_text(
            prompt=prompt,
            system_prompt=system_prompt,
            model=self.model,
            temperature=self.temperature,
            max_tokens=self.max_tokens,
            **kwargs
        )
        return {"response": response, "model": self.model}


class FallbackStrategy(StrategyPattern[Dict[str, Any]]):
    """Strategy for fallback processing when AI is not available."""
    
    def __init__(self, fallback_func: Callable[..., Dict[str, Any]]):
        self.fallback_func = fallback_func
    
    async def execute(self, *args, **kwargs) -> Dict[str, Any]:
        """Execute fallback strategy."""
        return self.fallback_func(*args, **kwargs)


class HybridStrategy(StrategyPattern[Dict[str, Any]]):
    """Strategy that combines AI and fallback."""
    
    def __init__(self, ai_strategy: AIStrategy, fallback_strategy: FallbackStrategy):
        self.ai_strategy = ai_strategy
        self.fallback_strategy = fallback_strategy
        from services.cloudflare_ai import get_ai_client
        self.ai = get_ai_client()
    
    async def execute(self, *args, **kwargs) -> Dict[str, Any]:
        """Execute hybrid strategy - try AI first, then fallback."""
        if self.ai.is_configured:
            try:
                return await self.ai_strategy.execute(*args, **kwargs)
            except Exception:
                pass
        return await self.fallback_strategy.execute(*args, **kwargs)


class StrategyContext:
    """Context that uses a strategy."""
    
    def __init__(self, strategy: StrategyPattern[T]):
        self._strategy = strategy
    
    @property
    def strategy(self) -> StrategyPattern[T]:
        return self._strategy
    
    @strategy.setter
    def strategy(self, strategy: StrategyPattern[T]):
        self._strategy = strategy
    
    async def execute_strategy(self, *args, **kwargs) -> T:
        """Execute the current strategy."""
        return await self._strategy.execute(*args, **kwargs)
