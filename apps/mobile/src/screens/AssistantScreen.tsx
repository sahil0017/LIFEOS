import * as Speech from 'expo-speech';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import type { ChatMessage } from './types';

interface Props {
  messages: readonly ChatMessage[];
  input: string;
  busy: boolean;
  error: string | null;
  aiAllowed: boolean;
  contextEnabled: boolean;
  configured: boolean;
  onInput: (value: string) => void;
  onSend: () => void;
  onOpenPrivacy: () => void;
  onOpenModules: () => void;
}

const prompts = [
  { title: 'Plan my week', text: 'Help me plan a realistic week around what matters most.' },
  { title: 'Understand a pattern', text: 'What small change could help me follow through more consistently?' },
  { title: 'Compare a decision', text: 'Help me compare two choices, the trade-offs, and what I should learn before deciding.' },
];

export function AssistantScreen(props: Props) {
  return <ScrollView style={styles.screen} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
    <View style={styles.intro}>
      <Text style={styles.eyebrow}>PERSONAL ASSISTANT</Text>
      <Text style={styles.title}>Think it through.</Text>
      <Text style={styles.subtitle}>Turn a goal or decision into a practical plan using only the context you choose to share.</Text>
    </View>

    {!props.aiAllowed ? <Pressable accessibilityRole="button" onPress={props.onOpenPrivacy} style={styles.permissionCard}>
      <View style={styles.permissionIcon}><Text style={styles.permissionIconText}>⌑</Text></View>
      <View style={styles.permissionCopy}>
        <Text style={styles.permissionTitle}>Choose your privacy settings</Text>
        <Text style={styles.permissionText}>Assistant analysis is off. Turn it on in Privacy to start a conversation.</Text>
      </View>
      <Text style={styles.arrow}>↗</Text>
    </Pressable> : !props.configured ? <View style={styles.permissionCard}>
      <View style={styles.permissionCopy}><Text style={styles.permissionTitle}>Assistant setup is incomplete</Text><Text style={styles.permissionText}>The AI service is not available yet.</Text></View>
    </View> : <>
      {props.messages.length === 0 ? <>
        <View style={styles.starterCard}>
          <View style={styles.starterMark}><Text style={styles.starterMarkText}>✳</Text></View>
          <Text style={styles.starterTitle}>Start with what matters.</Text>
          <Text style={styles.starterBody}>{props.contextEnabled ? 'Relevant saved notes and goals can be selected for each request.' : 'This chat only sees what you type. Enable Personal context for Assistant in Privacy to use matching notes and goals.'}</Text>
        </View>
        <Text style={styles.sectionLabel}>Useful when you need to</Text>
        <View style={styles.valueGrid}>{[
          ['MAKE A PLAN', 'Break a goal into next steps'], ['SPOT A PATTERN', 'Connect repeated notes to a small experiment'], ['WEIGH A CHOICE', 'See trade-offs and missing information'], ['USE YOUR CONTEXT', 'Bring relevant LIFEOS notes into the answer'],
        ].map(([title, detail]) => <View key={title} style={styles.valueCard}><Text style={styles.valueTitle}>{title}</Text><Text style={styles.valueDetail}>{detail}</Text></View>)}</View>
        <Text style={styles.sectionLabel}>A few ways to begin</Text>
        {prompts.map((prompt) => <Pressable key={prompt.title} accessibilityRole="button" onPress={() => props.onInput(prompt.text)} style={styles.promptCard}>
          <View style={styles.promptCopy}><Text style={styles.promptTitle}>{prompt.title}</Text><Text style={styles.promptText}>{prompt.text}</Text></View>
          <Text style={styles.arrow}>↗</Text>
        </Pressable>)}
      </> : <View style={styles.messageList}>
        {props.messages.map((message, index) => <View key={`${index}-${message.role}`} style={[styles.message, message.role === 'assistant' ? styles.assistantMessage : styles.userMessage]}>
          <Text style={styles.messageRole}>{message.role === 'assistant' ? 'LIFEOS' : 'YOU'}</Text>
          <Text style={styles.messageText}>{message.content}</Text>
          {message.role === 'assistant' && <Pressable accessibilityRole="button" onPress={() => Speech.speak(message.content)} style={{marginTop:6}}><Text style={{color:'#61e894',fontSize:11}}>🔊 Speak</Text></Pressable>}
        </View>)}
      </View>}

      {props.error && <Text accessibilityRole="alert" style={styles.error}>{props.error}</Text>}
      {props.busy && <ActivityIndicator color="#61e894" style={styles.spinner} />}
      <View style={styles.composer}>
        <TextInput accessibilityLabel="Ask LifeOS" value={props.input} onChangeText={props.onInput} multiline maxLength={4000}
          editable={!props.busy} placeholder="Ask a question or share a decision…" placeholderTextColor="#71877a" style={styles.composerInput} />
        <Pressable accessibilityRole="button" accessibilityLabel="Send message" disabled={!props.input.trim() || props.busy} onPress={props.onSend}
          style={[styles.sendButton, (!props.input.trim() || props.busy) && styles.disabled]}>
          <Text style={styles.sendIcon}>↗</Text>
        </Pressable>
      </View>
      <Text style={styles.disclaimer}>Review important advice and decisions carefully.</Text>
    </>}

    <View style={styles.linkRow}>
      <Text style={styles.linkLabel}>Personal context connects with</Text>
      <Pressable accessibilityRole="button" onPress={props.onOpenModules}><Text style={styles.link}>Your modules  ↗</Text></Pressable>
    </View>
  </ScrollView>;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#06100b' },
  content: { paddingHorizontal: 18, paddingTop: 18, paddingBottom: 24, maxWidth: 720, width: '100%', alignSelf: 'center' },
  intro: { marginBottom: 20 },
  eyebrow: { color: '#78d99a', fontSize: 10, letterSpacing: 1.5, fontWeight: '700', marginBottom: 8 },
  title: { color: '#f0f8f2', fontSize: 30, lineHeight: 37, fontWeight: '700', letterSpacing: -0.7 },
  subtitle: { color: '#9cad9f', fontSize: 14, lineHeight: 21, marginTop: 7 },
  permissionCard: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 17, borderWidth: 1, borderColor: '#294333', backgroundColor: '#0d1b12', padding: 15, marginBottom: 16 },
  permissionIcon: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: '#153b24' },
  permissionIconText: { color: '#76dfa0', fontSize: 20 },
  permissionCopy: { flex: 1, minWidth: 0 },
  permissionTitle: { color: '#eaf4ec', fontSize: 14, lineHeight: 19, fontWeight: '600' },
  permissionText: { color: '#9cad9f', fontSize: 11, lineHeight: 16, marginTop: 4 },
  starterCard: { borderRadius: 20, borderWidth: 1, borderColor: '#244a32', backgroundColor: '#0d1b12', padding: 18, marginBottom: 22 },
  starterMark: { width: 38, height: 38, borderRadius: 13, alignItems: 'center', justifyContent: 'center', backgroundColor: '#153b24', marginBottom: 12 },
  starterMarkText: { color: '#73f5a8', fontSize: 21 },
  starterTitle: { color: '#eaf4ec', fontSize: 17, lineHeight: 23, fontWeight: '600' },
  starterBody: { color: '#9cad9f', fontSize: 12, lineHeight: 18, marginTop: 6 },
  valueGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20 },
  valueCard: { width: '48%', flexGrow: 1, minWidth: 145, borderRadius: 13, backgroundColor: '#0c1910', borderColor: '#1d3927', borderWidth: 1, padding: 12 },
  valueTitle: { color: '#75d996', fontSize: 8, lineHeight: 12, letterSpacing: 0.8, fontWeight: '700' },
  valueDetail: { color: '#a9bcae', fontSize: 10, lineHeight: 15, marginTop: 5 },
  sectionLabel: { color: '#809687', fontSize: 10, letterSpacing: 1, fontWeight: '700', marginBottom: 9 },
  promptCard: { flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 15, borderWidth: 1, borderColor: '#1d3927', backgroundColor: '#0b160f', padding: 14, marginBottom: 9 },
  promptCopy: { flex: 1, minWidth: 0 },
  promptTitle: { color: '#dcebe0', fontSize: 13, lineHeight: 18, fontWeight: '600' },
  promptText: { color: '#8fa594', fontSize: 11, lineHeight: 16, marginTop: 4 },
  arrow: { color: '#66e89a', fontSize: 17 },
  messageList: { gap: 10, paddingBottom: 15 },
  message: { maxWidth: '94%', borderRadius: 15, padding: 13 },
  assistantMessage: { alignSelf: 'flex-start', backgroundColor: '#123321', borderColor: '#1e5635', borderWidth: 1 },
  userMessage: { alignSelf: 'flex-end', backgroundColor: '#17221a', borderColor: '#2b3a2f', borderWidth: 1 },
  messageRole: { color: '#6ddf98', fontSize: 9, fontWeight: '700', letterSpacing: 1, marginBottom: 5 },
  messageText: { color: '#e3f0e6', fontSize: 13, lineHeight: 20 },
  error: { color: '#ff9b9b', fontSize: 12, lineHeight: 18, marginBottom: 10 },
  spinner: { marginVertical: 10 },
  composer: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, borderRadius: 15, padding: 7, backgroundColor: '#08130c', borderColor: '#294333', borderWidth: 1, marginTop: 12 },
  composerInput: { flex: 1, minHeight: 42, maxHeight: 112, color: '#edf7ef', fontSize: 14, lineHeight: 20, paddingHorizontal: 8, paddingTop: 10, paddingBottom: 8 },
  sendButton: { width: 40, height: 40, borderRadius: 12, backgroundColor: '#54e78c', alignItems: 'center', justifyContent: 'center' },
  disabled: { opacity: 0.42 },
  sendIcon: { color: '#07140b', fontSize: 20, fontWeight: '700' },
  disclaimer: { color: '#75877a', fontSize: 10, lineHeight: 15, marginTop: 9 },
  linkRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, borderTopWidth: 1, borderTopColor: '#1d3624', marginTop: 20, paddingTop: 15 },
  linkLabel: { flex: 1, color: '#829687', fontSize: 11, lineHeight: 16 },
  link: { color: '#71df98', fontSize: 11, fontWeight: '600' },
});
