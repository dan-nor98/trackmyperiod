// src/services/database.js
const sqlite3 = require('sqlite3').verbose();
const DB_SOURCE = 'luna.db';

const db = new sqlite3.Database(DB_SOURCE, (err) => {
    if (err) {
        console.error("FATAL: Could not connect to database.", err.message);
        throw err;
    }
});

const initializeDatabase = () => {
    return new Promise((resolve, reject) => {
        db.serialize(() => {
            console.log('Running database schema setup...');
            
            db.run(`CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                telegram_id BIGINT UNIQUE NOT NULL,
                first_name TEXT,
                username TEXT,
                role TEXT,
                language TEXT DEFAULT 'en', -- ADDED THIS LINE
                calendar_preference TEXT DEFAULT 'gregorian',
                partner_id BIGINT,
                pairing_code TEXT,
                reminder_time TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )`, (err) => {
                if (err) return reject(err);
            });

            db.run(`CREATE TABLE IF NOT EXISTS cycles (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id BIGINT NOT NULL,
                start_date TEXT NOT NULL,
                end_date TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users (telegram_id)
            )`, (err) => {
                if (err) return reject(err);
            });

            db.run(`CREATE TABLE IF NOT EXISTS symptoms (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                cycle_id INTEGER NOT NULL,
                symptom_name TEXT NOT NULL,
                logged_at TEXT NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (cycle_id) REFERENCES cycles (id)
            )`, (err) => {
                if (err) return reject(err);
                console.log('Database schema setup complete.');
                resolve();
            });
        });
    });
};

module.exports = { db, initializeDatabase };
