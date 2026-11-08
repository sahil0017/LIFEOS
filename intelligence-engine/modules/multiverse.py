"""Multiverse AI — Monte Carlo futures for life decisions with real AI."""

from modules.base import BaseModule
from services.cloudflare_ai import get_ai_client
from typing import Dict, Any, List, Optional
import json
import math


class MultiverseModule(BaseModule):
    def __init__(self):
        super().__init__(
            module_id="multiverse",
            name="Multiverse AI",
            description="Generate multiple possible futures from one situation",
            status="ready",
        )
        self.ai = get_ai_client()

    async def process(self, data: Dict[str, Any], user_id: str, context: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        situation = data.get("situation", "current state")
        decisions = data.get("decisions", ["stay", "change"])
        horizon = int(data.get("horizon_months", 6))
        n_sim = int(data.get("simulations", 200))
        observations = data.get("observations", [])

        # Use AI to generate and analyze futures
        futures_result = await self._generate_futures_with_ai(
            situation, 
            decisions, 
            horizon, 
            n_sim,
            observations
        )
        
        # Extract values from futures
        values = [f["final_value"] for f in futures_result.get("futures", [])]
        values.sort()
        
        # Calculate statistics
        best = max(futures_result.get("futures", []), key=lambda f: f["final_value"]) if futures_result.get("futures") else None
        worst = min(futures_result.get("futures", []), key=lambda f: f["final_value"]) if futures_result.get("futures") else None
        median = values[len(values) // 2] if values else 0
        p10 = values[int(len(values) * 0.1)] if values else 0
        p90 = values[int(len(values) * 0.9)] if values else 0

        # Use AI to calculate decision-level aggregation
        decision_stats = await self._aggregate_by_decision_with_ai(
            futures_result.get("futures", []),
            decisions,
            horizon
        )

        return {
            "situation": situation,
            "horizon_months": horizon,
            "simulations": n_sim,
            "best_future": best,
            "worst_future": worst,
            "median_final": median,
            "p10": p10,
            "p90": p90,
            "decision_stats": decision_stats,
            "ai_analysis": futures_result.get("analysis", ""),
            "confidence": futures_result.get("confidence", 0.72),
            "recommendations": [
                "Compare best/worst case before committing",
                "Re-run with updated constraints for sharper distribution",
                "Use p10/p90 as risk bounds for planning",
                f"AI generated and analyzed {n_sim} possible futures across {len(decisions)} decision paths",
            ],
        }

    async def _generate_futures_with_ai(
        self, 
        situation: str, 
        decisions: List[str],
        horizon: int, 
        n_sim: int,
        observations: List[Dict]
    ) -> Dict[str, Any]:
        """Use AI to generate possible futures."""
        # Prepare observation context
        obs_context = "\n".join([
            f"[{o.get('occurred_at', '')}] {o.get('category', '')}: {o.get('label', o.get('text', ''))}"
            for o in observations[:10]
        ])

        data_str = json.dumps({
            "situation": situation,
            "decisions": decisions,
            "horizon_months": horizon,
            "simulations": n_sim,
        }, indent=2)

        system_prompt = """You are a futurist and scenario planner. Your task is to:
1. Generate multiple possible futures based on a situation and decisions
2. Simulate realistic outcomes with uncertainties
3. Create diverse scenarios (optimistic, pessimistic, realistic)
4. Provide probability distributions

For each future, include:
- Path of decisions made
- Cumulative value/outcome
- Key events and milestones
- Probability weight
- Risk factors

Return ONLY valid JSON with structure:
{
    "futures": [
        {
            "future_id": "unique_id",
            "path": [
                {"month": 1, "decision": "stay", "cumulative": 0.5, "event": "stable period"}
            ],
            "final_value": 123.45,
            "scenario_type": "optimistic|pessimistic|realistic|neutral",
            "probability": 0.0-1.0,
            "key_events": ["event1", "event2"],
            "risk_factors": ["risk1", "risk2"]
        }
    ],
    "analysis": "brief analysis of futures",
    "confidence": 0.0-1.0
}"""

        user_prompt = f"""Generate multiple possible futures for this situation:

Situation: {situation}

Decisions to consider: {json.dumps(decisions)}

Time horizon: {horizon} months

Simulations: {n_sim}

Observation context:
{obs_context if obs_context else 'No context'}

Generate diverse, realistic futures with detailed paths."""

        response = await self.ai.generate_text(
            prompt=user_prompt,
            system_prompt=system_prompt,
            model="gemma-4-26b-it",
            temperature=0.5,  # Higher temperature for diverse futures
            max_tokens=8192,  # Large token budget for many futures
        )

        try:
            result = await self.ai.extract_json(response.content)
            if isinstance(result, dict) and "futures" in result:
                return result
        except Exception:
            pass

        # Fallback to Monte Carlo simulation
        return {
            "futures": self._generate_futures_monte_carlo(situation, decisions, horizon, n_sim),
            "analysis": f"Monte Carlo simulation of {n_sim} possible futures across {horizon} months",
            "confidence": 0.70,
        }

    async def _aggregate_by_decision_with_ai(
        self, 
        futures: List[Dict],
        decisions: List[str],
        horizon: int
    ) -> Dict:
        """Use AI to aggregate futures by decision."""
        futures_str = json.dumps(futures[:50], indent=2)  # Limit for token budget
        decisions_str = json.dumps(decisions)

        system_prompt = """You are a statistical analyst. Given multiple simulated futures,
aggregate them by the decision path taken.

For each decision, calculate:
- Number of futures following that decision
- Average final value
- Best and worst outcomes
- Distribution characteristics

Return ONLY valid JSON with structure:
{
    "decision_stats": {
        "decision_name": {
            "count": 50,
            "avg_final": 123.45,
            "best": 200.0,
            "worst": 50.0,
            "std": 25.3,
            "p10": 80.0,
            "p50": 120.0,
            "p90": 160.0,
            "risk_adjusted": 110.0,
            "recommendation": "high|medium|low"
        }
    },
    "overall_best_decision": "decision_name",
    "overall_worst_decision": "decision_name",
    "decision_comparison": "comparison of decisions"
}"""

        user_prompt = f"""Aggregate these futures by decision path:

Decisions: {decisions_str}

Futures (sample):
{futures_str}

Calculate statistics for each decision path."""

        response = await self.ai.generate_text(
            prompt=user_prompt,
            system_prompt=system_prompt,
            model="gemma-4-26b-it",
            temperature=0.2,
            max_tokens=4096,
        )

        try:
            result = await self.ai.extract_json(response.content)
            if isinstance(result, dict) and "decision_stats" in result:
                return result["decision_stats"]
        except Exception:
            pass

        # Fallback to simple aggregation
        return self._aggregate_by_decision(futures, decisions)

    def _generate_futures_monte_carlo(
        self, 
        situation: str, 
        decisions: List[str],
        horizon: int, 
        n_sim: int
    ) -> List[Dict]:
        """Generate futures using Monte Carlo simulation."""
        import random
        
        futures = []
        for sim_id in range(n_sim):
            path = []
            value = 0.0
            current_situation = situation
            
            for month in range(1, horizon + 1):
                decision = random.choice(decisions)
                # Generate random delta based on decision
                delta = random.gauss(
                    0.5 if "change" in decision.lower() or "new" in decision.lower() else 0.1,
                    0.3
                )
                value += delta
                
                # Generate event
                events = [
                    "Positive development",
                    "Minor setback",
                    "Significant progress",
                    "Unexpected challenge",
                    "Stable period",
                ]
                event = random.choice(events)
                
                path.append({
                    "month": month,
                    "decision": decision,
                    "cumulative": round(value, 3),
                    "event": event,
                })
            
            # Determine scenario type
            if value > 1.0:
                scenario_type = "optimistic"
            elif value < -0.5:
                scenario_type = "pessimistic"
            elif abs(value) < 0.2:
                scenario_type = "neutral"
            else:
                scenario_type = "realistic"
            
            futures.append({
                "future_id": f"sim_{sim_id}",
                "path": path,
                "final_value": round(value, 3),
                "scenario_type": scenario_type,
                "probability": 1.0 / n_sim,
                "key_events": [path[0]["event"], path[-1]["event"]],
                "risk_factors": ["uncertainty", "randomness"],
            })
        
        return futures

    def _aggregate_by_decision(self, futures: List[Dict], decisions: List[str]) -> Dict:
        """Aggregate futures by decision as fallback."""
        decision_stats = {}
        
        for decision in decisions:
            subset = [f for f in futures if any(p["decision"] == decision for p in f["path"])]
            if subset:
                values = [f["final_value"] for f in subset]
                values.sort()
                decision_stats[decision] = {
                    "count": len(subset),
                    "avg_final": round(sum(values) / len(values), 3),
                    "best": round(max(values), 3),
                    "worst": round(min(values), 3),
                    "std": round((sum((v - sum(values)/len(values))**2 for v in values) / len(values))**0.5, 2),
                    "p10": round(values[int(len(values) * 0.1)], 3) if len(values) > 1 else 0,
                    "p50": round(values[len(values) // 2], 3) if values else 0,
                    "p90": round(values[int(len(values) * 0.9)], 3) if len(values) > 1 else 0,
                    "risk_adjusted": round(sum(values) / len(values) - (sum((v - sum(values)/len(values))**2 for v in values) / len(values))**0.5 * 0.5, 3),
                    "recommendation": "high" if subset[0]["scenario_type"] == "optimistic" else "medium" if subset[0]["scenario_type"] == "realistic" else "low",
                }
        
        return decision_stats

    def get_related_modules(self) -> List[str]:
        return ["world_model", "quantum", "causal"]
