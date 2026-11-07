export type ObservationCategory = 'routine' | 'interest' | 'preference' | 'behavior';

export interface TwinObservation {
  id: number;
  category: ObservationCategory;
  label: string;
  occurredAt: string;
}

export interface TwinPattern {
  key: string;
  category: ObservationCategory;
  label: string;
  count: number;
  latestAt: string;
}

export interface TwinScenario {
  id: number;
  title: string;
  horizonMonths: number;
  weeklyHoursChange: number;
  monthlyCashflowChange: number;
  createdAt: string;
}

export interface TwinEmbedding {
  observationId: number;
  vector: number[];
}

export function derivePatterns(observations: readonly TwinObservation[]): TwinPattern[] {
  const groups = new Map<string, TwinPattern>();
  for (const observation of observations) {
    const key = `${observation.category}:${observation.label.trim().toLocaleLowerCase()}`;
    const existing = groups.get(key);
    if (existing) {
      existing.count += 1;
      if (observation.occurredAt > existing.latestAt) existing.latestAt = observation.occurredAt;
    } else {
      groups.set(key, { key, category: observation.category, label: observation.label, count: 1, latestAt: observation.occurredAt });
    }
  }
  return [...groups.values()].filter((pattern) => pattern.count > 1).sort((a, b) => b.count - a.count);
}

