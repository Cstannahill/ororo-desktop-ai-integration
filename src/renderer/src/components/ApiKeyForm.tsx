import React from 'react'

interface ApiKeyFormProps {
  apiKeyInput: string
  isLoading: boolean
  apiKeyError: string
  handleApiInputChange: (event: React.ChangeEvent<HTMLInputElement>) => void
  handleSaveApiKey: () => Promise<void>
  handleApiKeyKeyPress: (event: React.KeyboardEvent<HTMLInputElement>) => void
}

export function ApiKeyForm({
  apiKeyInput,
  isLoading,
  apiKeyError,
  handleApiInputChange,
  handleSaveApiKey,
  handleApiKeyKeyPress
}: ApiKeyFormProps): React.ReactElement {
  return (
    // Centering container - Takes full viewport height
    <div className="flex h-screen w-full items-center justify-center bg-gray-900 text-gray-100">
      {/* Form Card */}
      <div className="w-full max-w-md rounded-lg border border-gray-700 bg-gray-800 p-6 shadow-lg">
        <h3 className="mb-4 text-center text-xl font-semibold text-white">
          OpenAI API Key Required
        </h3>
        <p className="mb-5 text-center text-sm text-gray-400">
          Please enter your OpenAI API key. It is stored securely on your local machine.
        </p>
        <input
          type="password"
          value={apiKeyInput}
          onChange={handleApiInputChange}
          onKeyPress={handleApiKeyKeyPress}
          placeholder="Enter your OpenAI API Key (sk-...)"
          className="mb-4 block w-full rounded border border-gray-600 bg-gray-700 px-3 py-2 text-white placeholder-gray-500 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
          disabled={isLoading}
        />
        <button
          onClick={handleSaveApiKey}
          className="w-full rounded bg-cyan-600 px-4 py-2 font-bold text-white transition-colors duration-200 ease-in-out hover:bg-cyan-700 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2 focus:ring-offset-gray-800 disabled:cursor-not-allowed disabled:opacity-50"
          disabled={isLoading}
        >
          {isLoading ? 'Saving...' : 'Save API Key'}
        </button>
        {apiKeyError && <p className="mt-4 text-center text-sm text-red-500">{apiKeyError}</p>}
      </div>
    </div>
  )
}
