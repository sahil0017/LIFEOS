"""AI Helper utilities for Intelligence Engine."""

import json
from typing import Dict, Any, List, Optional, Union, TypeVar
from dataclasses import dataclass

from services.cloudflare_ai import get_ai_client
from ..exceptions import AIServiceError

T = TypeVar('T')


@dataclass
class AIPromptConfig:
    """Configuration for AI prompts."""
    model: str = "gemma-4-26b-it"
    temperature: float = 0.3
    max_tokens: int = 2048
    system_prompt: str = ""
    response_format: str = "json"  # json, text, markdown


class AIHelper:
    """Helper class for common AI operations."""
    
    def __init__(self, default_model: str = "gemma-4-26b-it"):
        self.ai = get_ai_client()
        self.default_model = default_model
    
    async def generate_with_fallback(
        self,
        prompt: str,
        system_prompt: str = "",
        model: str = None,
        temperature: float = 0.3,
        max_tokens: int = 2048,
        fallback: Optional[Dict[str, Any]] = None,
        **kwargs
    ) -> Dict[str, Any]:
        """Generate text with fallback option."""
        model = model or self.default_model
        
        if self.ai.is_configured:
            try:
                response = await self.ai.generate_text(
                    prompt=prompt,
                    system_prompt=system_prompt,
                    model=model,
                    temperature=temperature,
                    max_tokens=max_tokens,
                    **kwargs
                )
                return {"response": response, "source": "ai", "model": model}
            except Exception as e:
                if fallback is not None:
                    return fallback
                raise AIServiceError(f"AI generation failed: {e}")
        
        return fallback or {"response": None, "source": "fallback", "error": "AI not configured"}
    
    async def extract_json(self, text: str) -> Dict[str, Any]:
        """Extract JSON from text."""
        return await self.ai.extract_json(text)
    
    async def generate_embeddings(self, texts: List[str]) -> List[List[float]]:
        """Generate embeddings for texts."""
        if self.ai.is_configured:
            try:
                return await self.ai.generate_embeddings(texts)
            except Exception as e:
                raise AIServiceError(f"Embedding generation failed: {e}")
        return []
    
    async def generate_structured(
        self,
        prompt: str,
        system_prompt: str,
        expected_schema: Dict[str, Any],
        model: str = "gemma-4-26b-it",
        **kwargs
    ) -> Dict[str, Any]:
        """Generate structured output that matches a schema."""
        schema_str = json.dumps(expected_schema, indent=2)
        
        full_prompt = f"""{prompt}

Return ONLY valid JSON with the following schema:
{schema_str}

Do not include any other text or explanations."""

        result = await self.generate_with_fallback(
            prompt=full_prompt,
            system_prompt=system_prompt,
            model=model,
            **kwargs
        )
        
        if result.get("source") == "ai" and result.get("response"):
            try:
                content = result["response"].content
                parsed = json.loads(content)
                return self._validate_schema(parsed, expected_schema)
            except (json.JSONDecodeError, ValueError):
                pass
        
        return self._create_fallback(expected_schema)
    
    def _validate_schema(self, data: Dict[str, Any], schema: Dict[str, Any]) -> Dict[str, Any]:
        """Validate data against schema."""
        if not isinstance(data, dict):
            return self._create_fallback(schema)
        
        result = {}
        for key, value in schema.items():
            if isinstance(value, dict):
                if key in data:
                    result[key] = self._validate_schema(data[key], value)
                else:
                    result[key] = self._create_fallback(value)
            elif isinstance(value, list):
                result[key] = data.get(key, [])
            else:
                result[key] = data.get(key, value)
        
        return result
    
    def _create_fallback(self, schema: Dict[str, Any]) -> Dict[str, Any]:
        """Create fallback data from schema."""
        fallback = {}
        for key, value in schema.items():
            if isinstance(value, dict):
                fallback[key] = self._create_fallback(value)
            elif isinstance(value, list):
                fallback[key] = []
            else:
                fallback[key] = None
        return fallback
    
    def is_ai_available(self) -> bool:
        """Check if AI service is available."""
        return self.ai.is_configured
    
    async def batch_process(
        self,
        items: List[Any],
        process_func: callable,
        batch_size: int = 5,
        **kwargs
    ) -> List[Dict[str, Any]]:
        """Process items in batches."""
        results = []
        for i in range(0, len(items), batch_size):
            batch = items[i:i + batch_size]
            try:
                batch_result = await process_func(batch, **kwargs)
                results.extend(batch_result)
            except Exception as e:
                for item in batch:
                    results.append({"error": str(e), "item": item})
        return results
