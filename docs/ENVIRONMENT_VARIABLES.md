# Environment Variables Documentation

## Required Environment Variables

### OpenAI API Configuration
```bash
OPENAI_API_KEY=your_openai_api_key_here
```
- **Purpose**: API key for OpenAI GPT-4o-mini and Whisper
- **Where to get**: https://platform.openai.com/api-keys
- **Required for**: Translation, voice transcription, slang detection, formality adjustment

### Supabase Configuration
```bash
SUPABASE_URL=your_supabase_project_url
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
```
- **Purpose**: Database connection and authentication
- **Where to get**: Supabase project dashboard > Settings > API
- **Required for**: Translation caching, message storage, user management

### Vercel Configuration (Optional)
```bash
WEBHOOK_SECRET=your_webhook_secret_for_supabase_triggers
CRON_SECRET=your_cron_secret_for_scheduled_jobs
```
- **Purpose**: Security for webhooks and cron jobs
- **Where to get**: Generate random strings (32+ characters)
- **Required for**: Production security

### Development Configuration (Optional)
```bash
MOCK_TRANSLATION=false
EXPO_PUBLIC_MOCK_TRANSLATION=false
```
- **Purpose**: Enable/disable mock translation mode
- **Default**: false (use real OpenAI API)
- **Required for**: Development testing

## Setup Instructions

### 1. Local Development
1. Create `.env` file in project root
2. Copy the required variables above
3. Fill in your actual values
4. Run `vercel dev` to start local development server

### 2. Vercel Deployment
1. Go to Vercel Dashboard > Your Project > Settings > Environment Variables
2. Add each variable with its value
3. Deploy with `vercel deploy --prod`

### 3. Environment Variable Security
- **NEVER** commit `.env` file to git
- **NEVER** expose API keys in client-side code
- **ALWAYS** use environment variables in server-side code
- **ROTATE** API keys regularly

## API Endpoints

### Translation API
- **Endpoint**: `POST /api/translate`
- **Required**: `OPENAI_API_KEY`
- **Optional**: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` (for caching)

### Voice Transcription API
- **Endpoint**: `POST /api/transcribe-voice`
- **Required**: `OPENAI_API_KEY`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`

### Slang Detection API
- **Endpoint**: `POST /api/explain-slang`
- **Required**: `OPENAI_API_KEY`

### Formality Adjustment API
- **Endpoint**: `POST /api/adjust-formality`
- **Required**: `OPENAI_API_KEY`

## Cost Optimization

### OpenAI Usage
- **GPT-4o-mini**: $0.15/1M input tokens, $0.60/1M output tokens
- **Whisper**: $0.006/minute of audio
- **Estimated monthly cost**: <$25 for 100 users

### Caching Strategy
- Translation results cached in database
- Slang analysis cached in memory
- Formality adjustments cached in memory
- Reduces API calls by ~70%

## Troubleshooting

### Common Issues
1. **"Invalid API key"**: Check OPENAI_API_KEY is correct
2. **"Database connection failed"**: Check Supabase credentials
3. **"Rate limit exceeded"**: Implement exponential backoff
4. **"Translation failed"**: Check OpenAI service status

### Debug Mode
Set `NODE_ENV=development` to enable detailed logging
