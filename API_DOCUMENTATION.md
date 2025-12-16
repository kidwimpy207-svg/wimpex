# Wimpex API Documentation

## Overview
Wimpex is a Snapchat-like social media platform with real-time messaging, stories, snaps, and comprehensive user management.

**Base URL:** `http://localhost:3000/api`  
**Version:** 1.0  
**Environment:** Development (Production requires HTTPS and proper key management)

---

## Authentication

### Login
**Endpoint:** `POST /auth/login`

**Request:**
```json
{
  "input": "user@example.com",
  "password": "password123",
  "loginType": "email"  // email, phone, or username
}
```

**Response:**
```json
{
  "token": "jwt_token",
  "userId": "user_id",
  "username": "username",
  "avatar": "url_or_base64"
}
```

### Signup
**Endpoint:** `POST /auth/signup`

**Request:**
```json
{
  "username": "newuser",
  "email": "user@example.com",
  "phone": "+1-555-0000",
  "password": "password123",
  "gender": "male"  // male, female, other, not-specified
}
```

---

## User Management

### Get User Profile
**Endpoint:** `GET /users/:userId`  
**Headers:** `Authorization: Bearer {token}`

### Update Profile
**Endpoint:** `PUT /users/:userId`  
**Headers:** `Authorization: Bearer {token}`

**Request:**
```json
{
  "username": "updated_username",
  "email": "new@example.com",
  "bio": "My bio",
  "avatar": "base64_or_url"
}
```

### Get Settings
**Endpoint:** `GET /compliance/settings`  
**Headers:** `Authorization: Bearer {token}`

### Export Data (GDPR)
**Endpoint:** `GET /compliance/export`  
**Headers:** `Authorization: Bearer {token}`

### Delete Account
**Endpoint:** `POST /compliance/delete-account`  
**Headers:** `Authorization: Bearer {token}`

---

## Content

### Get Feed
**Endpoint:** `GET /feed?page=1&limit=10`  
**Headers:** `Authorization: Bearer {token}`

**Response:**
```json
{
  "snaps": [
    {
      "snapId": "id",
      "fromId": "user_id",
      "fromUsername": "username",
      "media": "url",
      "createdAt": 1700000000000,
      "views": []
    }
  ],
  "page": 1,
  "limit": 10,
  "hasMore": true
}
```

### Post a Snap
**Endpoint:** `POST /snaps`  
**Headers:** `Authorization: Bearer {token}`

**Request:**
```json
{
  "toId": "friend_id_or_story",
  "media": "base64_or_url"
}
```

### Create Story
**Endpoint:** `POST /stories`  
**Headers:** `Authorization: Bearer {token}`

---

## Messaging

### Get Messages
**Endpoint:** `GET /messages/:userId`  
**Headers:** `Authorization: Bearer {token}`

### Send Message
**Endpoint:** `POST /messages`  
**Headers:** `Authorization: Bearer {token}`

**Request:**
```json
{
  "toId": "recipient_id",
  "text": "Hello!"
}
```

### WebSocket Events
**URL:** `ws://localhost:3000`

**Auth:**
```json
{ "type": "auth", "token": "jwt_token" }
```

**Send Message (realtime):**
```json
{ "type": "message", "toId": "recipient_id", "text": "Hello" }
```

**Typing Indicator:**
```json
{ "type": "typing", "toId": "recipient_id" }
```

---

## Search & Discovery

### Search Users
**Endpoint:** `GET /search?q=username`  
**Headers:** `Authorization: Bearer {token}`

### Get Recommendations
**Endpoint:** `GET /users/recommendations`  
**Headers:** `Authorization: Bearer {token}`

---

## Friends

### Get Friends
**Endpoint:** `GET /friends`  
**Headers:** `Authorization: Bearer {token}`

### Add Friend
**Endpoint:** `POST /friends/add`  
**Headers:** `Authorization: Bearer {token}`

**Request:**
```json
{
  "targetId": "friend_user_id"
}
```

