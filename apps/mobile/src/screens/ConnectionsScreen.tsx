import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { contextTypes, moduleDefinitions } from '../context';
import type { SignalType } from '../context';

const sourceGlyphs: Record<string, keyof typeof Ionicons.glyphMap> = { calendar: 'calendar-outline', gmail: 'mail-outline', youtube: 'logo-youtube', apple_health: 'heart-outline', health_connect: 'fitness-outline', device_steps: 'footsteps-outline', food: 'restaurant-outline', finance: 'wallet-outline', files: 'documents-outline' };
type Source = { id: string; title: string; group: string; icon: string; status: string; signals: SignalType[]; description: string; note: string };
const sources: Source[] = [
  { id: 'calendar', title: 'Google Calendar', group: 'Google', icon: '▦', status: 'SETUP REQUIRED', signals: ['routines', 'goals', 'tasks'], description: 'Use your schedule to make plans that fit the time you actually have.', note: 'A future connector should request calendar read access only. It needs Google OAuth configuration.' },
  { id: 'gmail', title: 'Gmail', group: 'Google', icon: '✉', status: 'SETUP REQUIRED', signals: ['documents', 'tasks', 'preferences'], description: 'Find user-selected commitments, receipts or travel details in email.', note: 'Mail access is highly sensitive. Google classifies broad Gmail read access as restricted and may require app verification and a security assessment. Start with narrow, user-triggered search.' },
  { id: 'youtube', title: 'YouTube', group: 'Google', icon: '▷', status: 'LIMITED ACCESS', signals: ['interests', 'learning'], description: 'Connect opted-in learning interests and saved playlists.', note: 'The API is not a general viewing-history feed. Current API documentation notes that watch-history playlist requests return empty results. Do not promise watch-history analysis.' },
  { id: 'device_steps', title: 'iPhone step activity', group: 'Health', icon: '', status: 'AVAILABLE · IPHONE', signals: ['activity'], description: 'Connect real step totals from the iPhone pedometer, with a daily trend.', note: 'Reads the last seven days only when you request a refresh. Starts with iPhone motion data and does not track in the background.' },
  { id: 'apple_health', title: 'Apple Health', group: 'Health', icon: '♡', status: 'PLATFORM SETUP', signals: ['activity', 'wellbeing', 'nutrition'], description: 'Read selected activity, sleep and nutrition records stored on iPhone.', note: 'Requires a native iOS development build, HealthKit capability, purpose text and per-data-type permission.' },
  { id: 'health_connect', title: 'Health Connect', group: 'Health', icon: '✚', status: 'PLATFORM SETUP', signals: ['activity', 'wellbeing', 'nutrition'], description: 'Read selected health and fitness records shared on Android.', note: 'Requires an Android native integration, declared data-type permissions and a Health Connect permission flow.' },
  { id: 'food', title: 'Meals & nutrition', group: 'Food', icon: '◉', status: 'MANUAL FIRST', signals: ['nutrition', 'preferences', 'goals'], description: 'Start with meal notes or photos; connect nutrition data through supported health sources.', note: 'Food providers vary. Avoid importing accounts until a specific provider and its data scope are selected.' },
  { id: 'finance', title: 'Spending & income', group: 'Finance', icon: '₹', status: 'MANUAL FIRST', signals: ['goals', 'decisions', 'routines'], description: 'Compare a budget with goals and planned life changes.', note: 'Start with an on-device CSV import. Live account access depends on country, provider, consent rules and security requirements.' },
  { id: 'files', title: 'Documents on this device', group: 'Files', icon: '▤', status: 'PLANNED', signals: ['documents', 'goals', 'decisions'], description: 'Bring selected documents into the shared context for search.', note: 'The future file picker should import only the files a person selects and provide a delete control.' },
];

interface Props { onBack: () => void; onOpenHealth: () => void; }

