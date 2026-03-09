const express = require('express');
const path = require('path');
const bcrypt = require('bcryptjs');
const Database = require('better-sqlite3');

const app = express();
const PORT = 3000;

// SECURITY KEY - The tracker script must send this to prove it's allowed
const TRACKER_SECRET = "secure_key_123"; 

// DATABASE SETUP
const db = new Database('focusflow.db');

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE,
    password TEXT,
    name TEXT
  )
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    userId INTEGER,
    app TEXT,
    title TEXT,
    category TEXT,
    duration INTEGER,
    time TEXT,
    date TEXT,
    FOREIGN KEY(userId) REFERENCES users(id)
  )
`);

// Seed Default User
const userExists = db.prepare('SELECT * FROM users WHERE email = ?').get('admin@test.com');
if (!userExists) {
    const hashedPassword = bcrypt.hashSync('password', 10);
    db.prepare('INSERT INTO users (email, password, name) VALUES (?, ?, ?)').run('admin@test.com', hashedPassword, 'Admin User');
}

// MIDDLEWARE
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// API ROUTES

// 1. Login
app.post('/api/login', (req, res) => {
    const { email, password } = req.body;
    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
    if (!user) return res.status(400).json({ error: 'User not found' });
    
    const isMatch = bcrypt.compareSync(password, user.password);
    if (!isMatch) return res.status(400).json({ error: 'Invalid password' });

    res.json({ 
        message: 'Login successful', 
        user: { id: user.id, name: user.name, email: user.email } 
    });
});

// 2. Get Logs (For Dashboard)
app.get('/api/logs/:userId', (req, res) => {
    const logs = db.prepare('SELECT * FROM logs WHERE userId = ?').all(req.params.userId);
    res.json(logs);
});

// 3. Receive Data from Tracker Script
app.post('/api/track', (req, res) => {
    const { secretKey, userId, app, title, category, duration } = req.body;

    // Security Check
    if (secretKey !== TRACKER_SECRET) {
        return res.status(403).json({ error: 'Unauthorized' });
    }

    const time = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    const date = new Date().toISOString().split('T')[0];

    try {
        db.prepare('INSERT INTO logs (userId, app, title, category, duration, time, date) VALUES (?, ?, ?, ?, ?, ?, ?)')
          .run(userId, app, title, category, duration, time, date);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: 'Database error' });
    }
});

// 4. Clear Logs
app.delete('/api/logs/:userId', (req, res) => {
    db.prepare('DELETE FROM logs WHERE userId = ?').run(req.params.userId);
    res.json({ success: true });
});

// START SERVER
app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
    console.log('Login: admin@test.com / password');
});