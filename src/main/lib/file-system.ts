// src/main/lib/file-system.ts

import { join } from 'path'
import { promises as fs } from 'fs'
import type { DirectoryTree } from '../types'

// Folders/files to generally ignore during recursive scans
export const DEFAULT_EXCLUDE_ITEMS = new Set([
  'node_modules',
  '.git',
  'dist',
  'build',
  'out',
  '.output', // Common Nuxt/Nitro output dir
  '.next', // Common Next.js output/build dir
  '.nuxt', // Common Nuxt 2 build dir
  'vendor', // Common dependency folder (PHP, Ruby)
  '__pycache__', // Python cache
  '.DS_Store', // macOS metadata
  'package-lock.json', // Often not needed for Browse
  'yarn.lock', // Often not needed for Browse
  'pnpm-lock.yaml',
  'public' // Often not needed for Browse
  // Add more common build artifacts, logs, or large folders if needed
])

// Maximum characters for the final JSON string result to avoid huge payloads
const MAX_RESULT_LENGTH = 20000 // Adjust as needed (approx 4k-5k tokens)

/**
 * Recursively reads a directory structure, skipping excluded items and respecting max depth.
 * @param dirPath Absolute path to the directory to read.
 * @param maxDepth Maximum recursion depth.
 * @param currentDepth Internal depth counter.
 * @returns A promise resolving to the DirectoryTree structure.
 */
export async function readDirectoryRecursive(
  dirPath: string,
  maxDepth: number,
  currentDepth = 0
): Promise<DirectoryTree> {
  const name = dirPath.split(/\/|\\/).pop() || dirPath // Get base name

  // Base case 1: Check exclusion list for the directory itself
  if (DEFAULT_EXCLUDE_ITEMS.has(name) && currentDepth > 0) {
    // Don't exclude the root requested dir
    console.log(`Skipping excluded directory: ${name}`)
    return { name, type: 'directory', children: [], error: `Skipped (excluded)` }
  }

  // Base case 2: Check depth limit
  if (currentDepth > maxDepth) {
    return { name, type: 'directory', children: [], error: `Max depth (${maxDepth}) reached` }
  }

  try {
    const dirents = await fs.readdir(dirPath, { withFileTypes: true })
    const children: DirectoryTree[] = []

    for (const dirent of dirents) {
      // Check exclude list for children
      if (DEFAULT_EXCLUDE_ITEMS.has(dirent.name)) {
        // console.log(`Skipping excluded item: ${dirent.name}`); // Can be verbose, uncomment if needed
        continue // Skip this item
      }

      const childPath = join(dirPath, dirent.name)
      if (dirent.isDirectory()) {
        // Recurse into subdirectory
        children.push(await readDirectoryRecursive(childPath, maxDepth, currentDepth + 1))
      } else if (dirent.isFile()) {
        children.push({ name: dirent.name, type: 'file' })
      }
      // Ignore other types like symbolic links, sockets, etc. for simplicity
    }
    // Sort children alphabetically (optional, but nice)
    children.sort((a, b) => a.name.localeCompare(b.name))
    return { name, type: 'directory', children }
  } catch (error: any) {
    console.error(`Error reading directory ${dirPath}:`, error)
    // Return an error node instead of throwing, so the whole process doesn't fail
    return {
      name,
      type: 'error',
      error: `Failed to read: ${error.message || 'Permission denied or path not found'}`
    }
  }
}

// /**
//  * Converts the DirectoryTree structure to a JSON string, truncating if it exceeds the size limit.
//  * @param tree The DirectoryTree object.
//  * @returns A JSON string representation (potentially indicating truncation).
//  */
// export function stringifyTree(tree: DirectoryTree): string {
//   let jsonString = ''
//   try {
//     // Use JSON.stringify with custom replacer could potentially handle circular refs if they ever occur, but unlikely here.
//     jsonString = JSON.stringify(tree, null, 2) // Pretty print with 2 spaces
//   } catch (e) {
//     console.error('Error stringifying directory tree:', e)
//     // Fallback for safety
//     return JSON.stringify({
//       name: tree.name,
//       type: 'error',
//       error: 'Failed to serialize directory tree'
//     })
//   }

//   // Check length and return truncated indicator if necessary
//   if (jsonString.length > MAX_RESULT_LENGTH) {
//     console.warn(
//       `Tree string length (${jsonString.length}) exceeds limit (${MAX_RESULT_LENGTH}), returning truncation indicator for: ${tree.name}`
//     )
//     // Return a specific structure indicating truncation, rather than broken JSON
//     return JSON.stringify(
//       {
//         name: tree.name,
//         type: 'directory',
//         error: `Output truncated due to excessive size (>${MAX_RESULT_LENGTH} characters). Contains ${tree.children?.length || 0} top-level items. Refine your request or increase maxDepth carefully.`
//         // We could potentially add just the top-level names here:
//         // children_preview: tree.children?.slice(0, 10).map(c => ({ name: c.name, type: c.type }))
//       },
//       null,
//       2
//     )
//   }
//   // Return the full JSON string if within limits
//   return jsonString
// }
/**
 * Recursively reads a directory structure and returns an indented text tree string.
 * Skips excluded items and respects max depth. Truncates if result is too long.
 * @param dirPath Absolute path to the directory to read.
 * @param maxDepth Maximum recursion depth.
 * @param currentDepth Internal depth counter.
 * @param indent Internal indentation string.
 * @returns A promise resolving to the text tree string (potentially truncated).
 */
