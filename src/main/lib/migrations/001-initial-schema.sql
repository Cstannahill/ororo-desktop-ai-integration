-- src/main/lib/migrations/001-initial-schema.sql

-- Migration number: 001
-- Description: Initial database schema setup

-- Stores information about indexed project folders
CREATE TABLE IF NOT EXISTS Projects (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    name          TEXT    NOT NULL,         -- Name of the root folder
    rootPath      TEXT    NOT NULL UNIQUE,  -- Absolute path to the project root
    lastIndexed   DATETIME,                 -- When the structure was last scanned
    structureJson TEXT                      -- Store the DirectoryTree JSON blob here initially
);

-- Stores simple key-value user preferences
CREATE TABLE IF NOT EXISTS UserPreferences (
    key           TEXT PRIMARY KEY NOT NULL,
    value         TEXT
);

-- Foundational table for storing text snippets and their vector embeddings for RAG
CREATE TABLE IF NOT EXISTS UserInsights (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    text            TEXT NOT NULL,          -- The actual text snippet (preference, learning, code example summary)
    embedding       BLOB,                   -- Placeholder for vector embedding (specific handling needed later)
    sourceProjectId INTEGER NULL,           -- Optional: Link insight back to a project
    timestamp       DATETIME DEFAULT CURRENT_TIMESTAMP, -- When the insight was stored
    FOREIGN KEY(sourceProjectId) REFERENCES Projects(id)
);

-- Indexes for faster lookups (optional but recommended)
CREATE INDEX IF NOT EXISTS idx_projects_path ON Projects(rootPath);
CREATE INDEX IF NOT EXISTS idx_insights_timestamp ON UserInsights(timestamp);