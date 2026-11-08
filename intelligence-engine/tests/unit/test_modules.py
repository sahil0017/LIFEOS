"""Unit tests for all Intelligence Engine modules."""

import unittest
import asyncio
import sys
sys.path.insert(0, '/Users/sahilkanungo/Desktop/LIFEOS/intelligence-engine')

from modules.base import BaseModule
from tests.fixtures.sample_data import SampleDataFactory


class TestCognitiveMemoryModule(unittest.IsolatedAsyncioTestCase):
    """Tests for Cognitive Memory Module."""
    
    async def asyncSetUp(self):
        from modules.cognitive_memory import CognitiveMemoryModule
        self.module = CognitiveMemoryModule()
    
    async def test_process(self):
        """Test processing with sample data."""
        data = SampleDataFactory.create_module_input("cognitive_memory")
        result = await self.module.process(data, "test_user")
        
        self.assertIn("temporal_clusters", result)
        self.assertIn("associations", result)
        self.assertIn("patterns", result)
        self.assertIn("confidence", result)
        self.assertIn("recommendations", result)
    
    async def test_get_related_modules(self):
        """Test getting related modules."""
        related = self.module.get_related_modules()
        self.assertIsInstance(related, list)
        self.assertGreater(len(related), 0)


class TestWorldModelModule(unittest.IsolatedAsyncioTestCase):
    """Tests for World Model Module."""
    
    async def asyncSetUp(self):
        from modules.world_model import WorldModelModule
        self.module = WorldModelModule()
    
    async def test_process(self):
        """Test processing with sample data."""
        data = SampleDataFactory.create_module_input("world_model")
        result = await self.module.process(data, "test_user")
        
        self.assertIn("current_state", result)
        self.assertIn("world_model_analysis", result)
        self.assertIn("projected_states", result)
        self.assertIn("decision_points", result)
        self.assertIn("confidence", result)
        self.assertIn("recommendations", result)
    
    async def test_get_related_modules(self):
        """Test getting related modules."""
        related = self.module.get_related_modules()
        self.assertIsInstance(related, list)
        self.assertGreater(len(related), 0)


class TestCausalModule(unittest.IsolatedAsyncioTestCase):
    """Tests for Causal Module."""
    
    async def asyncSetUp(self):
        from modules.causal import CausalModule
        self.module = CausalModule()
    
    async def test_process(self):
        """Test processing with sample data."""
        data = SampleDataFactory.create_module_input("causal")
        result = await self.module.process(data, "test_user")
        
        self.assertIn("causal_graph", result)
        self.assertIn("confounders", result)
        self.assertIn("causal_effect", result)
        self.assertIn("counterfactuals", result)
        self.assertIn("confidence", result)
        self.assertIn("recommendations", result)
    
    async def test_get_related_modules(self):
        """Test getting related modules."""
        related = self.module.get_related_modules()
        self.assertIsInstance(related, list)
        self.assertGreater(len(related), 0)


class TestNeuroSymbolicModule(unittest.IsolatedAsyncioTestCase):
    """Tests for Neuro-Symbolic Module."""
    
    async def asyncSetUp(self):
        from modules.neuro_symbolic import NeuroSymbolicModule
        self.module = NeuroSymbolicModule()
    
    async def test_process(self):
        """Test processing with sample data."""
        data = SampleDataFactory.create_module_input("neuro_symbolic")
        result = await self.module.process(data, "test_user")
        
        self.assertIn("neural_patterns", result)
        self.assertIn("constraint_violations", result)
        self.assertIn("filtered_suggestions", result)
        self.assertIn("reasoning", result)
        self.assertIn("confidence", result)
        self.assertIn("recommendations", result)
    
    async def test_get_related_modules(self):
        """Test getting related modules."""
        related = self.module.get_related_modules()
        self.assertIsInstance(related, list)
        self.assertGreater(len(related), 0)


class TestMultiAgentModule(unittest.IsolatedAsyncioTestCase):
    """Tests for Multi-Agent Module."""
    
    async def asyncSetUp(self):
        from modules.multi_agent import MultiAgentModule
        self.module = MultiAgentModule()
    
    async def test_process(self):
        """Test processing with sample data."""
        data = SampleDataFactory.create_module_input("multi_agent")
        result = await self.module.process(data, "test_user")
        
        self.assertIn("decision", result)
        self.assertIn("agent_evaluations", result)
        self.assertIn("debate", result)
        self.assertIn("consensus", result)
        self.assertIn("recommendation", result)
        self.assertIn("confidence", result)
        self.assertIn("recommendations", result)
    
    async def test_get_related_modules(self):
        """Test getting related modules."""
        related = self.module.get_related_modules()
        self.assertIsInstance(related, list)
        self.assertGreater(len(related), 0)


class TestPredictiveModule(unittest.IsolatedAsyncioTestCase):
    """Tests for Predictive Module."""
    
    async def asyncSetUp(self):
        from modules.predictive import PredictiveModule
        self.module = PredictiveModule()
    
    async def test_process(self):
        """Test processing with sample data."""
        data = SampleDataFactory.create_module_input("predictive")
        result = await self.module.process(data, "test_user")
        
        self.assertIn("forecast", result)
        self.assertIn("trend", result)
        self.assertIn("uncertainty", result)
        self.assertIn("confidence", result)
        self.assertIn("recommendations", result)
    
    async def test_get_related_modules(self):
        """Test getting related modules."""
        related = self.module.get_related_modules()
        self.assertIsInstance(related, list)
        self.assertGreater(len(related), 0)


