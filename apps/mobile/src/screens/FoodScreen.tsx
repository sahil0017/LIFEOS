import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Image, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { apiFetch, isApiConfigured } from '../api';

interface Meal { id: string; description: string; calories: number; protein_g?: number; carbs_g?: number; fat_g?: number; fiber_g?: number; created_at?: string }
interface Estimate { calories?: unknown; protein_g?: unknown; carbs_g?: unknown; fat_g?: unknown; fiber_g?: unknown; summary?: unknown }

function num(value: unknown): number | null { return typeof value === 'number' && Number.isFinite(value) ? value : null; }

export function FoodScreen() {
  const [image, setImage] = useState<string | null>(null);
  const [pendingEstimate, setPendingEstimate] = useState<Estimate | null>(null);
  const [description, setDescription] = useState('');
  const [meals, setMeals] = useState<Meal[]>([]);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(isApiConfigured ? null : 'Connect the LIFEOS service to sync meals.');

  const loadMeals = useCallback(async () => {
    if (!isApiConfigured) { setLoading(false); return; }
    try { const d = await apiFetch<{ meals: Meal[] }>('/meals'); setMeals(d.meals ?? []); setError(null); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not load meals.'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { const timer = setTimeout(() => { if (isApiConfigured) void loadMeals(); }, 0); return () => clearTimeout(timer); }, [loadMeals]);

  async function pick() {
    if (busy) return;
    setBusy(true); setError(null); setPendingEstimate(null);
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) throw new Error('Allow photo library access to pick a meal photo.');
      const r = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.7, base64: true });
      if (r.canceled || !r.assets?.[0]?.base64) return;
      const b64 = r.assets[0].base64;
      setImage(`data:image/jpeg;base64,${b64}`);
      const est = await apiFetch<{ estimate?: unknown }>('/food/estimate', { method: 'POST', body: JSON.stringify({ description: 'meal from photo' }) }).catch(() => null);
      const estimate = est && typeof est.estimate === 'object' && est.estimate !== null ? est.estimate as Estimate : null;
      if (estimate) setPendingEstimate(estimate);
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not process the meal photo.'); }
    finally { setBusy(false); }
  }

  async function saveMeal() {
    if (busy) return;
    setBusy(true); setError(null);
    try {
      const estimate = pendingEstimate ?? {};
      await apiFetch<{ id: string }>('/meals', {
        method: 'POST', body: JSON.stringify({
          description: description.trim() || 'Meal photo',
          calories: num(estimate.calories) ?? 0,
          protein_g: num(estimate.protein_g) ?? 0,
          carbs_g: num(estimate.carbs_g) ?? 0,
          fat_g: num(estimate.fat_g) ?? 0,
          fiber_g: num(estimate.fiber_g) ?? 0,
        })
      });
      setImage(null); setPendingEstimate(null); setDescription(''); await loadMeals();
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not save the meal.'); }
    finally { setBusy(false); }
  }

  async function quickAdd() {
    const text = description.trim();
    if (!text || busy) return;
    setBusy(true); setError(null);
    try {
      const est = await apiFetch<{ estimate?: unknown }>('/food/estimate', { method: 'POST', body: JSON.stringify({ description: text }) });
      const estimate = est && typeof est.estimate === 'object' && est.estimate !== null ? est.estimate as Estimate : null;
      if (!estimate) throw new Error('Estimation returned an unexpected response.');
      setPendingEstimate(estimate);
      if (num(estimate.calories) === null) throw new Error('The model could not estimate calories for that description.');
      await apiFetch<{ id: string }>('/meals', {
        method: 'POST', body: JSON.stringify({
          description: text,
          calories: num(estimate.calories) ?? 0,
          protein_g: num(estimate.protein_g) ?? 0,
          carbs_g: num(estimate.carbs_g) ?? 0,
          fat_g: num(estimate.fat_g) ?? 0,
          fiber_g: num(estimate.fiber_g) ?? 0,
        })
      });
      setDescription(''); await loadMeals();
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not estimate that meal.'); }
    finally { setBusy(false); }
  }

  const today = meals.slice(0, 10);
  const totalCalories = today.reduce((sum, m) => sum + (m.calories || 0), 0);
  const maxCalories = Math.max(1, ...today.map((m) => m.calories || 0));

  return <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
    <Text style={styles.eyebrow}>FOOD INTELLIGENCE</Text>
    <Text style={styles.title}>Meals & nutrition</Text>
    <Text style={styles.subtitle}>Log a meal by photo or description. Estimates are AI approximations, not measurements.</Text>

    <View style={styles.addRow}>
      <TextInput style={styles.input} placeholder="e.g. chicken rice bowl" placeholderTextColor="#6c7f70"
        value={description} onChangeText={setDescription} onSubmitEditing={() => void quickAdd()} maxLength={200} />
      <Pressable accessibilityRole="button" onPress={() => void quickAdd()} disabled={busy || !description.trim()} style={[styles.addButton, (busy || !description.trim()) && styles.disabled]}>
        {busy ? <ActivityIndicator color="#07150b" size="small" /> : <Ionicons name="add" size={20} color={description.trim() ? '#07150b' : '#57705f'} />}
      </Pressable>
    </View>

    <Pressable accessibilityRole="button" onPress={() => void pick()} disabled={busy} style={[styles.photoButton, busy && styles.disabled]}>
      <Ionicons name="camera-outline" size={17} color="#84f6b0" /><Text style={styles.photoText}>Pick a meal photo instead</Text>
    </Pressable>

    {image && <View style={styles.pendingCard}>
      <Image source={{ uri: image }} style={styles.image} />
      {pendingEstimate && <View style={styles.estimateRow}>
        <Stat label="kcal" value={num(pendingEstimate.calories)} /><Stat label="protein" value={num(pendingEstimate.protein_g)} unit="g" />
        <Stat label="carbs" value={num(pendingEstimate.carbs_g)} unit="g" /><Stat label="fat" value={num(pendingEstimate.fat_g)} unit="g" />
      </View>}
      <TextInput style={styles.input} placeholder="Describe this meal (optional)" placeholderTextColor="#6c7f70" value={description} onChangeText={setDescription} maxLength={200} />
      <Pressable accessibilityRole="button" onPress={() => void saveMeal()} disabled={busy} style={styles.saveButton}><Text style={styles.saveText}>Save meal to log</Text></Pressable>
    </View>}

    {error && <Text accessibilityRole="alert" style={styles.error}>{error}</Text>}
    {loading && <ActivityIndicator color="#61e894" style={styles.spinner} />}

    {!loading && meals.length > 0 && <>
      <View style={styles.logHeader}><Text style={styles.sectionTitle}>Meal log ({meals.length})</Text><Text style={styles.logTotal}>Last {today.length}: {totalCalories.toLocaleString()} kcal</Text></View>
      <View style={styles.chart}>
        {today.slice().reverse().map((meal, index) => <View key={meal.id} style={styles.barColumn}>
          <View style={styles.barTrack}><View style={[styles.bar, { height: `${Math.max(meal.calories ? 6 : 0, ((meal.calories || 0) / maxCalories) * 100)}%` }]} /></View>
          <Text style={styles.barLabel}>{index + 1}</Text>
        </View>)}
      </View>
      {meals.slice(0, 8).map((meal) => <View key={meal.id} style={styles.mealRow}>
        <Text style={styles.mealDescription} numberOfLines={1}>{meal.description || 'Meal'}</Text>
        <Text style={styles.mealCal}>{(meal.calories || 0).toLocaleString()} kcal</Text>
      </View>)}
    </>}
    {!loading && meals.length === 0 && <View style={styles.emptyCard}><Ionicons name="nutrition-outline" size={17} color="#72df98" /><Text style={styles.emptyText}>No meals logged yet.</Text></View>}
  </ScrollView>;
}

function Stat({ label, value, unit = '' }: { label: string; value: number | null; unit?: string }) {
  return <View style={styles.stat}><Text style={styles.statValue}>{value === null ? '—' : `${Math.round(value)}${unit}`}</Text><Text style={styles.statLabel}>{label}</Text></View>;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#06100b' },
  content: { padding: 18, paddingBottom: 32, maxWidth: 720, width: '100%', alignSelf: 'center', gap: 12 },
  eyebrow: { color: '#78d99a', fontSize: 9, letterSpacing: 1.3, fontWeight: '700' },
  title: { color: '#f0f8f2', fontSize: 28, fontWeight: '700', lineHeight: 35 },
  subtitle: { color: '#9cad9f', fontSize: 12, lineHeight: 19, marginTop: 4 },
  addRow: { flexDirection: 'row', gap: 8, marginTop: 4 },
  input: { flex: 1, minHeight: 44, borderRadius: 12, borderWidth: 1, borderColor: '#244a32', backgroundColor: '#0d1b12', color: '#eaf4ec', paddingHorizontal: 12, fontSize: 13 },
  addButton: { width: 44, height: 44, borderRadius: 12, backgroundColor: '#61e894', alignItems: 'center', justifyContent: 'center' },
  disabled: { opacity: 0.5 },
  photoButton: { minHeight: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 12, borderWidth: 1, borderColor: '#35774d', backgroundColor: '#132c1d' },
  photoText: { color: '#84f6b0', fontSize: 12, fontWeight: '600' },
  pendingCard: { padding: 14, borderRadius: 16, backgroundColor: '#0d1b12', borderWidth: 1, borderColor: '#244a32', gap: 10 },
  image: { width: '100%', height: 220, borderRadius: 12 },
  estimateRow: { flexDirection: 'row', gap: 10 },
  stat: { flex: 1, alignItems: 'center' },
  statValue: { color: '#61e894', fontSize: 15, fontWeight: '700' },
  statLabel: { color: '#829687', fontSize: 9, marginTop: 2 },
  saveButton: { minHeight: 46, borderRadius: 12, backgroundColor: '#61e894', alignItems: 'center', justifyContent: 'center' },
  saveText: { color: '#07150b', fontSize: 13, fontWeight: '700' },
  error: { color: '#ff9b9b', fontSize: 11, lineHeight: 17 },
  spinner: { marginVertical: 10 },
  logHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 },
  sectionTitle: { color: '#eaf4ec', fontSize: 15, fontWeight: '600' },
  logTotal: { color: '#8fa594', fontSize: 10 },
  chart: { flexDirection: 'row', alignItems: 'flex-end', gap: 6, height: 110 },
  barColumn: { flex: 1, height: '100%', alignItems: 'center', justifyContent: 'flex-end' },
  barTrack: { height: 84, width: '72%', borderRadius: 6, backgroundColor: '#15251a', justifyContent: 'flex-end', overflow: 'hidden' },
  bar: { width: '100%', minHeight: 2, borderRadius: 6, backgroundColor: '#54d983' },
  barLabel: { color: '#8fa594', fontSize: 8, marginTop: 4 },
  mealRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 9, paddingHorizontal: 12, borderRadius: 11, backgroundColor: '#0c1910', borderWidth: 1, borderColor: '#1d3927' },
  mealDescription: { flex: 1, color: '#dcebe0', fontSize: 12 },
  mealCal: { color: '#61e894', fontSize: 11, fontWeight: '600', marginLeft: 10 },
  emptyCard: { flexDirection: 'row', alignItems: 'center', gap: 9, borderRadius: 14, borderWidth: 1, borderColor: '#1d3927', backgroundColor: '#0b1710', padding: 14 },
  emptyText: { flex: 1, color: '#8fa594', fontSize: 11, lineHeight: 17 },
});
