import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, Pressable, SafeAreaView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { PersonalTwinScreen } from './src/screens/PersonalTwinScreen';
import { HomeScreen } from './src/screens/HomeScreen';
import { AssistantScreen } from './src/screens/AssistantScreen';
import { ModulesScreen } from './src/screens/ModulesScreen';
import { VisualIntelligenceScreen } from './src/screens/VisualIntelligenceScreen';
import { HelpSearchScreen } from './src/screens/HelpSearchScreen';
import { PrivacyScreen } from './src/screens/PrivacyScreen';
import { HealthScreen } from './src/screens/HealthScreen';
import { PedometerScreen } from './src/screens/PedometerScreen';
import { VoiceScreen } from './src/screens/VoiceScreen';
import { LearningScreen } from './src/screens/LearningScreen';
import { AccessibilityScreen } from './src/screens/AccessibilityScreen';
import { EnvironmentScreen } from './src/screens/EnvironmentScreen';
import { FoodScreen } from './src/screens/FoodScreen';
import { FilesScreen } from './src/screens/FilesScreen';
import { OverviewScreen } from './src/screens/OverviewScreen';
import { useLifeOs } from './src/useLifeOs';
import { isApiConfigured } from './src/api';

const nav: { id: 'Home' | 'Assistant' | 'Modules' | 'Privacy'; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { id: 'Home', label: 'Home', icon: 'home-outline' },
  { id: 'Assistant', label: 'Assistant', icon: 'sparkles-outline' },
  { id: 'Modules', label: 'Tools', icon: 'apps-outline' }, { id: 'Privacy', label: 'Privacy', icon: 'shield-checkmark-outline' },
];

