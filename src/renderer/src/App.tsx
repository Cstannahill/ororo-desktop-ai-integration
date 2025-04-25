// src/renderer/src/App.tsx

import React, { useState, useEffect, useCallback } from 'react'
import './globals.css' // Keep for potential base styles or remove if unused
import { ChatMessage } from '../../main/types' // Adjust path as needed

// Import types (assuming they are moved to a shared location or defined here)
// If types.ts is in src/, adjust path: import type { Project, Message } from '../types';
interface Project {
  id: number
  name: string
  rootPath: string
  lastIndexed: string
}

// Import Components
import { ApiKeyForm } from './components/ApiKeyForm'
import { Sidebar } from './components/Sidebar'
import { MessageList } from './components/MessageList'
import { ChatInput } from './components/ChatInput'

// Keep trimMessages helper function...
const MAX_HISTORY_MESSAGES = 20
function trimMessages(messages: ChatMessage[]): ChatMessage[] {
  /* ... (same implementation) ... */
  if (messages.length <= MAX_HISTORY_MESSAGES) return messages
  const systemMessage = messages.find((msg) => msg.role === 'system')
  const recentMessages = messages.slice(-MAX_HISTORY_MESSAGES)
  if (systemMessage && !recentMessages.some((msg) => msg.role === 'system')) {
    return [systemMessage, ...recentMessages]
  } else if (systemMessage && recentMessages[0]?.role !== 'system') {
    return [systemMessage, ...recentMessages.filter((msg) => msg.role !== 'system')]
  } else {
    return recentMessages
  }
}

