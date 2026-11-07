export type ModuleId = 'assistant' | 'visual' | 'voice' | 'health' | 'learning' | 'food' | 'files' | 'environment' | 'accessibility' | 'twin';
export type SignalType = 'goals' | 'routines' | 'preferences' | 'activity' | 'wellbeing' | 'nutrition' | 'learning' | 'documents' | 'visual_notes' | 'environment' | 'decisions' | 'tasks' | 'interests' | 'access_needs';

export interface ModuleDefinition {
  id: ModuleId;
  name: string;
  icon: string;
  description: string;
  status: 'READY' | 'LOCAL' | 'PLANNED';
  reads: SignalType[];
  creates: SignalType[];
}

export const contextTypes: { id: SignalType; label: string; icon: string }[] = [
  { id: 'goals', label: 'Goals', icon: '◎' }, { id: 'routines', label: 'Routines', icon: '◷' },
  { id: 'preferences', label: 'Preferences', icon: '♡' }, { id: 'activity', label: 'Activity', icon: '⌁' },
  { id: 'wellbeing', label: 'Wellbeing', icon: '✚' }, { id: 'nutrition', label: 'Meals', icon: '◉' },
  { id: 'learning', label: 'Learning', icon: '⌘' }, { id: 'documents', label: 'Documents', icon: '▤' },
  { id: 'visual_notes', label: 'Visual notes', icon: '⌕' }, { id: 'environment', label: 'Environment', icon: '⌖' },
  { id: 'decisions', label: 'Decisions', icon: '↗' }, { id: 'tasks', label: 'Tasks', icon: '☷' },
  { id: 'interests', label: 'Interests', icon: '✳' }, { id: 'access_needs', label: 'Access needs', icon: '◌' },
];

export const moduleDefinitions: ModuleDefinition[] = [
  { id: 'assistant', name: 'Personal assistant', icon: '✳', description: 'Turn your context into plans, comparisons and next steps.', status: 'READY', reads: ['goals', 'routines', 'preferences', 'activity', 'wellbeing', 'nutrition', 'learning', 'documents', 'visual_notes', 'environment', 'decisions', 'tasks', 'interests'], creates: ['tasks', 'decisions'] },
  { id: 'twin', name: 'Personal Twin', icon: '◉', description: 'Connect signals over time and explore possible outcomes.', status: 'READY', reads: ['goals', 'routines', 'preferences', 'activity', 'wellbeing', 'nutrition', 'learning', 'decisions'], creates: ['decisions', 'routines'] },
  { id: 'visual', name: 'Visual intelligence', icon: '⌕', description: 'Understand a scene, object or document from an image.', status: 'LOCAL', reads: ['visual_notes', 'documents', 'access_needs'], creates: ['visual_notes', 'documents', 'access_needs'] },
  { id: 'voice', name: 'Offline voice', icon: '◖', description: 'Turn spoken thoughts into private notes and tasks.', status: 'PLANNED', reads: ['goals', 'routines', 'preferences'], creates: ['tasks', 'routines', 'goals'] },
  { id: 'health', name: 'Health intelligence', icon: '♡', description: 'Connect device steps and understand movement trends over time.', status: 'READY', reads: ['activity', 'wellbeing', 'nutrition', 'environment', 'goals'], creates: ['wellbeing', 'activity'] },
  { id: 'food', name: 'Food intelligence', icon: '◉', description: 'Connect meals and nutrition patterns with your goals.', status: 'PLANNED', reads: ['nutrition', 'wellbeing', 'goals', 'preferences'], creates: ['nutrition'] },
  { id: 'learning', name: 'Learning companion', icon: '⌘', description: 'Connect study activity to your real-world objectives.', status: 'PLANNED', reads: ['learning', 'goals', 'preferences', 'routines'], creates: ['learning', 'goals'] },
  { id: 'files', name: 'Private data search', icon: '▤', description: 'Find useful context in personal documents.', status: 'PLANNED', reads: ['documents', 'visual_notes', 'goals'], creates: ['documents'] },
  { id: 'environment', name: 'Environment context', icon: '⌁', description: 'Relate weather and local conditions to daily plans.', status: 'PLANNED', reads: ['environment', 'routines', 'wellbeing'], creates: ['environment'] },
  { id: 'accessibility', name: 'Accessibility companion', icon: '◎', description: 'Make visual and written information easier to use.', status: 'PLANNED', reads: ['visual_notes', 'documents', 'access_needs'], creates: ['access_needs', 'visual_notes'] },
];

export function relatedModules(module: ModuleDefinition): ModuleDefinition[] {
  const shared = new Set([...module.reads, ...module.creates]);
  return moduleDefinitions.filter((candidate) => candidate.id !== module.id
    && [...candidate.reads, ...candidate.creates].some((signal) => shared.has(signal)));
}
