import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { PermissionDefinition, PermissionKey, PrivacyPreferences } from '../privacy';
import { PERMISSION_GROUPS, PERMISSIONS } from '../privacy';

type NativePermissionState = { granted: boolean; canAskAgain: boolean; available?: boolean } | null;

interface Props {
  preferences: PrivacyPreferences;
  camera: NativePermissionState;
  microphone: NativePermissionState;
  motion: NativePermissionState;
  busyKey: PermissionKey | null;
  error: string | null;
  onToggle: (key: PermissionKey, enabled: boolean) => Promise<void>;
  onRequestCamera: () => Promise<unknown>;
  onRequestMicrophone: () => Promise<unknown>;
  onRequestMotion: () => Promise<unknown>;
  onOpenSettings: () => Promise<void>;
}

export function PrivacyScreen(props: Props) {
  const [requesting, setRequesting] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const enabledCount = Object.values(props.preferences).filter(Boolean).length;

  async function request(name: string, action: () => Promise<unknown>) {
    setRequesting(name); setActionError(null);
    try { await action(); }
    catch (cause) { setActionError(cause instanceof Error ? cause.message : `Could not request ${name} access.`); }
    finally { setRequesting(null); }
  }

  async function openSettings() {
    setRequesting('settings'); setActionError(null);
    try { await props.onOpenSettings(); }
    catch (cause) { setActionError(cause instanceof Error ? cause.message : 'Could not open device settings.'); }
    finally { setRequesting(null); }
  }

  return <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
    <Text style={styles.eyebrow}>YOUR CONTROL CENTER</Text>
    <Text style={styles.title}>Privacy & permissions</Text>
    <Text style={styles.subtitle}>Turn on only what you need. LIFEOS asks for device access when you use a feature, and you can change these choices any time.</Text>

    <View style={styles.overviewCard}>
      <View style={styles.overviewIcon}><Ionicons name="shield-checkmark-outline" size={20} color="#7ef0a4" /></View>
      <View style={styles.overviewCopy}>
        <Text style={styles.overviewTitle}>{enabledCount} of {PERMISSIONS.length} data choices enabled</Text>
        <Text style={styles.overviewDetail}>Device access is separate from data consent. Both may be needed for a feature.</Text>
      </View>
    </View>

    {!!(props.error || actionError) && <View accessibilityRole="alert" style={styles.errorCard}><Ionicons name="alert-circle-outline" size={17} color="#ff9b9b" /><Text style={styles.errorText}>{actionError ?? props.error}</Text></View>}

    {PERMISSION_GROUPS.map((group) => {
      const items = PERMISSIONS.filter((item) => item.scope === group.scope);
      if (items.length === 0) return null;
      const active = items.filter((item) => props.preferences[item.key]).length;
      return <View key={group.scope}>
        <View style={styles.sectionRow}><Text style={styles.section}>{group.heading}</Text><Text style={styles.sectionCount}>{active}/{items.length} ON</Text></View>
        {items.map((item) => <Permission key={item.key} item={item} value={props.preferences[item.key]} busy={props.busyKey === item.key} onChange={(value) => { void props.onToggle(item.key, value).catch(() => undefined); }} />)}
      </View>;
    })}

    <View style={styles.sectionRow}><Text style={styles.section}>Device access</Text><Text style={styles.sectionCount}>SYSTEM SETTINGS</Text></View>
    <NativePermissionCard
      icon="camera-outline" title="Camera" description="Needed to take a photo for Visual Intelligence."
      state={props.camera} busy={requesting === 'camera'}
      onRequest={() => void request('camera', props.onRequestCamera)} onSettings={() => void openSettings()}
    />
    <NativePermissionCard
      icon="mic-outline" title="Microphone" description="Needed to record a voice note. LIFEOS only records after you tap Record."
      state={props.microphone} busy={requesting === 'microphone'}
      onRequest={() => void request('microphone', props.onRequestMicrophone)} onSettings={() => void openSettings()}
    />
    <NativePermissionCard
      icon="footsteps-outline" title="Motion & Fitness" description="Needed to read step totals from your iPhone when you refresh Health."
      state={props.motion} busy={requesting === 'motion'}
      onRequest={() => void request('motion', props.onRequestMotion)} onSettings={() => void openSettings()}
    />

    <Text style={styles.section}>How your choices work</Text>
    <View style={styles.infoCard}><Ionicons name="hand-left-outline" size={16} color="#72df98" /><View style={styles.infoCopy}><Text style={styles.infoTitle}>You stay in control</Text><Text style={styles.detail}>Data consent switches control whether LIFEOS can use information for that feature. Device permission buttons open the system prompt; if access was previously denied, use “Open Settings”.</Text></View></View>
    <View style={styles.infoCard}><Ionicons name="server-outline" size={16} color="#72df98" /><View style={styles.infoCopy}><Text style={styles.infoTitle}>Your LIFEOS workspace</Text><Text style={styles.detail}>Saved goals, notes, scenarios, permissions and captures are stored in your LIFEOS workspace. You can delete saved captures from Visual Intelligence.</Text></View></View>
    <Pressable accessibilityRole="button" disabled={requesting === 'settings'} onPress={() => void openSettings()} style={styles.settingsLink}>
      <Ionicons name="settings-outline" size={16} color="#8ee9aa" />
      <Text style={styles.settingsText}>Open LIFEOS device settings</Text>
      {requesting === 'settings' && <ActivityIndicator size="small" color="#8ee9aa" />}
    </Pressable>
  </ScrollView>;
}

