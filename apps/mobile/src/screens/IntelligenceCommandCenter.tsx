import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { Goal } from '../goals';
import type { TwinObservation, TwinPattern, TwinScenario } from '../twin';
import type { VisionCapture } from '../vision';

interface Props {
  summary: string | null;
  summaryError: string | null;
  goals: readonly Goal[];
  observations: readonly TwinObservation[];
  patterns: readonly TwinPattern[];
  scenarios: readonly TwinScenario[];
  captures: readonly VisionCapture[];
  onOpenAssistant: () => void;
  onOpenTwin: () => void;
  onOpenVisual: () => void;
  onOpenModules: () => void;
  onOpenPrivacy: () => void;
}

const categories = [
  { id: 'routine', label: 'Routines', icon: '◷' },
  { id: 'interest', label: 'Interests', icon: '✳' },
  { id: 'preference', label: 'Preferences', icon: '♡' },
  { id: 'behavior', label: 'Behaviors', icon: '⌁' },
] as const;

export function IntelligenceCommandCenter(props: Props) {
  const latestScenario = props.scenarios[0];
  const latestCapture = props.captures[0];
  const counts = categories.map((category) => ({
    ...category,
    count: props.observations.filter((item) => item.category === category.id).length,
  }));
  const maxSignals = Math.max(1, ...counts.map((item) => item.count));

  return <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
    <View style={styles.header}>
      <View style={styles.brandRow}><View style={styles.brandMark}><Text style={styles.brandMarkText}>✳</Text></View><Text style={styles.brand}>LIFEOS</Text></View>
      <Pressable accessibilityRole="button" accessibilityLabel="Open privacy settings" onPress={props.onOpenPrivacy} style={styles.privacyButton}><Text style={styles.privacyIcon}>⌑</Text></Pressable>
    </View>

    <View style={styles.intro}>
      <Text style={styles.eyebrow}>YOUR PERSONAL SYSTEM</Text>
      <Text style={styles.title}>Your life, in context.</Text>
      <Text style={styles.subtitle}>Understand what shapes your day and make your next decision with more clarity.</Text>
    </View>

    <Pressable accessibilityRole="button" onPress={props.onOpenAssistant} style={styles.assistantCard}>
      <View style={styles.assistantMark}><Text style={styles.assistantMarkText}>✳</Text></View>
      <View style={styles.assistantCopy}>
        <Text style={styles.assistantEyebrow}>PERSONAL ASSISTANT</Text>
        <Text style={styles.assistantTitle}>What are you thinking about?</Text>
        <Text style={styles.assistantSubtitle}>Compare options, find a first step, or untangle an idea.</Text>
      </View>
      <Text style={styles.arrow}>↗</Text>
    </Pressable>

    <View style={styles.sectionHeading}>
      <View style={styles.headingCopy}><Text style={styles.sectionEyebrow}>YOUR PERSONAL TWIN</Text><Text style={styles.sectionTitle}>Context takes shape</Text></View>
      <Pressable accessibilityRole="button" onPress={props.onOpenTwin}><Text style={styles.link}>Open  ↗</Text></Pressable>
    </View>

    <View style={styles.signalCard}>
      <View style={styles.signalSummary}>
        <View><Text style={styles.bigMetric}>{props.observations.length}</Text><Text style={styles.metricLabel}>SAVED SIGNALS</Text></View>
        <View style={styles.metricDivider} />
        <View><Text style={styles.bigMetric}>{props.patterns.length}</Text><Text style={styles.metricLabel}>REPEATED PATTERNS</Text></View>
        <View style={styles.metricDivider} />
        <View><Text style={styles.bigMetric}>{props.goals.length}</Text><Text style={styles.metricLabel}>GOALS</Text></View>
      </View>
      <View style={styles.chart}>
        {counts.map((item) => <View key={item.id} style={styles.chartRow}>
          <Text style={styles.chartIcon}>{item.icon}</Text>
          <Text style={styles.chartLabel}>{item.label}</Text>
          <View style={styles.chartTrack}><View style={[styles.chartFill, { width: `${item.count ? Math.max(6, (item.count / maxSignals) * 100) : 0}%` }]} /></View>
          <Text style={styles.chartCount}>{item.count}</Text>
        </View>)}
      </View>
      {props.summaryError && <Text style={styles.note}>{props.summaryError}</Text>}
      {props.summary && <Text style={styles.note}>{props.summary}</Text>}
      {props.observations.length === 0 && <Text style={styles.note}>Add a few notes in Personal Twin to start connecting your routines and choices.</Text>}
      <View style={styles.connectionFooter}>
        <Text style={styles.connectionText}>Your signals</Text><Text style={styles.connector}>→</Text><Text style={styles.connectionText}>Your Twin</Text><Text style={styles.connector}>→</Text><Text style={styles.connectionText}>Possible paths</Text>
      </View>
    </View>

    <View style={styles.sectionHeading}>
      <View style={styles.headingCopy}><Text style={styles.sectionEyebrow}>ACROSS YOUR LIFE</Text><Text style={styles.sectionTitle}>Connected by your context</Text></View>
      <Pressable accessibilityRole="button" onPress={props.onOpenModules}><Text style={styles.link}>Modules  ↗</Text></Pressable>
    </View>
    <View style={styles.lifeGrid}>
      <LifeTile icon="◉" title="Choices" detail="Scenarios and trade-offs" onPress={props.onOpenTwin} />
      <LifeTile icon="⌕" title="What you see" detail="Objects, scenes, documents" onPress={props.onOpenVisual} />
      <LifeTile icon="♡" title="Wellbeing" detail="Health and daily patterns" onPress={props.onOpenModules} />
      <LifeTile icon="⌘" title="Growth" detail="Learning and goals" onPress={props.onOpenModules} />
    </View>

    {latestScenario && <Pressable accessibilityRole="button" onPress={props.onOpenTwin} style={styles.scenarioCard}>
      <View style={styles.scenarioIcon}><Text style={styles.scenarioIconText}>↗</Text></View>
      <View style={styles.scenarioCopy}>
        <Text style={styles.scenarioEyebrow}>YOUR LATEST WHAT-IF · {latestScenario.horizonMonths} MONTHS</Text>
        <Text style={styles.scenarioTitle}>{latestScenario.title}</Text>
        <Text style={styles.scenarioText}>{signed(latestScenario.weeklyHoursChange * 4.33 * latestScenario.horizonMonths, 'hours')} · {signed(latestScenario.monthlyCashflowChange * latestScenario.horizonMonths, 'cash flow')}</Text>
      </View>
    </Pressable>}

    {latestCapture && <Pressable accessibilityRole="button" onPress={props.onOpenVisual} style={styles.captureCard}>
      {latestCapture.imageUri && <View style={styles.captureThumb}><Text style={styles.captureThumbIcon}>⌕</Text></View>}
      <View style={styles.captureCopy}><Text style={styles.scenarioEyebrow}>RECENT VISUAL NOTE</Text><Text style={styles.scenarioTitle} numberOfLines={1}>{latestCapture.question}</Text><Text style={styles.scenarioText} numberOfLines={2}>{latestCapture.answer ?? 'Saved in LIFEOS'}</Text></View>
      <Text style={styles.arrow}>↗</Text>
    </Pressable>}

  </ScrollView>;
}

