// Safe fetch helper: prefer global.fetch (Node 18+), fallback to node-fetch v2 if installed.
let fetchImpl = null;
if (typeof global.fetch === 'function') {
  fetchImpl = global.fetch.bind(global);
} else {
  try {
    // node-fetch v2 is CommonJS and exports a function
    fetchImpl = require('node-fetch');
  } catch (e) {
    fetchImpl = null;
  }
}

module.exports = fetchImpl;
