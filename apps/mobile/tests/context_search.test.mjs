import assert from 'node:assert/strict';
import { test } from 'node:test';
import { rankObservations } from '../src/contextSearch.ts';
import { moduleDefinitions, relatedModules } from '../../../shared/context.ts';

test('rankObservations ranks observations by cosine similarity correctly', () => {
  const query = [1, 0, 0];
  const embeddings = [
    { observationId: 1, vector: [1, 0, 0] },     // similarity 1.0
    { observationId: 2, vector: [0.7, 0.7, 0] }, // similarity ~0.7
    { observationId: 3, vector: [0, 1, 0] },     // similarity 0.0 (below 0.25 threshold)
  ];
  const observations = [
    { id: 1, category: 'routine', label: 'Morning coding', occurredAt: '2026-11-01' },
    { id: 2, category: 'interest', label: 'Machine learning', occurredAt: '2026-11-02' },
    { id: 3, category: 'preference', label: 'Dark mode', occurredAt: '2026-11-03' },
  ];

  const ranked = rankObservations(query, embeddings, observations, 5);
  assert.equal(ranked.length, 2);
  assert.equal(ranked[0].id, 1);
  assert.equal(ranked[1].id, 2);
});

test('shared module definitions interconnect correctly', () => {
  assert.equal(moduleDefinitions.length, 10);
  const assistant = moduleDefinitions.find((m) => m.id === 'assistant');
  assert.ok(assistant);
  
  const relatedToAssistant = relatedModules(assistant);
  assert.ok(relatedToAssistant.length > 0);
  assert.ok(relatedToAssistant.some((m) => m.id === 'twin'));
});
