// src/main/tool-handlers/context-tools.ts

import { join } from 'path'
import { promises as fs } from 'fs'

/**
 * Executes the logic for the 'append_to_ai_context' tool.
 * Reads the existing AIContext.md, appends new text, and writes it back.
 */
export async function executeAppendToAIContext(
  basePath: string | undefined | null, // Project root path
  textToAppend: string,
  contextDescription: string // For error messages
): Promise<string> {
  // Returns status message string
  if (!basePath) {
    return `Error: Cannot append to AIContext.md. ${contextDescription}. Select an active project.`
  }
  if (!textToAppend || typeof textToAppend !== 'string' || textToAppend.trim() === '') {
    return 'Error: No valid text provided to append.'
  }

  const contextFilePath = join(basePath, 'AIContext.md')
  console.log(`ToolExec: append_to_ai_context - Target file: ${contextFilePath}`)

  try {
    let existingContent = ''
    try {
      // Read existing content, expect ENOENT if file doesn't exist (though index should create it)
      existingContent = await fs.readFile(contextFilePath, 'utf8')
    } catch (readError: any) {
      if (readError.code === 'ENOENT') {
        console.warn(`AIContext.md not found at ${contextFilePath}, will create.`)
        existingContent = `# AI Context for project\n\n` // Start fresh if missing
      } else {
        throw readError // Re-throw other read errors (e.g., permissions)
      }
    }

    // Append new content with separators
    const separator = '\n\n---\n\n' // Markdown horizontal rule for separation
    const newContent = existingContent.trimEnd() + separator + textToAppend.trim() + '\n' // Ensure newline at end

    // Write the entire new content back
    await fs.writeFile(contextFilePath, newContent, 'utf8')
    console.log(`ToolExec: Successfully appended content to ${contextFilePath}`)
    return `Successfully appended notes to AIContext.md for the active project.`
  } catch (error: any) {
    console.error(`ToolExec: append_to_ai_context error for project "${basePath}":`, error)
    if (
      (error as NodeJS.ErrnoException).code === 'EACCES' ||
      (error as NodeJS.ErrnoException).code === 'EPERM'
    ) {
      return `Error: Permission denied when trying to write to ${contextFilePath}.`
    } else {
      return `Error: Failed to append to AIContext.md. ${error.message || 'Unknown error'}`
    }
  }
}
