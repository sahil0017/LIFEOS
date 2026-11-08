"""Quantum Intelligence Module — quantum-inspired approaches to uncertainty with real AI."""

from modules.base import BaseModule
from services.cloudflare_ai import get_ai_client
from typing import Dict, Any, List, Optional
import json
import math


class QuantumModule(BaseModule):
    def __init__(self):
        super().__init__(
            module_id="quantum",
            name="Quantum Intelligence",
            description="Investigate quantum-inspired approaches to uncertainty and probability",
            status="experimental",
        )
        self.ai = get_ai_client()

    async def process(self, data: Dict[str, Any], user_id: str, context: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        options = data.get("options", ["Option A", "Option B"])
        uncertainties = data.get("uncertainties", [0.5] * len(options))
        decision_context = data.get("context", "")
        observations = data.get("observations", [])

        # Use AI to analyze options in quantum framework
        quantum_analysis = await self._analyze_with_quantum_ai(options, uncertainties, decision_context, observations)
        
        # Use AI to compute quantum interference
        interference = await self._compute_interference_with_ai(
            quantum_analysis.get("superposition", []),
            decision_context
        )
        
        # Use AI to collapse to decision
        collapsed = await self._measure_with_ai(
            quantum_analysis.get("superposition", []),
            interference,
            decision_context
        )
        
        # Compare with classical baseline
        classical = self._classical_baseline(options, uncertainties)

        return {
            "superposition": quantum_analysis.get("superposition", []),
            "interference": interference,
            "collapsed_decision": collapsed,
            "classical_baseline": classical,
            "quantum_advantage": quantum_analysis.get("quantum_advantage", "Explores ambiguous decision space with superposition before collapse"),
            "ai_analysis": quantum_analysis.get("analysis", ""),
            "confidence": quantum_analysis.get("confidence", 0.65),
            "recommendations": [
                "Compare quantum result with classical baseline before deciding",
                "Use quantum approach for decisions with high uncertainty",
                "Run multiple simulations to see probability distribution",
                f"AI analyzed {len(options)} options with quantum-inspired uncertainty modeling",
            ],
        }

    async def _analyze_with_quantum_ai(
        self, 
        options: List[str], 
        uncertainties: List[float],
        decision_context: str,
        observations: List[Dict]
    ) -> Dict[str, Any]:
        """Use AI to analyze options in quantum framework."""
        # Prepare observation context
        obs_context = "\n".join([
            f"[{o.get('occurred_at', '')}] {o.get('category', '')}: {o.get('label', o.get('text', ''))}"
            for o in observations[:10]
        ])

        options_str = json.dumps([{"option": o, "uncertainty": u} for o, u in zip(options, uncertainties)], indent=2)

        system_prompt = """You are a quantum decision analyst. Your task is to:
1. Analyze decision options through a quantum-inspired lens
2. Create superpositions of options with probability amplitudes
3. Account for uncertainty in each option
4. Explain the quantum advantage for this decision

In quantum mechanics:
- Each option exists in superposition until measured
- Amplitude squared = probability
- Phase affects interference patterns
- Measurement collapses to one outcome

Return ONLY valid JSON with structure:
{
    "superposition": [
        {
            "option": "Option A",
            "amplitude": 0.0-1.0,
            "phase": 0.0-6.28,
            "probability": 0.0-1.0,
            "uncertainty": 0.0-1.0,
            "quantum_state": "description of quantum state",
            "interference_potential": 0.0-1.0
        }
    ],
    "analysis": "brief quantum analysis of the decision",
    "quantum_advantage": "explanation of quantum advantage",
    "confidence": 0.0-1.0
}"""

        user_prompt = f"""Analyze these decision options in a quantum-inspired framework:

Options: {options_str}

Decision context: {decision_context}

Observation context:
{obs_context if obs_context else 'No observations'}

Create superpositions and analyze quantum characteristics."""

        response = await self.ai.generate_text(
            prompt=user_prompt,
            system_prompt=system_prompt,
            model="gemma-4-26b-it",
            temperature=0.4,
            max_tokens=4096,
        )

        try:
            result = await self.ai.extract_json(response.content)
            if isinstance(result, dict):
                return result
        except Exception:
            pass

        # Fallback to mathematical quantum simulation
        return self._quantum_simulation(options, uncertainties)

    async def _compute_interference_with_ai(
        self, 
        superposition: List[Dict],
        decision_context: str
    ) -> Dict[str, Any]:
        """Use AI to compute quantum interference patterns."""
        if not superposition:
            return {
                "total_phase": 0,
                "patterns": [],
            }

        superposition_str = json.dumps(superposition, indent=2)

        system_prompt = """You are a quantum interference expert. Given superposition states,
calculate interference patterns between options.

Quantum interference:
- Constructive: waves in phase, amplitudes add
- Destructive: waves out of phase, amplitudes subtract
- Phase difference determines interference type
- Affects final probability distribution

Return ONLY valid JSON with structure:
{
    "total_phase": 0.0-6.28,
    "patterns": [
        {
            "pair": "Option A <-> Option B",
            "phase_difference": 0.0-6.28,
            "interference": -1.0 to 1.0,
            "type": "constructive|destructive|mixed",
            "impact": "how interference affects probabilities",
            "significance": "high|medium|low"
        }
    ],
    "overall_interference": "summary of interference effects"
}"""

        user_prompt = f"""Compute interference patterns for these superposition states:

{superposition_str}

Decision context: {decision_context}

Calculate all pairwise interference patterns."""

        response = await self.ai.generate_text(
            prompt=user_prompt,
            system_prompt=system_prompt,
            model="gemma-4-26b-it",
            temperature=0.3,
            max_tokens=4096,
        )

        try:
            result = await self.ai.extract_json(response.content)
            if isinstance(result, dict):
                return result
        except Exception:
            pass

        # Fallback to mathematical interference calculation
        return self._compute_interference(superposition)

    async def _measure_with_ai(
        self, 
        superposition: List[Dict],
        interference: Dict[str, Any],
        decision_context: str
    ) -> Dict:
        """Use AI to perform quantum measurement (collapse)."""
        if not superposition:
            return {
                "selected_option": "insufficient_data",
                "confidence": 0.0,
                "all_probabilities": {},
            }

        superposition_str = json.dumps(superposition, indent=2)
        interference_str = json.dumps(interference, indent=2)

        system_prompt = """You are a quantum measurement expert. Given superposition states and interference patterns,
perform measurement to collapse to a final decision.

Measurement rules:
- Probability of each option = amplitude squared
- Adjust for interference effects
- Select based on weighted probabilities
- Provide confidence in selection

Return ONLY valid JSON with structure:
{
    "selected_option": "Option A",
    "confidence": 0.0-1.0,
    "all_probabilities": {"Option A": 0.6, "Option B": 0.4},
    "measurement_basis": "description of measurement basis",
    "collapse_reasoning": "why this option was selected",
    "alternative_outcomes": ["other possible outcomes"]
}"""

        user_prompt = f"""Perform quantum measurement on these states:

Superposition: {superposition_str}

Interference: {interference_str}

Decision context: {decision_context}

Collapse to a final decision with explanation."""

        response = await self.ai.generate_text(
            prompt=user_prompt,
            system_prompt=system_prompt,
            model="gemma-4-26b-it",
            temperature=0.3,
            max_tokens=2048,
        )

        try:
            result = await self.ai.extract_json(response.content)
            if isinstance(result, dict):
                return result
        except Exception:
            pass

        # Fallback to mathematical measurement
        return self._measure(superposition, interference)

    def _quantum_simulation(self, options: List[str], uncertainties: List[float]) -> Dict[str, Any]:
        """Quantum simulation as fallback."""
        superposition = []
        n = len(options)
        
        for i, option in enumerate(options):
            amplitude = math.sqrt(1.0 / n)
            phase = (i * 2 * math.pi) / n
            probability = abs(amplitude) ** 2
            uncertainty = uncertainties[i] if i < len(uncertainties) else 0.5
            
            superposition.append({
                "option": option,
                "amplitude": round(amplitude, 4),
                "phase": round(phase, 4),
                "probability": round(probability, 4),
                "uncertainty": uncertainty,
                "quantum_state": f"Superposition component for {option}",
                "interference_potential": round(0.5 + (i % 2) * 0.2, 2),
            })

        return {
            "superposition": superposition,
            "analysis": f"Quantum superposition of {n} options with equal initial probabilities",
            "quantum_advantage": "Explores all options simultaneously before collapse",
            "confidence": 0.65,
        }

    def _compute_interference(self, superposition: List[Dict]) -> Dict[str, Any]:
        """Compute interference as fallback."""
        total_phase = sum(s["phase"] for s in superposition)
        interference_patterns = []
        
        for i, s in enumerate(superposition):
            for j, t in enumerate(superposition):
                if i < j:
                    phase_diff = abs(s["phase"] - t["phase"])
                    interference = math.cos(phase_diff) * s["probability"] * t["probability"]
                    interference_type = "constructive" if interference > 0 else "destructive"
                    
                    interference_patterns.append({
                        "pair": f"{s['option']} <-> {t['option']}",
                        "phase_difference": round(phase_diff, 4),
                        "interference": round(interference, 4),
                        "type": interference_type,
                        "impact": f"{interference_type} interference between options",
                        "significance": "high" if abs(interference) > 0.3 else "medium" if abs(interference) > 0.1 else "low",
                    })

        return {
            "total_phase": round(total_phase, 4),
            "patterns": interference_patterns,
            "overall_interference": f"Mixed interference with {len([p for p in interference_patterns if p['type'] == 'constructive'])} constructive and {len([p for p in interference_patterns if p['type'] == 'destructive'])} destructive patterns",
        }

    def _measure(self, superposition: List[Dict], interference: Dict[str, Any]) -> Dict:
        """Perform measurement as fallback."""
        weights = []
        for s in superposition:
            # Adjust weight by interference
            interference_boost = 1.0
            for pattern in interference.get("patterns", []):
                if s["option"] in pattern["pair"]:
                    if pattern["type"] == "constructive":
                        interference_boost += 0.1
                    else:
                        interference_boost -= 0.05
            
            weight = s["probability"] * (1 - s["uncertainty"]) * interference_boost
            weights.append(weight)

        total = sum(weights)
        if total > 0:
            normalized = [w / total for w in weights]
        else:
            normalized = [1.0 / len(weights)] * len(weights)

        best_idx = max(range(len(normalized)), key=lambda i: normalized[i])
        
        return {
            "selected_option": superposition[best_idx]["option"],
            "confidence": round(normalized[best_idx], 4),
            "all_probabilities": {s["option"]: round(p, 4) for s, p in zip(superposition, normalized)},
            "measurement_basis": "Probability-weighted with interference adjustment",
            "collapse_reasoning": f"Highest weighted probability: {superposition[best_idx]['option']} with weight {normalized[best_idx]:.4f}",
            "alternative_outcomes": [s["option"] for i, s in enumerate(superposition) if i != best_idx][:3],
        }

    def _classical_baseline(self, options: List[str], uncertainties: List[float]) -> Dict[str, Any]:
        """Classical baseline for comparison."""
        expected_values = []
        for i, option in enumerate(options):
            uncertainty = uncertainties[i] if i < len(uncertainties) else 0.5
            expected_values.append((1 - uncertainty) * (1.0 / len(options)))

        total = sum(expected_values)
        if total > 0:
            normalized = [ev / total for ev in expected_values]
        else:
            normalized = [1.0 / len(expected_values)] * len(expected_values)

        best_idx = max(range(len(normalized)), key=lambda i: normalized[i])

        return {
            "expected_value": round(sum(normalized), 3),
            "recommended": options[best_idx],
            "classical_probabilities": {options[i]: round(normalized[i], 4) for i in range(len(options))},
            "method": "Classical probability with uncertainty weighting",
        }

    def get_related_modules(self) -> List[str]:
        return ["causal", "multi_agent", "generative"]
