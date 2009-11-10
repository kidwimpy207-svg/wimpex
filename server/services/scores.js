const { state, save } = require('./store');

function getScore(userId) {
  return state.scores[userId] || { wimpScore: 0 };
}

function addPoints(userId, points) {
  if (!state.scores[userId]) state.scores[userId] = { wimpScore: 0 };
  state.scores[userId].wimpScore = (state.scores[userId].wimpScore || 0) + points;
  save.scores();
  return state.scores[userId];
}

module.exports = { getScore, addPoints };
