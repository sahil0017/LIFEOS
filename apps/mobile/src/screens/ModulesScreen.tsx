import { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { extractInsights } from '../intelligenceApi';
import type { Screen } from '../useLifeOs';
import type { ModuleId } from '../context';

// ─── Tools taxonomy ───────────────────────────────────────────────────────────
// One mental model: Tools are the things you DO (actions),
// Insights are the answers the AI gives you (engines).

interface ToolDef {
  id: string;
  name: string;
  glyph: keyof typeof Ionicons.glyphMap;
  tint: string;
  /** What it does for you, in plain words. */
  purpose: string;
  route?: Screen;
}

const tools: ToolDef[] = [
  { id: 'assistant', name: 'Assistant', glyph: 'sparkles-outline', tint: '#61e894', purpose: 'Ask anything — plans, decisions, patterns', route: 'Assistant' },
  { id: 'twin', name: 'Personal Twin', glyph: 'git-network-outline', tint: '#73f5a8', purpose: 'See who you are becoming, from your notes', route: 'PersonalTwin' },
  { id: 'visual', name: 'Visual Intelligence', glyph: 'scan-outline', tint: '#a3d4ff', purpose: 'Point your camera, get answers about things', route: 'VisualIntelligence' },
  { id: 'voice', name: 'Voice Notes', glyph: 'mic-outline', tint: '#f7a1c4', purpose: 'Speak your thoughts, get them saved', route: 'Voice' },
  { id: 'health', name: 'Health', glyph: 'heart-outline', tint: '#76e69a', purpose: 'Steps, movement and energy patterns', route: 'Health' },
  { id: 'food', name: 'Food', glyph: 'nutrition-outline', tint: '#ff9f7a', purpose: 'Log meals, see nutrition patterns', route: 'Food' },
  { id: 'learning', name: 'Learning', glyph: 'school-outline', tint: '#ffd580', purpose: 'Track skills and study progress', route: 'Learning' },
  { id: 'environment', name: 'Environment', glyph: 'cloud-outline', tint: '#c3b1f7', purpose: 'Weather and surroundings that affect you', route: 'Environment' },
  { id: 'files', name: 'Files', glyph: 'document-text-outline', tint: '#8fd7f2', purpose: 'Your documents, summarized and searchable', route: 'Files' },
  { id: 'accessibility', name: 'Accessibility', glyph: 'accessibility-outline', tint: '#b8e986', purpose: 'Adjust LIFEOS to how you perceive it', route: 'Accessibility' },
];

interface InsightDef {
  id: string;
  name: string;
  glyph: keyof typeof Ionicons.glyphMap;
  /** The question this engine answers. Shown as the card headline. */
  question: string;
  detail: string;
  category: 'Core' | 'Experimental';
}

const insights: InsightDef[] = [
  { id: 'overview', name: '360 Overview', glyph: 'grid-outline', question: 'How does everything connect?', detail: 'Runs every data domain through its engines and connects the findings across your life.', category: 'Core' },
  { id: 'multiverse', name: 'Multiverse', glyph: 'git-network-outline', question: 'Where could each of my paths lead?', detail: 'Runs every saved scenario through simulation and compares the futures.', category: 'Core' },
  { id: 'cognitive_memory', name: 'Self Memory', glyph: 'person-outline', question: 'What patterns keep repeating in my life?', detail: 'Connects months of your notes into a memory graph of habits and preferences.', category: 'Core' },
  { id: 'multi_agent', name: 'Decision Council', glyph: 'git-branch-outline', question: 'Which choice should I make?', detail: 'Five independent agents debate your options and vote on a recommendation.', category: 'Core' },
  { id: 'world_model', name: 'Trajectory', glyph: 'telescope-outline', question: 'Where is my current path taking me?', detail: 'Projects career, finance and learning trends months ahead from live data.', category: 'Core' },
  { id: 'generative', name: 'Creative', glyph: 'color-wand-outline', question: 'What options am I not seeing?', detail: 'Generates unconventional ideas and challenges your assumptions.', category: 'Core' },
  { id: 'predictive', name: 'Forecast', glyph: 'trending-up-outline', question: 'What happens next if nothing changes?', detail: 'Forecasts measurable trends — steps, cash flow, learning progress.', category: 'Core' },
  { id: 'quantum', name: 'Possibility Engine', glyph: 'infinite-outline', question: 'How uncertain is this really?', detail: 'Maps probability branches when a decision feels too close to call.', category: 'Experimental' },
  { id: 'neuromorphic', name: 'Event Radar', glyph: 'pulse-outline', question: 'What just changed in my routine?', detail: 'Reacts to fresh device signals and flags pattern breaks in real time.', category: 'Experimental' },
];

/** Legacy module-id → screen mapping retained for other screens that need it. */
export const legacyRoutes: Partial<Record<ModuleId, Screen>> = {
  assistant: 'Assistant', twin: 'PersonalTwin', visual: 'VisualIntelligence', voice: 'Voice',
  health: 'Health', food: 'Food', learning: 'Learning', environment: 'Environment',
  accessibility: 'Accessibility', files: 'Files',
};

export interface ModulesScreenProps {
  /** Whether the intelligence backend is reachable and Cloudflare AI is live. */
  aiConnected: boolean;
  /** Shared engine-run state from useLifeOs (real Python backend calls). */
  engineRun: { busy: boolean; error: string | null; result: import('../intelligenceApi').ModuleRunResult | null; cross: import('../intelligenceApi').CrossModuleResult | null };
  onRunEngine: (moduleId: string) => void;
  onClearEngineRun: () => void;
  onOpen: (screen: Screen) => void;
  onOpenHelpSearch: () => void;
}

export function ModulesScreen(props: ModulesScreenProps) {
  const [tab, setTab] = useState<'tools' | 'insights'>('tools');
  const [openEngine, setOpenEngine] = useState<string | null>(null);

  const running = props.engineRun.busy;
  const engine = insights.find((e) => e.id === openEngine);

  const runResult = useMemo(() => {
    const { cross, result } = props.engineRun;
    if (cross) {
      return {
        title: `Answer · ${cross.problem_type.replaceAll('_', ' ')}`,
        confidence: cross.confidence,
        insights: [
          ...cross.synthesis.key_insights,
          ...Object.entries(cross.results).flatMap(([, r]) => extractInsights(r.result).slice(0, 2)),
          `Ran ${cross.modules_run.length} engines · ${Math.round(cross.total_execution_time_ms)} ms`,
        ],
        recommendations: cross.recommendations,
      };
    }
    if (result) {
      const lines = extractInsights(result.result);
      return {
        title: `${engine?.name ?? result.module.replaceAll('_', ' ')}`,
        confidence: result.confidence,
        insights: lines.length > 0 ? lines : [`Completed in ${Math.round(result.execution_time_ms)} ms using your live context.`],
        recommendations: result.recommendations ?? [],
      };
    }
    return null;
  }, [props.engineRun, engine]);

  function openTool(tool: ToolDef) {
    if (tool.route) props.onOpen(tool.route);
  }

  function runSelected() {
    if (!engine) return;
    setOpenEngine(null);
    props.onClearEngineRun();
    props.onRunEngine(engine.id);
  }

  // ── Ask confirmation sheet (simple inline detail before running) ──
  if (engine) {
    return (
      <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
        <Pressable accessibilityRole="button" onPress={() => { setOpenEngine(null); props.onClearEngineRun(); }} style={styles.back}>
          <Text style={styles.backText}>‹  All insights</Text>
        </Pressable>

        <View style={styles.hero}>
          <View style={[styles.heroIcon, { backgroundColor: '#153b24' }]}>
            <Ionicons name={engine.glyph} size={26} color="#73f5a8" />
          </View>
          <Text style={styles.heroQuestion}>{engine.question}</Text>
          <Text style={styles.heroDetail}>{engine.detail}</Text>
        </View>

        <View style={styles.inputCard}>
          <View style={styles.inputHeader}>
            <Ionicons name="server-outline" size={14} color="#68cb89" />
            <Text style={styles.inputTitle}>What it reads from your LIFEOS</Text>
          </View>
          <Text style={styles.inputBody}>
            Your goals, observations, scenarios and synced activity — nothing else. Runs on the LIFEOS intelligence service with Cloudflare AI.
          </Text>
        </View>

        <Pressable
          accessibilityRole="button"
          disabled={running || !props.aiConnected}
          onPress={runSelected}
          style={[styles.primaryButton, (running || !props.aiConnected) && styles.buttonDisabled]}
        >
          {running
            ? <ActivityIndicator color="#07150b" size="small" />
            : <Text style={styles.primaryButtonText}>{props.aiConnected ? 'Get the answer' : 'AI service offline'}</Text>}
        </Pressable>

        {props.engineRun.error && <Text style={styles.errorText}>{props.engineRun.error}</Text>}

        {!props.aiConnected && !running && (
          <Text style={styles.offlineNote}>The intelligence service is not connected right now. Try again once the Home screen shows “AI service connected”.</Text>
        )}
      </ScrollView>
    );
  }

  // ── Main list ──
  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <View style={styles.intro}>
        <Text style={styles.eyebrow}>TOOLS</Text>
        <Text style={styles.title}>Do things. Get answers.</Text>
        <Text style={styles.subtitle}>
          Tools help you capture and act. Insights answer real questions using everything you have saved.
        </Text>
      </View>

      <View style={styles.segmentContainer}>
        <Segment active={tab === 'tools'} label="Tools" count={tools.length} icon="construct-outline" onPress={() => setTab('tools')} />
        <Segment active={tab === 'insights'} label="Insights" count={insights.length} icon="bulb-outline" onPress={() => setTab('insights')} />
      </View>

      {props.engineRun.result || props.engineRun.cross ? (
        <Pressable accessibilityRole="button" onPress={props.onClearEngineRun} style={styles.lastAnswerCard}>
          <View style={styles.lastAnswerHeader}>
            <Ionicons name="checkmark-circle-outline" size={15} color="#61e894" />
            <Text style={styles.lastAnswerTitle}>{runResult?.title ?? 'Latest answer'}</Text>
            <Text style={styles.lastAnswerConf}>{Math.round((runResult?.confidence ?? 0) * 100)}%</Text>
          </View>
          {(runResult?.insights ?? []).slice(0, 3).map((line, i) => (
            <Text key={i} style={styles.lastAnswerLine} numberOfLines={2}>• {line}</Text>
          ))}
          <Text style={styles.lastAnswerHint}>Tap to dismiss</Text>
        </Pressable>
      ) : props.engineRun.error ? (
        <View style={styles.lastAnswerCard}><Text style={styles.errorText}>{props.engineRun.error}</Text></View>
      ) : null}

      {tab === 'tools' && (
        <View style={styles.toolList}>
          {tools.map((tool) => {
            const ready = Boolean(tool.route);
            return (
              <Pressable
                key={tool.id}
                accessibilityRole="button"
                accessibilityLabel={`${tool.name}: ${tool.purpose}`}
                onPress={() => openTool(tool)}
                style={styles.toolRow}
              >
                <View style={[styles.toolIcon, { backgroundColor: `${tool.tint}1f` }]}>
                  <Ionicons name={tool.glyph} size={19} color={tool.tint} />
                </View>
                <View style={styles.toolCopy}>
                  <Text style={styles.toolName}>{tool.name}</Text>
                  <Text style={styles.toolPurpose}>{tool.purpose}</Text>
                </View>
                {ready
                  ? <Ionicons name="chevron-forward-outline" size={15} color="#4d6b57" />
                  : <Text style={styles.toolSoon}>Soon</Text>}
              </Pressable>
            );
          })}
        </View>
      )}

      {tab === 'insights' && (
        <>
          <Text style={styles.insightHint}>
            Pick a question — LIFEOS runs the right AI engines on your real data and answers here in app.
          </Text>
          <View style={styles.insightList}>
            {insights.map((e) => (
              <Pressable
                key={e.id}
                accessibilityRole="button"
                onPress={() => {
                  if (e.id === 'overview') { props.onOpen('Overview'); return; }
                  setOpenEngine(e.id); props.onClearEngineRun();
                }}
                style={styles.insightRow}
              >
                <View style={[styles.toolIcon, { backgroundColor: '#153b24' }]}>
                  <Ionicons name={e.glyph} size={19} color="#73f5a8" />
                </View>
                <View style={styles.toolCopy}>
                  <Text style={styles.insightQuestion}>{e.question}</Text>
                  <Text style={styles.insightName}>{e.name}{e.category === 'Experimental' ? '  ·  experimental' : ''}</Text>
                </View>
                <Ionicons name="chevron-forward-outline" size={15} color="#4d6b57" />
              </Pressable>
            ))}
          </View>
        </>
      )}
    </ScrollView>
  );
}

