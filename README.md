# ororo-desktop-ai-integration
An Electron application with React and TypeScript

## Recommended IDE Setup

- [VSCode](https://code.visualstudio.com/) + [ESLint](https://marketplace.visualstudio.com/items?itemName=dbaeumer.vscode-eslint) + [Prettier](https://marketplace.visualstudio.com/items?itemName=esbenp.prettier-vscode)

## Project Setup

### Install

```bash
$ npm install
```

### Development

```bash
$ npm run dev
```

### Build

```bash
# For windows
$ npm run build:win

# For macOS
$ npm run build:mac

# For Linux
$ npm run build:linux
```
=======
# desktop-ai-integration
Electron desktop application connected to OpenAI provider allowing (restricted) recursive directory search, read, edit, write ability.


Select Index a project to bring up the file explorer, link a project at the root and the project name will populate the side bar on the left.
Interact with AI from the selected project relative to the base of the project.

## Example markdown AIContext.md file created from AI viewing a previous in-progress project.

# AI Context for project

---

## Project Directory Structure Overview

### Project Root

- **Configuration Files:** `.env`, `next-env.d.ts`, `next.config.ts`, `package.json`, `postcss.config.mjs`
- **Documentation:** `README.md`, `linktree.mdx`
- **Copyright/Vendor and IDE Specific:** `.gitignore`, `.vscode/`

### Prisma (Database and ORM)

- **Schema and Migrations:** `prisma/schema.prisma`, `prisma/migrations/`

### Source Code (`src/`)

- **Applications and Features:** Under `app/`, contains directories and files for various features and pages like login, registration, riddles, and trivia.
- **Components:** Reusable UI components under `components/`.
- **Utilities and Libraries:** Shared functionalities in `lib/`.

### Additional Files and Data

- **Data Files:** JSON and TypeScript files under `data/` for managing application data.
- **Rendering and State Management:** Documentation related to UI and interaction under `docs/`.

This structured overview provides a snapshot of the project’s file and directory layout, offering a clear picture of where different elements and features are located within the `trivia-app`.

---

## Components/tools Directory Findings (2024-06-11)

- `tools/file-viewer.tsx` is an auxiliary React component (TypeScript) for listing, uploading, and deleting files (likely from `/api/assistants/files`). Mostly for admin, dev, or OpenAI testing scenarios (e.g., file search/attachment for LLMs).
- Uses `file-viewer.module.css` for styling, making it one of the only locations in the codebase to prefer CSS Modules over Tailwind. Not necessarily end-user-facing—purpose looks experimental or developer-focused.
- Most component styling across the project uses Tailwind CSS, reflecting project/user convention. This tool is an exception, a possible candidate for refactoring in future if UI/UX consistency becomes important.

### Current Project Understanding:

- The app provides various AI-powered modes: trivia, "Who Be I" guessing game, chat, and logic/riddles. Navigation is through the `Navbar`.
- UI is predominantly built with functional React (TSX), Tailwind, and composable UI components (Button, Card, Spinner, etc).
- Some “power user” or dev tools (like `FileViewer`) exist but are styled differently and seem less critical to the relgular user experience.

---

### Components Directory Review (April 2024)

**tools/**

- Contains developer-focused utilities like FileViewer (file upload/delete for assistant file search scenarios, primarily for experimental/admin use). Unique for being styled with CSS Modules; rest of project favors Tailwind.

**ui-kit/**

- Contains visual utility components for composable, consistent UI: `PaperBlock` (adaptable container with glass/gradient/texture backgrounds) and `TextureOverlay` (for subtle, customizable background effects). Both use Tailwind CSS, emphasizing reusable, design-poly components.

**whoBeI/**

- Contains `WhoBeIDebugPanel`—a collapsible debug/info view revealing JSON-formatted game/character/profile data during WhoBeI mode. Intended for dev/QA, not regular users.

**Current Project Understanding:**

- The app features multiple game/interaction modes (trivia, identity/WhoBeI, general AI chat, logic puzzles, riddles) linked via a shared navigation component and unified UI kit.
- Clear separation of business/game logic and reusable UI; "Tools" and "Debug" panels are cordoned off for development/testing.
- Nearly all styling is handled with Tailwind CSS; CSS Modules only present via imports from external/tested sources.
- Features are composed using functional React with hooks and Redux as needed for app/session state. Pattern aims for rapid extension and reusability.

_(This note reflects files in src/components and its subdirectories as of April 2024; review again after major refactors or new directory additions.)_

---

## /src/lib/ Directory Summary (April 2024)

### Overview

`/src/lib/` contains utility modules and core backend logic for both general app features and the "WhoBeI" game mode.

### Key Modules

- **assistant/utils.ts:** Implements OpenAI "tool call" handling; currently only "save_character_profile". Handles API dispatch and command routing.
- **helperFunctions.ts:** Date formatting helper.
- **openai.ts:** Exports a singleton OpenAI API client instance for safe, global reuse.
- **prisma.ts:** Sets up and exports a singleton PrismaClient instance for database connection reuse, avoiding dev-mode leaks.
- **utils.ts:** Contains React-friendly utility functions (class name composition, JSON validation).

#### `whoBeI/` Subdirectory

- **characterProfiles.ts:** Generates new character profiles from OpenAI, picks a random saved profile, avoids duplicates, validates/sanitizes game data.
- **gameLogic.ts:** Core WhoBeI game mechanics: answers user questions based on character traits, provides hints, checks user guesses (loose text match).
- **sessionStore.ts:** In-memory session state: stores, retrieves, updates, and deletes active game sessions (no DB persistence).

### Insights

- Strong focus on type safety, modularity, and data validation throughout.
- Robust OpenAI and database integration (and error handling).
- All WhoBeI gameplay logic and data management lives in this folder (not in UI layer).
- Utility code is cleanly separated from business logic.

## Current Project Understanding

The project, "trivia-app," is a full-stack AI-powered web app offering multiple modes: classic trivia, "Who Be I" (identity guessing game), open-ended AI chat, and logic/riddle puzzles. The application emphasizes modularity and extensibility with a React/TypeScript UI, strong reliance on reusable components, and Tailwind CSS for styling nearly all user-facing elements. Backend logic—including AI prompt orchestration, game rule implementation, and session state handling—is strongly separated and lives primarily in the `/src/lib/` directory. The app demonstrates robust OpenAI and database integrations, keen attention to data validation/safety, and clear boundaries between user features, development/admin tools, and reusable assets.
_Date: April 2024_

---

---

# Overview of /src/app Directory Files and Major Modules

## Feature Pages
- **archive/page.tsx**: Displays archived trivia questions. Fetches from questions API, renders QuestionCard list, handles error/loading.
- **logicGrid/page.tsx**: Interactive grid logic puzzle; user maps clues/answers by toggling cells. Local state tracks correctness. 
- **patterns/page.tsx**: Placeholder for future “patterns” mode; minimal base structure and layout.
- **riddles/page.tsx**: Empty placeholder for upcoming riddle logic/game feature.
- **trivia/page.tsx**: User selects topics/difficulty, fetches and displays AI-generated trivia from API. Maps results to QuestionCard.
- **whoBeI/page.tsx**: Orchestrates Who Be I gameplay. State machine progresses from WhoBeIStart to WhoBeIChat, manages session/profile context.

## Providers Directory (`/src/app/providers`)
- **auth-provider.tsx**: Wraps app in NextAuth SessionProvider for secure auth flows.
- **redux-provider.tsx**: Stores Redux state context for app.
- **theme-provider.tsx**: Dynamically supplies dark/light theme with next-themes.
- **index.tsx**: Composes all providers to single `<AppProviders>`, used as root wrapper for all layouts/pages.

## API Directory (`/src/app/api`)
- **assistants/threads/**: Deeply structured OpenAI Assistant endpoints. Handles thread/message/run creation, streaming, and multi-tool execution flows. Robust error handling and stageful management for assistant orchestration.
- **questions/route.ts**: Returns, validates, and creates trivia questions. Supports GET (all questions) and POST (bulk insert) with Prisma.
- **trivia/route.ts**: Handles AI-powered trivia generation from requested topics/difficulty. Prompts OpenAI, parses strictly typed results, removes markdown artifacts.
- **whoBeI/question/route.ts**: POST endpoint for Who Be I user guesses, session hinting, and validation.
- **whoBeI/save/[latest]/route.ts**: GET endpoint, reads/deserializes most recently saved Who Be I character/profile.
- **whoBeI/save/route.ts**: POST validation and saves new Who Be I profile.
- **whoBeI/start/route.ts**: Creates and returns a new Who Be I game session and associated character profile.

---

# Current Understanding of the Project

**trivia-app** is a robust, AI-powered trivia & games web application, designed for extensibility and modularity. It features:
- Deep integration with OpenAI for dynamic quiz/trivia generation and assistant-powered Q&A/gameplay.
- Carefully structured React/TypeScript frontend using feature-isolated pages, reusable UI-kit components, and fully integrated provider-based context (auth, redux, theme).
- API endpoints with strong typing, content-based validation, and persistent database/file storage (Prisma, filesystem JSON where appropriate).
- "Who Be I" mode offers session-coupled identity guessing games, profile state, and hint scaffolding. Trivia mode allows for personalized AI-prompt-based quizzes.
- Further puzzle modes (logic grids, riddles, patterns) are implemented or stubbed for growth.
- All modules adhere to a separation between regular user features and admin/dev tool interfaces. Styling uniformity and global behaviors are centralized.

This architecture enables easy onboarding for contributors, supports rigorous extensibility, and ensures a clear separation between user logic, admin/dev tools, and backend integrations.

