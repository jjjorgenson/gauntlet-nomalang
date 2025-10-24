# Frontend-Backend Integration Setup

## Overview
This document explains how to configure the frontend to connect to the deployed backend APIs.

## Backend URL Configuration

### Option 1: Environment Variable (Recommended)
Add to your `.env` file:
```bash
EXPO_PUBLIC_BACKEND_URL=https://your-vercel-app.vercel.app
```

### Option 2: Local Development
For local development with `vercel dev`:
```bash
EXPO_PUBLIC_BACKEND_URL=http://localhost:3000
```

### Option 3: Default Configuration
If no environment variable is set, the app defaults to:
```
http://localhost:3000
```

## API Endpoints

The frontend will automatically connect to these endpoints:

- **Translation**: `{BACKEND_URL}/api/translate`
- **Voice Transcription**: `{BACKEND_URL}/api/transcribe-voice`
- **Slang Detection**: `{BACKEND_URL}/api/explain-slang`
- **Formality Adjustment**: `{BACKEND_URL}/api/adjust-formality`

## Integration Status

### ✅ Completed
- Translation service updated to use real API
- Voice service updated with transcription API
- AI features service created for slang and formality
- Configuration system implemented
- Error handling and fallbacks implemented

### 🔄 Next Steps
1. **Get Backend URL**: Obtain the Vercel deployment URL from backend agent
2. **Configure Environment**: Set `EXPO_PUBLIC_BACKEND_URL` in `.env`
3. **Test Integration**: Run the app and test all features
4. **Deploy**: Deploy frontend with production backend URL

## Testing Checklist

### Translation Testing
- [ ] Send English message → Should translate to Spanish (no [MOCK] prefix)
- [ ] Test different language pairs
- [ ] Test error handling (backend down)
- [ ] Test caching (same message should be faster)

### Voice Testing
- [ ] Record voice message → Should upload to Supabase
- [ ] Voice message should transcribe with real API
- [ ] Test voice playback
- [ ] Test error handling

### AI Features Testing
- [ ] Test slang explanation (tap on slang terms)
- [ ] Test formality adjustment (magic wand feature)
- [ ] Test error handling for AI features

## Configuration Files

### Frontend Configuration
- `src/lib/config.js` - Centralized configuration
- `src/services/translation.js` - Updated for real API
- `src/services/voice.js` - Updated with transcription
- `src/services/aiFeatures.js` - New AI features service

### Backend Configuration
- `vercel.json` - Vercel deployment configuration
- `api/translate.js` - Translation endpoint
- `api/transcribe-voice.js` - Voice transcription endpoint
- `api/explain-slang.js` - Slang detection endpoint
- `api/adjust-formality.js` - Formality adjustment endpoint

## Error Handling

The frontend includes comprehensive error handling:

1. **API Unavailable**: Falls back to mock mode with user notification
2. **Network Errors**: Retries with exponential backoff
3. **Invalid Responses**: Validates response format and handles gracefully
4. **Timeout**: Configurable timeout with fallback options

## Cost Optimization

- **Translation Caching**: Results cached in database
- **Voice Transcription**: Cached in database
- **AI Features**: Cached in memory
- **Rate Limiting**: Implemented on backend
- **Estimated Cost**: <$25/month for 100 users

## Troubleshooting

### Common Issues

1. **"Translation API endpoint not configured"**
   - Check `EXPO_PUBLIC_BACKEND_URL` is set correctly
   - Verify backend is deployed and accessible

2. **"Network error" or "API timeout"**
   - Check backend URL is correct
   - Verify backend is running
   - Check network connectivity

3. **"Invalid API response format"**
   - Backend API may have changed
   - Check API contract in `docs/memory-bank/apiContract.md`

4. **Voice transcription not working**
   - Check Supabase Storage is configured
   - Verify audio file upload is successful
   - Check transcription API endpoint

### Debug Mode

Enable debug logging by setting:
```bash
NODE_ENV=development
```

This will show detailed API calls and responses in the console.

## Next Steps

1. **Get Backend URL**: Contact backend agent for deployment URL
2. **Update Environment**: Set `EXPO_PUBLIC_BACKEND_URL` in `.env`
3. **Test Integration**: Run app and test all features
4. **Document Issues**: Report any integration issues
5. **Deploy**: Deploy frontend with production configuration

## Success Criteria

Integration is successful when:
- ✅ Messages translate with real OpenAI (no [MOCK] prefix)
- ✅ Voice messages transcribe with real Whisper API
- ✅ Slang explanation works with real API
- ✅ Formality adjustment works with real API
- ✅ Error handling works gracefully
- ✅ All features work offline/online
- ✅ Performance is acceptable (<2s translation latency)