export default function App() {
  const app = useLifeOs();

  return <SafeAreaView style={styles.safe}>
    {app.error && <Text accessibilityRole="alert" style={styles.globalError}>{app.error}</Text>}
    {app.busy && <ActivityIndicator color="#61e894" style={styles.loading} />}
    {!app.busy && app.screen === 'Home' && <HomeScreen
        goals={app.goals}
        observations={app.observations}
        patterns={app.patterns}
        scenarios={app.scenarios}
        captures={app.visionCaptures}
        activityDays={app.activityDays}
        deviceStepsToday={app.deviceStepsToday}
        healthAllowed={app.privacy.healthActivity}
        aiConfigured={isApiConfigured}
        onOpenAssistant={() => app.setScreen('Assistant')}
        onOpenTwin={() => app.setScreen('PersonalTwin')}
        onOpenVisual={app.openVisual}
        onOpenHealth={() => app.setScreen('Health')}
        onOpenFood={() => app.setScreen('Food')}
        onOpenLearning={() => app.setScreen('Learning')}
        onOpenVoice={() => app.setScreen('Voice')}
        onOpenEnvironment={() => app.setScreen('Environment')}
        onOpenPrivacy={() => app.setScreen('Privacy')}
        onOpenModules={() => app.setScreen('Modules')}
        autoUpdate={app.autoUpdate}
        autoSyncing={app.autoSyncing}
        onDismissAutoUpdate={app.dismissAutoUpdate}
      />}
    {!app.busy && app.screen === 'Assistant' && <AssistantScreen messages={app.chatMessages} input={app.chatInput} busy={app.chatBusy} error={app.chatError} aiAllowed={app.privacy.assistantAi} contextEnabled={app.privacy.assistantContext} configured={isApiConfigured} aiConnected={app.aiHealth ? app.aiHealth.connected : null} onInput={app.setChatInput} onSend={() => void app.sendMessage()} onOpenPrivacy={() => app.setScreen('Privacy')} onOpenModules={() => app.setScreen('Modules')} />}
    {!app.busy && app.screen === 'Modules' && <ModulesScreen
      aiConnected={app.aiHealth?.connected ?? false}
      engineRun={app.engineRun}
      onRunEngine={(moduleId) => void app.runIntelligence(moduleId)}
      onClearEngineRun={app.clearEngineRun}
      onOpen={(screen) => app.setScreen(screen)}
      onOpenHelpSearch={() => app.setScreen('HelpSearch')}
    />}
    {!app.busy && app.screen === 'Health' && <HealthScreen allowed={app.privacy.healthActivity} days={app.activityDays} busy={app.activityBusy} error={app.activityError} onOpenPrivacy={() => app.setScreen('Privacy')} onReadDevice={() => void app.readDeviceSteps()} onDelete={() => void app.removeDeviceActivity()} />}
    {!app.busy && app.screen === 'Environment' && <EnvironmentScreen />}
    {!app.busy && app.screen === 'Accessibility' && <AccessibilityScreen />}
    {!app.busy && app.screen === 'Learning' && <LearningScreen />}
    {!app.busy && app.screen === 'Voice' && <VoiceScreen />}
    {!app.busy && app.screen === 'Pedometer' && <PedometerScreen />}
    {!app.busy && app.screen === 'Food' && <FoodScreen />}
    {!app.busy && app.screen === 'Files' && <FilesScreen />}
    {!app.busy && app.screen === 'Overview' && <OverviewScreen onBack={() => app.setScreen('Modules')} />}
    {!app.busy && app.screen === 'HelpSearch' && <HelpSearchScreen query={app.helpQuery} results={app.helpResults} busy={app.helpBusy} error={app.helpError} onQuery={app.setHelpQuery} onSearch={() => void app.searchHelp()} onBack={() => app.setScreen('Modules')} />}
    {!app.busy && app.screen === 'PersonalTwin' && <PersonalTwinScreen goals={app.goals} observations={app.observations} patterns={app.patterns} scenarios={app.scenarios} embeddings={app.embeddings} insight={app.twinInsight} busy={app.twinBusy} error={app.twinError} aiAllowed={app.privacy.twinAi} configured={isApiConfigured} onOpenPrivacy={() => app.setScreen('Privacy')} onRecordObservation={app.addTwinObservation} onCreateScenario={app.addTwinScenario} onDeleteObservation={app.removeTwinObservation} onDeleteScenario={app.removeTwinScenario} onAnalyze={app.analyzeTwin} />}
    {!app.busy && app.screen === 'VisualIntelligence' && <VisualIntelligenceScreen visionReady={isApiConfigured} aiAllowed={app.privacy.visualAi} cameraGranted={Boolean(app.cameraPermission?.granted)} onOpenPrivacy={() => app.setScreen('Privacy')} busy={app.visualBusy} answer={app.visualAnswer} error={app.visualError} captures={app.visionCaptures} onSaveCapture={app.saveRemoteVisionCapture} onAnalyze={(id, image, question) => void app.analyzeVisual(id, image, question)} onDeleteCapture={app.removeVisualCapture} onClearAnswer={app.clearVisualAnswer} onBack={() => app.setScreen('Home')} />}
    {!app.busy && app.screen === 'Privacy' && <PrivacyScreen preferences={app.privacy} cameraGranted={Boolean(app.cameraPermission?.granted)} cameraCanAskAgain={app.cameraPermission?.canAskAgain !== false} onToggle={(key, value) => void app.togglePrivacy(key, value)} onRequestCamera={() => void app.requestCameraPermission()} />}
    <View style={styles.nav}>{nav.map((item) => <Pressable key={item.id} accessibilityRole="button" accessibilityState={{ selected: app.screen === item.id }} onPress={() => app.setScreen(item.id)} style={styles.navItem}><View style={styles.navIcon}><Ionicons name={item.icon} size={19} color={app.screen === item.id ? '#70e79a' : '#7c8d80'} /></View><Text style={[styles.navLabel, app.screen === item.id && styles.navActive]}>{item.label}</Text></Pressable>)}</View>
    <StatusBar style="light" />
  </SafeAreaView>;
}

const styles = StyleSheet.create({ safe: { flex: 1, backgroundColor: '#06100b' }, screen: { flex: 1, backgroundColor: '#06100b' }, secondaryContent: { padding: 18, paddingBottom: 36, maxWidth: 720, width: '100%', alignSelf: 'center' }, loading: { marginVertical: 10 }, globalError: { color: '#ffacb5', paddingHorizontal: 18, paddingTop: 8, lineHeight: 19 }, nav: { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center', minHeight: 61, paddingHorizontal: 5, paddingBottom: 3, backgroundColor: '#0b1710', borderTopWidth: 1, borderTopColor: '#1d3624' }, navItem: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 3, minHeight: 52 }, navIcon: { height: 22, alignItems: 'center', justifyContent: 'center' }, navLabel: { color: '#7c8d80', fontSize: 8, lineHeight: 12, fontWeight: '600' }, navActive: { color: '#70e79a' } });
