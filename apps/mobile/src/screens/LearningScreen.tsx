import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { apiFetch } from '../api';

export function LearningScreen() {
  const [goals, setGoals] = useState<any[]>([]);
  const [gaps, setGaps] = useState('');
  const [recs, setRecs] = useState('');
  const [busy, setBusy] = useState(false);

  async function load() {
    setBusy(true);
    try {
      const g = await apiFetch<{ goals: any[] }>('/learning/goals');
      setGoals(g.goals ?? []);
      const gap = await apiFetch<{ gaps: string }>('/learning/gaps', { method: 'POST', body: JSON.stringify({ goals: g.goals }) });
      setGaps(gap.gaps);
      const r = await apiFetch<{ recommendations: string }>('/learning/recommendations', { method: 'POST', body: JSON.stringify({ goals: g.goals }) });
      setRecs(r.recommendations);
    } catch (e) { setGaps(String(e)); }
    finally { setBusy(false); }
  }

  useEffect(() => { load(); }, []);

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Text style={styles.title}>Learning companion</Text>
      {busy && <ActivityIndicator color="#61e894" />}
      {goals.map((g) => (
        <View key={g.id} style={styles.card}>
          <Text style={styles.skill}>{g.skill}</Text>
          <View style={styles.barTrack}><View style={[styles.bar, { width: `${Math.round((g.progress ?? 0) * 100)}%` }]} /></View>
          <Text style={styles.pct}>{Math.round((g.progress ?? 0) * 100)}%</Text>
        </View>
      ))}
      {gaps ? <Text style={styles.section}>Gaps: {gaps}</Text> : null}
      {recs ? <Text style={styles.section}>Recommendations: {recs}</Text> : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 18, gap: 12 },
  title: { color: '#f0f8f2', fontSize: 24, fontWeight: '700' },
  card: { padding: 12, borderRadius: 12, backgroundColor: '#0d1b12', borderWidth: 1, borderColor: '#1d3927' },
  skill: { color: '#eaf4ec', fontSize: 13, fontWeight: '600', marginBottom: 6 },
  barTrack: { height: 8, backgroundColor: '#153b26', borderRadius: 4, overflow: 'hidden' },
  bar: { height: 8, backgroundColor: '#61e894' },
  pct: { color: '#9cad9f', fontSize: 11, marginTop: 4 },
  section: { color: '#dcebe0', fontSize: 12, lineHeight: 18 },
});
