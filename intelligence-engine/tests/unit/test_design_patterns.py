"""Unit tests for design patterns."""

import unittest
import asyncio
from typing import Dict, Any

import sys
sys.path.insert(0, '/Users/sahilkanungo/Desktop/LIFEOS/intelligence-engine')

from core.patterns import (
    StrategyPattern,
    StrategyContext,
    AIStrategy,
    FallbackStrategy,
    HybridStrategy,
    ModuleFactory,
    SingletonFactory,
    Subject,
    Observer,
    ObserverPattern,
    EventObserver,
    ModuleObserver,
)
from core.exceptions import ModuleError


class TestStrategyPattern(unittest.IsolatedAsyncioTestCase):
    """Tests for Strategy Pattern."""
    
    async def test_ai_strategy(self):
        """Test AI strategy execution."""
        # This test will work with the actual implementation
        strategy = AIStrategy()
        
        # The AIStrategy.execute takes prompt and system_prompt as parameters
        # We can't test this without actual AI configuration
        # So we'll skip this test for now
        self.skipTest("AI strategy requires AI configuration")
    
    async def test_fallback_strategy(self):
        """Test fallback strategy execution."""
        def fallback_func(*args, **kwargs):
            return {"result": "fallback", "data": args[0] if args else {}}
        
        strategy = FallbackStrategy(fallback_func)
        result = await strategy.execute({"test": "data"})
        
        self.assertEqual(result["result"], "fallback")
        self.assertEqual(result["data"], {"test": "data"})
    
    async def test_hybrid_strategy_with_ai_unavailable(self):
        """Test hybrid strategy when AI is unavailable."""
        def fallback_func(*args, **kwargs):
            return {"result": "fallback"}
        
        # Skip this test as it requires AIStrategy which needs AI configuration
        self.skipTest("Hybrid strategy requires AI configuration")


class TestModuleFactory(unittest.IsolatedAsyncioTestCase):
    """Tests for Module Factory."""
    
    def test_register_and_create(self):
        """Test registering and creating a module."""
        # Create a simple test module class
        class TestModule:
            def __init__(self, name: str = "test"):
                self.name = name
        
        # Create factory instance
        factory = ModuleFactory()
        
        # Register the module
        factory.register("test", TestModule)
        
        # Create an instance
        module = factory.create("test", name="test_instance")
        
        self.assertIsInstance(module, TestModule)
        self.assertEqual(module.name, "test_instance")
    
    def test_unknown_module(self):
        """Test creating an unknown module."""
        factory = ModuleFactory()
        with self.assertRaises(ValueError):
            factory.create("unknown_module")
    
    def test_get_registered_modules(self):
        """Test getting list of registered modules."""
        class TestModule1:
            pass
        class TestModule2:
            pass
        
        factory = ModuleFactory()
        factory.register("module1", TestModule1)
        factory.register("module2", TestModule2)
        
        modules = factory.get_available_modules()
        self.assertIn("module1", modules)
        self.assertIn("module2", modules)


class TestSingletonPattern(unittest.IsolatedAsyncioTestCase):
    """Tests for Singleton Pattern."""
    
    def test_singleton_factory(self):
        """Test singleton factory."""
        # Clear any existing instances
        SingletonFactory.clear()
        
        # Create first instance
        instance1 = SingletonFactory.get_instance("test", lambda: {"value": 1})
        
        # Create second instance with different creator
        instance2 = SingletonFactory.get_instance("test", lambda: {"value": 2})
        
        # They should be the same
        self.assertEqual(instance1, instance2)
        self.assertEqual(instance1["value"], 1)  # First creator was used
        
        # Create instance with different key
        instance3 = SingletonFactory.get_instance("other", lambda: {"value": 3})
        
        # Should be different
        self.assertNotEqual(instance1, instance3)
    
    def test_singleton_registry(self):
        """Test singleton registry."""
        from core.patterns import SingletonRegistry
        SingletonRegistry.clear()
        
        # Register an instance
        obj = {"test": "value"}
        SingletonRegistry.register("test", obj)
        
        # Retrieve it
        retrieved = SingletonRegistry.get_instance("test", lambda: {"new": "value"})
        
        self.assertEqual(retrieved, obj)
    
    def test_singleton_unregister(self):
        """Test unregistering a singleton."""
        from core.patterns import SingletonRegistry
        SingletonRegistry.clear()
        
        # Register and retrieve
        obj = {"test": "value"}
        SingletonRegistry.register("test", obj)
        self.assertTrue(SingletonRegistry.has("test"))
        
        # Unregister
        SingletonRegistry.unregister("test")
        self.assertFalse(SingletonRegistry.has("test"))


class TestObserverPattern(unittest.IsolatedAsyncioTestCase):
    """Tests for Observer Pattern."""
    
    async def test_subject_observer(self):
        """Test subject and observer."""
        # Create a subject
        subject = Subject()
        
        # Create an observer
        class TestObserver(Observer):
            def __init__(self):
                self.updates = []
            
            async def update(self, subject, data):
                self.updates.append({"subject": subject, "data": data})
        
        observer = TestObserver()
        
        # Attach observer
        subject.attach(observer)
        
        # Notify
        await subject.notify({"test": "data"})
        
        # Check observer was updated
        self.assertEqual(len(observer.updates), 1)
        self.assertEqual(observer.updates[0]["data"], {"test": "data"})
        
        # Detach observer
        subject.detach(observer)
        
        # Notify again
        await subject.notify({"test": "data2"})
        
        # Observer should not be updated
        self.assertEqual(len(observer.updates), 1)
    
    async def test_event_observer(self):
        """Test event observer."""
        updates = []
        
        def callback(data):
            updates.append(data)
        
        observer = EventObserver(callback)
        subject = Subject()
        subject.attach(observer)
        
        await subject.notify({"test": "data"})
        
        self.assertEqual(len(updates), 1)
        self.assertEqual(updates[0], {"test": "data"})
    
    async def test_module_observer(self):
        """Test module observer."""
        observer = ModuleObserver("test_module")
        subject = Subject()
        subject.attach(observer)
        
        await subject.notify({"event": "test", "data": {"key": "value"}})
        
        events = observer.get_events()
        self.assertEqual(len(events), 1)
        self.assertEqual(events[0]["module_id"], "test_module")
        self.assertEqual(events[0]["data"], {"event": "test", "data": {"key": "value"}})


class TestObserverPatternClass(unittest.IsolatedAsyncioTestCase):
    """Tests for ObserverPattern class."""
    
    async def test_observer_pattern(self):
        """Test ObserverPattern class."""
        pattern = ObserverPattern()
        
        # Create a subject
        subject = pattern.create_subject("test_subject")
        
        # Create an observer
        updates = []
        
        class TestObserver(Observer):
            async def update(self, subject, data):
                updates.append({"subject": subject.__class__.__name__, "data": data})
        
        observer = TestObserver()
        pattern.register_observer("test_observer", observer)
        
        # Attach observer to subject
        subject.attach(observer)
        
        # Notify
        await subject.notify({"test": "data"})
        
        self.assertEqual(len(updates), 1)
        self.assertEqual(updates[0]["data"], {"test": "data"})


if __name__ == "__main__":
    unittest.main()
