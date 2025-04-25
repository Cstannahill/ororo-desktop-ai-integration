// src/main/context/rag-processor.ts

import OpenAI from 'openai'
import { type Project, type DirectoryTree } from '../types'
import { findRelevantInsights } from '../lib/database'
// Keep findNodeInTree helper local to this file or move to lib/file-system? Let's keep it here for now.

// --- Helper Function to find a node in the stored tree by relative path ---
function findNodeInTree(
  tree: DirectoryTree | null | undefined,
  relativePath: string
): DirectoryTree | null {
  if (!tree || typeof relativePath !== 'string') return null
  const parts = relativePath
    .normalize()
    .split(/[\\/]/)
    .filter((p) => p && p !== '.')
  if (parts.length === 0)
    return relativePath === tree.name || relativePath === '.' || relativePath === '' ? tree : null
  let currentNode: DirectoryTree | undefined = tree
  for (const part of parts) {
    if (!currentNode || currentNode.type !== 'directory' || !Array.isArray(currentNode.children))
      return null
    const foundChild = currentNode.children.find(
      (child) => child.name.toLowerCase() === part.toLowerCase()
    )
    if (!foundChild) return null
    currentNode = foundChild
  }
  return currentNode
}

// Type for the return value
export interface RagContextResult {
  relevantStructureContext: string
  memoryContext: string
}

/**
 * Processes the user query and loaded context to generate RAG context snippets.
 * Finds relevant structure snippets and memory snippets.
 */
export async function getRAGContext(
  lastUserMessage: string | null | undefined,
  activeProject: (Project & { rootPath?: string }) | null, // Accept full activeProject object
  projectTree: DirectoryTree | null,
  openaiClient: OpenAI | null
): Promise<RagContextResult> {
  let relevantStructureContext = ''
  let memoryContext = ''

  // --- RAG Step 1: Find Relevant Structure Context ---
  if (activeProject && projectTree && lastUserMessage) {
    try {
      const pathRegex = /([\w.-]+\/)*[\w.-]+\.?[\w]+/g // Simple path regex
      const mentionedPaths = lastUserMessage.match(pathRegex)
      // Focus on the last mentioned path for simplicity
      const targetPath = mentionedPaths ? mentionedPaths[mentionedPaths.length - 1] : null

      if (targetPath) {
        console.log(`RAGProcessor: Attempting to find node for path "${targetPath}"...`)
        const foundNode = findNodeInTree(projectTree, targetPath)
        if (foundNode) {
          console.log(`RAGProcessor: Found node: Type=${foundNode.type}, Error=${foundNode.error}`)
          relevantStructureContext = `\n\nRelevant context for "${targetPath}" in project '${activeProject.name}':`
          if (foundNode.error) {
            relevantStructureContext += `\nError accessing this item: ${foundNode.error}`
          } else if (foundNode.type === 'directory') {
            const childrenNames = Array.isArray(foundNode.children)
              ? foundNode.children.map(
                  (item: any) => `${item.name}${item.type === 'directory' ? '/' : ''}`
                )
              : []
            if (childrenNames.length > 0) {
              relevantStructureContext += `\nThis directory contains: [${childrenNames.join(', ')}]`
            } else {
              relevantStructureContext += `\nThis directory appears to be empty or contains only excluded items.`
            }
          } else if (foundNode.type === 'file') {
            relevantStructureContext += `\nThis is a file. Use 'read_file' tool to see content.`
          }
          console.log(
            `RAGProcessor: Adding relevant structure context: ${relevantStructureContext}`
          )
        } else {
          console.log(`RAGProcessor: Path "${targetPath}" not found in stored tree.`)
        }
      }
    } catch (ragError) {
      console.error('RAGProcessor: Error during structure processing:', ragError)
    }
  }

  // --- RAG Step 2: Find Relevant Memories ---
  if (lastUserMessage) {
    try {
      console.log(
        `RAGProcessor: Calling findRelevantInsights for query: "${lastUserMessage.substring(0, 50)}..."`
      )
      const relevantInsights = await findRelevantInsights(lastUserMessage, openaiClient, 3)
      console.log('RAGProcessor: findRelevantInsights results:', relevantInsights)
      if (relevantInsights.length > 0) {
        memoryContext = '\n\nPossibly relevant information from past interactions:'
        relevantInsights.forEach((insight) => {
          memoryContext += `\n- ${insight.text} (Similarity: ${insight.similarity.toFixed(3)})`
        })
        console.log('RAGProcessor: Adding memory context:', memoryContext)
      } else {
        console.log('RAGProcessor: No highly relevant memories found.')
      }
    } catch (memoryError) {
      console.error('RAGProcessor: Error finding relevant memories:', memoryError)
      memoryContext = '\n\nError retrieving memories.'
    }
  }

  return { relevantStructureContext, memoryContext }
}
