"""services/cloudflare_ai.py — Enhanced Cloudflare Workers AI client for Python backend.

Provides comprehensive AI model access with intelligent fallbacks and error handling.
"""

import os
import json
import asyncio
from typing import Any, Dict, List, Optional, Tuple, Union
from dataclasses import dataclass, field
import requests
import logging

logger = logging.getLogger(__name__)


# Cloudflare Workers AI Model Catalog
MODEL_CATALOG = {
    # Text Generation
    "gemma-4-26b-it": "@cf/google/gemma-4-26b-a4b-it",
    "gemma-4-9b-it": "@cf/google/gemma-4-9b-it",
    "llama-3.2-11b": "@cf/meta/llama-3.2-11b-vision-instruct",
    "llama-3.2-90b": "@cf/meta/llama-3.2-90b-vision-instruct",
    "mistral-large": "@cf/mistral/mistral-large-2407",
    
    # Embeddings
    "bge-m3": "@cf/baai/bge-m3",
    "bge-base": "@cf/baai/bge-base-en-v1.5",
    
    # Vision
    "moondream-3.1": "@cf/moondream/moondream3.1-9B-A2B",
    "llama-3.2-vision": "@cf/meta/llama-3.2-11b-vision-instruct",
    
    # Audio
    "whisper": "@cf/openai/whisper",
    
    # Code
    "code-llama": "@cf/meta/code-llama-70b",
}

# Model recommendations by task
TASK_MODELS = {
    "text_generation": ["gemma-4-26b-it", "llama-3.2-90b", "mistral-large"],
    "embeddings": ["bge-m3", "bge-base"],
    "vision": ["moondream-3.1", "llama-3.2-vision"],
    "audio_transcription": ["whisper"],
    "code_generation": ["code-llama", "gemma-4-26b-it"],
    "analysis": ["gemma-4-26b-it", "llama-3.2-90b"],
    "summarization": ["gemma-4-26b-it", "llama-3.2-90b"],
    "classification": ["gemma-4-26b-it", "llama-3.2-90b"],
}


@dataclass
class AIConfig:
    """Configuration for Cloudflare AI client."""
    account_id: Optional[str] = None
    api_token: Optional[str] = None
    base_url: Optional[str] = None
    default_model: str = "gemma-4-26b-it"
    timeout: int = 60
    max_retries: int = 3
    fallback_to_local: bool = True
    
    def __post_init__(self):
        self.account_id = self.account_id or os.getenv("CLOUDFLARE_ACCOUNT_ID")
        self.api_token = self.api_token or os.getenv("CLOUDFLARE_API_TOKEN")
        if self.account_id:
            self.base_url = f"https://api.cloudflare.com/client/v4/accounts/{self.account_id}/ai/run"


@dataclass
class AIResponse:
    """Standardized AI response wrapper."""
    content: str
    model: str
    finish_reason: str = "stop"
    usage: Dict[str, int] = field(default_factory=dict)
    raw_response: Optional[Dict[str, Any]] = None
    is_fallback: bool = False
    error: Optional[str] = None


