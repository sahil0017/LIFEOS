import { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { moduleDefinitions, relatedModules } from '../context';
import type { ModuleDefinition, ModuleId } from '../context';
import { runModuleRemote } from '../api';
import type { Screen } from '../useLifeOs';

const moduleGlyphs: Record<ModuleId, keyof typeof Ionicons.glyphMap> = {
  assistant: 'sparkles-outline',
  twin: 'git-network-outline',
  visual: 'scan-outline',
  voice: 'mic-outline',
  health: 'heart-outline',
  food: 'nutrition-outline',
  learning: 'school-outline',
  files: 'document-text-outline',
  environment: 'cloud-outline',
  accessibility: 'accessibility-outline'
};

/** The intelligence engines available on the Python backend (single source of truth, deduped). */
export type IntelligenceId =
  | 'generative' | 'predictive' | 'world_model' | 'causal'
  | 'multi_agent' | 'neuro_symbolic' | 'cognitive_memory'
  | 'multimodal' | 'quantum' | 'neuromorphic' | 'multiverse';

interface IntelligenceDefinition {
  id: IntelligenceId;
  name: string;
  glyph: keyof typeof Ionicons.glyphMap;
  description: string;
  category: 'Core' | 'Experimental';
}

const intelligenceDefinitions: IntelligenceDefinition[] = [
  { id: 'multiverse', name: 'Multiverse AI', glyph: 'git-network-outline', description: 'Evaluate future scenarios from your real decision points and goals.', category: 'Core' },
  { id: 'cognitive_memory', name: 'Self Intelligence', glyph: 'person-outline', description: 'Personal knowledge graph, memory, habits, goals, and preferences.', category: 'Core' },
  { id: 'multi_agent', name: 'Decision Intelligence', glyph: 'git-branch-outline', description: 'Compare choices, scenarios, opportunity costs, and uncertainty.', category: 'Core' },
  { id: 'world_model', name: 'Future Trajectory Intelligence', glyph: 'telescope-outline', description: 'Model career, financial, and learning trajectories from current progress.', category: 'Core' },
  { id: 'generative', name: 'Creative Intelligence', glyph: 'color-wand-outline', description: 'Generate unconventional ideas and challenge assumptions.', category: 'Core' },
  { id: 'multimodal', name: 'Bio Intelligence', glyph: 'heart-outline', description: 'Wellness, sleep, activity, and sensor pattern insights.', category: 'Core' },
  { id: 'predictive', name: 'Growth Intelligence', glyph: 'trending-up-outline', description: 'Learning paths, skill gaps, and adaptive recommendations.', category: 'Core' },
  { id: 'quantum', name: 'Quantum Possibility Engine', glyph: 'infinite-outline', description: 'Evaluate probabilistic outcome distributions across uncertain goals.', category: 'Experimental' },
  { id: 'neuromorphic', name: 'Event-Driven Intelligence', glyph: 'pulse-outline', description: 'Event-driven sensing and pattern detection from device signals.', category: 'Experimental' },
];

const lifeGroups: { title: string; description: string; ids: ModuleId[] }[] = [
  { title: 'Personal core', description: 'Your shared context and primary interaction modes.', ids: ['assistant', 'twin', 'visual', 'voice', 'files'] },
  { title: 'Life context', description: 'Signals that shape daily capacity and decisions.', ids: ['health', 'food', 'environment'] },
  { title: 'Growth and access', description: 'Connecting understanding to continuous learning.', ids: ['learning', 'accessibility'] },
];

/** Where each life module can be actually opened. Modules without a screen yet stay in-place. */
const moduleRoutes: Partial<Record<ModuleId, Screen>> = {
  assistant: 'Assistant',
  twin: 'PersonalTwin',
  visual: 'VisualIntelligence',
  voice: 'Voice',
  health: 'Health',
  food: 'Food',
  learning: 'Learning',
  environment: 'Environment',
  accessibility: 'Accessibility',
  files: 'Files',
};

export interface ModulesScreenProps {
  visionReady: boolean;
  /** Live counts from the user's workspace, shown on each module card. */
  stats: {
    goals: number;
    observations: number;
    scenarios: number;
    captures: number;
    activityDays: number;
  };
  healthAllowed: boolean;
  onOpen: (screen: Screen) => void;
  onOpenConnections: () => void;
  onOpenHelpSearch: () => void;
  /** Real data arrays for detailed UI display */
  realDataContext?: {
    goals: any[];
    observations: any[];
    scenarios: any[];
    activityDays: any[];
  };
}

export function ModulesScreen(props: ModulesScreenProps) {
  const [activeTab, setActiveTab] = useState<'life' | 'intelligence'>('life');
  const [selectedLifeId, setSelectedLifeId] = useState<ModuleId | null>(null);
  const [selectedIntelId, setSelectedIntelId] = useState<IntelligenceId | null>(null);

  const [running, setRunning] = useState(false);
  const [runResult, setRunResult] = useState<{ title: string; confidence: number; insights: string[]; recommendations: string[] } | null>(null);
  const [runError, setRunError] = useState<string | null>(null);

  const selectedLifeModule = moduleDefinitions.find((m) => m.id === selectedLifeId);
  const selectedIntelModule = intelligenceDefinitions.find((m) => m.id === selectedIntelId);

  /** Per-module live stat line, derived from the shared workspace snapshot. */
  const moduleStats = useMemo<Partial<Record<ModuleId, { value: string; sub: string }>>>(() => {
    const goalsCount = props.realDataContext?.goals?.length ?? props.stats.goals;
    const obsCount = props.realDataContext?.observations?.length ?? props.stats.observations;
    const scenCount = props.realDataContext?.scenarios?.length ?? props.stats.scenarios;
    const actDaysCount = props.realDataContext?.activityDays?.length ?? props.stats.activityDays;
    const latestGoal = props.realDataContext?.goals?.[0]?.title;
    const latestObs = props.realDataContext?.observations?.[props.realDataContext.observations.length - 1]?.text;

    return {
      twin: {
        value: `${obsCount} signal${obsCount === 1 ? '' : 's'}`,
        sub: scenCount > 0 ? `${scenCount} active scenario${scenCount === 1 ? '' : 's'}` : (latestObs ? `Latest: "${latestObs.slice(0, 26)}..."` : 'Capture daily signals')
      },
      health: {
        value: props.healthAllowed ? `${actDaysCount} day${actDaysCount === 1 ? '' : 's'}` : 'Paused',
        sub: props.healthAllowed ? (actDaysCount > 0 ? 'Live activity synced' : 'Sync device steps') : 'Enable access in Privacy'
      },
      visual: {
        value: `${props.stats.captures} capture${props.stats.captures === 1 ? '' : 's'}`,
        sub: 'Real scene & document scans'
      },
      assistant: {
        value: props.visionReady ? 'Live & Ready' : 'Not configured',
        sub: 'Contextual reasoning agent'
      },
      learning: {
        value: `${goalsCount} goal${goalsCount === 1 ? '' : 's'}`,
        sub: latestGoal ? `Focus: ${latestGoal.slice(0, 26)}...` : 'Skill paths & milestones'
      },
      food: {
        value: 'Nutrition Engine',
        sub: 'Macro & wellness tracking'
      },
      files: {
        value: 'Local Vault',
        sub: 'Documents & knowledge base'
      },
      environment: {
        value: 'Ambient Sensor',
        sub: 'Context & atmospheric telemetry'
      },
      accessibility: {
        value: 'Adaptive UI',
        sub: 'Haptic, contrast & screen reader'
      },
      voice: {
        value: 'Vocal Interface',
        sub: 'Conversational audio capture'
      }
    };
  }, [props.stats, props.healthAllowed, props.visionReady, props.realDataContext]);

  function resetWorkbench() {
    setRunResult(null);
    setRunError(null);
  }

  async function executeWorkbench(name: string, moduleId: string) {
    setRunning(true);
    resetWorkbench();
    try {
      const goals = props.realDataContext?.goals ?? [];
      const observations = props.realDataContext?.observations ?? [];
      const scenarios = props.realDataContext?.scenarios ?? [];
      const activityDays = props.realDataContext?.activityDays ?? [];

      const topGoal = goals[0]?.title ?? 'Continuous learning and daily wellness';
      const topScenario = scenarios[0]?.title ?? 'Career and personal trajectory planning';

      const payload = {
        trigger: 'mobile_workbench',
        timestamp: new Date().toISOString(),
        goals,
        observations,
        scenarios,
        time_series: activityDays.map((d: any) => ({ date: d.day, value: d.steps })),
        situation: topScenario || topGoal,
        decision: topScenario,
        options: scenarios.length > 0 ? scenarios.map((s: any) => s.title) : [topGoal, 'Optimize daily habit consistency'],
        action: topGoal,
        metric: 'steps',
        horizon_months: 6,
        simulations: 200,
      };

      const res = await runModuleRemote(moduleId, payload);
      const resultNote = typeof (res.result as { note?: unknown } | undefined)?.note === 'string'
        ? 'The intelligence backend did not return data for this module. Check that the Python backend is deployed and reachable.'
        : null;

      const dynamicInsights: string[] = [];
      const r = (res.result ?? {}) as Record<string, any>;
      if (typeof r.ai_analysis === 'string' && r.ai_analysis) dynamicInsights.push(r.ai_analysis);
      if (typeof r.world_model_analysis === 'string' && r.world_model_analysis) dynamicInsights.push(r.world_model_analysis);
      if (typeof r.ai_forecast_analysis === 'string' && r.ai_forecast_analysis) dynamicInsights.push(r.ai_forecast_analysis);
      if (typeof r.analysis === 'string' && r.analysis) dynamicInsights.push(r.analysis);
      if (r.best_future && typeof r.best_future.summary === 'string') {
        dynamicInsights.push(`Optimal trajectory: ${r.best_future.summary}`);
      }
      if (Array.isArray(r.patterns) && r.patterns.length > 0) {
        dynamicInsights.push(`Identified ${r.patterns.length} cognitive patterns from your observations.`);
      }
      if (res.execution_time_ms) {
        dynamicInsights.push(`Processed in ${res.execution_time_ms.toFixed(0)} ms on live context.`);
      }
      if (res.related_modules?.length) {
        dynamicInsights.push(`Connected signals: ${res.related_modules.join(', ')}.`);
      }

      setRunResult({
        title: `${name} result`,
        confidence: res.confidence || 0.85,
        insights: resultNote ? [resultNote] : (dynamicInsights.length > 0 ? dynamicInsights : [`Completed in ${res.execution_time_ms ?? 0} ms.`]),
        recommendations: res.recommendations?.length ? res.recommendations : [],
      });
    } catch {
      setRunError('Could not reach the intelligence backend. Run this again once the service is connected.');
    } finally {
      setRunning(false);
    }
  }

  function openLifeModule(module: ModuleDefinition) {
    const route = moduleRoutes[module.id];
    if (route) props.onOpen(route);
    else { setSelectedLifeId(module.id); resetWorkbench(); }
  }

  // ── Life module detail ──
  if (selectedLifeModule) {
    const links = relatedModules(selectedLifeModule);
    return (
      <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
        <BackLink label="All Life Modules" onPress={() => { setSelectedLifeId(null); resetWorkbench(); }} />

        <View style={styles.detailHero}>
          <View style={styles.detailIcon}>
            <Ionicons name={moduleGlyphs[selectedLifeModule.id]} size={26} color="#73f5a8" />
          </View>
          <Text style={styles.detailStatus}>{selectedLifeModule.status}</Text>
          <Text style={styles.title}>{selectedLifeModule.name}</Text>
          <Text style={styles.subtitle}>{selectedLifeModule.description}</Text>
        </View>

        <View style={styles.contextSnapshotCard}>
          <View style={styles.contextHeaderRow}>
            <Ionicons name="server-outline" size={15} color="#73f5a8" />
            <Text style={styles.contextSnapshotTitle}>LIVE CONTEXT SIGNALS</Text>
            <View style={styles.liveIndicator}>
              <View style={styles.liveDot} />
              <Text style={styles.liveText}>REAL DATA</Text>
            </View>
          </View>
          <View style={styles.contextSignalsRow}>
            <View style={styles.contextSignalPill}>
              <Text style={styles.contextSignalVal}>{props.realDataContext?.observations?.length ?? props.stats.observations}</Text>
              <Text style={styles.contextSignalKey}>Signals</Text>
            </View>
            <View style={styles.contextSignalPill}>
              <Text style={styles.contextSignalVal}>{props.realDataContext?.goals?.length ?? props.stats.goals}</Text>
              <Text style={styles.contextSignalKey}>Goals</Text>
            </View>
            <View style={styles.contextSignalPill}>
              <Text style={styles.contextSignalVal}>{props.realDataContext?.scenarios?.length ?? props.stats.scenarios}</Text>
              <Text style={styles.contextSignalKey}>Scenarios</Text>
            </View>
            <View style={styles.contextSignalPill}>
              <Text style={styles.contextSignalVal}>{props.realDataContext?.activityDays?.length ?? props.stats.activityDays}</Text>
              <Text style={styles.contextSignalKey}>Days Synced</Text>
            </View>
          </View>
        </View>

        <View style={styles.workbenchCard}>
          <Text style={styles.workbenchEyebrow}>INTELLIGENCE WORKBENCH</Text>
          <Text style={styles.workbenchTitle}>Run against your saved context</Text>
          <Text style={styles.workbenchBody}>
            Executes this module on the intelligence backend using the signals already in your LIFEOS workspace.
          </Text>

          <Pressable
            accessibilityRole="button"
            disabled={running}
            onPress={() => void executeWorkbench(selectedLifeModule.name, selectedLifeModule.id)}
            style={[styles.primaryButton, running && styles.buttonDisabled]}
          >
            {running
              ? <ActivityIndicator color="#07150b" size="small" />
              : <Text style={styles.primaryButtonText}>Run {selectedLifeModule.name}  ⚡</Text>}
          </Pressable>

          {runError && <Text style={styles.errorText}>{runError}</Text>}
          {runResult && <RunResult result={runResult} recLabel="RECOMMENDED ACTIONS" />}
        </View>

        <View style={styles.signalMap}>
          <Text style={styles.signalMapLabel}>CONTEXT THIS MODULE READS</Text>
          <View style={styles.signalCloud}>
            {selectedLifeModule.reads.map((signal) => (
              <Text key={`read-${signal}`} style={styles.signalChip}>{signal.replaceAll('_', ' ')}</Text>
            ))}
          </View>
          <Text style={[styles.signalMapLabel, styles.producesLabel]}>CONTEXT IT CREATES</Text>
          <View style={styles.signalCloud}>
            {selectedLifeModule.creates.map((signal) => (
              <Text key={`create-${signal}`} style={[styles.signalChip, styles.signalOutput]}>{signal.replaceAll('_', ' ')}</Text>
            ))}
          </View>
        </View>

        <Text style={styles.sectionTitle}>Connected modules</Text>
        <View style={styles.connectionList}>
          {links.map((item) => (
            <Pressable key={item.id} accessibilityRole="button" onPress={() => openLifeModule(item)} style={styles.connectionCard}>
              <View style={styles.connectionIcon}>
                <Ionicons name={moduleGlyphs[item.id]} size={17} color="#65e99a" />
              </View>
              <View style={styles.connectionCopy}>
                <Text style={styles.connectionName}>{item.name}</Text>
                <Text style={styles.connectionStatus}>{item.status === 'READY' ? 'ready · shares signals' : 'planned · shares signals'}</Text>
              </View>
              <Ionicons name="chevron-forward-outline" size={14} color="#61e894" />
            </Pressable>
          ))}
        </View>

        <Pressable accessibilityRole="button" onPress={props.onOpenConnections} style={styles.secondaryButton}>
          <Text style={styles.secondaryButtonText}>Explore Signal Graph  ↗</Text>
        </Pressable>
      </ScrollView>
    );
  }

  // ── Intelligence engine detail ──
  if (selectedIntelModule) {
    return (
      <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
        <BackLink label="All Intelligence Engines" onPress={() => { setSelectedIntelId(null); resetWorkbench(); }} />

        <View style={styles.detailHero}>
          <View style={styles.detailIcon}>
            <Ionicons name={selectedIntelModule.glyph} size={26} color="#73f5a8" />
          </View>
          <Text style={[styles.detailStatus, selectedIntelModule.category === 'Experimental' && styles.detailStatusExperimental]}>
            {selectedIntelModule.category.toUpperCase()} ENGINE
          </Text>
          <Text style={styles.title}>{selectedIntelModule.name}</Text>
          <Text style={styles.subtitle}>{selectedIntelModule.description}</Text>
        </View>

        <View style={styles.contextSnapshotCard}>
          <View style={styles.contextHeaderRow}>
            <Ionicons name="server-outline" size={15} color="#73f5a8" />
            <Text style={styles.contextSnapshotTitle}>LIVE WORKSPACE INPUTS</Text>
            <View style={styles.liveIndicator}>
              <View style={styles.liveDot} />
              <Text style={styles.liveText}>REAL DATA</Text>
            </View>
          </View>
          <Text style={styles.contextSnapshotSubtitle}>
            This intelligence engine executes against your actual workspace state:
          </Text>
          <View style={styles.contextSignalsRow}>
            <View style={styles.contextSignalPill}>
              <Text style={styles.contextSignalVal}>{props.realDataContext?.observations?.length ?? props.stats.observations}</Text>
              <Text style={styles.contextSignalKey}>Signals</Text>
            </View>
            <View style={styles.contextSignalPill}>
              <Text style={styles.contextSignalVal}>{props.realDataContext?.goals?.length ?? props.stats.goals}</Text>
              <Text style={styles.contextSignalKey}>Goals</Text>
            </View>
            <View style={styles.contextSignalPill}>
              <Text style={styles.contextSignalVal}>{props.realDataContext?.scenarios?.length ?? props.stats.scenarios}</Text>
              <Text style={styles.contextSignalKey}>Scenarios</Text>
            </View>
            <View style={styles.contextSignalPill}>
              <Text style={styles.contextSignalVal}>{props.realDataContext?.activityDays?.length ?? props.stats.activityDays}</Text>
              <Text style={styles.contextSignalKey}>Days Synced</Text>
            </View>
          </View>
          {props.realDataContext?.goals?.[0]?.title && (
            <View style={styles.contextDetailSnippet}>
              <Text style={styles.contextDetailLabel}>Primary Objective:</Text>
              <Text style={styles.contextDetailValue} numberOfLines={1}>
                {props.realDataContext.goals[0].title}
              </Text>
            </View>
          )}
          {props.realDataContext?.scenarios?.[0]?.title && (
            <View style={styles.contextDetailSnippet}>
              <Text style={styles.contextDetailLabel}>Active Scenario:</Text>
              <Text style={styles.contextDetailValue} numberOfLines={1}>
                {props.realDataContext.scenarios[0].title}
              </Text>
            </View>
          )}
        </View>

        <View style={styles.workbenchCard}>
          <Text style={styles.workbenchEyebrow}>INTELLIGENCE WORKBENCH</Text>
          <Text style={styles.workbenchBody}>
            Dispatches to the LIFEOS intelligence backend and returns the analysis of your live workspace context.
          </Text>

          <Pressable
            accessibilityRole="button"
            disabled={running}
            onPress={() => void executeWorkbench(selectedIntelModule.name, selectedIntelModule.id)}
            style={[styles.primaryButton, running && styles.buttonDisabled]}
          >
            {running
              ? <ActivityIndicator color="#07150b" size="small" />
              : <Text style={styles.primaryButtonText}>Run {selectedIntelModule.name}  ⚡</Text>}
          </Pressable>

          {runError && <Text style={styles.errorText}>{runError}</Text>}
          {runResult && <RunResult result={runResult} recLabel="SYNTHESIZED RECOMMENDATIONS" />}
        </View>
      </ScrollView>
    );
  }

  // ── Main list ──
  const readyCount = moduleDefinitions.filter((m) => m.status === 'READY').length;
  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <View style={styles.intro}>
        <Text style={styles.eyebrow}>LIFEOS ECOSYSTEM</Text>
        <Text style={styles.title}>All Modules & Engines</Text>
        <Text style={styles.subtitle}>
          {readyCount} ready life modules connected to {intelligenceDefinitions.length} intelligence engines. Tap any card to open it.
        </Text>
        <View style={styles.statsRow}>
          <View style={styles.statChip}><Text style={styles.statValue}>{moduleDefinitions.length}</Text><Text style={styles.statLabel}>Modules</Text></View>
          <View style={styles.statChip}><Text style={styles.statValue}>{intelligenceDefinitions.length}</Text><Text style={styles.statLabel}>Engines</Text></View>
        </View>
      </View>

      <View style={styles.segmentContainer}>
        <Segment active={activeTab === 'life'} label="Life Modules" count={moduleDefinitions.length} icon="apps-outline" onPress={() => setActiveTab('life')} />
        <Segment active={activeTab === 'intelligence'} label="AI Engines" count={intelligenceDefinitions.length} icon="hardware-chip-outline" onPress={() => setActiveTab('intelligence')} />
      </View>

      <Pressable accessibilityRole="button" onPress={props.onOpenConnections} style={styles.connectionsBanner}>
        <Ionicons name="git-branch-outline" size={21} color="#72df98" />
        <View style={styles.connectionsCopy}>
          <Text style={styles.connectionsTitle}>Signal Connections Map</Text>
          <Text style={styles.connectionsBody}>Inspect how observations, goals, and sensors flow between modules.</Text>
        </View>
        <Text style={styles.flowArrow}>›</Text>
      </Pressable>

      {activeTab === 'life' && lifeGroups.map((group) => (
        <View key={group.title} style={styles.group}>
          <View style={styles.groupHeading}>
            <Text style={styles.sectionTitle}>{group.title}</Text>
            <Text style={styles.groupDescription}>{group.description}</Text>
          </View>
          <View style={styles.moduleGrid}>
            {group.ids.map((id) => {
              const item = moduleDefinitions.find((candidate) => candidate.id === id);
              if (!item) return null;
              const live = moduleStats[item.id];
              const ready = item.status === 'READY';
              return (
                <Pressable
                  key={id}
                  accessibilityRole="button"
                  accessibilityLabel={`${item.name}, ${ready ? 'ready' : 'planned'}`}
                  onPress={() => openLifeModule(item)}
                  style={styles.moduleCard}
                >
                  <View style={styles.moduleTopline}>
                    <View style={styles.moduleIcon}>
                      <Ionicons name={moduleGlyphs[item.id]} size={18} color={ready ? '#65e99a' : '#7c9683'} />
                    </View>
                    <Text style={[styles.moduleStatus, ready ? styles.statusReady : styles.statusPlanned]}>
                      {ready ? 'READY' : 'PLANNED'}
                    </Text>
                  </View>
                  <Text style={styles.moduleName}>{item.name}</Text>
                  <Text style={[styles.moduleDescription, !ready && styles.moduleDescriptionPlanned]}>{live?.sub ?? item.description}</Text>
                  {live && <Text style={styles.moduleLiveValue}>{live.value}</Text>}
                  <Text style={styles.moduleConnections}>
                    {ready ? (moduleRoutes[item.id] ? 'Open  ›' : `↔ ${relatedModules(item).length} linked`) : 'Coming soon'}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      ))}

      {activeTab === 'intelligence' && (
        <View style={styles.intelGrid}>
          {intelligenceDefinitions.map((engine) => (
            <Pressable
              key={engine.id}
              accessibilityRole="button"
              onPress={() => { setSelectedIntelId(engine.id); resetWorkbench(); }}
              style={styles.intelCard}
            >
              <View style={styles.moduleTopline}>
                <View style={styles.intelIcon}>
                  <Ionicons name={engine.glyph} size={19} color="#73f5a8" />
                </View>
                <Text style={[styles.moduleStatus, engine.category === 'Core' ? styles.statusReady : styles.statusExperimental]}>
                  {engine.category.toUpperCase()}
                </Text>
              </View>
              <Text style={styles.moduleName}>{engine.name}</Text>
              <Text style={styles.moduleDescription}>{engine.description}</Text>
              <View style={styles.intelSignalBadgeRow}>
                <Text style={styles.intelSignalBadge}>
                  {engineSignalSummary(engine.id, props.stats)}
                </Text>
              </View>
              <View style={styles.intelCardFooter}>
                <Text style={styles.intelActionText}>Open Live Workbench  ›</Text>
              </View>
            </Pressable>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

function engineSignalSummary(id: IntelligenceId, stats: ModulesScreenProps['stats']): string {
  switch (id) {
    case 'cognitive_memory':
      return `● Synthesizes ${stats.observations} signals & ${stats.goals} goals`;
    case 'multiverse':
      return `● Evaluates ${stats.scenarios} scenarios against reality`;
    case 'multi_agent':
      return `● 5-agent debate across ${stats.scenarios} scenarios`;
    case 'world_model':
      return `● Projects trajectory from ${stats.goals} active goals`;
    case 'predictive':
      return `● Forecasts trends from ${stats.activityDays} synced days`;
    case 'multimodal':
      return `● Bio-patterns from activity & sensory telemetry`;
    case 'generative':
      return `● Creative counterfactuals from your context`;
    case 'quantum':
      return `● Probabilistic branches on uncertain goals`;
    case 'neuromorphic':
      return `● Event-driven spikes from daily actions`;
    default:
      return `● Live workspace integration ready`;
  }
}

function BackLink({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={styles.back}>
      <Text style={styles.backText}>‹  {label}</Text>
    </Pressable>
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

function RunResult({ result, recLabel }: { result: { title: string; confidence: number; insights: string[]; recommendations: string[] }; recLabel: string }) {
  return (
    <View style={styles.resultBox}>
      <View style={styles.resultHeader}>
        <Text style={styles.resultTitle}>{result.title}</Text>
        <Text style={styles.confidenceBadge}>{Math.round(result.confidence * 100)}% Confidence</Text>
      </View>
      {result.insights.map((insight, index) => <Text key={index} style={styles.insightItem}>• {insight}</Text>)}
      {result.recommendations.length > 0 && <>
        <Text style={styles.recHeader}>{recLabel}</Text>
        {result.recommendations.map((rec, index) => (
          <View key={index} style={styles.recItem}>
            <Text style={styles.recArrow}>→</Text>
            <Text style={styles.recText}>{rec}</Text>
          </View>
        ))}
      </>}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#06100b' },
  content: { paddingHorizontal: 18, paddingTop: 18, paddingBottom: 28, maxWidth: 720, width: '100%', alignSelf: 'center' },
  intro: { marginBottom: 16 },
  statsRow: { flexDirection: 'row', gap: 8, marginTop: 12 },
  statChip: { flex: 1, paddingVertical: 10, paddingHorizontal: 8, borderRadius: 12, backgroundColor: '#0d1b12', borderWidth: 1, borderColor: '#1d3927', alignItems: 'center' },
  statValue: { color: '#61e894', fontSize: 16, fontWeight: '700' },
  statLabel: { color: '#829687', fontSize: 9, marginTop: 2, letterSpacing: 0.6 },
  eyebrow: { color: '#78d99a', fontSize: 10, letterSpacing: 1.5, fontWeight: '700', marginBottom: 8 },
  title: { color: '#f0f8f2', fontSize: 28, lineHeight: 35, fontWeight: '700', letterSpacing: -0.5 },
  subtitle: { color: '#9cad9f', fontSize: 13, lineHeight: 20, marginTop: 7 },

  segmentContainer: { flexDirection: 'row', backgroundColor: '#0d1b12', borderRadius: 14, padding: 4, marginBottom: 18, borderWidth: 1, borderColor: '#1d3927' },
  segmentButton: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, borderRadius: 10 },
  segmentActive: { backgroundColor: '#61e894' },
  segmentText: { color: '#9cad9f', fontSize: 12, fontWeight: '600' },
  segmentTextActive: { color: '#07150b', fontWeight: '700' },

  connectionsBanner: { flexDirection: 'row', alignItems: 'center', gap: 11, borderRadius: 15, backgroundColor: '#102619', borderColor: '#2b6540', borderWidth: 1, padding: 14, marginBottom: 20 },
  connectionsCopy: { flex: 1, minWidth: 0 },
  connectionsTitle: { color: '#eaf4ec', fontSize: 13, lineHeight: 19, fontWeight: '600' },
  connectionsBody: { color: '#8fa594', fontSize: 10, lineHeight: 15, marginTop: 2 },
  flowArrow: { color: '#61e894', fontSize: 18 },

  group: { marginBottom: 21 },
  groupHeading: { marginBottom: 10 },
  sectionTitle: { color: '#eaf4ec', fontSize: 18, lineHeight: 24, fontWeight: '600' },
  groupDescription: { color: '#829687', fontSize: 11, lineHeight: 16, marginTop: 3 },
  moduleGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  moduleCard: { width: '48%', minWidth: 145, flexGrow: 1, minHeight: 160, padding: 13, borderRadius: 16, borderWidth: 1, borderColor: '#1d3927', backgroundColor: '#0c1910' },
  moduleTopline: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 6, marginBottom: 11 },
  moduleIcon: { width: 32, height: 32, borderRadius: 10, backgroundColor: '#153b24', alignItems: 'center', justifyContent: 'center' },
  moduleStatus: { fontSize: 8, fontWeight: '700', letterSpacing: 0.6, borderRadius: 8, paddingHorizontal: 6, paddingVertical: 4, overflow: 'hidden' },
  statusReady: { color: '#8ee9aa', backgroundColor: '#153b26' },
  statusPlanned: { color: '#9cad9f', backgroundColor: '#17231b' },
  statusExperimental: { color: '#e6c979', backgroundColor: '#302817' },
  moduleName: { color: '#eaf4ec', fontSize: 13, lineHeight: 18, fontWeight: '600', marginBottom: 4 },
  moduleDescription: { flex: 1, color: '#8fa594', fontSize: 10, lineHeight: 15 },
  moduleDescriptionPlanned: { color: '#687b6d' },
  moduleLiveValue: { color: '#73f5a8', fontSize: 12, lineHeight: 17, fontWeight: '700', marginTop: 8 },
  moduleConnections: { color: '#68cb89', fontSize: 9, lineHeight: 14, fontWeight: '600', marginTop: 10 },

  intelGrid: { gap: 12 },
  intelCard: { padding: 14, borderRadius: 16, borderWidth: 1, borderColor: '#203d2b', backgroundColor: '#0d1b12' },
  intelIcon: { width: 34, height: 34, borderRadius: 10, backgroundColor: '#153b24', alignItems: 'center', justifyContent: 'center' },
  intelCardFooter: { marginTop: 12, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#172e20', alignItems: 'flex-end' },
  intelActionText: { color: '#73f5a8', fontSize: 11, fontWeight: '700' },

  back: { paddingVertical: 10, marginBottom: 10, alignSelf: 'flex-start' },
  backText: { color: '#71df98', fontSize: 13, fontWeight: '600' },
  detailHero: { alignItems: 'flex-start', padding: 17, borderRadius: 20, backgroundColor: '#0d1b12', borderWidth: 1, borderColor: '#244a32', marginBottom: 18 },
  detailIcon: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center', borderRadius: 16, backgroundColor: '#153b24', marginBottom: 12 },
  detailStatus: { color: '#8ee9aa', fontSize: 9, fontWeight: '700', letterSpacing: 1, marginBottom: 6 },
  detailStatusExperimental: { color: '#e6c979' },

  workbenchCard: { padding: 16, borderRadius: 18, backgroundColor: '#102418', borderWidth: 1, borderColor: '#2c6742', marginBottom: 14 },
  workbenchEyebrow: { color: '#73f5a8', fontSize: 9, fontWeight: '700', letterSpacing: 1.1, marginBottom: 4 },
  workbenchTitle: { color: '#f0f8f2', fontSize: 17, fontWeight: '700', marginBottom: 6 },
  workbenchBody: { color: '#9cad9f', fontSize: 11, lineHeight: 17, marginBottom: 14 },
  primaryButton: { minHeight: 46, borderRadius: 12, backgroundColor: '#61e894', alignItems: 'center', justifyContent: 'center', padding: 12 },
  primaryButtonText: { color: '#07150b', fontSize: 13, fontWeight: '700' },
  buttonDisabled: { opacity: 0.7 },
  errorText: { color: '#ff929d', fontSize: 11, marginTop: 8 },

  resultBox: { marginTop: 14, paddingTop: 14, borderTopWidth: 1, borderTopColor: '#1d482c' },
  resultHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  resultTitle: { color: '#eaf4ec', fontSize: 13, fontWeight: '700' },
  confidenceBadge: { color: '#61e894', fontSize: 10, fontWeight: '700', backgroundColor: '#153b26', paddingHorizontal: 7, paddingVertical: 3, borderRadius: 8 },
  insightItem: { color: '#b9cbbd', fontSize: 11, lineHeight: 17, marginBottom: 4 },
  recHeader: { color: '#73f5a8', fontSize: 9, fontWeight: '700', letterSpacing: 1, marginTop: 10, marginBottom: 6 },
  recItem: { flexDirection: 'row', gap: 6, marginBottom: 4 },
  recArrow: { color: '#61e894', fontSize: 12 },
  recText: { color: '#dcebe0', fontSize: 11, flex: 1, lineHeight: 16 },

  signalMap: { borderRadius: 15, backgroundColor: '#09150d', borderColor: '#1d3927', borderWidth: 1, padding: 12, marginTop: 10, marginBottom: 14 },
  signalMapLabel: { color: '#68cb89', fontSize: 8, lineHeight: 12, letterSpacing: 0.9, fontWeight: '700', marginBottom: 8 },
  producesLabel: { marginTop: 12 },
  signalCloud: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  signalChip: { color: '#b8cbbd', fontSize: 9, lineHeight: 13, backgroundColor: '#17251a', borderRadius: 10, overflow: 'hidden', paddingHorizontal: 8, paddingVertical: 5 },
  signalOutput: { color: '#a3efb8', backgroundColor: '#153b26' },

  connectionList: { gap: 8, marginTop: 4, marginBottom: 14 },
  connectionCard: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 11, backgroundColor: '#0c1910', borderRadius: 13, borderWidth: 1, borderColor: '#1d3927' },
  connectionIcon: { width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: '#153b24' },
  connectionCopy: { flex: 1 },
  connectionName: { color: '#dcebe0', fontSize: 12, lineHeight: 17, fontWeight: '600' },
  connectionStatus: { color: '#829687', fontSize: 8, lineHeight: 12, marginTop: 2 },
  secondaryButton: { minHeight: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 12, borderColor: '#294333', borderWidth: 1, marginBottom: 12 },
  secondaryButtonText: { color: '#71df98', fontSize: 11, fontWeight: '600' },

  contextSnapshotCard: { backgroundColor: '#09150d', borderColor: '#1d3927', borderWidth: 1, borderRadius: 14, padding: 14, marginBottom: 14 },
  contextHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 },
  contextSnapshotTitle: { color: '#68cb89', fontSize: 10, fontWeight: '700', letterSpacing: 0.8, flex: 1, marginLeft: 6 },
  liveIndicator: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#13351f', paddingHorizontal: 7, paddingVertical: 2, borderRadius: 8 },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#61e894' },
  liveText: { color: '#61e894', fontSize: 8, fontWeight: '700', letterSpacing: 0.5 },
  contextSnapshotSubtitle: { color: '#8fa594', fontSize: 11, lineHeight: 16, marginBottom: 10 },
  contextSignalsRow: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  contextSignalPill: { flex: 1, backgroundColor: '#102418', borderRadius: 10, paddingVertical: 8, paddingHorizontal: 6, alignItems: 'center', borderWidth: 1, borderColor: '#1c4228' },
  contextSignalVal: { color: '#73f5a8', fontSize: 15, fontWeight: '700' },
  contextSignalKey: { color: '#829687', fontSize: 8, marginTop: 2, fontWeight: '600' },
  contextDetailSnippet: { flexDirection: 'row', alignItems: 'center', marginTop: 4, gap: 6 },
  contextDetailLabel: { color: '#829687', fontSize: 10, fontWeight: '600' },
  contextDetailValue: { color: '#dcebe0', fontSize: 10, flex: 1, fontWeight: '500' },
  intelSignalBadgeRow: { marginTop: 8 },
  intelSignalBadge: { color: '#68cb89', fontSize: 10, fontWeight: '600' },
});
