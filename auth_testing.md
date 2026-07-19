Auth-Gated App Testing Playbook (Emergent Google Auth)

Step 1: Create Test User & Session via mongosh
- Insert into users: { user_id, email, name, picture, created_at }
- Insert into user_sessions: { user_id, session_token, expires_at (7d), created_at }

Step 2: Test Backend
- GET /api/auth/me with Authorization: Bearer <session_token>
- Should return user JSON, not 401

Step 3: Browser Testing
- Set cookie session_token (httpOnly, secure, sameSite=None)
- Navigate to dashboard – should load without redirect to login

Checklist
- users.user_id (custom UUID) present; MongoDB _id excluded via {"_id": 0}
- user_sessions.user_id matches users.user_id
- All backend queries exclude _id
- Timezone-aware expires_at comparison

Failure indicators
- 401 Unauthorized on /api/auth/me
- Redirect to /login even with valid cookie
