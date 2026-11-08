/**
 * intelligenceApi.ts — typed client for the LIFEOS Python intelligence backend.
 * All calls go through the Cloudflare Worker (auth + proxy) to the Fly-hosted
 * FastAPI engine: /health, /modules, /run/{id}, /run/cross-module, /ai/generate.
 */

import { apiFetch } from './api';

// ─── Shared types ─────────────────────────────────────────────────────────────

export interface ModuleRunResult {
  module: string;
  result: Record<string, any>;
  confidence: number;
  execution_time_ms: number;
  recommendations: string[];
  related_modules?: string[];
}

export interface Synthesis {
  key_insights: string[];
  recommendations: string[];
  confidence: number;
  problem_type?: string;
  modules_consulted?: string[];
}

export interface CrossModuleResult {
  execution_id: string;
  problem_type: string;
  modules_run: string[];
  results: Record<string, ModuleRunResult>;
  synthesis: Synthesis;
  total_execution_time_ms: number;
  recommendations: string[];
  confidence: number;
}

export interface AiHealth {
  status: 'ok' | 'degraded' | 'not_configured';
  configured: boolean;
  connected: boolean;
  default_model?: string;
  probe_model?: string | null;
  error?: string | null;
}

export interface BackendModuleInfo {
  id: string;
  name: string;
  description: string;
  status: string;
  problem_areas: string[];
}

/** 360° overview: every domain runs through its engines, then one cross-domain synthesis. */
export interface DomainInsight {
  domain: string;
  label: string;
  engines: string[];
  count: number;
  insights: string[];
  confidence: number;
  execution_time_ms: number;
}

export interface OverviewResult {
  generatedAt: string;
  domains: DomainInsight[];
  cross_insights: string[];
  recommendations: string[];
  confidence: number;
  total_execution_time_ms: number;
  data_gaps: string[];
}

export function getOverview(): Promise<OverviewResult> {
  return apiFetch<OverviewResult>('/intelligence/overview', { method: 'POST', body: JSON.stringify({}) });
}

export interface VisualizationResult {
  problem_type: string;
  chart_data: Record<string, { type: string; data: unknown }>;
  module_graph: unknown;
  insights: string[];
  recommendations: string[];
  confidence: number;
  execution_id: string;
}

// ─── Endpoints ────────────────────────────────────────────────────────────────

/** Check backend + Cloudflare AI link (through worker proxy → Fly /health/ai). */
export function getAiHealth(): Promise<AiHealth> {
  return apiFetch<AiHealth>('/intelligence/health/ai');
}

/** List the intelligence engines the Python backend exposes (GET /modules). */
export function listBackendModules(): Promise<{ modules: BackendModuleInfo[]; interconnections: Record<string, string[]> }> {
  return apiFetch('/intelligence/modules');
}

/** Run one intelligence engine against your workspace context (POST /run/{id}). */
export function runEngine(moduleId: string, data: Record<string, any>): Promise<ModuleRunResult> {
  return apiFetch<ModuleRunResult>(`/intelligence/run/${encodeURIComponent(moduleId)}`, {
    method: 'POST',
    body: JSON.stringify({ module: moduleId, data, user_id: 'mobile_user' }),
  });
}

/** Run several engines together for one problem (POST /run/cross-module). */
export function runCrossModule(
  moduleIds: string[],
  data: Record<string, any>,
  problemType: string,
): Promise<CrossModuleResult> {
  return apiFetch<CrossModuleResult>('/intelligence/run/cross-module', {
    method: 'POST',
    body: JSON.stringify({ module_ids: moduleIds, data, user_id: 'mobile_user', problem_type: problemType }),
  });
}

/** Problem-type visualization bundle (POST /visualize/problem/{type}). */
export function getVisualization(problemType: string, data: Record<string, any>): Promise<VisualizationResult> {
  return apiFetch(`/intelligence/visualize/${encodeURIComponent(problemType)}`, {
    method: 'POST',
    body: JSON.stringify({ data, user_id: 'mobile_user' }),
  });
}

/** Ask the backend's Cloudflare model directly (POST /ai/generate). */
export function generateAiText(params: {
  prompt: string;
  system_prompt?: string;
  model?: string;
  temperature?: number;
  max_tokens?: number;
}): Promise<{ content: string; model: string; is_fallback: boolean; error: string | null }> {
  return apiFetch('/intelligence/ai/generate', {
    method: 'POST',
    body: JSON.stringify(params),
  });
}

// ─── Workspace context builder ───────────────────────────────────────────────

export interface WorkspaceContextInput {
  goals: { title: string; sessionCount?: number }[];
  observations: { category: string; label: string; occurredAt: string }[];
  scenarios: { title: string; horizonMonths: number; weeklyHoursChange: number; monthlyCashflowChange: number }[];
  activityDays: { day: string; steps: number }[];
}

/** Build the standard payload every engine understands. */
export function buildEnginePayload(ctx: WorkspaceContextInput, overrides: Record<string, any> = {}): Record<string, any> {
  const topGoal = ctx.goals[0]?.title ?? 'Continuous learning and daily wellness';
  const topScenario = ctx.scenarios[0]?.title ?? 'Career and personal trajectory planning';
  return {
    trigger: 'mobile',
    timestamp: new Date().toISOString(),
    goals: ctx.goals.map((g) => g.title),
    observations: ctx.observations.map((o) => ({ category: o.category, text: o.label, occurred_at: o.occurredAt })),
    scenarios: ctx.scenarios.map((s) => ({ title: s.title, horizon_months: s.horizonMonths })),
    time_series: ctx.activityDays.map((d) => ({ date: d.day, value: d.steps })),
    situation: topScenario,
    decision: topScenario,
    options: ctx.scenarios.length > 0 ? ctx.scenarios.map((s) => s.title) : [topGoal, 'Optimize daily habit consistency'],
    action: topGoal,
    metric: 'steps',
    horizon_months: 6,
    simulations: 200,
    context: topScenario,
    ...overrides,
  };
}

/** Extract human-readable insight lines from any engine result payload. */
export function extractInsights(result: Record<string, any>): string[] {
  const lines: string[] = [];
  const r = result ?? {};
  for (const key of ['ai_analysis', 'analysis', 'world_model_analysis', 'ai_forecast_analysis', 'summary']) {
    if (typeof r[key] === 'string' && r[key]) lines.push(r[key]);
  }
  if (r.best_future && typeof r.best_future.summary === 'string') lines.push(`Optimal trajectory: ${r.best_future.summary}`);
  if (r.collapsed_decision && typeof r.collapsed_decision.recommended === 'string') {
    lines.push(`Recommended after analysis: ${r.collapsed_decision.recommended}`);
  }
  if (Array.isArray(r.patterns) && r.patterns.length > 0) lines.push(`Detected ${r.patterns.length} pattern(s) in your signals.`);
  if (Array.isArray(r.ideas) && r.ideas.length > 0) lines.push(`Generated ${r.ideas.length} new idea(s).`);
  if (Array.isArray(r.forecast) && r.forecast.length > 0) lines.push(`Forecast covers ${r.forecast.length} period(s).`);
  return lines;
}
