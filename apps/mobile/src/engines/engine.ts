/**
 * Base engine interface and abstract class.
 * Uses Strategy pattern for interchangeable engine implementations.
 */

import type { Goal } from '../goals';
import type { AnyObject } from '../core/utils/types';
import { Strategy } from '../core/patterns';

/**
 * Engine result interface.
 */
export interface EngineResult {
  summary: string;
  evidence: string[];
  assumptions: string[];
  limitations: string[];
  version: string;
  metadata?: AnyObject;
}

/**
 * Engine input interface.
 */
export interface EngineInput {
  goals: readonly Goal[];
  userId?: string;
  context?: AnyObject;
}

/**
 * Engine identifier type.
 */
export type EngineId =
  | 'multimodal'
  | 'world-model'
  | 'quantum'
  | 'causal'
  | 'neuro-symbolic'
  | 'memory'
  | 'generative'
  | 'multi-agent'
  | 'predictive'
  | 'neuromorphic'
  | 'evolutionary'
  | 'evaluation';

/**
 * Engine status type.
 */
export type EngineStatus = 'available' | 'planned' | 'deprecated' | 'experimental';

/**
 * Engine descriptor interface.
 */
export interface EngineDescriptor {
  id: EngineId;
  name: string;
  description: string;
  version: string;
  status: EngineStatus;
  author?: string;
  license?: string;
  tags?: string[];
}

/**
 * Engine plugin interface.
 * Uses Strategy pattern for interchangeable algorithms.
 */
export interface EnginePlugin extends Strategy<EngineInput, Promise<EngineResult>> {
  readonly id: EngineId;
  readonly name: string;
  readonly version: string;
  readonly description: string;
  readonly status: EngineStatus;

  /**
   * Run the engine with input.
   */
  run(input: EngineInput): Promise<EngineResult>;

  /**
   * Get engine descriptor.
   */
  getDescriptor(): EngineDescriptor;

  /**
   * Check if engine can handle the input.
   */
  canHandle(input: EngineInput): boolean;

  /**
   * Validate input before processing.
   */
  validateInput(input: EngineInput): boolean;

  /**
   * Get engine dependencies.
   */
  getDependencies(): EngineId[];
}

/**
 * Abstract base engine class.
 * Provides common functionality for all engines.
 */
export abstract class BaseEngine implements EnginePlugin {
  abstract readonly id: EngineId;
  abstract readonly name: string;
  abstract readonly version: string;
  abstract readonly description: string;
  abstract readonly status: EngineStatus;

  /**
   * Execute the engine strategy.
   */
  execute(input: EngineInput): Promise<EngineResult> {
    return this.run(input);
  }

  /**
   * Run the engine with input.
   */
  abstract run(input: EngineInput): Promise<EngineResult>;

  /**
   * Get engine descriptor.
   */
  getDescriptor(): EngineDescriptor {
    return {
      id: this.id,
      name: this.name,
      description: this.description,
      version: this.version,
      status: this.status,
    };
  }

  /**
   * Check if engine can handle the input.
   * Default implementation: can handle any input with goals.
   */
  canHandle(input: EngineInput): boolean {
    return Array.isArray(input.goals) && input.goals.length > 0;
  }

  /**
   * Validate input before processing.
   * Default implementation: check for required goals.
   */
  validateInput(input: EngineInput): boolean {
    return Array.isArray(input.goals);
  }

  /**
   * Get engine dependencies.
   * Default implementation: no dependencies.
   */
  getDependencies(): EngineId[] {
    return [];
  }

  /**
   * Create base result with common fields.
   */
  protected createBaseResult(summary: string, version: string = this.version): EngineResult {
    return {
      summary,
      evidence: [],
      assumptions: [],
      limitations: [],
      version,
      metadata: {
        engine: this.id,
        timestamp: new Date().toISOString(),
      },
    };
  }

  /**
   * Add evidence to result.
   */
  protected addEvidence(result: EngineResult, evidence: string | string[]): EngineResult {
    const evidences = Array.isArray(evidence) ? evidence : [evidence];
    return {
      ...result,
      evidence: [...result.evidence, ...evidences],
    };
  }

  /**
   * Add assumption to result.
   */
  protected addAssumption(result: EngineResult, assumption: string | string[]): EngineResult {
    const assumptions = Array.isArray(assumption) ? assumption : [assumption];
    return {
      ...result,
      assumptions: [...result.assumptions, ...assumptions],
    };
  }

  /**
   * Add limitation to result.
   */
  protected addLimitation(result: EngineResult, limitation: string | string[]): EngineResult {
    const limitations = Array.isArray(limitation) ? limitation : [limitation];
    return {
      ...result,
      limitations: [...result.limitations, ...limitations],
    };
  }

  /**
   * Update metadata in result.
   */
  protected updateMetadata(result: EngineResult, metadata: AnyObject): EngineResult {
    return {
      ...result,
      metadata: {
        ...result.metadata,
        ...metadata,
      },
    };
  }
}

/**
 * Null engine for when no real engine is available.
 * Provides a fallback implementation.
 */
export class NullEngine extends BaseEngine {
  readonly id: EngineId = 'evaluation';
  readonly name = 'Null Engine';
  readonly version = '1.0.0';
  readonly description = 'Null engine that provides fallback results';
  readonly status: EngineStatus = 'available';

  async run(input: EngineInput): Promise<EngineResult> {
    const sessionCount = input.goals.reduce((sum, goal) => sum + goal.sessionCount, 0);
    
    return this.createBaseResult(
      input.goals.length === 0
        ? 'Add a goal to start building your personal context.'
        : `You have ${input.goals.length} ${input.goals.length === 1 ? 'goal' : 'goals'} and ${sessionCount} recorded study ${sessionCount === 1 ? 'session' : 'sessions'}.`,
      this.version,
    );
  }

  getDescriptor(): EngineDescriptor {
    return {
      ...super.getDescriptor(),
      tags: ['fallback', 'mock'],
    };
  }
}
