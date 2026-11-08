import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { apiFetch, isApiConfigured } from '../api';

interface VoiceNote { id: string; transcript: string; created_at: string }

function formatDate(iso: string): string {
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? '' : date.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export function VoiceScreen() {
  const [recording, setRecording] = useState<RecordingLike | null>(null);
  const [transcript, setTranscript] = useState('');
  const [notes, setNotes] = useState<VoiceNote[]>([]);
  const [summary, setSummary] = useState('');
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(isApiConfigured ? null : 'Connect the LIFEOS service to sync voice notes.');

  const loadNotes = useCallback(async () => {
    if (!isApiConfigured) { setLoading(false); return; }
    try { const d = await apiFetch<{ notes: VoiceNote[] }>('/voice/notes'); setNotes(d.notes ?? []); setError(null); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not load voice notes.'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { const timer = setTimeout(() => { if (isApiConfigured) void loadNotes(); }, 0); return () => clearTimeout(timer); }, [loadNotes]);

  useEffect(() => { void start(); }, []);

  async function start() {
    setError(null);
    if (!Audio) { setError('Audio recording needs a development build with expo-av.'); return; }
    try {
      const perm = await Audio.requestPermissionsAsync();
      if (!perm.granted) { setError('Microphone access is required to record.'); return; }
      await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
      const rec = new Audio.Recording();
      await rec.prepareToRecordAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
      await rec.startAsync();
      setRecording(rec);
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not start recording.'); }
  }

  async function stop() {
    if (!recording || busy) return;
    setBusy(true); setError(null); setTranscript('');
    try {
      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();
      setRecording(null);
      if (!uri) throw new Error('Recording produced no audio file.');
      const res = await fetch(uri);
      const blob = await res.blob();
      if (blob.size > 24_000_000) throw new Error('Recording is too large. Keep clips under a few minutes.');
      const b64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => { const result = reader.result; if (typeof result === 'string') resolve(result.split(',')[1] ?? ''); else reject(new Error('Could not read the recording.')); };
        reader.onerror = () => reject(new Error('Could not read the recording.'));
        reader.readAsDataURL(blob);
      });
      const t = await apiFetch<{ text?: unknown }>('/voice/transcribe', { method: 'POST', body: JSON.stringify({ audio: b64 }) });
      if (typeof t.text !== 'string') throw new Error('Transcription returned an unexpected response.');
      setTranscript(t.text);
      await apiFetch('/voice/notes', { method: 'POST', body: JSON.stringify({ transcript: t.text }) });
      await loadNotes();
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not transcribe the recording.'); }
    finally { setBusy(false); }
  }

  async function summarize() {
    if (busy || notes.length === 0) return;
    setBusy(true); setSummary('');
    try {
      const r = await apiFetch<{ summary?: unknown }>('/voice/summarize', { method: 'POST', body: JSON.stringify({ transcripts: notes.slice(0, 20).map((n) => n.transcript) }) });
      if (typeof r.summary !== 'string') throw new Error('Summarization returned an unexpected response.');
      setSummary(r.summary);
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not summarize the notes.'); }
    finally { setBusy(false); }
  }

  return <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
    <Text style={styles.eyebrow}>VOICE INTELLIGENCE</Text>
    <Text style={styles.title}>Spoken notes</Text>
    <Text style={styles.subtitle}>Record a thought, transcribe it, and keep it in your searchable notes.</Text>

    <Pressable accessibilityRole="button" onPress={recording ? () => void stop() : () => void start()} disabled={busy} style={[styles.recordButton, recording && styles.recordingActive, busy && styles.disabled]}>
      <Ionicons name={recording ? 'stop' : 'mic'} size={20} color={recording ? '#ff9b9b' : '#07150b'} />
      <Text style={[styles.recordText, recording && { color: '#ff9b9b' }]}>{busy ? 'Working…' : recording ? 'Stop & transcribe' : 'Record'}</Text>
      {recording && <View style={styles.pulse} />}
    </Pressable>

    {error && <Text accessibilityRole="alert" style={styles.error}>{error}</Text>}
    {transcript ? <View style={styles.transcriptCard}><Text style={styles.transcriptLabel}>TRANSCRIPT</Text><Text style={styles.transcript}>{transcript}</Text></View> : null}

    {loading && <ActivityIndicator color="#61e894" style={styles.spinner} />}
    {!loading && notes.length > 0 && <>
      <View style={styles.notesHeader}><Text style={styles.sectionTitle}>Saved notes ({notes.length})</Text>
        <Pressable accessibilityRole="button" onPress={() => void summarize()} disabled={busy} style={styles.outlineButton}><Text style={styles.outlineText}>Summarize</Text></Pressable>
      </View>
      {summary ? <View style={styles.transcriptCard}><Text style={styles.transcriptLabel}>SUMMARY</Text><Text style={styles.transcript}>{summary}</Text></View> : null}
      {notes.map((note) => <View key={note.id} style={styles.noteCard}><Text style={styles.noteDate}>{formatDate(note.created_at)}</Text><Text style={styles.noteText}>{note.transcript}</Text></View>)}
    </>}
    {!loading && notes.length === 0 && !loading && <View style={styles.emptyCard}><Ionicons name="mic-outline" size={17} color="#72df98" /><Text style={styles.emptyText}>No saved notes yet. Your first recording will appear here.</Text></View>}
  </ScrollView>;
}

type RecordingLike = { prepareToRecordAsync: (options: Record<string, unknown>) => Promise<void>; startAsync: () => Promise<void>; stopAndUnloadAsync: () => Promise<void>; getURI: () => string | null };
const Audio: { requestPermissionsAsync: () => Promise<{ granted: boolean }>; setAudioModeAsync: (mode: Record<string, boolean>) => Promise<void>; Recording: new () => RecordingLike; RecordingOptionsPresets: { HIGH_QUALITY: Record<string, unknown> } } | null = (() => { try { return require('expo-av').Audio; } catch { return null; } })();

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#06100b' },
  content: { padding: 18, paddingBottom: 32, maxWidth: 720, width: '100%', alignSelf: 'center', gap: 12 },
  eyebrow: { color: '#78d99a', fontSize: 9, letterSpacing: 1.3, fontWeight: '700' },
  title: { color: '#f0f8f2', fontSize: 28, fontWeight: '700', lineHeight: 35 },
  subtitle: { color: '#9cad9f', fontSize: 12, lineHeight: 19, marginTop: 4 },
  recordButton: { minHeight: 50, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9, borderRadius: 13, backgroundColor: '#61e894', padding: 12, marginTop: 6 },
  recordingActive: { backgroundColor: '#23150f', borderWidth: 1, borderColor: '#5c3428' },
  recordText: { color: '#07150b', fontSize: 13, fontWeight: '700' },
  pulse: { width: 9, height: 9, borderRadius: 5, backgroundColor: '#ff9b9b' },
  disabled: { opacity: 0.55 },
  error: { color: '#ff9b9b', fontSize: 11, lineHeight: 17 },
  transcriptCard: { borderRadius: 14, borderWidth: 1, borderColor: '#244a32', backgroundColor: '#0d1b12', padding: 14 },
  transcriptLabel: { color: '#73f5a8', fontSize: 9, fontWeight: '700', letterSpacing: 1, marginBottom: 6 },
  transcript: { color: '#eaf4ec', fontSize: 13, lineHeight: 20 },
  spinner: { marginVertical: 10 },
  notesHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 },
  sectionTitle: { color: '#eaf4ec', fontSize: 15, fontWeight: '600' },
  outlineButton: { paddingHorizontal: 12, paddingVertical: 8, borderWidth: 1, borderColor: '#35774d', borderRadius: 10, backgroundColor: '#132c1d' },
  outlineText: { color: '#84f6b0', fontSize: 11, fontWeight: '700' },
  noteCard: { padding: 13, borderRadius: 13, backgroundColor: '#0c1910', borderWidth: 1, borderColor: '#1d3927' },
  noteDate: { color: '#829687', fontSize: 9, marginBottom: 5 },
  noteText: { color: '#dcebe0', fontSize: 12, lineHeight: 18 },
  emptyCard: { flexDirection: 'row', alignItems: 'center', gap: 9, borderRadius: 14, borderWidth: 1, borderColor: '#1d3927', backgroundColor: '#0b1710', padding: 14 },
  emptyText: { flex: 1, color: '#8fa594', fontSize: 11, lineHeight: 17 },
});
