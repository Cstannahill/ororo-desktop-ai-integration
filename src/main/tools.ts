// src/main/tools.ts
import OpenAI from 'openai'

// --- Tool Definitions ---

export const listDirectoryTool: OpenAI.Chat.Completions.ChatCompletionTool = {
  type: 'function',
  function: {
    name: 'list_directory',
    description:
      "Lists files/subdirs within a specified path. If a project context is active, path is relative to project root. Otherwise, relative to home. Forbids absolute paths or '..'.",
    parameters: {
      type: 'object',
      properties: {
        path: {
          type: 'string',
          description:
            'The path relative to the active project root (e.g., "src") or user\'s home directory if no project is active. Use forward slashes `/`.'
        }
      },
      required: ['path']
    }
  }
}

export const listDirectoryRecursiveTool: OpenAI.Chat.Completions.ChatCompletionTool = {
  type: 'function',
  function: {
    name: 'list_directory_recursive',
    description:
      "Recursively lists files/subdirs for a path, up to a max depth. If a project context is active, path is relative to project root. Otherwise, relative to home. Returns text tree. Forbids absolute paths or '..'.",
    parameters: {
      type: 'object',
      properties: {
        path: {
          type: 'string',
          description:
            'The starting path relative to the active project root (e.g., "src" or "./") or user\'s home directory if no project is active. Use forward slashes `/`.'
        },
        maxDepth: {
          type: 'integer',
          description:
            'Optional. Max depth to recurse. Defaults to 3. Higher values may be truncated.',
          default: 3
        }
      },
      required: ['path']
    }
  }
}

export const readFileTool: OpenAI.Chat.Completions.ChatCompletionTool = {
  type: 'function',
  function: {
    name: 'read_file',
    description:
      "Reads content of a file at a specified path. If a project context is active, path is relative to project root. Otherwise, relative to home. Content may be truncated. Forbids absolute paths or '..'.",
    parameters: {
      type: 'object',
      properties: {
        path: {
          type: 'string',
          description:
            'The path to the file relative to the active project root (e.g., "src/main.ts") or home directory. Use forward slashes `/`.'
        }
      },
      required: ['path']
    }
  }
}

export const saveMemoryTool: OpenAI.Chat.Completions.ChatCompletionTool = {
  type: 'function',
  function: {
    name: 'save_memory',
    description: "Saves a concise summary or key fact discussed to the user's long-term memory.",
    parameters: {
      type: 'object',
      properties: {
        summary_text: {
          type: 'string',
          description: 'The concise text summary or key fact to be remembered.'
        }
      },
      required: ['summary_text']
    }
  }
}

export const createDirectoryTool: OpenAI.Chat.Completions.ChatCompletionTool = {
  type: 'function',
  function: {
    name: 'create_directory',
    description:
      "Creates a new directory (including parents if needed) at the specified path. If a project context is active, path is relative to project root. Otherwise, relative to home. Forbids absolute paths or '..'.",
    parameters: {
      type: 'object',
      properties: {
        path: {
          type: 'string',
          description:
            'The relative path for the new directory (e.g., "src/new_components"). Use forward slashes `/`.'
        }
      },
      required: ['path']
    }
  }
}

export const createFileTool: OpenAI.Chat.Completions.ChatCompletionTool = {
  type: 'function',
  function: {
    name: 'create_file',
    description:
      "Creates a new file with specified content at the specified path. If a project context is active, path is relative to project root. Otherwise, relative to home. Creates parent directories if needed. Fails if file already exists. Forbids absolute paths or '..'.",
    parameters: {
      type: 'object',
      properties: {
        path: {
          type: 'string',
          description:
            'The relative path for the new file (e.g., "src/helpers.ts"). Use forward slashes `/`.'
        },
        content: {
          type: 'string',
          description: 'The initial text content for the new file.'
        }
      },
      required: ['path', 'content']
    }
  }
}

export const editFileTool: OpenAI.Chat.Completions.ChatCompletionTool = {
  type: 'function',
  function: {
    name: 'edit_file',
    description:
      "Overwrites an existing file at the specified path with new content. Use 'read_file' first if modifying based on current content. If a project context is active, path is relative to project root. Otherwise, relative to home. Fails if file doesn't exist. Forbids absolute paths or '..'.",
    parameters: {
      type: 'object',
      properties: {
        path: {
          type: 'string',
          description:
            'The relative path of the file to overwrite (e.g., "src/main.ts"). Use forward slashes `/`.'
        },
        new_content: {
          type: 'string',
          description: 'The complete new text content for the file.'
        }
      },
      required: ['path', 'new_content']
    }
  }
}

export const appendToAIContextTool: OpenAI.Chat.Completions.ChatCompletionTool = {
  type: 'function',
  function: {
    name: 'append_to_ai_context',
    description:
      "Appends the provided text (like summaries, notes, decisions) to the 'AIContext.md' file located in the root of the currently active project. Use this to save project-specific information persistently. Requires an active project.",
    parameters: {
      type: 'object',
      properties: {
        text_to_append: {
          type: 'string',
          description:
            'The text content (markdown format recommended) to append to the AIContext.md file. Include necessary formatting like headings or lists within this text.'
        }
      },
      required: ['text_to_append']
    }
  }
}
// --- ADD THIS EXPORTED ARRAY ---
// Export all defined tools in an array for easy import and use in API calls
export const availableTools = [
  listDirectoryTool,
  listDirectoryRecursiveTool,
  readFileTool,
  saveMemoryTool,
  createDirectoryTool,
  createFileTool,
  editFileTool,
  appendToAIContextTool
]
// --- END EXPORTED ARRAY ---
