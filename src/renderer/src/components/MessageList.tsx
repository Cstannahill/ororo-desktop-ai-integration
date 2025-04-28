// src/renderer/src/components/MessageList.tsx

import React, { useRef, useEffect, useState, memo } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm' // For GitHub Flavored Markdown (tables, etc.)
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { atomDark } from 'react-syntax-highlighter/dist/esm/styles/prism' // Or choose another theme

// Assuming Message type is in types.ts or defined locally/imported correctly
import type { ChatMessage } from 'src/main/types'
// Assuming Icons are exported from Icons.tsx or import directly
import { Copy, Check } from './Icons'
import { Code } from 'lucide-react'

interface MessageListProps {
  messages: ChatMessage[]
  isLoading: boolean
  indexingStatus: string
}

// Tailwind classes based on role for styling bubbles and alignment
const roleClasses = {
  user: 'bg-cyan-800 self-end rounded-br-none',
  assistant: 'bg-gray-700 self-start rounded-bl-none',
  system: 'bg-red-900 bg-opacity-70 self-center text-xs italic mx-auto px-3 py-1 rounded-md',
  status: 'bg-gray-600 self-center text-xs italic my-1 px-3 py-1 rounded-md'
}

const wrapperAlign = {
  user: 'items-end',
  assistant: 'items-start',
  system: 'items-center',
  status: 'items-center'
}

// --- CodeBlock Component for Syntax Highlighting ---
// Using React.memo for performance optimization
const CodeBlock = memo(({ node, inline, className, children, ...props }: any) => {
  const match = /language-(\w+)/.exec(className || '')
  const codeContent = String(children).replace(/\n$/, '') // Trim trailing newline

  // TODO: Add Mermaid rendering logic here later if desired, checking for language-mermaid

  return !inline && match ? (
    // Code Block with Syntax Highlighting
    <div className="relative my-2 rounded bg-gray-900 ring-1 ring-white/10">
      {/* Language Tag */}
      <span className="absolute top-1 right-8 rounded-sm bg-gray-600 px-1.5 py-0.5 text-xs font-sans text-gray-300">
        {match[1]}
      </span>
      {/* Syntax Highlighter Component */}
      <SyntaxHighlighter
        style={atomDark} // Apply the imported theme
        language={match[1]}
        PreTag="div" // Use div for flexibility, prevents <pre><code> structure if not needed
        className="code-block !bg-transparent p-3 text-sm overflow-x-auto" // Apply custom padding etc. '!bg-transparent' overrides default style bg
        {...props}
      >
        {codeContent}
      </SyntaxHighlighter>
      {/* Simple Copy Button for Code Blocks */}
      <button
        onClick={() => navigator.clipboard.writeText(codeContent)}
        title="Copy code snippet"
        className="absolute top-1 right-1 z-10 rounded bg-gray-600 p-1 text-gray-300 opacity-50 transition-opacity hover:bg-gray-500 hover:text-white hover:opacity-100 focus:opacity-100 focus:outline-none"
      >
        <Copy />
      </button>
    </div>
  ) : (
    // Inline Code
    <code
      className={`inline-code rounded bg-gray-700 px-1 py-0.5 text-sm font-mono ${className || ''}`}
      {...props}
    >
      {children}
    </code>
  )
})
CodeBlock.displayName = 'CodeBlock' // Set display name for better debugging
// --- End CodeBlock Component ---

