import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { apiFetch } from '../api';

export function EnvironmentScreen() {
  const [weather, setWeather] = useState<any>(null);
  const [plan, setPlan] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function load() {
    setBusy(true);
    try {
      const w = await apiFetch<{ weather: any }>('/environment/weather?lat=37.77&lon=-122.42');
      setWeather(w.weather);
      const p = await apiFetch<{ plan: string }>('/environment/plan', { method: 'POST', body: JSON.stringify({ weather: w.weather, steps: 0 }) });
      setPlan(p.plan);
    } catch (e) { setPlan(String(e)); }
    finally { setBusy(false); }
  }

  useEffect(() => { const timer = setTimeout(() => { void load(); }, 0); return () => clearTimeout(timer); }, []);

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Text style={styles.title}>Environment context</Text>
      {busy && <ActivityIndicator color="#61e894" />}
      {weather && <Text style={styles.body}>{JSON.stringify(weather.current ?? weather, null, 2)}</Text>}
      {plan && <Text style={styles.plan}>{plan}</Text>}
      <Pressable style={styles.button} onPress={load}><Text style={styles.buttonText}>Refresh</Text></Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 18, gap: 12 },
  title: { color: '#f0f8f2', fontSize: 24, fontWeight: '700' },
  body: { color: '#9cad9f', fontSize: 12 },
  plan: { color: '#dcebe0', fontSize: 13, lineHeight: 18 },
  button: { backgroundColor: '#61e894', padding: 12, borderRadius: 10, alignItems: 'center' },
  buttonText: { color: '#07150b', fontWeight: '700' },
});