### Remove Friend
**Endpoint:** `POST /friends/remove`  
**Headers:** `Authorization: Bearer {token}`

---

## Privacy & Safety

### Block User
**Endpoint:** `POST /block`  
**Headers:** `Authorization: Bearer {token}`

### Mute User
**Endpoint:** `POST /mute`  
**Headers:** `Authorization: Bearer {token}`

### Report Content
**Endpoint:** `POST /report`  
**Headers:** `Authorization: Bearer {token}`

**Request:**
```json
{
  "targetId": "user_or_post_id",
  "type": "user",  // user, content, message
  "reason": "harassment",
  "details": "..."
}
```

---

## Notifications

### Get Preferences
**Endpoint:** `GET /notifications/prefs`  
**Headers:** `Authorization: Bearer {token}`

### Update Preferences
**Endpoint:** `PUT /notifications/prefs`  
**Headers:** `Authorization: Bearer {token}`

**Request:**
```json
{
  "push": true,
  "inApp": true,
  "digest": false,
  "dnd": false
}
```

### Subscribe to Push
**Endpoint:** `POST /push/subscribe`  
**Headers:** `Authorization: Bearer {token}`

---

## Compliance & Legal

### Get Terms of Service
**Endpoint:** `GET /compliance/tos`

### Get Privacy Policy
**Endpoint:** `GET /compliance/privacy`

### Get Community Guidelines
**Endpoint:** `GET /trust/guidelines`

### Export Data
**Endpoint:** `GET /compliance/export`  
**Headers:** `Authorization: Bearer {token}`

### Schedule Account Deletion
**Endpoint:** `POST /compliance/delete-account`  
**Headers:** `Authorization: Bearer {token}`

---

## Sessions & Devices

### Get Sessions
**Endpoint:** `GET /sessions/sessions`  
**Headers:** `Authorization: Bearer {token}`

### Revoke Session
**Endpoint:** `POST /sessions/sessions/:sessionId/revoke`  
**Headers:** `Authorization: Bearer {token}`

### Get Devices
**Endpoint:** `GET /sessions/devices`  
**Headers:** `Authorization: Bearer {token}`

---

## Monetization

### Get Plans
**Endpoint:** `GET /billing/plans`

### Get Subscription
**Endpoint:** `GET /billing/subscription`  
**Headers:** `Authorization: Bearer {token}`

### Subscribe
**Endpoint:** `POST /billing/subscribe`  
**Headers:** `Authorization: Bearer {token}`

**Request:**
```json
{
  "planId": "pro"  // free, pro, premium
}
```

---

## Error Responses

All endpoints return errors in this format:

```json
{
  "error": "Error message describing what went wrong"
}
```

**Common Status Codes:**
- `200` - Success
- `400` - Bad request (invalid input)
- `401` - Unauthorized (missing/invalid token)
- `403` - Forbidden (no permission)
- `404` - Not found
- `429` - Rate limited
- `500` - Server error

---

## Rate Limiting

Endpoints are rate-limited per user/IP:
- **Snaps:** 10 per minute
- **Messages:** 30 per minute
- **Login:** 5 attempts per 15 minutes
- **Password reset:** 3 per hour

---

## Environment Variables Required

```
JWT_SECRET=your_secret_key
VAPID_PUBLIC_KEY=your_public_key
VAPID_PRIVATE_KEY=your_private_key
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=your_email@example.com
SMTP_PASS=your_password
AWS_ACCESS_KEY_ID=your_key
AWS_SECRET_ACCESS_KEY=your_secret
AWS_BUCKET_NAME=your_bucket
DATA_ENCRYPTION_KEY=your_64_char_hex_key
```

---

## Changelog

### v1.0 (December 2025)
- Initial release
- User authentication (JWT, 2FA)
- Snaps, stories, and messaging
- Real-time WebSocket support
- Privacy controls (block, mute, report)
- GDPR/CCPA compliance
- Notifications (push + in-app)
- Session and device management
- Monetization (subscriptions)
- Backup and encryption

