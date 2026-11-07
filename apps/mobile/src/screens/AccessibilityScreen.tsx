import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import * as Speech from 'expo-speech';
import { apiFetch } from '../api';

export function AccessibilityScreen() {
  const [text, setText] = useState('');
  const [simplified, setSimplified] = useState('');
  const [busy, setBusy] = useState(false);

  async function simplify() {
    setBusy(true);
    try {
      const r = await apiFetch<{ simplified: string }>('/accessibility/simplify', { method: 'POST', body: JSON.stringify({ text }) });
      setSimplified(r.simplified);
    } catch (e) { setSimplified(String(e)); }
    finally { setBusy(false); }
  }

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Text style={styles.title}>Accessibility companion</Text>
      <TextInput value={text} onChangeText={setText} multiline placeholder="Paste text to simplify" placeholderTextColor="#71877a" style={styles.input} />
      <Pressable style={styles.button} onPress={simplify} disabled={busy || !text.trim()}>
        {busy ? <ActivityIndicator color="#07150b" /> : <Text style={styles.buttonText}>Simplify</Text>}
      </Pressable>
      {simplified ? <>
        <Text style={styles.result}>{simplified}</Text>
        <Pressable style={styles.speak} onPress={() => Speech.speak(simplified)}><Text style={styles.speakText}>🔊 Speak</Text></Pressable>
      </> : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 18, gap: 12 },
  title: { color: '#f0f8f2', fontSize: 24, fontWeight: '700' },
  input: { backgroundColor: '#0d1b12', color: '#f0f8f2', borderRadius: 10, padding: 12, minHeight: 100 },
  button: { backgroundColor: '#61e894', padding: 12, borderRadius: 10, alignItems: 'center' },
  buttonText: { color: '#07150b', fontWeight: '700' },
  result: { color: '#dcebe0', fontSize: 13, lineHeight: 18 },
  speak: { alignSelf: 'flex-start' },
  speakText: { color: '#61e894', fontSize: 12, fontWeight: '700' },
});
