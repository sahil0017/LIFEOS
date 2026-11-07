import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

export function Action({ label, onPress, disabled = false, secondary = false }: {
  label: string; onPress: () => void; disabled?: boolean; secondary?: boolean;
}) {
  return (
    <Pressable accessibilityRole="button" disabled={disabled} onPress={onPress}
      style={[styles.button, secondary && styles.secondaryButton, disabled && styles.disabled]}>
      <Text style={[styles.buttonText, secondary && styles.secondaryText]}>{label}</Text>
    </Pressable>
  );
}

export function Card({ children }: { children: ReactNode }) {
  return <View style={styles.card}>{children}</View>;
}

export function Heading({ title, description }: { title: string; description: string }) {
  return <View style={styles.intro}><Text style={styles.heading}>{title}</Text><Text style={styles.subtitle}>{description}</Text></View>;
}

const styles = StyleSheet.create({
  intro: { marginTop: 14, marginBottom: 22 },
  heading: { color: '#f0f8f2', fontSize: 30, fontWeight: '700', lineHeight: 38 },
  subtitle: { color: '#9cad9f', fontSize: 15, lineHeight: 23, marginTop: 8 },
  card: { backgroundColor: '#0d1b12', borderColor: '#244a32', borderWidth: 1, borderRadius: 18, padding: 17, marginBottom: 12 },
  button: { backgroundColor: '#61e894', borderRadius: 12, padding: 14, alignItems: 'center', marginTop: 12, minHeight: 48, justifyContent: 'center' },
  buttonText: { color: '#07150b', fontWeight: '700', fontSize: 14, lineHeight: 20, textAlign: 'center' },
  secondaryButton: { backgroundColor: '#101f16', borderWidth: 1, borderColor: '#31563c' },
  secondaryText: { color: '#9de8b4' },
  disabled: { opacity: 0.5 },
});
