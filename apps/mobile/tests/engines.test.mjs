import assert from 'node:assert/strict';
import { test } from 'node:test';
import { activitySummary, EngineRegistry, engines } from '../src/engines.ts';

test('registry reports all twelve tracks without implying planned engines exist', async () => {
  const tracks = engines.list();
  assert.equal(tracks.length, 12);
  assert.equal(tracks.filter((track) => track.status === 'available').length, 1);
  await assert.rejects(engines.run('quantum', { goals: [] }), /not available/);
});

test('local activity plugin summarizes only supplied facts', async () => {
  const result = await engines.run('memory', {
    goals: [{ id: 1, title: 'Python', sessionCount: 2 }, { id: 2, title: 'Art', sessionCount: 1 }],
  });
  assert.match(result.summary, /2 goals and 3 recorded study sessions/);
  assert.match(result.limitations[0], /not a prediction/);
  assert.match((await engines.run('memory', { goals: [] })).summary, /Add a goal/);
});

test('duplicate engine registration fails explicitly', () => {
  const registry = new EngineRegistry();
  registry.register(activitySummary);
  assert.throws(() => registry.register(activitySummary), /already registered/);
});
