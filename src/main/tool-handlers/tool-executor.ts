// src/main/tool-handlers/tool-executor.ts

import OpenAI from 'openai'
import { type Project } from '../types'
import {
  listDirectoryTool,
  listDirectoryRecursiveTool,
  readFileTool,
  saveMemoryTool,
  createDirectoryTool,
  createFileTool,
  editFileTool,
  appendToAIContextTool
} from '../tools'
import {
  executeListDirectory,
  executeListDirectoryRecursive,
  executeCreateDirectory
} from './directory-tools'
import { executeReadFile, executeCreateFile, executeEditFile } from './file-tools'
import { executeSaveMemory } from './memory-tools'
import { executeAppendToAIContext } from '../context/context-handler'

// Type for the result expected by the orchestrator
export interface ToolExecutionResult {
  result: string
  needsReindex: boolean
}

/**
 * Determines the base path and executes the appropriate tool function based on the tool call name.
 */
export async function executeSingleToolCall(
  toolCall: OpenAI.Chat.Completions.ChatCompletionMessageToolCall,
  activeProject: (Project & { rootPath?: string }) | null,
  appInstance: Electron.App,
  openaiClient: OpenAI | null
): Promise<ToolExecutionResult> {
  let functionResult = ''
  let needsReindex = false
  const toolName = toolCall.function.name
  let args: any

  try {
    args = JSON.parse(toolCall.function.arguments)
  } catch (e) {
    return { result: `Error: Invalid arguments for tool ${toolName}.`, needsReindex: false }
  }

  // Determine Base Path and Context Description
  let basePath: string | undefined = undefined // Use undefined initially
  let contextDescription: string
  const isModificationTool = [
    createDirectoryTool.function.name,
    createFileTool.function.name,
    editFileTool.function.name
  ].includes(toolName)
  const isContextTool = [
    saveMemoryTool.function.name,
    appendToAIContextTool.function.name
  ].includes(toolName) // Add context tool check

  if (activeProject?.rootPath) {
    basePath = activeProject.rootPath
    contextDescription = `relative to the active project root (${activeProject.name})`
  } else if (isModificationTool || toolName === appendToAIContextTool.function.name) {
    // Append also needs active project
    functionResult = `Error: Tool ${toolName} requires an active project context. Select a project first.`
    return { result: functionResult, needsReindex: false }
  } else {
    // Read/list tools fallback to home
    basePath = appInstance.getPath('home')
    contextDescription = `relative to the user's home directory`
  }

  // Dispatch to the correct execution function
  console.log(`ToolExecutor: Dispatching call for ${toolName}`)
  switch (toolName) {
    case listDirectoryTool.function.name:
      functionResult = await executeListDirectory(basePath!, args.path, contextDescription) // Non-null assertion ok due to checks above
      break
    case listDirectoryRecursiveTool.function.name: {
      const maxDepthLR =
        args.maxDepth !== undefined && typeof args.maxDepth === 'number'
          ? Math.floor(args.maxDepth)
          : typeof args.maxDepth === 'string'
            ? parseInt(args.maxDepth, 10)
            : 3
      functionResult = await executeListDirectoryRecursive(
        basePath!,
        args.path,
        maxDepthLR,
        contextDescription
      )
      break
    }
    case readFileTool.function.name:
      functionResult = await executeReadFile(basePath!, args.path, contextDescription)
      break
    case saveMemoryTool.function.name:
      functionResult = await executeSaveMemory(
        args.summary_text,
        openaiClient,
        activeProject?.id ?? null
      )
      break
    case createDirectoryTool.function.name:
      functionResult = await executeCreateDirectory(basePath!, args.path, contextDescription)
      if (!functionResult.startsWith('Error:')) needsReindex = true
      break
    case createFileTool.function.name:
      functionResult = await executeCreateFile(
        basePath!,
        args.path,
        args.content ?? '',
        contextDescription
      )
      if (!functionResult.startsWith('Error:')) needsReindex = true
      break
    case editFileTool.function.name:
      functionResult = await executeEditFile(
        basePath!,
        args.path,
        args.new_content ?? '',
        contextDescription
      )
      // Optionally set needsReindex = true for edits too
      break
    // --- NEW CASE for append ---
    case appendToAIContextTool?.function.name:
      // We already ensured basePath is project root path above
      functionResult = await executeAppendToAIContext(
        basePath,
        args.text_to_append ?? '',
        contextDescription
      )
      // Appending to context file doesn't usually require re-indexing structure
      break
    default:
      console.warn(`ToolExecutor: Unknown tool requested: ${toolName}`)
      functionResult = `Error: Tool "${toolName}" not found.`
  }

  console.log(`ToolExecutor: Result for ${toolName}: "${functionResult.substring(0, 100)}..."`)
  return { result: functionResult, needsReindex }
}
