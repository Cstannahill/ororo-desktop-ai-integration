import React from 'react'

interface ChatInputProps {
  inputValue: string
  isLoading: boolean
  handleInputChange: (event: React.ChangeEvent<HTMLInputElement>) => void
  handleSendMessage: () => void
  handleChatKeyPress: (event: React.KeyboardEvent<HTMLInputElement>) => void
}

export function ChatInput({
  inputValue,
  isLoading,
  handleInputChange,
  handleSendMessage,
  handleChatKeyPress
}: ChatInputProps): React.ReactElement {
  return (
    <div className="flex flex-shrink-0 rounded-b-lg border border-t-0 border-gray-700 bg-gray-800 p-2">
      <input
        type="text"
        value={inputValue}
        onChange={handleInputChange}
        onKeyPress={handleChatKeyPress}
        placeholder="Type your message..."
        // Updated styling
        className="flex-grow rounded-l-md border border-gray-600 bg-gray-700 px-4 py-2 text-white placeholder-gray-400 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500 disabled:opacity-60"
        disabled={isLoading}
      />
      <button
        onClick={handleSendMessage}
        // Updated styling
        className="rounded-r-md bg-cyan-600 px-5 py-2 font-semibold text-white transition-colors duration-200 ease-in-out hover:bg-cyan-700 focus:z-10 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-1 focus:ring-offset-gray-800 disabled:cursor-not-allowed disabled:opacity-60"
        disabled={isLoading}
      >
        {isLoading ? '...' : 'Send'}
      </button>
    </div>
  )
}
