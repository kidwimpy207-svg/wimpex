/**
 * Profile Service
 * Handles user profile operations, avatars, bios, and profile customization
 */

const { state, save } = require('./store');

const profileService = {
  /**
   * Get user profile (public view)
   */
  getPublicProfile(userId) {
    const user = state.users[userId];
    if (!user) return null;
    
    return {
      userId: user.userId,
      username: user.username,
      bio: user.bio,
      avatar: user.avatar,
      location: user.location,
      website: user.website,
      createdAt: user.createdAt,
      followerCount: (user.followers || []).length,
      followingCount: (user.following || []).length,
      postCount: (user.stories || []).length,
      verified: user.verified || false,
      privateAccount: user.privateAccount || false,
      profileComplete: user.profileComplete || false
    };
  },

  /**
   * Get complete user profile (private view, self only)
   */
  getPrivateProfile(userId) {
    const user = state.users[userId];
    if (!user) return null;
    
    const publicProfile = this.getPublicProfile(userId);
    return {
      ...publicProfile,
      email: user.email,
      phone: user.phone,
      emailConfirmed: user.emailConfirmed,
      phoneVerified: user.phoneVerified,
      twoFAEnabled: !!user.twoFASecret
    };
  },

  /**
   * Update profile fields
   */
  updateProfile(userId, updates) {
    const user = state.users[userId];
    if (!user) throw new Error('User not found');

    // Validate and update bio
    if (updates.bio !== undefined) {
      if (updates.bio.length > 160) {
        throw new Error('Bio must be 160 characters or less');
      }
      user.bio = updates.bio;
    }

    // Validate and update location
    if (updates.location !== undefined) {
      if (updates.location.length > 50) {
        throw new Error('Location must be 50 characters or less');
      }
      user.location = updates.location;
    }

    // Validate and update website
    if (updates.website !== undefined) {
      if (updates.website && updates.website.length > 200) {
        throw new Error('Website URL must be 200 characters or less');
      }
      if (updates.website && !this.isValidUrl(updates.website)) {
        throw new Error('Invalid website URL');
      }
      user.website = updates.website;
    }

    // Update avatar (base64 data URL)
    if (updates.avatar !== undefined) {
      if (updates.avatar && updates.avatar.length > 500000) {
        throw new Error('Avatar image too large (max 5MB)');
      }
      user.avatar = updates.avatar;
    }

    // Update private account setting
    if (updates.privateAccount !== undefined) {
      user.privateAccount = !!updates.privateAccount;
    }

    // Update username
    if (updates.username !== undefined) {
      if (updates.username.length < 2 || updates.username.length > 30) {
        throw new Error('Username must be 2-30 characters');
      }
      if (this.usernameExists(updates.username, userId)) {
        throw new Error('Username already taken');
      }
      user.username = updates.username;
    }

    // Mark profile as complete
    user.profileComplete = !!(user.avatar && user.bio && user.location);
    user.updatedAt = Date.now();

    save.users();
    return this.getPrivateProfile(userId);
  },

  /**
   * Check if username is taken
   */
  usernameExists(username, excludeUserId = null) {
    return Object.values(state.users).some(u => 
      u.username === username && u.userId !== excludeUserId
    );
  },

  /**
   * Validate URL format
   */
  isValidUrl(string) {
    try {
      new URL(string);
      return true;
    } catch (_) {
      return false;
    }
  },

  /**
   * Get profile statistics
   */
  getProfileStats(userId) {
    const user = state.users[userId];
    if (!user) return null;

    const posts = user.stories || [];
    const followers = user.followers || [];
    const following = user.following || [];

    return {
      userId: user.userId,
      username: user.username,
      avatar: user.avatar,
      postCount: posts.length,
      followerCount: followers.length,
      followingCount: following.length,
      engagementRate: posts.length > 0 ? Math.random() : 0, // Placeholder
      joinedAt: user.createdAt,
      lastActive: user.lastActive || user.createdAt
    };
  },

  /**
   * Search profiles
   */
  searchProfiles(query, limit = 10) {
    const lowerQuery = query.toLowerCase();
    return Object.values(state.users)
      .filter(u => 
        u.username.toLowerCase().includes(lowerQuery) ||
        (u.bio && u.bio.toLowerCase().includes(lowerQuery))
      )
      .slice(0, limit)
      .map(u => this.getPublicProfile(u.userId));
  },

  /**
   * Get profile completion score (0-100)
   */
  getCompletionScore(userId) {
    const user = state.users[userId];
    if (!user) return 0;

    let score = 0;
    if (user.avatar) score += 25;
    if (user.bio) score += 25;
    if (user.location) score += 25;
    if (user.website) score += 15;
    if (user.followers && user.followers.length > 0) score += 5;
    if (user.stories && user.stories.length > 0) score += 5;

    return Math.min(score, 100);
  },

  /**
   * Get recommended profiles to follow
   */
  getRecommendedProfiles(userId, limit = 10) {
    const user = state.users[userId];
    if (!user) return [];

    const following = new Set(user.following || []);
    const followers = new Set(user.followers || []);

    return Object.values(state.users)
      .filter(u => 
        u.userId !== userId && 
        !following.has(u.userId) && 
        !followers.has(u.userId) &&
        !u.privateAccount
      )
      .sort(() => Math.random() - 0.5) // Random shuffle
      .slice(0, limit)
      .map(u => ({
        ...this.getPublicProfile(u.userId),
        mutualFollowers: this.getMutualFollowerCount(userId, u.userId)
      }));
  },

  /**
   * Get count of mutual followers
   */
  getMutualFollowerCount(userId1, userId2) {
    const user1Followers = new Set(state.users[userId1]?.followers || []);
    const user2Followers = new Set(state.users[userId2]?.followers || []);
    
    let count = 0;
    user1Followers.forEach(followerId => {
      if (user2Followers.has(followerId)) count++;
    });
    return count;
  }
};

module.exports = profileService;
