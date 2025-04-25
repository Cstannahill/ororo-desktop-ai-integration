// src/main/context/context-loader.ts

import { type Project, type DirectoryTree } from '../types'
import { getDb, loadIndexedProjects } from '../lib/database'

// Type for the return value of this loader
export interface AppContextData {
  projectContext: string // String describing available/active projects
  activeProject: (Project & { rootPath?: string }) | null // Active project details
  projectTree: DirectoryTree | null // Parsed file structure of active project
}

/**
 * Loads essential context data needed for processing user messages.
 * Fetches project list, identifies the active project, and loads/parses its file structure.
 */
export async function loadAppContext(activeProjectId: number | null): Promise<AppContextData> {
  let projectContext = ''
  let activeProject: (Project & { rootPath?: string }) | null = null
  let projectTree: DirectoryTree | null = null
  let structureWarning = '' // Collect warnings/errors here

  try {
    const indexedProjects = await loadIndexedProjects() // Fetch all projects
    if (indexedProjects && indexedProjects.length > 0) {
      const projectNames = indexedProjects.map((p) => p.name).join(', ')
      projectContext = ` The user has indexed the following projects: [${projectNames}].`

      // Find active project and load its details (rootPath, structureJson)
      if (activeProjectId !== null) {
        const foundProject = indexedProjects.find((p) => p.id === activeProjectId)
        if (foundProject) {
          try {
            const db = await getDb()
            const projectData = await db.get<{ structureJson?: string; rootPath?: string }>(
              'SELECT structureJson, rootPath FROM Projects WHERE id = ?',
              foundProject.id
            )
            activeProject = { ...foundProject, rootPath: projectData?.rootPath || undefined } // Assign rootPath

            if (!activeProject?.rootPath) {
              structureWarning = `\n\nWarning: Root path not found for active project '${activeProject?.name}'.`
            } else {
              projectContext += ` The currently active project is '${activeProject?.name}' located at path '${activeProject?.rootPath}'.`
            }

            // Load and parse structure
            if (projectData?.structureJson) {
              try {
                projectTree = JSON.parse(projectData.structureJson)
                console.log(
                  `ContextLoader: Successfully parsed structureJson for ${activeProject?.name}.`
                )
              } catch (parseError) {
                console.error(
                  `ContextLoader: Failed to parse structureJson for ${activeProject?.name}!`,
                  parseError
                )
                structureWarning += `\n\nWarning: Stored file structure for '${activeProject?.name}' appears corrupted.`
                projectTree = null
              }
            } else {
              console.warn(
                `ContextLoader: No structureJson found for project ID ${activeProject?.id}`
              )
              structureWarning += `\n\nWarning: File structure details not found for active project '${activeProject?.name}'. Re-index might be needed.`
            }
          } catch (dbError) {
            console.error(
              `ContextLoader: Error fetching details for project ID ${activeProjectId}:`,
              dbError
            )
            activeProject = foundProject // Keep basic info
            structureWarning = `\n\nError: Could not load details for project '${activeProject?.name}'.`
          }
        } else {
          console.warn(`ContextLoader: Could not find active project with ID: ${activeProjectId}`)
          projectContext += ` An invalid project context was requested.`
        }
      } else {
        projectContext += ` No specific project context is active.`
      }
    } else {
      projectContext = ' The user has not indexed any projects yet.'
    }
  } catch (error) {
    projectContext = '\n\nError: Could not load indexed projects list.'
  }

  // Append any structure warnings to the main project context string
  if (structureWarning) {
    projectContext += structureWarning
  }

  return { projectContext, activeProject, projectTree }
}
