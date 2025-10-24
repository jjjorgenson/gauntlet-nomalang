import { detectSlang } from '../lib/openai.js'
import { supabase } from '../lib/supabase.js'

/**
 * Slang explanation API endpoint
 * POST /api/explain-slang
 * 
 * Request body:
 * {
 *   "text": "That's cap, fr fr",
 *   "context": "casual conversation" // optional
 * }
 * 
 * Response:
 * {
 *   "has_slang": true,
 *   "terms": [
 *     {
 *       "term": "cap",
 *       "explanation": "lie or false statement",
 *       "context": "Gen Z slang, primarily US"
 *     }
 *   ]
 * }
 */
export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({
      error: 'Method not allowed',
      message: 'Only POST requests are supported'
    })
  }

  try {
    // Validate request body
    const { text, context = 'general' } = req.body

    if (!text || typeof text !== 'string') {
      return res.status(400).json({
        error: 'Invalid request',
        message: 'Text is required and must be a string'
      })
    }

    if (text.length > 1000) {
      return res.status(400).json({
        error: 'Invalid request',
        message: 'Text must be less than 1000 characters'
      })
    }

    // Check if we already have slang analysis for this text
    const cacheKey = `slang_${text}_${context}`
    const cachedResult = await getCachedSlangAnalysis(cacheKey)
    
    if (cachedResult) {
      console.log('Cache hit for slang analysis')
      return res.status(200).json(cachedResult)
    }

    // Call OpenAI for slang detection
    console.log('Calling OpenAI for slang detection:', { text, context })
    const result = await detectSlang(text)

    // Cache the result (async, don't wait)
    cacheSlangAnalysis(cacheKey, result)
      .catch(error => console.error('Failed to cache slang analysis:', error))

    return res.status(200).json(result)

  } catch (error) {
    console.error('Slang explanation API error:', error)
    
    // Handle specific error types
    if (error.message.includes('Rate limit')) {
      return res.status(429).json({
        error: 'Rate limit exceeded',
        message: 'Please try again in a few minutes'
      })
    }
    
    // Generic server error
    return res.status(500).json({
      error: 'Slang analysis failed',
      message: 'Unable to analyze slang at this time'
    })
  }
}

/**
 * Simple caching for slang analysis
 * In production, this would use a proper cache like Redis
 */
const slangCache = new Map()

async function getCachedSlangAnalysis(key) {
  return slangCache.get(key)
}

async function cacheSlangAnalysis(key, result) {
  slangCache.set(key, result)
  
  // Limit cache size to prevent memory issues
  if (slangCache.size > 1000) {
    const firstKey = slangCache.keys().next().value
    slangCache.delete(firstKey)
  }
}
