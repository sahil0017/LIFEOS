"""World Model Intelligence Module — internal representation of how the user's world works."""

from modules.base import BaseModule
from typing import Dict, Any, List, Optional
import random
import math


class WorldModelModule(BaseModule):
    def __init__(self):
        super().__init__(
            module_id="world_model",
            name="World Model Intelligence",
            description="Build an internal representation of how the individual's world works",
            status="ready",
        )
        self.state_variables = {
            "energy": 0.7,
            "focus": 0.6,
            "financial_stability": 0.5,
            "relationships": 0.7,
            "health": 0.6,
            "learning": 0.5,
        }

    async def process(self, data: Dict[str, Any], user_id: str, context: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        merged_state = self.state_variables.copy()
        if isinstance(data.get("current_state"), dict):
            merged_state.update(data["current_state"])
        current_state = merged_state
        action = data.get("action", "")
        horizon = data.get("horizon_months", 6)

        # Simulate state transitions
        projected_states = []
        for month in range(1, horizon + 1):
            new_state = self._transition(current_state, action, month)
            projected_states.append({
                "month": month,
                "state": new_state,
                "key_changes": self._diff(current_state, new_state),
            })
            current_state = new_state

        # Identify critical decision points
        decision_points = self._identify_decision_points(projected_states)

        return {
            "current_state": self.state_variables,
            "projected_states": projected_states,
            "decision_points": decision_points,
            "confidence": 0.75,
            "recommendations": [
                "Focus on energy management before major decisions",
                "Simulate multiple actions to compare outcomes",
                "Review world model projections monthly",
            ],
        }

    def _transition(self, state: Dict, action: str, month: int) -> Dict:
        new_state = state.copy()
        decay = 0.95 ** month

        if "career" in action.lower():
            new_state["financial_stability"] = min(1.0, state["financial_stability"] + 0.1 * decay)
            new_state["energy"] = max(0.1, state["energy"] - 0.05)
        if "study" in action.lower() or "learn" in action.lower():
            new_state["learning"] = min(1.0, state["learning"] + 0.15 * decay)
            new_state["energy"] = max(0.1, state["energy"] - 0.03)
        if "health" in action.lower():
            new_state["health"] = min(1.0, state["health"] + 0.12 * decay)
            new_state["energy"] = min(1.0, state["energy"] + 0.05)

        # Natural decay without intervention
        new_state["focus"] = max(0.1, state["focus"] * 0.98)
        new_state["relationships"] = max(0.1, state["relationships"] * 0.99)

        return new_state

    def _diff(self, old: Dict, new: Dict) -> List[str]:
        changes = []
        for key in old:
            diff = new[key] - old[key]
            if abs(diff) > 0.02:
                direction = "increase" if diff > 0 else "decrease"
                changes.append(f"{key}: {direction} by {abs(diff):.2f}")
        return changes

    def _identify_decision_points(self, states: List[Dict]) -> List[Dict]:
        points = []
        for i, state in enumerate(states):
            if state["state"]["energy"] < 0.3:
                points.append({
                    "month": state["month"],
                    "type": "energy_crisis",
                    "description": "Energy level critically low — intervention needed",
                })
            if state["state"]["financial_stability"] < 0.3:
                points.append({
                    "month": state["month"],
                    "type": "financial_stress",
                    "description": "Financial stability declining — review spending",
                })
        return points

    def get_related_modules(self) -> List[str]:
        return ["causal", "predictive", "neuro_symbolic", "multi_agent"]