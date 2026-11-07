export type ChatMessage = { role: 'user' | 'assistant'; content: string };
export type SearchChunk = { id?: string; title?: string; text: string; score?: number };
