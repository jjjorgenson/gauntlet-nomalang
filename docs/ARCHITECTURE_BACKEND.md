# Backend Architecture
## Vercel Serverless Functions

**Version:** 1.0  
**Last Updated:** October 22, 2025  
**Parent Doc:** [TECHNICAL_ARCHITECTURE.md](./TECHNICAL_ARCHITECTURE.md)

---

## Overview

The backend consists of serverless Node.js functions deployed on Vercel. Each function handles specific responsibilities: webhooks from Supabase, AI orchestration, and scheduled jobs. **All code is written in JavaScript (ES6+) with ES Modules** - no TypeScript, no build step required.

---

## Project Structure

```
backend/
├── package.json
├── vercel.json                # Vercel configuration
├── api/                       # Serverless functions (auto-detected by Vercel)
│   ├── webhook/
│   │   ├── message-created.js
│   │   └── message-edited.js
│   ├── transcribe-voice.js
│   ├── explain-slang.js
│   ├── adjust-formality.js
│   └── cron/
│       └── cultural-hints.js
├── lib/                       # Shared utilities
│   ├── supabase.js           # Supabase client (service_role)
│   ├── openai.js             # OpenAI client
│   ├── translation.js        # Translation logic
│   ├── transcription.js      # Voice transcription
│   └── push-notifications.js # Expo Push
└── utils/
    ├── error-handler.js
    └── validation.js
```

---

## Vercel Configuration

**vercel.json:**
```json
{
  "functions": {
    "api/**/*.js": {
      "maxDuration": 60
    }
  },
  "crons": [
    {
      "path": "/api/cron/cultural-hints",
      "schedule": "0 0 * * *"
    }
  ],
  "env": {
    "SUPABASE_URL": "@supabase-url",
    "SUPABASE_SERVICE_KEY": "@supabase-service-key",
    "OPENAI_API_KEY": "@openai-api-key",
    "WEBHOOK_SECRET": "@webhook-secret",
    "CRON_SECRET": "@cron-secret"
  }
}
```

**package.json:**
```json
{
  "type": "module",
  "dependencies": {
    "@supabase/supabase-js": "^2.39.0",
    "openai": "^4.20.0",
    "expo-server-sdk": "^3.7.0"
  }
}
```

**Note:** Using ES Modules (type: "module") for modern JavaScript syntax. No TypeScript, no build step needed.

---

## Webhook Handlers

### Message Created Webhook

**File:** `api/webhook/message-created.js`

**Purpose:** Process new messages - detect language, translate for recipients, detect slang, check cultural context

**Flow:**
1. Validate webhook signature
2. Extract message from payload
3. Detect language (if not already detected by client)
4. Query recipient languages
5. Translate message for each recipient language (if different)
6. Cache translation in `message_translations` table
7. Detect slang (async, low priority)
8. Check cultural context (async)
9. Send push notifications to offline recipients
10. Return 200 OK

