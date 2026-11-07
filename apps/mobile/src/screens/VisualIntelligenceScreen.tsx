import { useRef, useState } from 'react';
import { CameraView } from 'expo-camera';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import { ActivityIndicator, Image, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import type { VisionCapture } from '../vision';

interface CapturedImage {
  id: string;
  uri: string;
  dataUri: string;
}

interface Props {
  visionReady: boolean;
  aiAllowed: boolean;
  cameraGranted: boolean;
  onOpenPrivacy: () => void;
  busy: boolean;
  answer: string | null;
  error: string | null;
  captures: readonly VisionCapture[];
  onSaveCapture: (capture: Pick<VisionCapture, 'id' | 'question'> & { image: string; imagePreview: string }) => Promise<void>;
  onAnalyze: (id: string, dataUri: string, question: string) => void;
  onDeleteCapture: (capture: Pick<VisionCapture, 'id'>) => Promise<void>;
  onClearAnswer: () => void;
  onBack: () => void;
}

const questionPresets = [
  'Describe what you see',
  'Read visible text',
  'Explain this object',
];

export function VisualIntelligenceScreen(props: Props) {
  const cameraRef = useRef<CameraView>(null);
  const [cameraReady, setCameraReady] = useState(false);
  const [capturing, setCapturing] = useState(false);
  const [captured, setCaptured] = useState<CapturedImage | null>(null);
  const [question, setQuestion] = useState(questionPresets[0]);
  const [captureError, setCaptureError] = useState<string | null>(null);

  async function capture() {
    if (!cameraRef.current || !cameraReady || capturing) return;
    setCapturing(true);
    setCaptureError(null);
    props.onClearAnswer();
    try {
      const photo = await cameraRef.current.takePictureAsync({ quality: 0.7, skipProcessing: false });
      if (!photo?.uri) throw new Error('The camera did not return an image. Try again.');
      const rendered = await ImageManipulator.manipulate(photo.uri, { maxWidth: 1280, maxHeight: 1280 }).renderAsync();
      const compressed = await rendered.saveAsync({
        base64: true,
        compress: 0.68,
        format: SaveFormat.JPEG,
      });
      if (!compressed.base64) throw new Error('Could not prepare the photo for analysis.');
      const id = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
      const dataUri = `data:image/jpeg;base64,${compressed.base64}`;
      if (dataUri.length > 1_950_000) throw new Error('This photo is too large to save. Retake it closer to the subject.');
      const previewImage = await ImageManipulator.manipulate(compressed.uri, { maxWidth: 320, maxHeight: 320 }).renderAsync();
      const preview = await previewImage.saveAsync({ base64: true, compress: 0.45, format: SaveFormat.JPEG });
      if (!preview.base64 || preview.base64.length > 150_000) throw new Error('Could not prepare a small preview. Retake the photo and try again.');
      await props.onSaveCapture({ id, question, image: dataUri, imagePreview: `data:image/jpeg;base64,${preview.base64}` });
      setCaptured({ id, uri: compressed.uri, dataUri });
    } catch (cause) {
      setCaptureError(cause instanceof Error ? cause.message : 'Could not capture this image.');
    } finally {
      setCapturing(false);
    }
  }

  async function discardPhoto() {
    if (captured) await props.onDeleteCapture({ id: captured.id });
    setCaptured(null);
    props.onClearAnswer();
  }

  return <ScrollView style={styles.screen} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
    <View style={styles.topbar}>
      <Pressable accessibilityRole="button" onPress={props.onBack} style={styles.backButton}>
        <Text style={styles.backText}>‹  Intelligence</Text>
      </Pressable>
      <Text style={styles.topbarLabel}>VISUAL INTELLIGENCE</Text>
    </View>

    <View style={styles.intro}>
      <Text style={styles.eyebrow}>SEE IT IN CONTEXT</Text>
      <Text style={styles.title}>What are you looking at?</Text>
      <Text style={styles.subtitle}>Capture a scene, object or document. Choose what to ask, then review the image before starting an analysis.</Text>
    </View>

    {!captured ? <View style={styles.cameraFrame}>
      {!props.cameraGranted ? <View style={styles.permissionState}>
        <View style={styles.cameraGlyph}><Text style={styles.cameraGlyphText}>◎</Text></View>
        <Text style={styles.cameraTitle}>{props.cameraGranted ? 'Camera unavailable' : 'Camera access is off'}</Text>
        <Text style={styles.cameraCopy}>Manage camera access in Privacy before capturing an image.</Text>
        <Pressable accessibilityRole="button" onPress={props.onOpenPrivacy} style={styles.primaryButton}><Text style={styles.primaryButtonText}>Open Privacy</Text></Pressable>
      </View> : <>
        <CameraView ref={cameraRef} style={styles.camera} facing="back" mode="picture" onCameraReady={() => setCameraReady(true)} />
        <View pointerEvents="none" style={styles.cameraOverlay}>
          <View style={styles.viewfinder}><View style={[styles.corner, styles.cornerTopLeft]} /><View style={[styles.corner, styles.cornerTopRight]} /><View style={[styles.corner, styles.cornerBottomLeft]} /><View style={[styles.corner, styles.cornerBottomRight]} /></View>
          <Text style={styles.cameraHint}>Center an object, scene or page</Text>
        </View>
        <View style={styles.shutterDock}>
          <Text style={styles.dockHint}>PHOTO STORED IN LIFEOS</Text>
          <Pressable accessibilityRole="button" accessibilityLabel="Capture image" disabled={!cameraReady || capturing} onPress={() => void capture()} style={[styles.shutter, (!cameraReady || capturing) && styles.disabled]}>
            {capturing ? <ActivityIndicator color="#07150b" /> : <View style={styles.shutterInner} />}
          </Pressable>
        </View>
      </>}
    </View> : <View style={styles.previewFrame}>
      <Image source={{ uri: captured.uri }} style={styles.preview} resizeMode="cover" />
      <Pressable accessibilityRole="button" accessibilityLabel="Discard captured image" onPress={() => void discardPhoto()} style={styles.retakeButton}>
        <Text style={styles.retakeText}>Retake</Text>
      </Pressable>
      <Text style={styles.previewLabel}>IMAGE PREVIEW · SAVED IN LIFEOS</Text>
    </View>}

    {(captureError || props.error) && <Text accessibilityRole="alert" style={styles.error}>{captureError ?? props.error}</Text>}

    <View style={styles.askCard}>
      <Text style={styles.cardEyebrow}>ASK ABOUT THIS IMAGE</Text>
      <View style={styles.presetList}>
        {questionPresets.map((preset) => <Pressable key={preset} accessibilityRole="button" onPress={() => setQuestion(preset)} style={[styles.preset, question === preset && styles.presetSelected]}>
          <Text style={[styles.presetText, question === preset && styles.presetTextSelected]}>{preset}</Text>
        </Pressable>)}
      </View>
      <TextInput accessibilityLabel="Question about image" value={question} onChangeText={setQuestion} maxLength={300} multiline placeholder="Ask a question about this image" placeholderTextColor="#71877a" style={styles.questionInput} />
      {!props.aiAllowed && <Pressable accessibilityRole="button" onPress={props.onOpenPrivacy} style={styles.permissionLink}><Text style={styles.consentText}>Visual analysis is off. Manage access in Privacy  ↗</Text></Pressable>}
      {!props.visionReady && <Text style={styles.setupHint}>Analysis is not available yet. Your saved photo stays in your account.</Text>}
      <Pressable accessibilityRole="button" disabled={!captured || !props.aiAllowed || !question.trim() || !props.visionReady || props.busy}
        onPress={() => captured && props.onAnalyze(captured.id, captured.dataUri, question.trim())}
        style={[styles.primaryButton, (!captured || !props.aiAllowed || !question.trim() || !props.visionReady || props.busy) && styles.disabled]}>
        {props.busy ? <ActivityIndicator color="#07150b" /> : <Text style={styles.primaryButtonText}>Analyze image  ↗</Text>}
      </Pressable>
    </View>

    {props.answer && <View style={styles.answerCard}>
      <Text style={styles.cardEyebrow}>IMAGE INSIGHT</Text>
      <Text style={styles.answerText}>{props.answer}</Text>
      <Text style={styles.answerNote}>AI can misread images or text. Check important details against the original.</Text>
    </View>}
    {props.captures.length > 0 && <View style={styles.historySection}>
      <Text style={styles.historyTitle}>Recent captures</Text>
      {props.captures.map((capture) => <View key={capture.id} style={styles.historyCard}>
        <View style={styles.historyRow}>
          {capture.imageUri ? <Image source={{ uri: capture.imageUri }} style={styles.historyImage} resizeMode="cover" />
            : <View style={[styles.historyImage, styles.legacyImage]}><Text style={styles.legacyImageText}>Local image unavailable</Text></View>}
          <View style={styles.historyCopy}>
            <View style={styles.historyHeading}>
              <Text style={styles.historyQuestion} numberOfLines={2}>{capture.question}</Text>
              <Text style={styles.storedTag}>SAVED</Text>
            </View>
            <Text style={styles.historyAnswer} numberOfLines={4}>{capture.answer ?? 'Saved. Add a question and analyze when you are ready.'}</Text>
          </View>
        </View>
        <Text style={styles.historyDate}>{new Date(capture.createdAt).toLocaleString()}</Text>
        <Pressable accessibilityRole="button" disabled={props.busy} onPress={() => void props.onDeleteCapture(capture)} style={styles.deleteCapture}>
          <Text style={styles.deleteCaptureText}>{props.busy ? 'Removing…' : 'Delete photo and record'}</Text>
        </Pressable>
      </View>)}
    </View>}
    <Text style={styles.privacyNote}>Photos, questions and answers are stored in LIFEOS. Manage analysis access in Privacy. Delete a capture here to remove it.</Text>
  </ScrollView>;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#06100b' },
  content: { paddingHorizontal: 18, paddingTop: 10, paddingBottom: 36, maxWidth: 720, width: '100%', alignSelf: 'center' },
  topbar: { minHeight: 42, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 15 },
  backButton: { paddingVertical: 9, paddingRight: 12 },
  backText: { color: '#71df98', fontSize: 13, fontWeight: '600' },
  topbarLabel: { color: '#809687', fontSize: 9, fontWeight: '700', letterSpacing: 1, flexShrink: 1 },
  intro: { marginBottom: 18 },
  eyebrow: { color: '#78d99a', fontSize: 10, fontWeight: '700', letterSpacing: 1.4, marginBottom: 7 },
  title: { color: '#f0f8f2', fontSize: 27, lineHeight: 34, fontWeight: '700', letterSpacing: -0.5 },
  subtitle: { color: '#9cad9f', fontSize: 13, lineHeight: 20, marginTop: 7 },
  cameraFrame: { height: 390, overflow: 'hidden', borderRadius: 22, borderWidth: 1, borderColor: '#244a32', backgroundColor: '#0b160f', marginBottom: 16 },
  camera: StyleSheet.absoluteFill,
  permissionState: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  cameraGlyph: { width: 54, height: 54, borderRadius: 18, backgroundColor: '#153b24', borderWidth: 1, borderColor: '#27764a', alignItems: 'center', justifyContent: 'center', marginBottom: 15 },
  cameraGlyphText: { color: '#73f5a8', fontSize: 29 },
  cameraTitle: { color: '#eaf4ec', fontSize: 18, lineHeight: 24, fontWeight: '600', textAlign: 'center' },
  cameraCopy: { color: '#9cad9f', fontSize: 13, lineHeight: 20, textAlign: 'center', marginTop: 7, maxWidth: 300 },
  cameraOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' },
  viewfinder: { width: '77%', aspectRatio: 0.86, position: 'relative' },
  corner: { position: 'absolute', width: 28, height: 28, borderColor: '#77ed9f' },
  cornerTopLeft: { top: 0, left: 0, borderTopWidth: 2, borderLeftWidth: 2, borderTopLeftRadius: 9 },
  cornerTopRight: { top: 0, right: 0, borderTopWidth: 2, borderRightWidth: 2, borderTopRightRadius: 9 },
  cornerBottomLeft: { bottom: 0, left: 0, borderBottomWidth: 2, borderLeftWidth: 2, borderBottomLeftRadius: 9 },
  cornerBottomRight: { bottom: 0, right: 0, borderBottomWidth: 2, borderRightWidth: 2, borderBottomRightRadius: 9 },
  cameraHint: { position: 'absolute', top: 18, color: '#f0f8f2', fontSize: 11, lineHeight: 17, backgroundColor: '#06100b9c', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6, overflow: 'hidden' },
  shutterDock: { position: 'absolute', left: 0, right: 0, bottom: 0, alignItems: 'center', paddingBottom: 15, paddingTop: 18, backgroundColor: '#06100b80' },
  dockHint: { color: '#e1eee4', fontSize: 8, letterSpacing: 0.9, fontWeight: '700', marginBottom: 10 },
  shutter: { width: 58, height: 58, borderRadius: 29, borderWidth: 3, borderColor: '#f0f8f2', alignItems: 'center', justifyContent: 'center', backgroundColor: '#ffffff25' },
  shutterInner: { width: 42, height: 42, borderRadius: 21, backgroundColor: '#61e894' },
  previewFrame: { height: 330, overflow: 'hidden', borderRadius: 22, borderWidth: 1, borderColor: '#244a32', backgroundColor: '#0b160f', marginBottom: 16 },
  preview: { width: '100%', height: '100%' },
  retakeButton: { position: 'absolute', top: 12, right: 12, backgroundColor: '#06100bcc', borderWidth: 1, borderColor: '#ffffff50', borderRadius: 18, paddingHorizontal: 14, paddingVertical: 8 },
  retakeText: { color: '#f0f8f2', fontSize: 12, fontWeight: '600' },
  previewLabel: { position: 'absolute', left: 12, bottom: 12, color: '#e1eee4', backgroundColor: '#06100bcc', borderRadius: 10, paddingHorizontal: 9, paddingVertical: 6, fontSize: 8, letterSpacing: 0.8, fontWeight: '700', overflow: 'hidden' },
  askCard: { borderRadius: 20, borderWidth: 1, borderColor: '#244a32', backgroundColor: '#0d1b12', padding: 16, marginBottom: 14 },
  cardEyebrow: { color: '#76dfa0', fontSize: 9, fontWeight: '700', letterSpacing: 1.1, lineHeight: 15, marginBottom: 11 },
  presetList: { flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginBottom: 10 },
  preset: { borderRadius: 18, borderWidth: 1, borderColor: '#294333', backgroundColor: '#0b160f', paddingHorizontal: 10, paddingVertical: 8 },
  presetSelected: { borderColor: '#58b97b', backgroundColor: '#153b26' },
  presetText: { color: '#9cad9f', fontSize: 10, lineHeight: 14 },
  presetTextSelected: { color: '#d9f5e1', fontWeight: '600' },
  questionInput: { minHeight: 50, maxHeight: 100, borderRadius: 12, borderWidth: 1, borderColor: '#294333', backgroundColor: '#0b160f', paddingHorizontal: 12, paddingVertical: 11, color: '#edf7ef', fontSize: 13, lineHeight: 19, textAlignVertical: 'top' },
  permissionLink: { paddingVertical: 10 },
  consentText: { flex: 1, color: '#9cad9f', fontSize: 10, lineHeight: 15 },
  setupHint: { color: '#d0b56d', fontSize: 11, lineHeight: 16, marginTop: 8 },
  primaryButton: { minHeight: 48, borderRadius: 12, backgroundColor: '#61e894', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 14, paddingVertical: 12, marginTop: 11 },
  primaryButtonText: { color: '#07150b', fontWeight: '700', fontSize: 13, lineHeight: 20, textAlign: 'center' },
  disabled: { opacity: 0.42 },
  error: { color: '#ff9b9b', fontSize: 12, lineHeight: 18, marginBottom: 11 },
  answerCard: { borderRadius: 18, borderWidth: 1, borderColor: '#1e5635', backgroundColor: '#102b1a', padding: 16, marginBottom: 12 },
  answerText: { color: '#e3f0e6', fontSize: 14, lineHeight: 22 },
  answerNote: { color: '#8fa594', fontSize: 10, lineHeight: 15, marginTop: 12, borderTopWidth: 1, borderTopColor: '#1d4830', paddingTop: 10 },
  historySection: { marginTop: 8, marginBottom: 12 },
  historyTitle: { color: '#eaf4ec', fontSize: 18, lineHeight: 24, fontWeight: '600', marginBottom: 11 },
  historyCard: { borderRadius: 16, borderWidth: 1, borderColor: '#1d3927', backgroundColor: '#0c1910', padding: 14, marginBottom: 9 },
  historyRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 11 },
  historyImage: { width: 68, height: 76, borderRadius: 10, backgroundColor: '#142219', flexShrink: 0 },
  legacyImage: { alignItems: 'center', justifyContent: 'center', padding: 5 },
  legacyImageText: { color: '#849688', fontSize: 8, lineHeight: 11, textAlign: 'center' },
  historyCopy: { flex: 1, minWidth: 0 },
  historyHeading: { flexDirection: 'row', alignItems: 'flex-start', gap: 7, marginBottom: 7 },
  historyQuestion: { flex: 1, color: '#dcebe0', fontSize: 13, lineHeight: 19, fontWeight: '600' },
  storedTag: { color: '#8ee9aa', fontSize: 7, lineHeight: 11, fontWeight: '700', backgroundColor: '#153b26', borderRadius: 8, paddingHorizontal: 6, paddingVertical: 3, flexShrink: 0 },
  historyAnswer: { color: '#a9bcae', fontSize: 12, lineHeight: 18 },
  historyDate: { color: '#75877a', fontSize: 9, lineHeight: 14, marginTop: 9 },
  deleteCapture: { alignSelf: 'flex-start', paddingVertical: 8, marginTop: 4 },
  deleteCaptureText: { color: '#ff9b9b', fontSize: 11, lineHeight: 16, fontWeight: '600' },
  privacyNote: { color: '#75877a', fontSize: 10, lineHeight: 15, marginTop: 2 },
});
