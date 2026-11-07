import { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Pedometer } from 'expo-sensors';
import { apiFetch } from '../api';

export function PedometerScreen() {
  const [steps, setSteps] = useState(0);
  const [available, setAvailable] = useState<boolean | null>(null);

  useEffect(() => {
    Pedometer.isAvailableAsync().then(setAvailable);
    const sub = Pedometer.watchStepCount((r) => setSteps(r.steps));
    return () => sub && sub.remove();
  }, []);

  async function save() {
    try { await apiFetch('/data/health/activity', { method: 'POST', body: JSON.stringify({ days: [{ day: new Date().toISOString().split('T')[0], steps }] }) }); } catch {}
  }

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Text style={styles.title}>Pedometer</Text>
      <Text style={styles.metric}>{steps}</Text>
      <Text style={styles.label}>steps today</Text>
      {available === false && <Text style={styles.note}>Pedometer not available on this device.</Text>}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 18, gap: 12, alignItems: 'center' },
  title: { color: '#f0f8f2', fontSize: 24, fontWeight: '700' },
  metric: { color: '#61e894', fontSize: 48, fontWeight: '700' },
  label: { color: '#9cad9f', fontSize: 13 },
  note: { color: '#ff929d', fontSize: 11 },
});
