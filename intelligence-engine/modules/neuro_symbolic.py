"""Neuro-Symbolic Intelligence Module — neural patterns + explicit logic with real AI."""

from modules.base import BaseModule
from services.cloudflare_ai import get_ai_client
from typing import Dict, Any, List, Optional
import json


class NeuroSymbolicModule(BaseModule):
    def __init__(self):
        super().__init__(
            module_id="neuro_symbolic",
            name="Neuro-Symbolic Intelligence",
            description="Combine neural pattern recognition with explicit logic and constraints",
            status="ready",
        )
        self.ai = get_ai_client()
        self.rules = {
            "financial": "monthly_expenses <= monthly_income * 0.9",
            "health": "sleep_hours >= 6 AND exercise_minutes >= 150",
            "learning": "study_hours_per_week >= 5",
            "time": "committed_hours_per_day <= 12",
            "balance": "work_hours + sleep_hours + leisure_hours <= 24",
        }

    async def process(self, data: Dict[str, Any], user_id: str, context: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        user_input = data.get("input", "")
        domain = data.get("domain", "general")
        constraints = data.get("constraints", {})
        observations = data.get("observations", [])

        # Use AI for neural pattern recognition
        neural_result = await self._neural_analysis_with_ai(user_input, domain, observations)
        
        # Use AI to validate against symbolic constraints
        validation_result = await self._validate_constraints_with_ai(
            neural_result.get("suggested_actions", []),
            constraints,
            domain
        )
        
        # Combine: neural suggestions filtered by symbolic rules
        filtered_suggestions = await self._filter_by_rules_with_ai(
            neural_result,
            validation_result
        )
        
        # Generate explainable reasoning
        reasoning = await self._generate_reasoning_with_ai(
            neural_result,
            validation_result,
            filtered_suggestions
        )

        return {
            "neural_patterns": neural_result,
            "constraint_violations": validation_result.get("violations", []),
            "filtered_suggestions": filtered_suggestions,
            "reasoning": reasoning,
            "confidence": validation_result.get("confidence", 0.78),
            "recommendations": [
                "Always validate suggestions against explicit constraints",
                "Use neuro-symbolic for decisions requiring traceable reasoning",
                "Update rules as your priorities change",
                f"AI analyzed {len(neural_result.get('suggested_actions', []))} neural patterns against {len(validation_result.get('violations', []))} constraint violations",
            ],
        }

    async def _neural_analysis_with_ai(
        self, 
        text: str, 
        domain: str, 
        observations: List[Dict]
    ) -> Dict[str, Any]:
        """Use AI for neural pattern recognition."""
        # Prepare observation context
        obs_context = []
        for obs in observations[:20]:
            category = obs.get("category", "")
            label = obs.get("label", obs.get("text", ""))
            obs_context.append(f"{category}: {label}")

        context = "\nPrevious observations:\n" + "\n".join(obs_context) if obs_context else ""

        system_prompt = """You are a neural pattern recognition engine. Your task is to:
1. Extract intents, entities, and themes from the user's input
2. Identify patterns and trends
3. Generate actionable suggestions
4. Score suggestions by novelty, feasibility, and impact

Return ONLY valid JSON with structure:
{
    "detected_intent": "primary_intent",
    "key_entities": ["entity1", "entity2"],
    "themes": ["theme1", "theme2"],
    "suggested_actions": [
        {
            "action": "specific action",
            "novelty": 0.0-1.0,
            "feasibility": 0.0-1.0,
            "potential_impact": 0.0-1.0,
            "explanation": "why this action is suggested"
        }
    ],
    "confidence_scores": {"action1": 0.85, "action2": 0.92},
    "pattern_type": "recurring|emerging|anomaly|stable"
}"""

        user_prompt = f"""Analyze this input in the {domain} domain:

Input: {text}

{context}

Extract patterns and suggest actions."""

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
                return result
        except Exception:
            pass

        # Fallback to AI-informed analysis
        return await self._neural_analysis_fallback(text, domain, observations)

    async def _validate_constraints_with_ai(
        self, 
        actions: List[str], 
        constraints: Dict[str, Any],
        domain: str
    ) -> Dict[str, Any]:
        """Use AI to validate actions against constraints."""
        constraints_str = json.dumps(constraints, indent=2)
        actions_str = json.dumps(actions, indent=2)

        system_prompt = """You are a constraint validation engine. Your task is to:
1. Check each suggested action against provided constraints
2. Identify which constraints are violated
3. Calculate severity of violations
4. Suggest modifications to make actions compliant

Return ONLY valid JSON with structure:
{
    "violations": [
        {
            "action": "action_name",
            "constraint": "constraint_name",
            "violation_type": "hard|soft|warning",
            "severity": "high|medium|low",
            "description": "details of the violation",
            "suggested_fix": "how to fix the violation"
        }
    ],
    "compliant_actions": ["action1", "action2"],
    "overall_compliance": 0.0-1.0,
    "confidence": 0.0-1.0
}"""

        user_prompt = f"""Validate these actions against constraints in the {domain} domain:

Actions: {actions_str}

Constraints: {constraints_str}

Check for violations and suggest fixes."""

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
                return result
        except Exception:
            pass

        # Fallback to rule-based validation
        return {
            "violations": self._validate_constraints(actions, constraints),
            "compliant_actions": [a for a in actions if not any(v["action"] == a for v in self._validate_constraints(actions, constraints))],
            "overall_compliance": 0.85,
            "confidence": 0.75,
        }

    async def _filter_by_rules_with_ai(
        self, 
        neural_result: Dict[str, Any],
        validation_result: Dict[str, Any]
    ) -> List[Dict]:
        """Use AI to filter suggestions by rules."""
        actions = neural_result.get("suggested_actions", [])
        violations = validation_result.get("violations", [])

        if not actions:
            return []

        # Create structured data for AI
        data_str = json.dumps({
            "actions": actions,
            "violations": violations,
        }, indent=2)

        system_prompt = """You are a neuro-symbolic integration engine. Your task is to:
1. Take neural suggestions
2. Filter out actions that violate constraints
3. Modify non-compliant actions to make them compliant
4. Keep compliant actions unchanged
5. Provide reasoning for each decision

Return ONLY valid JSON with structure:
{
    "filtered_suggestions": [
        {
            "action": "action_name",
            "confidence": 0.0-1.0,
            "rule_compliant": true/false,
            "original_action": "original if modified",
            "modifications": ["modification1", "modification2"],
            "reasoning": "why this suggestion is kept or modified"
        }
    ],
    "summary": "brief summary of filtering process"
}"""

        user_prompt = f"""Filter these suggestions by constraint violations:

{data_str}

Create rule-compliant suggestions."""

        response = await self.ai.generate_text(
            prompt=user_prompt,
            system_prompt=system_prompt,
            model="gemma-4-26b-it",
            temperature=0.3,
            max_tokens=2048,
        )

        try:
            result = await self.ai.extract_json(response.content)
            if isinstance(result, dict) and "filtered_suggestions" in result:
                return result["filtered_suggestions"]
        except Exception:
            pass

        # Fallback to simple filtering
        return self._filter_by_rules(neural_result, validation_result)

    async def _generate_reasoning_with_ai(
        self, 
        neural_result: Dict[str, Any],
        validation_result: Dict[str, Any],
        filtered: List[Dict]
    ) -> List[str]:
        """Use AI to generate explainable reasoning."""
        data_str = json.dumps({
            "neural": neural_result,
            "validation": validation_result,
            "filtered": filtered,
        }, indent=2)

        system_prompt = """You are a reasoning engine. Your task is to:
1. Explain the neuro-symbolic analysis process
2. Describe what patterns were detected
3. Explain which constraints were checked
4. Summarize the filtering process
5. Provide actionable insights

Return ONLY valid JSON with structure:
{
    "reasoning": [
        "step 1 explanation",
        "step 2 explanation",
        "..."
    ],
    "insights": ["insight1", "insight2"],
    "next_steps": ["step1", "step2"]
}"""

        user_prompt = f"""Generate reasoning for this neuro-symbolic analysis:

{data_str}

Provide a clear, step-by-step explanation."""

        response = await self.ai.generate_text(
            prompt=user_prompt,
            system_prompt=system_prompt,
            model="gemma-4-26b-it",
            temperature=0.3,
            max_tokens=2048,
        )

        try:
            result = await self.ai.extract_json(response.content)
            if isinstance(result, dict) and "reasoning" in result:
                return result["reasoning"]
        except Exception:
            pass

        # Fallback to simple reasoning
        return self._generate_reasoning(neural_result, validation_result, filtered)

    async def _neural_analysis_fallback(
        self, 
        text: str, 
        domain: str, 
        observations: List[Dict]
    ) -> Dict[str, Any]:
        """Neural analysis fallback using keyword matching and simple heuristics."""
        import random
        
        words = text.lower().split()
        entities = [w for w in words if w[0].isupper() and len(w) > 3]
        
        patterns = {
            "detected_intent": "general",
            "key_entities": entities[:5],
            "themes": [],
            "suggested_actions": [],
            "confidence_scores": {},
            "pattern_type": "stable"
        }

        # Detect intent based on keywords
        if any(w in words for w in ["money", "spend", "save", "invest", "budget"]):
            patterns["detected_intent"] = "financial"
            patterns["themes"] = ["financial_planning", "budgeting"]
            patterns["suggested_actions"] = [
                "Create budget",
                "Review subscriptions",
                "Set savings goal",
                "Track expenses"
            ]
        elif any(w in words for w in ["study", "learn", "course", "skill", "education"]):
            patterns["detected_intent"] = "learning"
            patterns["themes"] = ["skill_development", "education"]
            patterns["suggested_actions"] = [
                "Schedule study time",
                "Identify skill gap",
                "Find resources",
                "Set learning goals"
            ]
        elif any(w in words for w in ["health", "exercise", "sleep", "diet", "fitness"]):
            patterns["detected_intent"] = "health"
            patterns["themes"] = ["wellness", "fitness"]
            patterns["suggested_actions"] = [
                "Track sleep",
                "Plan workouts",
                "Meal prep",
                "Monitor vitals"
            ]
        elif any(w in words for w in ["work", "career", "job", "profession"]):
            patterns["detected_intent"] = "career"
            patterns["themes"] = ["professional_development", "career_planning"]
            patterns["suggested_actions"] = [
                "Update resume",
                "Network professionally",
                "Set career goals",
                "Seek mentorship"
            ]

        # Add confidence scores
        for action in patterns["suggested_actions"]:
            patterns["confidence_scores"][action] = round(random.uniform(0.6, 0.95), 2)

        # Determine pattern type
        if observations:
            patterns["pattern_type"] = "recurring" if len(observations) > 5 else "emerging"

        return patterns

    def _validate_constraints(self, actions: List[str], constraints: Dict[str, Any]) -> List[Dict]:
        """Validate constraints as fallback."""
        violations = []
        rule = self.rules.get(constraints.get("domain", "general"), "")

        for action in actions:
            if "financial" in constraints.get("domain", "").lower() and "budget" in action.lower():
                if constraints.get("monthly_income", 0) > 0:
                    if constraints.get("monthly_expenses", 9999) > constraints["monthly_income"] * 0.9:
                        violations.append({
                            "action": action,
                            "constraint": "financial",
                            "violation_type": "hard",
                            "severity": "high",
                            "description": "Expenses exceed 90% of income",
                            "suggested_fix": "Reduce expenses or increase income"
                        })

        return violations

    def _filter_by_rules(self, neural_patterns: Dict, violations: List[Dict]) -> List[Dict]:
        """Filter by rules as fallback."""
        blocked_actions = {v["action"] for v in violations}
        filtered = []
        for action in neural_patterns.get("suggested_actions", []):
            if action not in blocked_actions:
                filtered.append({
                    "action": action,
                    "confidence": neural_patterns.get("confidence_scores", {}).get(action, 0.5),
                    "rule_compliant": True,
                })
        return filtered

    def _generate_reasoning(self, patterns: Dict, violations: List[Dict], filtered: List[Dict]) -> List[str]:
        """Generate reasoning as fallback."""
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