class TestNeuromorphicModule(unittest.IsolatedAsyncioTestCase):
    """Tests for Neuromorphic Module."""
    
    async def asyncSetUp(self):
        from modules.neuromorphic import NeuromorphicModule
        self.module = NeuromorphicModule()
    
    async def test_process(self):
        """Test processing with sample data."""
        data = SampleDataFactory.create_module_input("neuromorphic")
        result = await self.module.process(data, "test_user")
        
        self.assertIn("network_state", result)
        self.assertIn("detected_patterns", result)
        self.assertIn("readout", result)
        self.assertIn("confidence", result)
        self.assertIn("recommendations", result)
    
    async def test_get_related_modules(self):
        """Test getting related modules."""
        related = self.module.get_related_modules()
        self.assertIsInstance(related, list)
        self.assertGreater(len(related), 0)


class TestQuantumModule(unittest.IsolatedAsyncioTestCase):
    """Tests for Quantum Module."""
    
    async def asyncSetUp(self):
        from modules.quantum import QuantumModule
        self.module = QuantumModule()
    
    async def test_process(self):
        """Test processing with sample data."""
        data = SampleDataFactory.create_module_input("quantum")
        result = await self.module.process(data, "test_user")
        
        self.assertIn("superposition", result)
        self.assertIn("interference", result)
        self.assertIn("collapsed_decision", result)
        self.assertIn("confidence", result)
        self.assertIn("recommendations", result)
    
    async def test_get_related_modules(self):
        """Test getting related modules."""
        related = self.module.get_related_modules()
        self.assertIsInstance(related, list)
        self.assertGreater(len(related), 0)


class TestMultimodalModule(unittest.IsolatedAsyncioTestCase):
    """Tests for Multimodal Module."""
    
    async def asyncSetUp(self):
        from modules.multimodal import MultimodalModule
        self.module = MultimodalModule()
    
    async def test_process(self):
        """Test processing with sample data."""
        data = SampleDataFactory.create_module_input("multimodal")
        result = await self.module.process(data, "test_user")
        
        self.assertIn("insights", result)
        self.assertIn("synthesis", result)
        self.assertIn("confidence", result)
        self.assertIn("recommendations", result)
    
    async def test_get_related_modules(self):
        """Test getting related modules."""
        related = self.module.get_related_modules()
        self.assertIsInstance(related, list)
        self.assertGreater(len(related), 0)


class TestMultiverseModule(unittest.IsolatedAsyncioTestCase):
    """Tests for Multiverse Module."""
    
    async def asyncSetUp(self):
        from modules.multiverse import MultiverseModule
        self.module = MultiverseModule()
    
    async def test_process(self):
        """Test processing with sample data."""
        data = SampleDataFactory.create_module_input("multiverse")
        result = await self.module.process(data, "test_user")
        
        self.assertIn("best_future", result)
        self.assertIn("worst_future", result)
        self.assertIn("confidence", result)
        self.assertIn("recommendations", result)
    
    async def test_get_related_modules(self):
        """Test getting related modules."""
        related = self.module.get_related_modules()
        self.assertIsInstance(related, list)
        self.assertGreater(len(related), 0)


class TestGenerativeModule(unittest.IsolatedAsyncioTestCase):
    """Tests for Generative Module."""
    
    async def asyncSetUp(self):
        from modules.generative import GenerativeModule
        self.module = GenerativeModule()
    
    async def test_process(self):
        """Test processing with sample data."""
        data = SampleDataFactory.create_module_input("generative")
        result = await self.module.process(data, "test_user")
        
        self.assertIn("ideas", result)
        self.assertIn("best_idea", result)
        self.assertIn("confidence", result)
        self.assertIn("recommendations", result)
    
    async def test_get_related_modules(self):
        """Test getting related modules."""
        related = self.module.get_related_modules()
        self.assertIsInstance(related, list)
        self.assertGreater(len(related), 0)


class TestBaseModule(unittest.IsolatedAsyncioTestCase):
    """Tests for BaseModule class."""
    
    async def test_base_module_instantiation(self):
        """Test creating a BaseModule instance."""
        class TestModule(BaseModule):
            async def process(self, data, user_id, context=None):
                return {"result": "test"}
            
            def get_related_modules(self):
                return ["test"]
        
        module = TestModule("test", "Test Module", "Description")
        self.assertEqual(module.module_id, "test")
        self.assertEqual(module.name, "Test Module")
        self.assertEqual(module.description, "Description")
        self.assertEqual(module.status, "ready")
    
    async def test_base_module_run(self):
        """Test running a BaseModule."""
        class TestModule(BaseModule):
            async def process(self, data, user_id, context=None):
                return {"result": "test"}
            
            def get_related_modules(self):
                return ["test"]
        
        module = TestModule("test", "Test Module", "Description")
        result = await module.run({"input": "test"}, "user1")
        
        self.assertEqual(result["module"], "test")
        self.assertIn("result", result)
        self.assertIn("confidence", result)
        self.assertIn("execution_time_ms", result)
        self.assertIn("recommendations", result)
        self.assertIn("related_modules", result)
        self.assertIn("execution_id", result)


if __name__ == "__main__":
    unittest.main()