function App(): React.ReactElement {
  // --- State ---
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [inputValue, setInputValue] = useState<string>('')
  const [apiKeyInput, setApiKeyInput] = useState<string>('')
  const [isApiKeyNeeded, setIsApiKeyNeeded] = useState<boolean>(false) // Should be determined by IPC ideally
  const [apiKeyError, setApiKeyError] = useState<string>('')
  const [isLoading, setIsLoading] = useState<boolean>(false) // For AI responses/actions
  const [indexingStatus, setIndexingStatus] = useState<string>('')
  const [projects, setProjects] = useState<Project[]>([])
  const [activeProjectId, setActiveProjectId] = useState<number | null>(null) // Track selected project

  // --- Effects ---

  // Load projects on mount
  useEffect(() => {
    const loadProjects = async (): Promise<void> => {
      console.log('Renderer: Requesting project list...')
      setIsLoading(true) // Indicate loading activity
      try {
        const loadedProjects = await window.electronAPI?.getProjects()
        if (loadedProjects) {
          setProjects(loadedProjects)
          if (loadedProjects.length === 0) {
            setIndexingStatus('No projects indexed yet. Use the sidebar button.')
          } else {
            // Optionally select first project or keep null (General Chat)
            setActiveProjectId(null) // Default to General Chat
            // setActiveProjectId(loadedProjects[0].id); // Default to first project
          }
        } else {
          setIndexingStatus('Error: Could not fetch project list.')
        }
      } catch (error) {
        setIndexingStatus(`Error fetching projects: ${error}`)
      } finally {
        setIsLoading(false)
      }
    }
    loadProjects()
  }, [])

  // Listen for messages from Main process
  useEffect(() => {
    console.log('Renderer: Setting up message listener...')
    let isMounted = true
    const unsubscribe = window.electronAPI?.onReceiveMessage((messageContent) => {
      if (!isMounted) return
      console.log('Renderer: Received message:', messageContent)
      setIsLoading(false)
      let roleType: ChatMessage['role'] = 'assistant'

      if (messageContent.startsWith('ERROR: OpenAI API Key not set')) {
        setIsApiKeyNeeded(true)
        // Don't add this specific error to chat, handled by showing form
        return
      } else if (messageContent.startsWith('ERROR:')) {
        roleType = 'system'
        setIsApiKeyNeeded(false) // Assume key is okay if different error
      } else if (messageContent.startsWith('SYSTEM:')) {
        roleType = 'system'
        // Allow system status messages through
        messageContent = messageContent.substring(7).trim() // Remove prefix
      } else {
        setIsApiKeyNeeded(false)
        roleType = 'assistant'
      }
      // Add assistant/system messages
      setMessages((prevMessages) => [...prevMessages, { role: roleType, content: messageContent }])
    })

    if (!unsubscribe) {
      /* ... handle API unavailable ... */
    }

    return (): void => {
      isMounted = false
      if (unsubscribe) unsubscribe()
    }
  }, [])

  // --- Callbacks / Handlers ---

  const handleInputChange = useCallback((event: React.ChangeEvent<HTMLInputElement>): void => {
    setInputValue(event.target.value)
  }, [])

  const handleApiInputChange = useCallback((event: React.ChangeEvent<HTMLInputElement>): void => {
    setApiKeyInput(event.target.value)
    setApiKeyError('')
  }, [])

  const handleSaveApiKey = useCallback(async (): Promise<void> => {
    if (apiKeyInput.trim() === '') {
      setApiKeyError('API Key cannot be empty.')
      return
    }
    setApiKeyError('')
    setIsLoading(true)
    const success = await window.electronAPI?.setApiKey(apiKeyInput.trim())
    setIsLoading(false)
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
  }, [apiKeyInput])

  const handleApiKeyKeyPress = useCallback(
    (event: React.KeyboardEvent<HTMLInputElement>): void => {
      if (event.key === 'Enter' && !isLoading) {
        handleSaveApiKey()
      }
    },
    [isLoading, handleSaveApiKey]
  ) // Include isLoading and handler

  const handleSendMessage = useCallback((): void => {
    if (inputValue.trim() === '' || isLoading || isApiKeyNeeded) return
    const newUserMessage: ChatMessage = { role: 'user', content: inputValue.trim() }
    // Add System prompt if needed, or handle in main process more reliably
    const systemPrompt = {
      role: 'system',
      content:
        'You are an expert-level AI Software Developer and Architect... [rest of the detailed prompt text from above] ...Ask clarifying questions if a request is ambiguous.'
    } as ChatMessage
    const currentHistory = messages.filter((m) => m.role === 'user' || m.role === 'assistant') // Filter out system messages for history
    // Pass activeProjectId or related context here eventually
    const messagesToSend = trimMessages([systemPrompt, ...currentHistory, newUserMessage])

    setMessages((prevMessages) => [...prevMessages, newUserMessage]) // Optimistic UI update
    setIsLoading(true)
    setInputValue('')
    setIndexingStatus('') // Clear status on new message

    window.electronAPI?.sendMessage(messagesToSend, activeProjectId)
    console.log('Renderer: Sent messages history via IPC:', messagesToSend)
  }, [inputValue, messages, isLoading, isApiKeyNeeded, activeProjectId]) // Dependencies

  const handleChatKeyPress = useCallback(
    (event: React.KeyboardEvent<HTMLInputElement>): void => {
      if (event.key === 'Enter' && !isLoading) {
        handleSendMessage()
      }
    },
    [isLoading, handleSendMessage]
  ) // Include dependencies

  const handleIndexProject = useCallback(async (): Promise<void> => {
    console.log('Renderer: Index Project button clicked')
    setIndexingStatus('Starting indexing...')
    setIsLoading(true) // Use main loading state maybe?
    try {
      const result = await window.electronAPI?.indexProject()
      setIndexingStatus(result || 'Process finished.')
      if (result && !result.startsWith('Error') && result !== 'Folder selection cancelled.') {
        const updatedProjects = await window.electronAPI?.getProjects() // Refresh list
        if (updatedProjects) {
          setProjects(updatedProjects)
        }
      }
    } catch (error: any) {
      console.error('Renderer: Error during indexing IPC call:', error)
      setIndexingStatus(`Error indexing project: ${error.message || 'Unknown error'}`)
    } finally {
      setIsLoading(false) // Ensure loading state is reset
    }
  }, []) // Empty dependency array

  const handleSelectProject = useCallback(
    (projectId: number | null): void => {
      console.log(`Renderer: Setting active project ID to: ${projectId}`)
      setActiveProjectId(projectId)
      // Clear chat messages when switching projects
      // TODO: Load project-specific chat history later
      setMessages([])
      setIndexingStatus('') // Clear indexing status
      const selectedProject = projects.find((p) => p.id === projectId)
      // Add system message indicating context switch
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
  ) // Depends on projects list to find name

  // --- Render Logic ---

  // Show API Key form if needed
  if (isApiKeyNeeded) {
    return (
      <ApiKeyForm
        apiKeyInput={apiKeyInput}
        isLoading={isLoading}
        apiKeyError={apiKeyError}
        handleApiInputChange={handleApiInputChange}
        handleSaveApiKey={handleSaveApiKey}
        handleApiKeyKeyPress={handleApiKeyKeyPress}
      />
    )
  }

  // Main application layout
  return (
    <div className="flex h-screen bg-gray-900 text-gray-100">
      <Sidebar
        projects={projects}
        activeProjectId={activeProjectId}
        onSelectProject={handleSelectProject}
        onIndexProject={handleIndexProject}
      />
      <div className="flex flex-1 flex-col p-3">
        {' '}
        {/* Main content area */}
        <MessageList messages={messages} isLoading={isLoading} indexingStatus={indexingStatus} />
        <ChatInput
          inputValue={inputValue}
          isLoading={isLoading}
          handleInputChange={handleInputChange}
          handleSendMessage={handleSendMessage}
          handleChatKeyPress={handleChatKeyPress}
        />
      </div>
    </div>
  )
}

export default App
