const express = require('express');
const db = require('./db'); // SQLite DB connection
const path = require('path');

const app = express();
const port = 3000;

// Serve static files (like CSS, JS, images) from the "public" directory
app.use(express.static(path.join(__dirname, 'public')));

// Set the view engine to EJS
app.set('view engine', 'ejs');

// Route to display leaderboard
app.get('/leaderboard', (req, res) => {
    // Sort by level and then by xp
    db.all('SELECT username, level, xp, messagesSent, voiceTime FROM users ORDER BY level DESC, xp DESC LIMIT 10', (err, rows) => {
        if (err) {
            console.error(err);
            return res.status(500).send('Internal Server Error');
        }
        res.render('leaderboard', { users: rows });
    });
});

// Start server
app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});
