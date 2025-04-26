# AI Coding Assistant Desktop App (Project: Ororo Desktop AI)

**Current Status:** In Development (as of April 25, 2025)


## Description

This project is an Electron-based desktop application designed to function as an AI-powered pair programmer and coding assistant. The core goal is to overcome the context limitations of standard Large Language Models (LLMs) by providing the AI with persistent memory and direct access to local project files and structures. It aims to assist users with planning, designing, coding, debugging, and documenting software projects through an interactive chat interface.

The assistant leverages local storage for project structures and user preferences/memories, combined with Retrieval-Augmented Generation (RAG) techniques and specific filesystem tools to provide contextually relevant and actionable help.

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
- **RAG - Structure Context (Basic):** Loads the indexed structure for the active project. If the user's query mentions a specific path, context about that path (e.g., contents if it's a known directory) is retrieved from the stored structure and injected into the prompt.
- **RAG - Persistent Memory (User Insights):**
  - AI can save concise summaries or key facts (e.g., user preferences like "prefers Tailwind") to a local SQLite database (`UserInsights` table) using the `save_memory` tool.
  - Text is converted to vector embeddings using OpenAI's `text-embedding-3-small` API.
  - When processing a new user message, the application retrieves the most semantically similar memories from the database (using basic cosine similarity calculation for now) and injects them into the prompt.
- **Project-Specific Context File (`AIContext.md`):**
  - An `AIContext.md` file is automatically created in the root of newly indexed projects.
  - The application reads this file's content (truncated if large) and injects it into the AI prompt when the project is active.
  - The AI can be instructed to add notes to this file using the `append_to_ai_context` tool.
- **Filesystem Tools:** The AI can request the use of the following tools to interact with the local filesystem (paths interpreted relative to the active project root, or home directory if no project is active):
  - `list_directory`: Lists files/folders in a single directory.
  - `list_directory_recursive`: Lists files/folders recursively as a text tree (respects depth limit, exclusions, truncates large output).
  - `read_file`: Reads the content of a specified file (truncates large files).
  - `create_directory`: Creates a new directory (including parents).
  - `create_file`: Creates a new file with specified content (fails if exists).
  - `edit_file`: Overwrites an existing file with new content.
- **UI:** Basic layout featuring a sidebar (listing projects, index button) and a main chat area. Implements a dark theme with cyan accents (currently basic implementation awaiting full Tailwind integration).
- **Modular Codebase:** Backend (main process) logic is refactored into separate modules for types, tools, database access, context processing, tool execution, API calls, and IPC handling.

## Technical Stack

- **Framework:** Electron
- **UI:** React (using Vite), TypeScript
- **Build System:** Vite + `electron-vite`
- **Backend Logic:** Node.js (Electron Main Process)
- **Database:** SQLite (via `sqlite` and `sqlite3` Node packages) for storing project index, user preferences, and insights/embeddings.
- **Local Configuration:** `electron-store` for API key storage.
- **AI:** OpenAI API (Chat Completions, Embeddings) with Tool Calling. Currently using `gpt-4.1-2025-04-14`.
- **Styling:** Basic Tailwind CSS setup + Inline Styles (planned for full Tailwind implementation).

## Project Structure Overview

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

1.  **Prerequisites:** Node.js (>=18 recommended), npm / yarn / pnpm.
2.  **Clone:** Clone the repository (if applicable).
3.  **Install:** Navigate to the project directory and run `npm install` (or `yarn install` / `pnpm install`).
4.  **API Key:**
    - On first launch (`npm run dev`), the application will likely prompt for your OpenAI API key via a dedicated form (if no key is found in `electron-store`).
    - Enter your key and save it. It will be stored securely in the application's local data directory.
    - (Optional for Dev: You could modify the code to read from a `.env` file for your own development key, but the `electron-store` mechanism is intended for user-provided keys).
5.  **Run Development:** `npm run dev`
    - Starts Vite dev server for the renderer with HMR.
    - Runs the Electron main and preload processes.
    - Opens the application window with DevTools attached.
6.  **Build Production:** `npm run build`
    - Builds and bundles the main, preload, and renderer code into the `out/` directory.
    - Copies necessary assets (like database migrations).

