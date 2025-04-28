// src/renderer/src/components/SettingsModal.tsx
import React, { useState, useEffect, useCallback } from 'react'

interface SettingsModalProps {
  isOpen: boolean
  onClose: () => void
  // Pass functions to interact with main process
  getAllPrefs: () => Promise<Record<string, string>>
  setPref: (key: string, value: string) => Promise<boolean>
  getApiKey: () => Promise<string | null> // Assuming getPreference can get the key
  setApiKey: (key: string) => Promise<boolean>
}

export function SettingsModal({
  isOpen,
  onClose,
  getAllPrefs,
  setPref,
  getApiKey,
  setApiKey
}: SettingsModalProps): React.ReactElement | null {
  const [prefs, setPrefs] = useState<Record<string, string>>({})
  const [apiKey, setApiKeyState] = useState<string>('') // Use local state for editing API key
  const [newPrefKey, setNewPrefKey] = useState<string>('')
  const [newPrefValue, setNewPrefValue] = useState<string>('')
  const [isLoading, setIsLoading] = useState<boolean>(false)
  const [error, setError] = useState<string>('')
  const [apiKeyVisible, setApiKeyVisible] = useState<boolean>(false)

  const loadData = useCallback(async () => {
    setIsLoading(true)
    setError('')
    try {
      const loadedPrefs = await getAllPrefs()
      setPrefs(loadedPrefs)
      const loadedApiKey = await getApiKey() // Use getPreference('openaiApiKey')
      setApiKeyState(loadedApiKey || '')
    } catch (err: any) {
      setError(`Failed to load settings: ${err.message}`)
    } finally {
      setIsLoading(false)
    }
  }, [getAllPrefs, getApiKey])

  // Load prefs when modal opens
  useEffect(() => {
    if (isOpen) {
      loadData()
      setNewPrefKey('') // Reset add form
      setNewPrefValue('')
    }
  }, [isOpen, loadData])

  const handleSaveApiKey = async (): Promise<void> => {
    if (!apiKey.trim()) {
      setError('API Key cannot be empty.')
      return
    }
    setIsLoading(true)
    setError('')
    try {
      const success = await setApiKey(apiKey.trim())
      if (!success) throw new Error('Failed to save API key (check main logs).')
      alert('API Key updated successfully!') // Simple feedback for now
    } catch (err: any) {
      setError(`Error saving API Key: ${err.message}`)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSetPreference = async (key: string, value: string): Promise<void> => {
    if (!key.trim()) {
      setError('Preference key cannot be empty.')
      return
    }
    setIsLoading(true)
    setError('')
    try {
      const success = await setPref(key.trim(), value.trim())
      if (!success) throw new Error('Failed to save preference (check main logs).')
      // Refresh prefs after saving
      const loadedPrefs = await getAllPrefs()
      setPrefs(loadedPrefs)
      // Clear add form if this was an add action
      if (key === newPrefKey) {
        setNewPrefKey('')
        setNewPrefValue('')
      }
    } catch (err: any) {
      setError(`Error saving preference '${key}': ${err.message}`)
    } finally {
      setIsLoading(false)
    }
  }

  const handleAddPreference = (): void => {
    handleSetPreference(newPrefKey, newPrefValue)
  }

  if (!isOpen) {
    return null
  }

  return (
    // Modal Backdrop & Centering
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60 backdrop-blur-sm">
      {/* Modal Content */}
      <div className="relative w-full max-w-lg rounded-lg bg-gray-800 p-6 shadow-xl border border-gray-700 max-h-[80vh] flex flex-col">
        <h2 className="mb-4 text-xl font-semibold text-white">Settings</h2>

        {/* Scrollable Content Area */}
        <div className="overflow-y-auto pr-2 flex-grow">
          {/* API Key Section */}
          <div className="mb-6">
            <label htmlFor="apiKey" className="block text-sm font-medium text-gray-300 mb-1">
              OpenAI API Key
            </label>
            <div className="flex items-center space-x-2">
              <input
                id="apiKey"
                type={apiKeyVisible ? 'text' : 'password'}
                value={apiKey}
                onChange={(e) => setApiKeyState(e.target.value)}
                placeholder="sk-..."
                className="flex-grow rounded border border-gray-600 bg-gray-700 px-3 py-2 text-white focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500 disabled:opacity-50"
                disabled={isLoading}
              />
              <button
                onClick={() => setApiKeyVisible(!apiKeyVisible)}
                className="p-2 text-gray-400 hover:text-white focus:outline-none"
                title={apiKeyVisible ? 'Hide Key' : 'Show Key'}
                type="button"
              >
                {/* Basic SVG for eye icon (replace with better icon later) */}
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  {apiKeyVisible ? (
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"
                    />
                  ) : (
                    <>
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                      />
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                      />
                    </>
                  )}
                </svg>
              </button>
              <button
                onClick={handleSaveApiKey}
                className="rounded bg-cyan-600 px-3 py-2 text-sm font-bold text-white hover:bg-cyan-700 focus:outline-none focus:ring-2 focus:ring-cyan-500 disabled:opacity-50"
                disabled={isLoading}
              >
                Save
              </button>
            </div>
          </div>

          {/* Preferences Section */}
          <div className="mb-4">
            <h4 className="mb-2 text-md font-semibold text-gray-200">User Preferences</h4>
            {Object.entries(prefs).length > 0 ? (
              <ul className="space-y-2">
                {Object.entries(prefs).map(([key, value]) => (
                  <li key={key} className="flex items-center justify-between space-x-2">
                    <span className="text-sm font-medium text-gray-300">{key}:</span>
                    <input
                      type="text"
                      value={value}
                      onChange={(e) => setPrefs({ ...prefs, [key]: e.target.value })} // Allow editing existing
                      onBlur={(e) => handleSetPreference(key, e.target.value)} // Save on blur
                      className="flex-grow rounded border border-gray-600 bg-gray-700 px-2 py-1 text-sm text-white focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                      disabled={isLoading}
                    />
                    {/* Add delete button later */}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-gray-500">No preferences set yet.</p>
            )}
          </div>

          {/* Add New Preference Section */}
          <div className="mt-4 border-t border-gray-700 pt-4">
            <h4 className="mb-2 text-md font-semibold text-gray-200">Add New Preference</h4>
            <div className="flex flex-col space-y-2 sm:flex-row sm:space-y-0 sm:space-x-2">
              <input
                type="text"
                placeholder="Preference Key (e.g., language)"
                value={newPrefKey}
                onChange={(e) => setNewPrefKey(e.target.value)}
                className="flex-grow rounded border border-gray-600 bg-gray-700 px-3 py-2 text-sm text-white placeholder-gray-500 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                disabled={isLoading}
              />
              <input
                type="text"
                placeholder="Preference Value (e.g., TypeScript)"
                value={newPrefValue}
                onChange={(e) => setNewPrefValue(e.target.value)}
                className="flex-grow rounded border border-gray-600 bg-gray-700 px-3 py-2 text-sm text-white placeholder-gray-500 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                disabled={isLoading}
              />
              <button
                onClick={handleAddPreference}
                className="rounded bg-cyan-600 px-3 py-2 text-sm font-bold text-white hover:bg-cyan-700 focus:outline-none focus:ring-2 focus:ring-cyan-500 disabled:opacity-50"
                disabled={isLoading || !newPrefKey.trim()}
              >
                Add
              </button>
            </div>
          </div>
        </div>

        {/* Footer - Error & Close Button */}
        <div className="mt-6 flex flex-col sm:flex-row justify-between items-center border-t border-gray-700 pt-4">
          <div className="text-sm text-red-500 mb-2 sm:mb-0 text-center sm:text-left">
            {error && <span>Error: {error}</span>}
          </div>
          <button
            onClick={onClose}
            className="rounded bg-gray-600 px-4 py-2 text-sm font-medium text-white transition-colors duration-150 ease-in-out hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500"
            disabled={isLoading}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
