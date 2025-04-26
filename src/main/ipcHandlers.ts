// src/main/ipcHandlers.ts

import { dialog, type BrowserWindow } from 'electron'
import OpenAI from 'openai'
import { AI_Prompt } from '../main/lib/ai-base-prompt'
import { availableTools } from './tools'
// Import Types
import { type AppStore, type ChatMessage, type DirectoryTree, type Project } from './types'
import ElectronStoreModule, { type Store as ElectronStoreType } from 'electron-store'
// Import Helpers/Logic
import { loadAppContext } from './context/context-loader'
import { getRAGContext } from './context/rag-processor'
import { buildApiMessages } from './prompt-builder'
import { callOpenAICompletion, callOpenAICompletionWithToolResults } from './api/openai-caller'
import { executeSingleToolCall } from './tool-handlers/tool-executor'
import { triggerReindex } from './lib/reindexer' // Import reindexer
import { loadIndexedProjects, saveInsight, findRelevantInsights, getDb } from './lib/database' // Keep DB access needed for exported handlers
import { getDirectoryTreeObject } from './lib/file-system' // Keep for handleIndexProject
import { basename, dirname, join, normalize, resolve } from 'path' // Keep for handleIndexProject
import fs from 'fs/promises' // Keep for handleIndexProject

// --- Main Orchestrator Function ---
export async function processUserMessage(
  receivedMessages: ChatMessage[],
  openaiClient: OpenAI | null,
  mainWindow: BrowserWindow | null,
  appInstance: Electron.App,
  activeProjectId: number | null
): Promise<void> {
  // 1. Basic Checks
  console.log(`processUserMessage entry: openaiClient is ${openaiClient ? 'INITIALIZED' : 'NULL'}`)
  if (!openaiClient || !receivedMessages || receivedMessages.length === 0) {
    mainWindow?.webContents.send(
      'ipc-receive-message',
      'ERROR: OpenAI API Key not set. Please set it in the application settings.'
    )
    return
  }
  const lastUserMessage = receivedMessages.findLast((m) => m.role === 'user')?.content?.trim()

  // 2. Load context
  const { projectContext, activeProject, projectTree } = await loadAppContext(activeProjectId)

  // 3. Get RAG context
  const { relevantStructureContext, memoryContext } = await getRAGContext(
    lastUserMessage,
    activeProject,
    projectTree,
    openaiClient
  )
  const prompt = AI_Prompt
  // 4. Build message list for initial API call
  const messagesForApi = buildApiMessages(
    receivedMessages,

    projectContext,
    relevantStructureContext,
    memoryContext
  )

  // 5. Make first API call (or handle errors)
  let responseMessage: OpenAI.Chat.Completions.ChatCompletionMessage | null = null
  try {
    responseMessage = await callOpenAICompletion(messagesForApi, availableTools, openaiClient) // Use imported availableTools
  } catch (error) {
    console.warn('error: ', error)
    return
  }

  // 6. Handle Tool Calls if necessary
  if (responseMessage?.tool_calls && responseMessage.tool_calls.length > 0) {
    const assistantMessageForHistory: ChatMessage = {
      role: 'assistant',
      content: responseMessage.content ?? null,
      tool_calls: responseMessage.tool_calls
    }
    // Start message list for second call: initial list + assistant request
    const messagesForSecondCall: ChatMessage[] = [...messagesForApi, assistantMessageForHistory]
    let reindexNeeded = false

    // Process tools sequentially
    for (const toolCall of responseMessage.tool_calls) {
      const toolResult = await executeSingleToolCall(
        toolCall,
        activeProject,
        appInstance,
        openaiClient
      )
      messagesForSecondCall.push({
        tool_call_id: toolCall.id,
        role: 'tool',
        content: toolResult.result
      })
      if (toolResult.needsReindex) {
        reindexNeeded = true
      }
    }

    // Trigger re-index if needed (runs in background)
    if (reindexNeeded && activeProject) {
      // Pass handleIndexProject explicitly to avoid circular dependency if moved
      triggerReindex(activeProject, mainWindow, appInstance, handleIndexProject)
    }

    // 7. Make Second API Call
    try {
      responseMessage = await callOpenAICompletionWithToolResults(
        messagesForSecondCall,
        openaiClient
      )
    } catch (error) {
      console.warn(error)
      return
    }
  } // End if tool_calls

  // 8. Send Final Response
  const finalContent = responseMessage?.content
  if (finalContent) {
    mainWindow?.webContents.send('ipc-receive-message', finalContent)
  } else {
    mainWindow?.webContents.send(
      'ipc-receive-message',
      'ERROR: Received empty response from OpenAI.'
    )
  }
} // End processUserMessage

