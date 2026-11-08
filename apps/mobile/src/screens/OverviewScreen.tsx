import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getOverview } from '../intelligenceApi';
import type { OverviewResult } from '../intelligenceApi';

const DOMAIN_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  activity: 'footsteps-outline',
  nutrition: 'nutrition-outline',
  learning: 'school-outline',
  routines: 'pulse-outline',
  environment: 'cloud-outline',
  goals: 'flag-outline',
};

/** 360° view — every data domain runs through its interrelated engines and one synthesis. */
export function OverviewScreen({ onBack }: { onBack: () => void }) {
  const [overview, setOverview] = useState<OverviewResult | null>(null);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function run() {
    setBusy(true); setError(null);
    try { setOverview(await getOverview()); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not build your overview. Try again.'); }
    finally { setBusy(false); }
  }

  useEffect(() => { void run(); }, []);

  const gapLabels: Record<string, string> = {
    activity: 'Sync steps in Health',
    nutrition: 'Log meals in Food',
    learning: 'Add learning goals',
    routines: 'Record routines in Twin',
    environment: 'Open Environment once',
    goals: 'Create goals in Twin',
  };

  return <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
    <Pressable accessibilityRole="button" onPress={onBack} style={styles.back}><Text style={styles.backText}>‹  All tools</Text></Pressable>
    <Text style={styles.eyebrow}>360 INTELLIGENCE</Text>
    <Text style={styles.title}>Your full picture</Text>
    <Text style={styles.subtitle}>Every data domain runs through its own engines, then one synthesis connects them.</Text>

    {busy && <View style={styles.center}><ActivityIndicator color="#61e894" /><Text style={styles.busyNote}>Running all engines on your live data…</Text></View>}
    {error && <Text accessibilityRole="alert" style={styles.error}>{error}</Text>}

    {overview && <>
      <View style={styles.metaRow}>
        <Text style={styles.meta}>{new Date(overview.generatedAt).toLocaleString()}</Text>
        <Text style={styles.meta}>{Math.round(overview.confidence * 100)}% confidence · {Math.round(overview.total_execution_time_ms / 100) / 10}s</Text>
      </View>

      {overview.cross_insights.length > 0 && <View style={styles.crossCard}>
        <View style={styles.crossHeader}><Ionicons name="git-network-outline" size={16} color="#61e894" /><Text style={styles.crossTitle}>Connected across your life</Text></View>
        {overview.cross_insights.map((line, i) => <Text key={i} style={styles.crossLine}>• {line}</Text>)}
      </View>}

      <Text style={styles.section}>By domain</Text>
      {overview.domains.map((domain) => <View key={domain.domain} style={styles.card}>
        <View style={styles.row}>
          <View style={styles.iconCircle}><Ionicons name={DOMAIN_ICONS[domain.domain] ?? 'apps-outline'} size={15} color="#72df98" /></View>
          <View style={styles.copy}>
            <Text style={styles.cardTitle}>{domain.label}</Text>
            <Text style={styles.detail}>{domain.count > 0 ? `${domain.count} data point(s) · engines: ${domain.engines.slice(0, 3).join(', ').replaceAll('_', ' ')}` : 'No data in this domain yet'}</Text>
          </View>
          {domain.count > 0 && <Text style={styles.conf}>{Math.round(domain.confidence * 100)}%</Text>}
        </View>
        {domain.insights.map((line, i) => <Text key={i} style={styles.insight}>• {line}</Text>)}
        {domain.count === 0 && <Text style={styles.gap}>{gapLabels[domain.domain] ?? 'Add data to unlock this domain'}</Text>}
      </View>)}

      {overview.recommendations.length > 0 && <>
        <Text style={styles.section}>Do next</Text>
        {overview.recommendations.map((line, i) => <View key={i} style={styles.recRow}><Ionicons name="arrow-forward-circle-outline" size={15} color="#61e894" /><Text style={styles.recText}>{line}</Text></View>)}
      </>}

      <Pressable accessibilityRole="button" disabled={busy} onPress={() => void run()} style={[styles.refresh, busy && styles.disabled]}>
        <Ionicons name="refresh-outline" size={15} color="#07150b" /><Text style={styles.refreshText}>Re-run all engines</Text>
      </Pressable>
    </>}
  </ScrollView>;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#06100b' }, content: { padding: 18, paddingBottom: 32, maxWidth: 720, width: '100%', alignSelf: 'center' },
  back: { alignSelf: 'flex-start', paddingVertical: 8, marginBottom: 4 }, backText: { color: '#9cad9f', fontSize: 12, fontWeight: '600' },
  eyebrow: { color: '#78d99a', fontSize: 9, letterSpacing: 1.3, fontWeight: '700', marginBottom: 7 }, title: { color: '#f0f8f2', fontSize: 28, lineHeight: 35, fontWeight: '700' }, subtitle: { color: '#9cad9f', fontSize: 12, lineHeight: 19, marginTop: 6, marginBottom: 14 },
  center: { alignItems: 'center', gap: 10, paddingVertical: 26 }, busyNote: { color: '#8fa594', fontSize: 11 }, error: { color: '#ff9b9b', fontSize: 11, lineHeight: 17, marginVertical: 10 },
  metaRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 }, meta: { color: '#6f8173', fontSize: 9 },
  crossCard: { borderRadius: 16, borderWidth: 1, borderColor: '#2c6444', backgroundColor: '#0f2418', padding: 14, marginBottom: 12 }, crossHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }, crossTitle: { color: '#8ee9aa', fontSize: 12, fontWeight: '700' }, crossLine: { color: '#d9e8dc', fontSize: 11, lineHeight: 18 },
  section: { color: '#eaf4ec', fontSize: 16, fontWeight: '600', marginTop: 14, marginBottom: 8 }, card: { backgroundColor: '#0c1910', borderColor: '#1d3927', borderWidth: 1, borderRadius: 15, padding: 13, marginBottom: 8 }, row: { flexDirection: 'row', alignItems: 'center', gap: 10 }, iconCircle: { width: 32, height: 32, borderRadius: 11, backgroundColor: '#153b24', alignItems: 'center', justifyContent: 'center' }, copy: { flex: 1, minWidth: 0 }, cardTitle: { color: '#eaf4ec', fontSize: 13, fontWeight: '600' }, detail: { color: '#8fa594', fontSize: 10, lineHeight: 15, marginTop: 3 }, conf: { color: '#8ee9aa', fontSize: 11, fontWeight: '700' },
  insight: { color: '#c9dccd', fontSize: 11, lineHeight: 17, marginTop: 7, marginLeft: 42 }, gap: { color: '#d0b56d', fontSize: 10, marginTop: 7, marginLeft: 42 },
  recRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginBottom: 7 }, recText: { flex: 1, color: '#d9e8dc', fontSize: 11, lineHeight: 17 },
  refresh: { marginTop: 14, minHeight: 46, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 13, backgroundColor: '#61e894', padding: 12 }, refreshText: { color: '#07150b', fontSize: 12, fontWeight: '700' }, disabled: { opacity: 0.55 },
});
