export type PrivacyPermission = 'assistant_ai' | 'assistant_context' | 'twin_ai' | 'visual_ai' | 'health_activity';
export interface PrivacyPreferences {
  assistantAi: boolean;
  assistantContext: boolean;
  twinAi: boolean;
  visualAi: boolean;
  healthActivity: boolean;
}

/** App-state key for each permission, mirrored to the backend under `permission`. */
export type PermissionKey = keyof PrivacyPreferences;

const DB_KEYS: Record<PermissionKey, PrivacyPermission> = {
  assistantAi: 'assistant_ai',
  assistantContext: 'assistant_context',
  twinAi: 'twin_ai',
  visualAi: 'visual_ai',
  healthActivity: 'health_activity',
};

export function permissionDbKey(key: PermissionKey): PrivacyPermission {
  return DB_KEYS[key];
}

/** Where the permission's effect applies. */
export type PermissionScope = 'ai' | 'device';

export interface PermissionDefinition {
  key: PermissionKey;
  dbKey: PrivacyPermission;
  title: string;
  detail: string;
  scope: PermissionScope;
  requiredPermission?: 'camera' | 'microphone' | 'motion';
}

/**
 * Single source of truth for every LIFEOS consent toggle.
 * The Privacy screen renders directly from this list, and new permissions
 * appear on the page by adding an entry here — no screen edits needed.
 */
export const PERMISSIONS: PermissionDefinition[] = [
  {
    key: 'assistantAi',
    dbKey: 'assistant_ai',
    title: 'Personal assistant',
    detail: 'When you send a message, its text is processed to create a reply.',
    scope: 'ai',
  },
  {
    key: 'assistantContext',
    dbKey: 'assistant_context',
    title: 'Personal context for Assistant',
    detail: 'Allow relevant saved routines, preferences, goals and notes to be selected for a request. Only the best matching notes are included.',
    scope: 'ai',
  },
  {
    key: 'twinAi',
    dbKey: 'twin_ai',
    title: 'Personal Twin insights',
    detail: 'When you request an update, selected observations, goals and scenario assumptions are analyzed.',
    scope: 'ai',
  },
  {
    key: 'visualAi',
    dbKey: 'visual_ai',
    title: 'Visual analysis',
    detail: 'When you tap Analyze, the selected photo and question are processed. Captured images remain stored in your LIFEOS workspace.',
    scope: 'ai',
    requiredPermission: 'camera',
  },
  {
    key: 'healthActivity',
    dbKey: 'health_activity',
    title: 'iPhone activity and step totals',
    detail: 'Allow LIFEOS to read up to seven days of step totals when you request a refresh. No background tracking.',
    scope: 'device',
    requiredPermission: 'motion',
  },
];

/** Group headings shown on the Privacy screen, in order. */
export const PERMISSION_GROUPS: { scope: PermissionScope; heading: string }[] = [
  { scope: 'ai', heading: 'AI features' },
  { scope: 'device', heading: 'Device permissions' },
];
