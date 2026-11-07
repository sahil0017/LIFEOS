import { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { Goal } from '../goals';
import type { ObservationCategory, TwinEmbedding, TwinObservation, TwinPattern, TwinScenario } from '../twin';

const categories: { id: ObservationCategory; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { id: 'routine', label: 'Routine', icon: 'repeat-outline' },
  { id: 'interest', label: 'Interest', icon: 'star-outline' },
  { id: 'preference', label: 'Preference', icon: 'heart-outline' },
  { id: 'behavior', label: 'Behavior', icon: 'flash-outline' },
];

type Tab = 'timeline' | 'patterns' | 'scenarios' | 'reflection';

const tabs: { id: Tab; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { id: 'timeline', label: 'Timeline', icon: 'time-outline' },
  { id: 'patterns', label: 'Patterns', icon: 'pulse-outline' },
  { id: 'scenarios', label: 'Scenarios', icon: 'git-branch-outline' },
  { id: 'reflection', label: 'Reflect', icon: 'sparkles-outline' },
];

interface Props {
  goals: readonly Goal[];
  observations: readonly TwinObservation[];
  patterns: readonly TwinPattern[];
  scenarios: readonly TwinScenario[];
  embeddings: readonly TwinEmbedding[];
  insight: string | null;
  busy: boolean;
  error: string | null;
  aiAllowed: boolean;
  configured: boolean;
  onOpenPrivacy: () => void;
  onRecordObservation: (category: ObservationCategory, label: string) => Promise<void>;
  onCreateScenario: (scenario: {
    title: string;
    horizonMonths: number;
    weeklyHoursChange: number;
    monthlyCashflowChange: number;
  }) => Promise<void>;
  onDeleteObservation: (id: number) => Promise<void>;
  onDeleteScenario: (id: number) => Promise<void>;
  onAnalyze: () => Promise<void>;
}

export function PersonalTwinScreen(props: Props) {
  const [tab, setTab] = useState<Tab>('timeline');
  const [category, setCategory] = useState<ObservationCategory>('routine');
  const [observation, setObservation] = useState('');
  const [scenarioTitle, setScenarioTitle] = useState('');
  const [horizonMonths, setHorizonMonths] = useState(6);
  const [weeklyHoursChange, setWeeklyHoursChange] = useState('0');
  const [monthlyCashflowChange, setMonthlyCashflowChange] = useState('0');
  const links = useMemo(() => semanticLinks(props.observations, props.embeddings), [props.observations, props.embeddings]);
  const totalSessions = props.goals.reduce((sum, goal) => sum + goal.sessionCount, 0);

  async function saveObservation() {
    if (!observation.trim() || props.busy) return;
    await props.onRecordObservation(category, observation);
    setObservation('');
  }

  async function saveScenario() {
    if (!scenarioTitle.trim() || props.busy) return;
    await props.onCreateScenario({
      title: scenarioTitle,
      horizonMonths,
      weeklyHoursChange: Number(weeklyHoursChange) || 0,
      monthlyCashflowChange: Number(monthlyCashflowChange) || 0,
    });
    setScenarioTitle('');
  }

  return <View style={styles.screen}>
    {/* Header */}
    <View style={styles.header}>
      <View>
        <Text style={styles.eyebrow}>PERSONAL DIGITAL TWIN</Text>
        <Text style={styles.title}>Your twin</Text>
      </View>
      <View style={styles.headerStats}>
        <HeaderStat value={props.observations.length} label="signals" />
        <HeaderStat value={props.patterns.length} label="patterns" />
        <HeaderStat value={props.scenarios.length} label="scenarios" />
      </View>
    </View>

    {/* Tab bar */}
    <View style={styles.tabBar}>
      {tabs.map((item) => (
        <Pressable key={item.id} accessibilityRole="tab" accessibilityState={{ selected: tab === item.id }}
          onPress={() => setTab(item.id)} style={[styles.tab, tab === item.id && styles.tabActive]}>
          <Ionicons name={item.icon} size={13} color={tab === item.id ? '#07150b' : '#8fa594'} />
          <Text style={[styles.tabText, tab === item.id && styles.tabTextActive]}>{item.label}</Text>
        </Pressable>
      ))}
    </View>

    {tab === 'timeline' && <ScrollView style={styles.tabScroll} contentContainerStyle={styles.tabContent} showsVerticalScrollIndicator={false}>
      <View style={styles.composeCard}>
        <Text style={styles.cardEyebrow}>RECORD AN OBSERVATION</Text>
        <View style={styles.chipRow}>
          {categories.map((item) => (
            <Pressable key={item.id} accessibilityRole="radio" accessibilityState={{ selected: category === item.id }}
              onPress={() => setCategory(item.id)} style={[styles.chip, category === item.id && styles.chipSelected]}>
              <Ionicons name={item.icon} size={11} color={category === item.id ? '#07150b' : '#8fa594'} />
              <Text style={[styles.chipText, category === item.id && styles.chipTextSelected]}>{item.label}</Text>
            </Pressable>
          ))}
        </View>
        <TextInput accessibilityLabel="Twin observation" style={styles.input} value={observation} onChangeText={setObservation}
          maxLength={240} placeholder="e.g. I feel focused after a morning walk" placeholderTextColor="#6c7f70" />
        <Pressable accessibilityRole="button" disabled={!observation.trim() || props.busy} onPress={() => void saveObservation()}
          style={[styles.primaryButton, (!observation.trim() || props.busy) && styles.disabled]}>
          {props.busy ? <ActivityIndicator color="#07150b" size="small" /> : <Text style={styles.primaryText}>Add to timeline</Text>}
        </Pressable>
        <Text style={styles.note}>Add facts you want LIFEOS to consider. Avoid sensitive details.</Text>
      </View>

      {props.observations.length === 0
        ? <EmptyState icon="time-outline" text="Your timeline is empty. Record your first observation above." />
        : props.observations.slice(0, 20).map((item) => {
          const meta = categories.find((c) => c.id === item.category) ?? categories[0];
          return (
            <View key={item.id} style={styles.timelineRow}>
              <View style={styles.timelineIcon}><Ionicons name={meta.icon} size={12} color="#65e99a" /></View>
              <View style={styles.timelineCopy}>
                <Text style={styles.timelineLabel}>{item.label}</Text>
                <Text style={styles.timelineMeta}>{meta.label} · {new Date(item.occurredAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</Text>
              </View>
              <Pressable accessibilityRole="button" accessibilityLabel={`Delete observation: ${item.label}`}
                disabled={props.busy} onPress={() => void props.onDeleteObservation(item.id)} style={styles.deleteButton}>
                <Ionicons name="trash-outline" size={14} color="#ff9b9b" />
              </Pressable>
            </View>
          );
        })}
      {props.observations.length > 20 && <Text style={styles.moreNote}>Showing 20 most recent of {props.observations.length} observations.</Text>}
    </ScrollView>}

    {tab === 'patterns' && <ScrollView style={styles.tabScroll} contentContainerStyle={styles.tabContent} showsVerticalScrollIndicator={false}>
      {props.patterns.length === 0
        ? <EmptyState icon="pulse-outline" text="Repeated patterns appear after you record the same routine, interest, preference, or behavior more than once." />
        : props.patterns.map((pattern) => {
          const meta = categories.find((c) => c.id === pattern.category) ?? categories[0];
          return (
            <View key={pattern.key} style={styles.patternCard}>
              <View style={styles.patternTop}>
                <View style={[styles.patternIcon, { backgroundColor: '#153b24' }]}><Ionicons name={meta.icon} size={14} color="#73f5a8" /></View>
                <View style={styles.patternCopy}>
                  <Text style={styles.patternLabel}>{pattern.label}</Text>
                  <Text style={styles.patternMeta}>{meta.label} · repeated {pattern.count}×</Text>
                </View>
                <View style={styles.patternBadge}><Text style={styles.patternBadgeText}>{pattern.count}</Text></View>
              </View>
            </View>
          );
        })}
      {links.length > 0 && <>
        <Text style={styles.groupTitle}>SEMANTIC LINKS</Text>
        <Text style={styles.note}>Similarity can surface related notes; it does not establish a real-world connection.</Text>
        {links.slice(0, 5).map((link) => (
          <View key={link.key} style={styles.linkRow}>
            <Ionicons name="link-outline" size={12} color="#a3d4ff" />
            <View style={styles.linkCopy}>
              <Text style={styles.linkLabel} numberOfLines={1}>{link.left} ↔ {link.right}</Text>
              <Text style={styles.linkMeta}>{Math.round(link.similarity * 100)}% similar</Text>
            </View>
          </View>
        ))}
      </>}
    </ScrollView>}

    {tab === 'scenarios' && <ScrollView style={styles.tabScroll} contentContainerStyle={styles.tabContent} showsVerticalScrollIndicator={false}>
      <View style={styles.composeCard}>
        <Text style={styles.cardEyebrow}>COMPARE A POSSIBLE CHANGE</Text>
        <TextInput accessibilityLabel="Scenario name" style={styles.input} value={scenarioTitle} onChangeText={setScenarioTitle}
          maxLength={100} placeholder="e.g. Change career" placeholderTextColor="#6c7f70" />
        <Text style={styles.fieldLabel}>Time horizon</Text>
        <View style={styles.chipRow}>
          {[3, 6, 12].map((months) => (
            <Pressable key={months} accessibilityRole="radio" accessibilityState={{ selected: horizonMonths === months }}
              onPress={() => setHorizonMonths(months)} style={[styles.chip, horizonMonths === months && styles.chipSelected]}>
              <Text style={[styles.chipText, horizonMonths === months && styles.chipTextSelected]}>{months} mo</Text>
            </Pressable>
          ))}
        </View>
        <View style={styles.fieldPair}>
          <View style={styles.fieldHalf}>
            <Text style={styles.fieldLabel}>Weekly hours</Text>
            <TextInput accessibilityLabel="Estimated weekly time change in hours" style={styles.input} value={weeklyHoursChange}
              onChangeText={setWeeklyHoursChange} keyboardType="numbers-and-punctuation" placeholder="e.g. 4 or -2" placeholderTextColor="#6c7f70" />
          </View>
          <View style={styles.fieldHalf}>
            <Text style={styles.fieldLabel}>Monthly cash</Text>
            <TextInput accessibilityLabel="Estimated monthly cash flow change" style={styles.input} value={monthlyCashflowChange}
              onChangeText={setMonthlyCashflowChange} keyboardType="numbers-and-punctuation" placeholder="e.g. 500 or -300" placeholderTextColor="#6c7f70" />
          </View>
        </View>
        <Pressable accessibilityRole="button" disabled={!scenarioTitle.trim() || props.busy} onPress={() => void saveScenario()}
          style={[styles.primaryButton, (!scenarioTitle.trim() || props.busy) && styles.disabled]}>
          <Text style={styles.primaryText}>Save scenario</Text>
        </Pressable>
        <Text style={styles.note}>Arithmetic comparisons from your estimates, not learned forecasts.</Text>
      </View>

      {props.scenarios.length === 0
        ? <EmptyState icon="git-branch-outline" text="No scenarios yet. Save one above to compare a possible life change." />
        : props.scenarios.map((scenario) => {
          const totalTime = scenario.weeklyHoursChange * 4.33 * scenario.horizonMonths;
          const totalCashflow = scenario.monthlyCashflowChange * scenario.horizonMonths;
          return (
            <View key={scenario.id} style={styles.scenarioCard}>
              <View style={styles.scenarioTop}>
                <View style={styles.scenarioIcon}><Ionicons name="git-branch-outline" size={15} color="#73f5a8" /></View>
                <View style={styles.scenarioCopy}>
                  <Text style={styles.scenarioTitle} numberOfLines={1}>{scenario.title}</Text>
                  <Text style={styles.scenarioMeta}>{scenario.horizonMonths} months · your assumptions</Text>
                </View>
                <Pressable accessibilityRole="button" accessibilityLabel={`Delete scenario: ${scenario.title}`}
                  disabled={props.busy} onPress={() => void props.onDeleteScenario(scenario.id)} style={styles.deleteButton}>
                  <Ionicons name="trash-outline" size={14} color="#ff9b9b" />
                </Pressable>
              </View>
              <View style={styles.scenarioStats}>
                <Stat value={signed(totalTime, 'h')} label="total time" tone={totalTime >= 0 ? 'good' : 'warn'} />
                <Stat value={signed(totalCashflow, '')} label="net cash flow" tone={totalCashflow >= 0 ? 'good' : 'warn'} />
              </View>
            </View>
          );
        })}
    </ScrollView>}

    {tab === 'reflection' && <ScrollView style={styles.tabScroll} contentContainerStyle={styles.tabContent} showsVerticalScrollIndicator={false}>
      <View style={styles.composeCard}>
        <Text style={styles.cardEyebrow}>TWIN REFLECTION</Text>
        {props.insight
          ? <Text style={styles.insight}>{props.insight}</Text>
          : <Text style={styles.note}>Run an update to get a reflection grounded in your {props.observations.length} observations, {props.goals.length} goals ({totalSessions} sessions) and {props.scenarios.length} scenarios.</Text>}
        {props.error && <Text accessibilityRole="alert" style={styles.error}>{props.error}</Text>}
        {props.busy && <ActivityIndicator color="#61e894" style={styles.loading} />}
        {!props.aiAllowed
          ? <>
            <View style={styles.lockedCard}>
              <Ionicons name="lock-closed-outline" size={16} color="#d6c179" />
              <Text style={styles.lockedText}>Twin analysis is off. Enable it in Privacy first — LIFEOS only sends data when you ask.</Text>
            </View>
            <Pressable accessibilityRole="button" onPress={props.onOpenPrivacy} style={styles.secondaryButton}>
              <Text style={styles.secondaryText}>Open Privacy</Text>
            </Pressable>
          </>
          : !props.configured
            ? <Text style={styles.note}>Analysis is not available yet. Connect the LIFEOS service first.</Text>
            : <Pressable accessibilityRole="button" disabled={props.busy || (props.observations.length === 0 && props.goals.length === 0 && props.scenarios.length === 0)}
              onPress={() => void props.onAnalyze()} style={[styles.primaryButton, (props.busy || (props.observations.length === 0 && props.goals.length === 0 && props.scenarios.length === 0)) && styles.disabled]}>
              <Text style={styles.primaryText}>Update my Twin</Text>
            </Pressable>}
        <Text style={styles.note}>Each update is requested by you. Treat reflections as ideas to review, not facts or advice.</Text>
      </View>
    </ScrollView>}
  </View>;
}

function HeaderStat({ value, label }: { value: number; label: string }) {
  return <View style={styles.headerStat}><Text style={styles.headerStatValue}>{value}</Text><Text style={styles.headerStatLabel}>{label}</Text></View>;
}

function EmptyState({ icon, text }: { icon: keyof typeof Ionicons.glyphMap; text: string }) {
  return <View style={styles.emptyCard}>
    <Ionicons name={icon} size={17} color="#72df98" />
    <Text style={styles.emptyText}>{text}</Text>
  </View>;
}

function Stat({ value, label, tone }: { value: string; label: string; tone: 'good' | 'warn' }) {
  return <View style={styles.stat}><Text style={[styles.statValue, tone === 'warn' && styles.statWarn]}>{value}</Text><Text style={styles.statLabel}>{label}</Text></View>;
}

function semanticLinks(observations: readonly TwinObservation[], embeddings: readonly TwinEmbedding[]) {
  const names = new Map(observations.map((observation) => [observation.id, observation.label]));
  const vectors = new Map(embeddings.map((embedding) => [embedding.observationId, embedding.vector]));
  const items = [...names.entries()].flatMap(([id, label]) => {
    const vector = vectors.get(id);
    return vector ? [{ id, label, vector }] : [];
  });
  const links: { key: string; left: string; right: string; similarity: number }[] = [];
  for (let left = 0; left < items.length; left += 1) {
    for (let right = left + 1; right < items.length; right += 1) {
      const similarity = cosine(items[left].vector, items[right].vector);
      if (similarity >= 0.65) links.push({
        key: `${items[left].id}-${items[right].id}`,
        left: items[left].label,
        right: items[right].label,
        similarity,
      });
    }
  }
  return links.sort((a, b) => b.similarity - a.similarity);
}

function cosine(a: readonly number[], b: readonly number[]): number {
  if (a.length !== b.length || a.length === 0) return 0;
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let index = 0; index < a.length; index += 1) {
    dot += a[index] * b[index];
    normA += a[index] * a[index];
    normB += b[index] * b[index];
  }
  return normA && normB ? dot / Math.sqrt(normA * normB) : 0;
}

function signed(value: number, unit: string): string {
  const rounded = Math.round(value * 10) / 10;
  return `${rounded > 0 ? '+' : ''}${rounded}${unit ? ` ${unit}` : ''}`;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#06100b' },

  // Header
  header: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', paddingHorizontal: 18, paddingTop: 14 },
  eyebrow: { color: '#78d99a', fontSize: 9, letterSpacing: 1.3, fontWeight: '700', marginBottom: 5 },
  title: { color: '#f0f8f2', fontSize: 28, lineHeight: 34, fontWeight: '700' },
  headerStats: { flexDirection: 'row', gap: 7, paddingTop: 4 },
  headerStat: { alignItems: 'center', paddingHorizontal: 10, paddingVertical: 7, borderRadius: 12, backgroundColor: '#0d1b12', borderWidth: 1, borderColor: '#1d3927', minWidth: 52 },
  headerStatValue: { color: '#61e894', fontSize: 15, fontWeight: '700' },
  headerStatLabel: { color: '#829687', fontSize: 8, marginTop: 1 },

  // Tabs
  tabBar: { flexDirection: 'row', gap: 6, paddingHorizontal: 18, paddingVertical: 12 },
  tab: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, paddingVertical: 9, borderRadius: 11, backgroundColor: '#0d1b12', borderWidth: 1, borderColor: '#1d3927' },
  tabActive: { backgroundColor: '#61e894', borderColor: '#61e894' },
  tabText: { color: '#8fa594', fontSize: 11, fontWeight: '600' },
  tabTextActive: { color: '#07150b', fontWeight: '700' },
  tabContent: { paddingHorizontal: 18, paddingBottom: 30, maxWidth: 720, width: '100%', alignSelf: 'center', gap: 10 },
  tabScroll: { flex: 1 },

  // Compose card
  composeCard: { padding: 15, borderRadius: 18, backgroundColor: '#0d1b12', borderWidth: 1, borderColor: '#244a32' },
  cardEyebrow: { color: '#73f5a8', fontSize: 9, fontWeight: '700', letterSpacing: 1.1, marginBottom: 11 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginBottom: 10 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 5, borderWidth: 1, borderColor: '#294333', borderRadius: 17, paddingHorizontal: 11, paddingVertical: 7, backgroundColor: '#0b160f' },
  chipSelected: { backgroundColor: '#61e894', borderColor: '#61e894' },
  chipText: { color: '#b8cbbd', fontSize: 11, lineHeight: 16 },
  chipTextSelected: { color: '#07150b', fontWeight: '700' },
  input: { backgroundColor: '#0b160f', color: '#edf7ef', borderColor: '#294333', borderWidth: 1, borderRadius: 12, padding: 12, fontSize: 14, lineHeight: 20, minHeight: 46 },
  primaryButton: { minHeight: 46, borderRadius: 12, backgroundColor: '#61e894', alignItems: 'center', justifyContent: 'center', marginTop: 11 },
  primaryText: { color: '#07150b', fontSize: 13, fontWeight: '700' },
  secondaryButton: { minHeight: 46, borderRadius: 12, borderWidth: 1, borderColor: '#35774d', backgroundColor: '#132c1d', alignItems: 'center', justifyContent: 'center', marginTop: 11 },
  secondaryText: { color: '#84f6b0', fontSize: 12, fontWeight: '700' },
  disabled: { opacity: 0.5 },
  note: { color: '#8fa594', fontSize: 10, lineHeight: 16, marginTop: 9 },

  // Timeline rows
  timelineRow: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderRadius: 14, backgroundColor: '#0c1910', borderWidth: 1, borderColor: '#1d3927' },
  timelineIcon: { width: 28, height: 28, borderRadius: 9, backgroundColor: '#153b24', alignItems: 'center', justifyContent: 'center' },
  timelineCopy: { flex: 1, minWidth: 0 },
  timelineLabel: { color: '#eaf4ec', fontSize: 12, lineHeight: 17 },
  timelineMeta: { color: '#829687', fontSize: 9, marginTop: 3 },
  deleteButton: { padding: 8 },
  moreNote: { color: '#687b6d', fontSize: 10, textAlign: 'center', paddingVertical: 4 },

  // Patterns
  patternCard: { padding: 13, borderRadius: 15, backgroundColor: '#0d1b12', borderWidth: 1, borderColor: '#1d3927' },
  patternTop: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  patternIcon: { width: 34, height: 34, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  patternCopy: { flex: 1, minWidth: 0 },
  patternLabel: { color: '#eaf4ec', fontSize: 13, fontWeight: '600', lineHeight: 18 },
  patternMeta: { color: '#829687', fontSize: 9, marginTop: 3 },
  patternBadge: { minWidth: 30, paddingHorizontal: 8, paddingVertical: 5, borderRadius: 10, backgroundColor: '#153b26', alignItems: 'center' },
  patternBadgeText: { color: '#8ee9aa', fontSize: 12, fontWeight: '700' },
  groupTitle: { color: '#68cb89', fontSize: 9, letterSpacing: 1.1, fontWeight: '700', marginTop: 10 },
  linkRow: { flexDirection: 'row', alignItems: 'center', gap: 9, padding: 11, borderRadius: 12, backgroundColor: '#0b1420', borderWidth: 1, borderColor: '#1c2e45' },
  linkCopy: { flex: 1, minWidth: 0 },
  linkLabel: { color: '#dcebe0', fontSize: 11, lineHeight: 16 },
  linkMeta: { color: '#829687', fontSize: 9, marginTop: 2 },

  // Scenarios
  fieldLabel: { color: '#d7e8da', fontWeight: '600', fontSize: 11, lineHeight: 16, marginTop: 10, marginBottom: 6 },
  fieldPair: { flexDirection: 'row', gap: 9 },
  fieldHalf: { flex: 1 },
  scenarioCard: { padding: 14, borderRadius: 16, backgroundColor: '#0d1b12', borderWidth: 1, borderColor: '#244a32' },
  scenarioTop: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  scenarioIcon: { width: 34, height: 34, borderRadius: 11, backgroundColor: '#153b24', alignItems: 'center', justifyContent: 'center' },
  scenarioCopy: { flex: 1, minWidth: 0 },
  scenarioTitle: { color: '#eaf4ec', fontSize: 13, lineHeight: 18, fontWeight: '600' },
  scenarioMeta: { color: '#829687', fontSize: 9, marginTop: 3 },
  scenarioStats: { flexDirection: 'row', gap: 10, marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#203a29' },
  stat: { flex: 1, alignItems: 'center' },
  statValue: { color: '#61e894', fontSize: 15, fontWeight: '700' },
  statWarn: { color: '#e6c979' },
  statLabel: { color: '#829687', fontSize: 9, marginTop: 2 },

  // Reflection
  insight: { color: '#eaf4ec', fontSize: 13, lineHeight: 21 },
  error: { color: '#ff9b9b', fontSize: 11, lineHeight: 17 },
  loading: { marginVertical: 10 },
  lockedCard: { flexDirection: 'row', alignItems: 'center', gap: 9, borderRadius: 13, borderWidth: 1, borderColor: '#3c3928', backgroundColor: '#19180f', padding: 12 },
  lockedText: { flex: 1, color: '#d9e8dc', fontSize: 10, lineHeight: 15 },

  // Empty
  emptyCard: { flexDirection: 'row', alignItems: 'center', gap: 9, borderRadius: 14, borderWidth: 1, borderColor: '#1d3927', backgroundColor: '#0b1710', padding: 14 },
  emptyText: { flex: 1, color: '#8fa594', fontSize: 11, lineHeight: 17 },
});
