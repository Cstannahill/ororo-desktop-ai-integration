import React, { useRef, useEffect } from 'react'
import type { ChatMessage } from '../../../main/types'

interface MessageListProps {
  messages: ChatMessage[]
  isLoading: boolean
  indexingStatus: string
}

// Mapping roles to Tailwind classes
const roleClasses = {
  user: 'bg-brand-chatuserbubble text-brand-chatusertext self-end', // Messages align right
  assistant: 'bg-brand-chataibubble text-brand-chataitext self-start', // Messages align left
  system: 'bg-red-900 bg-opacity-80 self-start text-xs italic', // System messages distinct
  status: 'bg-gray-600 self-center text-xs italic my-2' // Status messages centered
}

const wrapperAlign = {
  user: 'text-right',
  assistant: 'text-left',
  system: 'text-left',
  status: 'text-center'
}

export function MessageList({
  messages,
  isLoading,
  indexingStatus
}: MessageListProps): React.ReactElement {
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Auto-scroll effect
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isLoading, indexingStatus]) // Trigger scroll on new messages or status changes

  return (
    <div className="flex-grow overflow-y-auto message-container-bg   bg-[#292a2c] rounded border border-gray-700 p-4 mb-3">
      <div className="flex flex-col space-y-3">
        {messages.map(
          (msg, index) =>
            // Render user/assistant messages, filter out specific system messages handled elsewhere
            (msg.role === 'user' || msg.role === 'assistant') && (
              <div
                key={`msg-${index}`}
                className={`flex w-full flex-col ${wrapperAlign[msg.role]}`}
              >
                <div
                  className={`inline-block max-w-[75%] rounded-lg px-3 py-2  ${roleClasses[msg.role]}`}
                >
                  {/* TODO: Add markdown rendering here later */}
                  <span className="whitespace-pre-wrap">{msg.content}</span>
                  {/* TODO: Add copy button here later */}
                </div>
              </div>
            )
        )}

        {/* Display loading indicator */}
        {isLoading && (
          <div className={`flex w-full flex-col ${wrapperAlign.assistant}`}>
            <div
              className={`inline-block max-w-[75%] animate-pulse rounded-lg px-3 py-2 text-white ${roleClasses.assistant} opacity-80`}
            >
              <i>AI is thinking...</i>
            </div>
          </div>
        )}

        {/* Display indexing status (if not empty and not already in messages) */}
        {indexingStatus && !messages.some((m) => m.content?.includes(indexingStatus)) && (
          <div className={`flex w-full flex-col ${wrapperAlign.status}`}>
            <div
              className={`inline-block rounded px-3 py-1 text-brand-chataitext ${roleClasses.status}`}
            >
              <i>{indexingStatus}</i>
            </div>
          </div>
        )}

        {/* Dummy div for auto-scrolling */}
        <div ref={messagesEndRef} />
      </div>
    </div>
  )
}
