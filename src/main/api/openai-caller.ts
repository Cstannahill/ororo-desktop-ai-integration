// src/main/api/openai-caller.ts

import OpenAI from 'openai'
import {
  type ChatCompletionMessageParam,
  type ChatCompletionTool
} from 'openai/resources/chat/completions'
import { type ChatMessage } from '../types' // Use our internal ChatMessage type where appropriate

/**
 * Makes the primary call to OpenAI Chat Completions API, including tools.
 */
export async function callOpenAICompletion(
  messages: ChatMessage[],
  tools: ChatCompletionTool[],
  openaiClient: OpenAI | null
): Promise<OpenAI.Chat.Completions.ChatCompletionMessage | null> {
  if (!openaiClient) {
    console.error('OpenAICaller: OpenAI client is not initialized.')
    // Maybe return a specific error object or throw? Returning null for now.
    return null
  }
  console.log('OpenAICaller: Sending initial request to OpenAI...')
  try {
    // Assert type for the API call
    const messagesForApi = messages as ChatCompletionMessageParam[]
    const completion = await openaiClient.chat.completions.create({
      messages: messagesForApi,
      model: 'gpt-4.1-2025-04-14', // Consider making model configurable later
      tools: tools,
      tool_choice: 'auto'
    })
    console.log('OpenAICaller: Received initial response.')
    return completion.choices[0]?.message || null // Return the message object or null
  } catch (error) {
    console.error('OpenAICaller: Error during initial API call:', error)
    // Re-throw or handle specific API errors if needed
    throw error // Propagate error to the caller
  }
}

/**
 * Makes the second call to OpenAI Chat Completions API after tool results are added.
 */
export async function callOpenAICompletionWithToolResults(
  messages: ChatMessage[], // This list includes assistant request + tool results
  openaiClient: OpenAI | null
): Promise<OpenAI.Chat.Completions.ChatCompletionMessage | null> {
  if (!openaiClient) {
    console.error('OpenAICaller: OpenAI client is not initialized for second call.')
    return null
  }
  console.log('OpenAICaller: Sending second request to OpenAI with tool results...')
  try {
    // Assert type for the API call
    const messagesForApi = messages as ChatCompletionMessageParam[]
    const completion = await openaiClient.chat.completions.create({
      messages: messagesForApi,
      model: 'gpt-4.1-2025-04-14' // Ensure model is specified
      // No 'tools' parameter needed here generally
    })
    console.log('OpenAICaller: Received final response.')
    return completion.choices[0]?.message || null
  } catch (error) {
    console.error('OpenAICaller: Error during second API call:', error)
    throw error // Propagate error
  }
}
