import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Pedometer } from 'expo-sensors';
import { apiFetch } from '../api';
import type { DailyActivity } from '../api';

function localDayKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

/** True steps since local midnight (not the per-session count from watchStepCount). */
async function readTodaySteps(): Promise<number> {
  if (Platform.OS !== 'ios') throw new Error('Step history requires a development build on Android. On iPhone this works right away.');
  if (!await Pedometer.isAvailableAsync()) throw new Error('This device does not have a step counter.');
  const permission = await Pedometer.requestPermissionsAsync();
  if (!permission.granted) throw new Error('Allow Motion & Fitness access to read step totals.');
  const start = new Date(); start.setHours(0, 0, 0, 0);
  const result = await Pedometer.getStepCountAsync(start, new Date());
  return result.steps;
}

export function PedometerScreen() {
  const [steps, setSteps] = useState<number | null>(null);
  const [savedSteps, setSavedSteps] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    readTodaySteps()
      .then((value) => { if (active) setSteps(value); })
      .catch((cause) => { if (active) { setSteps(0); setError(cause instanceof Error ? cause.message : 'Could not read step totals.'); } });
    return () => { active = false; };
  }, []);

  /** Push the real day total to the workspace so the Health screen picks it up. */
  const sync = useCallback(async () => {
    if (busy) return;
    setBusy(true); setError(null);
    try {
      const today = await readTodaySteps();
      setSteps(today);
      const day = localDayKey(new Date());
      await apiFetch<{ days?: DailyActivity[] }>('/data/health/activity', { method: 'POST', body: JSON.stringify({ days: [{ day, steps: today }] }) });
      setSavedSteps(today);
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not sync step totals.'); }
    finally { setBusy(false); }
  }, [busy]);

  const live = steps !== null && (savedSteps === null || steps > savedSteps);

  return <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
    <Text style={styles.eyebrow}>DEVICE HEALTH</Text>
    <Text style={styles.title}>Pedometer</Text>
    {steps === null
      ? <ActivityIndicator color="#61e894" style={styles.loading} />
      : <>
        <View style={styles.card}>
          <View style={styles.summaryTop}><View style={styles.iconCircle}><Ionicons name="footsteps-outline" size={19} color="#76e69a" /></View><Text style={styles.sourceLabel}>IPHONE PEDOMETER</Text></View>
          <Text style={styles.metric}>{steps.toLocaleString()}</Text>
          <Text style={styles.label}>{live ? 'steps since midnight — live from this device' : `synced today — ${savedSteps?.toLocaleString()} steps saved`}</Text>
        </View>
        {error && <Text accessibilityRole="alert" style={styles.error}>{error}</Text>}
        <Pressable accessibilityRole="button" disabled={busy} onPress={() => void sync()} style={[styles.button, busy && styles.disabled]}>
          {busy ? <ActivityIndicator color="#07150b" /> : <><Ionicons name="sync-outline" size={17} color="#07150b" /><Text style={styles.buttonText}>{savedSteps === null ? 'Sync to LIFEOS' : 'Refresh and sync'}</Text></>}
        </Pressable>
        <View style={styles.noteCard}><Ionicons name="information-circle-outline" size={17} color="#72df98" /><Text style={styles.note}>Reads the step total from your iPhone only when you sync. The total updates in the Health screen and your LIFEOS workspace.</Text></View>
      </>}
  </ScrollView>;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#06100b' }, content: { padding: 18, paddingBottom: 32, gap: 12, maxWidth: 720, width: '100%', alignSelf: 'center' },
  eyebrow: { color: '#78d99a', fontSize: 9, letterSpacing: 1.3, fontWeight: '700', marginBottom: 7 }, title: { color: '#f0f8f2', fontSize: 28, lineHeight: 35, fontWeight: '700' },
  card: { borderRadius: 20, backgroundColor: '#0d1b12', borderColor: '#244a32', borderWidth: 1, padding: 16, alignItems: 'center' }, summaryTop: { flexDirection: 'row', alignItems: 'center', gap: 9, alignSelf: 'stretch' }, iconCircle: { width: 34, height: 34, borderRadius: 12, backgroundColor: '#153b24', alignItems: 'center', justifyContent: 'center' }, sourceLabel: { color: '#93a799', fontSize: 8, fontWeight: '700', letterSpacing: 1 },
  metric: { color: '#61e894', fontSize: 48, fontWeight: '700', marginTop: 14 }, label: { color: '#8fa594', fontSize: 11, marginTop: 2, textAlign: 'center' },
  loading: { marginVertical: 20 },
  error: { color: '#ff9b9b', fontSize: 11, lineHeight: 17 }, button: { minHeight: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 13, backgroundColor: '#61e894', padding: 12 }, buttonText: { color: '#07150b', fontSize: 12, fontWeight: '700' }, disabled: { opacity: 0.55 },
  noteCard: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, borderRadius: 13, borderWidth: 1, borderColor: '#1d3927', backgroundColor: '#0b1710', padding: 12 }, note: { flex: 1, color: '#8fa594', fontSize: 10, lineHeight: 16 },
});