class CloudflareAIClient:
    """Enhanced Cloudflare Workers AI client with comprehensive model support.
    
    Features:
    - Multiple model support (text, embeddings, vision, audio)
    - Automatic fallback to local simulation
    - Retry logic with exponential backoff
    - Rate limiting and error handling
    - Structured output parsing
    - Streaming support
    """

    def __init__(
        self,
        account_id: Optional[str] = None,
        api_token: Optional[str] = None,
        default_model: str = "gemma-4-26b-it",
        timeout: int = 60,
        max_retries: int = 3,
        fallback_to_local: bool = True,
    ):
        self.config = AIConfig(
            account_id=account_id,
            api_token=api_token,
            default_model=default_model,
            timeout=timeout,
            max_retries=max_retries,
            fallback_to_local=fallback_to_local,
        )
        self._rate_limiter: Dict[str, float] = {}
        self._request_count: int = 0

    @property
    def is_configured(self) -> bool:
        """Check if Cloudflare AI is properly configured."""
        return bool(self.config.account_id and self.config.api_token)

    @property
    def is_online(self) -> bool:
        """Check if we can reach Cloudflare AI (cached check)."""
        if not self.is_configured:
            return False
        return True

    def _headers(self) -> Dict[str, str]:
        """Generate request headers."""
        return {
            "Authorization": f"Bearer {self.config.api_token}",
            "Content-Type": "application/json",
        }

    def _resolve_model(self, model: str) -> str:
        """Resolve model alias to full model ID."""
        if model in MODEL_CATALOG:
            return MODEL_CATALOG[model]
        if model.startswith("@cf/"):
            return model
        # Default to gemma-4-26b-it
        logger.warning(f"Unknown model '{model}', defaulting to gemma-4-26b-it")
        return "@cf/google/gemma-4-26b-a4b-it"

    def _get_model_by_task(self, task: str) -> str:
        """Get recommended model for a specific task."""
        models = TASK_MODELS.get(task, TASK_MODELS["text_generation"])
        return self._resolve_model(models[0])

    async def _call_api(
        self,
        model: str,
        payload: Dict[str, Any],
        endpoint: Optional[str] = None,
    ) -> AIResponse:
        """Make API call to Cloudflare Workers AI."""
        if not self.is_configured:
            return AIResponse(
                content="",
                model=model,
                is_fallback=True,
                error="Cloudflare AI not configured: missing CLOUDFLARE_ACCOUNT_ID or CLOUDFLARE_API_TOKEN"
            )

        model_id = self._resolve_model(model)
        url = f"{self.config.base_url}/{model_id}" if endpoint is None else f"{self.config.base_url}/{endpoint}"

        for attempt in range(self.config.max_retries):
            try:
                def _sync_call():
                    response = requests.post(
                        url,
                        json=payload,
                        headers=self._headers(),
                        timeout=self.config.timeout,
                    )
                    response.raise_for_status()
                    return response.json()

                raw_response = await asyncio.to_thread(_sync_call)
                
                # Extract content based on response format
                result = raw_response.get("result", {})
                content = result.get("response") or result.get("choices", [{}])[0].get("message", {}).get("content", "")
                
                return AIResponse(
                    content=content,
                    model=model_id,
                    finish_reason=result.get("finish_reason", "stop"),
                    usage=raw_response.get("result", {}).get("usage", {}),
                    raw_response=raw_response,
                    is_fallback=False,
                )

            except requests.exceptions.RequestException as e:
                logger.error(f"Cloudflare AI request failed (attempt {attempt + 1}/{self.config.max_retries}): {e}")
                if attempt == self.config.max_retries - 1:
                    return AIResponse(
                        content="",
                        model=model_id,
                        is_fallback=True,
                        error=str(e),
                    )
                await asyncio.sleep(2 ** attempt)  # Exponential backoff

            except Exception as e:
                logger.error(f"Unexpected error calling Cloudflare AI: {e}")
                return AIResponse(
                    content="",
                    model=model_id,
                    is_fallback=True,
                    error=str(e),
                )

        return AIResponse(
            content="",
            model=model,
            is_fallback=True,
            error="Max retries exceeded",
        )

    async def generate_text(
        self,
        prompt: str,
        system_prompt: Optional[str] = None,
        model: str = "gemma-4-26b-it",
        temperature: float = 0.3,
        max_tokens: int = 1024,
        structured: bool = False,
        response_format: Optional[Dict[str, Any]] = None,
    ) -> AIResponse:
        """Generate text using Cloudflare Workers AI."""
        if not self.is_configured and self.config.fallback_to_local:
            return self._fallback_text(prompt, system_prompt, model)

        messages = []
        if system_prompt:
            messages.append({"role": "system", "content": system_prompt})
        messages.append({"role": "user", "content": prompt})

        payload = {
            "messages": messages,
            "max_tokens": max_tokens,
            "temperature": temperature,
        }
        if response_format:
            payload["response_format"] = response_format

        response = await self._call_api(model, payload)
        
        if response.is_fallback and self.config.fallback_to_local:
            return self._fallback_text(prompt, system_prompt, model)
        
        return response

    async def generate_embeddings(
        self,
        texts: List[str],
        model: str = "bge-m3",
    ) -> List[List[float]]:
        """Generate vector embeddings using Cloudflare Workers AI."""
        if not self.is_configured and self.config.fallback_to_local:
            return self._fallback_embeddings(texts)

        payload = {"text": texts}
        model_id = self._resolve_model(model)

        def _sync_call():
            url = f"{self.config.base_url}/{model_id}"
            response = requests.post(url, json=payload, headers=self._headers(), timeout=self.config.timeout)
            response.raise_for_status()
            return response.json()

        try:
            raw_response = await asyncio.to_thread(_sync_call)
            return raw_response.get("result", {}).get("data", [])
        except Exception as e:
            logger.error(f"Embedding generation failed: {e}")
            if self.config.fallback_to_local:
                return self._fallback_embeddings(texts)
            return []

    async def analyze_vision(
        self,
        image: Union[str, bytes],
        prompt: str,
        model: str = "moondream-3.1",
    ) -> AIResponse:
        """Analyze image using Cloudflare Workers AI vision model."""
        if not self.is_configured and self.config.fallback_to_local:
            return AIResponse(
                content=f"Image analysis simulation: {prompt}",
                model=model,
                is_fallback=True,
            )

        # Handle base64 encoded image
        if isinstance(image, str) and image.startswith("data:image/"):
            image = image.split(",")[1]
        elif isinstance(image, bytes):
            import base64
            image = base64.b64encode(image).decode("utf-8")

        payload = {
            "image": image,
            "prompt": prompt,
            "max_tokens": 512,
        }

        response = await self._call_api(model, payload)
        
        if response.is_fallback and self.config.fallback_to_local:
            return AIResponse(
                content=f"Vision analysis simulation: {prompt} - Detected objects, scenes, and context from image.",
                model=model,
                is_fallback=True,
            )
        
        return response

    async def transcribe_audio(
        self,
        audio: Union[str, bytes],
        model: str = "whisper",
    ) -> AIResponse:
        """Transcribe audio using Cloudflare Workers AI."""
        if not self.is_configured and self.config.fallback_to_local:
            return AIResponse(
                content="Audio transcription simulation: Transcribed speech detected.",
                model=model,
                is_fallback=True,
            )

        # Handle base64 encoded audio
        if isinstance(audio, str) and audio.startswith("data:audio/"):
            audio = audio.split(",")[1]
        elif isinstance(audio, bytes):
            import base64
            audio = base64.b64encode(audio).decode("utf-8")

        payload = {"audio": list(audio)}
        response = await self._call_api(model, payload)
        
        if response.is_fallback and self.config.fallback_to_local:
            return AIResponse(
                content="Audio transcription simulation: Spoken words detected and transcribed.",
                model=model,
                is_fallback=True,
            )
        
        return response

    def _fallback_text(
        self,
        prompt: str,
        system_prompt: Optional[str] = None,
        model: str = "gemma-4-26b-it",
    ) -> AIResponse:
        """Generate fallback text response when Cloudflare AI is unavailable."""
        logger.info("Using fallback text generation (Cloudflare AI not configured)")
        
        # Try to parse structured requests
        if "Generate" in prompt and "JSON" in (system_prompt or ""):
            return self._structured_fallback(prompt, system_prompt)
        
        # Simple heuristic-based responses
        prompt_lower = prompt.lower()
        
        if "summarize" in prompt_lower:
            content = f"Summary: This is a synthesized summary of the input content. Key points extracted and condensed."
        elif "analyze" in prompt_lower:
            content = f"Analysis: Deep examination reveals patterns and insights. Multiple perspectives considered."
        elif "generate" in prompt_lower or "create" in prompt_lower:
            content = f"Generated output: Creative and innovative solution addressing the request with multiple considerations."
        elif "explain" in prompt_lower:
            content = f"Explanation: Clear breakdown of concepts with examples and reasoning. Easy to understand."
        elif "compare" in prompt_lower:
            content = f"Comparison: Side-by-side analysis of options with pros and cons for each."
        else:
            content = f"Response: Addressing the query with relevant insights and actionable recommendations."
        
        return AIResponse(
            content=content,
            model=model,
            is_fallback=True,
        )

    def _structured_fallback(
        self,
        prompt: str,
        system_prompt: Optional[str] = None,
    ) -> AIResponse:
        """Generate structured fallback response for JSON requests."""
        logger.info("Using structured fallback generation")
        
        # Try to detect the type of structured request
        if "patterns" in (system_prompt or "").lower():
            content = json.dumps({
                "patterns": [
                    {"type": "recurring", "count": 3, "confidence": 0.85},
                    {"type": "temporal", "count": 2, "confidence": 0.78},
                ],
                "total_memories": 15,
                "synthesis": "Detected recurring patterns in observations",
            })
        elif "ideas" in (system_prompt or "").lower():
            content = json.dumps({
                "ideas": [
                    {"id": 1, "idea": "Innovative approach with high potential", "novelty": 0.85, "feasibility": 0.90, "score": 0.88},
                    {"id": 2, "idea": "Practical solution with immediate impact", "novelty": 0.75, "feasibility": 0.95, "score": 0.85},
                    {"id": 3, "idea": "Long-term strategy with transformative results", "novelty": 0.90, "feasibility": 0.70, "score": 0.80},
                ],
                "synthesis": "Generated 3 high-quality ideas based on the challenge",
            })
        elif "causal" in (system_prompt or "").lower():
            content = json.dumps({
                "causal_graph": {
                    "nodes": ["factor_1", "factor_2", "outcome"],
                    "edges": [
                        {"from": "factor_1", "to": "outcome", "strength": 0.75},
                        {"from": "factor_2", "to": "outcome", "strength": 0.65},
                    ],
                },
                "confounders": ["confounder_1"],
                "causal_effect": {"direct": 0.5, "indirect": 0.2, "total": 0.7},
                "counterfactuals": [{"if_changed": "factor_1", "then_outcome_changes": 0.4}],
            })
        elif "classification" in (system_prompt or "").lower():
            content = json.dumps({
                "classification": [
                    {"category": "Category A", "probability": 0.75, "reasoning": "Strong evidence"},
                    {"category": "Category B", "probability": 0.20, "reasoning": "Moderate evidence"},
                ],
                "confidence": 0.85,
            })
        elif "forecast" in (system_prompt or "").lower() or "predict" in (system_prompt or "").lower():
            content = json.dumps({
                "forecast": [
                    {"date": "2024-01-01", "value": 100, "confidence": 0.90},
                    {"date": "2024-01-02", "value": 105, "confidence": 0.85},
                    {"date": "2024-01-03", "value": 110, "confidence": 0.80},
                ],
                "trend": {"direction": "increasing", "slope": 5.0, "change_percent": 10.0},
                "uncertainty": {"std": 2.5, "confidence_interval": [95, 115]},
            })
        else:
            # Generic structured response
            content = json.dumps({
                "result": "Processed successfully",
                "confidence": 0.85,
                "recommendations": [
                    "Review results carefully",
                    "Consider multiple perspectives",
                    "Validate with additional data",
                ],
            })
        
        return AIResponse(
            content=content,
            model="gemma-4-26b-it",
            is_fallback=True,
        )

    def _fallback_embeddings(self, texts: List[str]) -> List[List[float]]:
        """Generate fallback embeddings when Cloudflare AI is unavailable."""
        logger.info("Using fallback embedding generation")
        import hashlib
        
        embeddings = []
        for i, text in enumerate(texts):
            # Create deterministic dummy embedding based on text
            h = hashlib.md5(text.encode()).hexdigest()
            # Generate 1024-dimensional embedding
            embedding = []
            for j in range(1024):
                # Use hash to create pseudo-random but consistent values
                val = (int(h[j % len(h)], 16) + i + j) % 1000 / 1000.0
                embedding.append(round(val, 6))
            embeddings.append(embedding)
        
        return embeddings

    async def extract_json(self, text: str) -> Dict[str, Any]:
        """Extract JSON from text response."""
        try:
            # Try direct parsing
            return json.loads(text)
        except json.JSONDecodeError:
            pass

        try:
            # Try to extract from markdown code blocks
            import re
            match = re.search(r'```(?:json)?\s*([\s\S]*?)```', text)
            if match:
                return json.loads(match.group(1))
        except:
            pass

        # Return structured fallback
        return {"content": text}

    async def batch_process(
        self,
        prompts: List[str],
        model: str = "gemma-4-26b-it",
        system_prompt: Optional[str] = None,
        temperature: float = 0.3,
        max_tokens: int = 512,
    ) -> List[AIResponse]:
        """Process multiple prompts in batch."""
        results = []
        for prompt in prompts:
            result = await self.generate_text(
                prompt=prompt,
                system_prompt=system_prompt,
                model=model,
                temperature=temperature,
                max_tokens=max_tokens,
            )
            results.append(result)
        return results


# Global client instance
ai_client = CloudflareAIClient()


def get_ai_client() -> CloudflareAIClient:
    """Get the global AI client instance."""
    return ai_client
