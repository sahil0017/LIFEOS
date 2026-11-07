"""Unit and end-to-end tests for LIFEOS Python Intelligence Backend."""

import asyncio
import unittest
from main import app, orchestrator, CrossModuleQuery, ModuleInput


class TestPythonBackend(unittest.IsolatedAsyncioTestCase):
    def setUp(self):
        self.user_id = "test_user_123"

    async def test_all_modules_registered(self):
        expected_modules = {
            "multimodal", "world_model", "quantum", "causal", "neuro_symbolic",
            "cognitive_memory", "generative", "multi_agent", "predictive", "neuromorphic", "multiverse"
        }
        self.assertEqual(set(orchestrator.modules.keys()), expected_modules)

    async def test_single_module_execution_each(self):
        sample_inputs = {
            "multimodal": {"text": "Feeling productive today", "sensors": {"steps": 8500, "heart_rate": 72}},
            "world_model": {"current_state": {"energy": 0.8, "focus": 0.7}, "action": "learn_python", "horizon_months": 3},
            "quantum": {"options": ["Option A", "Option B"], "uncertainties": [0.4, 0.6]},
            "causal": {"variables": ["sleep", "focus", "exercise"], "outcome": "focus", "intervention": {"sleep": 8}},
            "neuro_symbolic": {"input": "Planning work budget", "constraints": {"committed_hours_per_day": 10}},
            "cognitive_memory": {"observations": [{"text": "Studied algorithms", "category": "learning"}], "goals": ["Master Python"]},
            "generative": {"challenge": "Design an AI workflow", "domain": "career"},
            "multi_agent": {"decision": "Switch to full-time AI research", "options": ["now", "next year"]},
            "predictive": {"metric": "study_hours", "horizon_days": 14},
            "neuromorphic": {"events": [{"timestamp": 1, "type": "spike"}], "time_steps": 5},
        }

        for module_id, data in sample_inputs.items():
            result = await orchestrator.run_single(module_id, data, self.user_id)
            self.assertEqual(result["module"], module_id, f"Failed for {module_id}")
            self.assertIn("result", result)
            self.assertIn("confidence", result)
            self.assertIn("execution_time_ms", result)
            self.assertIsInstance(result["recommendations"], list)
            self.assertIsInstance(result["related_modules"], list)

    async def test_cross_module_orchestration(self):
        result = await orchestrator.run_cross_module(
            module_ids=["world_model", "causal", "predictive"],
            data={"action": "exercise daily", "metric": "steps"},
            user_id=self.user_id,
            problem_type="health_wellness"
        )
        self.assertIn("execution_id", result)
        self.assertEqual(result["problem_type"], "health_wellness")
        self.assertTrue(set(["world_model", "causal", "predictive"]).issubset(set(result["modules_run"])))
        self.assertIn("synthesis", result)
        self.assertIn("total_execution_time_ms", result)
        self.assertGreater(result["confidence"], 0)

    async def test_visualization_generation(self):
        viz = await orchestrator.generate_visualization(
            problem_type="career_change",
            data={"current_state": {"financial_stability": 0.7, "energy": 0.8}, "action": "learn AI"},
            user_id=self.user_id
        )
        self.assertEqual(viz["problem_type"], "career_change")
        self.assertEqual(viz["user_id"], self.user_id)
        self.assertIn("chart_data", viz)
        self.assertIn("module_graph", viz)
        self.assertIn("insights", viz)
        self.assertIn("recommendations", viz)

    async def test_fastapi_endpoints(self):
        from main import health, list_modules, run_module, run_cross_module, visualize_problem

        # 1. Health endpoint
        h_resp = await health()
        self.assertEqual(h_resp.status, "ok")
        self.assertEqual(len(h_resp.modules), 11)

        # 2. List modules endpoint
        mods_resp = await list_modules()
        self.assertEqual(len(mods_resp["modules"]), 11)
        self.assertIn("interconnections", mods_resp)

        # 3. Run single module endpoint
        run_resp = await run_module("generative", ModuleInput(
            module="generative",
            data={"challenge": "test idea", "domain": "career"},
            user_id=self.user_id
        ))
        self.assertEqual(run_resp["module"], "generative")

        # 4. Run cross-module endpoint
        cross_resp = await run_cross_module(CrossModuleQuery(
            module_ids=["generative", "multi_agent"],
            data={"challenge": "scale learning", "decision": "focus on ML"},
            user_id=self.user_id,
            problem_type="learning_goals"
        ))
        self.assertEqual(cross_resp["problem_type"], "learning_goals")
        self.assertIn("synthesis", cross_resp)

        # 5. Visualize problem endpoint
        viz_resp = await visualize_problem(
            problem_type="career_change",
            data={"action": "transition to software engineer"},
            user_id=self.user_id
        )
        self.assertEqual(viz_resp["problem_type"], "career_change")
        self.assertIn("chart_data", viz_resp)

        # 6. Event batch endpoint (dispatched from Cloudflare Queues)
        from main import ingest_event_batch, EventBatchPayload, ContextEvent
        ev_resp = await ingest_event_batch(EventBatchPayload(
            events=[
                ContextEvent(
                    eventId="ev_1",
                    userId=self.user_id,
                    signalType="activity",
                    recordId="rec_1",
                    operation="created",
                    occurredAt="2026-11-07T12:00:00Z"
                ),
                ContextEvent(
                    eventId="ev_2",
                    userId=self.user_id,
                    signalType="decisions",
                    recordId="rec_2",
                    operation="updated",
                    occurredAt="2026-11-07T12:01:00Z"
                )
            ]
        ))
        self.assertEqual(ev_resp.status, "ok")
        self.assertEqual(ev_resp.processed_count, 2)
        self.assertTrue(set(["predictive", "neuromorphic", "multi_agent", "causal"]).issubset(set(ev_resp.triggered_modules)))


if __name__ == "__main__":
    unittest.main()
