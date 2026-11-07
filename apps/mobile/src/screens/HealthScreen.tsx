import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { DailyActivity } from '../api';

interface Props {
  allowed: boolean;
  days: readonly DailyActivity[];
  busy: boolean;
  error: string | null;
  onOpenPrivacy: () => void;
  onReadDevice: () => void;
  onDelete: () => void;
}

export function HealthScreen(props: Props) {
  const chart = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(); date.setHours(0, 0, 0, 0); date.setDate(date.getDate() - (6 - index));
    const day = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    return { day, label: date.toLocaleDateString(undefined, { weekday: 'short' }), steps: props.days.find((item) => item.day === day)?.steps ?? 0 };
  });
  const hasData = chart.some((item) => item.steps > 0);
  const today = chart[6].steps;
  const average = props.days.length ? Math.round(props.days.reduce((sum, item) => sum + item.steps, 0) / props.days.length) : 0;
  const max = Math.max(1, ...chart.map((item) => item.steps));

  return <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
    <Text style={styles.eyebrow}>DEVICE HEALTH</Text>
    <Text style={styles.title}>Activity</Text>
    <Text style={styles.subtitle}>Bring movement data into your shared LIFEOS context. You choose when to read it.</Text>

    <View style={styles.summaryCard}>
      <View style={styles.summaryTop}><View style={styles.iconCircle}><Ionicons name="footsteps-outline" size={19} color="#76e69a" /></View><Text style={styles.sourceLabel}>IPHONE PEDOMETER</Text></View>
      <Text style={styles.metric}>{today.toLocaleString()}</Text><Text style={styles.metricLabel}>steps today</Text>
      <View style={styles.chart}>
        {chart.map((item) => <View key={item.day} style={styles.barColumn}>
          <Text style={styles.barValue}>{item.steps ? (item.steps >= 10000 ? `${Math.round(item.steps / 1000)}k` : item.steps.toLocaleString()) : '—'}</Text>
          <View style={styles.barTrack}><View style={[styles.bar, { height: `${Math.max(item.steps ? 7 : 0, (item.steps / max) * 100)}%` }]} /></View>
          <Text style={styles.dayLabel}>{item.label}</Text>
        </View>)}
      </View>
      <View style={styles.statsRow}><Stat label="7-day total" value={chart.reduce((sum, item) => sum + item.steps, 0).toLocaleString()} /><Stat label="Daily average" value={average.toLocaleString()} /></View>
    </View>

    {props.error && <Text accessibilityRole="alert" style={styles.error}>{props.error}</Text>}
    {!props.allowed ? <View style={styles.permissionCard}>
      <Ionicons name="lock-closed-outline" size={19} color="#d6c179" />
      <View style={styles.permissionCopy}><Text style={styles.cardTitle}>Activity access is off</Text><Text style={styles.cardBody}>Allow step data in Privacy first. LIFEOS reads it only when you tap the button below.</Text></View>
      <Pressable accessibilityRole="button" onPress={props.onOpenPrivacy} style={styles.outlineButton}><Text style={styles.outlineText}>Open Privacy</Text></Pressable>
    </View> : <Pressable accessibilityRole="button" disabled={props.busy} onPress={props.onReadDevice} style={[styles.primaryButton, props.busy && styles.disabled]}>
      {props.busy ? <ActivityIndicator color="#07150b" /> : <><Ionicons name="sync-outline" size={17} color="#07150b" /><Text style={styles.primaryText}>{hasData ? 'Refresh from iPhone' : 'Read activity from iPhone'}</Text></>}
    </Pressable>}
    {props.allowed && props.days.length > 0 && <Pressable accessibilityRole="button" disabled={props.busy} onPress={props.onDelete} style={styles.deleteButton}><Ionicons name="trash-outline" size={15} color="#ff9b9b" /><Text style={styles.deleteText}>Delete synced activity</Text></Pressable>}
    <View style={styles.noteCard}><Ionicons name="information-circle-outline" size={17} color="#72df98" /><Text style={styles.note}>Reads the past seven days of device step totals when requested. No background tracking. Data is saved to your LIFEOS workspace. Turn access off or delete synced activity at any time.</Text></View>
  </ScrollView>;
}
function Stat({ label, value }: { label: string; value: string }) { return <View style={styles.stat}><Text style={styles.statValue}>{value}</Text><Text style={styles.statLabel}>{label}</Text></View>; }
const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#06100b' }, content: { padding: 18, paddingBottom: 32, maxWidth: 720, width: '100%', alignSelf: 'center' },
  eyebrow: { color: '#78d99a', fontSize: 9, letterSpacing: 1.3, fontWeight: '700', marginBottom: 7 }, title: { color: '#f0f8f2', fontSize: 28, lineHeight: 35, fontWeight: '700' }, subtitle: { color: '#9cad9f', fontSize: 12, lineHeight: 19, marginTop: 6, marginBottom: 17 },
  summaryCard: { borderRadius: 20, backgroundColor: '#0d1b12', borderColor: '#244a32', borderWidth: 1, padding: 16, marginBottom: 12 }, summaryTop: { flexDirection: 'row', alignItems: 'center', gap: 9 }, iconCircle: { width: 34, height: 34, borderRadius: 12, backgroundColor: '#153b24', alignItems: 'center', justifyContent: 'center' }, sourceLabel: { color: '#93a799', fontSize: 8, fontWeight: '700', letterSpacing: 1 }, metric: { color: '#f0f8f2', fontSize: 37, lineHeight: 44, fontWeight: '700', marginTop: 16 }, metricLabel: { color: '#8fa594', fontSize: 11, marginTop: -1 },
  chart: { height: 136, flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: 7, marginTop: 17, paddingBottom: 4 }, barColumn: { flex: 1, height: '100%', alignItems: 'center', justifyContent: 'flex-end' }, barValue: { color: '#829687', fontSize: 7, lineHeight: 12, marginBottom: 5 }, barTrack: { height: 82, width: '72%', borderRadius: 7, backgroundColor: '#15251a', justifyContent: 'flex-end', overflow: 'hidden' }, bar: { width: '100%', minHeight: 2, borderRadius: 7, backgroundColor: '#54d983' }, dayLabel: { color: '#8fa594', fontSize: 8, lineHeight: 14, marginTop: 6 }, statsRow: { flexDirection: 'row', gap: 12, marginTop: 13, paddingTop: 13, borderTopWidth: 1, borderTopColor: '#203a29' }, stat: { flex: 1 }, statValue: { color: '#dcebe0', fontSize: 15, lineHeight: 20, fontWeight: '600' }, statLabel: { color: '#829687', fontSize: 9, lineHeight: 14, marginTop: 3 },
  permissionCard: { borderRadius: 15, borderWidth: 1, borderColor: '#3c3928', backgroundColor: '#19180f', padding: 13, gap: 9, marginBottom: 12 }, permissionCopy: { flex: 1 }, cardTitle: { color: '#eaf4ec', fontSize: 12, lineHeight: 17, fontWeight: '600' }, cardBody: { color: '#9cad9f', fontSize: 10, lineHeight: 15, marginTop: 3 }, outlineButton: { alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 8, borderWidth: 1, borderColor: '#48513b', borderRadius: 10 }, outlineText: { color: '#d9e8dc', fontSize: 10, fontWeight: '600' },
  primaryButton: { minHeight: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 13, backgroundColor: '#61e894', padding: 12, marginBottom: 12 }, primaryText: { color: '#07150b', fontSize: 12, fontWeight: '700' }, disabled: { opacity: 0.55 }, error: { color: '#ff9b9b', fontSize: 11, lineHeight: 17, marginBottom: 10 }, deleteButton: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', paddingVertical: 10, marginBottom: 6 }, deleteText: { color: '#ff9b9b', fontSize: 10, fontWeight: '600' }, noteCard: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, borderRadius: 13, borderWidth: 1, borderColor: '#1d3927', backgroundColor: '#0b1710', padding: 12 }, note: { flex: 1, color: '#8fa594', fontSize: 10, lineHeight: 16 },
});