// src/main/lib/file-system.ts

/**
 * Recursively reads directory structure and returns the OBJECT TREE.
 * Used for indexing and storing the structure.
 */
export async function getDirectoryTreeObject(
  dirPath: string,
  maxDepth: number,
  currentDepth = 0
): Promise<DirectoryTree> {
  const name = dirPath.split(/\/|\\/).pop() || dirPath

  // Exclude check (only if not root)
  if (DEFAULT_EXCLUDE_ITEMS.has(name) && currentDepth > 0) {
    return { name, type: 'directory', children: [], error: `Skipped (excluded)` }
  }
  // Depth check
  if (currentDepth > maxDepth) {
    return { name, type: 'directory', children: [], error: `Max depth (${maxDepth}) reached` }
  }

  try {
    const dirents = await fs.readdir(dirPath, { withFileTypes: true })
    const children: DirectoryTree[] = []
    const sortedDirents = dirents.sort((a, b) => a.name.localeCompare(b.name))

    for (const dirent of sortedDirents) {
      if (DEFAULT_EXCLUDE_ITEMS.has(dirent.name)) continue // Skip excluded children

      const childPath = join(dirPath, dirent.name)
      if (dirent.isDirectory()) {
        // Recurse but check next depth level against maxDepth
        children.push(await getDirectoryTreeObject(childPath, maxDepth, currentDepth + 1))
      } else if (dirent.isFile()) {
        children.push({ name: dirent.name, type: 'file' })
      }
    }
    return { name, type: 'directory', children }
  } catch (error: any) {
    console.error(`Error reading directory for object tree ${dirPath}:`, error)
    return { name, type: 'error', error: `Failed to read: ${error.message || 'Unknown error'}` }
  }
}

/**
 * Recursively reads directory structure and returns an indented TEXT TREE STRING.
 * Used for providing context via tool results to the AI.
 */
export async function getTextDirectoryTree(
  dirPath: string,
  maxDepth: number,
  currentDepth = 0,
  indent = ''
): Promise<string> {
  const name = dirPath.split(/\/|\\/).pop() || dirPath
  let output = ''
  let childOutput = '' // Accumulate child output separately for truncation check

  // Exclude check (only if not root)
  if (DEFAULT_EXCLUDE_ITEMS.has(name) && currentDepth > 0) {
    return `${indent}${name}/ [Excluded]\n`
  }
  // Depth check
  if (currentDepth > maxDepth) {
    return `${indent}${name}/ [... Max depth reached]\n`
  }

  try {
    const dirents = await fs.readdir(dirPath, { withFileTypes: true })
    // Add current directory entry
    output = currentDepth > 0 ? `${indent}${name}/\n` : `${name}/\n`

    const childIndent = indent + '  '
    const sortedDirents = dirents.sort((a, b) => a.name.localeCompare(b.name))

    for (const dirent of sortedDirents) {
      if (DEFAULT_EXCLUDE_ITEMS.has(dirent.name)) continue // Skip excluded children

      const childPath = join(dirPath, dirent.name)
      let currentChildOutput = ''
      if (dirent.isDirectory()) {
        currentChildOutput = await getTextDirectoryTree(
          childPath,
          maxDepth,
          currentDepth + 1,
          childIndent
        )
      } else if (dirent.isFile()) {
        currentChildOutput = `${childIndent}${dirent.name}\n`
      }

      // Check if adding this child exceeds the limit
      if (output.length + childOutput.length + currentChildOutput.length > MAX_RESULT_LENGTH) {
        console.warn(
          `Text tree exceeded limit (${MAX_RESULT_LENGTH} chars) during generation for ${name}, truncating.`
        )
        childOutput += `${childIndent}[... Output truncated due to size]\n`
        break // Stop processing further children for this directory
      }
      childOutput += currentChildOutput
    }

    // Handle empty directory case (after filtering exclusions)
    if (dirents.filter((d) => !DEFAULT_EXCLUDE_ITEMS.has(d.name)).length === 0) {
      if (currentDepth > 0) {
        // Already added dir name, just indicate empty
        output = `${indent}${name}/ [Empty]\n`
        childOutput = '' // No children to add
      } else {
        // Root is empty
        childOutput = `${childIndent}[Empty]\n`
      }
    }

    return output + childOutput // Combine directory line with children lines
  } catch (error: any) {
    console.error(`Error reading directory for text tree ${dirPath}:`, error)
    return `${indent}${name}/ [Error: ${error.message || 'Unknown error'}]\n`
  }
}
