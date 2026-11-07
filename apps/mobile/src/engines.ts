import type { Goal } from './goals';

export type EngineId =
  | 'multimodal' | 'world-model' | 'quantum' | 'causal'
  | 'neuro-symbolic' | 'memory' | 'generative' | 'multi-agent'
  | 'predictive' | 'neuromorphic' | 'evolutionary' | 'evaluation';

export interface EngineResult {
  summary: string;
  evidence: string[];
  assumptions: string[];
  limitations: string[];
  version: string;
}

export interface EngineInput {
  goals: readonly Goal[];
}

export interface EnginePlugin {
  readonly id: EngineId;
  readonly name: string;
  readonly version: string;
  run(input: EngineInput): Promise<EngineResult>;
}

export interface EngineDescriptor {
  readonly id: EngineId;
  readonly name: string;
  readonly description: string;
  readonly status: 'available' | 'planned';
}

export const activitySummary: EnginePlugin = {
  id: 'memory',
  name: 'Local activity summary',
  version: '1.0.0',
  async run({ goals }) {
    const sessions = goals.reduce((sum, goal) => sum + goal.sessionCount, 0);
    return {
      summary: goals.length === 0
        ? 'Add a goal to start building your personal context.'
        : `You have ${goals.length} ${goals.length === 1 ? 'goal' : 'goals'} and ${sessions} recorded study ${sessions === 1 ? 'session' : 'sessions'}.`,
      evidence: ['Counts from goals and study sessions stored in your LIFEOS workspace.'],
      assumptions: ['Each check-in represents one study session.'],
      limitations: ['This is a simple count, not a prediction or AI-generated insight.'],
      version: this.version,
    };
  },
};

const descriptors: readonly Omit<EngineDescriptor, 'status'>[] = [
  { id: 'multimodal', name: 'Multimodal intelligence', description: 'Understand approved text, images, and audio.' },
  { id: 'world-model', name: 'World models', description: 'Explore limited state transitions and scenarios.' },
  { id: 'quantum', name: 'Quantum intelligence', description: 'Benchmark simulated quantum experiments.' },
  { id: 'causal', name: 'Causal intelligence', description: 'Study interventions and their assumptions.' },
  { id: 'neuro-symbolic', name: 'Neuro-symbolic AI', description: 'Check suggestions against explicit rules.' },
  { id: 'memory', name: 'Cognitive memory', description: 'Retrieve and manage user-approved context.' },
  { id: 'generative', name: 'Generative intelligence', description: 'Generate ideas and alternative scenarios.' },
  { id: 'multi-agent', name: 'Multi-agent intelligence', description: 'Compare perspectives in bounded workflows.' },
  { id: 'predictive', name: 'Predictive intelligence', description: 'Forecast narrowly defined measurable outcomes.' },
  { id: 'neuromorphic', name: 'Neuromorphic intelligence', description: 'Experiment with event-driven neural models.' },
  { id: 'evolutionary', name: 'Evolutionary intelligence', description: 'Search for better experimental configurations.' },
  { id: 'evaluation', name: 'Self-evaluation', description: 'Measure results against baselines and outcomes.' },
];

export class EngineRegistry {
  private readonly plugins = new Map<EngineId, EnginePlugin>();

  register(plugin: EnginePlugin): void {
    if (this.plugins.has(plugin.id)) {
      throw new Error(`Engine already registered: ${plugin.id}`);
    }
    this.plugins.set(plugin.id, plugin);
  }

  list(): EngineDescriptor[] {
    return descriptors.map((descriptor) => ({
      ...descriptor,
      status: this.plugins.has(descriptor.id) ? 'available' : 'planned',
    }));
  }

  async run(id: EngineId, input: EngineInput): Promise<EngineResult> {
    const plugin = this.plugins.get(id);
    if (!plugin) throw new Error(`Engine is not available: ${id}`);
    return plugin.run(input);
  }
}

export const engines = new EngineRegistry();
engines.register(activitySummary);
