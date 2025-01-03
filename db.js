const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./leveling.db'); // Path to the SQLite database

// Modify the table schema to include 'voiceStart' for tracking voice channel join time
db.serialize(() => {
    // Adding the voiceStart column, if it doesn't already exist
    db.run(`
        CREATE TABLE IF NOT EXISTS users (
            userId TEXT PRIMARY KEY,
            username TEXT,
            messagesSent INTEGER DEFAULT 0,
            voiceTime INTEGER DEFAULT 0,
            xp INTEGER DEFAULT 0,
            level INTEGER DEFAULT 1,
            voiceStart INTEGER DEFAULT 0  -- Adding 'voiceStart' column to track when a user joins a voice channel
        )
    `);
});

module.exports = db;