// --- Keep the exported handlers called directly by index.ts ---

export async function setApiKey(
  apiKey: string,
  storeInstance: ElectronStoreType<AppStore>,
  reinitializeOpenAI: () => void // Needs the actual function from index.ts
): Promise<boolean> {
  // ... (Full implementation from response #65) ...
  console.log('setApiKey: Received API key.')
  try {
    if (!apiKey || typeof apiKey !== 'string') throw new Error('Invalid API key provided.')
    storeInstance.set('openaiApiKey', apiKey)
    console.log('setApiKey: OpenAI API Key saved to store.')
    reinitializeOpenAI() // Call the callback passed from index.ts
    return true
  } catch (error) {
    console.error('setApiKey: Failed to save API key:', error)
    return false
  }
}

export async function handleIndexProject(
  mainWindow: BrowserWindow | null,
  appInstance: Electron.App,
  projectRootPath?: string
): Promise<string> {
  // ... (Full implementation from response #75 - calls getDirectoryTreeObject, saves JSON) ...
  console.log(`IPC Handler: handleIndexProject invoked. Path provided: ${!!projectRootPath}`)
  let projectPath = projectRootPath
  let projectName = ''
  try {
    if (!projectPath) {
      if (!mainWindow) {
        throw new Error('Main window not available for dialog.')
      }
      const dialogResult = await dialog.showOpenDialog(mainWindow, {
        properties: ['openDirectory'],
        title: 'Select Project Folder'
      })
      if (dialogResult.canceled || !dialogResult.filePaths || dialogResult.filePaths.length === 0)
        return 'Folder selection cancelled.'
      projectPath = dialogResult.filePaths[0]
    }
    if (!projectPath) throw new Error('No project path determined.')
    projectName = basename(projectPath)
    console.log(`handleIndexProject: Processing folder: ${projectPath}`)
    if (!projectRootPath && mainWindow?.webContents) {
      mainWindow.webContents.send(
        'ipc-receive-message',
        `SYSTEM: Starting to index "${projectName}"...`
      )
    }
    const maxScanDepth = 5
    const treeObject: DirectoryTree = await getDirectoryTreeObject(projectPath, maxScanDepth) // Get OBJECT tree
    const structureJson = JSON.stringify(treeObject, null, 2)
    console.log(`handleIndexProject: Scan complete. JSON size: ${structureJson.length} chars.`)
    // ... (size warning) ...
    const db = await getDb()
    const insertSql = `INSERT INTO Projects (name, rootPath, lastIndexed, structureJson) VALUES (?, ?, datetime('now'), ?) ON CONFLICT(rootPath) DO UPDATE SET name=excluded.name, lastIndexed=excluded.lastIndexed, structureJson=excluded.structureJson;`
    await db.run(insertSql, projectName, projectPath, structureJson)
    console.log(`handleIndexProject: Successfully indexed and saved: ${projectName}`)
    // Check/Create AIContext.md
    const contextFilePath = join(projectPath, 'AIContext.md')
    try {
      await fs.stat(contextFilePath)
    } catch (error: any) {
      if (error.code === 'ENOENT') {
        const initialContent = `# AI Context for ${projectName}\n\n`
        await fs.writeFile(contextFilePath, initialContent, 'utf8')
      } else {
        console.error(`handleIndexProject: Error checking AIContext.md:`, error)
      }
    }
    return projectRootPath
      ? `Project re-indexed: ${projectName}`
      : `Successfully indexed project: ${projectName}`
  } catch (error: any) {
    console.error('handleIndexProject: Error during indexing:', error)
    return `Error indexing project: ${projectName || projectRootPath || 'Unknown'}. ${error.message || 'Unknown error'}`
  }
}

export async function handleGetProjects(): Promise<Project[]> {
  console.log('IPC Handler: handleGetProjects invoked.')
  return await loadIndexedProjects()
}
