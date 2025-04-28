// src/main/lib/database.ts

import { app } from 'electron'
import { is } from '@electron-toolkit/utils'
import { join } from 'path'
import sqlite3 from 'sqlite3'
import { open, type Database } from 'sqlite'
import { type Project } from '../types' // Import Project type
import { getEmbedding, cosineSimilarity } from './ai-utils' // Import helpers
import OpenAI from 'openai' // Import OpenAI type

// Interface for internal DB record for Insights
interface InsightRecord {
  id: number
  text: string
  embedding: Buffer // Embeddings are stored as Buffers from BLOBs
  sourceProjectId: number | null
  timestamp: string
}
// Interface for Preference record
interface PreferenceRecord {
  key: string
  value: string
}

const dbFolderPath = app.getPath('userData')
const dbFilePath = join(dbFolderPath, 'app-database.sqlite')
console.log(`DB_LOG: Database path determined: ${dbFilePath}`)

const migrationsSourcePath = is.dev
  ? join(app.getAppPath(), 'src/main/lib/migrations')
  : join(__dirname, 'migrations') // This assumes migrations are copied relative to compiled output in prod
console.log(`DB_LOG: Using migrations path: ${migrationsSourcePath}`)

let dbPromise: Promise<Database<sqlite3.Database, sqlite3.Statement>> | null = null

/**
 * Initializes the SQLite database connection and runs migrations.
 */
export async function initializeDatabase(): Promise<Database<sqlite3.Database, sqlite3.Statement>> {
  if (dbPromise) {
    console.log('DB_LOG: initializeDatabase - Returning existing promise.')
    return dbPromise
  }
  console.log('DB_LOG: initializeDatabase - Starting...')
  dbPromise = new Promise(async (resolve, reject) => {
    let db: Database<sqlite3.Database, sqlite3.Statement> | null = null
    try {
      console.log('DB_LOG: initializeDatabase - Calling sqlite.open...')
      db = await open({ filename: dbFilePath, driver: sqlite3.Database })
      console.log('DB_LOG: initializeDatabase - Database connection opened.')
      console.log(
        `DB_LOG: initializeDatabase - Preparing to run migrations from: ${migrationsSourcePath}`
      )
      try {
        await db.migrate({ migrationsPath: migrationsSourcePath })
        console.log('DB_LOG: initializeDatabase - Database schema migration complete.')
      } catch (migrationError) {
        console.error(
          `DB_LOG: initializeDatabase - FATAL: Database migration failed (Path: ${migrationsSourcePath}):`,
          migrationError
        )
        reject(migrationError)
        return // Reject and exit promise executor
      }
      await db.exec('PRAGMA journal_mode = WAL;')
      console.log('DB_LOG: initializeDatabase - WAL mode enabled.')
      console.log('DB_LOG: initializeDatabase - Initialization successful, resolving promise.')
      resolve(db)
    } catch (error) {
      console.error(
        'DB_LOG: initializeDatabase - FATAL: Error during DB open or migration setup:',
        error
      )
      reject(error) // Reject the main promise
    }
  })
  // Catch unhandled rejections on the promise itself and reset
  dbPromise.catch((err) => {
    console.error('DB_LOG: initializeDatabase - Unhandled promise rejection during init.', err)
    dbPromise = null
    // Optionally quit app here too if init fails badly
    // app.quit();
  })
  return dbPromise
}

/**
 * Gets the initialized database instance. Throws if not initialized.
 */
export async function getDb(): Promise<Database<sqlite3.Database, sqlite3.Statement>> {
  if (!dbPromise) {
    // This should ideally not happen if initializeDatabase is called correctly on startup
    console.error('DB_LOG: getDb called before database promise was initialized!')
    throw new Error('Database has not been initialized. Call initializeDatabase first.')
  }
  try {
    // Await the promise - it will resolve with the DB instance or reject if init failed
    const db = await dbPromise
    return db
  } catch (error) {
    console.error('DB_LOG: getDb - Could not get DB instance because initialization failed.', error)
    // Re-throw the error to indicate failure to the caller
    throw new Error(`Database initialization failed previously: ${error}`)
  }
}

/**
 * Loads the list of indexed projects from the database.
 */
export async function loadIndexedProjects(): Promise<Project[]> {
  console.log('DB: Loading indexed projects...')
  try {
    const db = await getDb() // Get initialized DB instance
    const projects = await db.all<Project[]>(
      `SELECT id, name, rootPath, lastIndexed
             FROM Projects
             ORDER BY name ASC`
    )
    console.log(`DB: Found ${projects?.length || 0} projects.`)
    return projects || [] // Return empty array if null/undefined
  } catch (error) {
    console.error('DB: Error loading projects from database:', error)
    return [] // Return empty array on error
  }
}

/**
 * Saves a text insight and its embedding to the database.
 */
