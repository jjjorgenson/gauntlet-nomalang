# AI Pipeline Architecture
## OpenAI Integration & Prompt Engineering

**Version:** 1.0  
**Last Updated:** October 22, 2025  
**Parent Doc:** [TECHNICAL_ARCHITECTURE.md](./TECHNICAL_ARCHITECTURE.md)

---

## Overview

The AI pipeline leverages OpenAI's GPT-4o-mini and Whisper APIs to power translation, transcription, slang detection, formality adjustment, and cultural hints.

---

## OpenAI Models

### GPT-4o-mini
- **Use Cases:** Translation, slang detection, formality adjustment, cultural hints
- **Cost:** $0.15 per 1M input tokens, $0.60 per 1M output tokens
- **Speed:** ~1-2s response time
- **Context Window:** 128k tokens

### Whisper
- **Use Case:** Voice transcription
- **Cost:** $0.006 per minute
- **Speed:** ~10-30s for 1-minute audio
- **Languages:** 99 languages supported

---

## Translation Pipeline

### Strategy
**Context-Aware Translation** - Preserve tone, formality, cultural nuances

### Prompt Template
```
Translate the following {source_lang} text to {target_lang}.

Requirements:
- Preserve the original tone and formality level
- Maintain cultural context and idioms where possible
- Use natural, conversational language
- If slang exists, translate the meaning naturally
- Keep emoji and punctuation

Text: "{content}"
```

### Example
**Input:** "¿Qué onda?" (Spanish)  
**Output:** "What's up?" (English)

Not: "What wave?" (literal translation)

---

## Voice Transcription Pipeline

### Whisper API Integration

**Request:**
```javascript
const transcription = await openai.audio.transcriptions.create({
  file: audioFile,
  model: 'whisper-1',
  response_format: 'json',
  language: 'auto' // Auto-detect
})
```

**Response:**
```json
{
  "text": "Hello, this is a test message",
  "language": "en",
  "duration": 3.5
}
```

---

## Slang Detection

### Prompt Template
```
Analyze the following text for slang, colloquialisms, or informal expressions.

If slang is found, respond with JSON:
{
  "has_slang": true,
  "terms": [
    {
      "term": "exact slang word or phrase",
      "explanation": "plain language meaning",
      "context": "generational/regional/cultural context"
    }
  ]
}

If no slang is found:
{
  "has_slang": false
}

Text: "{content}"
```

### Example
**Input:** "That's cap, fr fr"  
**Output:**
```json
{
  "has_slang": true,
  "terms": [
    {
      "term": "cap",
      "explanation": "lie or false statement",
      "context": "Gen Z slang, primarily US"
    },
    {
      "term": "fr fr",
      "explanation": "for real for real (emphasizing truth)",
      "context": "Gen Z slang, internet culture"
    }
  ]
}
```

---

## Formality Adjustment

### Prompt Template
```
Rewrite the following text in three formality levels. Preserve meaning and language.

1. Casual: Informal, friendly, uses contractions, conversational
2. Neutral: Standard, polite, balanced tone
3. Formal: Professional, respectful, no slang, proper grammar

Text: "{content}"

Respond in JSON:
{
  "casual": "...",
  "neutral": "...",
  "formal": "..."
}
```

### Example
**Input:** "Hey, can u send that?"  
**Output:**
```json
{
  "casual": "Hey! Can you send that over?",
  "neutral": "Hello, could you please send that?",
  "formal": "Good afternoon, would you kindly send that document?"
}
```

---

## Cultural Hints Generation

### Prompt Template
```
Check if today ({date}) is a significant holiday or cultural event in countries where {language} is spoken.

If yes, respond with JSON:
{
  "has_event": true,
  "event": "holiday name",
  "description": "brief 1-2 sentence explanation of significance",
  "date": "YYYY-MM-DD",
  "country": "primary country"
}

If no significant event:
{
  "has_event": false
}

Language: {language}
Date: {date}
```

### Example
**Input:** Language=es, Date=2025-11-01  
**Output:**
```json
{
  "has_event": true,
  "event": "Día de los Muertos",
  "description": "Day of the Dead - a Mexican holiday honoring deceased loved ones with altars, offerings, and celebrations",
  "date": "2025-11-01",
  "country": "Mexico"
}
```

---

## Cost Optimization Techniques

### 1. Aggressive Caching
- Cache translations while message exists
- Cache slang explanations permanently
- Cache cultural hints per date/country

### 2. Client-Side Pre-Processing
- Use `franc` library for language detection
- Only fallback to OpenAI if confidence <80%

### 3. Batch Operations
- Cultural hints: Process all users at once (daily)
- Group by country to reduce duplicate API calls

### 4. Model Selection
- Use GPT-4o-mini (10x cheaper than GPT-4)
- Only use GPT-4 if quality issues arise

### 5. On-Demand Features
- Slang detection only when user clicks button
- Not automatic for every message

---

## Error Handling

### Rate Limits
- OpenAI: 3,500 requests/min (paid tier)
- Retry with exponential backoff: 1s, 2s, 4s

### Timeouts
- Translation: 10s timeout
- Transcription: 60s timeout (longer audio)
- Show user-friendly error if timeout

### Invalid Responses
- If JSON parsing fails, log error and return empty result
- Don't crash - graceful degradation

---

## Monitoring

### Metrics to Track
- API call count per endpoint
- Average latency
- Error rate
- Cost per day
- Cache hit rate

### Alerts
- Daily cost > $1
- Error rate > 5%
- Latency > 5s

---

## Summary

AI Pipeline provides:
- ✅ Context-aware translation
- ✅ Voice transcription (99 languages)
- ✅ Slang detection and explanation
- ✅ Formality adjustment (3 levels)
- ✅ Cultural hints generation
- ✅ Cost-optimized (<$25/month)

---

**End of AI Pipeline Architecture Document**
