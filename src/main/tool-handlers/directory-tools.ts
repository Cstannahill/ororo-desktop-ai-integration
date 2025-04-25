// src/main/tool-handlers/directory-tools.ts

import { resolve, normalize } from 'path'
import { promises as fs } from 'fs'
import { DEFAULT_EXCLUDE_ITEMS, getTextDirectoryTree } from '../lib/file-system'

/**
 * Executes the logic for the 'list_directory' tool.
 */
export async function executeListDirectory(
  basePath: string,
  requestedPath: string,
  contextDescription: string // For error messages
): Promise<string> {
  let functionResult = ''
  try {
    const normalizedRequestedPath = normalize(requestedPath || '')
    const fullPath = resolve(basePath, normalizedRequestedPath)
    console.log(
      `ToolExec: list_directory - Req: "${requestedPath}" (${contextDescription}), Resolved: "${fullPath}"`
    )

    // Path Validation
    if (
      !fullPath.startsWith(basePath) ||
      normalizedRequestedPath.includes('..') ||
      !requestedPath
    ) {
      functionResult = `Error: Access denied or invalid path. Paths must be ${contextDescription} and cannot contain '..'.`
    } else {
      const dirents = await fs.readdir(fullPath, { withFileTypes: true })
      const items = dirents
        .filter((d) => !DEFAULT_EXCLUDE_ITEMS.has(d.name))
        .map((d) => `${d.name}${d.isDirectory() ? '/' : ''}`)
        .sort()
      functionResult = items.join('\n') || '(Directory is empty)'
    }
  } catch (error: any) {
    console.error(`ToolExec: list_directory error for "${requestedPath}":`, error)
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      functionResult = `Error: Path not found "${requestedPath}".`
    } else if (
      (error as NodeJS.ErrnoException).code === 'EACCES' ||
      (error as NodeJS.ErrnoException).code === 'EPERM'
    ) {
      functionResult = `Error: Permission denied for path "${requestedPath}".`
    } else {
      functionResult = `Error executing list_directory. ${error.message || 'Unknown error'}`
    }
  }
  return functionResult
}

/**
 * Executes the logic for the 'list_directory_recursive' tool.
 */
export async function executeListDirectoryRecursive(
  basePath: string,
  requestedPath: string,
  maxDepth: number,
  contextDescription: string
): Promise<string> {
  let functionResult = ''
  try {
    const normalizedRequestedPath = normalize(requestedPath || '')
    const fullPath = resolve(basePath, normalizedRequestedPath)
    console.log(
      `ToolExec: list_directory_recursive - Req: "${requestedPath}" (${contextDescription}), Depth: ${maxDepth}, Resolved: "${fullPath}"`
    )

    // Path Validation
    if (
      !fullPath.startsWith(basePath) ||
      normalizedRequestedPath.includes('..') ||
      !requestedPath
    ) {
      functionResult = `Error: Access denied or invalid path. Paths must be ${contextDescription} and cannot contain '..'.`
    } else {
      // Call the helper that generates the text tree directly
      functionResult = await getTextDirectoryTree(fullPath, maxDepth)
      console.log(`ToolExec: list_directory_recursive - Result generated (potentially truncated).`)
    }
  } catch (error: any) {
    console.error(`ToolExec: list_directory_recursive error for "${requestedPath}":`, error)
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      functionResult = `Error: Path not found "${requestedPath}".`
    } else if (
      (error as NodeJS.ErrnoException).code === 'EACCES' ||
      (error as NodeJS.ErrnoException).code === 'EPERM'
    ) {
      functionResult = `Error: Permission denied for path "${requestedPath}".`
    } else {
      functionResult = `Error executing list_directory_recursive. ${error.message || 'Unknown error'}`
    }
  }
  return functionResult
}

/**
 * Executes the logic for the 'create_directory' tool.
 */
export async function executeCreateDirectory(
  basePath: string,
  requestedPath: string,
  contextDescription: string
): Promise<string> {
  let functionResult = ''
  try {
    const normalizedRequestedPath = normalize(requestedPath || '')
    const fullPath = resolve(basePath, normalizedRequestedPath)
    console.log(
      `ToolExec: create_directory - Req: "${requestedPath}" (${contextDescription}), Resolved: "${fullPath}"`
    )

    // Path Validation
    if (
      !fullPath.startsWith(basePath) ||
      normalizedRequestedPath.includes('..') ||
      !requestedPath
    ) {
      functionResult = `Error: Access denied or invalid path. Paths must be ${contextDescription} and cannot contain '..'.`
    } else {
      await fs.mkdir(fullPath, { recursive: true }) // recursive:true creates parents
      functionResult = `Successfully created directory: "${requestedPath}"`
    }
  } catch (error: any) {
    console.error(`ToolExec: create_directory error for "${requestedPath}":`, error)
    if ((error as NodeJS.ErrnoException).code === 'EEXIST') {
      functionResult = `Error: Directory or file already exists at path "${requestedPath}".`
    } else {
      functionResult = `Error: Failed to create directory. ${error.message || ''}`
    }
  }
  return functionResult
}
