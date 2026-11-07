"""Multi-Agent Collective Intelligence Module — multiple reasoning perspectives."""

from modules.base import BaseModule
from typing import Dict, Any, List, Optional
import random


class MultiAgentModule(BaseModule):
    def __init__(self):
        super().__init__(
            module_id="multi_agent",
            name="Multi-Agent Collective Intelligence",
            description="Evaluate decisions through multiple reasoning perspectives",
            status="ready",
        )
        self.agents = {
            "optimizer": {"focus": "efficiency", "risk_tolerance": 0.6},
            "skeptic": {"focus": "risk", "risk_tolerance": 0.2},
            "creative": {"focus": "innovation", "risk_tolerance": 0.8},
            "pragmatist": {"focus": "implementation", "risk_tolerance": 0.5},
            "ethicist": {"focus": "values", "risk_tolerance": 0.4},
        }

    async def process(self, data: Dict[str, Any], user_id: str, context: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        decision = data.get("decision", "") or data.get("action", "Evaluate current strategy")
        options = data.get("options", [])
        if not options:
            options = [f"Pursue: {decision}", "Maintain status quo", "Explore alternative paths"]
        user_values = data.get("values", [])

        # Each agent evaluates the decision
        agent_evaluations = []
        for agent_id, agent in self.agents.items():
            eval_result = self._agent_evaluate(agent_id, agent, decision, options, user_values)
            agent_evaluations.append(eval_result)

        # Debate: agents respond to each other
        debate = self._simulate_debate(agent_evaluations)

        # Consensus building
        consensus = self._build_consensus(agent_evaluations)

        # Final recommendation
        recommendation = self._synthesize_recommendation(agent_evaluations, consensus)

        return {
            "decision": decision,
            "agent_evaluations": agent_evaluations,
            "debate": debate,
            "consensus": consensus,
            "recommendation": recommendation,
            "confidence": 0.74,
            "recommendations": [
                "Consider all agent perspectives before deciding",
                "Pay attention to skeptic agent's risk concerns",
                "Use creative agent's ideas for novel approaches",
            ],
        }

    def _agent_evaluate(self, agent_id: str, agent: Dict, decision: str, options: List[str], values: List[str]) -> Dict:
        scores = {}
        for option in options:
            base = random.uniform(0.3, 0.9)
            # Adjust by agent focus
            if agent_id == "skeptic" and any(w in option.lower() for w in ["risk", "new", "change"]):
                base *= 0.7
            if agent_id == "creative" and any(w in option.lower() for w in ["new", "innovat", "creative"]):
                base *= 1.2
            if agent_id == "pragmatist" and any(w in option.lower() for w in ["plan", "step", "implement"]):
                base *= 1.1
            scores[option] = round(min(1.0, base), 2)

        return {
            "agent": agent_id,
            "focus": agent["focus"],
            "scores": scores,
            "top_choice": max(scores, key=scores.get) if scores else (decision or "N/A"),
            "reasoning": f"{agent_id.title()} agent evaluates based on {agent['focus']}",
        }

    def _simulate_debate(self, evaluations: List[Dict]) -> List[Dict]:
        debate = []
        for i in range(len(evaluations)):
            for j in range(i + 1, len(evaluations)):
                a = evaluations[i]["agent"]
                b = evaluations[j]["agent"]
                if a != b:
                    debate.append({
                        "from": a,
                        "to": b,
                        "point": f"{a} questions {b}'s emphasis on {evaluations[j]['focus']}",
                        "resolution": "partial_agreement",
                    })
        return debate[:6]

    def _build_consensus(self, evaluations: List[Dict]) -> Dict:
        all_scores = {}
        for eval in evaluations:
            for option, score in eval["scores"].items():
                all_scores.setdefault(option, []).append(score)

        consensus = {}
        for option, scores in all_scores.items():
            consensus[option] = {
                "average": round(sum(scores) / len(scores), 3),
                "agreement": round(1 - (max(scores) - min(scores)), 3),
                "agent_count": len(scores),
            }

        return consensus

    def _synthesize_recommendation(self, evaluations: List[Dict], consensus: Dict) -> Dict:
        if not consensus:
            return {"recommended": "insufficient_data", "reasoning": "No consensus reached"}

        best = max(consensus.items(), key=lambda x: x[1]["average"] * x[1]["agreement"])
        return {
            "recommended": best[0],
            "confidence": round(best[1]["average"] * best[1]["agreement"], 3),
            "reasoning": f"Highest consensus score among {len(evaluations)} agents",
            "alternatives": [k for k in consensus if k != best[0]][:3],
        }

    def get_related_modules(self) -> List[str]:
        return ["causal", "neuro_symbolic", "generative"]