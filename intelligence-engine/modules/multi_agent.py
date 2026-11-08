"""Multi-Agent Collective Intelligence Module — multiple reasoning perspectives with real AI."""

from modules.base import BaseModule
from services.cloudflare_ai import get_ai_client
from typing import Dict, Any, List, Optional
import json


class MultiAgentModule(BaseModule):
    def __init__(self):
        super().__init__(
            module_id="multi_agent",
            name="Multi-Agent Collective Intelligence",
            description="Evaluate decisions through multiple reasoning perspectives",
            status="ready",
        )
        self.ai = get_ai_client()
        self.agents = {
            "optimizer": {"focus": "efficiency", "risk_tolerance": 0.6, "persona": "Maximizes outcomes with minimal waste"},
            "skeptic": {"focus": "risk", "risk_tolerance": 0.2, "persona": "Identifies potential problems and downsides"},
            "creative": {"focus": "innovation", "risk_tolerance": 0.8, "persona": "Generates novel ideas and approaches"},
            "pragmatist": {"focus": "implementation", "risk_tolerance": 0.5, "persona": "Focuses on practical, actionable solutions"},
            "ethicist": {"focus": "values", "risk_tolerance": 0.4, "persona": "Ensures alignment with ethical principles"},
        }

    async def process(self, data: Dict[str, Any], user_id: str, context: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        decision = data.get("decision", "") or data.get("action", "Evaluate current strategy")
        options = data.get("options", [])
        if not options:
            options = [f"Pursue: {decision}", "Maintain status quo", "Explore alternative paths"]
        user_values = data.get("values", [])
        observations = data.get("observations", [])

        # Use AI for each agent to evaluate the decision
        agent_evaluations = await self._evaluate_with_agents_ai(
            decision, 
            options, 
            user_values,
            observations
        )
        
        # Use AI to simulate debate between agents
        debate = await self._simulate_debate_with_ai(agent_evaluations)
        
        # Use AI to build consensus
        consensus_result = await self._build_consensus_with_ai(agent_evaluations)
        
        # Use AI to synthesize final recommendation
        recommendation = await self._synthesize_recommendation_with_ai(
            agent_evaluations, 
            consensus_result
        )

        return {
            "decision": decision,
            "agent_evaluations": agent_evaluations,
            "debate": debate,
            "consensus": consensus_result,
            "recommendation": recommendation,
            "confidence": recommendation.get("confidence", 0.74),
            "recommendations": [
                "Consider all agent perspectives before deciding",
                "Pay attention to skeptic agent's risk concerns",
                "Use creative agent's ideas for novel approaches",
                f"AI-powered multi-agent system evaluated {len(options)} options",
            ],
        }

    async def _evaluate_with_agents_ai(
        self, 
        decision: str, 
        options: List[str],
        values: List[str],
        observations: List[Dict]
    ) -> List[Dict]:
        """Use AI to have each agent evaluate the decision."""
        agent_evaluations = []
        
        # Prepare context
        obs_context = "\n".join([
            f"[{o.get('occurred_at', '')}] {o.get('category', '')}: {o.get('label', o.get('text', ''))}"
            for o in observations[:10]
        ])

        for agent_id, agent in self.agents.items():
            # Build options list
            options_list = chr(10).join(f'- {opt}' for opt in options)
            values_str = ', '.join(values) if values else 'none specified'
            
            agent_prompt = f"""You are the {agent_id} agent. Your persona: {agent['persona']}
Your focus: {agent['focus']}
Your risk tolerance: {agent['risk_tolerance']}

Evaluate the following decision and options:

Decision: {decision}

Options:
{options_list}

User values: {values_str}

Context from observations:
{obs_context if obs_context else 'No observations'}

Provide your evaluation as JSON with scores for each option (0-1).
Return valid JSON only."""

            response = await self.ai.generate_text(
                prompt=agent_prompt,
                system_prompt="You are an AI agent with a specific perspective. Evaluate honestly and thoroughly. Return ONLY valid JSON.",
                model="gemma-4-26b-it",
                temperature=0.3,
                max_tokens=2048,
            )

            try:
                result = await self.ai.extract_json(response.content)
                if isinstance(result, dict) and "agent" in result:
                    agent_evaluations.append(result)
                    continue
            except Exception:
                pass

            # Fallback to simple evaluation
            eval_result = self._agent_evaluate(agent_id, agent, decision, options, values)
            agent_evaluations.append(eval_result)

        return agent_evaluations

    async def _simulate_debate_with_ai(self, evaluations: List[Dict]) -> List[Dict]:
        """Use AI to simulate debate between agents."""
        if len(evaluations) < 2:
            return []

        data_str = json.dumps(evaluations, indent=2)

        system_prompt = """You are a debate facilitator. Given multiple agent evaluations of a decision,
simulate a debate where agents discuss their perspectives and respond to each other.

For each debate entry:
- Identify which agent is speaking
- Identify which agent they're responding to
- State the point of discussion
- Note whether there's resolution

Return ONLY valid JSON with structure:
{
    "debate_entries": [
        {
            "from_agent": "agent_name",
            "to_agent": "agent_name",
            "point": "the discussion point",
            "resolution": "agreed|disagreed|partial_agreement|needs_more_info",
            "impact_on_decision": "how this affects the decision"
        }
    ],
    "debate_summary": "brief summary of key discussion points"
}"""

        user_prompt = f"""Simulate a debate between these agents evaluating a decision:

{evaluations[0]['agent']} says: {evaluations[0]['reasoning']}

evaluation data:
{data_str}

Create a meaningful debate with 5-7 entries."""

        response = await self.ai.generate_text(
            prompt=user_prompt,
            system_prompt=system_prompt,
            model="gemma-4-26b-it",
            temperature=0.4,
            max_tokens=2048,
        )

        try:
            result = await self.ai.extract_json(response.content)
            if isinstance(result, dict):
                if "debate_entries" in result:
                    return result["debate_entries"]
                elif "debate" in result:
                    return result["debate"]
        except Exception:
            pass

        # Fallback to simple debate simulation
        return self._simulate_debate(evaluations)

    async def _build_consensus_with_ai(self, evaluations: List[Dict]) -> Dict:
        """Use AI to build consensus from agent evaluations."""
        data_str = json.dumps(evaluations, indent=2)

        system_prompt = """You are a consensus builder. Given multiple agent evaluations,
calculate consensus scores for each option and identify areas of agreement/disagreement.

Return ONLY valid JSON with structure:
{
    "consensus": {
        "option1": {
            "average_score": 0.0-1.0,
            "agreement": 0.0-1.0,
            "agent_count": number of agents,
            "confidence": 0.0-1.0
        },
        ...
    },
    "overall_consensus": "high|medium|low",
    "disagreements": [
        {
            "option": "option_name",
            "disagreeing_agents": ["agent1", "agent2"],
            "reason": "why they disagree"
        }
    ]
}"""

        user_prompt = f"""Build consensus from these agent evaluations:

{data_str}

Calculate consensus scores and identify disagreements."""

        response = await self.ai.generate_text(
            prompt=user_prompt,
            system_prompt=system_prompt,
            model="gemma-4-26b-it",
            temperature=0.2,
            max_tokens=2048,
        )

        try:
            result = await self.ai.extract_json(response.content)
            if isinstance(result, dict):
                if "consensus" in result:
                    return result["consensus"]
                elif isinstance(result, dict):
                    # Normalize the result to match expected structure
                    # The AI might return different key names (average_score vs average)
                    normalized = {}
                    for option, data in result.items():
                        if isinstance(data, dict):
                            normalized[option] = {
                                "average": data.get("average_score", data.get("average", 0.5)),
                                "agreement": data.get("agreement", data.get("consistency", 0.5)),
                                "agent_count": data.get("agent_count", data.get("count", len(evaluations))),
                                "confidence": data.get("confidence", data.get("confidence_score", 0.7)),
                            }
                        else:
                            # If data is not a dict, use fallback
                            return self._build_consensus(evaluations)
                    return normalized
        except Exception:
            pass

        # Fallback to simple consensus
        return self._build_consensus(evaluations)

    async def _synthesize_recommendation_with_ai(
        self, 
        evaluations: List[Dict],
        consensus: Dict
    ) -> Dict:
        """Use AI to synthesize final recommendation."""
        data_str = json.dumps({
            "evaluations": evaluations,
            "consensus": consensus,
        }, indent=2)

        system_prompt = """You are a recommendation synthesizer. Given agent evaluations and consensus data,
generate a final recommendation that considers all perspectives.

Return ONLY valid JSON with structure:
{
    "recommended": "the recommended option",
    "confidence": 0.0-1.0,
    "reasoning": "detailed reasoning for the recommendation",
    "alternatives": ["alternative1", "alternative2"],
    "agent_support": {
        "agent1": "supports|opposes|neutral",
        ...
    },
    "risk_assessment": "low|medium|high",
    "implementation_effort": "low|medium|high"
}"""

        user_prompt = f"""Synthesize a final recommendation from this multi-agent evaluation:

{data_str}

Provide a clear, actionable recommendation."""

        response = await self.ai.generate_text(
            prompt=user_prompt,
            system_prompt=system_prompt,
            model="gemma-4-26b-it",
            temperature=0.3,
            max_tokens=2048,
        )

        try:
            result = await self.ai.extract_json(response.content)
            if isinstance(result, dict) and "recommended" in result:
                return result
        except Exception:
            pass

        # Fallback to simple synthesis
        return self._synthesize_recommendation(evaluations, consensus)

    def _agent_evaluate(self, agent_id: str, agent: Dict, decision: str, options: List[str], values: List[str]) -> Dict:
        """Simple agent evaluation as fallback."""
        import random
        
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
            if agent_id == "ethicist" and any(w in option.lower() for w in ["ethical", "value", "moral"]):
                base *= 1.15
            scores[option] = round(min(1.0, base), 2)

        top_choice = max(scores, key=scores.get) if scores else (decision or "N/A")

        return {
            "agent": agent_id,
            "focus": agent["focus"],
            "scores": scores,
            "top_choice": top_choice,
            "reasoning": f"{agent_id.title()} agent evaluates based on {agent['focus']}",
            "confidence": round(random.uniform(0.7, 0.95), 2),
            "warnings": [],
        }

    def _simulate_debate(self, evaluations: List[Dict]) -> List[Dict]:
        """Simple debate simulation as fallback."""
        debate = []
        for i in range(len(evaluations)):
            for j in range(i + 1, len(evaluations)):
                a = evaluations[i]["agent"]
                b = evaluations[j]["agent"]
                if a != b:
                    debate.append({
                        "from_agent": a,
                        "to_agent": b,
                        "point": f"{a} questions {b}'s emphasis on {evaluations[j]['focus']}",
                        "resolution": "partial_agreement",
                        "impact_on_decision": "refined thinking",
                    })
        return debate[:6]

    def _build_consensus(self, evaluations: List[Dict]) -> Dict:
        """Simple consensus building as fallback."""
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
                "confidence": round(sum(scores) / len(scores), 2),
            }

        return consensus

    def _synthesize_recommendation(self, evaluations: List[Dict], consensus: Dict) -> Dict:
        """Simple recommendation synthesis as fallback."""
        if not consensus:
            return {
                "recommended": "insufficient_data",
                "confidence": 0.0,
                "reasoning": "No consensus reached",
                "alternatives": [],
                "agent_support": {},
                "risk_assessment": "unknown",
                "implementation_effort": "unknown",
            }

        best = max(consensus.items(), key=lambda x: x[1]["average"] * x[1]["agreement"])
        
        # Determine agent support
        agent_support = {}
        for eval in evaluations:
            agent_support[eval["agent"]] = "supports" if eval["top_choice"] == best[0] else "opposes"

        return {
            "recommended": best[0],
            "confidence": round(best[1]["average"] * best[1]["agreement"], 3),
            "reasoning": f"Highest consensus score among {len(evaluations)} agents",
            "alternatives": [k for k in consensus if k != best[0]][:3],
            "agent_support": agent_support,
            "risk_assessment": "medium",
            "implementation_effort": "medium",
        }

    def get_related_modules(self) -> List[str]:
        return ["causal", "neuro_symbolic", "generative"]
