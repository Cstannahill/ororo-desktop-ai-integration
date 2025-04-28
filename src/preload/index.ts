// src/preload/index.ts

import { contextBridge, ipcRenderer, IpcRendererEvent } from 'electron'
// Assuming ChatMessage is defined in a shared location now, or define locally
// Let's import from the main types file for consistency
import { type ChatMessage, type Project } from '../main/types'

// Define the FULL type for the exposed API, including indexProject
export interface ElectronAPI {
  sendMessage: (messages: ChatMessage[], activeProjectId: number | null) => void
  onReceiveMessage: (callback: (message: string) => void) => () => void
  setApiKey: (apiKey: string) => Promise<boolean>
  indexProject: () => Promise<string> // Signature for indexing
  getProjects: () => Promise<Project[]> // Signature for getting projects
  getPreference: (key: string) => Promise<string | null>
  getAllPreferences: () => Promise<Record<string, string>>
  setPreference: (key: string, value: string) => Promise<boolean>
}

// Define the channels consistently
const sendChannel = 'ipc-send-message'
const receiveChannel = 'ipc-receive-message'
const setApiKeyChannel = 'set-api-key'
const indexProjectChannel = 'index-project' // Channel for indexing handler
const getProjectsChannel = 'get-projects' // Channel for getting projects
const getPreferenceChannel = 'get-preference'
const getAllPreferencesChannel = 'get-all-preferences'
const setPreferenceChannel = 'set-preference'

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  sendMessage: (messages: ChatMessage[], activeProjectId: number | null): void => {
    ipcRenderer.send(sendChannel, { messages, activeProjectId })
  },
  onReceiveMessage: (callback: (message: string) => void): (() => void) => {
    const listener = (_event: IpcRendererEvent, message: string): void => callback(message)
    ipcRenderer.on(receiveChannel, listener)
    // Return an unsubscribe function to clean up the listener
    return (): void => {
      ipcRenderer.removeListener(receiveChannel, listener)
    }
  },
  setApiKey: async (apiKey: string): Promise<boolean> => {
    const success: boolean = await ipcRenderer.invoke(setApiKeyChannel, apiKey)
    return success
  },
  // Implementation for indexProject using invoke
  indexProject: async (): Promise<string> => {
    // Calls the 'index-project' handler registered in the main process
    const result: string = await ipcRenderer.invoke(indexProjectChannel)
    return result
  },
  getProjects: async (): Promise<Project[]> => {
    const projects: Project[] = await ipcRenderer.invoke(getProjectsChannel)
    return projects
  },
  // Preferences
  getPreference: async (key: string): Promise<string | null> => {
    return await ipcRenderer.invoke(getPreferenceChannel, key)
  },
  getAllPreferences: async (): Promise<Record<string, string>> => {
    return await ipcRenderer.invoke(getAllPreferencesChannel)
  },
  setPreference: async (key: string, value: string): Promise<boolean> => {
    return await ipcRenderer.invoke(setPreferenceChannel, key, value)
  }
} as ElectronAPI)

console.log('Preload Script: Finished executing and exposed electronAPI.')
