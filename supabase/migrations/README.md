# NomaLang Database Migrations

## Setup Instructions

1. **Go to your Supabase Dashboard**
   - Navigate to your project
   - Go to SQL Editor

2. **Run migrations in order**:
   ```sql
   -- 1. First run: 001_initial_schema.sql
   -- This creates all tables, indexes, and enables RLS
   
   -- 2. Second run: 002_rls_policies.sql  
   -- This creates all Row Level Security policies
   
   -- 3. Third run: 003_storage_setup.sql
   -- This creates the voice-memos storage bucket
   ```

3. **Verify setup**:
   - Check that all 7 tables exist in the Table Editor
   - Verify RLS is enabled on all tables
   - Check that voice-memos bucket exists in Storage

## What Each Migration Does

### 001_initial_schema.sql
- Creates 7 core tables: users, conversations, conversation_participants, messages, message_translations, message_statuses, ai_annotations
- Adds performance indexes
- Enables RLS on all tables
- Sets up constraints and relationships

### 002_rls_policies.sql
- Creates comprehensive RLS policies for security
- Users can only see their own conversations and messages
- Service role can insert translations and annotations
- Proper authorization for all operations

### 003_storage_setup.sql
- Creates voice-memos storage bucket (25MB limit)
- Sets up storage RLS policies
- Users can only access voice files from their conversations

## Security Notes

- All tables have RLS enabled
- Users can only access data they're authorized to see
- Service role bypasses RLS for backend operations
- Voice files are private and conversation-scoped

## Next Steps

After running these migrations:
1. Test the app - it should connect to Supabase
2. Try creating a user account
3. Test sending messages between users
4. Verify real-time updates work
