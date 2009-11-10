const { state, save } = require('./store');
const USERS = state.users;

const STREAK_EXPIRY = 24 * 60 * 60 * 1000; // 24 hours
const FREE_RESTORES_PER_MONTH = 3;

function getStreak(userId, otherId) {
  const key = [userId, otherId].sort().join(':');
  return state.streaks[key] || {
    streakCount: 0,
    lastSnapTime: 0,
    restoresUsed: 0,
    activatedAt: null,
    lastSnapBy: { [userId]: 0, [otherId]: 0 }, // track who sent last snap
    isPremium: false
  };
}

function isStreakActive(userId, otherId) {
  const streak = getStreak(userId, otherId);
  if (!streak.lastSnapTime) return false;
  const timeSinceLastSnap = Date.now() - streak.lastSnapTime;
  return timeSinceLastSnap <= STREAK_EXPIRY;
}

function getStreakExpiryTime(userId, otherId) {
  const streak = getStreak(userId, otherId);
  if (!streak.lastSnapTime) return null;
  return streak.lastSnapTime + STREAK_EXPIRY;
}

function getTimeUntilExpiry(userId, otherId) {
  const expiryTime = getStreakExpiryTime(userId, otherId);
  if (!expiryTime) return null;
  const timeLeft = expiryTime - Date.now();
  return timeLeft > 0 ? timeLeft : 0;
}

// Check if both users have sent snaps (bidirectional) to activate streak
function checkStreakActivation(userId, otherId) {
  const key = [userId, otherId].sort().join(':');
  let s = state.streaks[key] || {
    streakCount: 0,
    lastSnapTime: 0,
    restoresUsed: 0,
    activatedAt: null,
    lastSnapBy: { [userId]: 0, [otherId]: 0 },
    isPremium: false
  };
  
  // If both users have sent snaps within last 24h, activate streak
  const now = Date.now();
  const cutoff = now - (24 * 60 * 60 * 1000);
  
  const userSent = (s.lastSnapBy[userId] || 0) > cutoff;
  const otherSent = (s.lastSnapBy[otherId] || 0) > cutoff;
  
  const isActivated = !!s.activatedAt && userSent && otherSent;
  
  return {
    activated: isActivated,
    userSent,
    otherSent,
    needsActivation: userSent && otherSent && !s.activatedAt
  };
}

function renewStreak(userId, otherId) {
  const key = [userId, otherId].sort().join(':');
  const now = Date.now();
  let s = state.streaks[key] || {
    streakCount: 0,
    lastSnapTime: 0,
    restoresUsed: 0,
    activatedAt: null,
    lastSnapBy: { [userId]: 0, [otherId]: 0 },
    isPremium: false
  };
  
  // Record who sent this snap
  if (!s.lastSnapBy) s.lastSnapBy = {};
  s.lastSnapBy[userId] = now;
  
  const diff = now - (s.lastSnapTime || 0);
  
  // If streak not yet activated but both have sent snaps, activate it
  if (!s.activatedAt) {
    const activation = checkStreakActivation(userId, otherId);
    if (activation.needsActivation) {
      s.activatedAt = now;
    }
  }
  
  // If streak is active, increment count
  if (s.activatedAt && diff <= STREAK_EXPIRY) {
    s.streakCount = (s.streakCount || 0) + 1;
  } else if (s.activatedAt && diff > STREAK_EXPIRY) {
    // Streak expired, reset count
    s.streakCount = 1;
  } else if (!s.activatedAt && !s.lastSnapTime) {
    // First snap
    s.streakCount = 1;
  }
  
  s.lastSnapTime = now;
  state.streaks[key] = s;
  save.streaks();
  return s;
}

function canRestore(userId, otherId) {
  const s = getStreak(userId, otherId);
  if (s.isPremium) return true; // Premium has unlimited
  return (s.restoresUsed || 0) < FREE_RESTORES_PER_MONTH;
}

function useRestore(userId, otherId, isPaid = false) {
  const key = [userId, otherId].sort().join(':');
  const s = state.streaks[key] || {
    streakCount: 0,
    lastSnapTime: 0,
    restoresUsed: 0,
    activatedAt: null,
    lastSnapBy: { [userId]: 0, [otherId]: 0 },
    isPremium: false
  };
  
  if (isPaid) {
    s.isPremium = true;
  } else {
    s.restoresUsed = (s.restoresUsed || 0) + 1;
  }
  
  s.lastSnapTime = Date.now();
  state.streaks[key] = s;
  save.streaks();
  return s;
}

function getRestoreCount(userId, otherId) {
  const s = getStreak(userId, otherId);
  const used = s.restoresUsed || 0;
  const remaining = FREE_RESTORES_PER_MONTH - used;
  return { used, remaining: Math.max(0, remaining), hasFreeForms: remaining > 0 };
}

module.exports = {
  getStreak,
  isStreakActive,
  getStreakExpiryTime,
  getTimeUntilExpiry,
  checkStreakActivation,
  renewStreak,
  canRestore,
  useRestore,
  getRestoreCount
};
