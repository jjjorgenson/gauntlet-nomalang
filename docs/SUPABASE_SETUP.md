# Supabase Setup Guide for NomaLang

## 🚀 Quick Start

1. **Create a Supabase Project**
   - Go to [supabase.com](https://supabase.com) and create a new project
   - Choose your organization and enter project details
   - Wait for the project to be set up (usually 2-3 minutes)

2. **Get Your Project Credentials**
   - Go to Settings > API in your Supabase dashboard
   - Copy your Project URL and anon/public key

3. **Configure Environment Variables**
   ```bash
   # Create .env file (if not exists)
   touch .env

   # Add your Supabase credentials
   EXPO_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
   EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
   ```

4. **Set Up Database Schema**
   - Go to SQL Editor in your Supabase dashboard
   - Copy and paste the contents of `supabase-schema.sql`
   - Run the SQL to create all tables and policies

5. **Enable Authentication**
   - Go to Authentication > Settings
   - Configure your site URL (for development: `http://localhost:8081`)
   - Enable email confirmations if desired

6. **Configure Real-time**
   - Go to Database > Replication
   - Ensure real-time is enabled for all tables (it should be by default)

## 📋 Database Tables Created

The schema creates these tables:
- `users` - User profiles and preferences
- `conversations` - Chat conversations (direct and group)
- `participants` - Group chat memberships
- `messages` - Chat messages with UUID-based idempotency
- `message_status` - Read receipts and delivery status
- `translations` - Cached AI translations
- `typing_indicators` - Real-time typing status

## 🔐 Row Level Security (RLS)

All tables have RLS enabled with policies that:
- Users can only see conversations they participate in
- Users can only send messages to conversations they're part of
- Users can only update their own status and profile

## 🎯 Next Steps After Setup

1. **Test Authentication**
   ```typescript
   import { useAuth } from '@/lib/auth'

   function LoginScreen() {
     const { signIn, user, loading } = useAuth()
     // Implement login UI
   }
   ```

2. **Test Messaging**
   ```typescript
   import { sendMessage, getConversations } from '@/lib/messaging'

   // Send a message
   await sendMessage(conversationId, 'Hello!', userId)

   // Get user's conversations
   const conversations = await getConversations(userId)
   ```

3. **Set Up Real-time Subscriptions**
   ```typescript
   import { subscribeToMessages } from '@/lib/messaging'

   useEffect(() => {
     const subscription = subscribeToMessages(conversationId, (message) => {
       console.log('New message:', message)
     })

     return () => subscription.unsubscribe()
   }, [conversationId])
   ```

## 🔧 Development Tips

- **Local Development**: Use `npx expo start --tunnel` for testing push notifications
- **Database Browser**: Use Supabase Dashboard > Table Editor to inspect data
- **Logs**: Check Supabase Dashboard > Edge Functions for AI processing logs
- **Real-time Testing**: Open multiple browser tabs or devices to test real-time features

## 🚨 Important Notes

- **Environment Variables**: Make sure `.env` is in `.gitignore` (it should be already)
- **TypeScript Types**: The database types in `lib/supabase.ts` will be auto-generated once you connect
- **Authentication**: The auth context handles session persistence automatically
- **Error Handling**: Always wrap Supabase calls in try-catch blocks

## 🔍 Troubleshooting

**"Project not found" errors:**
- Double-check your Supabase URL and API key
- Ensure your project is fully initialized (can take a few minutes)

**Real-time not working:**
- Check that real-time is enabled in Database > Replication
- Ensure RLS policies allow the operations you're trying

**Authentication issues:**
- Verify site URL in Authentication > Settings matches your dev server
- Check browser console for detailed error messages

Once you've completed the setup, you can start building the chat interface!
