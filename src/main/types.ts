// src/main/types.ts
import type OpenAI from 'openai' // Import OpenAI namespace for nested types

// For electron-store schema
export interface AppStore {
  openaiApiKey?: string
  [key: string]: unknown
}

// For chat messages passed via IPC and used internally before API call
export interface ChatMessage {
  role: 'user' | 'assistant' | 'system' | 'tool'
  content: string | null
  // Optional fields needed for specific roles
  tool_call_id?: string // Present for role: 'tool'
  tool_calls?: OpenAI.Chat.Completions.ChatCompletionMessageToolCall[] // Present for role: 'assistant' when requesting tools
}

// For indexed projects list
export interface Project {
  id: number
  name: string
  rootPath: string
  lastIndexed: string
}

// Structure for representing the directory tree object (stored as JSON)
export interface DirectoryTree {
  name: string
  type: 'file' | 'directory' | 'error'
  children?: DirectoryTree[]
  error?: string
}

// Type for the object returned by context loading
export interface AppContextData {
  projectContext: string
  activeProject: (Project & { rootPath?: string }) | null
  projectTree: DirectoryTree | null
}

// Type for the object returned by RAG processing
export interface RagContextResult {
  relevantStructureContext: string
  memoryContext: string
}

// Type for the result of executing a tool
export interface ToolExecutionResult {
  result: string
  needsReindex: boolean
}