function Segment({ active, label, count, icon, onPress }: { active: boolean; label: string; count: number; icon: keyof typeof Ionicons.glyphMap; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="tab"
      accessibilityState={{ selected: active }}
      onPress={onPress}
      style={[styles.segmentButton, active && styles.segmentActive]}
    >
      <Ionicons name={icon} size={15} color={active ? '#07150b' : '#9cad9f'} />
      <Text style={[styles.segmentText, active && styles.segmentTextActive]}>{label} ({count})</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#06100b' },
  content: { paddingHorizontal: 18, paddingTop: 18, paddingBottom: 28, maxWidth: 720, width: '100%', alignSelf: 'center' },

  intro: { marginBottom: 16 },
  eyebrow: { color: '#78d99a', fontSize: 10, letterSpacing: 1.5, fontWeight: '700', marginBottom: 8 },
  title: { color: '#f0f8f2', fontSize: 28, lineHeight: 35, fontWeight: '700', letterSpacing: -0.5 },
  subtitle: { color: '#9cad9f', fontSize: 13, lineHeight: 20, marginTop: 7 },

  segmentContainer: { flexDirection: 'row', backgroundColor: '#0d1b12', borderRadius: 14, padding: 4, marginBottom: 18, borderWidth: 1, borderColor: '#1d3927' },
  segmentButton: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, borderRadius: 10 },
  segmentActive: { backgroundColor: '#61e894' },
  segmentText: { color: '#9cad9f', fontSize: 12, fontWeight: '600' },
  segmentTextActive: { color: '#07150b', fontWeight: '700' },

  // Last answer strip
  lastAnswerCard: { borderRadius: 16, borderWidth: 1, borderColor: '#244a32', backgroundColor: '#0d1f14', padding: 14, marginBottom: 16 },
  lastAnswerHeader: { flexDirection: 'row', alignItems: 'center', gap: 7, marginBottom: 8 },
  lastAnswerTitle: { flex: 1, color: '#eaf4ec', fontSize: 12, fontWeight: '700' },
  lastAnswerConf: { color: '#61e894', fontSize: 10, fontWeight: '700' },
  lastAnswerLine: { color: '#a9bcae', fontSize: 11, lineHeight: 16, marginTop: 3 },
  lastAnswerHint: { color: '#4a6354', fontSize: 9, marginTop: 8 },

  // Tools list
  toolList: { gap: 8 },
  toolRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 13, borderRadius: 16, borderWidth: 1, borderColor: '#1d3927', backgroundColor: '#0c1910' },
  toolIcon: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  toolCopy: { flex: 1, minWidth: 0 },
  toolName: { color: '#eaf4ec', fontSize: 13, lineHeight: 18, fontWeight: '600' },
  toolPurpose: { color: '#8fa594', fontSize: 11, lineHeight: 15, marginTop: 2 },
  toolSoon: { color: '#687b6d', fontSize: 10, fontWeight: '700', letterSpacing: 0.5 },

  // Insights list
  insightHint: { color: '#68cb89', fontSize: 11, lineHeight: 16, marginBottom: 12 },
  insightList: { gap: 8 },
  insightRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 13, borderRadius: 16, borderWidth: 1, borderColor: '#203d2b', backgroundColor: '#0d1b12' },
  insightQuestion: { color: '#eaf4ec', fontSize: 13, lineHeight: 18, fontWeight: '600' },
  insightName: { color: '#68cb89', fontSize: 10, lineHeight: 14, marginTop: 2 },

  // Engine detail
  back: { paddingVertical: 10, marginBottom: 10, alignSelf: 'flex-start' },
  backText: { color: '#71df98', fontSize: 13, fontWeight: '600' },
  hero: { alignItems: 'flex-start', padding: 18, borderRadius: 20, backgroundColor: '#0d1b12', borderWidth: 1, borderColor: '#244a32', marginBottom: 14 },
  heroIcon: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center', borderRadius: 16, marginBottom: 12 },
  heroQuestion: { color: '#f0f8f2', fontSize: 20, lineHeight: 27, fontWeight: '700', letterSpacing: -0.3 },
  heroDetail: { color: '#9cad9f', fontSize: 13, lineHeight: 19, marginTop: 8 },

  inputCard: { borderRadius: 16, borderWidth: 1, borderColor: '#1d3927', backgroundColor: '#09150d', padding: 14, marginBottom: 16 },
  inputHeader: { flexDirection: 'row', alignItems: 'center', gap: 7, marginBottom: 7 },
  inputTitle: { color: '#68cb89', fontSize: 11, fontWeight: '700', letterSpacing: 0.5 },
  inputBody: { color: '#8fa594', fontSize: 11, lineHeight: 17 },

  primaryButton: { minHeight: 48, borderRadius: 13, backgroundColor: '#61e894', alignItems: 'center', justifyContent: 'center', padding: 12 },
  primaryButtonText: { color: '#07150b', fontSize: 14, fontWeight: '700' },
  buttonDisabled: { opacity: 0.6 },
  errorText: { color: '#ff929d', fontSize: 11, marginTop: 10, lineHeight: 16 },
  offlineNote: { color: '#8fa594', fontSize: 11, lineHeight: 16, marginTop: 12, textAlign: 'center' },
});