**Error Handling:**
- Return 200 immediately (don't block webhook)
- Log errors for debugging
- Retry failed operations internally

---

### Message Edited Webhook

**File:** `api/webhook/message-edited.js`

**Purpose:** Handle message edits - invalidate translations, re-trigger translation pipeline

**Flow:**
1. Validate webhook signature
2. Check if content actually changed
3. Delete all existing translations
4. Re-trigger translation pipeline (same as message-created)
5. Send "message edited" push notification
6. Return 200 OK

---

## AI Endpoints

### Transcribe Voice

**File:** `api/transcribe-voice.js`

**Purpose:** Transcribe voice message audio using OpenAI Whisper

**Flow:**
1. Authenticate user (JWT)
2. Download audio from Supabase Storage
3. Call OpenAI Whisper API
4. Update message with transcription
5. Detect transcription language
6. Trigger translation pipeline
7. Return success

**Timeout:** 60s (Whisper can take 10-30s for longer audio)

---

### Explain Slang

**File:** `api/explain-slang.js`

**Purpose:** On-demand slang detection and explanation

**Flow:**
1. Authenticate user
2. Fetch message from Supabase
3. Check if annotation already exists (cache)
4. If not cached, call OpenAI with prompt
5. Parse JSON response
6. Save to `ai_annotations` table
7. Return explanation to client

**Prompt:**
```
Analyze the following text for slang or colloquialisms. 
If found, respond with JSON: 
{
  "has_slang": true, 
  "terms": [
    {
      "term": "word", 
      "explanation": "meaning",
      "context": "cultural/regional context"
    }
  ]
}
If no slang: {"has_slang": false}

Text: "{message.content}"
```

---

### Adjust Formality

**File:** `api/adjust-formality.js`

**Purpose:** Generate casual, neutral, formal versions of message

**Flow:**
1. Authenticate user
2. Validate input text
3. Call OpenAI with prompt (single call generates all 3)
4. Return all 3 versions

**Prompt:**
```
Rewrite the following text in three formality levels:
1. Casual (informal, friendly, contractions)
2. Neutral (standard, polite, balanced)
3. Formal (professional, respectful, no slang)

Preserve meaning and original language.

Text: "{text}"

Respond in JSON:
{
  "casual": "...",
  "neutral": "...",
  "formal": "..."
}
```

---

## Cron Jobs

### Cultural Hints (Daily)

**File:** `api/cron/cultural-hints.js`

**Schedule:** Midnight UTC (00:00)

**Purpose:** Check upcoming holidays for all users, generate cultural hints

**Flow:**
1. Validate cron secret
2. Query all active users
3. Group by language/country
4. For each group:
   - Check holidays in next 7 days (OpenAI or holiday API)
   - If relevant holiday found, create annotation
5. Save annotations to `ai_annotations` table
6. Return count of hints generated

**Optimization:** Batch users by country to reduce API calls

---

## Shared Libraries

### Supabase Client

**File:** `lib/supabase.js`

```javascript
import { createClient } from '@supabase/supabase-js'

export const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY, // service_role key (bypass RLS)
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
)
```

**Note:** Backend uses `service_role` key to bypass RLS policies.

---

### OpenAI Client

**File:** `lib/openai.js`

```javascript
import OpenAI from 'openai'

export const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
})

// Helper: Translate with context
export async function translateWithContext(text, sourceLang, targetLang) {
  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      {
        role: 'system',
        content: `Translate from ${sourceLang} to ${targetLang}. Preserve tone, formality, cultural context. Natural, conversational translation.`
      },
      { role: 'user', content: text }
    ],
    temperature: 0.3
  })
  return response.choices[0].message.content.trim()
}
```

---

### Push Notifications

**File:** `lib/push-notifications.js`

```javascript
import { Expo } from 'expo-server-sdk'

const expo = new Expo()

export async function sendPushNotification(pushToken, message) {
  if (!Expo.isExpoPushToken(pushToken)) {
    return
  }

  const messages = [{
    to: pushToken,
    sound: 'default',
    title: message.title,
    body: message.body,
    data: message.data
  }]

  const chunks = expo.chunkPushNotifications(messages)
  for (const chunk of chunks) {
    try {
      await expo.sendPushNotificationsAsync(chunk)
    } catch (error) {
      console.error('Push notification error:', error)
    }
  }
}
```

---

## Error Handling

### Webhook Errors
- Always return 200 OK (prevent Supabase retries)
- Log errors internally
- Queue failed operations for retry

### API Errors
- Return appropriate HTTP status codes
- Include error details in response
- Log to Vercel logs

### OpenAI Errors
- Rate limit: Exponential backoff (retry after 1s, 2s, 4s)
- Timeout: 30s timeout, show error to user
- Invalid response: Fallback to simple translation (no context)

---

## Rate Limiting

### Current Strategy
No rate limiting (class project, <100 users)

### Future Considerations
- Per-user rate limits (prevent abuse)
- Per-IP rate limits (prevent spam)
- Use Vercel Edge Config or Upstash Redis

---

## Cost Optimization

### Strategies
1. **Cache translations** - Check DB before calling OpenAI
2. **Client-side language detection** - Use franc library, avoid OpenAI call
3. **Batch operations** - Cultural hints processed in batch
4. **On-demand slang** - Only when user requests, not automatic
5. **GPT-4o-mini** - 10x cheaper than GPT-4

---

## Security

### Webhook Validation
```javascript
function validateWebhook(req) {
  const authHeader = req.headers.authorization
  const expectedSecret = `Bearer ${process.env.WEBHOOK_SECRET}`
  return authHeader === expectedSecret
}
```

### JWT Validation
```javascript
import { jwtVerify } from 'jose'

async function validateJWT(req) {
  const token = req.headers.authorization?.split(' ')[1]
  if (!token) throw new Error('No token')

  const { payload } = await jwtVerify(
    token,
    new TextEncoder().encode(process.env.SUPABASE_JWT_SECRET)
  )
  return payload
}
```

---

## Monitoring

### Vercel Logs
- View in Vercel Dashboard
- Real-time during development
- Search and filter by function

### OpenAI Usage
- Track via OpenAI Dashboard
- Set up usage alerts ($25 threshold)
- Monitor cost per endpoint

### Custom Metrics (Future)
- Translation success rate
- Average translation latency
- Slang detection accuracy

---

## Testing

### Local Development
```bash
# Install Vercel CLI
npm i -g vercel

# Run locally
vercel dev

# Test webhook
curl -X POST http://localhost:3000/api/webhook/message-created \
  -H "Authorization: Bearer test-secret" \
  -H "Content-Type: application/json" \
  -d '{"record": {...}}'
```

### Unit Tests
- Translation logic
- Language detection fallback
- Prompt construction

### Integration Tests
- End-to-end webhook flow
- OpenAI API mocks

---

## Deployment

### Manual Deploy
```bash
vercel deploy --prod
```

### Automatic Deploy
- Push to `main` branch → auto-deploy to production
- Push to other branches → preview deployment

### Environment Variables
Set in Vercel Dashboard:
- `SUPABASE_URL`
- `SUPABASE_SERVICE_KEY`
- `OPENAI_API_KEY`
- `WEBHOOK_SECRET`
- `CRON_SECRET`

---

## Summary

Backend provides:
- ✅ Webhook handling for real-time message processing
- ✅ AI orchestration (translation, transcription, slang, cultural)
- ✅ Push notification delivery
- ✅ Scheduled cultural hints cron job
- ✅ Serverless (zero ops, auto-scaling)
- ✅ Cost-optimized (<$25/month)

---

**End of Backend Architecture Document**
