const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '../../data');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

const MEDIA_DIR = path.join(DATA_DIR, 'media');
if (!fs.existsSync(MEDIA_DIR)) fs.mkdirSync(MEDIA_DIR, { recursive: true });

const USERS_FILE = path.join(DATA_DIR, 'users.json');
const STORIES_FILE = path.join(DATA_DIR, 'stories.json');
const SNAPS_FILE = path.join(DATA_DIR, 'snaps.json');
const WIMPY_FILE = path.join(DATA_DIR, 'wimpy_conversations.json');
const STREAKS_FILE = path.join(DATA_DIR, 'streaks.json');
const SCORES_FILE = path.join(DATA_DIR, 'scores.json');
const IMAGES_FILE = path.join(DATA_DIR, 'images.json');
const MESSAGES_FILE = path.join(DATA_DIR, 'messages.json');
const PUSH_FILE = path.join(DATA_DIR, 'push_subscriptions.json');
const MODERATION_FILE = path.join(DATA_DIR, 'moderation_queue.json');
const NOTIF_PREFS_FILE = path.join(DATA_DIR, 'notification_prefs.json');
const NOTIF_QUEUE_FILE = path.join(DATA_DIR, 'notification_queue.json');
const EVENTS_FILE = path.join(DATA_DIR, 'events.json');
const REPORTS_FILE = path.join(DATA_DIR, 'reports.json');

function loadData(file, defaultValue = {}) {
    try {
        if (!fs.existsSync(file)) return defaultValue;
        return JSON.parse(fs.readFileSync(file, 'utf8'));
    } catch (e) {
        return defaultValue;
    }
}

function saveData(file, data) {
    try {
        fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf8');
    } catch (e) {
        console.error(`Failed to save ${file}`, e);
    }
}

// In-memory state
const state = {
    users: loadData(USERS_FILE, {}),
    stories: loadData(STORIES_FILE, {}),
    snaps: loadData(SNAPS_FILE, {}),
    wimpyConversations: loadData(WIMPY_FILE, {}),
    streaks: loadData(STREAKS_FILE, {}),
    scores: loadData(SCORES_FILE, {}),
    images: loadData(IMAGES_FILE, {}),
    moderationQueue: loadData(MODERATION_FILE, []),
    messages: loadData(MESSAGES_FILE, {}),
    pushSubscriptions: loadData(PUSH_FILE, {}),
    notifPrefs: loadData(NOTIF_PREFS_FILE, {}),
    notifQueue: loadData(NOTIF_QUEUE_FILE, []),
    events: loadData(EVENTS_FILE, []),
    reports: loadData(REPORTS_FILE, [])
};

// Persistence methods
const save = {
    users: () => saveData(USERS_FILE, state.users),
    stories: () => saveData(STORIES_FILE, state.stories),
    snaps: () => saveData(SNAPS_FILE, state.snaps),
    wimpyConversations: () => saveData(WIMPY_FILE, state.wimpyConversations),
    streaks: () => saveData(STREAKS_FILE, state.streaks),
    scores: () => saveData(SCORES_FILE, state.scores),
    images: () => saveData(IMAGES_FILE, state.images),
    moderationQueue: () => saveData(MODERATION_FILE, state.moderationQueue),
    messages: () => saveData(MESSAGES_FILE, state.messages),
    pushSubscriptions: () => saveData(PUSH_FILE, state.pushSubscriptions),
    notifPrefs: () => saveData(NOTIF_PREFS_FILE, state.notifPrefs),
    notifQueue: () => saveData(NOTIF_QUEUE_FILE, state.notifQueue),
    events: () => saveData(EVENTS_FILE, state.events),
    reports: () => saveData(REPORTS_FILE, state.reports)
};

module.exports = {
    state,
    save,
    DATA_DIR,
    MEDIA_DIR
};
