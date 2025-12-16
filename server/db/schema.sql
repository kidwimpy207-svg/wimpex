-- Users Table
CREATE TABLE IF NOT EXISTS users (
    user_id VARCHAR(50) PRIMARY KEY,
    username VARCHAR(100) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    phone VARCHAR(50),
    password VARCHAR(255) NOT NULL, -- Hashed
    avatar TEXT,
    bio TEXT,
    gender VARCHAR(50),
    email_confirmed BOOLEAN DEFAULT FALSE,
    confirm_token VARCHAR(100),
    twofa_enabled BOOLEAN DEFAULT FALSE,
    twofa_secret VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_active TIMESTAMP
);

-- Messages Table
CREATE TABLE IF NOT EXISTS messages (
    id VARCHAR(50) PRIMARY KEY,
    sender_id VARCHAR(50) REFERENCES users(user_id),
    receiver_id VARCHAR(50) REFERENCES users(user_id),
    text TEXT,
    media_url TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_read BOOLEAN DEFAULT FALSE,
    delivered BOOLEAN DEFAULT FALSE
);

-- Stories Table
CREATE TABLE IF NOT EXISTS stories (
    story_id VARCHAR(50) PRIMARY KEY,
    user_id VARCHAR(50) REFERENCES users(user_id),
    media_url TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP
);

-- Story Views (Many-to-Many)
CREATE TABLE IF NOT EXISTS story_views (
    story_id VARCHAR(50) REFERENCES stories(story_id) ON DELETE CASCADE,
    viewer_id VARCHAR(50) REFERENCES users(user_id),
    viewed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (story_id, viewer_id)
);

-- Snaps Table
CREATE TABLE IF NOT EXISTS snaps (
    snap_id VARCHAR(50) PRIMARY KEY,
    from_id VARCHAR(50) REFERENCES users(user_id),
    to_id VARCHAR(50) REFERENCES users(user_id),
    media_url TEXT NOT NULL,
    viewed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Friends Table (Relationships)
CREATE TABLE IF NOT EXISTS friends (
    user_id VARCHAR(50) REFERENCES users(user_id),
    friend_id VARCHAR(50) REFERENCES users(user_id),
    status VARCHAR(20) DEFAULT 'accepted', -- pending, accepted, blocked
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, friend_id)
);
