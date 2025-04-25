// src/main/lib/reindexer.ts

import type { BrowserWindow } from 'electron'
import type { Project } from '../types'

// Type definition for the handleIndexProject function signature
type HandleIndexProjectType = (
  mainWindow: BrowserWindow | null,
  appInstance: Electron.App,
  projectRootPath?: string
) => Promise<string>

/**
 * Triggers the re-indexing process in the background after a delay.
 */
export function triggerReindex(
  activeProject: (Project & { rootPath?: string }) | null,
  mainWindow: BrowserWindow | null,
  appInstance: Electron.App,
  // Pass the actual handleIndexProject function to avoid circular dependencies
  handleIndexProjectFunc: HandleIndexProjectType
): void {
  if (activeProject?.rootPath) {
    const pathToIndex = activeProject.rootPath
    const projectName = activeProject.name
    console.log(
      `Reindexer: Scheduling background re-index for project path ${pathToIndex} in 100ms...`
    )

    setTimeout(() => {
      console.log(`Reindexer: Starting background re-index for ${projectName} (${pathToIndex})...`)
      // Call the passed function non-interactively
      handleIndexProjectFunc(mainWindow, appInstance, pathToIndex)
        .then((result) =>
          console.log(`Reindexer: Background re-indexing result for ${projectName}: ${result}`)
        )
        .catch((err) =>
          console.error(`Reindexer: Background re-indexing failed for ${projectName}:`, err)
        )
    }, 100) // Delay in milliseconds
  } else {
    console.warn('Reindexer: Cannot trigger re-index: Active project or root path is missing.')
  }
}
