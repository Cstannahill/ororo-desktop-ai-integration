// src/main/lib/ai-utils.ts

import OpenAI from 'openai'

/**
 * Calculates the cosine similarity between two vectors (arrays of numbers).
 * Assumes vectors are non-zero and have the same dimension.
 */
export function cosineSimilarity(vecA: number[], vecB: number[]): number {
  if (!vecA || !vecB || vecA.length !== vecB.length || vecA.length === 0) {
    return 0 // Or throw an error, handle invalid input
  }

  let dotProduct = 0.0
  let magnitudeA = 0.0
  let magnitudeB = 0.0

  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i]
    magnitudeA += vecA[i] * vecA[i]
    magnitudeB += vecB[i] * vecB[i]
  }

  magnitudeA = Math.sqrt(magnitudeA)
  magnitudeB = Math.sqrt(magnitudeB)

  if (magnitudeA === 0 || magnitudeB === 0) {
    return 0 // Avoid division by zero
  } else {
    return dotProduct / (magnitudeA * magnitudeB)
  }
}

/**
 * Generates a vector embedding for the given text using OpenAI API.
 * @param text The text to embed.
 * @param openaiClient The initialized OpenAI client.
 * @returns A promise resolving to the embedding vector (number[]) or null on error.
 */
export async function getEmbedding(
  text: string,
  openaiClient: OpenAI | null
): Promise<number[] | null> {
  if (!openaiClient || !text) {
    return null
  }
  // Ensure the input is not excessively long for the embedding model
  const cleanText = text.replace(/\n/g, ' ').trim().substring(0, 4000) // Limit input size roughly

  if (!cleanText) {
    return null
  }

  try {
    console.log(`AI_UTILS: Requesting embedding for text: "${cleanText.substring(0, 50)}..."`)
    const response = await openaiClient.embeddings.create({
      model: 'text-embedding-3-small', // Efficient and effective model
      input: cleanText
    })
    console.log('AI_UTILS: Embedding received.')
    return response.data[0]?.embedding || null
  } catch (error) {
    console.error('AI_UTILS: Error getting embedding from OpenAI:', error)
    return null
  }
}