export function ConnectionsScreen({ onBack, onOpenHealth }: Props) {
  const [selected, setSelected] = useState<string | null>(null);
  const chosen = sources.find((source) => source.id === selected);
  return <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
    <Pressable accessibilityRole="button" onPress={chosen ? () => setSelected(null) : onBack} style={styles.back}><Text style={styles.backText}>‹  {chosen ? 'All connections' : 'Modules'}</Text></Pressable>
    <Text style={styles.eyebrow}>PERSONAL CONTEXT · DATA CONNECTIONS</Text>
    <Text style={styles.title}>{chosen ? chosen.title : 'Choose what to connect.'}</Text>
    <Text style={styles.subtitle}>{chosen ? chosen.description : 'Every connection contributes specific signal types to one shared context. Modules use only the signals relevant to their job.'}</Text>

    {chosen ? <>
      <View style={styles.sourceHero}><View style={styles.sourceIcon}><Ionicons name={sourceGlyphs[chosen.id]} size={19} color="#72df98" /></View><Text style={styles.status}>{chosen.status}</Text><Text style={styles.sourceNote}>{chosen.note}</Text></View>
      {chosen.id === 'device_steps' && <Pressable accessibilityRole="button" onPress={onOpenHealth} style={styles.connectButton}><Text style={styles.connectButtonText}>Open activity setup  ↗</Text></Pressable>}
      <Text style={styles.sectionTitle}>What it could add</Text>
      <SignalFlow signals={chosen.signals} />
      <Text style={styles.sectionTitle}>Modules that can use these signals</Text>
      <View style={styles.moduleList}>{moduleDefinitions.filter((module) => module.reads.some((signal) => chosen.signals.includes(signal))).map((module) => <View key={module.id} style={styles.moduleItem}><Text style={styles.moduleIcon}>{module.icon}</Text><Text style={styles.moduleName}>{module.name}</Text><Text style={styles.moduleArrow}>↗</Text></View>)}</View>
    </> : <>
      <View style={styles.flowCard}>
        <Text style={styles.flowTitle}>ONE EVENT FLOW</Text>
        <View style={styles.flowNodes}><FlowNode label="SOURCE" /><Text style={styles.flowArrow}>→</Text><FlowNode label="SHARED SIGNAL" /><Text style={styles.flowArrow}>→</Text><FlowNode label="MODULES" /></View>
        <Text style={styles.flowNote}>A new connector defines which signal types it emits. Any module that reads those types becomes related automatically.</Text>
      </View>
      {['Google', 'Health', 'Food', 'Finance', 'Files'].map((group) => <View key={group} style={styles.group}><Text style={styles.groupTitle}>{group}</Text>{sources.filter((source) => source.group === group).map((source) => <Pressable key={source.id} accessibilityRole="button" onPress={() => setSelected(source.id)} style={styles.sourceCard}>
        <View style={styles.sourceIcon}><Ionicons name={sourceGlyphs[source.id]} size={18} color="#72df98" /></View><View style={styles.sourceCopy}><Text style={styles.sourceTitle}>{source.title}</Text><Text style={styles.sourceDesc}>{source.description}</Text><Text style={styles.signalPreview}>{source.signals.map((signal) => contextTypes.find((item) => item.id === signal)?.label).join(' · ')}</Text></View><Text style={styles.sourceArrow}>›</Text>
      </Pressable>)}</View>)}
    </>}
  </ScrollView>;
}

