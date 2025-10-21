import { createClient } from '@supabase/supabase-js'

console.log('Supabase URL:', process.env.EXPO_PUBLIC_SUPABASE_URL)
console.log('Supabase Key:', process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY)

export const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL,
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY
)

