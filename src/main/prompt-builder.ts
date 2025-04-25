// src/main/prompt-builder.ts

import { type ChatMessage } from './types'
import { AI_Prompt } from './lib/ai-base-prompt'
/**
 * Builds the final list of messages to send to the OpenAI API,
 * including injecting system prompts and RAG context.
 */
export function buildApiMessages(
  receivedMessages: ChatMessage[], // Assumes this includes the latest user message

  projectContext: string, // Info about indexed/active projects
  relevantStructureContext: string, // Specific structure context from RAG
  memoryContext: string // Specific memory context from RAG
): ChatMessage[] {
  // Start with the conversation history received from the renderer
  const currentMessages: ChatMessage[] = [...receivedMessages]

  // Define the combined initial system prompt
  const initialSystemPrompt = AI_Prompt + projectContext

  // Find or prepend the main system message
  const systemMessageIndex = currentMessages.findIndex((m) => m.role === 'system')
  if (systemMessageIndex !== -1) {
    // Update existing system message if found
    currentMessages[systemMessageIndex].content = initialSystemPrompt
  } else {
    // Prepend if no system message exists
    currentMessages.unshift({ role: 'system', content: initialSystemPrompt })
  }

  // Inject RAG Context as separate system messages right before the last user message
  let insertIndex = currentMessages.length - 1 // Default index is end
  const lastUserIndex = currentMessages.findLastIndex((m) => m.role === 'user')
  if (lastUserIndex !== -1) {
    insertIndex = lastUserIndex // Found user message, insert before it
  }

  // Inject memory first, then structure context (or vice-versa, order might matter)
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
