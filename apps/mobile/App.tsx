import { useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { useCameraPermissions } from 'expo-camera';
import { Pedometer } from 'expo-sensors';
import { Ionicons } from '@expo/vector-icons';
import { ActivityIndicator, Platform, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { Goal } from './src/goals';
import { engines } from './src/engines';
import type { EngineResult } from './src/engines';
import { derivePatterns } from './src/twin';
import type { ObservationCategory, TwinEmbedding, TwinObservation, TwinPattern, TwinScenario } from './src/twin';
import { PersonalTwinScreen } from './src/screens/PersonalTwinScreen';
import { IntelligenceCommandCenter } from './src/screens/IntelligenceCommandCenter';
import { VisualIntelligenceScreen } from './src/screens/VisualIntelligenceScreen';
import { AssistantScreen } from './src/screens/AssistantScreen';
import { ModulesScreen } from './src/screens/ModulesScreen';
import { ConnectionsScreen } from './src/screens/ConnectionsScreen';
import { HelpSearchScreen } from './src/screens/HelpSearchScreen';
import { PrivacyScreen } from './src/screens/PrivacyScreen';
import { HealthScreen } from './src/screens/HealthScreen';
import { PedometerScreen } from './src/screens/PedometerScreen';
import { VoiceScreen } from './src/screens/VoiceScreen';
import { LearningScreen } from './src/screens/LearningScreen';
import { AccessibilityScreen } from './src/screens/AccessibilityScreen';
import { EnvironmentScreen } from './src/screens/EnvironmentScreen';
import { FoodScreen } from './src/screens/FoodScreen';

import type { VisionCapture } from './src/vision';

import type { PrivacyPreferences } from './src/privacy';
import { rankObservations } from './src/contextSearch';
import { apiFetch, deleteCaptureRemote, deleteObservationRemote, deleteScenarioRemote, isApiConfigured, loadDeviceActivity, saveDeviceActivity, deleteDeviceActivity, loadSnapshot, saveCaptureAnswerRemote, saveCaptureRemote, saveEmbeddingRemote, saveObservation, savePrivacyRemote, saveScenario } from './src/api';
import type { DailyActivity } from './src/api';
import type { ChatMessage, SearchChunk } from './src/screens/types';

type Screen = 'Home' | 'Assistant' | 'Modules' | 'PersonalTwin' | 'VisualIntelligence' | 'Privacy' | 'Connections' | 'HelpSearch' | 'Health' | 'Food' | 'Environment' | 'Accessibility' | 'Learning' | 'Voice' | 'Pedometer';
const nav: { id: Screen; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { id: 'Home', label: 'Home', icon: 'home-outline' },
  { id: 'Modules', label: 'Tools', icon: 'apps-outline' }, { id: 'Privacy', label: 'Privacy', icon: 'shield-checkmark-outline' },
];

export default function App() {
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
  const [activityBusy, setActivityBusy] = useState(false);
  const [activityError, setActivityError] = useState<string | null>(null);
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();

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
    if (!privacy.healthActivity) { setActivityDays([]); return () => { active = false; }; }
    void loadDeviceActivity().then((result) => { if (active) setActivityDays(result.days); }).catch((cause) => { if (active) setActivityError(cause instanceof Error ? cause.message : 'Could not load activity.'); });
    return () => { active = false; };
  }, [privacy.healthActivity]);

  useEffect(() => {
    let active = true;
    void engines.run('memory', { goals }).then((result) => { if (active) setSummary(result); })
      .catch(() => { if (active) setEngineError('Could not calculate the activity summary.'); });
    return () => { active = false; };
  }, [goals]);

  async function togglePrivacy(key: keyof PrivacyPreferences, enabled: boolean) {
    const dbKey = key === 'assistantAi' ? 'assistant_ai' : key === 'assistantContext' ? 'assistant_context' : key === 'twinAi' ? 'twin_ai' : key === 'healthActivity' ? 'health_activity' : 'visual_ai';
    await savePrivacyRemote(dbKey, enabled);
    setPrivacy((current) => ({ ...current, [key]: enabled }));
  }

  async function readDeviceSteps() {
    if (!privacy.healthActivity || activityBusy) return;
    setActivityBusy(true); setActivityError(null);
    try {
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
      await saveDeviceActivity(days); setActivityDays(days.map((item) => ({ ...item, source: 'ios_pedometer', recordedAt: new Date().toISOString() })));
    } catch (cause) { setActivityError(cause instanceof Error ? cause.message : 'Could not read device steps.'); }
    finally { setActivityBusy(false); }
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
      ...goals.slice(0, 5).map((goal) => ({ id: 1_000_000 + goal.id, category: 'goal', text: goal.title, occurredAt: 'user-entered goal; date not supplied' })),
      ...scenarios.slice(0, 5).map((scenario) => ({ id: 2_000_000 + scenario.id, category: 'scenario', text: `${scenario.title}; horizon ${scenario.horizonMonths} months; estimated weekly time change ${scenario.weeklyHoursChange} hours; estimated monthly cash-flow change ${scenario.monthlyCashflowChange} in the user's currency. These are user-supplied assumptions.`, occurredAt: scenario.createdAt }))];
    setTwinBusy(true); setTwinError(null);
    try {
      const result = await apiFetch<{ insight?: unknown; embeddings?: unknown }>('/twin/analyze', { method: 'POST', body: JSON.stringify({ items }) });
      if (typeof result.insight !== 'string' || !Array.isArray(result.embeddings)) throw new Error('Analysis did not return a valid result.');
      for (const entry of result.embeddings) { if (typeof entry !== 'object' || entry === null) continue; const row = entry as { id?: unknown; vector?: unknown }; if (typeof row.id === 'number' && observations.some((item) => item.id === row.id) && Array.isArray(row.vector) && row.vector.every((value) => typeof value === 'number')) await saveEmbeddingRemote({ observationId: row.id, vector: row.vector }); }
      setTwinInsight(result.insight); setEmbeddings((current) => [...current.filter((item) => !observations.some((observation) => observation.id === item.observationId)), ...((result.embeddings as {id:number;vector:number[]}[]).filter((row) => observations.some((observation) => observation.id === row.id)).map((row) => ({ observationId: row.id, vector: row.vector })))]);
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
  return <SafeAreaView style={styles.safe}>
    {error && <Text accessibilityRole="alert" style={styles.globalError}>{error}</Text>}
    {busy && <ActivityIndicator color="#61e894" style={styles.loading} />}
    {!busy && screen === 'Home' && <IntelligenceCommandCenter summary={summary?.summary ?? null} summaryError={engineError} goals={goals} observations={observations} patterns={patterns} scenarios={scenarios} captures={visionCaptures} onOpenAssistant={() => setScreen('Assistant')} onOpenTwin={() => setScreen('PersonalTwin')} onOpenVisual={openVisual} onOpenModules={() => setScreen('Modules')} onOpenPrivacy={() => setScreen('Privacy')} />}
    {!busy && screen === 'Assistant' && <AssistantScreen messages={chatMessages} input={chatInput} busy={chatBusy} error={chatError} aiAllowed={privacy.assistantAi} contextEnabled={privacy.assistantContext} configured={isApiConfigured} onInput={setChatInput} onSend={() => void sendMessage()} onOpenPrivacy={() => setScreen('Privacy')} onOpenModules={() => setScreen('Modules')} />}
    {!busy && screen === 'Modules' && <ModulesScreen visionReady={isApiConfigured} onOpenAssistant={() => setScreen('Assistant')} onOpenTwin={() => setScreen('PersonalTwin')} onOpenVisual={openVisual} onOpenHealth={() => setScreen('Health')} onOpenConnections={() => setScreen('Connections')} onOpenHelpSearch={() => setScreen('HelpSearch')} />}
    {!busy && screen === 'Connections' && <ConnectionsScreen onBack={() => setScreen('Modules')} onOpenHealth={() => setScreen('Health')} />}
    {!busy && screen === 'Health' && <HealthScreen allowed={privacy.healthActivity} days={activityDays} busy={activityBusy} error={activityError} onOpenPrivacy={() => setScreen('Privacy')} onReadDevice={() => void readDeviceSteps()} onDelete={() => void removeDeviceActivity()} />}
    {!busy && screen === 'Environment' && <EnvironmentScreen />}
    {!busy && screen === 'Accessibility' && <AccessibilityScreen />}
    {!busy && screen === 'Learning' && <LearningScreen />}
    {!busy && screen === 'Voice' && <VoiceScreen />}
    {!busy && screen === 'Pedometer' && <PedometerScreen />}
    {!busy && screen === 'Food' && <FoodScreen />}
    {!busy && screen === 'HelpSearch' && <HelpSearchScreen query={helpQuery} results={helpResults} busy={helpBusy} error={helpError} onQuery={setHelpQuery} onSearch={() => void searchHelp()} onBack={() => setScreen('Modules')} />}
    {!busy && screen === 'PersonalTwin' && <ScrollView style={styles.screen} contentContainerStyle={styles.secondaryContent} keyboardShouldPersistTaps="handled"><PersonalTwinScreen goals={goals} observations={observations} patterns={patterns} scenarios={scenarios} embeddings={embeddings} insight={twinInsight} busy={twinBusy} error={twinError} aiAllowed={privacy.twinAi} configured={isApiConfigured} onOpenPrivacy={() => setScreen('Privacy')} onRecordObservation={addTwinObservation} onCreateScenario={addTwinScenario} onDeleteObservation={removeTwinObservation} onDeleteScenario={removeTwinScenario} onAnalyze={analyzeTwin} /></ScrollView>}
    {!busy && screen === 'VisualIntelligence' && <VisualIntelligenceScreen visionReady={isApiConfigured} aiAllowed={privacy.visualAi} cameraGranted={Boolean(cameraPermission?.granted)} onOpenPrivacy={() => setScreen('Privacy')} busy={visualBusy} answer={visualAnswer} error={visualError} captures={visionCaptures} onSaveCapture={saveRemoteVisionCapture} onAnalyze={(id, image, question) => void analyzeVisual(id, image, question)} onDeleteCapture={removeVisualCapture} onClearAnswer={() => { setVisualAnswer(null); setVisualError(null); }} onBack={() => setScreen('Home')} />}
    {!busy && screen === 'Privacy' && <PrivacyScreen preferences={privacy} cameraGranted={Boolean(cameraPermission?.granted)} cameraCanAskAgain={cameraPermission?.canAskAgain !== false} onToggle={(key, value) => void togglePrivacy(key, value)} onRequestCamera={() => void requestCameraPermission()} />}
    <View style={styles.nav}>{nav.map((item) => <Pressable key={item.id} accessibilityRole="button" accessibilityState={{ selected: screen === item.id }} onPress={() => setScreen(item.id)} style={styles.navItem}><View style={styles.navIcon}><Ionicons name={item.icon} size={19} color={screen === item.id ? '#70e79a' : '#7c8d80'} /></View><Text style={[styles.navLabel, screen === item.id && styles.navActive]}>{item.label}</Text></Pressable>)}</View>
    <StatusBar style="light" />
  </SafeAreaView>;
}

const styles = StyleSheet.create({ safe: { flex: 1, backgroundColor: '#06100b' }, screen: { flex: 1, backgroundColor: '#06100b' }, secondaryContent: { padding: 18, paddingBottom: 36, maxWidth: 720, width: '100%', alignSelf: 'center' }, globalError: { color: '#ffacb5', paddingHorizontal: 18, paddingTop: 8, lineHeight: 19 }, loading: { marginVertical: 10 }, nav: { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center', minHeight: 61, paddingHorizontal: 5, paddingBottom: 3, backgroundColor: '#0b1710', borderTopWidth: 1, borderTopColor: '#1d3624' }, navItem: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 3, minHeight: 52 }, navIcon: { height: 22, alignItems: 'center', justifyContent: 'center' }, navLabel: { color: '#7c8d80', fontSize: 8, lineHeight: 12, fontWeight: '600' }, navActive: { color: '#70e79a' } });