export function MessageList({
  messages,
  isLoading,
  indexingStatus
}: MessageListProps): React.ReactElement {
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null) // Track which message bubble was copied

  // Auto-scroll effect
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isLoading, indexingStatus]) // Trigger scroll on new messages or status changes

  // Handler for copying message bubble text
  const handleCopy = (text: string | null, index: number): void => {
    if (text) {
      navigator.clipboard
        .writeText(text)
        .then(() => {
          console.log('Message text copied to clipboard')
          setCopiedIndex(index) // Show feedback
          setTimeout(() => setCopiedIndex(null), 1500) // Hide feedback after 1.5s
        })
        .catch((err) => console.error('Failed to copy message text: ', err))
    }
  }

  return (
    // Main message container - Use Tailwind classes
    <div className="flex-grow overflow-y-auto rounded-t-lg border border-b-0 border-gray-700 bg-gray-800 p-4 mb-0">
      {/* Flex column for messages */}
      <div className="flex flex-col space-y-2">
        {/* Map through messages */}
        {messages.map((msg, index) => (
          // Group message bubble and align based on role
          <div
            key={`msg-group-${index}`}
            className={`flex w-full flex-col ${wrapperAlign[msg.role]}`}
          >
            {/* --- Render SYSTEM/STATUS messages (simple text) --- */}
            {(msg.role === 'system' || msg.role === 'status') && ( // 'status' role could be used for indexing status
              <div
                className={`inline-block max-w-[90%] rounded-lg px-3 py-1 text-white ${roleClasses[msg.role]}`}
              >
                {/* Render system/status content directly for now */}
                {msg.content}
              </div>
            )}
            {/* --- End SYSTEM/STATUS rendering --- */}

            {/* --- Render USER/ASSISTANT messages (with Markdown) --- */}
            {(msg.role === 'user' || msg.role === 'assistant') && (
              <div
                className={`relative group max-w-[85%] rounded-lg px-3 py-2 prose prose-invert prose-sm max-w-none prose-p:my-1 prose-ul:my-1 prose-li:my-0 prose-pre:my-1 prose-pre:p-0 prose-pre:bg-transparent prose-code:px-1 prose-code:py-0.5 prose-code:bg-gray-700 prose-code:rounded prose-code:text-sm text-white ${roleClasses[msg.role]}`}
              >
                {/* Render message content using ReactMarkdown */}
                <ReactMarkdown
                  // Apply Tailwind Typography prose styles for default markdown look
                  // prose-invert for dark mode, prose-sm for size
                  // Add overrides for tighter chat spacing, code block appearance
                  remarkPlugins={[remarkGfm]} // Enable GitHub Flavored Markdown
                  components={{
                    // Use custom component for code blocks to enable syntax highlighting
                    code: CodeBlock
                    // Optionally override other elements:
                    // a: ({node, ...props}) => <a className="text-cyan-400 hover:text-cyan-300" {...props} />,
                    // ul: ({node, ...props}) => <ul className="list-disc list-inside" {...props} />,
                    // ol: ({node, ...props}) => <ol className="list-decimal list-inside" {...props} />,
                  }}
                >
                  {msg.content || ''}
                </ReactMarkdown>
                {/* End Markdown Rendering */}

                {/* Copy Button - shows on hover for assistant messages */}
                {msg.role === 'assistant' && msg.content && (
                  <button
                    onClick={() => handleCopy(msg.content, index)}
                    title="Copy message"
                    className="absolute -top-2 -right-2 z-10 rounded bg-gray-600 p-1 text-gray-300 opacity-0 transition-opacity duration-150 group-hover:opacity-100 focus:opacity-100 focus:outline-none hover:bg-gray-500 hover:text-white" // Position adjusted slightly
                  >
                    {copiedIndex === index ? <Check size={16} /> : <Copy size={16} />}
                  </button>
                )}
              </div>
            )}
            {/* --- End USER/ASSISTANT rendering --- */}
          </div>
        ))}

        {/* --- Loading Indicator --- */}
        {isLoading && (
          <div className={`flex w-full flex-col ${wrapperAlign.assistant}`}>
            <div
              className={`inline-block max-w-[75%] animate-pulse rounded-lg px-3 py-2 text-white ${roleClasses.assistant} opacity-80`}
            >
              <i>AI is thinking...</i>
            </div>
          </div>
        )}
        {/* --- End Loading Indicator --- */}

        {/* --- Indexing Status (if not empty and not part of main messages) --- */}
        {indexingStatus && !messages.some((m) => m.content?.includes(indexingStatus)) && (
          <div className={`flex w-full flex-col ${wrapperAlign.status}`}>
            <div className={`inline-block rounded px-3 py-1 text-white ${roleClasses.status}`}>
              <i>{indexingStatus}</i>
            </div>
          </div>
        )}
        {/* --- End Indexing Status --- */}

        {/* Scroll target */}
        <div ref={messagesEndRef} />
      </div>{' '}
      {/* End Message Container */}
    </div> // End Main Container
  )
}
