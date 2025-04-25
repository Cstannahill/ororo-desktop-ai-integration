// src/main/tool-handlers/memory-tools.ts

import OpenAI from 'openai'
import { saveInsight } from '../lib/database'

/**
 * Executes the logic for the 'save_memory' tool.
 */
export async function executeSaveMemory(
  summaryText: string,
  openaiClient: OpenAI | null,
  activeProjectId: number | null
): Promise<string> {
  let functionResult = ''
  try {
    if (summaryText) {
      console.log(`ToolExec: save_memory - Saving: "${summaryText.substring(0, 50)}..."`)
      const saved = await saveInsight(summaryText, openaiClient, activeProjectId)
      functionResult = saved
        ? 'Successfully saved summary to long-term memory.'
        : 'Error: Failed to save summary to memory.'
    } else {
      functionResult = 'Error: No summary text provided to save.'
    }
  } catch (error: any) {
    console.error(`ToolExec: save_memory error:`, error)
    functionResult = `Error processing save_memory request: ${error.message || 'Invalid arguments'}`
  }
  return functionResult
}
