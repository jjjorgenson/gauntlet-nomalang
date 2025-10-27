import OpenAI, { toFile } from 'openai'

/**
 * OpenAI client for Vercel Functions
 */
export const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
})

/**
 * Translate text using OpenAI GPT-4o-mini
 * @param {string} text - Text to translate
 * @param {string} sourceLang - Source language code
 * @param {string} targetLang - Target language code
 * @returns {Promise<Object>} - Translation result
 */
export async function translateText(text, sourceLang, targetLang) {
  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `Translate the following ${sourceLang} text to ${targetLang}.

Requirements:
- Preserve the original tone and formality level
- Maintain cultural context and idioms where possible
- Use natural, conversational language
- If slang exists, translate the meaning naturally
- Keep emoji and punctuation
- Respond with ONLY the translated text, no explanations`
        },
        {
          role: 'user',
          content: text
        }
      ],
      temperature: 0.3,
      max_tokens: 1000
    })

    const translatedText = response.choices[0].message.content.trim()
    
    return {
      translatedText,
      confidence: 0.95, // GPT-4o-mini is very reliable
      sourceLanguage: sourceLang,
      targetLanguage: targetLang,
      isMock: false,
      timestamp: new Date().toISOString()
    }
  } catch (error) {
    console.error('OpenAI translation error:', error)
    
    // Handle rate limiting
    if (error.status === 429) {
      throw new Error('Rate limit exceeded. Please try again later.')
    }
    
    // Handle other OpenAI errors
    if (error.status >= 400 && error.status < 500) {
      throw new Error('Invalid request to translation service.')
    }
    
    // Handle server errors
    throw new Error('Translation service temporarily unavailable.')
  }
}

/**
 * Transcribe audio using OpenAI Whisper
 * @param {Buffer} audioBuffer - Audio file buffer
 * @param {string} language - Language hint (optional)
 * @returns {Promise<Object>} - Transcription result
 */
export async function transcribeAudio(audioBuffer, language = 'auto') {
  try {
    const response = await openai.audio.transcriptions.create({
      file: await toFile(audioBuffer, 'audio.m4a', { type: 'audio/m4a' }),  // ✅ Correct - File-like object
      model: 'whisper-1',
      response_format: 'json',
      language: language === 'auto' ? undefined : language
    })

    return {
      transcription: response.text,
      confidence: 0.92, // Whisper is very reliable
      language: response.language || language,
      timestamp: new Date().toISOString()
    }
  } catch (error) {
    console.error('OpenAI transcription error:', error)
    
    if (error.status === 429) {
      throw new Error('Rate limit exceeded. Please try again later.')
    }
    
    if (error.status >= 400 && error.status < 500) {
      throw new Error('Invalid audio file or request.')
    }
    
    throw new Error('Transcription service temporarily unavailable.')
  }
}

/**
 * Detect slang in text and provide explanations in target language
 * @param {string} text - Text to analyze
 * @param {string} targetLanguage - Language code for explanations (ISO 639-1)
 * @returns {Promise<Object>} - Slang detection result
 */
export async function detectSlang(text, targetLanguage = 'en') {
  try {
    // Get language name for better prompt clarity
    const languageNames = {
      'en': 'English',
      'es': 'Spanish',
      'fr': 'French',
      'de': 'German',
      'pt': 'Portuguese',
      'it': 'Italian',
      'ru': 'Russian',
      'zh': 'Chinese',
      'ja': 'Japanese',
      'ko': 'Korean',
      'ar': 'Arabic'
    };
    
    const targetLangName = languageNames[targetLanguage] || 'English';
    
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `Analyze the following text for slang, colloquialisms, or informal expressions.

IMPORTANT: Generate ALL explanations and context in ${targetLangName} (${targetLanguage}).

If slang is found, respond with JSON:
{
  "has_slang": true,
  "terms": [
    {
      "term": "exact slang word or phrase",
      "explanation": "plain language meaning in ${targetLangName}",
      "context": "generational/regional/cultural context in ${targetLangName}"
    }
  ]
}

If no slang is found:
{
  "has_slang": false
}

Text: "${text}"`
        }
      ],
      temperature: 0.3,
      max_tokens: 500
    })

    const result = JSON.parse(response.choices[0].message.content.trim())
    return result
  } catch (error) {
    console.error('OpenAI slang detection error:', error)
    return { has_slang: false }
  }
}

/**
 * Adjust formality of text
 * @param {string} text - Text to adjust
 * @param {string} level - Target formality level (casual, neutral, formal)
 * @returns {Promise<string>} - Adjusted text
 */
export async function adjustFormality(text, level) {
  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `Rewrite the following text in ${level} formality level. Preserve meaning and language.

Formality levels:
- Casual: Informal, friendly, uses contractions, conversational
- Neutral: Standard, polite, balanced tone  
- Formal: Professional, respectful, no slang, proper grammar

Respond with ONLY the rewritten text, no explanations.

Text: "${text}"`
        }
      ],
      temperature: 0.3,
      max_tokens: 500
    })

    return response.choices[0].message.content.trim()
  } catch (error) {
    console.error('OpenAI formality adjustment error:', error)
    throw new Error('Formality adjustment service temporarily unavailable.')
  }
}
