"""LIFEOS Python Backend — Heavy Intelligence Modules"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional, Dict, Any

from modules.multimodal import MultimodalModule
from modules.world_model import WorldModelModule
from modules.quantum import QuantumModule
from modules.causal import CausalModule
from modules.neuro_symbolic import NeuroSymbolicModule
from modules.cognitive_memory import CognitiveMemoryModule
from modules.generative import GenerativeModule
from modules.multi_agent import MultiAgentModule
from modules.predictive import PredictiveModule
from modules.neuromorphic import NeuromorphicModule
from modules.multiverse import MultiverseModule
from services.orchestrator import ModuleOrchestrator
from services.cloudflare_ai import get_ai_client

app = FastAPI(title="LIFEOS Intelligence Backend", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

multimodal = MultimodalModule()
world_model = WorldModelModule()
quantum = QuantumModule()
causal = CausalModule()
neuro_symbolic = NeuroSymbolicModule()
cognitive_memory = CognitiveMemoryModule()
generative = GenerativeModule()
multi_agent = MultiAgentModule()
predictive = PredictiveModule()
neuromorphic = NeuromorphicModule()
multiverse = MultiverseModule()

orchestrator = ModuleOrchestrator({
    "multimodal": multimodal,
    "world_model": world_model,
    "quantum": quantum,
    "causal": causal,
    "neuro_symbolic": neuro_symbolic,
    "cognitive_memory": cognitive_memory,
    "generative": generative,
    "multi_agent": multi_agent,
    "predictive": predictive,
    "neuromorphic": neuromorphic,
    "multiverse": multiverse,
})


class ModuleInput(BaseModel):
    module: str
    data: Dict[str, Any]
    user_id: str
    context: Optional[Dict[str, Any]] = None


class ModuleOutput(BaseModel):
    module: str
    result: Dict[str, Any]
    confidence: float
    execution_time_ms: float
    recommendations: List[str] = []
    related_modules: List[str] = []


class CrossModuleQuery(BaseModel):
    module_ids: List[str]
    data: Dict[str, Any]
    user_id: str
    problem_type: str


class CrossModuleOutput(BaseModel):
    execution_id: str
    problem_type: str
    modules_run: List[str]
    results: Dict[str, Any]
    synthesis: Dict[str, Any]
    total_execution_time_ms: float
    recommendations: List[str] = []
    confidence: float


class ContextEvent(BaseModel):
    eventId: str
    userId: str
    signalType: str
    recordId: str
    operation: str
    occurredAt: str


class EventBatchPayload(BaseModel):
    events: List[ContextEvent]


class EventBatchResult(BaseModel):
    status: str
    processed_count: int
    triggered_modules: List[str]


class HealthResponse(BaseModel):
    status: str
    modules: List[str]
    version: str


@app.get("/health", response_model=HealthResponse)
async def health():
    return HealthResponse(
        status="ok",
        modules=list(orchestrator.modules.keys()),
        version="1.0.0",
    )


@app.get("/health/ai")
async def health_ai():
    """Expose Cloudflare Workers AI connectivity so the worker/app can verify the link."""
    client = get_ai_client()
    configured = client.is_configured
    status: Dict[str, Any] = {
        "configured": configured,
        "account_id_present": bool(client.config.account_id),
        "api_token_present": bool(client.config.api_token),
        "default_model": client.config.default_model,
    }
    if configured:
        # Lightweight live probe: generate 1 token from a tiny prompt — but skip
        # the network entirely when the circuit breaker is open (429 quota etc.).
        breaker = client.breakers["text"]
        if not breaker.allow_request():
            status.update({
                "connected": False,
                "probe_model": client.config.default_model,
                "error": f"Circuit breaker open: {breaker.opened_reason or 'recent failures'}",
                "circuit": {name: b.state for name, b in client.breakers.items()},
                "retry_in_seconds": breaker.seconds_until_retry,
            })
            status["status"] = "degraded"
            return status
        probe = await client.generate_text("Reply with the single word: ok", max_tokens=5, temperature=0)
        status.update({
            "connected": not probe.is_fallback,
            "probe_model": probe.model,
            "error": probe.error,
        })
        status["status"] = "ok" if not probe.is_fallback else "degraded"
        status["circuit"] = {name: b.state for name, b in client.breakers.items()}
    else:
        status.update({"connected": False, "status": "not_configured",
                       "error": "Set CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_API_TOKEN secrets on Fly"})
    return status


@app.post("/ai/generate")
async def ai_generate(body: Dict[str, Any]):
    """Direct access to Cloudflare Workers AI text generation for the worker/app."""
    client = get_ai_client()
    response = await client.generate_text(
        prompt=str(body.get("prompt", "")),
        system_prompt=body.get("system_prompt"),
        model=str(body.get("model", client.config.default_model)),
        temperature=float(body.get("temperature", 0.3)),
        max_tokens=int(body.get("max_tokens", 1024)),
    )
    if response.is_fallback and not client.is_configured:
        raise HTTPException(status_code=503, detail="Cloudflare AI not configured on the backend")
    return {
        "content": response.content,
        "model": response.model,
        "is_fallback": response.is_fallback,
        "error": response.error,
    }


@app.get("/modules")
async def list_modules():
    """List all 10 intelligence modules with descriptions and interconnections."""
    return {
        "modules": [
            {
                "id": "multimodal",
                "name": "Multimodal Foundation Intelligence",
                "description": "Understand text, images, audio, video and sensor streams together",
                "status": "ready",
                "problem_areas": ["document_understanding", "scene_analysis", "voice_notes"],
            },
            {
                "id": "world_model",
                "name": "World Model Intelligence",
                "description": "Build an internal representation of how the individual's world works",
                "status": "ready",
                "problem_areas": ["career_change", "relocation", "decision_simulation"],
            },
            {
                "id": "quantum",
                "name": "Quantum Intelligence",
                "description": "Investigate quantum-inspired approaches to uncertainty and probability",
                "status": "experimental",
                "problem_areas": ["ambiguous_decisions", "complex_probability"],
            },
            {
                "id": "causal",
                "name": "Causal Intelligence",
                "description": "Understand why things happen, not merely which things correlate",
                "status": "ready",
                "problem_areas": ["behavior_change", "intervention_design", "root_cause"],
            },
            {
                "id": "neuro_symbolic",
                "name": "Neuro-Symbolic Intelligence",
                "description": "Combine neural pattern recognition with explicit logic and constraints",
                "status": "ready",
                "problem_areas": ["constraint_validation", "rule_based_planning"],
            },
            {
                "id": "cognitive_memory",
                "name": "Cognitive Memory Intelligence",
                "description": "Build persistent, temporal and associative memory across months and years",
                "status": "ready",
                "problem_areas": ["pattern_recognition", "long_term_trends"],
            },
            {
                "id": "generative",
                "name": "Generative Intelligence",
                "description": "Create ideas and possibilities outside conventional patterns",
                "status": "ready",
                "problem_areas": ["creative_solutions", "alternative_scenarios"],
            },
            {
                "id": "multi_agent",
                "name": "Multi-Agent Collective Intelligence",
                "description": "Evaluate decisions through multiple reasoning perspectives",
                "status": "ready",
                "problem_areas": ["complex_decisions", "debate", "planning"],
            },
            {
                "id": "predictive",
                "name": "Predictive Intelligence",
                "description": "Learn temporal patterns and forecast measurable personal trends",
                "status": "ready",
                "problem_areas": ["learning_progress", "resource_consumption", "cash_flow"],
            },
            {
                "id": "multiverse",
                "name": "Multiverse AI",
                "description": "Generate multiple possible futures from one situation",
                "status": "ready",
                "problem_areas": ["decision_simulation", "scenario_planning"],
            },
                {
                "id": "neuromorphic",
                "name": "Neuromorphic Intelligence",
                "description": "Experiment with brain-inspired, event-driven computation",
                "status": "experimental",
                "problem_areas": ["event_driven_patterns", "real_time_sensing"],
            },
        ],
        "interconnections": orchestrator.get_module_graph(),
    }


@app.post("/run/cross-module", response_model=CrossModuleOutput)
async def run_cross_module(query: CrossModuleQuery):
    """Run multiple interconnected modules together for a complex problem."""
    result = await orchestrator.run_cross_module(
        query.module_ids, query.data, query.user_id, query.problem_type
    )
    return result


@app.post("/run/{module_id}")
async def run_module(module_id: str, input: ModuleInput):
    """Run a single intelligence module."""
    if module_id not in orchestrator.modules:
        raise HTTPException(status_code=404, detail=f"Module {module_id} not found")

    result = await orchestrator.run_single(module_id, input.data, input.user_id, input.context)
    return result


@app.post("/visualize/problem/{problem_type}")
async def visualize_problem(problem_type: str, data: Dict[str, Any], user_id: str):
    """Generate visualization data for a specific real-world problem."""
    viz = await orchestrator.generate_visualization(problem_type, data, user_id)
    return viz


@app.post("/events/batch", response_model=EventBatchResult)
async def ingest_event_batch(payload: EventBatchPayload):
    """Event-driven webhook dispatched from Cloudflare Queues."""
    triggered_modules = set()

    for event in payload.events:
        sig = event.signalType
        user_id = event.userId
        ev_data = {
            "event_id": event.eventId,
            "signal_type": sig,
            "record_id": event.recordId,
            "operation": event.operation,
            "occurred_at": event.occurredAt,
        }

        targets = []
        if sig in ["activity", "wellbeing"]:
            targets.extend(["predictive", "neuromorphic"])
        elif sig in ["routines", "preferences", "goals"]:
            targets.extend(["world_model", "cognitive_memory"])
        elif sig in ["decisions"]:
            targets.extend(["multi_agent", "causal"])
        elif sig in ["visual_notes", "documents"]:
            targets.extend(["multimodal"])

        for mod_id in targets:
            if mod_id in orchestrator.modules:
                triggered_modules.add(mod_id)
                await orchestrator.run_single(mod_id, ev_data, user_id)

    return EventBatchResult(
        status="ok",
        processed_count=len(payload.events),
        triggered_modules=list(triggered_modules),
    )


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000)