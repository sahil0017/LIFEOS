import { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import type { Goal } from '../goals';
import type { ObservationCategory, TwinEmbedding, TwinObservation, TwinPattern, TwinScenario } from '../twin';
import { Action, Card, Heading } from './ui';

const categories: { id: ObservationCategory; label: string }[] = [
  { id: 'routine', label: 'Routine' },
  { id: 'interest', label: 'Interest' },
  { id: 'preference', label: 'Preference' },
  { id: 'behavior', label: 'Behavior' },
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
  const [category, setCategory] = useState<ObservationCategory>('routine');
  const [observation, setObservation] = useState('');
  const [scenarioTitle, setScenarioTitle] = useState('');
  const [horizonMonths, setHorizonMonths] = useState(6);
  const [weeklyHoursChange, setWeeklyHoursChange] = useState('0');
  const [monthlyCashflowChange, setMonthlyCashflowChange] = useState('0');
  const links = useMemo(() => semanticLinks(props.observations, props.embeddings), [props.observations, props.embeddings]);

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

  return <>
    <Heading title="Personal Digital Twin" description="A user-controlled model of your routines, interests, preferences, goals, and possible choices." />
    <Card>
      <Text style={styles.tag}>PRIVATE BY DEFAULT</Text>
      <Text style={styles.body}>Your observations, patterns and scenarios are stored in your LIFEOS workspace. Analysis runs only when you enable it in Privacy and request an update.</Text>
    </Card>

    <Text style={styles.section}>Build your timeline</Text>
    <Card>
      <View style={styles.chipGrid}>
        {categories.map((item) => <Pressable key={item.id} accessibilityRole="radio" accessibilityState={{ selected: category === item.id }}
          onPress={() => setCategory(item.id)} style={[styles.chip, category === item.id && styles.selectedChip]}>
          <Text style={[styles.chipText, category === item.id && styles.selectedChipText]}>{item.label}</Text>
        </Pressable>)}
      </View>
      <TextInput accessibilityLabel="Twin observation" style={styles.input} value={observation} onChangeText={setObservation}
        maxLength={240} placeholder="e.g. I feel focused after a morning walk" placeholderTextColor="#71877a" />
      <Action label="Add observation" disabled={!observation.trim() || props.busy} onPress={() => void saveObservation()} />
      <Text style={styles.caption}>Add facts you want LIFEOS to consider. Avoid medical, financial, or other sensitive details.</Text>
    </Card>

    <Text style={styles.section}>Observed patterns</Text>
    {props.patterns.length === 0
      ? <Text style={styles.body}>Repeated patterns appear after you record the same routine, interest, preference, or behavior more than once.</Text>
      : props.patterns.map((pattern) => <Card key={pattern.key}>
        <Text style={styles.tag}>{pattern.category.toUpperCase()} · {pattern.count} ENTRIES</Text>
        <Text style={styles.cardTitle}>{pattern.label}</Text>
        <Text style={styles.caption}>Repeated entry count from your local timeline. This is evidence of repetition, not a prediction.</Text>
      </Card>)}

    {props.observations.length > 0 && <>
      <Text style={styles.section}>Recent observations</Text>
      {props.observations.slice(0, 20).map((item) => <Card key={item.id}>
        <Text style={styles.tag}>{item.category.toUpperCase()} · {new Date(item.occurredAt).toLocaleDateString()}</Text>
        <Text style={styles.body}>{item.label}</Text>
        <Action label={`Delete ${item.category} observation`} secondary disabled={props.busy} onPress={() => void props.onDeleteObservation(item.id)} />
      </Card>)}
    </>}

    {links.length > 0 && <>
      <Text style={styles.section}>Semantic links</Text>
      <Text style={styles.caption}>Similarity can surface related notes; it does not establish a real-world connection.</Text>
      {links.slice(0, 5).map((link) => <Card key={link.key}>
        <Text style={styles.cardTitle}>{link.left} ↔ {link.right}</Text>
        <Text style={styles.caption}>{Math.round(link.similarity * 100)}% cosine similarity</Text>
      </Card>)}
    </>}

    <Text style={styles.section}>Twin reflection</Text>
    <Card>
      {props.insight && <>
        <Text style={styles.tag}>REFLECTION</Text>
        <Text style={styles.body}>{props.insight}</Text>
      </>}
      {props.error && <Text accessibilityRole="alert" style={styles.error}>{props.error}</Text>}
      {props.busy && <ActivityIndicator color="#61e894" style={styles.loading} />}
      {!props.aiAllowed ? <Action label="Manage this in Privacy" secondary onPress={props.onOpenPrivacy} /> : !props.configured ? <Text style={styles.caption}>Analysis is not available yet.</Text> : <Action label="Update my Twin" disabled={props.busy || (props.observations.length === 0 && props.goals.length === 0 && props.scenarios.length === 0)} onPress={() => void props.onAnalyze()} />}
      <Text style={styles.caption}>Each update is requested by you. Treat reflections as ideas to review, not facts or professional advice.</Text>
    </Card>

    <Text style={styles.section}>Compare a possible change</Text>
    <Card>
      <TextInput accessibilityLabel="Scenario name" style={styles.input} value={scenarioTitle} onChangeText={setScenarioTitle}
        maxLength={100} placeholder="e.g. Change career" placeholderTextColor="#71877a" />
      <Text style={styles.label}>Time horizon</Text>
      <View style={styles.chipGrid}>
        {[3, 6, 12].map((months) => <Pressable key={months} accessibilityRole="radio" accessibilityState={{ selected: horizonMonths === months }}
          onPress={() => setHorizonMonths(months)} style={[styles.chip, horizonMonths === months && styles.selectedChip]}>
          <Text style={[styles.chipText, horizonMonths === months && styles.selectedChipText]}>{months} months</Text>
        </Pressable>)}
      </View>
      <Text style={styles.label}>Estimated weekly time change (hours)</Text>
      <TextInput accessibilityLabel="Estimated weekly time change in hours" style={styles.input} value={weeklyHoursChange} onChangeText={setWeeklyHoursChange}
        keyboardType="numbers-and-punctuation" placeholder="e.g. 4 or -2" placeholderTextColor="#71877a" />
      <Text style={styles.label}>Estimated monthly cash-flow change (your currency)</Text>
      <TextInput accessibilityLabel="Estimated monthly cash flow change" style={styles.input} value={monthlyCashflowChange} onChangeText={setMonthlyCashflowChange}
        keyboardType="numbers-and-punctuation" placeholder="e.g. 500 or -300" placeholderTextColor="#71877a" />
      <Action label="Save scenario" disabled={!scenarioTitle.trim() || props.busy} onPress={() => void saveScenario()} />
      <Text style={styles.caption}>These are arithmetic comparisons from your estimates, not learned forecasts. Positive cash flow means more money available each month.</Text>
    </Card>
    {props.scenarios.map((scenario) => {
      const totalTime = scenario.weeklyHoursChange * 4.33 * scenario.horizonMonths;
      const totalCashflow = scenario.monthlyCashflowChange * scenario.horizonMonths;
      return <Card key={scenario.id}>
        <Text style={styles.tag}>USER-DEFINED SCENARIO · {scenario.horizonMonths} MONTHS</Text>
        <Text style={styles.cardTitle}>{scenario.title}</Text>
        <Text style={styles.body}>{signed(totalTime, 'hours')} time · {signed(totalCashflow, 'in your currency')} net cash flow</Text>
        <Text style={styles.caption}>Linear estimate from your weekly and monthly inputs; actual outcomes may differ.</Text>
        <Action label={`Delete scenario ${scenario.title}`} secondary disabled={props.busy} onPress={() => void props.onDeleteScenario(scenario.id)} />
      </Card>;
    })}

    <Text style={styles.section}>Model roadmap</Text>
    <Card><Text style={styles.cardTitle}>Available now</Text><Text style={styles.body}>Local activity counts, scenario comparisons and optional reflections on demand.</Text></Card>
    <Card><Text style={styles.cardTitle}>Next research steps</Text><Text style={styles.body}>A personal graph and sequence model need richer, consented time-series data and outcome tracking. This version does not contain a trained temporal transformer or graph neural network.</Text></Card>
  </>;
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
  return `${rounded > 0 ? '+' : ''}${rounded} ${unit}`;
}

const styles = StyleSheet.create({
  section: { color: '#eaf4ec', fontSize: 18, lineHeight: 24, fontWeight: '700', marginTop: 24, marginBottom: 12 },
  cardTitle: { color: '#eaf4ec', fontSize: 16, fontWeight: '700', lineHeight: 23, marginBottom: 6 },
  tag: { color: '#79d99b', fontSize: 10, fontWeight: '700', letterSpacing: 0.8, lineHeight: 15, marginBottom: 8 },
  body: { color: '#b8cbbd', fontSize: 14, lineHeight: 22 },
  caption: { color: '#8fa594', fontSize: 12, lineHeight: 18, marginTop: 8 },
  label: { color: '#d7e8da', fontWeight: '600', fontSize: 13, lineHeight: 19, marginTop: 12, marginBottom: 7 },
  input: { backgroundColor: '#0b160f', color: '#edf7ef', borderColor: '#294333', borderWidth: 1, borderRadius: 12, padding: 14, fontSize: 16, lineHeight: 22, marginTop: 10, minHeight: 50 },
  chipGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 },
  chip: { borderWidth: 1, borderColor: '#294333', borderRadius: 18, paddingHorizontal: 12, paddingVertical: 9, backgroundColor: '#0b160f' },
  selectedChip: { backgroundColor: '#153b26', borderColor: '#58b97b' },
  chipText: { color: '#b8cbbd', fontSize: 12, lineHeight: 17 },
  selectedChipText: { color: '#eaf4ec', fontWeight: '700' },
  error: { color: '#ff9b9b', marginBottom: 12, lineHeight: 20 },
  loading: { marginBottom: 12 },
});
