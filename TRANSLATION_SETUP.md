# Translation System Setup

## Environment Variables

Create a `.env` file in the project root with the following variables:

```bash
# OpenAI Configuration
OPENAI_API_KEY=your_openai_api_key_here
MOCK_TRANSLATION=true

# Supabase Configuration (already set up)
EXPO_PUBLIC_SUPABASE_URL=your_supabase_url
EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your_supabase_key
```

## Testing the Translation System

1. **Mock Mode (Default)**: Set `MOCK_TRANSLATION=true` to test the UI without API calls
2. **Real API Mode**: Set `MOCK_TRANSLATION=false` and provide a valid `OPENAI_API_KEY`

## Features Implemented

### Phase 1: Mock Translation Service ✅
- ✅ Translation service with mock responses
- ✅ Language detection using franc
- ✅ Translation logic and caching
- ✅ Mock mode for development

### Phase 2: Translation UI Components ✅
- ✅ TranslatedMessage component with nested bubble UI
- ✅ Auto-translate toggle in ConversationScreen
- ✅ On-demand translation button
- ✅ Language indicators and confidence scores
- ✅ Loading states and error handling

## How to Test

1. **Start the app**: `npx expo start`
2. **Open a conversation** with messages from other users
3. **Toggle auto-translate** using the button at the top
4. **Test on-demand translation** by tapping "Translate" button
5. **Verify mock translations** show `[MOCK LANGUAGE]` prefix

## Next Steps (Phase 3)

- Create Vercel translation API endpoint
- Wire up real OpenAI integration
- Add database methods for caching
- Add user settings persistence

## Security Notes

- ✅ `.env` files are gitignored
- ✅ API keys are not committed
- ✅ Mock mode prevents accidental API calls
- ✅ Input validation in translation service
