# Security Architecture

**Version:** 1.0  
**Last Updated:** October 22, 2025  
**Parent Doc:** [TECHNICAL_ARCHITECTURE.md](./TECHNICAL_ARCHITECTURE.md)

---

## Authentication

### Supabase Auth (JWT)
- Email/password authentication
- JWT tokens with 1-hour expiry
- Automatic token refresh
- Tokens stored in AsyncStorage (React Native)

### Token Flow
1. User logs in → Supabase returns JWT
2. Client stores JWT in AsyncStorage
3. Client includes JWT in Authorization header
4. Supabase validates JWT on every request
5. JWT refreshed automatically before expiry

---

## Authorization

### Row Level Security (RLS)
- All tables have RLS enabled
- Policies enforce data access at database level
- Backend uses `service_role` key (bypasses RLS)
- Clients use `anon` key (RLS enforced)

### Key Policies
- Users can only read/write messages in their conversations
- Users can only edit their own messages
- Only backend can insert translations
- Read receipts enforced per-user

---

## API Security

### Webhook Authentication
- Bearer token in Authorization header
- Secret stored in Vercel environment variables
- Validated on every webhook request

### User API Authentication
- JWT in Authorization header
- Validated using Supabase JWT secret
- User ID extracted from JWT payload

---

## Data Security

### Encryption
- **In-Transit:** All HTTPS (TLS 1.3)
- **At-Rest:** Supabase encrypts database at rest
- **No E2E Encryption:** Messages readable by backend (required for AI)

### Sensitive Data
- Passwords: Hashed by Supabase Auth (bcrypt)
- API Keys: Stored in environment variables
- JWT Secret: Never exposed to client

---

## Privacy

### User Data
- Users can view profiles of conversation participants
- Users cannot view arbitrary user profiles
- No public user directory

### Message Data
- Messages only visible to conversation participants
- RLS policies enforce conversation membership
- Deleted conversations cascade delete messages

---

## Limitations (Class Project)

### Not Implemented
- ❌ End-to-end encryption
- ❌ Two-factor authentication
- ❌ Rate limiting (backend)
- ❌ CAPTCHA (bot prevention)
- ❌ IP-based blocking

### Acceptable for Demo
- Messages stored in plaintext (required for AI features)
- No GDPR compliance
- No data export/deletion features

---

## Summary

Security provides:
- ✅ JWT-based authentication
- ✅ Row-level security (RLS)
- ✅ HTTPS encryption
- ✅ API key protection
- ✅ Webhook validation
- ⚠️ No E2E encryption (trade-off for AI features)

---

**End of Security Architecture Document**