function SignalFlow({ signals }: { signals: SignalType[] }) { return <View style={styles.signalBox}><View style={styles.signalTags}>{signals.map((signal) => <Text key={signal} style={styles.signalTag}>{contextTypes.find((item) => item.id === signal)?.label}</Text>)}</View></View>; }
function FlowNode({ label }: { label: string }) { return <View style={styles.flowNode}><View style={styles.nodeIcon}><Text style={styles.nodeSpark}>✳</Text></View><Text style={styles.nodeLabel}>{label}</Text></View>; }

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#06100b' }, content: { padding: 18, paddingBottom: 30, maxWidth: 720, width: '100%', alignSelf: 'center' },
  back: { paddingVertical: 8, marginBottom: 15, alignSelf: 'flex-start' }, backText: { color: '#71df98', fontSize: 12, fontWeight: '600' }, eyebrow: { color: '#78d99a', fontSize: 9, fontWeight: '700', letterSpacing: 1.2, marginBottom: 7 }, title: { color: '#f0f8f2', fontSize: 27, lineHeight: 34, fontWeight: '700' }, subtitle: { color: '#9cad9f', fontSize: 12, lineHeight: 19, marginTop: 7, marginBottom: 17 },
  flowCard: { borderRadius: 17, backgroundColor: '#0d1b12', borderColor: '#244a32', borderWidth: 1, padding: 14, marginBottom: 19 }, flowTitle: { color: '#76dfa0', fontSize: 8, fontWeight: '700', letterSpacing: 1, marginBottom: 13 }, flowNodes: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 4 }, flowNode: { flex: 1, alignItems: 'center', gap: 5 }, nodeIcon: { width: 35, height: 35, borderRadius: 12, backgroundColor: '#153b24', alignItems: 'center', justifyContent: 'center' }, nodeSpark: { color: '#77e99a', fontSize: 15 }, nodeLabel: { color: '#a8baac', fontSize: 7, fontWeight: '700', letterSpacing: 0.4 }, flowArrow: { color: '#61e894', fontSize: 15 }, flowNote: { color: '#8fa594', fontSize: 10, lineHeight: 15, marginTop: 12 },
  group: { marginBottom: 17 }, groupTitle: { color: '#dcebe0', fontSize: 14, lineHeight: 20, fontWeight: '600', marginBottom: 8 }, sourceCard: { flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 14, backgroundColor: '#0c1910', borderColor: '#1d3927', borderWidth: 1, padding: 11, marginBottom: 7 }, sourceIcon: { width: 34, height: 34, borderRadius: 11, backgroundColor: '#153b24', alignItems: 'center', justifyContent: 'center' }, sourceIconText: { color: '#72df98', fontSize: 17 }, sourceCopy: { flex: 1, minWidth: 0 }, sourceTitle: { color: '#eaf4ec', fontSize: 12, lineHeight: 17, fontWeight: '600' }, sourceDesc: { color: '#8fa594', fontSize: 9, lineHeight: 14, marginTop: 3 }, signalPreview: { color: '#71df98', fontSize: 8, lineHeight: 12, marginTop: 6 }, sourceArrow: { color: '#7c9683', fontSize: 20 },
  connectButton: { minHeight: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 12, backgroundColor: '#61e894', marginBottom: 12 }, connectButtonText: { color: '#07150b', fontSize: 11, fontWeight: '700' }, sourceHero: { borderRadius: 17, backgroundColor: '#0d1b12', borderColor: '#244a32', borderWidth: 1, padding: 15, marginBottom: 20 }, status: { color: '#dfca7e', fontSize: 8, fontWeight: '700', letterSpacing: 0.8, marginTop: 13 }, sourceNote: { color: '#9cad9f', fontSize: 11, lineHeight: 17, marginTop: 8 }, sectionTitle: { color: '#eaf4ec', fontSize: 15, lineHeight: 21, fontWeight: '600', marginBottom: 9, marginTop: 13 }, signalBox: { borderRadius: 14, backgroundColor: '#0c1910', borderWidth: 1, borderColor: '#1d3927', padding: 12 }, signalTags: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 }, signalTag: { color: '#a3efb8', fontSize: 9, lineHeight: 13, backgroundColor: '#153b26', borderRadius: 10, overflow: 'hidden', paddingHorizontal: 8, paddingVertical: 5 }, moduleList: { gap: 7 }, moduleItem: { flexDirection: 'row', alignItems: 'center', gap: 9, padding: 10, borderRadius: 12, backgroundColor: '#0c1910', borderWidth: 1, borderColor: '#1d3927' }, moduleIcon: { color: '#72df98', fontSize: 14 }, moduleName: { flex: 1, color: '#dcebe0', fontSize: 11 }, moduleArrow: { color: '#61e894', fontSize: 13 },
});
