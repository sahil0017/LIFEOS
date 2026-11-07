import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { apiFetch } from '../api';
import { isApiConfigured } from '../api';

interface LearningGoal { id: string; skill: string; progress: number; created_at?: string }

export function LearningScreen() {
  const [goals, setGoals] = useState<LearningGoal[]>([]);
  const [gaps, setGaps] = useState('');
  const [recs, setRecs] = useState('');
  const [busy, setBusy] = useState(true);
  const [adding, setAdding] = useState(false);
  const [newSkill, setNewSkill] = useState('');
  const [error, setError] = useState<string | null>(isApiConfigured ? null : 'Connect the LIFEOS service in Settings to sync learning goals.');

  const load = useCallback(async () => {
    if (!isApiConfigured) { setBusy(false); return; }
    setError(null);
    try {
      const g = await apiFetch<{ goals: LearningGoal[] }>('/learning/goals');
      setGoals(g.goals ?? []);
      if ((g.goals ?? []).length > 0) {
        const [gap, r] = await Promise.all([
          apiFetch<{ gaps: string }>('/learning/gaps', { method: 'POST', body: JSON.stringify({ goals: g.goals }) }).catch(() => null),
          apiFetch<{ recommendations: string }>('/learning/recommendations', { method: 'POST', body: JSON.stringify({ goals: g.goals }) }).catch(() => null),
        ]);
        setGaps(gap?.gaps ?? ''); setRecs(r?.recommendations ?? '');
      } else { setGaps(''); setRecs(''); }
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not load learning goals.'); }
    finally { setBusy(false); }
  }, []);

  useEffect(() => { const timer = setTimeout(() => { if (isApiConfigured) void load(); }, 0); return () => clearTimeout(timer); }, [load]);

  async function addGoal() {
    const skill = newSkill.trim();
    if (!skill || adding) return;
    setAdding(true); setError(null);
    try {
      await apiFetch<{ id: string }>('/learning/goals', { method: 'POST', body: JSON.stringify({ skill, progress: 0 }) });
      setNewSkill(''); await load();
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not add the learning goal.'); }
    finally { setAdding(false); }
  }

  async function bumpProgress(goal: LearningGoal, delta: number) {
    const next = Math.min(1, Math.max(0, (goal.progress ?? 0) + delta));
    setGoals((current) => current.map((g) => g.id === goal.id ? { ...g, progress: next } : g));
    try { await apiFetch(`/learning/goals/${encodeURIComponent(goal.id)}`, { method: 'PUT', body: JSON.stringify({ progress: next }) }); }
    catch { await load(); }
  }

  return <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
    <Text style={styles.eyebrow}>LEARNING COMPANION</Text>
    <Text style={styles.title}>Skills & progress</Text>
    <Text style={styles.subtitle}>Track learning goals, log progress, and let gap detection work on your real record.</Text>

    <View style={styles.addRow}>
      <TextInput style={styles.input} placeholder="What are you learning?" placeholderTextColor="#6c7f70"
        value={newSkill} onChangeText={setNewSkill} onSubmitEditing={() => void addGoal()} maxLength={120} />
      <Pressable accessibilityRole="button" onPress={() => void addGoal()} disabled={adding || !newSkill.trim()} style={[styles.addButton, (!newSkill.trim() || adding) && styles.disabled]}>
        {adding ? <ActivityIndicator color="#07150b" size="small" /> : <Ionicons name="add" size={20} color={newSkill.trim() ? '#07150b' : '#57705f'} />}
      </Pressable>
    </View>

    {error && <Text accessibilityRole="alert" style={styles.error}>{error}</Text>}
    {busy && <ActivityIndicator color="#61e894" style={styles.spinner} />}
    {!busy && goals.length === 0 && !error && <View style={styles.emptyCard}><Text style={styles.emptyText}>No learning goals yet. Add your first skill above.</Text></View>}

    {goals.map((goal) => (
      <View key={goal.id} style={styles.card}>
        <View style={styles.cardTop}>
          <Text style={styles.skill} numberOfLines={2}>{goal.skill}</Text>
          <Text style={styles.pct}>{Math.round((goal.progress ?? 0) * 100)}%</Text>
        </View>
        <View style={styles.barTrack}><View style={[styles.bar, { width: `${Math.round((goal.progress ?? 0) * 100)}%` }]} /></View>
        <View style={styles.actions}>
          <Pressable accessibilityRole="button" accessibilityLabel={`Decrease progress for ${goal.skill}`} onPress={() => void bumpProgress(goal, -0.1)} style={styles.stepButton}><Text style={styles.stepText}>−10%</Text></Pressable>
          <Pressable accessibilityRole="button" accessibilityLabel={`Increase progress for ${goal.skill}`} onPress={() => void bumpProgress(goal, 0.1)} style={styles.stepButton}><Text style={styles.stepText}>+10%</Text></Pressable>
        </View>
      </View>
    ))}

    {gaps ? <View style={styles.insightCard}><Ionicons name="warning-outline" size={16} color="#d6c179" /><Text style={styles.insightText}>{gaps}</Text></View> : null}
    {recs ? <View style={styles.insightCard}><Ionicons name="sparkles-outline" size={16} color="#72df98" /><Text style={styles.insightText}>{recs}</Text></View> : null}
  </ScrollView>;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#06100b' },
  content: { padding: 18, paddingBottom: 32, maxWidth: 720, width: '100%', alignSelf: 'center', gap: 12 },
  eyebrow: { color: '#78d99a', fontSize: 9, letterSpacing: 1.3, fontWeight: '700' },
  title: { color: '#f0f8f2', fontSize: 28, fontWeight: '700', lineHeight: 35 },
  subtitle: { color: '#9cad9f', fontSize: 12, lineHeight: 19, marginTop: 4 },
  addRow: { flexDirection: 'row', gap: 8, marginTop: 6 },
  input: { flex: 1, minHeight: 44, borderRadius: 12, borderWidth: 1, borderColor: '#244a32', backgroundColor: '#0d1b12', color: '#eaf4ec', paddingHorizontal: 12, fontSize: 13 },
  addButton: { width: 44, height: 44, borderRadius: 12, backgroundColor: '#61e894', alignItems: 'center', justifyContent: 'center' },
  disabled: { opacity: 0.5 },
  error: { color: '#ff9b9b', fontSize: 11, lineHeight: 17 },
  spinner: { marginVertical: 10 },
  emptyCard: { borderRadius: 14, borderWidth: 1, borderColor: '#1d3927', backgroundColor: '#0b1710', padding: 14 },
  emptyText: { color: '#8fa594', fontSize: 11, lineHeight: 17 },
  card: { padding: 14, borderRadius: 14, backgroundColor: '#0d1b12', borderWidth: 1, borderColor: '#1d3927' },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', gap: 10, marginBottom: 8 },
  skill: { flex: 1, color: '#eaf4ec', fontSize: 13, fontWeight: '600' },
  pct: { color: '#61e894', fontSize: 12, fontWeight: '700' },
  barTrack: { height: 8, backgroundColor: '#153b26', borderRadius: 4, overflow: 'hidden' },
  bar: { height: 8, backgroundColor: '#61e894', borderRadius: 4 },
  actions: { flexDirection: 'row', gap: 8, marginTop: 10 },
  stepButton: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 9, borderWidth: 1, borderColor: '#2b5c3e', backgroundColor: '#102418' },
  stepText: { color: '#8ee9aa', fontSize: 11, fontWeight: '600' },
  insightCard: { flexDirection: 'row', gap: 9, alignItems: 'flex-start', padding: 13, borderRadius: 14, borderWidth: 1, borderColor: '#1d3927', backgroundColor: '#0b1710' },
  insightText: { flex: 1, color: '#dcebe0', fontSize: 12, lineHeight: 18 },
});
