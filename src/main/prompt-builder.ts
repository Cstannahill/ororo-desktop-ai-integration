// src/main/prompt-builder.ts

import { type ChatMessage } from './types'
// Import the base prompt constant
import { AI_Prompt } from './lib/ai-base-prompt'

/**
 * Builds the final list of messages to send to the OpenAI API,
 * including injecting system prompts and RAG context.
 */
export function buildApiMessages(
  receivedMessages: ChatMessage[],
  // Removed baseSystemPrompt from parameters
  projectContext: string, // Info about indexed/active projects
  relevantStructureContext: string, // Specific structure context from RAG
  memoryContext: string // Specific memory context from RAG
): ChatMessage[] {
  // Start with the conversation history received from the renderer
  const currentMessages: ChatMessage[] = [...receivedMessages]

  // Combine base prompt (imported) and dynamic project list/active status context
  const initialSystemPrompt = AI_Prompt + projectContext // Use imported AI_Prompt

  // Find or prepend the main system message
  const systemMessageIndex = currentMessages.findIndex((m) => m.role === 'system')
  if (systemMessageIndex !== -1) {
    currentMessages[systemMessageIndex].content = initialSystemPrompt
  } else {
    currentMessages.unshift({ role: 'system', content: initialSystemPrompt })
  }

  // Inject RAG Context as separate system messages right before the last user message
  let insertIndex = currentMessages.length - 1
  const lastUserIndex = currentMessages.findLastIndex((m) => m.role === 'user')
  if (lastUserIndex !== -1) {
    insertIndex = lastUserIndex
  }

  // Inject in a specific order (e.g., Preferences -> Memory -> Structure)
  // Note: preferences not explicitly handled here yet, assumed part of memoryContext for now
  if (memoryContext) {
    currentMessages.splice(insertIndex, 0, { role: 'system', content: memoryContext })
  }
  if (relevantStructureContext) {
    currentMessages.splice(insertIndex, 0, { role: 'system', content: relevantStructureContext })
  }

  console.log(
    'PromptBuilder: Final messages prepared for API:',
    JSON.stringify(currentMessages, null, 2)
  )
  return currentMessages
}
