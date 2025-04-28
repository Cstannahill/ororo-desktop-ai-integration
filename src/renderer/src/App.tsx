// src/renderer/src/App.tsx

import React, { useState, useEffect, useCallback, useRef } from 'react'
import './globals.css' // Ensure Tailwind directives are imported via index.css/globals.css

// Import types (Define locally or ensure correct path from main/types.ts)
interface Project {
  id: number
  name: string
  rootPath: string
  lastIndexed: string
}
interface Message {
  role: 'user' | 'assistant' | 'system'
  content: string | null
  // Ensure this matches the type definition if it includes tool_calls
  tool_calls?: any[] // Optional based on your ChatMessage definition
}

// Import Components
import { ApiKeyForm } from './components/ApiKeyForm'
import { Sidebar } from './components/Sidebar'
import { MessageList } from './components/MessageList'
import { ChatInput } from './components/ChatInput'
import { SettingsModal } from './components/SettingsModal'

// Helper function to trim history
const MAX_HISTORY_MESSAGES = 100 // Increased limit
function trimMessages(messages: Message[]): Message[] {
  if (messages.length <= MAX_HISTORY_MESSAGES) return messages
  // Keep system prompt + latest messages, ensuring not to exceed limit including system prompt
  const systemMessage = messages.find((msg) => msg.role === 'system')
  const nonSystemMessages = messages.filter((msg) => msg.role !== 'system')
  const messagesToKeepCount = MAX_HISTORY_MESSAGES - (systemMessage ? 1 : 0)
  const recentMessages = nonSystemMessages.slice(-messagesToKeepCount)
  return systemMessage ? [systemMessage, ...recentMessages] : recentMessages
}

