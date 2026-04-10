/**
 * lib/arena-selector.ts — Arena Mode agent selection
 *
 * Randomly pick 2 available agents for a blind comparison.
 */

import type { ChatAgent } from '@/store/chat-store';

/**
 * Pick 2 random agents from those with configured API keys.
 * Falls back to claude + gemini if fewer than 2 are available.
 */
export function selectArenaAgents(settings: {
  claudeApiKey?: string;
  geminiApiKey?: string;
  groqApiKey?: string;
  cerebrasApiKey?: string;
  perplexityApiKey?: string;
  localLlmUrl?: string;
}): [ChatAgent, ChatAgent] {
  const available: ChatAgent[] = [];

  if (settings.claudeApiKey) available.push('claude');
  if (settings.geminiApiKey) available.push('gemini');
  if (settings.groqApiKey) available.push('groq');
  if (settings.cerebrasApiKey) available.push('cerebras');
  if (settings.perplexityApiKey) available.push('perplexity');
  if (settings.localLlmUrl) available.push('local');

  if (available.length < 2) {
    return ['claude', 'gemini'];
  }

  // Shuffle and pick 2
  const shuffled = [...available].sort(() => Math.random() - 0.5);
  return [shuffled[0], shuffled[1]];
}
