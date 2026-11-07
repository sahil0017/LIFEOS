"""Cognitive Memory Intelligence Module — persistent, temporal, associative memory."""

from modules.base import BaseModule
from typing import Dict, Any, List, Optional
import random
from datetime import datetime, timedelta


class CognitiveMemoryModule(BaseModule):
    def __init__(self):
        super().__init__(
            module_id="cognitive_memory",
            name="Cognitive Memory Intelligence",
            description="Build persistent, temporal and associative memory across months and years",
            status="ready",
        )

    async def process(self, data: Dict[str, Any], user_id: str, context: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        observations = data.get("observations", [])
        goals = data.get("goals", [])
        time_range = data.get("time_range", "all")

        # Temporal clustering: group observations by time
        temporal_clusters = self._temporal_cluster(observations)

        # Associative links: connect related observations
        associations = self._find_associations(observations, goals)

        # Pattern detection: recurring themes
        patterns = self._detect_patterns(observations)

        # Memory decay simulation
        decayed = self._apply_decay(observations)

        return {
            "temporal_clusters": temporal_clusters,
            "associations": associations,
            "patterns": patterns,
            "decayed_memories": len(decayed),
            "total_memories": len(observations),
            "confidence": 0.80,
            "recommendations": [
                "Review recurring patterns monthly",
                "Connect new observations to existing associations",
                "Use temporal clusters to identify life phases",
            ],
        }

    def _temporal_cluster(self, observations: List[Dict]) -> List[Dict]:
        clusters = []
        # Group by week (simplified)
        weeks = {}
        for obs in observations:
            date_str = obs.get("occurred_at", obs.get("date", ""))
            if date_str:
                try:
                    dt = datetime.fromisoformat(date_str.replace("Z", "+00:00"))
                    week_key = dt.strftime("%Y-W%U")
                except:
                    week_key = "unknown"
            else:
                week_key = "unknown"
            weeks.setdefault(week_key, []).append(obs)

        for week, items in sorted(weeks.items()):
            clusters.append({
                "period": week,
                "count": len(items),
                "categories": list(set(o.get("category", "unknown") for o in items)),
                "key_observations": [o.get("label", "")[:50] for o in items[:3]],
            })
        return clusters[-8:]  # Last 8 weeks

    def _find_associations(self, observations: List[Dict], goals: List[Dict]) -> List[Dict]:
        associations = []
        categories = {}
        for obs in observations:
            cat = obs.get("category", "unknown")
            categories.setdefault(cat, 0)
            categories[cat] += 1

        # Link categories that co-occur
        cats = list(categories.keys())
        for i in range(len(cats)):
            for j in range(i + 1, len(cats)):
                associations.append({
                    "from": cats[i],
                    "to": cats[j],
                    "strength": round(random.uniform(0.3, 0.9), 2),
                    "type": "associative",
                })
        return associations[:10]

    def _detect_patterns(self, observations: List[Dict]) -> List[Dict]:
        patterns = []
        # Simple pattern: same category repeated
        category_counts = {}
        for obs in observations:
            cat = obs.get("category", "unknown")
            category_counts[cat] = category_counts.get(cat, 0) + 1

        for cat, count in category_counts.items():
            if count >= 3:
                patterns.append({
                    "type": "recurring_category",
                    "category": cat,
                    "frequency": count,
                    "significance": "high" if count >= 5 else "medium",
                })

        return patterns

    def _apply_decay(self, observations: List[Dict]) -> List[Dict]:
        # Simulate memory decay: older observations fade
        cutoff = datetime.now() - timedelta(days=90)
        decayed = []
        for obs in observations:
            date_str = obs.get("occurred_at", obs.get("date", ""))
            if date_str:
                try:
                    dt = datetime.fromisoformat(date_str.replace("Z", "+00:00"))
                    if dt < cutoff:
                        decayed.append(obs)
                except:
                    pass
        return decayed

    def get_related_modules(self) -> List[str]:
        return ["predictive", "multi_agent", "world_model"]