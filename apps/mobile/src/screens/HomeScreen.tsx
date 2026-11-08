import { useEffect, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { Goal } from '../goals';
import type { TwinObservation, TwinPattern, TwinScenario } from '../twin';
import type { VisionCapture } from '../vision';
import type { DailyActivity } from '../api';
import { apiFetch, isApiConfigured } from '../api';

// ─── Types ───────────────────────────────────────────────────────────────────

interface LearningGoal {
  id: number;
  skill: string;
  progress: number;
}

interface ModuleInsight {
  id: string;
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  sub: string;
  color: string;
  accent: string;
  onPress: () => void;
}

export interface HomeScreenProps {
  goals: readonly Goal[];
  observations: readonly TwinObservation[];
  patterns: readonly TwinPattern[];
  scenarios: readonly TwinScenario[];
  captures: readonly VisionCapture[];
  activityDays: readonly DailyActivity[];
  /** Live steps read directly from the device pedometer for today, when available. */
  deviceStepsToday?: number | null;
  healthAllowed: boolean;
  aiConfigured: boolean;
  onOpenAssistant: () => void;
  onOpenTwin: () => void;
  onOpenVisual: () => void;
  onOpenHealth: () => void;
  onOpenFood: () => void;
  onOpenLearning: () => void;
  onOpenVoice: () => void;
  onOpenEnvironment: () => void;
  onOpenPrivacy: () => void;
  onOpenModules: () => void;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

// ─── Module Insight Card ──────────────────────────────────────────────────────

function InsightCard({ item }: { item: ModuleInsight }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${item.label}: ${item.value}`}
      onPress={item.onPress}
      style={[styles.insightCard, { borderColor: item.accent + '44' }]}
    >
      <View style={[styles.insightIconWrap, { backgroundColor: item.accent + '22' }]}>
        <Ionicons name={item.icon} size={18} color={item.color} />
      </View>
      <Text style={styles.insightLabel}>{item.label.toUpperCase()}</Text>
      <Text style={[styles.insightValue, { color: item.color }]}>{item.value}</Text>
      <Text style={styles.insightSub} numberOfLines={2}>{item.sub}</Text>
      <Text style={[styles.insightArrow, { color: item.color }]}>↗</Text>
    </Pressable>
  );
}

// ─── Today's Pulse strip ─────────────────────────────────────────────────────

function TodayPulse({
  stepsToday,
  captureCount,
  observationCount,
  goalCount,
}: {
  stepsToday: number;
  captureCount: number;
  observationCount: number;
  goalCount: number;
}) {
  const items = [
    { label: 'Steps', value: stepsToday > 0 ? stepsToday.toLocaleString() : '—', icon: 'footsteps-outline' as keyof typeof Ionicons.glyphMap },
    { label: 'Captures', value: String(captureCount), icon: 'scan-outline' as keyof typeof Ionicons.glyphMap },
    { label: 'Signals', value: String(observationCount), icon: 'pulse-outline' as keyof typeof Ionicons.glyphMap },
    { label: 'Goals', value: String(goalCount), icon: 'flag-outline' as keyof typeof Ionicons.glyphMap },
  ];
  return (
    <View style={styles.pulseStrip}>
      {items.map((item, i) => (
        <View key={item.label} style={[styles.pulseCell, i < items.length - 1 && styles.pulseCellBorder]}>
          <Ionicons name={item.icon} size={13} color="#65e99a" />
          <Text style={styles.pulseCellValue}>{item.value}</Text>
          <Text style={styles.pulseCellLabel}>{item.label}</Text>
        </View>
      ))}
    </View>
  );
}

// ─── Recent Observations feed ─────────────────────────────────────────────────

function ObservationFeed({ items, onPress }: { items: readonly TwinObservation[]; onPress: () => void }) {
  const categoryIcon: Record<string, keyof typeof Ionicons.glyphMap> = {
    routine: 'repeat-outline',
    interest: 'star-outline',
    preference: 'heart-outline',
    behavior: 'flash-outline',
  };
  const show = items.slice(0, 4);
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={styles.feedCard}>
      <View style={styles.feedHeader}>
        <Text style={styles.feedEyebrow}>RECENT SIGNALS</Text>
        <Text style={styles.feedLink}>Twin  ↗</Text>
      </View>
      {show.length === 0 && (
        <Text style={styles.feedEmpty}>No signals yet — open Personal Twin to record your first observation.</Text>
      )}
      {show.map((obs) => (
        <View key={obs.id} style={styles.feedRow}>
          <View style={styles.feedRowIcon}>
            <Ionicons name={categoryIcon[obs.category] ?? 'ellipse-outline'} size={12} color="#65e99a" />
          </View>
          <Text style={styles.feedRowText} numberOfLines={1}>{obs.label}</Text>
          <Text style={styles.feedRowTime}>{timeAgo(obs.occurredAt)}</Text>
        </View>
      ))}
    </Pressable>
  );
}

// ─── Learning Progress bar ────────────────────────────────────────────────────

function LearningBar({ goals, onPress }: { goals: LearningGoal[]; onPress: () => void }) {
  const show = goals.slice(0, 3);
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={styles.learningCard}>
      <View style={styles.feedHeader}>
        <Text style={styles.feedEyebrow}>LEARNING PROGRESS</Text>
        <Text style={styles.feedLink}>Open  ↗</Text>
      </View>
      {show.length === 0 && (
        <Text style={styles.feedEmpty}>No learning goals yet — add skills in the Learning module.</Text>
      )}
      {show.map((g) => (
        <View key={g.id} style={styles.lgoalRow}>
          <View style={styles.lgoalTop}>
            <Text style={styles.lgoalName} numberOfLines={1}>{g.skill}</Text>
            <Text style={styles.lgoalPct}>{Math.round((g.progress ?? 0) * 100)}%</Text>
          </View>
          <View style={styles.lgoalTrack}>
            <View style={[styles.lgoalFill, { width: `${Math.round((g.progress ?? 0) * 100)}%` }]} />
          </View>
        </View>
      ))}
    </Pressable>
  );
}

// ─── Step Activity mini-chart ─────────────────────────────────────────────────

function ActivityMini({
  days,
  deviceStepsToday,
  onPress,
}: {
  days: readonly DailyActivity[];
  deviceStepsToday: number;
  onPress: () => void;
}) {
  const chart = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() - (6 - i));
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    const synced = days.find((x) => x.day === key)?.steps ?? 0;
    // Use the live device count for today when it is fresher than the last sync.
    return {
      label: d.toLocaleDateString(undefined, { weekday: 'narrow' }),
      steps: i === 6 ? Math.max(synced, deviceStepsToday) : synced,
    };
  });
  const max = Math.max(1, ...chart.map((c) => c.steps));
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={styles.activityCard}>
      <View style={styles.feedHeader}>
        <Text style={styles.feedEyebrow}>STEPS · 7 DAYS</Text>
        <Text style={styles.feedLink}>Health  ↗</Text>
      </View>
      <View style={styles.miniChart}>
        {chart.map((c, i) => (
          <View key={i} style={styles.miniBarCol}>
            <View style={styles.miniBarTrack}>
              <View
                style={[
                  styles.miniBar,
                  { height: `${Math.max(c.steps ? 8 : 0, (c.steps / max) * 100)}%` },
                ]}
              />
            </View>
            <Text style={styles.miniBarDay}>{c.label}</Text>
          </View>
        ))}
      </View>
      <Text style={styles.activityTotal}>
        {chart.reduce((s, c) => s + c.steps, 0).toLocaleString()} total steps this week
      </Text>
    </Pressable>
  );
}

// ─── Scenario card ────────────────────────────────────────────────────────────

function ScenarioCard({ scenario, onPress }: { scenario: TwinScenario; onPress: () => void }) {
  const totalHours = Math.round(scenario.weeklyHoursChange * 4.33 * scenario.horizonMonths * 10) / 10;
  const totalCash = Math.round(scenario.monthlyCashflowChange * scenario.horizonMonths);
  const fmt = (n: number) => `${n > 0 ? '+' : ''}${n}`;
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={styles.scenarioCard}>
      <View style={styles.scenarioIconWrap}>
        <Ionicons name="git-branch-outline" size={18} color="#73f5a8" />
      </View>
      <View style={styles.scenarioCopy}>
        <Text style={styles.feedEyebrow}>WHAT-IF · {scenario.horizonMonths} MONTHS</Text>
        <Text style={styles.scenarioTitle} numberOfLines={1}>{scenario.title}</Text>
        <Text style={styles.scenarioMeta}>{fmt(totalHours)} hrs · {fmt(totalCash)} cash flow</Text>
      </View>
      <Ionicons name="chevron-forward-outline" size={16} color="#65e99a" />
    </Pressable>
  );
}

// ─── Main HomeScreen ──────────────────────────────────────────────────────────

export function HomeScreen(props: HomeScreenProps) {
  const [learningGoals, setLearningGoals] = useState<LearningGoal[]>([]);
  const [refreshedAt, setRefreshedAt] = useState<Date>(new Date());

  // Load learning goals from API
  useEffect(() => {    if (!isApiConfigured) return;
    apiFetch<{ goals: LearningGoal[] }>('/learning/goals')
      .then((res) => setLearningGoals(res.goals ?? []))
      .catch(() => { /* silently skip if unavailable */ });
  }, [refreshedAt]);


  // Derived stats
  const todayKey = (() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  })();
  const stepsToday = Math.max(
    props.activityDays.find((d) => d.day === todayKey)?.steps ?? 0,
    props.deviceStepsToday ?? 0,
  );
  const latestPattern = props.patterns[0];
  const latestScenario = props.scenarios[0];
  const latestCapture = props.captures[0];
  const topGoal = props.goals[0];
  const avgProgress =
    learningGoals.length > 0
      ? Math.round(learningGoals.reduce((s, g) => s + (g.progress ?? 0), 0) / learningGoals.length * 100)
      : null;

  // Module insight cards
  const insights: ModuleInsight[] = [
    {
      id: 'health',
      icon: 'heart-outline',
      label: 'Health',
      value: stepsToday > 0 ? `${stepsToday.toLocaleString()} steps` : props.healthAllowed ? 'No data yet' : 'Paused',
      sub: stepsToday >= 10000 ? 'Goal reached today! 🎉' : stepsToday > 0 ? `${(10000 - stepsToday).toLocaleString()} to daily goal` : 'Enable health access to track steps',
      color: '#76e69a',
      accent: '#76e69a',
      onPress: props.onOpenHealth,
    },
    {
      id: 'twin',
      icon: 'git-network-outline',
      label: 'Twin',
      value: `${props.observations.length} signals`,
      sub: latestPattern ? `Top pattern: "${latestPattern.label}" ×${latestPattern.count}` : 'Start logging observations to build patterns',
      color: '#73f5a8',
      accent: '#73f5a8',
      onPress: props.onOpenTwin,
    },
    {
      id: 'visual',
      icon: 'scan-outline',
      label: 'Visual',
      value: `${props.captures.length} captures`,
      sub: latestCapture ? `Last: ${latestCapture.question.slice(0, 40)}` : 'Capture objects, scenes & documents',
      color: '#a3d4ff',
      accent: '#a3d4ff',
      onPress: props.onOpenVisual,
    },
    {
      id: 'learning',
      icon: 'school-outline',
      label: 'Learning',
      value: avgProgress !== null ? `${avgProgress}% avg` : `${learningGoals.length} goals`,
      sub: learningGoals[0] ? `Active: ${learningGoals[0].skill}` : 'Set skills & track progress',
      color: '#ffd580',
      accent: '#ffd580',
      onPress: props.onOpenLearning,
    },
    {
      id: 'food',
      icon: 'nutrition-outline',
      label: 'Food',
      value: 'Log meals',
      sub: 'Track nutrition & eating patterns',
      color: '#ff9f7a',
      accent: '#ff9f7a',
      onPress: props.onOpenFood,
    },
    {
      id: 'environment',
      icon: 'cloud-outline',
      label: 'Environment',
      value: 'Context',
      sub: 'Weather, air quality & surroundings',
      color: '#c3b1f7',
      accent: '#c3b1f7',
      onPress: props.onOpenEnvironment,
    },
    {
      id: 'voice',
      icon: 'mic-outline',
      label: 'Voice',
      value: 'Notes',
      sub: 'Transcribe thoughts & voice memos',
      color: '#f7a1c4',
      accent: '#f7a1c4',
      onPress: props.onOpenVoice,
    },
    {
      id: 'assistant',
      icon: 'sparkles-outline',
      label: 'Assistant',
      value: props.aiConfigured ? 'Ready' : 'Not configured',
      sub: 'Ask anything, compare options, think out loud',
      color: '#61e894',
      accent: '#61e894',
      onPress: props.onOpenAssistant,
    },
  ];

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

      {/* ── Header ── */}
      <View style={styles.header}>
        <View style={styles.brandRow}>
          <View style={styles.brandMark}>
            <Text style={styles.brandMarkText}>✳</Text>
          </View>
          <Text style={styles.brand}>LIFEOS</Text>
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Open privacy settings"
          onPress={props.onOpenPrivacy}
          style={styles.privacyBtn}
        >
          <Ionicons name="shield-checkmark-outline" size={18} color="#76dfa0" />
        </Pressable>
      </View>

      {/* ── Ask assistant shortcut ── */}
      <Pressable
        accessibilityRole="button"
        onPress={props.onOpenAssistant}
        style={styles.assistantBar}
      >
        <Ionicons name="sparkles-outline" size={16} color="#88efaa" />
        <Text style={styles.assistantBarText}>What are you thinking about?</Text>
        <Ionicons name="arrow-forward-outline" size={15} color="#66e89a" />
      </Pressable>

      {/* ── Today's Pulse ── */}
      <TodayPulse
        stepsToday={stepsToday}
        captureCount={props.captures.length}
        observationCount={props.observations.length}
        goalCount={props.goals.length}
      />

      {/* ── Module Insight Grid ── */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionEyebrow}>ALL MODULES</Text>
        <Pressable accessibilityRole="button" onPress={props.onOpenModules}>
          <Text style={styles.seeAll}>See all  ↗</Text>
        </Pressable>
      </View>

      <View style={styles.insightGrid}>
        {insights.map((item) => (
          <InsightCard key={item.id} item={item} />
        ))}
      </View>

      {/* ── Recent Signals Feed ── */}
      <ObservationFeed items={props.observations} onPress={props.onOpenTwin} />

      {/* ── Activity Chart ── */}
      {props.healthAllowed && (
        <ActivityMini days={props.activityDays} deviceStepsToday={stepsToday} onPress={props.onOpenHealth} />
      )}

      {/* ── Learning Progress ── */}
      <LearningBar goals={learningGoals} onPress={props.onOpenLearning} />

      {/* ── Active Scenario ── */}
      {latestScenario && (
        <>
          <View style={[styles.sectionHeader, { marginTop: 6 }]}>
            <Text style={styles.sectionEyebrow}>ACTIVE WHAT-IF</Text>
          </View>
          <ScenarioCard scenario={latestScenario} onPress={props.onOpenTwin} />
        </>
      )}

      {/* ── Latest Visual Capture ── */}
      {latestCapture && (
        <Pressable accessibilityRole="button" onPress={props.onOpenVisual} style={styles.captureCard}>
          <View style={styles.captureThumb}>
            <Ionicons name="scan-outline" size={22} color="#a3d4ff" />
          </View>
          <View style={styles.captureCopy}>
            <Text style={styles.feedEyebrow}>LATEST VISUAL NOTE</Text>
            <Text style={styles.captureTitle} numberOfLines={1}>{latestCapture.question}</Text>
            {latestCapture.answer && (
              <Text style={styles.captureSub} numberOfLines={2}>{latestCapture.answer}</Text>
            )}
          </View>
          <Ionicons name="chevron-forward-outline" size={16} color="#a3d4ff" />
        </Pressable>
      )}

      {/* ── Top Goal ── */}
      {topGoal && (
        <Pressable accessibilityRole="button" onPress={props.onOpenTwin} style={styles.goalCard}>
          <View style={styles.goalIconWrap}>
            <Ionicons name="flag-outline" size={18} color="#ffd580" />
          </View>
          <View style={styles.goalCopy}>
            <Text style={styles.feedEyebrow}>TOP GOAL</Text>
            <Text style={styles.goalTitle} numberOfLines={1}>{topGoal.title}</Text>
            <Text style={styles.goalSub}>{topGoal.sessionCount} session{topGoal.sessionCount !== 1 ? 's' : ''} logged</Text>
          </View>
          <Ionicons name="chevron-forward-outline" size={16} color="#ffd580" />
        </Pressable>
      )}

      {/* ── Footer ── */}
      <View style={styles.footer}>
        <Pressable accessibilityRole="button" onPress={props.onOpenModules} style={styles.footerBtn}>
          <Ionicons name="apps-outline" size={14} color="#72df98" />
          <Text style={styles.footerBtnText}>All Modules & Engines</Text>
          <Ionicons name="arrow-forward-outline" size={13} color="#72df98" />
        </Pressable>
        <Text style={styles.footerNote}>
          {new Date(refreshedAt).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })} · all data stays on-device
        </Text>
      </View>
    </ScrollView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#06100b' },
  content: { paddingHorizontal: 18, paddingTop: 12, paddingBottom: 36, maxWidth: 720, width: '100%', alignSelf: 'center' },

  // Header
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  brandMark: { width: 28, height: 28, borderRadius: 9, alignItems: 'center', justifyContent: 'center', backgroundColor: '#12351f', borderColor: '#27764a', borderWidth: 1 },
  brandMarkText: { color: '#73f5a8', fontSize: 18 },
  brand: { color: '#edf7f0', fontSize: 15, fontWeight: '700', letterSpacing: 1.5 },
  privacyBtn: { width: 39, height: 39, borderRadius: 13, borderWidth: 1, borderColor: '#21382b', backgroundColor: '#101d15', alignItems: 'center', justifyContent: 'center' },

  // Location chip (in header)
  locationChip: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, marginHorizontal: 10, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 20, backgroundColor: '#0d1f12', borderWidth: 1, borderColor: '#1e4a2b' },
  locationChipText: { color: '#68cb89', fontSize: 11, fontWeight: '600', letterSpacing: 0.2, flexShrink: 1 },

  // Assistant bar
  assistantBar: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14, borderRadius: 16, backgroundColor: '#102619', borderColor: '#2b6540', borderWidth: 1, marginBottom: 14 },
  assistantBarText: { flex: 1, color: '#a5b8a9', fontSize: 13, lineHeight: 18 },

  // Today pulse strip
  pulseStrip: { flexDirection: 'row', borderRadius: 15, borderWidth: 1, borderColor: '#1c3a26', backgroundColor: '#0b1810', marginBottom: 22, overflow: 'hidden' },
  pulseCell: { flex: 1, alignItems: 'center', paddingVertical: 13, gap: 3 },
  pulseCellBorder: { borderRightWidth: 1, borderRightColor: '#1c3a26' },
  pulseCellValue: { color: '#eaf4ec', fontSize: 15, lineHeight: 19, fontWeight: '700' },
  pulseCellLabel: { color: '#829687', fontSize: 8, lineHeight: 12, letterSpacing: 0.5 },

  // Section header
  sectionHeader: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: 8, marginBottom: 11, flexWrap: 'wrap' },
  sectionEyebrow: { color: '#68cb89', fontSize: 9, letterSpacing: 1.2, fontWeight: '700', flexShrink: 0 },
  sectionTitle: { color: '#eaf4ec', fontSize: 17, fontWeight: '600', flex: 1 },
  seeAll: { color: '#66e89a', fontSize: 11, fontWeight: '600' },

  // Insight grid
  insightGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 20 },
  insightCard: { width: '47%', flexGrow: 1, minWidth: 140, borderRadius: 16, borderWidth: 1, backgroundColor: '#0c1910', padding: 13 },
  insightIconWrap: { width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  insightLabel: { color: '#829687', fontSize: 8, letterSpacing: 0.9, fontWeight: '700', marginBottom: 4 },
  insightValue: { fontSize: 15, lineHeight: 20, fontWeight: '700', marginBottom: 4 },
  insightSub: { color: '#829687', fontSize: 9, lineHeight: 14, flex: 1 },
  insightArrow: { fontSize: 12, fontWeight: '700', marginTop: 8, alignSelf: 'flex-end' },

  // Feed card (shared by observations, learning, activity)
  feedCard: { borderRadius: 18, borderWidth: 1, borderColor: '#1c3a26', backgroundColor: '#0b1810', padding: 15, marginBottom: 14 },
  feedHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  feedEyebrow: { color: '#68cb89', fontSize: 9, letterSpacing: 1, fontWeight: '700' },
  feedLink: { color: '#66e89a', fontSize: 11, fontWeight: '600' },
  feedEmpty: { color: '#829687', fontSize: 11, lineHeight: 17 },
  feedRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 7, borderTopWidth: 1, borderTopColor: '#152318' },
  feedRowIcon: { width: 22, height: 22, borderRadius: 7, backgroundColor: '#153b24', alignItems: 'center', justifyContent: 'center' },
  feedRowText: { flex: 1, color: '#dcebe0', fontSize: 11, lineHeight: 15 },
  feedRowTime: { color: '#829687', fontSize: 9 },

  // Learning card
  learningCard: { borderRadius: 18, borderWidth: 1, borderColor: '#2a2010', backgroundColor: '#131008', padding: 15, marginBottom: 14 },
  lgoalRow: { paddingVertical: 8, borderTopWidth: 1, borderTopColor: '#1f1a0d' },
  lgoalTop: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 },
  lgoalName: { color: '#eaf4ec', fontSize: 11, flex: 1, fontWeight: '500' },
  lgoalPct: { color: '#ffd580', fontSize: 10, fontWeight: '700' },
  lgoalTrack: { height: 5, borderRadius: 3, backgroundColor: '#231c0c', overflow: 'hidden' },
  lgoalFill: { height: 5, borderRadius: 3, backgroundColor: '#ffd580' },

  // Activity chart card
  activityCard: { borderRadius: 18, borderWidth: 1, borderColor: '#1c3a26', backgroundColor: '#0b1810', padding: 15, marginBottom: 14 },
  miniChart: { flexDirection: 'row', alignItems: 'flex-end', gap: 6, height: 72, marginBottom: 10 },
  miniBarCol: { flex: 1, alignItems: 'center' },
  miniBarTrack: { height: 60, width: '70%', borderRadius: 5, backgroundColor: '#15251a', justifyContent: 'flex-end', overflow: 'hidden' },
  miniBar: { width: '100%', borderRadius: 5, backgroundColor: '#54d983', minHeight: 2 },
  miniBarDay: { color: '#829687', fontSize: 8, marginTop: 4 },
  activityTotal: { color: '#829687', fontSize: 10, lineHeight: 15 },

  // Scenario card
  scenarioCard: { flexDirection: 'row', alignItems: 'center', gap: 11, padding: 14, borderRadius: 16, borderWidth: 1, borderColor: '#244a32', backgroundColor: '#0d1a12', marginBottom: 10 },
  scenarioIconWrap: { width: 36, height: 36, borderRadius: 11, backgroundColor: '#153a22', alignItems: 'center', justifyContent: 'center' },
  scenarioCopy: { flex: 1, minWidth: 0 },
  scenarioTitle: { color: '#eaf4ec', fontSize: 13, lineHeight: 18, fontWeight: '600', marginTop: 3 },
  scenarioMeta: { color: '#9cad9f', fontSize: 10, lineHeight: 15, marginTop: 3 },

  // Capture card
  captureCard: { flexDirection: 'row', alignItems: 'center', gap: 11, padding: 14, borderRadius: 16, borderWidth: 1, borderColor: '#1c2e45', backgroundColor: '#0b1420', marginBottom: 10 },
  captureThumb: { width: 44, height: 44, borderRadius: 13, backgroundColor: '#132240', alignItems: 'center', justifyContent: 'center' },
  captureCopy: { flex: 1, minWidth: 0 },
  captureTitle: { color: '#eaf4ec', fontSize: 13, lineHeight: 18, fontWeight: '600', marginTop: 3 },
  captureSub: { color: '#9cad9f', fontSize: 10, lineHeight: 15, marginTop: 3 },

  // Goal card
  goalCard: { flexDirection: 'row', alignItems: 'center', gap: 11, padding: 14, borderRadius: 16, borderWidth: 1, borderColor: '#2a2010', backgroundColor: '#131008', marginBottom: 10 },
  goalIconWrap: { width: 36, height: 36, borderRadius: 11, backgroundColor: '#231c0c', alignItems: 'center', justifyContent: 'center' },
  goalCopy: { flex: 1, minWidth: 0 },
  goalTitle: { color: '#eaf4ec', fontSize: 13, lineHeight: 18, fontWeight: '600', marginTop: 3 },
  goalSub: { color: '#9cad9f', fontSize: 10, lineHeight: 15, marginTop: 3 },

  // Footer
  footer: { marginTop: 10, alignItems: 'center', gap: 10 },
  footerBtn: { flexDirection: 'row', alignItems: 'center', gap: 7, paddingVertical: 12, paddingHorizontal: 20, borderRadius: 13, borderWidth: 1, borderColor: '#244a32', backgroundColor: '#0d1a12' },
  footerBtnText: { color: '#72df98', fontSize: 12, fontWeight: '600' },
  footerNote: { color: '#4a6354', fontSize: 9, letterSpacing: 0.5 },
});