function Permission({ item, value, busy, onChange }: { item: PermissionDefinition; value: boolean; busy: boolean; onChange: (value: boolean) => void }) {
  return <View style={styles.card}>
    <View style={styles.row}>
      <View style={styles.iconCircle}><Ionicons name={item.scope === 'ai' ? 'sparkles-outline' : 'phone-portrait-outline'} size={16} color="#72df98" /></View>
      <View style={styles.copy}><Text style={styles.cardTitle}>{item.title}</Text><Text style={styles.detail}>{item.detail}</Text></View>
      {busy ? <ActivityIndicator size="small" color="#8ee9aa" /> : <Switch value={value} onValueChange={onChange} trackColor={{ false: '#26372b', true: '#27764a' }} thumbColor={value ? '#8af3aa' : '#b9c9bd'} accessibilityLabel={`${item.title} consent`} accessibilityHint="Controls whether LIFEOS can use this data when you use the feature." />}
    </View>
    <View style={styles.statusRow}><View style={[styles.statusDot, value ? styles.statusDotOn : styles.statusDotOff]} /><Text style={[styles.status, value ? styles.statusOn : styles.statusOff]}>{value ? 'ON · USED ONLY WHEN YOU USE THE FEATURE' : 'OFF · THIS FEATURE CANNOT USE THIS DATA'}</Text></View>
  </View>;
}