export async function saveInsight(
  text: string,
  openaiClient: OpenAI | null,
  sourceProjectId: number | null = null
): Promise<boolean> {
  console.log('DB: Attempting to save insight...')
  if (!text) {
    console.warn('DB: Cannot save insight with empty text.')
    return false
  }
  if (!openaiClient) {
    console.error('DB: Cannot save insight, missing OpenAI client for embedding.')
    return false
  }

  // 1. Get Embedding
  const embeddingVector = await getEmbedding(text, openaiClient)
  if (!embeddingVector) {
    console.error('DB: Failed to generate embedding for insight text.')
    return false
  }

  // 2. Convert embedding to Buffer
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
 * Finds relevant insights using cosine similarity (in-memory).
 * WARNING: Loads ALL embeddings into memory. Inefficient for large datasets.
 */
export async function findRelevantInsights(
  queryText: string,
  openaiClient: OpenAI | null,
  limit: number = 3
): Promise<{ text: string; similarity: number }[]> {
  console.log(`DB_DEBUG: findRelevantInsights called for query: "${queryText.substring(0, 50)}..."`)
  if (!queryText || !openaiClient) return []

  // 1. Get query embedding
  const queryEmbedding = await getEmbedding(queryText, openaiClient)
  if (!queryEmbedding) {
    console.error('DB_DEBUG: findRelevantInsights - Could not get query embedding.')
    return []
  }
  console.log(
    `DB_DEBUG: findRelevantInsights - Got query embedding (dim: ${queryEmbedding.length}).`
  )

  try {
    const db = await getDb()
    // 2. Load ALL insights
    const allInsights = await db.all<InsightRecord[]>(
      'SELECT id, text, embedding FROM UserInsights ORDER BY timestamp DESC'
    )
    console.log(`DB_DEBUG: findRelevantInsights - Loaded ${allInsights.length} insights from DB.`)
    if (allInsights.length === 0) return []

    // 3. Calculate similarities
    const similarities: { text: string; similarity: number; id?: number }[] = []
    for (const insight of allInsights) {
      if (insight.embedding && insight.embedding.buffer.byteLength > 0) {
        // Check buffer has data
        try {
          // Ensure buffer length is multiple of 4 for Float32
          if (insight.embedding.buffer.byteLength % 4 !== 0) {
            console.warn(
              `DB_DEBUG: Invalid buffer length (${insight.embedding.buffer.byteLength}) for insight ID ${insight.id}`
            )
            continue
          }
          const storedVector = Array.from(new Float32Array(insight.embedding.buffer))
          if (storedVector.length === queryEmbedding.length) {
            const similarity = cosineSimilarity(queryEmbedding, storedVector)
            console.log(
              `DB_DEBUG: Comparing with Insight ID ${insight.id}, Similarity: ${similarity.toFixed(4)}`
            )
            similarities.push({ id: insight.id, text: insight.text, similarity })
          } else {
            console.warn(`DB_DEBUG: Embedding dimension mismatch for insight ID ${insight.id}`)
          }
        } catch (bufferError) {
          console.error(
            `DB_DEBUG: Error processing buffer for insight ID ${insight.id}:`,
            bufferError
          )
        }
      } else {
        console.warn(`DB_DEBUG: Empty or null embedding found for insight ID ${insight.id}`)
      }
    }

    // 4. Sort & Limit
    similarities.sort((a, b) => b.similarity - a.similarity)
    const topResults = similarities.slice(0, limit)
    console.log(
      `DB_DEBUG: findRelevantInsights - Top ${topResults.length} results:`,
      topResults.map((r) => ({ id: r.id, sim: r.similarity.toFixed(4) }))
    )

    return topResults
  } catch (error) {
    console.error('DB: Error finding relevant insights:', error)
    return []
  }
}

// --- Preference Functions ---

/**
 * Retrieves a specific user preference value by key.
 */
export async function getPreference(key: string): Promise<string | null> {
  console.log(`DB: Getting preference for key: ${key}`)
  if (!key) return null
  try {
    const db = await getDb()
    const result = await db.get<PreferenceRecord>(
      `SELECT value FROM UserPreferences WHERE key = ?`,
      key
    )
    console.log(
      `DB: Preference result for "${key}": ${result?.value === undefined ? 'Not Found' : 'Found'}`
    )
    return result?.value ?? null // Return value or null if not found
  } catch (error) {
    console.error(`DB: Error getting preference for key "${key}":`, error)
    return null
  }
}

/**
 * Retrieves all user preferences as a key-value object.
 */
export async function getAllPreferences(): Promise<Record<string, string>> {
  console.log('DB: Getting all preferences...')
  try {
    const db = await getDb()
    const results = await db.all<PreferenceRecord[]>(`SELECT key, value FROM UserPreferences`)
    const preferences: Record<string, string> = {}
    ;(results || []).forEach((row) => {
      if (row.key) {
        preferences[row.key] = row.value ?? ''
      } // Use empty string for null values
    })
    console.log(`DB: Loaded ${Object.keys(preferences).length} preferences.`)
    return preferences
  } catch (error) {
    console.error('DB: Error loading all preferences:', error)
    return {} // Return empty object on error
  }
}

/**
 * Sets (inserts or updates) a user preference.
 */
export async function setPreference(key: string, value: string): Promise<boolean> {
  console.log(`DB: Setting preference "${key}" to "${value?.substring(0, 50)}..."`)
  if (!key) {
    console.error('DB: Cannot set preference with empty key.')
    return false
  }
  // Allow setting null/undefined as value to effectively delete? Or require specific delete fn?
  // For now, require value to be string. Could check typeof value !== 'string'
  try {
    const db = await getDb()
    const sql = `INSERT INTO UserPreferences (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value;`
    await db.run(sql, key, value) // Allow value to be null/undefined if needed by changing type
    console.log(`DB: Preference "${key}" saved successfully.`)
    return true
  } catch (error) {
    console.error(`DB: Error setting preference for key "${key}":`, error)
    return false
  }
}