function App(): React.ReactElement {
  // --- State Variables ---
  const [messages, setMessages] = useState<Message[]>([])
  const [inputValue, setInputValue] = useState<string>('')
  const [apiKeyInput, setApiKeyInput] = useState<string>('')
  const [isApiKeyNeeded, setIsApiKeyNeeded] = useState<boolean>(false)
  const [apiKeyError, setApiKeyError] = useState<string>('')
  const [isLoading, setIsLoading] = useState<boolean>(false) // For AI response loading
  const [isProcessing, setIsProcessing] = useState<boolean>(false) // Separate state for other async actions like saving key/prefs
  const [indexingStatus, setIndexingStatus] = useState<string>('')
  const [projects, setProjects] = useState<Project[]>([])
  const [activeProjectId, setActiveProjectId] = useState<number | null>(null)
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false)

  // --- Effect Hooks ---

  // Load initial data (projects) on mount
  useEffect(() => {
    const loadData = async (): Promise<void> => {
      console.log('Renderer: Initial data load...')
      setIsProcessing(true) // Use general processing indicator
      try {
        const loadedProjects = await window.electronAPI?.getProjects()
        if (loadedProjects) {
          setProjects(loadedProjects)
          if (loadedProjects.length === 0) {
            setIndexingStatus('No projects indexed yet.')
          } else {
            setActiveProjectId(null)
          } // Default to General Chat
        } else {
          setIndexingStatus('Error: Could not fetch project list.')
        }
      } catch (error) {
        setIndexingStatus(`Error fetching projects: ${error}`)
      } finally {
        setIsProcessing(false)
      }
    }
    loadData()
  }, []) // Run once on mount

  // Listen for messages from Main process
  useEffect(() => {
    console.log('Renderer: Setting up message listener...')
    let isMounted = true
    const unsubscribe = window.electronAPI?.onReceiveMessage((messageContent) => {
      if (!isMounted) return
      console.log('Renderer: Received message:', messageContent)
      setIsLoading(false) // Stop AI thinking indicator specifically
      let roleType: Message['role'] = 'assistant'
      let displayMessage = messageContent // Keep original for checks

      if (messageContent.startsWith('ERROR: OpenAI API Key not set')) {
        setIsApiKeyNeeded(true)
        return // Show form, stop processing this message
      } else if (messageContent.startsWith('ERROR:')) {
        roleType = 'system'
        setIsApiKeyNeeded(false)
      } else if (messageContent.startsWith('SYSTEM:')) {
        roleType = 'system'
        displayMessage = messageContent.substring(7).trim()
      } else {
        setIsApiKeyNeeded(false)
        roleType = 'assistant'
      }

      // Add assistant/system messages
      setMessages((prev) => [...prev, { role: roleType, content: displayMessage }])
    })
    if (!unsubscribe) {
      /* ... handle API unavailable ... */
    }
    return (): void => {
      isMounted = false
      if (unsubscribe) unsubscribe()
    }
  }, [])

  // --- Callback Handlers (with full implementations) ---

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => setInputValue(e.target.value),
    []
  )
  const handleApiInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setApiKeyInput(e.target.value)
    setApiKeyError('')
  }, [])

  const handleSaveApiKey = useCallback(async (keyToSave: string): Promise<boolean> => {
    if (keyToSave.trim() === '') {
      setApiKeyError('API Key cannot be empty.')
      return false
    }
    setApiKeyError('')
    setIsProcessing(true) // Use general processing state
    let success = false
    try {
      success = await window.electronAPI?.setApiKey(keyToSave.trim())
      if (success) {
        setIsApiKeyNeeded(false)
        setApiKeyInput('')
        setMessages((prev) => [
          ...prev,
          { role: 'system', content: 'API Key saved. Try sending a message.' }
        ])
      } else {
        setApiKeyError('Failed to save API Key.')
      }
    } catch (error: any) {
      setApiKeyError(`Error saving API key: ${error.message}`)
    } finally {
      setIsProcessing(false)
    }
    return success
  }, []) // Removed apiKeyInput dependency as key is passed directly

  const handleApiKeyKeyPress = useCallback(
    (event: React.KeyboardEvent<HTMLInputElement>): void => {
      if (event.key === 'Enter' && !isProcessing) {
        handleSaveApiKey(apiKeyInput)
      } // Use isProcessing
    },
    [isProcessing, handleSaveApiKey, apiKeyInput]
  ) // Include all dependencies

  const handleSendMessage = useCallback((): void => {
    if (inputValue.trim() === '' || isLoading || isApiKeyNeeded) return // Check AI loading state
    const newUserMessage: Message = { role: 'user', content: inputValue.trim() }
    // Base history only needs user/assistant for context window management
    const currentHistory = messages.filter((m) => m.role === 'user' || m.role === 'assistant')
    // Main process now handles adding system prompt + RAG context
    const messagesToSend = trimMessages([...currentHistory, newUserMessage])

    setMessages((prevMessages) => [...prevMessages, newUserMessage]) // Optimistic UI update
    setIsLoading(true)
    setInputValue('')
    setIndexingStatus('') // Start AI loading state

    window.electronAPI?.sendMessage(messagesToSend, activeProjectId) // Send history + active project ID
    console.log(
      `Renderer: Sent messages via IPC. Active Project ID: ${activeProjectId}`,
      messagesToSend
    )
  }, [inputValue, messages, isLoading, isApiKeyNeeded, activeProjectId]) // Add all dependencies

  const handleChatKeyPress = useCallback(
    (event: React.KeyboardEvent<HTMLInputElement>): void => {
      if (event.key === 'Enter' && !isLoading) {
        handleSendMessage()
      } // Check AI loading state
    },
    [isLoading, handleSendMessage]
  ) // Include dependencies

  const handleIndexProject = useCallback(async (): Promise<void> => {
    console.log('Renderer: Index Project button clicked')
    setIndexingStatus('Starting indexing process...')
    setIsProcessing(true) // Use general processing state
    setMessages((prev) => [
      ...prev,
      { role: 'system', content: 'Attempting to index project folder...' }
    ])
    try {
      const result = await window.electronAPI?.indexProject()
      setIndexingStatus(result || 'Process finished.') // Update status
      setMessages((prev) => [
        ...prev,
        { role: 'system', content: result || 'Indexing process finished.' }
      ])
      // Refresh project list on success
      if (result && !result.startsWith('Error') && result !== 'Folder selection cancelled.') {
        const updatedProjects = await window.electronAPI?.getProjects()
        if (updatedProjects) {
          setProjects(updatedProjects)
        }
        // Optional: Automatically select the newly indexed project?
      }
    } catch (error: any) {
      console.error('Renderer: Error during indexing IPC call:', error)
      const errorMsg = `Error indexing project: ${error.message || 'Unknown error'}`
      setIndexingStatus(errorMsg)
      setMessages((prev) => [...prev, { role: 'system', content: errorMsg }])
    } finally {
      setIsProcessing(false) // Reset processing state
    }
  }, []) // Empty dependency array

  const handleSelectProject = useCallback(
    (projectId: number | null): void => {
      console.log(`Renderer: Setting active project ID to: ${projectId}`)
      setActiveProjectId(projectId)
      setMessages([]) // Clear chat messages
      setIndexingStatus('')
      const selectedProject = projects.find((p) => p.id === projectId)
      if (selectedProject) {
        setMessages([
          { role: 'system', content: `Switched context to project: ${selectedProject.name}` }
        ])
      } else {
        setMessages([
          { role: 'system', content: `Switched to general context (no project selected).` }
        ])
      }
    },
    [projects]
  ) // Depends on projects list

  const handleSavePreference = useCallback(async (key: string, value: string): Promise<boolean> => {
    if (!key) return false
    console.log(`Renderer: Setting preference ${key}=${value}`)
    setIsProcessing(true) // Use general processing state
    let success = false
    try {
      success = await window.electronAPI?.setPreference(key, value)
      if (!success) {
        alert(`Failed to save preference: ${key}`)
      }
    } catch (error: any) {
      console.error(`Renderer: Failed to set preference ${key}:`, error)
      alert(`Error saving preference: ${error.message}`)
    } finally {
      setIsLoading(false)
    } // Reset processing state
    return success ?? false
  }, [])

  // --- Render Logic ---

  // Show API Key form if needed
  if (isApiKeyNeeded) {
    return (
      <ApiKeyForm
        apiKeyInput={apiKeyInput}
        isLoading={isProcessing} // Use general processing state for modal buttons
        apiKeyError={apiKeyError}
        handleApiInputChange={handleApiInputChange}
        handleSaveApiKey={() => handleSaveApiKey(apiKeyInput)}
        handleApiKeyKeyPress={handleApiKeyKeyPress}
      />
    )
  }

  // Main application layout
  return (
    <div className="flex h-screen bg-gray-900 text-gray-100 font-sans">
      <Sidebar
        projects={projects}
        activeProjectId={activeProjectId}
        onSelectProject={handleSelectProject}
        onIndexProject={handleIndexProject}
        onOpenSettings={() => setIsSettingsOpen(true)} // Open modal
      />
      {/* Main Content Area */}
      <div className="flex flex-1 flex-col p-3 pt-4 overflow-hidden">
        <MessageList
          messages={messages}
          isLoading={isLoading} // Pass AI loading state
          indexingStatus={indexingStatus} // Pass indexing status
        />
        <ChatInput
          inputValue={inputValue}
          isLoading={isLoading} // Pass AI loading state
          handleInputChange={handleInputChange}
          handleSendMessage={handleSendMessage}
          handleChatKeyPress={handleChatKeyPress}
        />
      </div>
      {/* Settings Modal (Rendered conditionally) */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        getAllPrefs={() => window.electronAPI.getAllPreferences()}
        setPref={handleSavePreference}
        // Pass function to get key *value* from state if already loaded, or fetch

        // Correction: getApiKey needs to use IPC
        getApiKey={() => window.electronAPI.getPreference('openaiApiKey')}
        // Pass the save API key handler
        setApiKey={handleSaveApiKey} // Pass the specific handler
      />
    </div>
  )
}

export default App
