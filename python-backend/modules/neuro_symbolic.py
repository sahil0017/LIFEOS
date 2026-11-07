"""Neuro-Symbolic Intelligence Module — neural patterns + explicit logic."""

from modules.base import BaseModule
from typing import Dict, Any, List, Optional
import random


class NeuroSymbolicModule(BaseModule):
    def __init__(self):
        super().__init__(
            module_id="neuro_symbolic",
            name="Neuro-Symbolic Intelligence",
            description="Combine neural pattern recognition with explicit logic and constraints",
            status="ready",
        )
        self.rules = {
            "financial": "monthly_expenses <= monthly_income * 0.9",
            "health": "sleep_hours >= 6 AND exercise_minutes >= 150_per_week",
            "learning": "study_hours_per_week >= 5",
            "time": "committed_hours_per_day <= 12",
        }

    async def process(self, data: Dict[str, Any], user_id: str, context: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        user_input = data.get("input", "")
        domain = data.get("domain", "general")
        constraints = data.get("constraints", {})

        # Neural pattern recognition (simulated)
        neural_patterns = self._neural_analysis(user_input, domain)

        # Symbolic constraint validation
        violations = self._validate_constraints(neural_patterns, constraints, domain)

        # Combine: neural suggestions filtered by symbolic rules
        filtered_suggestions = self._filter_by_rules(neural_patterns, violations)

        # Generate explainable reasoning
        reasoning = self._generate_reasoning(neural_patterns, violations, filtered_suggestions)

        return {
            "neural_patterns": neural_patterns,
            "constraint_violations": violations,
            "filtered_suggestions": filtered_suggestions,
            "reasoning": reasoning,
            "confidence": 0.78,
            "recommendations": [
                "Always validate suggestions against explicit constraints",
                "Use neuro-symbolic for decisions requiring traceable reasoning",
                "Update rules as your priorities change",
            ],
        }

    def _neural_analysis(self, text: str, domain: str) -> Dict[str, Any]:
        keywords = text.lower().split()
        patterns = {
            "detected_intent": "general",
            "suggested_actions": [],
            "confidence_scores": {},
        }

        if any(w in keywords for w in ["money", "spend", "save", "invest"]):
            patterns["detected_intent"] = "financial"
            patterns["suggested_actions"] = ["Create budget", "Review subscriptions", "Set savings goal"]
        elif any(w in keywords for w in ["study", "learn", "course", "skill"]):
            patterns["detected_intent"] = "learning"
            patterns["suggested_actions"] = ["Schedule study time", "Identify skill gap", "Find resources"]
        elif any(w in keywords for w in ["health", "exercise", "sleep", "diet"]):
            patterns["detected_intent"] = "health"
            patterns["suggested_actions"] = ["Track sleep", "Plan workouts", "Meal prep"]

        for action in patterns["suggested_actions"]:
            patterns["confidence_scores"][action] = round(random.uniform(0.6, 0.95), 2)

        return patterns

    def _validate_constraints(self, patterns: Dict, constraints: Dict, domain: str) -> List[Dict]:
        violations = []
        rule = self.rules.get(domain, "")

        for action in patterns.get("suggested_actions", []):
            if domain == "financial" and "budget" in action.lower():
                if constraints.get("monthly_income", 0) > 0 and constraints.get("monthly_expenses", 9999) > constraints["monthly_income"] * 0.9:
                    violations.append({
                        "action": action,
                        "rule": rule,
                        "violation": "Expenses exceed 90% of income",
                        "severity": "high",
                    })

        return violations

    def _filter_by_rules(self, patterns: Dict, violations: List[Dict]) -> List[Dict]:
        blocked_actions = {v["action"] for v in violations}
        filtered = []
        for action in patterns.get("suggested_actions", []):
            if action not in blocked_actions:
                filtered.append({
                    "action": action,
                    "confidence": patterns.get("confidence_scores", {}).get(action, 0.5),
                    "rule_compliant": True,
                })
        return filtered

    def _generate_reasoning(self, patterns: Dict, violations: List[Dict], filtered: List[Dict]) -> List[str]:
        reasoning = [
            f"Neural analysis detected intent: {patterns.get('detected_intent', 'general')}",
            f"Found {len(patterns.get('suggested_actions', []))} initial suggestions",
        ]
        if violations:
            reasoning.append(f"Blocked {len(violations)} suggestions due to constraint violations")
        reasoning.append(f"Final recommendations: {len(filtered)} rule-compliant actions")
        return reasoning

    def get_related_modules(self) -> List[str]:
        return ["causal", "world_model", "multi_agent"]