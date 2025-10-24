import { translateText } from '../lib/openai.js'
import { getCachedTranslation, cacheTranslation, getMessage } from '../lib/supabase.js'

/**
 * Translation API endpoint
 * POST /api/translate
 * 
 * Request body:
 * {
 *   "text": "Hello world",
 *   "targetLanguage": "es", 
 *   "sourceLanguage": "en"
 * }
 * 
 * Response:
 * {
 *   "translatedText": "Hola mundo",
 *   "sourceLanguage": "en",
 *   "targetLanguage": "es", 
 *   "confidence": 0.95,
 *   "isMock": false,
 *   "timestamp": "2025-10-23T..."
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
    const { text, targetLanguage, sourceLanguage } = req.body

    if (!text || typeof text !== 'string') {
      return res.status(400).json({
        error: 'Invalid request',
        message: 'Text is required and must be a string'
      })
    }

    if (!targetLanguage || typeof targetLanguage !== 'string') {
      return res.status(400).json({
        error: 'Invalid request', 
        message: 'targetLanguage is required and must be a string'
      })
    }

    if (!sourceLanguage || typeof sourceLanguage !== 'string') {
      return res.status(400).json({
        error: 'Invalid request',
        message: 'sourceLanguage is required and must be a string'
      })
    }

    // Validate language codes (ISO 639-1)
    if (sourceLanguage.length !== 2 || targetLanguage.length !== 2) {
      return res.status(400).json({
        error: 'Invalid request',
        message: 'Language codes must be 2 characters (ISO 639-1)'
      })
    }

    // Don't translate if source and target are the same
    if (sourceLanguage === targetLanguage) {
      return res.status(200).json({
        translatedText: text,
        sourceLanguage,
        targetLanguage,
        confidence: 1.0,
        isMock: false,
        timestamp: new Date().toISOString()
      })
    }

    // Check for cached translation first
    const cacheKey = `${text}_${sourceLanguage}_${targetLanguage}`
    console.log('Checking cache for:', cacheKey)
    
    // For now, we'll implement a simple text-based cache
    // In production, you might want to use a more sophisticated caching strategy
    const cachedResult = await getCachedTranslationByText(text, sourceLanguage, targetLanguage)
    
    if (cachedResult) {
      console.log('Cache hit for translation')
      return res.status(200).json({
        translatedText: cachedResult.translated_content,
        sourceLanguage,
        targetLanguage,
        confidence: 0.95,
        isMock: false,
        timestamp: cachedResult.created_at,
        cached: true
      })
    }

    // Call OpenAI for translation
    console.log('Calling OpenAI for translation:', { text, sourceLanguage, targetLanguage })
    const result = await translateText(text, sourceLanguage, targetLanguage)

    // Cache the result (async, don't wait)
    cacheTranslationByText(text, sourceLanguage, targetLanguage, result.translatedText)
      .catch(error => console.error('Failed to cache translation:', error))

    // Return the result
    return res.status(200).json(result)

  } catch (error) {
    console.error('Translation API error:', error)
    
    // Handle specific error types
    if (error.message.includes('Rate limit')) {
      return res.status(429).json({
        error: 'Rate limit exceeded',
        message: 'Please try again in a few minutes'
      })
    }
    
    if (error.message.includes('Invalid request')) {
      return res.status(400).json({
        error: 'Invalid request',
        message: error.message
      })
    }
    
    // Generic server error
    return res.status(500).json({
      error: 'Translation failed',
      message: 'Unable to translate text at this time'
    })
  }
}

/**
 * Simple text-based caching for translations
 * In production, this would use a proper cache like Redis
 */
const translationCache = new Map()

async function getCachedTranslationByText(text, sourceLang, targetLang) {
  const key = `${text}_${sourceLang}_${targetLang}`
  return translationCache.get(key)
}

async function cacheTranslationByText(text, sourceLang, targetLang, translation) {
  const key = `${text}_${sourceLang}_${targetLang}`
  translationCache.set(key, {
    translated_content: translation,
    created_at: new Date().toISOString()
  })
}
