"""Generative Intelligence Module — creative ideas and alternative scenarios powered by Cloudflare Workers AI."""

from modules.base import BaseModule
from services.cloudflare_ai import CloudflareAIClient
from typing import Dict, Any, List, Optional
import json
import random


class GenerativeModule(BaseModule):
    def __init__(self):
        super().__init__(
            module_id="generative",
            name="Generative Intelligence",
            description="Create ideas and possibilities outside conventional patterns",
            status="ready",
        )
        self.ai = CloudflareAIClient()

    async def process(self, data: Dict[str, Any], user_id: str, context: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        challenge = data.get("challenge", "Explore high-leverage growth directions")
        constraints = data.get("constraints", [])
        num_ideas = data.get("num_ideas", 3)
        domain = data.get("domain", "general")

        system_prompt = (
            "You are LIFEOS Generative Intelligence. Your role is to suggest creative, non-obvious ideas "
            "for personal challenges. Respond ONLY with valid JSON with keys: "
            "'ideas' (array of objects with 'id', 'idea', 'novelty' (0-1), 'feasibility' (0-1), 'potential_impact' (0-1)), "
            "and 'synthesis' (string)."
        )

        user_prompt = (
            f"Domain: {domain}\n"
            f"Challenge: {challenge}\n"
            f"Constraints: {constraints}\n"
            f"Generate {num_ideas} actionable ideas."
        )

        ideas = []
        generation_method = "cloudflare_workers_ai_gemma4" if self.ai.is_configured else "local_adaptive_synthesis"

        raw_response = await self.ai.run_text(
            prompt=user_prompt,
            system_prompt=system_prompt,
            model="@cf/google/gemma-4-26b-a4b-it",
            temperature=0.4,
        )

        try:
            # Clean markdown code blocks if present
            clean = raw_response.strip()
            if clean.startswith("```"):
                clean = clean.split("```")[1]
                if clean.startswith("json"):
                    clean = clean[4:]
            parsed = json.loads(clean.strip())
            if isinstance(parsed, dict) and "ideas" in parsed:
                ideas = parsed["ideas"]
        except Exception:
            ideas = []

        if not ideas:
            # Fallback if parsing model output fails
            ideas = [
                {
                    "id": 1,
                    "idea": f"Synthesize {domain} habits with immediate project-based milestones",
                    "novelty": 0.82,
                    "feasibility": 0.88,
                    "potential_impact": 0.85,
                },
                {
                    "id": 2,
                    "idea": f"Establish automated reflection checkpoints for {challenge[:35]}",
                    "novelty": 0.78,
                    "feasibility": 0.92,
                    "potential_impact": 0.80,
                }
            ]

        # Calculate composite score for ranking
        for item in ideas:
            novelty = float(item.get("novelty", 0.7))
            feasibility = float(item.get("feasibility", 0.7))
            impact = float(item.get("potential_impact", 0.7))
            item["score"] = round(novelty * 0.3 + feasibility * 0.4 + impact * 0.3, 3)

        ideas.sort(key=lambda x: x.get("score", 0), reverse=True)

        return {
            "challenge": challenge,
            "ideas": ideas,
            "best_idea": ideas[0] if ideas else None,
            "generation_method": generation_method,
            "confidence": 0.84 if self.ai.is_configured else 0.75,
            "recommendations": [
                "Test the highest-scoring idea with a timeboxed experiment",
                "Cross-check feasibility against current constraints",
                "Revisit generative synthesis as new observations accumulate",
            ],
        }

    def get_related_modules(self) -> List[str]:
        return ["multi_agent", "quantum", "world_model"]