function NativePermissionCard({ icon, title, description, state, busy, onRequest, onSettings }: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  description: string;
  state: NativePermissionState;
  busy: boolean;
  onRequest: () => void;
  onSettings: () => void;
}) {
  const granted = state?.granted === true;
  const canAskAgain = state?.canAskAgain !== false;
  return <View style={styles.card}>
    <View style={styles.row}>
      <View style={styles.iconCircle}><Ionicons name={icon} size={16} color="#72df98" /></View>
      <View style={styles.copy}><Text style={styles.cardTitle}>{title}</Text><Text style={styles.detail}>{description}</Text></View>
      <View style={[styles.permissionBadge, granted ? styles.permissionBadgeOn : styles.permissionBadgeOff]}><Text style={[styles.permissionBadgeText, granted ? styles.statusOn : styles.statusOff]}>{granted ? 'ALLOWED' : 'NEEDED'}</Text></View>
    </View>
    {!granted && <View style={styles.permissionActions}>
      {canAskAgain && <Pressable accessibilityRole="button" disabled={busy} onPress={onRequest} style={[styles.actionButton, busy && styles.buttonBusy]}>
        {busy ? <ActivityIndicator size="small" color="#07150b" /> : <><Ionicons name="checkmark-circle-outline" size={15} color="#07150b" /><Text style={styles.actionText}>Allow {title}</Text></>}
      </Pressable>}
      {!canAskAgain && state?.available !== false && <Text style={styles.settingsHint}>Access was denied. Enable it in device settings to use this feature.</Text>}
      {state?.available === false && <Text style={styles.settingsHint}>This installed app does not include the audio native module. Install the latest LIFEOS development build to enable recording. Updating the app&apos;s JS alone cannot add native modules.</Text>}
      {state?.available !== false && (!canAskAgain || (state !== null && !granted)) && <Pressable accessibilityRole="button" disabled={busy} onPress={onSettings} style={styles.secondaryButton}><Text style={styles.secondaryText}>Open Settings</Text><Ionicons name="open-outline" size={13} color="#8ee9aa" /></Pressable>}
      {state === null && !busy && <Text style={styles.settingsHint}>Checking device access…</Text>}
    </View>}
  </View>;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#06100b' }, content: { padding: 19, paddingBottom: 40, maxWidth: 720, width: '100%', alignSelf: 'center' },
  eyebrow: { color: '#78d99a', fontSize: 10, fontWeight: '700', letterSpacing: 1.3, marginBottom: 7 }, title: { color: '#f0f8f2', fontSize: 28, lineHeight: 35, fontWeight: '700' }, subtitle: { color: '#9cad9f', fontSize: 13, lineHeight: 20, marginTop: 7, marginBottom: 14 },
  overviewCard: { flexDirection: 'row', gap: 11, alignItems: 'center', backgroundColor: '#0e2116', borderColor: '#28563a', borderWidth: 1, borderRadius: 16, padding: 14, marginBottom: 8 }, overviewIcon: { width: 38, height: 38, borderRadius: 13, backgroundColor: '#153b24', alignItems: 'center', justifyContent: 'center' }, overviewCopy: { flex: 1 }, overviewTitle: { color: '#eaf4ec', fontSize: 13, fontWeight: '700' }, overviewDetail: { color: '#9cad9f', fontSize: 10, lineHeight: 15, marginTop: 3 },
  errorCard: { flexDirection: 'row', gap: 8, alignItems: 'flex-start', borderRadius: 12, borderWidth: 1, borderColor: '#653838', backgroundColor: '#251414', padding: 11, marginTop: 8 }, errorText: { color: '#ffb6b6', flex: 1, fontSize: 11, lineHeight: 16 },
  sectionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 20, marginBottom: 8 }, section: { color: '#eaf4ec', fontSize: 17, lineHeight: 23, fontWeight: '600' }, sectionCount: { color: '#829687', fontSize: 8, fontWeight: '700', letterSpacing: 0.8 },
  card: { backgroundColor: '#0c1910', borderColor: '#1d3927', borderWidth: 1, borderRadius: 15, padding: 14, marginBottom: 9 }, row: { flexDirection: 'row', alignItems: 'center', gap: 10 }, iconCircle: { width: 34, height: 34, borderRadius: 12, backgroundColor: '#153b24', alignItems: 'center', justifyContent: 'center' }, copy: { flex: 1, minWidth: 0 }, cardTitle: { color: '#eaf4ec', fontSize: 13, lineHeight: 19, fontWeight: '600' }, detail: { color: '#8fa594', fontSize: 11, lineHeight: 17, marginTop: 4 },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 7, marginTop: 10, paddingTop: 9, borderTopWidth: 1, borderTopColor: '#203629' }, statusDot: { width: 7, height: 7, borderRadius: 4 }, statusDotOn: { backgroundColor: '#61e894' }, statusDotOff: { backgroundColor: '#718075' }, status: { fontSize: 8, lineHeight: 12, fontWeight: '700', letterSpacing: 0.45 }, statusOn: { color: '#8ee9aa' }, statusOff: { color: '#9cad9f' },
  permissionBadge: { borderRadius: 7, paddingHorizontal: 7, paddingVertical: 5 }, permissionBadgeOn: { backgroundColor: '#153b26' }, permissionBadgeOff: { backgroundColor: '#24271f' }, permissionBadgeText: { fontSize: 8, fontWeight: '700', letterSpacing: 0.4 }, permissionActions: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8, marginTop: 11, marginLeft: 44 }, actionButton: { minHeight: 38, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingHorizontal: 12, borderRadius: 10, backgroundColor: '#61e894' }, actionText: { color: '#07150b', fontSize: 10, fontWeight: '700' }, buttonBusy: { opacity: 0.65 }, secondaryButton: { minHeight: 36, flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 9, borderRadius: 9, borderWidth: 1, borderColor: '#356344' }, secondaryText: { color: '#8ee9aa', fontSize: 10, fontWeight: '600' }, settingsHint: { flexBasis: '100%', color: '#d0b56d', fontSize: 10, lineHeight: 15 },
  infoCard: { flexDirection: 'row', gap: 10, alignItems: 'flex-start', backgroundColor: '#0b1710', borderColor: '#1d3927', borderWidth: 1, borderRadius: 14, padding: 13, marginBottom: 8 }, infoCopy: { flex: 1 }, infoTitle: { color: '#eaf4ec', fontSize: 12, fontWeight: '600' }, settingsLink: { minHeight: 46, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 8, borderRadius: 12, backgroundColor: '#10271a', borderWidth: 1, borderColor: '#28563a' }, settingsText: { color: '#8ee9aa', fontSize: 11, fontWeight: '600' },
});
