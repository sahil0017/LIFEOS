import { Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import type { PrivacyPreferences } from '../privacy';

interface Props {
  preferences: PrivacyPreferences;
  cameraGranted: boolean;
  cameraCanAskAgain: boolean;
  onToggle: (key: keyof PrivacyPreferences, enabled: boolean) => void;
  onRequestCamera: () => void;
}

export function PrivacyScreen(props: Props) {
  return <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
    <Text style={styles.eyebrow}>YOUR CONTROL CENTER</Text>
    <Text style={styles.title}>Privacy & permissions</Text>
    <Text style={styles.subtitle}>Choose what LIFEOS may use for each feature. All permissions start off and can be changed here.</Text>
    <View style={styles.flow}><Text style={styles.flowNode}>Your device</Text><Text style={styles.arrow}>→</Text><Text style={styles.flowNode}>Your choice</Text><Text style={styles.arrow}>→</Text><Text style={styles.flowNode}>A feature</Text></View>
    <Text style={styles.section}>AI features</Text>
    <Permission title="Personal assistant" detail="When you send a message, its text is processed to create a reply." value={props.preferences.assistantAi} onChange={(value) => props.onToggle('assistantAi', value)} />
    <Permission title="Personal context for Assistant" detail="Allow relevant saved routines, preferences, goals and notes to be selected for a request. Only the best matching notes are included." value={props.preferences.assistantContext} onChange={(value) => props.onToggle('assistantContext', value)} />
    <Permission title="Personal Twin insights" detail="When you request an update, selected observations, goals and scenario assumptions are analyzed." value={props.preferences.twinAi} onChange={(value) => props.onToggle('twinAi', value)} />
    <Permission title="Visual analysis" detail="When you tap Analyze, the selected photo and question are processed. Captured images remain stored in your LIFEOS workspace." value={props.preferences.visualAi} onChange={(value) => props.onToggle('visualAi', value)} />
    <Text style={styles.section}>Device permissions</Text>
    <Permission title="iPhone activity and step totals" detail="Allow LIFEOS to read up to seven days of step totals when you request a refresh. No background tracking." value={props.preferences.healthActivity} onChange={(value) => props.onToggle('healthActivity', value)} />
    <View style={styles.card}><View style={styles.row}><View style={styles.copy}><Text style={styles.cardTitle}>Camera</Text><Text style={styles.detail}>{props.cameraGranted ? 'Allowed. The camera opens only when you use Visual Intelligence.' : 'Needed to capture an image for Visual Intelligence.'}</Text></View><Text style={[styles.badge, props.cameraGranted && styles.enabled]}>{props.cameraGranted ? 'ALLOWED' : 'OFF'}</Text></View>
      {!props.cameraGranted && props.cameraCanAskAgain && <Pressable accessibilityRole="button" onPress={props.onRequestCamera} style={styles.button}><Text style={styles.buttonText}>Allow camera access</Text></Pressable>}
      {!props.cameraGranted && !props.cameraCanAskAgain && <Text style={styles.hint}>Enable camera access for LIFEOS in your device settings.</Text>}
    </View>
    <Text style={styles.section}>Where your information lives</Text>
    <View style={styles.card}><Text style={styles.cardTitle}>LIFEOS data workspace</Text><Text style={styles.detail}>Your goals, notes, scenarios, permissions and captured images are stored in your LIFEOS workspace. This build uses a private key kept on this device, so reinstalling or switching devices will not restore this workspace yet. Delete captured images from Visual Intelligence.</Text></View>
    <View style={styles.card}><Text style={styles.cardTitle}>Feature-by-feature control</Text><Text style={styles.detail}>Turning on a permission allows that feature to make a request when you use it. It does not run analysis in the background. Turn it off here at any time.</Text></View>
  </ScrollView>;
}

function Permission({ title, detail, value, onChange }: { title: string; detail: string; value: boolean; onChange: (value: boolean) => void }) {
  return <View style={styles.card}><View style={styles.row}><View style={styles.copy}><Text style={styles.cardTitle}>{title}</Text><Text style={styles.detail}>{detail}</Text></View><Switch value={value} onValueChange={onChange} trackColor={{ false: '#26372b', true: '#27764a' }} thumbColor={value ? '#8af3aa' : '#b9c9bd'} accessibilityLabel={`${title} permission`} /></View><Text style={[styles.badge, value && styles.enabled]}>{value ? 'ALLOWED WHEN YOU USE IT' : 'OFF'}</Text></View>;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#06100b' }, content: { padding: 19, paddingBottom: 40, maxWidth: 720, width: '100%', alignSelf: 'center' },
  eyebrow: { color: '#78d99a', fontSize: 10, fontWeight: '700', letterSpacing: 1.3, marginBottom: 7 }, title: { color: '#f0f8f2', fontSize: 28, lineHeight: 35, fontWeight: '700' }, subtitle: { color: '#9cad9f', fontSize: 13, lineHeight: 20, marginTop: 7, marginBottom: 17 },
  flow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 5, backgroundColor: '#0d1b12', borderColor: '#244a32', borderWidth: 1, borderRadius: 15, padding: 12 }, flowNode: { color: '#dcebe0', fontSize: 10, fontWeight: '600', textAlign: 'center', flex: 1 }, arrow: { color: '#61e894', fontSize: 15 },
  section: { color: '#eaf4ec', fontSize: 17, lineHeight: 23, fontWeight: '600', marginTop: 22, marginBottom: 9 }, card: { backgroundColor: '#0c1910', borderColor: '#1d3927', borderWidth: 1, borderRadius: 15, padding: 14, marginBottom: 9 }, row: { flexDirection: 'row', alignItems: 'center', gap: 10 }, copy: { flex: 1, minWidth: 0 }, cardTitle: { color: '#eaf4ec', fontSize: 13, lineHeight: 19, fontWeight: '600' }, detail: { color: '#8fa594', fontSize: 11, lineHeight: 17, marginTop: 4 }, badge: { alignSelf: 'flex-start', marginTop: 9, color: '#a4b1a7', fontSize: 8, lineHeight: 12, fontWeight: '700', letterSpacing: 0.5, backgroundColor: '#172019', borderRadius: 7, paddingHorizontal: 7, paddingVertical: 4 }, enabled: { color: '#8ee9aa', backgroundColor: '#153b26' }, button: { alignSelf: 'flex-start', marginTop: 12, borderRadius: 10, backgroundColor: '#61e894', paddingHorizontal: 13, paddingVertical: 10 }, buttonText: { color: '#07150b', fontSize: 11, fontWeight: '700' }, hint: { color: '#d0b56d', fontSize: 10, lineHeight: 15, marginTop: 9 },
});
