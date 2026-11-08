import type { ModuleId } from '../../shared/context';

const MODEL = '@cf/meta/llama-3.3-70b-instruct-fp8-fast';
const EMBEDDING_MODEL = '@cf/baai/bge-m3';

export interface IntelligenceResponse {
  module: string;
  result: Record<string, unknown>;
  confidence: number;
  execution_time_ms: number;
  recommendations: string[];
  related_modules: string[];
}

export async function runIntelligenceModule(
  moduleId: string,
  data: Record<string, unknown>,
  userId: string,
  env: Env
): Promise<IntelligenceResponse> {
  const pythonUrl = env.PYTHON_BACKEND_URL;
  if (pythonUrl) {
    try {
      const res = await fetch(`${pythonUrl}/run/${moduleId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ module: moduleId, data, user_id: userId })
      });
      if (res.ok) {
        const payload = await res.json() as Record<string, unknown> & {
          result?: Record<string, unknown>;
          confidence?: number;
          execution_time_ms?: number;
          recommendations?: string[];
          suggested_next_modules?: string[];
          related_modules?: string[];
        };
        return {
          module: (payload.module as string) ?? moduleId,
          result: payload.result ?? {},
          confidence: payload.confidence ?? 0.7,
          execution_time_ms: payload.execution_time_ms ?? 0,
          recommendations: payload.recommendations ?? [],
          related_modules: payload.suggested_next_modules ?? payload.related_modules ?? []
        };
      }
    } catch { }
  }
  // Fallback: report honestly that the backend is unavailable.
  const start = Date.now();
  return {
    module: moduleId,
    result: { note: 'backend unavailable' },
    confidence: 0.5,
    execution_time_ms: Date.now() - start,
    recommendations: [],
    related_modules: []
  };
}

export interface ProblemSolutionVisualization {
  problem_id: string;
  problem_title: string;
  core_challenge: string;
  collaborating_modules: string[];
  execution_graph: Array<{ from: string; to: string; relation: string }>;
  confidence: number;
  execution_time_ms: number;
  data_basis: {
    observations: number;
    goals: number;
    scenarios: number;
    activity_days: number;
    learning_goals: number;
    notes: string[];
  };
  synthesis: {
    key_findings: string[];
    trade_offs: string[];
    critical_assumptions: string[];
  };
  charts: {
    state_trajectory?: Array<{ month: number;[metric: string]: number }>;
    causal_discovery?: {
      root_causes: string[];
      confounders: string[];
      interventions: Array<{ action: string; impact: string }>;
    };
    multi_agent_debate?: Array<{ agent: string; role: string; perspective: string; score: number }>;
    predictive_forecast?: Array<{ period: string; baseline: number; projected: number; lower: number; upper: number }>;
    superposition_probabilities?: Array<{ scenario: string; probability: number; phase: number }>;
    constraint_audit?: Array<{ constraint: string; status: 'satisfied' | 'violated' | 'warning'; note: string }>;
  };
  actionable_experiments: Array<{ title: string; duration: string; expected_signal: string; risk: 'low' | 'medium' }>;
}

interface UserFacts {
  goals: Array<{ id: number; title: string; sessionCount: number }>;
  observations: Array<{ category: string; label: string; occurredAt: string }>;
  scenarios: Array<{ id: number; title: string; horizonMonths: number; weeklyHoursChange: number; monthlyCashflowChange: number; createdAt: string }>;
  activity: Array<{ day: string; steps: number }>;
  learningGoals: Array<{ id: string; skill: string; progress: number }>;
}

/** Load the real user data that the analysis is based on. */
async function loadUserFacts(env: Env, userId: string): Promise<UserFacts> {
  const [goals, observations, scenarios, activity, learningGoals] = await Promise.all([
    env.lifeos_data.prepare(`SELECT g.id, g.title, COUNT(s.id) AS sessionCount FROM goals g LEFT JOIN study_sessions s ON s.user_id = g.user_id AND s.goal_id = g.id WHERE g.user_id = ? GROUP BY g.id, g.title ORDER BY g.id DESC`).bind(userId).all<{ id: number; title: string; sessionCount: number }>(),
    env.lifeos_data.prepare('SELECT category, label, occurred_at AS occurredAt FROM twin_observations WHERE user_id = ? ORDER BY occurred_at DESC LIMIT 100').bind(userId).all<{ category: string; label: string; occurredAt: string }>(),
    env.lifeos_data.prepare('SELECT id, title, horizon_months AS horizonMonths, weekly_hours_change AS weeklyHoursChange, monthly_cashflow_change AS monthlyCashflowChange, created_at AS createdAt FROM twin_scenarios WHERE user_id = ? ORDER BY created_at DESC LIMIT 10').bind(userId).all<UserFacts['scenarios'][number]>(),
    env.lifeos_data.prepare('SELECT day, steps FROM daily_activity WHERE user_id = ? ORDER BY day DESC LIMIT 30').bind(userId).all<{ day: string; steps: number }>(),
    env.lifeos_data.prepare('SELECT id, skill, progress FROM learning_goals WHERE user_id = ? ORDER BY created_at DESC LIMIT 20').bind(userId).all<{ id: string; skill: string; progress: number }>(),
  ]);
  return {
    goals: goals.results ?? [],
    observations: observations.results ?? [],
    scenarios: scenarios.results ?? [],
    activity: (activity.results ?? []).reverse(),
    learningGoals: learningGoals.results ?? [],
  };
}

/** Repeated observations, ranked the same way the on-device Twin patterns work. */
function topPatterns(observations: UserFacts['observations'], limit = 3): Array<{ label: string; category: string; count: number }> {
  const groups = new Map<string, { label: string; category: string; count: number }>();
  for (const item of observations) {
    const key = `${item.category}:${item.label.trim().toLocaleLowerCase()}`;
    const existing = groups.get(key);
    if (existing) existing.count += 1;
    else groups.set(key, { label: item.label, category: item.category, count: 1 });
  }
  return [...groups.values()].filter((p) => p.count > 1).sort((a, b) => b.count - a.count).slice(0, limit);
}

/** Least-squares slope over an ordered numeric series (per index). */
function slope(values: number[]): number {
  const n = values.length;
  if (n < 2) return 0;
  const meanX = (n - 1) / 2;
  const meanY = values.reduce((sum, v) => sum + v, 0) / n;
  let num = 0; let den = 0;
  for (let i = 0; i < n; i += 1) { num += (i - meanX) * (values[i] - meanY); den += (i - meanX) ** 2; }
  return den ? num / den : 0;
}

/** Linear step forecast from the real daily-activity series. */
function stepForecast(activity: UserFacts['activity']): ProblemSolutionVisualization['charts']['predictive_forecast'] {
  const values = activity.map((d) => d.steps);
  if (values.length < 4) return undefined;
  const baseline = Math.round(values.reduce((sum, v) => sum + v, 0) / values.length);
  const trend = slope(values);
  const periods: Array<{ period: string; days: number }> = [
    { period: 'Next 3 days', days: 3 },
    { period: 'Days 4-7', days: 7 },
    { period: 'Days 8-14', days: 14 },
  ];
  return periods.map(({ period, days }) => {
    const projected = Math.max(0, Math.round(baseline + trend * days));
    const spread = Math.max(500, Math.round(Math.abs(trend) * days * 0.5 + baseline * 0.1));
    return { period, baseline, projected, lower: Math.max(0, projected - spread), upper: projected + spread };
  });
}

function confidenceFor(facts: UserFacts): number {
  const signals = facts.goals.length + facts.observations.length + facts.scenarios.length + facts.activity.length + facts.learningGoals.length;
  return Math.round(Math.min(0.9, 0.4 + signals * 0.01) * 100) / 100;
}

function dataBasis(facts: UserFacts): ProblemSolutionVisualization['data_basis'] {
  const notes: string[] = [];
  if (facts.observations.length === 0) notes.push('No twin observations recorded yet.');
  if (facts.scenarios.length === 0) notes.push('No saved scenarios yet — cashflow figures need your assumptions.');
  if (facts.activity.length < 7) notes.push(`Only ${facts.activity.length} days of activity data available.`);
  if (notes.length === 0) notes.push('All analyzed figures come from your saved LIFEOS data.');
  return {
    observations: facts.observations.length,
    goals: facts.goals.length,
    scenarios: facts.scenarios.length,
    activity_days: facts.activity.length,
    learning_goals: facts.learningGoals.length,
    notes,
  };
}

/** Ask the Python backend to analyze the real data; returns its synthesis when reachable. */
async function pythonSynthesis(env: Env, userId: string, modules: string[], facts: UserFacts, problemType: string): Promise<string[]> {
  const pythonUrl = env.PYTHON_BACKEND_URL;
  if (!pythonUrl) return [];
  try {
    const res = await fetch(`${pythonUrl}/run/cross-module`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        module_ids: modules,
        data: {
          items: facts.observations.slice(0, 25).map((o) => ({ category: o.category, text: o.label, occurredAt: o.occurredAt })),
          time_series: facts.activity.map((d) => d.steps),
          goals: facts.goals,
          scenarios: facts.scenarios,
          learning_goals: facts.learningGoals,
        },
        user_id: userId,
        problem_type: problemType,
      }),
    });
    if (!res.ok) return [];
    const payload = await res.json() as { synthesis?: { key_insights?: unknown } };
    const insights = payload.synthesis?.key_insights;
    return Array.isArray(insights) ? insights.filter((i): i is string => typeof i === 'string') : [];
  } catch {
    return [];
  }
}

export async function solveRealWorldProblem(
  problemId: string,
  _data: Record<string, unknown>,
  userId: string,
  env: Env
): Promise<ProblemSolutionVisualization> {
  const start = Date.now();
  const facts = await loadUserFacts(env, userId);
  const confidence = confidenceFor(facts);

  switch (problemId) {
    case 'problem_2_behaviour': {
      const patterns = topPatterns(facts.observations);
      const steps = facts.activity.map((d) => d.steps);
      const trend = slope(steps);
      const recent = steps.slice(-7);
      const earlier = steps.slice(-14, -7);
      const recentAvg = recent.length ? Math.round(recent.reduce((s, v) => s + v, 0) / recent.length) : 0;
      const earlierAvg = earlier.length ? Math.round(earlier.reduce((s, v) => s + v, 0) / earlier.length) : 0;
      const remote = await pythonSynthesis(env, userId, ['causal', 'cognitive_memory', 'neuro_symbolic'], facts, 'behavior_change');
      return {
        problem_id: 'problem_2_behaviour',
        problem_title: 'Habit Loops & Rut Breaking',
        core_challenge: 'Identifying root drivers of repeated goal failures and habit drift.',
        collaborating_modules: ['causal', 'cognitive_memory', 'neuro_symbolic', 'neuromorphic'],
        execution_graph: [
          { from: 'cognitive_memory', to: 'causal', relation: 'feeds temporal observation clusters' },
          { from: 'causal', to: 'neuromorphic', relation: 'evaluates event spike density' },
          { from: 'neuro_symbolic', to: 'causal', relation: 'constrains proposed micro-interventions' }
        ],
        confidence,
        execution_time_ms: Date.now() - start,
        data_basis: dataBasis(facts),
        synthesis: {
          key_findings: [
            ...remote,
            patterns.length
              ? `Your most repeated recorded patterns: ${patterns.map((p) => `"${p.label}" ×${p.count}`).join(', ')}.`
              : 'No repeated observation patterns yet — record routines for a few days to enable pattern analysis.',
            earlierAvg > 0
              ? `Steps averaged ${earlierAvg.toLocaleString()} the prior week vs ${recentAvg.toLocaleString()} the last week (${trend >= 0 ? 'up' : 'down'} ${Math.abs(recentAvg - earlierAvg).toLocaleString()}).`
              : 'Not enough activity history for a week-over-week comparison.',
            `${facts.goals.length} goal(s) with ${facts.goals.reduce((sum, g) => sum + g.sessionCount, 0)} recorded study sessions.`,
          ],
          trade_offs: ['Consistency of new routines versus the routines you already repeat most.'],
          critical_assumptions: ['Repeated observations approximate your actual habits; they only cover what you chose to record.'],
        },
        charts: {
          causal_discovery: {
            root_causes: patterns.map((p) => p.label),
            confounders: ['Unrecorded daily stress', 'Sleep timing'],
            interventions: [
              { action: `Attach a study check-in right after "${patterns[0]?.label ?? 'your most common routine'}"`, impact: 'Uses your own repetition as the trigger' },
              { action: 'Log one observation each evening', impact: 'Doubles the data available for pattern detection within a week' },
            ],
          },
        },
        actionable_experiments: [
          { title: '3-day repetition audit', duration: '3 days', expected_signal: `Confirm whether "${patterns[0]?.label ?? 'a repeated routine'}" correlates with goal check-ins`, risk: 'low' },
          { title: 'Evening logging streak', duration: '7 days', expected_signal: 'Enough observations for twin pattern detection', risk: 'low' },
        ],
      };
    }

    case 'problem_3_finance': {
      const totalMonthly = facts.scenarios.reduce((sum, s) => sum + s.monthlyCashflowChange, 0);
      const totalWeeklyHours = facts.scenarios.reduce((sum, s) => sum + s.weeklyHoursChange, 0);
      const horizons = facts.scenarios.map((s) => s.horizonMonths);
      const maxHorizon = horizons.length ? Math.max(...horizons) : 6;
      const remote = await pythonSynthesis(env, userId, ['world_model', 'causal', 'predictive', 'neuro_symbolic'], facts, 'financial_planning');
      const trajectory: NonNullable<ProblemSolutionVisualization['charts']['state_trajectory']> = [];
      let cumulative = 0;
      for (let month = 1; month <= maxHorizon; month += 1) {
        cumulative += totalMonthly;
        trajectory.push({ month, financial: Math.round(cumulative * 100) / 100 });
      }
      return {
        problem_id: 'problem_3_finance',
        problem_title: 'Financial Alignment with Life Objectives',
        core_challenge: 'Simulating how spending, income, education, and career pivots impact runway.',
        collaborating_modules: ['world_model', 'causal', 'predictive', 'neuro_symbolic'],
        execution_graph: [
          { from: 'world_model', to: 'predictive', relation: 'projects cashflow scenarios' },
          { from: 'causal', to: 'neuro_symbolic', relation: 'verifies expense rules' },
          { from: 'predictive', to: 'world_model', relation: 'calculates runway horizon' }
        ],
        confidence,
        execution_time_ms: Date.now() - start,
        data_basis: dataBasis(facts),
        synthesis: {
          key_findings: [
            ...remote,
            facts.scenarios.length
              ? `Across ${facts.scenarios.length} saved scenario(s), combined monthly cashflow change is ${totalMonthly >= 0 ? '+' : ''}${totalMonthly.toLocaleString()} and weekly time change is ${totalWeeklyHours >= 0 ? '+' : ''}${totalWeeklyHours}h.`
              : 'No saved scenarios yet. Create one in Personal Twin to get a cashflow projection.',
            'These are arithmetic sums of your own assumptions, not market forecasts.',
          ],
          trade_offs: ['Time freed or spent per week versus the cashflow change you assumed.'],
          critical_assumptions: ['Scenario figures are user-supplied estimates and hold constant over the horizon.'],
        },
        charts: {
          state_trajectory: facts.scenarios.length ? trajectory : undefined,
          constraint_audit: facts.scenarios.map((s) => ({
            constraint: `Scenario "${s.title}" (${s.horizonMonths} months)`,
            status: s.monthlyCashflowChange >= 0 ? ('satisfied' as const) : ('warning' as const),
            note: `Assumes ${s.monthlyCashflowChange >= 0 ? '+' : ''}${s.monthlyCashflowChange.toLocaleString()}/month and ${s.weeklyHoursChange >= 0 ? '+' : ''}${s.weeklyHoursChange}h/week`,
          })),
        },
        actionable_experiments: [
          { title: 'Track one month of actuals against your scenario', duration: '30 days', expected_signal: 'Compare real cashflow delta with the assumed figure', risk: 'low' },
          { title: 'Re-run this analysis after each scenario update', duration: '5 minutes', expected_signal: 'Projection tracks your latest assumptions', risk: 'low' },
        ],
      };
    }

    case 'problem_4_health': {
      const forecast = stepForecast(facts.activity);
      const values = facts.activity.map((d) => d.steps);
      const avg = values.length ? Math.round(values.reduce((s, v) => s + v, 0) / values.length) : 0;
      const best = values.length ? Math.max(...values) : 0;
      const trend = slope(values);
      const remote = await pythonSynthesis(env, userId, ['cognitive_memory', 'predictive', 'multimodal'], facts, 'health_wellness');
      return {
        problem_id: 'problem_4_health',
        problem_title: 'Unified Biological & Wellness Timeline',
        core_challenge: 'Synthesizing wearables, step trends, sleep, and physical symptoms.',
        collaborating_modules: ['multimodal', 'cognitive_memory', 'predictive', 'neuromorphic'],
        execution_graph: [
          { from: 'neuromorphic', to: 'predictive', relation: 'streams spiking activity events' },
          { from: 'cognitive_memory', to: 'multimodal', relation: 'associates visual captures with symptoms' },
          { from: 'predictive', to: 'multimodal', relation: 'forecasts physiological recovery' }
        ],
        confidence,
        execution_time_ms: Date.now() - start,
        data_basis: dataBasis(facts),
        synthesis: {
          key_findings: [
            ...remote,
            values.length
              ? `Your ${values.length}-day step average is ${avg.toLocaleString()} (best day ${best.toLocaleString()}), trending ${trend >= 0 ? 'up' : 'down'} about ${Math.abs(Math.round(trend)).toLocaleString()} steps/day.`
              : 'No synced activity yet — read steps from your iPhone in Health to enable this analysis.',
          ],
          trade_offs: ['Step count is the only synced health signal; sleep and symptoms are not measured here.'],
          critical_assumptions: ['The linear trend over available days continues; short series make this unstable.'],
        },
        charts: { predictive_forecast: forecast },
        actionable_experiments: [
          { title: 'Sync 7 days of steps, then re-run', duration: '7 days', expected_signal: 'Forecast replaces "insufficient data" with a real projection', risk: 'low' },
          { title: 'Add one deliberate walk on your lowest step day', duration: '1 week', expected_signal: 'Compare next-week average with the trend line', risk: 'low' },
        ],
      };
    }

    case 'problem_5_learning': {
      const progressValues = facts.learningGoals.map((g) => g.progress);
      const avgProgress = progressValues.length ? Math.round((progressValues.reduce((s, v) => s + v, 0) / progressValues.length) * 100) : 0;
      const sessions = facts.goals.reduce((sum, g) => sum + g.sessionCount, 0);
      const stalled = facts.learningGoals.filter((g) => g.progress < 0.25).map((g) => g.skill);
      const remote = await pythonSynthesis(env, userId, ['world_model', 'generative', 'predictive'], facts, 'learning_goals');
      return {
        problem_id: 'problem_5_learning',
        problem_title: 'Personalized Objective-Driven Learning',
        core_challenge: 'Mapping skill gaps and pruning non-essential courses for maximum leverage.',
        collaborating_modules: ['world_model', 'causal', 'generative', 'predictive'],
        execution_graph: [
          { from: 'causal', to: 'world_model', relation: 'identifies highest-leverage skill gaps' },
          { from: 'generative', to: 'predictive', relation: 'synthesizes project-based curriculum' },
          { from: 'predictive', to: 'world_model', relation: 'forecasts mastery timeline' }
        ],
        confidence,
        execution_time_ms: Date.now() - start,
        data_basis: dataBasis(facts),
        synthesis: {
          key_findings: [
            ...remote,
            facts.learningGoals.length
              ? `${facts.learningGoals.length} learning goal(s) at ${avgProgress}% average progress; ${stalled.length} below 25%.`
              : 'No learning goals recorded yet. Add one in the Learning screen.',
            `${facts.goals.length} study goal(s) with ${sessions} recorded session(s).`,
          ],
          trade_offs: ['Breadth (many goals) versus depth (fewer goals pushed to 100%).'],
          critical_assumptions: ['Progress percentages are user-entered, not assessed.'],
        },
        charts: {
          state_trajectory: facts.learningGoals.map((g, index) => ({ month: index + 1, learning: Math.round(g.progress * 100) / 100 })),
        },
        actionable_experiments: [
          stalled.length
            ? { title: `Focus week on "${stalled[0]}"`, duration: '7 days', expected_signal: 'Progress moves above 25%', risk: 'low' }
            : { title: 'Log study sessions against your goals', duration: '7 days', expected_signal: 'Session counts reveal real momentum', risk: 'low' },
          { title: 'Re-check gaps after each check-in', duration: '2 minutes', expected_signal: 'Gap detection uses your latest progress', risk: 'low' },
        ],
      };
    }

    case 'problem_6_constraints': {
      const audits: NonNullable<ProblemSolutionVisualization['charts']['constraint_audit']> = facts.scenarios.map((s) => ({
        constraint: `Time: "${s.title}" within ${s.horizonMonths} months`,
        status: Math.abs(s.weeklyHoursChange) <= 20 ? ('satisfied' as const) : ('warning' as const),
        note: `Assumes ${s.weeklyHoursChange >= 0 ? '+' : ''}${s.weeklyHoursChange}h/week`,
      }));
      audits.push({
        constraint: 'Recording coverage',
        status: facts.observations.length >= 10 ? ('satisfied' as const) : ('warning' as const),
        note: `${facts.observations.length} observations recorded; 10+ gives usable constraint context`,
      });
      const remote = await pythonSynthesis(env, userId, ['neuro_symbolic', 'multi_agent', 'world_model'], facts, 'ambiguous_decision');
      return {
        problem_id: 'problem_6_constraints',
        problem_title: 'Multi-Constraint Everyday Dependencies',
        core_challenge: 'Resolving hidden trade-offs across time, transport, family, energy, and money.',
        collaborating_modules: ['neuro_symbolic', 'quantum', 'multi_agent', 'world_model'],
        execution_graph: [
          { from: 'neuro_symbolic', to: 'quantum', relation: 'filters impossible constraint sets' },
          { from: 'quantum', to: 'multi_agent', relation: 'evaluates superposition amplitudes' },
          { from: 'multi_agent', to: 'world_model', relation: 'reaches Pareto-optimal compromise' }
        ],
        confidence,
        execution_time_ms: Date.now() - start,
        data_basis: dataBasis(facts),
        synthesis: {
          key_findings: [
            ...remote,
            'Each check below is evaluated directly against your saved scenarios and observation volume.',
          ],
          trade_offs: ['Weekly hours assumed in scenarios versus the observation record that supports them.'],
          critical_assumptions: ['Only constraints expressible from scenarios and observation counts are audited.'],
        },
        charts: {
          constraint_audit: audits,
          superposition_probabilities: facts.scenarios.length
            ? (() => {
              const weights = facts.scenarios.map((s) => Math.max(0, s.horizonMonths * (1 + Math.abs(s.weeklyHoursChange) / 20)));
              const total = weights.reduce((sum, w) => sum + w, 0) || 1;
              return facts.scenarios.map((s, i) => ({ scenario: s.title, probability: Math.round((weights[i] / total) * 100) / 100, phase: i + 1 }));
            })()
            : undefined,
        },
        actionable_experiments: [
          { title: 'Record constraints as preferences/behaviors in Twin', duration: '5 days', expected_signal: 'Constraint audit gains real categories to check', risk: 'low' },
          { title: 'Save a scenario per candidate schedule', duration: '1 day', expected_signal: 'Side-by-side audit of each option', risk: 'low' },
        ],
      };
    }

    case 'problem_1_decisions':
    default: {
      const totalMonthly = facts.scenarios.reduce((sum, s) => sum + s.monthlyCashflowChange, 0);
      const forecast = stepForecast(facts.activity);
      const patterns = topPatterns(facts.observations, 2);
      const remote = await pythonSynthesis(env, userId, ['world_model', 'causal', 'multi_agent', 'predictive'], facts, 'ambiguous_decision');
      return {
        problem_id: 'problem_1_decisions',
        problem_title: 'Decisions Under High Uncertainty',
        core_challenge: 'Navigating career transitions, relocation, education, and major investments.',
        collaborating_modules: ['world_model', 'causal', 'multi_agent', 'predictive'],
        execution_graph: [
          { from: 'world_model', to: 'causal', relation: 'projects latent state scenarios' },
          { from: 'causal', to: 'predictive', relation: 'isolates intervention variables' },
          { from: 'multi_agent', to: 'world_model', relation: 'debates risk vs reward profile' }
        ],
        confidence,
        execution_time_ms: Date.now() - start,
        data_basis: dataBasis(facts),
        synthesis: {
          key_findings: [
            ...remote,
            facts.scenarios.length
              ? `Your saved scenarios assume a combined ${totalMonthly >= 0 ? '+' : ''}${totalMonthly.toLocaleString()}/month cashflow change over up to ${Math.max(...facts.scenarios.map((s) => s.horizonMonths))} months.`
              : 'No scenarios saved — the decision analysis has no cashflow assumptions to work from.',
            patterns.length
              ? `Recurring patterns in your record: ${patterns.map((p) => `"${p.label}" ×${p.count}`).join(', ')}.`
              : 'No repeated patterns recorded yet.',
            `${facts.goals.length} goal(s), ${facts.goals.reduce((sum, g) => sum + g.sessionCount, 0)} study sessions, ${facts.observations.length} observations form the evidence base.`,
          ],
          trade_offs: ['Committing to a scenario now versus waiting for more recorded evidence.'],
          critical_assumptions: ['Your recorded observations and scenario numbers represent the decision context faithfully.'],
        },
        charts: {
          predictive_forecast: forecast,
          multi_agent_debate: [
            { agent: 'Evidence', role: 'Data', perspective: `${facts.observations.length} observations and ${facts.activity.length} activity days back this analysis.`, score: confidence },
            { agent: 'Assumption', role: 'Risk', perspective: facts.scenarios.length ? `Cashflow conclusions rest entirely on your ${facts.scenarios.length} scenario assumption(s).` : 'No scenario assumptions exist; treat all cashflow talk as ungrounded.', score: facts.scenarios.length ? 0.7 : 0.4 },
            { agent: 'Momentum', role: 'Execution', perspective: `${facts.goals.reduce((sum, g) => sum + g.sessionCount, 0)} study sessions recorded so far.`, score: Math.min(0.9, 0.3 + facts.goals.reduce((sum, g) => sum + g.sessionCount, 0) * 0.02) },
          ],
        },
        actionable_experiments: [
          { title: 'Save a scenario for each option you are weighing', duration: '1 day', expected_signal: 'The decision view compares real assumptions instead of blanks', risk: 'low' },
          { title: 'One week of observation logging before deciding', duration: '7 days', expected_signal: 'Pattern detection has data to ground the recommendation', risk: 'low' },
        ],
      };
    }
  }
}

// ─── 360° overview: every data domain feeds its engines, then one synthesis ───

export interface DomainInsight {
  domain: string;
  label: string;
  engines: string[];
  count: number;
  insights: string[];
  confidence: number;
  execution_time_ms: number;
}

export interface OverviewResponse {
  generatedAt: string;
  domains: DomainInsight[];
  cross_insights: string[];
  recommendations: string[];
  confidence: number;
  total_execution_time_ms: number;
  data_gaps: string[];
}

/** Domain → engines that consume its signals (aligned with MODULE_GRAPH interconnections). */
const DOMAIN_ENGINES: Record<string, string[]> = {
  activity: ['predictive', 'world_model', 'neuromorphic'],
  nutrition: ['multimodal', 'cognitive_memory', 'world_model'],
  learning: ['world_model', 'causal', 'generative', 'predictive'],
  routines: ['causal', 'cognitive_memory', 'neuro_symbolic', 'multi_agent'],
  environment: ['neuromorphic', 'world_model', 'multi_agent'],
  goals: ['world_model', 'quantum', 'causal', 'multi_agent'],
};

const DOMAIN_LABELS: Record<string, string> = {
  activity: 'Activity & movement',
  nutrition: 'Nutrition',
  learning: 'Learning',
  routines: 'Routines & patterns',
  environment: 'Environment',
  goals: 'Goals & direction',
};

/** Load every stored domain for this user and map raw rows into engine-friendly shape. */
export async function loadAllDomains(env: Env, userId: string): Promise<Record<string, { count: number; data: Record<string, unknown> }>> {
  const [activity, meals, learning, observations, weather, goals] = await Promise.all([
    env.lifeos_data.prepare('SELECT day, steps FROM daily_activity WHERE user_id = ? ORDER BY day ASC LIMIT 30').bind(userId).all<{ day: string; steps: number }>().catch(() => ({ results: [] as { day: string; steps: number }[] })),
    env.lifeos_data.prepare('SELECT description, calories, protein_g, carbs_g, fat_g, created_at FROM meals WHERE user_id = ? ORDER BY created_at DESC LIMIT 14').bind(userId).all<Record<string, unknown>>().catch(() => ({ results: [] as Record<string, unknown>[] })),
    env.lifeos_data.prepare('SELECT skill, progress FROM learning_goals WHERE user_id = ? ORDER BY created_at DESC LIMIT 20').bind(userId).all<Record<string, unknown>>().catch(() => ({ results: [] as Record<string, unknown>[] })),
    env.lifeos_data.prepare('SELECT category, label, occurred_at AS occurredAt FROM twin_observations WHERE user_id = ? ORDER BY occurred_at DESC LIMIT 100').bind(userId).all<Record<string, unknown>>().catch(() => ({ results: [] as Record<string, unknown>[] })),
    env.lifeos_data.prepare('SELECT weather_json FROM weather_cache WHERE user_id = ?').bind(userId).first<{ weather_json: string }>().catch(() => null),
    env.lifeos_data.prepare('SELECT title FROM goals WHERE user_id = ? ORDER BY id DESC LIMIT 20').bind(userId).all<Record<string, unknown>>().catch(() => ({ results: [] as Record<string, unknown>[] })),
  ]);
  const routines = (observations.results ?? []).filter((o) => o.category === 'routine' || o.category === 'behavior');
  const preferences = (observations.results ?? []).filter((o) => o.category === 'preference' || o.category === 'interest');
  return {
    activity: { count: (activity.results ?? []).length, data: { time_series: (activity.results ?? []) } },
    nutrition: { count: (meals.results ?? []).length, data: { meals: (meals.results ?? []).slice(0, 10) } },
    learning: { count: (learning.results ?? []).length, data: { goals: (learning.results ?? []) } },
    routines: { count: routines.length + preferences.length, data: { observations: [...routines, ...preferences].slice(0, 25) } },
    environment: { count: weather ? 1 : 0, data: { weather: weather ? JSON.parse(weather.weather_json) : null } },
    goals: { count: (goals.results ?? []).length, data: { goals: (goals.results ?? []) } },
  };
}

/**
 * Run the full 360° pass: each domain's data goes to the engines wired for it,
 * engines enrich each other through the orchestrator graph, then one model
 * synthesizes cross-domain insights from all engine outputs.
 */
export async function buildOverview(env: Env, userId: string): Promise<OverviewResponse> {
  const start = Date.now();
  const pythonUrl = env.PYTHON_BACKEND_URL;
  const domains = await loadAllDomains(env, userId);
  const dataGaps = Object.entries(domains).filter(([, d]) => d.count === 0).map(([key]) => key);

  const domainInsights: DomainInsight[] = [];
  for (const [domain, bundle] of Object.entries(domains)) {
    const engines = DOMAIN_ENGINES[domain] ?? ['world_model'];
    const label = DOMAIN_LABELS[domain] ?? domain;
    if (bundle.count === 0) { domainInsights.push({ domain, label, engines, count: 0, insights: [], confidence: 0, execution_time_ms: 0 }); continue; }
    let insights: string[] = [];
    let confidence = 0.5;
    let elapsed = 0;
    if (pythonUrl) {
      try {
        const res = await fetch(`${pythonUrl}/run/cross-module`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ module_ids: engines.slice(0, 3), data: { trigger: 'overview', domain, ...bundle.data }, user_id: userId, problem_type: 'behavior_change' }),
          signal: AbortSignal.timeout(45_000),
        });
        if (res.ok) {
          const payload = await res.json() as { synthesis?: { key_insights?: unknown; confidence?: unknown }; total_execution_time_ms?: unknown };
          const lines = payload.synthesis?.key_insights;
          if (Array.isArray(lines)) insights = lines.filter((line): line is string => typeof line === 'string' && line.trim().length > 0).slice(0, 3);
          if (typeof payload.synthesis?.confidence === 'number') confidence = payload.synthesis.confidence;
          if (typeof payload.total_execution_time_ms === 'number') elapsed = payload.total_execution_time_ms;
        }
      } catch { /* fall through to empty insights for this domain */ }
    }
    domainInsights.push({ domain, label, engines, count: bundle.count, insights, confidence, execution_time_ms: Math.round(elapsed) });
  }

  // Cross-domain synthesis: give one model the full engine output set.
  const populated = domainInsights.filter((d) => d.insights.length > 0);
  let crossInsights: string[] = [];
  let recommendations: string[] = [];
  let confidence = populated.length > 0 ? 0.55 : 0.3;
  if (populated.length > 0) {
    const summary = populated.map((d) => `${d.label} (${d.engines.slice(0, 2).join(', ')}): ${d.insights.join(' | ')}`).join('\n');
    try {
      const result = await env.AI.run(MODEL, {
        messages: [
          { role: 'system', content: 'You are LIFEOS 360, an integrator. You receive per-domain findings from separate engines (activity, nutrition, learning, routines, environment, goals). Produce exactly 4 cross-domain insights that connect at least two domains each — e.g. how low steps on high-calorie days affect a learning goal. Only combine what the findings actually state; do not invent data. Then 3 concrete recommendations. Keep every line under 25 words.' },
          { role: 'user', content: summary },
        ],
        max_tokens: 512,
      }) as { choices?: Array<{ message?: { content?: unknown } }> };
      const reply = result.choices?.[0]?.message?.content;
      if (typeof reply === 'string') {
        const lines = reply.split('\n').map((line) => line.replace(/^[\s\-*\d.)]+/, '').trim()).filter((line) => line.length > 10);
        crossInsights = lines.slice(0, 4);
        recommendations = lines.slice(4, 7);
        confidence = 0.7;
      }
    } catch { /* leave empty — per-domain insights still returned */ }
  }

  return {
    generatedAt: new Date().toISOString(),
    domains: domainInsights,
    cross_insights: crossInsights,
    recommendations,
    confidence,
    total_execution_time_ms: Date.now() - start,
    data_gaps: dataGaps,
  };
}
