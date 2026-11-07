import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
let Audio: any = null;
try { Audio = require('expo-av').Audio; } catch { Audio = null; }
import { apiFetch } from '../api';

export function VoiceScreen() {
  const [recording, setRecording] = useState<any>(null);
  const [transcript, setTranscript] = useState('');
  const [busy, setBusy] = useState(false);

  async function start() {
    if (!Audio) { setTranscript('expo-av not available; use a dev build'); return; }
    const perm = await Audio.requestPermissionsAsync();
    if (!perm.granted) return;
    await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
    const rec = new Audio.Recording();
    await rec.prepareToRecordAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
    await rec.startAsync();
    setRecording(rec);
  }

  async function stop() {
    if (!recording) return;
    setBusy(true);
    try {
      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();
      setRecording(null);
      if (!uri) return;
      const res = await fetch(uri);
      const blob = await res.blob();
      const reader = new FileReader();
      reader.onloadend = async () => {
        const b64 = (reader.result as string).split(',')[1];
        try {
          const t = await apiFetch<{ text: string }>('/voice/transcribe', { method: 'POST', body: JSON.stringify({ audio: b64 }) });
          setTranscript(t.text);
          await apiFetch('/voice/notes', { method: 'POST', body: JSON.stringify({ transcript: t.text }) });
        } catch (e) { setTranscript(String(e)); }
        finally { setBusy(false); }
      };
      reader.readAsDataURL(blob);
    } catch (e) { setTranscript(String(e)); setBusy(false); }
  }

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Text style={styles.title}>Voice intelligence</Text>
      <Pressable style={styles.button} onPress={recording ? stop : start} disabled={busy}>
        {busy ? <ActivityIndicator color="#07150b" /> : <Text style={styles.buttonText}>{recording ? 'Stop & Transcribe' : 'Record'}</Text>}
      </Pressable>
      {transcript ? <Text style={styles.result}>{transcript}</Text> : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 18, gap: 12 },
  title: { color: '#f0f8f2', fontSize: 24, fontWeight: '700' },
  button: { backgroundColor: '#61e894', padding: 12, borderRadius: 10, alignItems: 'center' },
  buttonText: { color: '#07150b', fontWeight: '700' },
  result: { color: '#dcebe0', fontSize: 13, lineHeight: 18 },
});