function LifeTile({ icon, title, detail, onPress }: { icon: string; title: string; detail: string; onPress: () => void }) {
  return <Pressable accessibilityRole="button" onPress={onPress} style={styles.lifeTile}>
    <View style={styles.lifeIcon}><Text style={styles.lifeIconText}>{icon}</Text></View>
    <Text style={styles.lifeTitle}>{title}</Text>
    <Text style={styles.lifeDetail}>{detail}</Text>
  </Pressable>;
}

function signed(value: number, unit: string) {
  const rounded = Math.round(value * 10) / 10;
  return `${rounded > 0 ? '+' : ''}${rounded} ${unit}`;
}

const styles = StyleSheet.create({
  dashboardRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  dashCard: { flex: 1, padding: 14, borderRadius: 14, backgroundColor: '#0d1b12', borderWidth: 1, borderColor: '#1d3927', alignItems: 'center' },
  dashValue: { color: '#61e894', fontSize: 22, fontWeight: '700' },
  dashLabel: { color: '#9cad9f', fontSize: 10, marginTop: 4 },
  screen: { flex: 1, backgroundColor: '#06100b' },
  content: { paddingHorizontal: 18, paddingTop: 12, paddingBottom: 24, maxWidth: 720, width: '100%', alignSelf: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 23 },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  brandMark: { width: 28, height: 28, borderRadius: 9, alignItems: 'center', justifyContent: 'center', backgroundColor: '#12351f', borderColor: '#27764a', borderWidth: 1 },
  brandMarkText: { color: '#73f5a8', fontSize: 18 },
  brand: { color: '#edf7f0', fontSize: 15, fontWeight: '700', letterSpacing: 1.5 },
  privacyButton: { width: 39, height: 39, borderRadius: 13, borderWidth: 1, borderColor: '#21382b', backgroundColor: '#101d15', alignItems: 'center', justifyContent: 'center' },
  privacyIcon: { color: '#76dfa0', fontSize: 20 },
  intro: { marginBottom: 18 },
  eyebrow: { color: '#78d99a', fontSize: 10, letterSpacing: 1.5, fontWeight: '700', marginBottom: 8 },
  title: { color: '#f0f8f2', fontSize: 30, lineHeight: 37, fontWeight: '700', letterSpacing: -0.7 },
  subtitle: { color: '#9cad9f', fontSize: 14, lineHeight: 21, marginTop: 7, maxWidth: 390 },
  assistantCard: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 15, borderRadius: 19, backgroundColor: '#102619', borderColor: '#2b6540', borderWidth: 1, marginBottom: 24 },
  assistantMark: { width: 43, height: 43, borderRadius: 15, alignItems: 'center', justifyContent: 'center', backgroundColor: '#17442a' },
  assistantMarkText: { color: '#88efaa', fontSize: 22 },
  assistantCopy: { flex: 1, minWidth: 0 },
  assistantEyebrow: { color: '#7de4a0', fontSize: 8, fontWeight: '700', letterSpacing: 1, marginBottom: 4 },
  assistantTitle: { color: '#f0f8f2', fontSize: 15, lineHeight: 20, fontWeight: '600' },
  assistantSubtitle: { color: '#a5b8a9', fontSize: 10, lineHeight: 15, marginTop: 4 },
  arrow: { color: '#66e89a', fontSize: 17 },
  sectionHeading: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: 10, marginBottom: 11 },
  headingCopy: { flex: 1, minWidth: 0 },
  sectionEyebrow: { color: '#68cb89', fontSize: 9, letterSpacing: 1.2, fontWeight: '700', marginBottom: 4 },
  sectionTitle: { color: '#eaf4ec', fontSize: 18, lineHeight: 24, fontWeight: '600' },
  link: { color: '#66e89a', fontSize: 11, fontWeight: '600', paddingBottom: 2 },
  signalCard: { borderRadius: 19, borderWidth: 1, borderColor: '#1c4a2d', backgroundColor: '#0b1a10', padding: 15, marginBottom: 24 },
  signalSummary: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, paddingBottom: 14, borderBottomWidth: 1, borderBottomColor: '#1d3624' },
  bigMetric: { color: '#eaf7ed', fontSize: 21, lineHeight: 27, fontWeight: '700' },
  metricLabel: { color: '#809687', fontSize: 7, lineHeight: 11, letterSpacing: 0.7, fontWeight: '700', marginTop: 2 },
  metricDivider: { width: 1, height: 28, backgroundColor: '#244a32' },
  chart: { gap: 10, paddingTop: 14 },
  chartRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  chartIcon: { width: 15, color: '#65e99a', fontSize: 12, textAlign: 'center' },
  chartLabel: { width: 77, color: '#a9bcae', fontSize: 10, lineHeight: 14 },
  chartTrack: { height: 6, flex: 1, borderRadius: 4, backgroundColor: '#17251a', overflow: 'hidden' },
  chartFill: { height: 6, borderRadius: 4, backgroundColor: '#59d98a' },
  chartCount: { width: 22, color: '#94d9a8', fontSize: 10, textAlign: 'right' },
  note: { color: '#829687', fontSize: 10, lineHeight: 15, marginTop: 12 },
  connectionFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 5, backgroundColor: '#08130c', paddingHorizontal: 10, paddingVertical: 10, borderRadius: 11, marginTop: 14 },
  connectionText: { color: '#a9bcae', fontSize: 9, fontWeight: '600', flexShrink: 1 },
  connector: { color: '#61e894', fontSize: 14 },
  lifeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 9, marginBottom: 19 },
  lifeTile: { width: '48%', flexGrow: 1, minWidth: 145, minHeight: 117, backgroundColor: '#0c1910', borderRadius: 15, borderColor: '#1d3927', borderWidth: 1, padding: 12 },
  lifeIcon: { width: 28, height: 28, borderRadius: 9, backgroundColor: '#153b24', alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  lifeIconText: { color: '#65e99a', fontSize: 15 },
  lifeTitle: { color: '#dcebe0', fontSize: 12, lineHeight: 16, fontWeight: '600' },
  lifeDetail: { color: '#829687', fontSize: 9, lineHeight: 14, marginTop: 3 },
  scenarioCard: { flexDirection: 'row', alignItems: 'center', gap: 11, padding: 13, borderRadius: 15, borderWidth: 1, borderColor: '#203b2a', backgroundColor: '#0d1a12', marginBottom: 10 },
  scenarioIcon: { width: 34, height: 34, borderRadius: 11, backgroundColor: '#153a22', alignItems: 'center', justifyContent: 'center' },
  scenarioIconText: { color: '#65e99a', fontSize: 16 },
  scenarioCopy: { flex: 1, minWidth: 0 },
  scenarioEyebrow: { color: '#79d99b', fontSize: 8, letterSpacing: 0.7, fontWeight: '700', marginBottom: 4 },
  scenarioTitle: { color: '#eaf4ec', fontSize: 12, lineHeight: 17, fontWeight: '600' },
  scenarioText: { color: '#9cad9f', fontSize: 10, lineHeight: 15, marginTop: 3 },
  captureCard: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderRadius: 15, borderWidth: 1, borderColor: '#203b2a', backgroundColor: '#0d1a12', marginTop: 1 },
  captureThumb: { width: 38, height: 42, borderRadius: 9, backgroundColor: '#153b24', alignItems: 'center', justifyContent: 'center' },
  captureThumbIcon: { color: '#65e99a', fontSize: 18 },
  captureCopy: { flex: 1, minWidth: 0 },
  allModulesButton: { alignItems: 'center', paddingVertical: 15, marginTop: 7 },
  allModulesText: { color: '#72df98', fontSize: 12, fontWeight: '600' },
  footerText: { color: '#65786a', fontSize: 9, textAlign: 'center', paddingBottom: 8 },
});
