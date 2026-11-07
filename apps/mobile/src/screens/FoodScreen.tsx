import { useState, useEffect } from 'react';
import { ActivityIndicator, Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { saveCaptureRemote, apiFetch } from '../api';
import { BarChart } from 'react-native-chart-kit';
import { Dimensions } from 'react-native';

export function FoodScreen() {
  useEffect(() => { loadMeals(); }, []);
  const [image, setImage] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);
  const [meals, setMeals] = useState<{calories:number}[]>([]);
  async function loadMeals() { try { const d = await apiFetch<{meals:{calories:number}[]}>('/meals'); setMeals(d.meals ?? []); } catch {} }
  const [busy, setBusy] = useState(false);

  async function pick() {
    const r = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.7, base64: true });
    if (r.canceled || !r.assets?.[0]?.base64) return;
    const b64 = r.assets[0].base64;
    setImage(`data:image/jpeg;base64,${b64}`);
    setBusy(true);
    setResult(null);
    try {
      await saveCaptureRemote({ id: `meal_${Date.now()}`, question: 'Estimate nutrition for this meal', image: b64, imagePreview: b64 });
      try { const est = await apiFetch<{estimate:any}>('/food/estimate', { method:'POST', body: JSON.stringify({ description: 'meal from photo' }) }); setResult(JSON.stringify(est.estimate)); } catch { setResult('Meal captured.'); }
    } catch (e) {
      setResult(String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Text style={styles.title}>Food intelligence</Text>
      <Text style={styles.subtitle}>Snap a meal photo for nutrition estimates.</Text>
      <Pressable style={styles.button} onPress={pick} disabled={busy}>
        {busy ? <ActivityIndicator color="#07150b" /> : <Text style={styles.buttonText}>Pick meal photo</Text>}
      </Pressable>
      {image && <Image source={{ uri: image }} style={styles.image} />}
      {meals.length > 0 && <BarChart data={{labels: meals.map((_,i)=>String(i+1)), datasets:[{data: meals.map(m=>m.calories||0)}]}} width={Dimensions.get('window').width-36} height={180} yAxisLabel='' yAxisSuffix='kcal' chartConfig={{backgroundColor:'#06100b',backgroundGradientFrom:'#06100b',backgroundGradientTo:'#06100b',color:(o=1)=>`rgba(97,232,148,${o})`,labelColor:(o=1)=>`rgba(156,173,159,${o})`}} style={{borderRadius:12}} />}
      {result && <Text style={styles.result}>{result}</Text>}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 18, gap: 12 },
  title: { color: '#f0f8f2', fontSize: 24, fontWeight: '700' },
  subtitle: { color: '#9cad9f', fontSize: 13 },
  button: { backgroundColor: '#61e894', padding: 12, borderRadius: 10, alignItems: 'center' },
  buttonText: { color: '#07150b', fontWeight: '700' },
  image: { width: '100%', height: 240, borderRadius: 12 },
  result: { color: '#dcebe0', fontSize: 12 },
});
