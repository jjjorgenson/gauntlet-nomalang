import { createClient } from '@supabase/supabase-js'

/**
 * Supabase client for Vercel Functions
 * Uses service_role key to bypass RLS policies
 */
export const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
)

/**
 * Cache a translation in the database
 * @param {string} messageId - Message ID
 * @param {string} targetLanguage - Target language code
 * @param {string} translatedContent - Translated text
 * @returns {Promise<Object>} - Database result
 */
export async function cacheTranslation(messageId, targetLanguage, translatedContent) {
  try {
    const { data, error } = await supabase
      .from('message_translations')
      .insert({
        message_id: messageId,
        target_language: targetLanguage,
        translated_content: translatedContent
      })
      .select()
      .single()

    if (error) {
      console.error('Error caching translation:', error)
      throw error
    }

    return data
  } catch (error) {
    console.error('Failed to cache translation:', error)
    throw error
  }
}

/**
 * Check if translation already exists in cache
 * @param {string} messageId - Message ID
 * @param {string} targetLanguage - Target language code
 * @returns {Promise<Object|null>} - Cached translation or null
 */
export async function getCachedTranslation(messageId, targetLanguage) {
  try {
    const { data, error } = await supabase
      .from('message_translations')
      .select('translated_content, created_at')
      .eq('message_id', messageId)
      .eq('target_language', targetLanguage)
      .single()

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
      console.error('Error fetching cached translation:', error)
      throw error
    }

    return data
  } catch (error) {
    console.error('Failed to fetch cached translation:', error)
    return null
  }
}

/**
 * Get message by ID
 * @param {string} messageId - Message ID
 * @returns {Promise<Object|null>} - Message data or null
 */
export async function getMessage(messageId) {
  try {
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('id', messageId)
      .single()

    if (error && error.code !== 'PGRST116') {
      console.error('Error fetching message:', error)
      throw error
    }

    return data
  } catch (error) {
    console.error('Failed to fetch message:', error)
    return null
  }
}
