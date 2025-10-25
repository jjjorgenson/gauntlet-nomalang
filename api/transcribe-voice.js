import { transcribeAudio } from '../lib/openai.js'
import { supabase } from '../lib/supabase.js'

/**
 * Voice transcription API endpoint
 * POST /api/transcribe-voice
 * 
 * Request body:
 * {
 *   "audioUrl": "https://supabase.storage/audio/file.m4a",
 *   "language": "en" // optional, defaults to auto-detect
 * }
 * 
 * Response:
 * {
 *   "transcription": "Hello world",
 *   "confidence": 0.92,
 *   "language": "en",
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
    const { audioUrl, language = 'auto' } = req.body

    if (!audioUrl || typeof audioUrl !== 'string') {
      return res.status(400).json({
        error: 'Invalid request',
        message: 'audioUrl is required and must be a string'
      })
    }

    // Validate audio URL format
    if (!audioUrl.startsWith('https://') || !audioUrl.includes('supabase')) {
      return res.status(400).json({
        error: 'Invalid request',
        message: 'audioUrl must be a valid Supabase Storage URL'
      })
    }

    // Download audio file from Supabase Storage
    console.log('Downloading audio from:', audioUrl)
    const audioBuffer = await downloadAudioFromSupabase(audioUrl)

    if (!audioBuffer) {
      return res.status(400).json({
        error: 'Audio download failed',
        message: 'Unable to download audio file from storage'
      })
    }

    // Validate audio file size (max 25MB)
    if (audioBuffer.length > 25 * 1024 * 1024) {
      return res.status(400).json({
        error: 'Audio file too large',
        message: 'Audio file must be less than 25MB'
      })
    }

    // Call OpenAI Whisper for transcription
    console.log('Calling OpenAI Whisper for transcription')
    const result = await transcribeAudio(audioBuffer, language)

    return res.status(200).json(result)

  } catch (error) {
    console.error('Transcription API error:', error)
    
    // Handle specific error types
    if (error.message.includes('Rate limit')) {
      return res.status(429).json({
        error: 'Rate limit exceeded',
        message: 'Please try again in a few minutes'
      })
    }
    
    if (error.message.includes('Invalid audio')) {
      return res.status(400).json({
        error: 'Invalid audio file',
        message: 'Audio file format not supported or corrupted'
      })
    }
    
    // Generic server error
    return res.status(500).json({
      error: 'Transcription failed',
      message: 'Unable to transcribe audio at this time'
    })
  }
}

/**
 * Download audio file from Supabase Storage
 * @param {string} audioUrl - Supabase Storage URL
 * @returns {Promise<Buffer|null>} - Audio buffer or null if failed
 */
async function downloadAudioFromSupabase(audioUrl) {
  try {
    // Extract bucket and file path from URL
    // URL format: https://...supabase.co/storage/v1/object/public/voice-messages/user/conversation/file.m4a
    const urlParts = audioUrl.split('/storage/v1/object/public/')
    if (urlParts.length !== 2) {
      throw new Error('Invalid Supabase Storage URL format')
    }
    
    const fullPath = urlParts[1] // "voice-messages/user/conversation/file.m4a"
    const pathParts = fullPath.split('/')
    const bucket = pathParts[0] // "voice-messages"
    const filePath = pathParts.slice(1).join('/') // "user/conversation/file.m4a"
    
    console.log(`🔍 Downloading from bucket: ${bucket}, file: ${filePath}`)
    
    // Download file using Supabase client
    const { data, error } = await supabase.storage
      .from(bucket)
      .download(filePath)

    if (error) {
      console.error('Supabase storage download error:', error)
      return null
    }

    // Convert blob to buffer
    const arrayBuffer = await data.arrayBuffer()
    return Buffer.from(arrayBuffer)

  } catch (error) {
    console.error('Failed to download audio from Supabase:', error)
    return null
  }
}
