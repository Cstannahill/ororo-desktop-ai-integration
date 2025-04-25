import { app } from 'electron'
import { is } from '@electron-toolkit/utils'
import { join } from 'path'
import sqlite3 from 'sqlite3'
import { open, type Database } from 'sqlite'
import { cosineSimilarity, getEmbedding } from './ai-utils'
import type OpenAI from 'openai'

// Define Project type (can move to shared types later)
export interface Project {
  id: number
  name: string
  rootPath: string
  lastIndexed: string
}
interface InsightRecord {
  id: number
  text: string
  embedding: Buffer // Embeddings are stored as Buffers from BLOBs
  sourceProjectId: number | null
  timestamp: string
}
const dbFolderPath = app.getPath('userData')
const dbFilePath = join(dbFolderPath, 'app-database.sqlite')
console.log(`DB_LOG: Database path determined: ${dbFilePath}`) // LOG 1

const migrationsSourcePath = is.dev
  ? join(app.getAppPath(), 'src/main/lib/migrations')
  : join(__dirname, 'migrations')
console.log(`DB_LOG: Using migrations path: ${migrationsSourcePath}`) // LOG 2

let dbPromise: Promise<Database<sqlite3.Database, sqlite3.Statement>> | null = null

export async function initializeDatabase(): Promise<Database<sqlite3.Database, sqlite3.Statement>> {
  if (dbPromise) {
    console.log('DB_LOG: initializeDatabase - Returning existing promise.')
    return dbPromise
  }

  console.log('DB_LOG: initializeDatabase - Starting...') // LOG 3
  // eslint-disable-next-line no-async-promise-executor
  dbPromise = new Promise(async (resolve, reject) => {
    // Wrap in explicit promise for detailed logging
    let db: Database<sqlite3.Database, sqlite3.Statement> | null = null
    try {
      console.log('DB_LOG: initializeDatabase - Calling sqlite.open...') // LOG 4
      db = await open({
        filename: dbFilePath,
        driver: sqlite3.Database
      })
      console.log('DB_LOG: initializeDatabase - Database connection opened.') // LOG 5

      console.log(
        `DB_LOG: initializeDatabase - Preparing to run migrations from: ${migrationsSourcePath}`
      ) // LOG 6
      // Use migrations - Wrap in try/catch for specific migration errors
      try {
        await db.migrate({
          migrationsPath: migrationsSourcePath
        })
        console.log('DB_LOG: initializeDatabase - Database schema migration complete.') // LOG 7
      } catch (migrationError) {
        console.error(
          `DB_LOG: initializeDatabase - FATAL: Database migration failed (Path: ${migrationsSourcePath}):`,
          migrationError
        ) // LOG 8 (Error)
        // try { if (db) await db.close(); } catch(closeErr) { console.error("DB_LOG: Failed to close DB after migration error:", closeErr); }
        // app.quit(); // Temporarily disable quit on migration error
        reject(migrationError) // Reject the main promise
        return
      }

      console.log('DB_LOG: initializeDatabase - Initialization successful, resolving promise.') // LOG 9
      resolve(db) // Resolve with the db instance
    } catch (error) {
      console.error(
        'DB_LOG: initializeDatabase - FATAL: Error during DB open or migration setup:',
        error
      ) // LOG 10 (Error)
      // try { if (db) await db.close(); } catch(closeErr) { console.error("DB_LOG: Failed to close DB after outer error:", closeErr); }
      // app.quit(); // Temporarily disable quit on other init errors
      reject(error) // Reject the main promise
    }
  })

  // Add a catch to the promise itself to handle rejections if initializeDatabase().catch() isn't used in index.ts
  dbPromise.catch(() => {
    // This catch is mainly to prevent UnhandledPromiseRejectionWarning if the caller doesn't catch.
    // The actual error handling/logging happens within the promise constructor now.
    dbPromise = null // Reset promise on failure
  })

  return dbPromise
}

export async function getDb(): Promise<Database<sqlite3.Database, sqlite3.Statement>> {
  if (!dbPromise) {
    console.warn('DB_LOG: getDb called before initializeDatabase. Attempting initialization.')
    // Re-running initialization might lead to race conditions if called rapidly.
    // Better to ensure initializeDatabase is always called and awaited first in app.whenReady.
    return initializeDatabase()
    // Consider throwing instead:
    // throw new Error('Database has not been initialized properly.');
  }
  try {
    // Await the promise to get the DB instance or throw if it rejected during init
    const db = await dbPromise
    // console.log("DB_LOG: getDb - Returning DB instance."); // Can be noisy
    return db
  } catch (error) {
    console.error('DB_LOG: getDb - Could not get DB instance because initialization failed.', error)
    // Re-throwing helps signal the issue to the caller
    throw new Error(`Database initialization failed previously: ${error}`)
  }
}

