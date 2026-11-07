import type { TwinEmbedding, TwinObservation } from './twin';

export function rankObservations(queryVector: readonly number[], embeddings: readonly TwinEmbedding[], observations: readonly TwinObservation[], limit = 5): TwinObservation[] {
  const vectors = new Map(embeddings.map((embedding) => [embedding.observationId, embedding.vector]));
  return observations.flatMap((observation) => {
    const vector = vectors.get(observation.id);
    if (!vector) return [];
    const score = cosine(queryVector, vector);
    return score >= 0.25 ? [{ observation, score }] : [];
  }).sort((a, b) => b.score - a.score).slice(0, limit).map(({ observation }) => observation);
}

function cosine(a: readonly number[], b: readonly number[]): number {
  if (a.length !== b.length || a.length === 0) return 0;
  let dot = 0; let normA = 0; let normB = 0;
  for (let i = 0; i < a.length; i += 1) { dot += a[i] * b[i]; normA += a[i] ** 2; normB += b[i] ** 2; }
  return normA && normB ? dot / Math.sqrt(normA * normB) : 0;
}
