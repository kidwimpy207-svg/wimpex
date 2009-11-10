const { state, save } = require('./store');

const friendRequests = {
  // Send friend request from fromId to toId
  sendRequest(fromId, toId) {
    if (fromId === toId) return { error: 'Cannot friend yourself' };
    
    const fromUser = state.users[fromId];
    const toUser = state.users[toId];
    if (!fromUser || !toUser) return { error: 'User not found' };

    // Check if already friends
    if (fromUser.friends && fromUser.friends.includes(toId)) {
      return { error: 'Already friends' };
    }

    // Check if request already sent
    if (!state.friendRequests) state.friendRequests = {};
    const requestKey = `${fromId}:${toId}`;
    if (state.friendRequests[requestKey]) {
      return { error: 'Request already sent' };
    }

    // Create request
    state.friendRequests[requestKey] = {
      from: fromId,
      to: toId,
      status: 'pending',
      createdAt: Date.now()
    };

    save.friendRequests?.() || save.users();
    return { ok: true, message: 'Friend request sent' };
  },

  // Accept friend request
  acceptRequest(userId, fromId) {
    const user = state.users[userId];
    const requester = state.users[fromId];
    if (!user || !requester) return { error: 'User not found' };

    if (!state.friendRequests) state.friendRequests = {};
    const requestKey = `${fromId}:${userId}`;
    const request = state.friendRequests[requestKey];
    if (!request) return { error: 'Request not found' };
    if (request.status !== 'pending') return { error: 'Request already processed' };

    // Add to friends (both directions)
    if (!user.friends) user.friends = [];
    if (!requester.friends) requester.friends = [];
    
    if (!user.friends.includes(fromId)) user.friends.push(fromId);
    if (!requester.friends.includes(userId)) requester.friends.push(userId);

    // Mark request as accepted
    request.status = 'accepted';
    save.users();
    save.friendRequests?.() || save.users();

    return { ok: true, message: 'Friend request accepted' };
  },

  // Decline friend request
  declineRequest(userId, fromId) {
    if (!state.friendRequests) state.friendRequests = {};
    const requestKey = `${fromId}:${userId}`;
    const request = state.friendRequests[requestKey];
    if (!request) return { error: 'Request not found' };

    request.status = 'declined';
    save.friendRequests?.() || save.users();
    return { ok: true, message: 'Friend request declined' };
  },

  // Get pending requests for user
  getPendingRequests(userId) {
    if (!state.friendRequests) state.friendRequests = {};
    const requests = [];
    
    for (const [key, req] of Object.entries(state.friendRequests)) {
      if (req.to === userId && req.status === 'pending') {
        const requester = state.users[req.from];
        if (requester) {
          requests.push({
            fromId: req.from,
            fromUsername: requester.username,
            fromAvatar: requester.avatar,
            createdAt: req.createdAt
          });
        }
      }
    }

    return requests;
  },

  // Get sent requests for user
  getSentRequests(userId) {
    if (!state.friendRequests) state.friendRequests = {};
    const requests = [];
    
    for (const [key, req] of Object.entries(state.friendRequests)) {
      if (req.from === userId && req.status === 'pending') {
        const target = state.users[req.to];
        if (target) {
          requests.push({
            toId: req.to,
            toUsername: target.username,
            toAvatar: target.avatar,
            createdAt: req.createdAt
          });
        }
      }
    }

    return requests;
  },

  // Check if request exists between two users
  hasRequest(fromId, toId) {
    if (!state.friendRequests) return false;
    const requestKey = `${fromId}:${toId}`;
    return !!state.friendRequests[requestKey];
  }
};

module.exports = friendRequests;
