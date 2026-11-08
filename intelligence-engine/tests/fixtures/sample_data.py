"""Sample data fixtures for testing."""

from typing import Dict, Any, List
import random
from datetime import datetime, timedelta


class SampleDataFactory:
    """Factory for creating sample test data."""
    
    @staticmethod
    def create_observation(
        category: str = "learning",
        label: str = None,
        text: str = None,
        occurred_at: str = None,
        value: float = None
    ) -> Dict[str, Any]:
        """Create a sample observation."""
        if not label:
            label = f"Sample {category} observation"
        if not text:
            text = f"This is a sample observation about {category}"
        if not occurred_at:
            occurred_at = datetime.now().isoformat()
        
        return {
            "id": f"obs_{random.randint(1, 10000)}",
            "category": category,
            "label": label,
            "text": text,
            "occurred_at": occurred_at,
            "value": value or random.uniform(0, 1),
            "metadata": {"source": "test"},
        }
    
    @staticmethod
    def create_observations(count: int = 5) -> List[Dict[str, Any]]:
        """Create multiple sample observations."""
        categories = ["learning", "health", "work", "social", "finance"]
        return [
            SampleDataFactory.create_observation(
                category=random.choice(categories),
                occurred_at=(datetime.now() - timedelta(days=random.randint(1, 30))).isoformat()
            )
            for _ in range(count)
        ]
    
    @staticmethod
    def create_goal(title: str = None, description: str = None) -> Dict[str, Any]:
        """Create a sample goal."""
        if not title:
            title = f"Sample Goal {random.randint(1, 100)}"
        if not description:
            description = f"Description for {title}"
        
        return {
            "title": title,
            "description": description,
            "priority": random.choice(["high", "medium", "low"]),
            "category": random.choice(["career", "health", "learning", "personal"]),
            "target_date": (datetime.now() + timedelta(days=random.randint(30, 365))).isoformat(),
            "completed": False,
        }
    
    @staticmethod
    def create_goals(count: int = 3) -> List[Dict[str, Any]]:
        """Create multiple sample goals."""
        return [SampleDataFactory.create_goal() for _ in range(count)]
    
    @staticmethod
    def create_state() -> Dict[str, float]:
        """Create a sample state dict."""
        return {
            "energy": round(random.uniform(0.1, 1.0), 2),
            "focus": round(random.uniform(0.1, 1.0), 2),
            "financial_stability": round(random.uniform(0.1, 1.0), 2),
            "relationships": round(random.uniform(0.1, 1.0), 2),
            "health": round(random.uniform(0.1, 1.0), 2),
            "learning": round(random.uniform(0.1, 1.0), 2),
        }
    
    @staticmethod
    def create_module_input(module_id: str) -> Dict[str, Any]:
        """Create sample input for a specific module."""
        inputs = {
            "cognitive_memory": {
                "observations": SampleDataFactory.create_observations(10),
                "goals": SampleDataFactory.create_goals(3),
                "time_range": "all",
            },
            "world_model": {
                "current_state": SampleDataFactory.create_state(),
                "action": "learn_python",
                "horizon_months": 6,
                "observations": SampleDataFactory.create_observations(5),
                "goals": SampleDataFactory.create_goals(2),
            },
            "causal": {
                "variables": ["sleep", "focus", "exercise", "productivity"],
                "outcome": "productivity",
                "observations": SampleDataFactory.create_observations(8),
                "intervention": {"sleep": 8, "exercise": 30},
            },
            "neuro_symbolic": {
                "input": "I want to learn Python and improve my career",
                "constraints": {
                    "committed_hours_per_day": 10,
                    "budget": 500,
                },
                "domain": "career",
                "observations": SampleDataFactory.create_observations(5),
            },
            "multi_agent": {
                "decision": "Should I switch careers to AI?",
                "options": ["now", "next year", "never"],
                "values": ["career growth", "financial stability", "work-life balance"],
                "observations": SampleDataFactory.create_observations(3),
            },
            "predictive": {
                "metric": "study_hours",
                "horizon_days": 30,
                "observations": SampleDataFactory.create_observations(15),
            },
            "neuromorphic": {
                "events": [
                    {"timestamp": i, "type": "spike", "value": random.random()}
                    for i in range(10)
                ],
                "time_steps": 10,
                "observations": SampleDataFactory.create_observations(3),
            },
            "quantum": {
                "options": ["Option A", "Option B", "Option C"],
                "uncertainties": [0.3, 0.5, 0.2],
            },
            "multimodal": {
                "text": "Feeling productive today",
                "sensors": {"steps": 8500, "heart_rate": 72},
                "images": [{"url": "http://example.com/image.jpg"}],
                "audio": [{"url": "http://example.com/audio.mp3"}],
            },
            "multiverse": {
                "current_state": SampleDataFactory.create_state(),
                "action": "start_new_project",
                "num_scenarios": 5,
                "observations": SampleDataFactory.create_observations(5),
            },
            "generative": {
                "challenge": "Design an AI workflow for personal productivity",
                "domain": "productivity",
                "num_ideas": 5,
            },
        }
        
        return inputs.get(module_id, {"input": "test"})
    
    @staticmethod
    def create_module_inputs() -> Dict[str, Dict[str, Any]]:
        """Create sample inputs for all modules."""
        module_ids = [
            "cognitive_memory", "world_model", "causal", "neuro_symbolic",
            "multi_agent", "predictive", "neuromorphic", "quantum",
            "multimodal", "multiverse", "generative"
        ]
        return {module_id: SampleDataFactory.create_module_input(module_id) 
                for module_id in module_ids}
