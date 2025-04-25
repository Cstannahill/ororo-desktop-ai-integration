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
    <div className="flex flex-shrink-0 p-1">
      <input
        type="text"
        value={inputValue}
        onChange={handleInputChange}
        onKeyPress={handleChatKeyPress}
        placeholder="Type your message..."
        className="flex-grow rounded-l border border-gray-600 bg-brand-chataibubble px-3 py-2 text-cyan-400 placeholder-gray-400 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500 disabled:opacity-50"
        disabled={isLoading}
      />
      <button
        onClick={handleSendMessage}
        className="rounded-r bg-cyan-600 px-4 py-2 font-bold text-white transition-colors duration-200 ease-in-out hover:bg-cyan-700 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2 focus:ring-offset-gray-900 disabled:cursor-not-allowed disabled:opacity-50"
        disabled={isLoading}
      >
        {isLoading ? '...' : 'Send'} {/* Simplified loading text */}
      </button>
    </div>
  )
}
