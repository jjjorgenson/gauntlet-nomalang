import { adjustFormality } from '../lib/openai.js'

/**
 * Formality adjustment API endpoint
 * POST /api/adjust-formality
 * 
 * Request body:
 * {
 *   "text": "Hey, can u send that?",
 *   "level": "formal" // casual, neutral, or formal
 * }
 * 
 * Response:
 * {
 *   "adjustedText": "Good afternoon, would you kindly send that document?",
 *   "originalLevel": "casual",
 *   "newLevel": "formal"
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
    const { text, level } = req.body

    if (!text || typeof text !== 'string') {
      return res.status(400).json({
        error: 'Invalid request',
        message: 'Text is required and must be a string'
      })
    }

    if (!level || typeof level !== 'string') {
      return res.status(400).json({
        error: 'Invalid request',
        message: 'Level is required and must be a string'
      })
    }

    // Validate formality level
    const validLevels = ['casual', 'neutral', 'formal']
    if (!validLevels.includes(level.toLowerCase())) {
      return res.status(400).json({
        error: 'Invalid request',
        message: 'Level must be one of: casual, neutral, formal'
      })
    }

    if (text.length > 1000) {
      return res.status(400).json({
        error: 'Invalid request',
        message: 'Text must be less than 1000 characters'
      })
    }

    // Check cache first
    const cacheKey = `formality_${text}_${level}`
    const cachedResult = await getCachedFormalityAdjustment(cacheKey)
    
    if (cachedResult) {
      console.log('Cache hit for formality adjustment')
      return res.status(200).json(cachedResult)
    }

    // Call OpenAI for formality adjustment
    console.log('Calling OpenAI for formality adjustment:', { text, level })
    const adjustedText = await adjustFormality(text, level.toLowerCase())

    const result = {
      adjustedText,
      originalLevel: 'unknown', // We don't detect original level for now
      newLevel: level.toLowerCase(),
      timestamp: new Date().toISOString()
    }

    // Cache the result (async, don't wait)
    cacheFormalityAdjustment(cacheKey, result)
      .catch(error => console.error('Failed to cache formality adjustment:', error))

    return res.status(200).json(result)

  } catch (error) {
    console.error('Formality adjustment API error:', error)
    
    // Handle specific error types
    if (error.message.includes('Rate limit')) {
      return res.status(429).json({
        error: 'Rate limit exceeded',
        message: 'Please try again in a few minutes'
      })
    }
    
    // Generic server error
    return res.status(500).json({
      error: 'Formality adjustment failed',
      message: 'Unable to adjust formality at this time'
    })
  }
}

/**
 * Simple caching for formality adjustments
 * In production, this would use a proper cache like Redis
 */
const formalityCache = new Map()

async function getCachedFormalityAdjustment(key) {
  return formalityCache.get(key)
}

async function cacheFormalityAdjustment(key, result) {
  formalityCache.set(key, result)
  
  // Limit cache size to prevent memory issues
  if (formalityCache.size > 1000) {
    const firstKey = formalityCache.keys().next().value
    formalityCache.delete(firstKey)
  }
}
