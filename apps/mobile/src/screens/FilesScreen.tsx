import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { apiFetch, isApiConfigured } from '../api';

interface StoredDocument { id: string; title: string; content: string; created_at?: string }
type SearchMode = 'keyword' | 'semantic';

function formatDate(iso?: string): string {
  if (!iso) return '';
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? '' : date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export function FilesScreen() {
  const [documents, setDocuments] = useState<StoredDocument[]>([]);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [query, setQuery] = useState('');
  const [mode, setMode] = useState<SearchMode>('semantic');
  const [searchResults, setSearchResults] = useState<StoredDocument[] | null>(null);
  const [adding, setAdding] = useState(false);
  const [searching, setSearching] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(isApiConfigured ? null : 'Connect the LIFEOS service to use private data search.');
  const [summary, setSummary] = useState<{ id: string; text: string } | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!isApiConfigured) { setLoading(false); return; }
    try {
      const d = await apiFetch<{ documents: StoredDocument[] }>('/documents/search?q=');
      setDocuments(d.documents ?? []);
      setError(null);
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not load documents.'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { const timer = setTimeout(() => { void load(); }, 0); return () => clearTimeout(timer); }, [load]);

  async function addDocument() {
    const t = title.trim(); const c = content.trim();
    if (!c || adding) return;
    setAdding(true); setError(null);
    try {
      await apiFetch<{ id: string }>('/documents', { method: 'POST', body: JSON.stringify({ title: t || 'Untitled note', content: c }) });
      setTitle(''); setContent(''); await load();
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not save the document.'); }
    finally { setAdding(false); }
  }

  return <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
    <Text style={styles.eyebrow}>PRIVATE DATA SEARCH</Text>
    <Text style={styles.title}>Documents</Text>
    <Text style={styles.subtitle}>Save personal documents and search them with keywords or meaning-based (semantic) search.</Text>

    <View style={styles.addRow}>
      <TextInput style={styles.input} placeholder="Title" placeholderTextColor="#6c7f70" value={title} onChangeText={setTitle} maxLength={120} />
    </View>
    <TextInput style={[styles.input, styles.contentInput]} placeholder="Paste or write the document content…" placeholderTextColor="#6c7f70" value={content} onChangeText={setContent} multiline maxLength={8000} />
    <Pressable accessibilityRole="button" onPress={() => void addDocument()} disabled={adding || !content.trim()} style={[styles.primaryButton, (adding || !content.trim()) && styles.disabled]}>
      {adding ? <ActivityIndicator color="#07150b" size="small" /> : <Text style={styles.primaryText}>Save document</Text>}
    </Pressable>

    <View style={styles.searchRow}>
      <TextInput style={styles.input} placeholder="Search your documents…" placeholderTextColor="#6c7f70" value={query} onChangeText={setQuery} onSubmitEditing={() => void runSearch()} maxLength={300} />
      <Pressable accessibilityRole="button" onPress={() => void runSearch()} disabled={searching || !query.trim()} style={[styles.searchButton, (searching || !query.trim()) && styles.disabled]}>
        {searching ? <ActivityIndicator color="#07150b" size="small" /> : <Ionicons name="search" size={18} color={query.trim() ? '#07150b' : '#57705f'} />}
      </Pressable>
    </View>
    <View style={styles.modeRow}>
      <ModeChip active={mode === 'semantic'} label="Semantic" onPress={() => setMode('semantic')} />
      <ModeChip active={mode === 'keyword'} label="Keyword" onPress={() => setMode('keyword')} />
    </View>

    {error && <Text accessibilityRole="alert" style={styles.error}>{error}</Text>}
    {loading && <ActivityIndicator color="#61e894" style={styles.spinner} />}

    {searchResults !== null && <>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>{searchResults.length > 0 ? `Results (${searchResults.length})` : 'No matching documents'}</Text>
        <Pressable accessibilityRole="button" onPress={() => { setSearchResults(null); setQuery(''); }}><Text style={styles.clearText}>Clear</Text></Pressable>
      </View>
    </>}

    {(searchResults ?? documents).map((doc) => {
      const open = openId === doc.id;
      return (
        <View key={doc.id} style={styles.docCard}>
          <Pressable accessibilityRole="button" onPress={() => setOpenId(open ? null : doc.id)} style={styles.docTop}>
            <View style={styles.docIcon}><Ionicons name="document-text-outline" size={16} color="#72df98" /></View>
            <View style={styles.docCopy}>
              <Text style={styles.docTitle} numberOfLines={1}>{doc.title}</Text>
              <Text style={styles.docDate}>{formatDate(doc.created_at)}{doc.content ? ` · ${doc.content.length.toLocaleString()} chars` : ''}</Text>
            </View>
            <Ionicons name={open ? 'chevron-down-outline' : 'chevron-forward-outline'} size={14} color="#61e894" />
          </Pressable>
          {open && <>
            <Text style={styles.docContent}>{doc.content}</Text>
            <Pressable accessibilityRole="button" onPress={() => void summarizeDoc(doc)} style={styles.outlineButton}>
              <Ionicons name="sparkles-outline" size={13} color="#84f6b0" /><Text style={styles.outlineText}>Summarize</Text>
            </Pressable>
            {summary?.id === doc.id && <View style={styles.summaryBox}><Text style={styles.summaryText}>{summary.text}</Text></View>}
          </>}
        </View>
      );
    })}

    {!loading && documents.length === 0 && searchResults === null && <View style={styles.emptyCard}>
      <Ionicons name="documents-outline" size={17} color="#72df98" />
      <Text style={styles.emptyText}>No documents yet. Saved notes appear here and become searchable.</Text>
    </View>}
  </ScrollView>;

  async function runSearch() {
    const q = query.trim();
    if (!q || searching) return;
    setSearching(true); setError(null); setSummary(null);
    try {
      const path = mode === 'semantic' ? `/documents/semantic?q=${encodeURIComponent(q)}` : `/documents/fts?q=${encodeURIComponent(q)}`;
      const d = await apiFetch<{ documents: StoredDocument[] }>(path);
      setSearchResults(d.documents ?? []);
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Search failed. Try again.'); }
    finally { setSearching(false); }
  }

  async function summarizeDoc(doc: StoredDocument) {
    setError(null);
    try {
      const r = await apiFetch<{ summary?: unknown }>('/documents/summarize', { method: 'POST', body: JSON.stringify({ content: doc.content }) });
      if (typeof r.summary !== 'string') throw new Error('Summarization returned an unexpected response.');
      setSummary({ id: doc.id, text: r.summary });
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not summarize this document.'); }
  }
}

function ModeChip({ active, label, onPress }: { active: boolean; label: string; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" accessibilityState={{ selected: active }} onPress={onPress} style={[styles.modeChip, active && styles.modeChipActive]}>
      <Text style={[styles.modeChipText, active && styles.modeChipTextActive]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#06100b' },
  content: { padding: 18, paddingBottom: 32, maxWidth: 720, width: '100%', alignSelf: 'center', gap: 12 },
  eyebrow: { color: '#78d99a', fontSize: 9, letterSpacing: 1.3, fontWeight: '700' },
  title: { color: '#f0f8f2', fontSize: 28, fontWeight: '700', lineHeight: 35 },
  subtitle: { color: '#9cad9f', fontSize: 12, lineHeight: 19, marginTop: 4 },
  addRow: { gap: 8, marginTop: 4 },
  input: { minHeight: 44, borderRadius: 12, borderWidth: 1, borderColor: '#244a32', backgroundColor: '#0d1b12', color: '#eaf4ec', paddingHorizontal: 12, fontSize: 13 },
  contentInput: { minHeight: 96, textAlignVertical: 'top', paddingTop: 12 },
  primaryButton: { minHeight: 46, borderRadius: 12, backgroundColor: '#61e894', alignItems: 'center', justifyContent: 'center' },
  primaryText: { color: '#07150b', fontSize: 13, fontWeight: '700' },
  disabled: { opacity: 0.5 },
  searchRow: { flexDirection: 'row', gap: 8, marginTop: 6 },
  searchButton: { width: 44, height: 44, borderRadius: 12, backgroundColor: '#61e894', alignItems: 'center', justifyContent: 'center' },
  modeRow: { flexDirection: 'row', gap: 8 },
  modeChip: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, borderWidth: 1, borderColor: '#2b5c3e', backgroundColor: '#102418' },
  modeChipActive: { backgroundColor: '#61e894', borderColor: '#61e894' },
  modeChipText: { color: '#9cad9f', fontSize: 11, fontWeight: '600' },
  modeChipTextActive: { color: '#07150b', fontWeight: '700' },
  error: { color: '#ff9b9b', fontSize: 11, lineHeight: 17 },
  spinner: { marginVertical: 8 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 },
  sectionTitle: { color: '#eaf4ec', fontSize: 15, fontWeight: '600' },
  clearText: { color: '#71df98', fontSize: 11, fontWeight: '600' },
  docCard: { padding: 13, borderRadius: 14, backgroundColor: '#0c1910', borderWidth: 1, borderColor: '#1d3927' },
  docTop: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  docIcon: { width: 30, height: 30, borderRadius: 10, backgroundColor: '#153b24', alignItems: 'center', justifyContent: 'center' },
  docCopy: { flex: 1, minWidth: 0 },
  docTitle: { color: '#eaf4ec', fontSize: 13, fontWeight: '600' },
  docDate: { color: '#829687', fontSize: 9, marginTop: 2 },
  docContent: { color: '#b9cbbd', fontSize: 11, lineHeight: 17, marginTop: 10 },
  outlineButton: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', paddingHorizontal: 11, paddingVertical: 7, marginTop: 10, borderRadius: 9, borderWidth: 1, borderColor: '#35774d', backgroundColor: '#132c1d' },
  outlineText: { color: '#84f6b0', fontSize: 11, fontWeight: '700' },
  summaryBox: { marginTop: 10, padding: 11, borderRadius: 10, backgroundColor: '#102418', borderWidth: 1, borderColor: '#2c6742' },
  summaryText: { color: '#dcebe0', fontSize: 11, lineHeight: 17 },
  emptyCard: { flexDirection: 'row', alignItems: 'center', gap: 9, borderRadius: 14, borderWidth: 1, borderColor: '#1d3927', backgroundColor: '#0b1710', padding: 14 },
  emptyText: { flex: 1, color: '#8fa594', fontSize: 11, lineHeight: 17 },
});
