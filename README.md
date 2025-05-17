# AI Coding Assistant Desktop App (Project: Ororo Desktop AI)

**Current Status:** In Development (as of April 25, 2025)

![Chat Interface](https://github.com/Cstannahill/ororo-desktop-ai-integration/raw/main/public/chat.webp)

## Description

This project is an Electron-based desktop application designed to function as an AI-powered pair programmer and coding assistant. The core goal is to overcome the context limitations of standard Large Language Models (LLMs) by providing the AI with persistent memory and direct access to local project files and structures. It aims to assist users with planning, designing, coding, debugging, and documenting software projects through an interactive chat interface.

The assistant leverages local storage for project structures and user preferences/memories, combined with Retrieval-Augmented Generation (RAG) techniques and specific filesystem tools to provide contextually relevant and actionable help.

![Text Editor Interface](https://github.com/Cstannahill/ororo-desktop-ai-integration/raw/main/public/text-editor-in_2025-05-14_out.png)

## Current Features

- **Chat Interface:** Provides a user interface for interacting with an AI model via text messages.
- **AI Integration:** Connects to the OpenAI API using the Chat Completions endpoint.
  - Currently configured to use model `gpt-4.1-2025-04-14` (configurable).
  - Supports multi-turn conversations with history context.
- **API Key Management:** Securely stores the user's OpenAI API key locally using `electron-store`. Prompts for the key if not found.
- **Project Indexing:** Users can select local project folders via a system dialog.
- **Local Structure Storage:** The application scans the selected folder (respecting exclusions like `node_modules`, `.git`, etc., and a configurable depth limit) and saves the directory/file structure as JSON data in a local SQLite database.
- **Project Context Awareness:**
  - The AI is informed of all indexed project names via the system prompt.
  - A basic sidebar allows the user to select an "active" project.
  - The active project's name and root path are included in the AI's context.

![Settings Interface](https://github.com/Cstannahill/ororo-desktop-ai-integration/raw/main/public/settings-in-windows_2025-05-14.png)

- **RAG - Structure Context (Basic):** Loads the indexed structure for the active project. If the user's query mentions a specific path, context about that path (e.g., contents if it's a known directory) is retrieved from the stored structure and injected into the prompt.
- **RAG - Persistent Memory (User Insights):**
  - AI can save concise summaries or key facts (e.g., user preferences like "prefers Tailwind") to a local SQLite database (`UserInsights` table) using the `save_memory` tool.
  - Text is converted to vector embeddings using OpenAI's `text-embedding-3-small` API.
  - When processing a new user message, the application retrieves the most semantically similar memories from the database (using basic cosine similarity calculation for now) and injects them into the prompt.
- **Project-Specific Context File (`AIContext.md`):**
  - An `AIContext.md` file is automatically created in the root of newly indexed projects.
  - The application reads this file's content (truncated if large) and injects it into the AI prompt when the project is active.
  - The AI can be instructed to add notes to this file using the `append_to_ai_context` tool.

![Screenshoter with Texting](https://github.com/Cstannahill/ororo-desktop-ai-integration/raw/main/public/screenshoter-with-texting_2025-05-14.png)

- **Filesystem Tools:** The AI can request the use of the following tools to interact with the local filesystem (paths interpreted relative to the active project root, or home directory if no project is active):
  - `list_directory`: Lists files/folders in a single directory.
  - `list_directory_recursive`: Lists files/folders recursively as a text tree (respects depth limit, exclusions, truncates large output).
  - `read_file`: Reads the content of a specified file (truncates large files).
  - `create_directory`: Creates a new directory (including parents).
  - `create_file`: Creates a new file with specified content (fails if exists).
  - `edit_file`: Overwrites an existing file with new content.
- **UI:** Basic layout featuring a sidebar (listing projects, index button) and a main chat area. Implements a dark theme with cyan accents (currently basic implementation awaiting full Tailwind integration).
- **Modular Codebase:** Backend (main process) logic is refactored into separate modules for types, tools, database access, context processing, tool execution, API calls, and IPC handling.

![Settings Menu](https://github.com/Cstannahill/ororo-desktop-ai-integration/raw/main/public/settings-menu-in_2025-05-14_out.png)

## Technical Stack

- **Framework:** Electron
- **UI:** React (using Vite), TypeScript
- **Build System:** Vite + `electron-vite`
- **Backend Logic:** Node.js (Electron Main Process)
- **Database:** SQLite (via `sqlite` and `sqlite3` Node packages) for storing project index, user preferences, and insights/embeddings.
- **Local Configuration:** `electron-store` for API key storage.
- **AI:** OpenAI API (Chat Completions, Embeddings) with Tool Calling. Currently using `gpt-4.1-2025-04-14`.
- **Styling:** Basic Tailwind CSS setup + Inline Styles (planned for full Tailwind implementation).

## Architecture Deep Dive

### Main Process Architecture

The Electron main process serves as the core backend for Ororo Desktop AI, handling all file system operations, database interactions, and AI API calls. It's structured around several key modules:

1. **API Layer (`src/main/api/`):**
   - `openai-caller.ts` - Encapsulates all interactions with the OpenAI API, including:
     - Chat completions with tool calling
     - Text embeddings generation for RAG functionality
     - Error handling and retry logic

2. **Context Management (`src/main/context/`):**
   - `context-handler.ts` - Orchestrates context assembly for AI prompts
   - `context-loader.ts` - Loads project structures and files from database
   - `rag-processor.ts` - Implements retrieval-augmented generation logic for enhancing AI responses with relevant project context

3. **Core Libraries (`src/main/lib/`):**
   - `ai-utils.ts` - Helper functions for AI interactions (token counting, embedding calculations)
   - `database.ts` - SQLite database interface managing:
     - Project structure storage
     - User insights/memories with vector embeddings
     - User preferences
   - `file-system.ts` - Secure filesystem operations
   - `reindexer.ts` - Background task for maintaining up-to-date project indexes
   - `ai-base-prompt.ts` - System prompt templates and configurations

4. **Tool Execution (`src/main/tool-handlers/`):**
   - `directory-tools.ts` - Directory listing and creation tools
   - `file-tools.ts` - File reading, creation, and editing tools
   - `memory-tools.ts` - Persistent memory management tools
   - `tool-executor.ts` - Central dispatcher for tool execution

5. **IPC Communication (`src/main/ipcHandlers.ts`):**
   - Defines and registers all IPC handlers for renderer-main communication
   - Routes renderer requests to appropriate backend services

### Renderer Architecture

The React-based renderer process handles all UI interactions:

1. **Components (`src/renderer/src/components/`):**
   - Modular UI components following React best practices
   - Separation of concerns between display and logic

2. **Assets (`src/renderer/src/assets/`):**
   - CSS, images, and other static resources
   - Custom styling extending Tailwind

3. **Main App Structure:**
   - `App.tsx` - Main application component
   - `main.tsx` - Entry point for React rendering

### Database Schema

The SQLite database follows a normalized schema:

```sql
-- Projects table stores metadata about indexed projects
CREATE TABLE Projects (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    rootPath TEXT NOT NULL UNIQUE,
    lastIndexed DATETIME NOT NULL,
    structureData TEXT NOT NULL -- JSON representation of file/directory structure
);

-- UserInsights table stores memory vectors for RAG capabilities
CREATE TABLE UserInsights (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    text TEXT NOT NULL,
    embedding BLOB NOT NULL, -- Binary vector data
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    projectId INTEGER,
    FOREIGN KEY (projectId) REFERENCES Projects(id)
);

-- UserPreferences table stores configuration settings
CREATE TABLE UserPreferences (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
);
```

### Context Processing Pipeline

The RAG implementation follows a sophisticated pipeline:

1. **User Query Processing:**
   - Analyze incoming message for potential file/directory references
   - Extract semantic meaning for memory retrieval

2. **Context Collection:**
   - Load active project structure
   - Retrieve relevant file contents based on path mentions
   - Fetch semantically similar user memories using vector similarity
   - Include project-specific context from `AIContext.md`

3. **Context Injection:**
   - Assemble context in a structured format
   - Inject into system prompt with clear section demarcations
   - Apply token budgeting to prevent context overflows

4. **Tool Calling Framework:**
   - Register available tools with OpenAI API
   - Parse tool calls from API response
   - Execute requested tools with proper security sandboxing
   - Return tool results to API for continued conversation

## Project Structure Overview

```plaintext
my-ai-app/
├── out/ # Build output directory
├── resources/ # Static resources (e.g., icons)
├── src/
│ ├── main/ # Main Process Code (Node.js environment)
│ │ ├── api/ # Wrappers for external APIs (e.g., OpenAI)
│ │ ├── context/ # Context loading & RAG processing
│ │ ├── lib/ # Low-level libraries (db, fs, ai utils, reindexer)
│ │ ├── tool-handlers/ # Logic for executing specific AI tools
│ │ ├── ipcHandlers.ts # Main logic/orchestration called by IPC listeners
│ │ ├── index.ts # Main process entry point, app setup, window creation
│ │ ├── tools.ts # AI tool definitions for OpenAI API
│ │ └── types.ts # TypeScript types specific to main or shared
│ ├── preload/ # Electron Preload Script
│ │ └── index.ts # Bridges main and renderer securely (contextBridge)
│ └── renderer/ # Renderer Process Code (React UI - Browser environment)
│ ├── src/
│ │ ├── components/ # React UI components
│ │ ├── assets/ # Static assets for UI (CSS, images)
│ │ ├── main.tsx # Renderer entry point (React mount)
│ │ └── App.tsx # Main React application component
│ └── index.html # HTML entry point for renderer
├── electron.vite.config.ts # electron-vite configuration
├── package.json
├── tailwind.config.js # Tailwind configuration
├── tsconfig.json # Root TypeScript config
├── tsconfig.node.json # TypeScript config for main/preload
└── tsconfig.web.json # TypeScript config for renderer
```

## Setup and Running (Developer)

1. **Prerequisites:** Node.js (>=18 recommended), npm / yarn / pnpm.
2. **Clone:** Clone the repository (if applicable).
3. **Install:** Navigate to the project directory and run `npm install` (or `yarn install` / `pnpm install`).
4. **API Key:**
   - On first launch (`npm run dev`), the application will likely prompt for your OpenAI API key via a dedicated form (if no key is found in `electron-store`).
   - Enter your key and save it. It will be stored securely in the application's local data directory.
   - (Optional for Dev: You could modify the code to read from a `.env` file for your own development key, but the `electron-store` mechanism is intended for user-provided keys).
5. **Run Development:** `npm run dev`
   - Starts Vite dev server for the renderer with HMR.
   - Runs the Electron main and preload processes.
   - Opens the application window with DevTools attached.
6. **Build Production:** `npm run build`
   - Builds and bundles the main, preload, and renderer code into the `out/` directory.
   - Copies necessary assets (like database migrations).
7. **Package Distribution:** `npm run package`
   - Creates platform-specific installers/packages
   - Configuration controlled via `electron-builder.yml`

## Production Build Configuration

The application uses `electron-builder` for creating distributable packages with the following configuration:

```yaml
# Key electron-builder settings (from electron-builder.yml)
appId: com.ororo.desktop-ai
productName: Ororo Desktop AI
directories:
  buildResources: resources
  output: dist
files:
  - out/**/*
  - resources/**/*
  - package.json
```

## Security Considerations

Ororo Desktop AI implements several security measures:

1. **API Key Storage:** Using `electron-store` with encryption for sensitive API keys
2. **Secure Context Bridge:** Limited exposed APIs through the Electron preload script
3. **Filesystem Sandboxing:** All filesystem operations are restricted to:
   - Active project directory
   - Application data directory
   - User's home directory (with restrictions)
4. **SQL Injection Prevention:** Parameterized queries for all database interactions
5. **Content Safety:** All AI outputs are passed through OpenAI's content moderation

## Basic User Guide

1. **Start:** Launch the application (run `npm run dev` or use the packaged executable later).
2. **API Key:** If prompted, enter your OpenAI API key and save it.
3. **Index Project:** Click the "Index Project Folder" button in the sidebar. Select the root directory of a code project you want the AI to know about. Wait for the indexing confirmation.
4. **Select Project:** Click on a project name in the sidebar to make it the "active" context for your conversation. "General Chat" can be used for non-project-specific queries.
5. **Chat:** Type messages in the input bar at the bottom.
6. **Interact:**
   - Ask questions about your code or programming concepts.
   - Ask the AI to list files/folders within the active project (e.g., "list files in the `components` folder", "show me the structure of `lib`").
   - Ask the AI to read specific files (e.g., "read the `README.md`", "show me the code for `App.tsx`").
   - Ask the AI to create files or directories (e.g., "create a folder named `tests`", "create a `utils.ts` file in `lib` with a function to add two numbers").
   - Ask the AI to edit files (e.g., "open `utils.ts`, add a function to subtract numbers, and save it").
   - Ask the AI to remember key facts or preferences using "save memory" (e.g., "save this to memory: I prefer using Zustand for state management").
   - Ask the AI to save project-specific notes using "append to context file" (e.g., "append this to AIContext.md: Decided to use Prisma for the database").

## Advanced Usage

### Custom Project Indexing

For large projects, you can optimize indexing by creating an `.ororoignore` file in your project root with glob patterns similar to `.gitignore` to exclude specific paths from indexing:

```plaintext
# Example .ororoignore file
**/node_modules/**
**/dist/**
**/.git/**
**/build/**
**/*.min.js
**/*.map
```

### Memory and Context Management

The AI's memory system works best when:

1. **Explicit Saving:** Ask the AI to explicitly save important information with phrases like "remember this" or "save to memory"
2. **Context File Usage:** Use `AIContext.md` for project-specific details that should persist across all conversations
3. **Clear References:** When discussing files, use clear path references like "src/components/Button.tsx" rather than just "the Button component"

## Current Limitations & Future Work

- **UI:** Basic layout and styling. Needs full Tailwind implementation, improved display of status/errors, copy buttons, potentially better visualization of context/tools.
- **RAG - Structure:** Currently injects context based on simple path matching in the user query. Could be improved with deeper tree searching or vector embeddings of the structure itself for more semantic understanding.
- **RAG - Memory:** Uses basic cosine similarity calculated in JS over all stored memories. Will become inefficient with many memories; needs optimization using proper vector indexing (e.g., SQLite extensions like `sqlite-vss`/`sqlite-vec`, or libraries like LanceDB/Vectra integrated with SQLite persistence).
- **File Editing:** The `edit_file` tool currently overwrites the entire file. More granular editing (diffs, line replacements) could be implemented but adds significant complexity for both the AI and the tool.
- **Re-indexing:** Currently manual (via button) or delayed background task after modifications. Needs a more robust background task queue or a manual "Refresh" button in the UI for guaranteed consistency after external file changes.
- **Error Handling:** Can be made more robust and user-friendly.
- **User Preferences:** Implement the formal system for storing/retrieving explicit user preferences (Planned Next).
- **Planning Projects:** Implement support for the "Planning" project type, including storing/retrieving planning artifacts.
- **Ollama / Local LLM Support:** Add provider selection and logic to interact with local models via Ollama.
- **Screen Reading/Interaction:** Future goal, not yet implemented.

## Roadmap

### Short-term (Q2-Q3 2025)

- Improved RAG implementation with better vector search
- Enhanced file editing capabilities with diff-based changes
- Full Tailwind UI implementation with responsive design
- User preferences system implementation

### Medium-term (Q3-Q4 2025)

- Ollama integration for local model support
- Planning project type with artifacts management
- Background file monitoring and auto-indexing
- Plugin system for extensibility

### Long-term (2026+)

- Screen reading and interaction capabilities
- Multi-modal support (image/diagram generation)
- Collaborative features
- IDE integration options

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

[MIT License](LICENSE)

---
