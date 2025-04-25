// src/main/tool-handlers/file-tools.ts

import { resolve, normalize, dirname } from 'path'
import { promises as fs } from 'fs'

const MAX_FILE_READ_LENGTH = 20000 // Define constant here or import

/**
 * Executes the logic for the 'read_file' tool.
 */
export async function executeReadFile(
  basePath: string,
  requestedPath: string,
  contextDescription: string
): Promise<string> {
  let functionResult = ''
  try {
    const normalizedRequestedPath = normalize(requestedPath || '')
    const fullPath = resolve(basePath, normalizedRequestedPath)
    console.log(
      `ToolExec: read_file - Req Path: "${requestedPath}" (${contextDescription}), Resolved: "${fullPath}"`
    )

    // Path Validation
    if (
      !fullPath.startsWith(basePath) ||
      normalizedRequestedPath.includes('..') ||
      !requestedPath
    ) {
      functionResult = `Error: Access denied or invalid path. Paths must be ${contextDescription} and cannot contain '..'.`
    } else {
      const stats = await fs.stat(fullPath)
      if (!stats.isFile()) {
        functionResult = `Error: Path "${requestedPath}" is a directory.`
      } else {
        let content = await fs.readFile(fullPath, 'utf8')
        if (content.length > MAX_FILE_READ_LENGTH) {
          content = content.substring(0, MAX_FILE_READ_LENGTH - 25) + '\n... (Content Truncated)'
        }
        functionResult = content
      }
    }
  } catch (error: any) {
    console.error(`ToolExec: read_file error for "${requestedPath}":`, error)
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      functionResult = `Error: File not found at path "${requestedPath}".`
    } else if (
      (error as NodeJS.ErrnoException).code === 'EACCES' ||
      (error as NodeJS.ErrnoException).code === 'EPERM'
    ) {
      functionResult = `Error: Permission denied for path "${requestedPath}".`
    } else {
      functionResult = `Error executing read_file. ${error.message || 'Unknown error'}`
    }
  }
  return functionResult
}

/**
 * Executes the logic for the 'create_file' tool.
 */
export async function executeCreateFile(
  basePath: string,
  requestedPath: string,
  content: string,
  contextDescription: string
): Promise<string> {
  let functionResult = ''
  try {
    const normalizedRequestedPath = normalize(requestedPath || '')
    const fullPath = resolve(basePath, normalizedRequestedPath)
    console.log(
      `ToolExec: create_file - Req Path: "${requestedPath}" (${contextDescription}), Resolved: "${fullPath}"`
    )

    // Path Validation
    if (
      !fullPath.startsWith(basePath) ||
      normalizedRequestedPath.includes('..') ||
      !requestedPath ||
      requestedPath.endsWith('/') ||
      requestedPath.endsWith('\\')
    ) {
      functionResult = `Error: Access denied or invalid file path. Must be ${contextDescription}, no '..', valid filename.`
    } else {
      // Use 'wx' flag to fail if exists
      try {
        const parentDir = dirname(fullPath)
        await fs.mkdir(parentDir, { recursive: true })
        await fs.writeFile(fullPath, content, { encoding: 'utf8', flag: 'wx' })
        functionResult = `Successfully created file: "${requestedPath}"`
      } catch (writeError: any) {
        if (writeError.code === 'EEXIST') {
          functionResult = `Error: File already exists at path "${requestedPath}".`
        } else {
          throw writeError
        }
      }
    }
  } catch (error: any) {
    console.error(`ToolExec: create_file error for "${requestedPath}":`, error)
    functionResult = `Error: Failed to create file. ${error.message || ''}`
  }
  return functionResult
}

/**
 * Executes the logic for the 'edit_file' tool (overwrite).
 */
export async function executeEditFile(
  basePath: string,
  requestedPath: string,
  newContent: string,
  contextDescription: string
): Promise<string> {
  let functionResult = ''
  try {
    const normalizedRequestedPath = normalize(requestedPath || '')
    const fullPath = resolve(basePath, normalizedRequestedPath)
    console.log(
      `ToolExec: edit_file - Req Path: "${requestedPath}" (${contextDescription}), Resolved: "${fullPath}"`
    )

    // Path Validation
    if (
      !fullPath.startsWith(basePath) ||
      normalizedRequestedPath.includes('..') ||
      !requestedPath
    ) {
      functionResult = `Error: Access denied or invalid path. Must be ${contextDescription}, no '..'.`
    } else {
      // Check existence first
      try {
        const stats = await fs.stat(fullPath)
        if (!stats.isFile()) {
          functionResult = `Error: Path "${requestedPath}" is not a file.`
        } else {
          await fs.writeFile(fullPath, newContent, 'utf8')
          functionResult = `Successfully edited file: "${requestedPath}"`
        }
      } catch (statError: any) {
        if (statError.code === 'ENOENT') {
          functionResult = `Error: File not found at "${requestedPath}".`
        } else {
          throw statError
        }
      }
    }
  } catch (error: any) {
    console.error(`ToolExec: edit_file error for "${requestedPath}":`, error)
    functionResult = `Error: Failed to edit file. ${error.message || ''}`
  }
  return functionResult
}
