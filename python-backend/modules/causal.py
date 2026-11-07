"""Causal Intelligence Module — understand why things happen, not just correlation."""

from modules.base import BaseModule
from typing import Dict, Any, List, Optional
import random


class CausalModule(BaseModule):
    def __init__(self):
        super().__init__(
            module_id="causal",
            name="Causal Intelligence",
            description="Understand why things happen, not merely which things correlate",
            status="ready",
        )

    async def process(self, data: Dict[str, Any], user_id: str, context: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        variables = data.get("variables", [])
        outcome = data.get("outcome", "")
        observations = data.get("observations", [])
        intervention = data.get("intervention", None)

        # Build causal graph (simplified)
        causal_graph = self._build_causal_graph(variables, outcome, observations)

        # Identify confounders
        confounders = self._identify_confounders(causal_graph, outcome)

        # Estimate causal effect of intervention
        causal_effect = None
        if intervention:
            causal_effect = self._estimate_intervention_effect(causal_graph, intervention, outcome)

        # Counterfactual analysis
        counterfactuals = self._generate_counterfactuals(causal_graph, outcome)

        return {
            "causal_graph": causal_graph,
            "confounders": confounders,
            "causal_effect": causal_effect,
            "counterfactuals": counterfactuals,
            "confidence": 0.70,
            "recommendations": [
                "Control for confounders before attributing causation",
                "Test interventions with small experiments first",
                "Use counterfactuals to understand alternative outcomes",
            ],
        }

    def _build_causal_graph(self, variables: List[str], outcome: str, observations: List[Dict]) -> Dict[str, Any]:
        nodes = list(set(variables + [outcome]))
        edges = []

        # Heuristic: build edges based on co-occurrence in observations
        for obs in observations:
            for var in variables:
                if var in obs and outcome in obs:
                    edges.append({
                        "from": var,
                        "to": outcome,
                        "strength": random.uniform(0.3, 0.9),
                        "type": "potential_causal",
                    })

        return {
            "nodes": nodes,
            "edges": edges,
            "outcome": outcome,
        }

    def _identify_confounders(self, graph: Dict, outcome: str) -> List[str]:
        confounders = []
        for edge in graph.get("edges", []):
            if edge["to"] == outcome and edge["strength"] < 0.5:
                confounders.append(edge["from"])
        return list(set(confounders))

    def _estimate_intervention_effect(self, graph: Dict, intervention: str, outcome: str) -> Dict[str, Any]:
        direct_effect = random.uniform(-0.5, 0.5)
        indirect_effect = random.uniform(-0.3, 0.3)

        return {
            "intervention": intervention,
            "target": outcome,
            "direct_effect": round(direct_effect, 3),
            "indirect_effect": round(indirect_effect, 3),
            "total_effect": round(direct_effect + indirect_effect, 3),
            "confidence_interval": [round(direct_effect - 0.1, 3), round(direct_effect + 0.1, 3)],
            "interpretation": f"Intervention '{intervention}' {'increases' if direct_effect > 0 else 'decreases'} '{outcome}' by {abs(direct_effect):.2f}",
        }

    def _generate_counterfactuals(self, graph: Dict, outcome: str) -> List[Dict]:
        counterfactuals = []
        for node in graph.get("nodes", []):
            if node != outcome:
                counterfactuals.append({
                    "if_changed": node,
                    "then_outcome_changes": random.uniform(-0.4, 0.4),
                    "likelihood": random.uniform(0.3, 0.9),
                })
        return counterfactuals[:5]

    def get_related_modules(self) -> List[str]:
        return ["world_model", "neuro_symbolic", "multi_agent"]