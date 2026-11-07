export type PrivacyPermission = 'assistant_ai' | 'assistant_context' | 'twin_ai' | 'visual_ai' | 'health_activity';
export interface PrivacyPreferences {
  assistantAi: boolean;
  assistantContext: boolean;
  twinAi: boolean;
  visualAi: boolean;
  healthActivity: boolean;
}
