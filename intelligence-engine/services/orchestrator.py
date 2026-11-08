"""Module Orchestrator — interconnects all 10 intelligence modules."""

from typing import Dict, Any, List, Optional
import time
import uuid


class ModuleOrchestrator:
    MODULE_GRAPH = {
        "multimodal": ["cognitive_memory", "generative", "neuromorphic"],
        "world_model": ["causal", "predictive", "neuro_symbolic", "multi_agent"],
        "quantum": ["causal", "multi_agent", "generative"],
        "causal": ["world_model", "neuro_symbolic", "multi_agent"],
        "neuro_symbolic": ["causal", "world_model", "multi_agent"],
        "cognitive_memory": ["predictive", "multi_agent", "world_model"],
        "generative": ["multi_agent", "quantum", "world_model"],
        "multi_agent": ["causal", "neuro_symbolic", "generative"],
        "predictive": ["world_model", "cognitive_memory", "causal"],
        "neuromorphic": ["predictive", "multimodal"],
        "multiverse": ["world_model", "quantum", "causal"],
    }

    def __init__(self, modules: Dict[str, Any]):
        self.modules = modules

    def get_module_graph(self) -> Dict[str, List[str]]:
        return self.MODULE_GRAPH

    async def run_single(self, module_id: str, data: Dict[str, Any], user_id: str,
                         context: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        module = self.modules[module_id]
        result = await module.run(data, user_id, context)
        result["suggested_next_modules"] = module.get_related_modules()
        return result

    async def run_cross_module(self, module_ids: List[str], data: Dict[str, Any],
                                user_id: str, problem_type: str) -> Dict[str, Any]:
        start = time.time()
        execution_id = str(uuid.uuid4())
        results = {}
        execution_order = self._determine_execution_order(module_ids)

        for module_id in execution_order:
            if module_id not in self.modules:
                continue
            enriched_data = dict(data)
            enriched_data["previous_results"] = {k: v.get("result", {}) for k, v in results.items()}
            result = await self.modules[module_id].run(enriched_data, user_id, {
                "problem_type": problem_type,
                "execution_id": execution_id,
                "previous_modules": list(results.keys()),
            })
            results[module_id] = result

        synthesis = self._synthesize(results, problem_type)
        execution_time_ms = (time.time() - start) * 1000

        return {
            "execution_id": execution_id,
            "problem_type": problem_type,
            "modules_run": list(results.keys()),
            "results": results,
            "synthesis": synthesis,
            "total_execution_time_ms": round(execution_time_ms, 2),
            "recommendations": synthesis.get("recommendations", []),
            "confidence": synthesis.get("confidence", 0.5),
        }

    def _determine_execution_order(self, module_ids: List[str]) -> List[str]:
        ordered = []
        remaining = list(module_ids)
        while remaining:
            added = False
            for mid in remaining[:]:
                deps = self.MODULE_GRAPH.get(mid, [])
                if all(d in ordered or d not in remaining for d in deps):
                    ordered.append(mid)
                    remaining.remove(mid)
                    added = True
            if not added:
                ordered.extend(remaining)
                break
        return ordered

    def _synthesize(self, results: Dict[str, Any], problem_type: str) -> Dict[str, Any]:
        all_recommendations = []
        confidences = []
        key_insights = []

        for module_id, result in results.items():
            confidences.append(result.get("confidence", 0.5))
            all_recommendations.extend(result.get("recommendations", []))
            mod_result = result.get("result", {})
            if module_id == "world_model":
                key_insights.append(f"World model projects state over {len(mod_result.get('projected_states', []))} months")
            elif module_id == "causal":
                key_insights.append(f"Causal analysis identified {len(mod_result.get('confounders', []))} confounders")
            elif module_id == "multi_agent":
                key_insights.append(f"Multi-agent consensus: {mod_result.get('recommendation', {}).get('recommended', 'N/A')}")
            elif module_id == "predictive":
                key_insights.append(f"Predictive trend: {mod_result.get('trend', {}).get('direction', 'unknown')}")
            elif module_id == "generative":
                key_insights.append(f"Generated {len(mod_result.get('ideas', []))} creative ideas")
            elif module_id == "quantum":
                key_insights.append(f"Quantum evaluated {len(mod_result.get('superposition', []))} options")
            elif module_id == "neuro_symbolic":
                key_insights.append(f"Neuro-symbolic: {len(mod_result.get('filtered_suggestions', []))} rule-compliant suggestions")
            elif module_id == "cognitive_memory":
                key_insights.append(f"Memory: {mod_result.get('total_memories', 0)} observations, {len(mod_result.get('patterns', []))} patterns")
            elif module_id == "multimodal":
                key_insights.append(f"Multimodal: synthesized {len(mod_result.get('modalities_used', []))} modalities")
            elif module_id == "neuromorphic":
                key_insights.append(f"Neuromorphic: {mod_result.get('spike_count', 0)} spikes detected")

        return {
            "key_insights": key_insights,
            "recommendations": list(dict.fromkeys(all_recommendations))[:10],
            "confidence": round(sum(confidences) / len(confidences), 3) if confidences else 0.5,
            "problem_type": problem_type,
            "modules_consulted": list(results.keys()),
        }

    async def generate_visualization(self, problem_type: str, data: Dict[str, Any],
                                      user_id: str) -> Dict[str, Any]:
        problem_module_map = {
            "career_change": ["world_model", "causal", "multi_agent", "predictive"],
            "financial_planning": ["world_model", "causal", "predictive", "neuro_symbolic"],
            "health_wellness": ["world_model", "cognitive_memory", "predictive", "multimodal"],
            "learning_goals": ["world_model", "causal", "generative", "predictive"],
            "behavior_change": ["causal", "cognitive_memory", "neuro_symbolic", "multi_agent"],
            "ambiguous_decision": ["quantum", "multi_agent", "world_model"],
        }
        relevant_modules = problem_module_map.get(problem_type, ["world_model", "causal", "multi_agent"])
        result = await self.run_cross_module(relevant_modules, data, user_id, problem_type)

        viz_data = {
            "problem_type": problem_type,
            "user_id": user_id,
            "chart_data": self._build_chart_data(result, problem_type),
            "module_graph": self._build_module_viz_graph(relevant_modules),
            "insights": result.get("synthesis", {}).get("key_insights", []),
            "recommendations": result.get("recommendations", []),
            "confidence": result.get("confidence", 0.5),
            "execution_id": result.get("execution_id", ""),
        }
        return viz_data

    def _build_chart_data(self, result: Dict[str, Any], problem_type: str) -> Dict[str, Any]:
        charts = {}
        charts["module_confidence"] = {
            "type": "radar",
            "data": [
                {"module": mid, "confidence": r.get("confidence", 0)}
                for mid, r in result.get("results", {}).items()
            ],
        }
        wm_result = result.get("results", {}).get("world_model", {})
        if wm_result:
            charts["state_projection"] = {
                "type": "line",
                "data": wm_result.get("result", {}).get("projected_states", []),
            }
        causal_result = result.get("results", {}).get("causal", {})
        if causal_result:
            charts["causal_graph"] = {
                "type": "network",
                "data": causal_result.get("result", {}).get("causal_graph", {}),
            }
        return charts

    def _build_module_viz_graph(self, module_ids: List[str]) -> Dict[str, Any]:
        nodes = []
        edges = []
        for mid in module_ids:
            if mid in self.modules:
                mod = self.modules[mid]
                nodes.append({"id": mid, "label": mod.name, "status": mod.status})
                for related in self.MODULE_GRAPH.get(mid, []):
                    if related in module_ids:
                        edges.append({"from": mid, "to": related})
        return {"nodes": nodes, "edges": edges}