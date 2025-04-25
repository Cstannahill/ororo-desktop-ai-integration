// src/main/index.ts

import { app, BrowserWindow, shell, ipcMain } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'
// Corrected import based on your feedback
import ElectronStoreModule, { type Store as ElectronStoreType } from 'electron-store'
import OpenAI from 'openai'
import path from 'path'
// Import from our refactored modules
import { type AppStore, type ChatMessage, type Project } from './types' // Ensure Project is imported if used directly here, though it might only be needed in ipcHandlers/database now
import { processUserMessage, setApiKey, handleIndexProject, handleGetProjects } from './ipcHandlers'
import { initializeDatabase } from './lib/database'

// --- Store Initialization ---
// Resolve the actual constructor, accounting for CJS/ESM interop
const StoreConstructor = (ElectronStoreModule as any).default || ElectronStoreModule
// Initialize electron-store with the resolved constructor and explicit type
const store: ElectronStoreType<AppStore> = new StoreConstructor({})

// --- Global Variables ---
// These manage the core state accessible within the main process scope
let mainWindow: BrowserWindow | null = null
let openai: OpenAI | null = null

// --- Helper Functions ---
// Modifies the global 'openai' variable based on stored key
function initializeOpenAI(): void {
  const apiKey = store.get('openaiApiKey')
  if (apiKey) {
    console.log('Main: OpenAI API Key found, initializing client.')
    openai = new OpenAI({ apiKey })
  } else {
    console.log('Main: OpenAI API Key not found in store.')
    openai = null
  }
}

// --- Main Window Creation ---
// Creates the main application window and sets up its behavior
function createWindow(): void {
  // Attempt to initialize OpenAI client when window is created
  // The client might be null if the key isn't set yet
  initializeOpenAI()

  // Create the browser window instance
  mainWindow = new BrowserWindow({
    width: 900,
    height: 670,
    show: false, // Don't show until ready to avoid visual flash

    icon: path.join(__dirname, 'assets/icons/png/512x512.png'),
    autoHideMenuBar: true,
    ...(process.platform === 'linux' ? { icon } : {}), // Linux icon setup
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'), // Path to the preload script
      sandbox: false, // Check security implications if this needs to be true
      contextIsolation: true // MUST be true for contextBridge in preload to work securely
    }
  })

  // Show window smoothly when the content is ready
  mainWindow.on('ready-to-show', () => {
    console.log('Main: Window ready-to-show.')
    mainWindow?.show()
  })

  // Handle requests to open new windows (e.g., links), open externally
  mainWindow.webContents.setWindowOpenHandler((details) => {
    console.log(`Main: Denying new window and opening external URL: ${details.url}`)
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  // Load the correct renderer URL (development server or production file)
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    const rendererUrl = process.env['ELECTRON_RENDERER_URL']
    console.log(`Main: Loading renderer from Vite dev server: ${rendererUrl}`)
    mainWindow.loadURL(rendererUrl)
    // Open DevTools automatically in development
    mainWindow.webContents.openDevTools({ mode: 'detach' }) // Open detached
  } else {
    const indexPath = join(__dirname, '../renderer/index.html')
    console.log(`Main: Loading renderer from production file: ${indexPath}`)
    mainWindow.loadFile(indexPath)
  }

  // Clean up reference when the window is closed
  mainWindow.on('closed', () => {
    console.log('Main: Main window closed.')
    mainWindow = null
  })

  // Register all our IPC message handlers
  setupIpcHandlers()
}

// --- IPC Handlers Setup ---
// Registers the main process listeners that invoke our handler logic
function setupIpcHandlers(): void {
  console.log('Main: Setting up IPC handlers.')

  // --- Chat Message Handling ---
  ipcMain.on(
    'ipc-send-message',
    async (_event, payload: { messages: ChatMessage[]; activeProjectId: number | null }) => {
      // Call the imported logic, passing current state/clients it needs
      const { messages: receivedMessages, activeProjectId } = payload
      await processUserMessage(receivedMessages, openai, mainWindow, app, activeProjectId)
    }
  )

  // --- API Key Handling ---
  ipcMain.handle('set-api-key', async (_event, apiKey: string): Promise<boolean> => {
    // Call the imported logic, passing dependencies it needs
    return await setApiKey(apiKey, store, initializeOpenAI)
  })

  // --- Project Indexing Handling ---
  ipcMain.handle('index-project', async (): Promise<string> => {
    // Call the imported logic, passing dependencies it needs
    return await handleIndexProject(mainWindow, app)
  })

  // --- Get Projects Handling ---
  ipcMain.handle('get-projects', async (): Promise<Project[]> => {
    // Call the imported logic (which likely calls database logic)
    return await handleGetProjects()
  })

  console.log('Main: IPC handlers registered.')
}

// --- Electron App Lifecycle Events ---

// This method will be called when Electron has finished initialization
// and is ready to create browser windows.
app.whenReady().then(async () => {
  console.log('Main: App ready, initializing database...')

  // Initialize Database FIRST and wait for it
  try {
    await initializeDatabase()
    console.log('Main: Database initialization completed successfully.')
  } catch (error) {
    console.error('Main: Database initialization failed critically. Exiting.', error)
    // TODO: Consider showing a user-facing error dialog here before quitting
    app.quit()
    return // Stop further execution in this callback
  }

  // Set app user model id for windows notifications (optional but recommended)
  electronApp.setAppUserModelId('com.electron.my-ai-app') // Replace with your unique App ID

  // Development-specific optimizations and DevTools handling
  app.on('browser-window-created', (_, window) => {
    console.log('Main: Browser window created event.')
    optimizer.watchWindowShortcuts(window) // From electron-toolkit
  })

  // Create the main application window now that DB is ready
  createWindow()

  // Handle macOS dock activation behavior
  app.on('activate', () => {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) {
      console.log('Main: App activated (macOS) with no windows open, creating new window.')
      createWindow()
    } else {
      console.log('Main: App activated (macOS), window(s) already open.')
      // Optionally focus existing window: mainWindow?.focus();
    }
  })
})

// Quit when all windows are closed (standard behavior except on macOS)
app.on('window-all-closed', () => {
  console.log('Main: All windows closed event.')
  if (process.platform !== 'darwin') {
    console.log('Main: Quitting app (not macOS).')
    app.quit()
  } else {
    console.log('Main: App remains active (macOS).')
  }
})

// Optional: Handle app exit more gracefully (e.g., close DB connection)
// app.on('will-quit', async () => {
//   console.log("Main: App will-quit event.");
//   // Perform cleanup tasks here
// });

console.log('Main: index.ts script finished loading.') // Log end of script execution
