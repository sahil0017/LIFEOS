import { useEffect, useState } from 'react';
import { AppState, Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { Pedometer } from 'expo-sensors';
import { useCameraPermissions } from 'expo-camera';
import type { Goal } from './goals';
import type { EngineResult } from './engines';
import { engines } from './engines';
import { derivePatterns } from './twin';
import type { ObservationCategory, TwinEmbedding, TwinObservation, TwinPattern, TwinScenario } from './twin';
import type { VisionCapture } from './vision';
import type { PrivacyPreferences } from './privacy';
import { permissionDbKey } from './privacy';
import { rankObservations } from './contextSearch';
import { apiFetch, deleteCaptureRemote, deleteObservationRemote, deleteScenarioRemote, isApiConfigured, loadDeviceActivity, saveDeviceActivity, deleteDeviceActivity, loadSnapshot, saveCaptureAnswerRemote, saveCaptureRemote, saveEmbeddingRemote, saveObservation, savePrivacyRemote, saveScenario } from './api';
import type { DailyActivity } from './api';
import { runEngine, runCrossModule, buildEnginePayload, extractInsights, getAiHealth, type AiHealth, type ModuleRunResult, type CrossModuleResult } from './intelligenceApi';
import type { ChatMessage } from './screens/types';

export type Screen = 'Home' | 'Assistant' | 'Modules' | 'PersonalTwin' | 'VisualIntelligence' | 'Privacy' | 'HelpSearch' | 'Health' | 'Food' | 'Environment' | 'Accessibility' | 'Learning' | 'Voice' | 'Pedometer' | 'Files' | 'Overview';

/** All shared app state and the operations that mutate it. */
export function useLifeOs() {
  const [screen, setScreen] = useState<Screen>('Home');
  const [goals, setGoals] = useState<Goal[]>([]);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<EngineResult | null>(null);
  const [engineError, setEngineError] = useState<string | null>(null);
  const [chatInput, setChatInput] = useState('');
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatBusy, setChatBusy] = useState(false);
  const [chatError, setChatError] = useState<string | null>(null);
  const [helpQuery, setHelpQuery] = useState('');
  const [helpResults, setHelpResults] = useState<SearchChunk[]>([]);
  const [helpBusy, setHelpBusy] = useState(false);
  const [helpError, setHelpError] = useState<string | null>(null);
  const [privacy, setPrivacy] = useState<PrivacyPreferences>({ assistantAi: false, assistantContext: false, twinAi: false, visualAi: false, healthActivity: false });
  const [observations, setObservations] = useState<TwinObservation[]>([]);
  const [patterns, setPatterns] = useState<TwinPattern[]>([]);
  const [scenarios, setScenarios] = useState<TwinScenario[]>([]);
  const [embeddings, setEmbeddings] = useState<TwinEmbedding[]>([]);
  const [twinInsight, setTwinInsight] = useState<string | null>(null);
  const [twinBusy, setTwinBusy] = useState(false);
  const [twinError, setTwinError] = useState<string | null>(null);
  const [visualAnswer, setVisualAnswer] = useState<string | null>(null);
  const [visualBusy, setVisualBusy] = useState(false);
  const [visualError, setVisualError] = useState<string | null>(null);
  const [visionCaptures, setVisionCaptures] = useState<VisionCapture[]>([]);
  const [activityDays, setActivityDays] = useState<DailyActivity[]>([]);
  const [deviceStepsToday, setDeviceStepsToday] = useState<number | null>(null);
  const [activityBusy, setActivityBusy] = useState(false);
  const [activityError, setActivityError] = useState<string | null>(null);
  const [autoUpdate, setAutoUpdate] = useState<{ title: string; body: string; at: string } | null>(null);
  const [autoSyncing, setAutoSyncing] = useState(false);
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const [aiHealth, setAiHealth] = useState<AiHealth | null>(null);
  const [engineRun, setEngineRun] = useState<{ busy: boolean; error: string | null; result: ModuleRunResult | null; cross: CrossModuleResult | null }>({ busy: false, error: null, result: null, cross: null });

  useEffect(() => {
    let active = true;
    async function open() {
      try {
        const snapshot = await loadSnapshot();
        if (active) {
          setGoals(snapshot.goals); setObservations(snapshot.observations); setPatterns(derivePatterns(snapshot.observations));
          setScenarios(snapshot.scenarios); setEmbeddings(snapshot.embeddings); setVisionCaptures(snapshot.captures); setPrivacy(snapshot.privacy);
        }
      } catch (cause) { if (active) setError(cause instanceof Error ? cause.message : 'Could not load your LIFEOS data. Check the connection and try again.'); }
      finally { if (active) setBusy(false); }
    }
    void open(); return () => { active = false; };
  }, []);

  useEffect(() => {
    let active = true;
    if (!privacy.healthActivity) { return () => { active = false; }; }
    void loadDeviceActivity().then((result) => { if (active) setActivityDays(result.days); }).catch((cause) => { if (active) setActivityError(cause instanceof Error ? cause.message : 'Could not load activity.'); });
    return () => { active = false; };
  }, [privacy.healthActivity]);

  // Read today's steps straight from the device so Home reflects reality without a manual sync.
  // Re-runs when consent changes and whenever the app returns to the foreground.
  useEffect(() => {
    let active = true;
    async function readToday() {
      if (!privacy.healthActivity) { if (active) setDeviceStepsToday(null); return; }
      try {
        if (Platform.OS !== 'ios') return;
        if (!await Pedometer.isAvailableAsync()) return;
        // Ask (not just check) so a first-time user gets the permission dialog.
        const permission = await Pedometer.requestPermissionsAsync();
        if (!permission.granted) return;
        const start = new Date(); start.setHours(0, 0, 0, 0);
        const result = await Pedometer.getStepCountAsync(start, new Date());
        if (active) setDeviceStepsToday(result.steps);
      } catch { /* Home falls back to synced activity data. */ }
    }
    const timer = setTimeout(() => { void readToday(); }, 0);
    const subscription = AppState.addEventListener('change', (state) => { if (state === 'active') void readToday(); });
    return () => { active = false; clearTimeout(timer); subscription.remove(); };
  }, [privacy.healthActivity]);

  useEffect(() => {
    let active = true;
    void engines.run('memory', { goals }).then((result) => { if (active) setSummary(result); })
      .catch(() => { if (active) setEngineError('Could not calculate the activity summary.'); });
    return () => { active = false; };
  }, [goals]);

  async function togglePrivacy(key: keyof PrivacyPreferences, enabled: boolean) {
    await savePrivacyRemote(permissionDbKey(key), enabled);
    setPrivacy((current) => ({ ...current, [key]: enabled }));
    if (key === 'healthActivity' && !enabled) setActivityDays([]);
  }

  async function readDeviceSteps() {
    if (!privacy.healthActivity || activityBusy) return;
    setActivityBusy(true); setActivityError(null);
    try {
      const days = await collectDeviceSteps();
      await saveDeviceActivity(days); setActivityDays(days.map((item) => ({ ...item, source: 'ios_pedometer', recordedAt: new Date().toISOString() })));
    } catch (cause) { setActivityError(cause instanceof Error ? cause.message : 'Could not read device steps.'); }
    finally { setActivityBusy(false); }
  }

  /** Shared step-collection logic for both the manual sync and the background loop. */
  async function collectDeviceSteps(): Promise<{ day: string; steps: number }[]> {
    if (Platform.OS !== 'ios') throw new Error('Device step history is available in Expo Go on iPhone. Android requires a development build for its activity permission.');
    if (!await Pedometer.isAvailableAsync()) throw new Error('This iPhone does not have an available step counter.');
    const permission = await Pedometer.requestPermissionsAsync();
    if (!permission.granted) throw new Error('Allow Motion & Fitness access to read step totals.');
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const days: { day: string; steps: number }[] = [];
    for (let offset = 6; offset >= 0; offset -= 1) {
      const start = new Date(today); start.setDate(today.getDate() - offset);
      const end = new Date(start); end.setDate(start.getDate() + 1); if (offset === 0) end.setTime(Date.now());
      const result = await Pedometer.getStepCountAsync(start, end);
      const day = `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, '0')}-${String(start.getDate()).padStart(2, '0')}`;
      days.push({ day, steps: result.steps });
    }
    return days;
  }

  async function removeDeviceActivity() {
    setActivityBusy(true); setActivityError(null);
    try { await deleteDeviceActivity(); setActivityDays([]); }
    catch (cause) { setActivityError(cause instanceof Error ? cause.message : 'Could not delete activity.'); }
    finally { setActivityBusy(false); }
  }

  async function addTwinObservation(category: ObservationCategory, label: string) {
    if (twinBusy) return;
    setTwinBusy(true); setTwinError(null);
    try { const item = { id: Date.now(), category, label: label.trim().replace(/\s+/g, ' '), occurredAt: new Date().toISOString() }; await saveObservation(item); const saved = [item, ...observations].slice(0, 100); setObservations(saved); setPatterns(derivePatterns(saved)); }
    catch (cause) { setTwinError(cause instanceof Error ? cause.message : 'Could not save this observation.'); }
    finally { setTwinBusy(false); }
  }

  async function addTwinScenario(scenario: { title: string; horizonMonths: number; weeklyHoursChange: number; monthlyCashflowChange: number }) {
    if (twinBusy) return; setTwinBusy(true); setTwinError(null);
    try { const item = { ...scenario, id: Date.now(), createdAt: new Date().toISOString() }; await saveScenario(item); setScenarios((current) => [item, ...current]); }
    catch (cause) { setTwinError(cause instanceof Error ? cause.message : 'Could not save this scenario.'); }
    finally { setTwinBusy(false); }
  }

  async function removeTwinObservation(id: number) {
    if (twinBusy) return; setTwinBusy(true);
    try { await deleteObservationRemote(id); const saved = observations.filter((item) => item.id !== id); setObservations(saved); setPatterns(derivePatterns(saved)); setEmbeddings((current) => current.filter((item) => item.observationId !== id)); }
    catch { setTwinError('Could not delete this observation.'); } finally { setTwinBusy(false); }
  }

  async function removeTwinScenario(id: number) {
    if (twinBusy) return; setTwinBusy(true);
    try { await deleteScenarioRemote(id); setScenarios((current) => current.filter((item) => item.id !== id)); }
    catch { setTwinError('Could not delete this scenario.'); } finally { setTwinBusy(false); }
  }

  async function analyzeTwin() {
    if (!privacy.twinAi || !isApiConfigured || twinBusy) return;
    const items = [...observations.slice(0, 15).map((item) => ({ id: item.id, category: item.category, text: item.label, occurredAt: item.occurredAt })),
    ...goals.slice(0, 5).map((goal) => ({ id: 1_000_000 + (typeof goal.id === 'number' ? goal.id : parseInt(String(goal.id))), category: 'goal', text: goal.title, occurredAt: 'user-entered goal; date not supplied' })),
    ...scenarios.slice(0, 5).map((scenario) => ({ id: 2_000_000 + scenario.id, category: 'scenario', text: `${scenario.title}; horizon ${scenario.horizonMonths} months; estimated weekly time change ${scenario.weeklyHoursChange} hours; estimated monthly cash-flow change ${scenario.monthlyCashflowChange} in the user's currency. These are user-supplied assumptions.`, occurredAt: scenario.createdAt }))];
    setTwinBusy(true); setTwinError(null);
    try {
      let insight: string | null = null;
      let embeddingsPayload: { id: number; vector: number[] }[] | null = null;
      // Primary: real cross-module synthesis from the intelligence backend.
      try {
        const cross = await runCrossModule(['cognitive_memory', 'world_model'], { items }, 'twin_reflection');
        const lines = [
          ...cross.synthesis.key_insights,
          ...Object.values(cross.results).flatMap((r) => extractInsights(r.result).slice(0, 2)),
        ].filter(Boolean);
        if (lines.length > 0) insight = lines.join('\n\n');
      } catch { /* fall through to the worker twin route below */ }
      // Fallback: worker's dedicated twin route (embeddings + insight).
      if (insight === null) {
        const result = await apiFetch<{ insight?: unknown; embeddings?: unknown }>('/twin/analyze', { method: 'POST', body: JSON.stringify({ items }) });
        if (typeof result.insight !== 'string' || !Array.isArray(result.embeddings)) throw new Error('Analysis did not return a valid result.');
        insight = result.insight;
        embeddingsPayload = (result.embeddings as { id: number; vector: number[] }[]);
      }
      if (embeddingsPayload) {
        for (const row of embeddingsPayload) {
          if (typeof row.id === 'number' && observations.some((item) => item.id === row.id) && Array.isArray(row.vector) && row.vector.every((value) => typeof value === 'number')) {
            await saveEmbeddingRemote({ observationId: row.id, vector: row.vector });
          }
        }
        setEmbeddings((current) => [...current.filter((item) => !observations.some((observation) => observation.id === item.observationId)), ...embeddingsPayload!.filter((row) => observations.some((observation) => observation.id === row.id)).map((row) => ({ observationId: row.id, vector: row.vector }))]);
      }
      setTwinInsight(insight);
    } catch (cause) { setTwinError(cause instanceof Error ? cause.message : 'Could not update your Twin.'); }
    finally { setTwinBusy(false); }
  }

  async function sendMessage() {
    const content = chatInput.trim(); if (!privacy.assistantAi || !isApiConfigured || !content || chatBusy) return;
    const next = [...chatMessages, { role: 'user' as const, content }]; setChatMessages(next); setChatInput(''); setChatBusy(true); setChatError(null);
    try {
      const context = await findRelevantContext(content);
      const result = await apiFetch<{ reply?: unknown }>('/chat', { method: 'POST', body: JSON.stringify({ messages: next, ...(context ? { context } : {}) }) }); if (typeof result.reply !== 'string') throw new Error('Invalid response');
      setChatMessages((current) => [...current, { role: 'assistant', content: result.reply as string }]);
    } catch { setChatError('Could not reach the AI service. Check your connection and try again.'); } finally { setChatBusy(false); }
  }

  async function findRelevantContext(query: string): Promise<string> {
    if (!privacy.assistantContext) return '';
    let relevant = [] as TwinObservation[];
    if (embeddings.length > 0 && isApiConfigured) {
      try {
        const result = await apiFetch<{ vector?: unknown }>('/context/embed', { method: 'POST', body: JSON.stringify({ query }) });
        if (Array.isArray(result.vector) && result.vector.every((value) => typeof value === 'number')) relevant = rankObservations(result.vector, embeddings, observations);
      } catch { /* Fall back to local text search when the embedding request is unavailable. */ }
    }
    if (relevant.length === 0) {
      const terms = new Set(query.toLocaleLowerCase().match(/[\p{L}\p{N}]{3,}/gu) ?? []);
      relevant = observations.map((item) => ({ item, score: (item.label.toLocaleLowerCase().match(/[\p{L}\p{N}]{3,}/gu) ?? []).filter((term) => terms.has(term)).length }))
        .filter(({ score }) => score > 0).sort((a, b) => b.score - a.score).slice(0, 5).map(({ item }) => item);
    }
    const lines = relevant.map((item) => `- ${item.category} (${new Date(item.occurredAt).toLocaleDateString()}): ${item.label}`);
    const queryTerms = new Set(query.toLocaleLowerCase().match(/[\p{L}\p{N}]{3,}/gu) ?? []);
    const relevantGoals = goals.filter((item) => [...queryTerms].some((term) => item.title.toLocaleLowerCase().includes(term))).slice(0, 3);
    const relevantScenarios = scenarios.filter((item) => [...queryTerms].some((term) => item.title.toLocaleLowerCase().includes(term))).slice(0, 2);
    const relevantCaptures = visionCaptures.filter((item) => [...queryTerms].some((term) => `${item.question} ${item.answer ?? ''}`.toLocaleLowerCase().includes(term))).slice(0, 2);
    lines.push(...relevantGoals.map((item) => `- goal: ${item.title}`), ...relevantScenarios.map((item) => `- scenario: ${item.title} (${item.horizonMonths} months)`),
      ...relevantCaptures.map((item) => `- visual note (${new Date(item.createdAt).toLocaleDateString()}): ${item.question}${item.answer ? ` — ${item.answer}` : ''}`));
    return lines.join('\n').slice(0, 4500);
  }

  async function searchHelp() {
    const query = helpQuery.trim();
    if (!isApiConfigured || !query || helpBusy) return;
    setHelpBusy(true); setHelpError(null); setHelpResults([]);
    try {
      const result = await apiFetch<{ chunks?: unknown }>('/help/search', { method: 'POST', body: JSON.stringify({ query }) });
      if (!Array.isArray(result.chunks)) throw new Error('Could not search the LIFEOS guide.');
      setHelpResults(result.chunks.flatMap((item): SearchChunk[] => {
        if (typeof item !== 'object' || item === null) return [];
        const chunk = item as { id?: unknown; text?: unknown; score?: unknown; item?: { key?: unknown } };
        return typeof chunk.text === 'string' ? [{ id: typeof chunk.id === 'string' ? chunk.id : undefined, title: typeof chunk.item?.key === 'string' ? chunk.item.key : 'LIFEOS guide', text: chunk.text, score: typeof chunk.score === 'number' ? chunk.score : undefined }] : [];
      }));
    } catch (cause) { setHelpError(cause instanceof Error ? cause.message : 'Could not search the LIFEOS guide. Try again.'); }
    finally { setHelpBusy(false); }
  }

  async function saveRemoteVisionCapture(capture: Pick<VisionCapture, 'id' | 'question'> & { image: string; imagePreview: string }) {
    await saveCaptureRemote(capture);
    const item: VisionCapture = { id: capture.id, imageUri: capture.imagePreview, question: capture.question, answer: null, createdAt: new Date().toISOString() };
    setVisionCaptures((current) => [item, ...current]);
  }

  async function analyzeVisual(id: string, dataUri: string, question: string) {
    if (!privacy.visualAi || !isApiConfigured || visualBusy) return;
    if (dataUri.length > 1_950_000) { setVisualError('This image is too large. Retake it and try again.'); setVisualAnswer(null); return; }
    setVisualBusy(true); setVisualError(null); setVisualAnswer(null);
    try {
      const result = await apiFetch<{ answer?: unknown }>('/vision/analyze', { method: 'POST', body: JSON.stringify({ image: dataUri, question }) });
      if (typeof result.answer !== 'string') throw new Error('Visual analysis did not return an answer.');
      await saveCaptureAnswerRemote(id, question, result.answer);
      setVisionCaptures((current) => current.map((capture) => capture.id === id ? { ...capture, question, answer: result.answer as string } : capture)); setVisualAnswer(result.answer);
    } catch (cause) { setVisualError(cause instanceof Error ? cause.message : 'Could not analyze this image. Check your connection and try again.'); }
    finally { setVisualBusy(false); }
  }

  async function removeVisualCapture(capture: Pick<VisionCapture, 'id'>) {
    if (visualBusy) return; setVisualBusy(true); setVisualError(null);
    try { await deleteCaptureRemote(capture.id); setVisionCaptures((current) => current.filter((item) => item.id !== capture.id)); setVisualAnswer(null); }
    catch (cause) { setVisualError(cause instanceof Error ? cause.message : 'Could not remove this saved capture.'); } finally { setVisualBusy(false); }
  }

  const openVisual = () => { setVisualAnswer(null); setVisualError(null); setScreen('VisualIntelligence'); };
  const clearVisualAnswer = () => { setVisualAnswer(null); setVisualError(null); };

  /** Refresh the AI service status chip (worker → Fly → Cloudflare). */
  async function refreshAiHealth() {
    if (!isApiConfigured) return;
    try { setAiHealth(await getAiHealth()); } catch { setAiHealth({ status: 'not_configured', configured: false, connected: false, error: 'unreachable' }); }
  }
  useEffect(() => {
    let active = true;
    const timer = setTimeout(() => { if (active) void refreshAiHealth(); }, 0);
    return () => { active = false; clearTimeout(timer); };
  }, []);

  // Background intelligence loop — runs on open and on every foreground return.
  useEffect(() => {
    if (busy) return; // wait until the initial snapshot has loaded
    void runBackgroundIntelligence();
    const subscription = AppState.addEventListener('change', (state) => { if (state === 'active') void runBackgroundIntelligence(); });
    return () => subscription.remove();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [busy, privacy.healthActivity]);

  /** Run one intelligence engine (or a cross-module synthesis) against real workspace context. */
  async function runIntelligence(moduleId: string, problemType?: string) {
    if (!isApiConfigured || engineRun.busy) return;
    setEngineRun({ busy: true, error: null, result: null, cross: null });
    const ctx = { goals: goals.map((g) => ({ title: g.title, sessionCount: g.sessionCount })), observations: observations.map((o) => ({ category: o.category, label: o.label, occurredAt: o.occurredAt })), scenarios: scenarios.map((s) => ({ title: s.title, horizonMonths: s.horizonMonths, weeklyHoursChange: s.weeklyHoursChange, monthlyCashflowChange: s.monthlyCashflowChange })), activityDays: activityDays.map((d) => ({ day: d.day, steps: d.steps })) };
    const payload = buildEnginePayload(ctx);
    try {
      if (problemType) {
        const enginesFor = {
          ambiguous_decision: ['quantum', 'multi_agent', 'world_model'],
          career_change: ['world_model', 'causal', 'multi_agent', 'predictive'],
          financial_planning: ['world_model', 'causal', 'predictive', 'neuro_symbolic'],
          health_wellness: ['world_model', 'cognitive_memory', 'predictive', 'multimodal'],
          learning_goals: ['world_model', 'causal', 'generative', 'predictive'],
          behavior_change: ['causal', 'cognitive_memory', 'neuro_symbolic', 'multi_agent'],
        } as Record<string, string[]>;
        const ids = enginesFor[problemType] ?? ['world_model', 'causal', 'multi_agent'];
        const cross = await runCrossModule(ids, payload, problemType);
        setEngineRun({ busy: false, error: null, result: null, cross });
      } else {
        const result = await runEngine(moduleId, payload);
        setEngineRun({ busy: false, error: null, result, cross: null });
      }
    } catch (cause) {
      setEngineRun({ busy: false, error: cause instanceof Error ? cause.message : 'Could not run this engine. Try again.', result: null, cross: null });
    }
  }
  function clearEngineRun() { setEngineRun({ busy: false, error: null, result: null, cross: null }); }

  /**
   * Background intelligence loop — the core LIFEOS promise.
   * Runs on app open and whenever the app returns to the foreground:
   *  1. Silently syncs today's device steps (no manual button).
   *  2. Once per day, runs the predictive engine on your real data and
   *     surfaces a proactive daily update so the app "makes you smart".
   */
  const lastAutoRunKey = 'lifeos_last_auto_intel';
  async function runBackgroundIntelligence() {
    if (!isApiConfigured || autoSyncing) return;
    setAutoSyncing(true);
    try {
      // 1. Silent step sync (only if the user granted health access).
      if (privacy.healthActivity) {
        try {
          const days = await collectDeviceSteps();
          await saveDeviceActivity(days);
          setActivityDays(days.map((item) => ({ ...item, source: 'ios_pedometer', recordedAt: new Date().toISOString() })));
        } catch { /* Steps stay as-is; never block the loop on permission friction. */ }
      }
      // 2. Proactive daily update — once per local day.
      const today = new Date();
      const dayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
      let lastRun: string | null = null;
      try { lastRun = await SecureStore.getItemAsync(lastAutoRunKey); } catch { /* ignore */ }
      if (lastRun === dayKey) return;
      const payload = buildEnginePayload({
        goals: goals.map((g) => ({ title: g.title, sessionCount: g.sessionCount })),
        observations: observations.map((o) => ({ category: o.category, label: o.label, occurredAt: o.occurredAt })),
        scenarios: scenarios.map((s) => ({ title: s.title, horizonMonths: s.horizonMonths, weeklyHoursChange: s.weeklyHoursChange, monthlyCashflowChange: s.monthlyCashflowChange })),
        activityDays: activityDays.map((d) => ({ day: d.day, steps: d.steps })),
      });
      const result = await runEngine('predictive', payload);
      const lines = extractInsights(result.result);
      if (lines.length > 0) {
        setAutoUpdate({ title: 'Your daily update', body: lines[0], at: new Date().toISOString() });
      }
      try { await SecureStore.setItemAsync(lastAutoRunKey, dayKey); } catch { /* ignore */ }
    } finally { setAutoSyncing(false); }
  }

  return {
    screen, setScreen, openVisual, clearVisualAnswer,
    goals, busy, error, summary, engineError,
    chatInput, setChatInput, chatMessages, chatBusy, chatError, sendMessage,
    helpQuery, setHelpQuery, helpResults, helpBusy, helpError, searchHelp,
    privacy, togglePrivacy, cameraPermission, requestCameraPermission,
    observations, patterns, scenarios, embeddings, twinInsight, twinBusy, twinError,
    addTwinObservation, addTwinScenario, removeTwinObservation, removeTwinScenario, analyzeTwin,
    visualAnswer, visualBusy, visualError, visionCaptures,
    saveRemoteVisionCapture, analyzeVisual, removeVisualCapture,
    activityDays, activityBusy, activityError, readDeviceSteps, removeDeviceActivity, deviceStepsToday,
    autoUpdate, autoSyncing, dismissAutoUpdate: () => setAutoUpdate(null), runBackgroundIntelligence,
    aiHealth, refreshAiHealth,
    engineRun, runIntelligence, clearEngineRun,
  };
}

type SearchChunk = import('./screens/types').SearchChunk;