export async function loadIndexedProjects(): Promise<Project[]> {
  console.log('DB: Loading indexed projects...')
  try {
    const db = await getDb() // Get initialized DB instance
    const projects = await db.all<Project[]>(
      `SELECT id, name, rootPath, lastIndexed
             FROM Projects
             ORDER BY name ASC`
    )
    console.log(`DB: Found ${projects.length} projects.`)
    return projects || [] // Return empty array if null/undefined
  } catch (error) {
    console.error('DB: Error loading projects from database:', error)
    return [] // Return empty array on error
  }
}

/**
 * Saves a text insight along with its vector embedding to the database.
 * @param text The text content of the insight/memory.
 * @param openaiClient Initialized OpenAI client for generating embeddings.
 * @param sourceProjectId Optional ID of the project this insight relates to.
 */
export async function saveInsight(
  text: string,
  openaiClient: OpenAI | null,
  sourceProjectId: number | null = null
): Promise<boolean> {
  console.log('DB: Attempting to save insight...')
  if (!text || !openaiClient) {
    console.error('DB: Cannot save insight, missing text or OpenAI client.')
    return false
  }

  // 1. Get Embedding
  const embeddingVector = await getEmbedding(text, openaiClient)
  if (!embeddingVector) {
    console.error('DB: Failed to generate embedding for insight text.')
    return false
  }

  // 2. Convert embedding (number[]) to Buffer for BLOB storage
  // SQLite doesn't have a native array type, BLOB is standard for raw data.
  // We store as Float32Array buffer for consistency.
  const embeddingBuffer = Buffer.from(new Float32Array(embeddingVector).buffer)

  // 3. Save to Database
  try {
    const db = await getDb()
    const sql = `
            INSERT INTO UserInsights (text, embedding, sourceProjectId, timestamp)
            VALUES (?, ?, ?, datetime('now'))
        `
    await db.run(sql, text, embeddingBuffer, sourceProjectId)
    console.log('DB: Insight saved successfully.')
    return true
  } catch (error) {
    console.error('DB: Error saving insight to database:', error)
    return false
  }
}

/**
 * Finds relevant insights by comparing query embedding to stored embeddings.
 * NOTE: Loads ALL embeddings into memory - inefficient for large datasets.
 * @param queryText The user query or text to find relevant insights for.
 * @param openaiClient Initialized OpenAI client.
 * @param limit Max number of relevant insights to return.
 * @returns A promise resolving to an array of { text: string, similarity: number }.
 */
export async function findRelevantInsights(
  queryText: string,
  openaiClient: OpenAI | null,
  limit: number = 3
): Promise<{ text: string; similarity: number }[]> {
  console.log(`DB_DEBUG: findRelevantInsights called for query: "${queryText.substring(0, 50)}..."`) // <<-- ADD LOG
  if (!queryText || !openaiClient) return []

  const queryEmbedding = await getEmbedding(queryText, openaiClient)
  if (!queryEmbedding) {
    console.error('DB_DEBUG: findRelevantInsights - Could not get query embedding.') // <<-- ADD LOG
    return []
  }
  console.log(
    `DB_DEBUG: findRelevantInsights - Got query embedding (dim: ${queryEmbedding.length}).`
  ) // <<-- ADD LOG

  try {
    const db = await getDb()
    const allInsights = await db.all<InsightRecord[]>(
      'SELECT id, text, embedding FROM UserInsights ORDER BY timestamp DESC'
    )
    console.log(`DB_DEBUG: findRelevantInsights - Loaded ${allInsights.length} insights from DB.`) // <<-- ADD LOG
    if (allInsights.length === 0) return []

    const similarities: { text: string; similarity: number; id?: number }[] = [] // Add ID for debugging
    for (const insight of allInsights) {
      if (insight.embedding) {
        try {
          const storedVector = Array.from(new Float32Array(insight.embedding.buffer))
          if (storedVector.length === queryEmbedding.length) {
            const similarity = cosineSimilarity(queryEmbedding, storedVector)
            console.log(
              `DB_DEBUG: findRelevantInsights - Comparing with Insight ID ${insight.id}, Similarity: ${similarity.toFixed(4)}`
            ) // <<-- ADD LOG
            similarities.push({ id: insight.id, text: insight.text, similarity })
          } else {
            console.warn(
              `DB_DEBUG: findRelevantInsights - Mismatched vector length for Insight ID ${insight.id}.`
            ) // <<-- ADD LOG
          }
        } catch (bufferError) {
          console.error(
            `DB_DEBUG: findRelevantInsights - Error processing embedding for Insight ID ${insight.id}:`,
            bufferError
          ) // <<-- ADD LOG
        }
      }
    }

    similarities.sort((a, b) => b.similarity - a.similarity)
    const topResults = similarities.slice(0, limit)
    console.log(
      `DB_DEBUG: findRelevantInsights - Top ${topResults.length} results:`,
      topResults.map((r) => ({ id: r.id, sim: r.similarity.toFixed(4) }))
    ) // <<-- ADD LOG (Concise)

    return topResults
  } catch (error) {
    console.warn(error)
    return []
  }
}
