import * as Crypto from 'expo-crypto';
import * as SecureStore from 'expo-secure-store';
import Constants from 'expo-constants';
import type { Goal } from './goals';
import type { TwinEmbedding, TwinObservation, TwinScenario } from './twin';
import type { VisionCapture } from './vision';
import type { PrivacyPreferences } from './privacy';

const endpoint = (process.env.EXPO_PUBLIC_WORKERS_AI_URL ?? Constants.expoConfig?.extra?.workersAiUrl ?? '')
  .toString().trim().replace(/\/chat\/?$/, '');
const tokenKey = 'lifeos_device_session';
export interface AppSnapshot { goals: Goal[]; observations: TwinObservation[]; scenarios: TwinScenario[]; embeddings: TwinEmbedding[]; captures: VisionCapture[]; privacy: PrivacyPreferences }
async function sessionToken(): Promise<string> {
  let token = await SecureStore.getItemAsync(tokenKey);
  if (!token) { token = [...await Crypto.getRandomBytesAsync(32)].map((byte) => byte.toString(16).padStart(2, '0')).join(''); await SecureStore.setItemAsync(tokenKey, token); }
  return token;
}
export async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  if (!endpoint) throw new Error('Connect the LIFEOS service before syncing data.');
  const token = await sessionToken();
  const response = await fetch(`${endpoint}${path}`, { ...init, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, ...init.headers } });
  const payload = await response.json().catch(() => ({})) as T & { error?: unknown };
  if (!response.ok) throw new Error(typeof payload.error === 'string' ? payload.error : `Request failed (${response.status})`);
  return payload;
}
export const isApiConfigured = Boolean(endpoint);
export async function loadSnapshot(): Promise<AppSnapshot> {
  const data = await apiFetch<Omit<AppSnapshot, 'privacy'> & { privacy: { permission: string; enabled: number }[] }>('/data/snapshot');
  const privacy: PrivacyPreferences = { assistantAi: false, assistantContext: false, twinAi: false, visualAi: false, healthActivity: false };
  for (const row of data.privacy) {
    if (row.permission === 'assistant_ai') privacy.assistantAi = row.enabled === 1;
    if (row.permission === 'assistant_context') privacy.assistantContext = row.enabled === 1;
    if (row.permission === 'twin_ai') privacy.twinAi = row.enabled === 1;
    if (row.permission === 'visual_ai') privacy.visualAi = row.enabled === 1;
    if (row.permission === 'health_activity') privacy.healthActivity = row.enabled === 1;
  }
  return { ...data, privacy };
}
export async function saveObservation(item: TwinObservation) { return apiFetch('/data/observations', { method: 'POST', body: JSON.stringify(item) }); }
export async function deleteObservationRemote(id: number) { return apiFetch(`/data/observations/${id}`, { method: 'DELETE' }); }
export async function saveScenario(item: Omit<TwinScenario, 'createdAt'>) { return apiFetch('/data/scenarios', { method: 'POST', body: JSON.stringify(item) }); }
export async function deleteScenarioRemote(id: number) { return apiFetch(`/data/scenarios/${id}`, { method: 'DELETE' }); }
export async function saveEmbeddingRemote(item: TwinEmbedding) { return apiFetch('/data/embeddings', { method: 'POST', body: JSON.stringify({ observationId: item.observationId, vector: item.vector }) }); }
export async function savePrivacyRemote(permission: string, enabled: boolean) { return apiFetch('/data/privacy', { method: 'PUT', body: JSON.stringify({ permission, enabled }) }); }
export async function saveCaptureRemote(capture: { id: string; question: string; image: string; imagePreview: string }) { return apiFetch('/data/captures', { method: 'POST', body: JSON.stringify(capture) }); }
export async function saveCaptureAnswerRemote(id: string, question: string, answer: string) { return apiFetch(`/data/captures/${encodeURIComponent(id)}/answer`, { method: 'PUT', body: JSON.stringify({ question, answer }) }); }
export async function deleteCaptureRemote(id: string) { return apiFetch(`/data/captures/${encodeURIComponent(id)}`, { method: 'DELETE' }); }
export async function readModuleEvents(moduleId: string) {
  return apiFetch<{ events: { eventId: string; signalType: string; recordId: string; operation: string; createdAt: string }[] }>(`/data/modules/${encodeURIComponent(moduleId)}/events`);
}
export async function acknowledgeModuleEvent(moduleId: string, eventId: string) {
  return apiFetch(`/data/modules/${encodeURIComponent(moduleId)}/events/${encodeURIComponent(eventId)}`, { method: 'DELETE' });
}

export interface DailyActivity { day: string; steps: number; source: string; recordedAt: string }
export async function loadDeviceActivity() { return apiFetch<{ days: DailyActivity[] }>('/data/health/activity'); }
export async function saveDeviceActivity(days: { day: string; steps: number }[]) { return apiFetch('/data/health/activity', { method: 'POST', body: JSON.stringify({ days }) }); }
export async function deleteDeviceActivity() { return apiFetch('/data/health/activity', { method: 'DELETE' }); }

export interface ModuleRunResult {
  module: string;
  result: Record<string, unknown>;
  confidence: number;
  execution_time_ms: number;
  recommendations: string[];
  related_modules: string[];
}

export async function runModuleRemote(moduleId: string, data: Record<string, unknown> = {}): Promise<ModuleRunResult> {
  return apiFetch<ModuleRunResult>(`/intelligence/run/${encodeURIComponent(moduleId)}`, {
    method: 'POST',
    body: JSON.stringify({ module: moduleId, data, user_id: 'mobile_user' }),
  });
}

export interface AiHealth {
  status: 'ok' | 'degraded' | 'not_configured';
  configured: boolean;
  connected: boolean;
  default_model?: string;
  error?: string | null;
}

/** Ask the Python backend (Fly) whether its Cloudflare Workers AI link is live. */
export async function checkAiHealth(): Promise<AiHealth> {
  return apiFetch<AiHealth>('/intelligence/health/ai');
}
