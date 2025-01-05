require('dotenv').config(); // Load environment variables from .env file
const { Client, GatewayIntentBits, Collection } = require('discord.js');
const fs = require('fs');
const db = require('./db'); // SQLite DB connection

const { exec } = require('child_process');

// Run `server.js` and `deploy-commands.js` as separate processes
exec('node server.js', (error, stdout, stderr) => {
    if (error) {
        console.error(`exec error: ${error}`);
        return;
    }
    console.log(`stdout: ${stdout}`);
    console.error(`stderr: ${stderr}`);
});

exec('node deploy-commands.js', (error, stdout, stderr) => {
    if (error) {
        console.error(`exec error: ${error}`);
        return;
    }
    console.log(`stdout: ${stdout}`);
    console.error(`stderr: ${stderr}`);
});

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildVoiceStates,
    ],
});

// Fetch the token from environment variables
const TOKEN = process.env.TOKEN;

client.commands = new Collection();
const commandFiles = fs.readdirSync('./commands').filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
    const command = require(`./commands/${file}`);
    client.commands.set(command.data.name, command);
}

client.once('ready', () => {
    console.log(`Logged in as ${client.user.tag}!`);
});

client.on('interactionCreate', async (interaction) => {
    if (!interaction.isCommand()) return;

    const command = client.commands.get(interaction.commandName);
    if (!command) return;

    try {
        await command.execute(interaction);
    } catch (error) {
        console.error(error);
        await interaction.reply({ content: 'There was an error executing this command!', ephemeral: true });
    }
});

client.on('messageCreate', async (message) => {
    if (message.author.bot) return;

    const userId = message.author.id;
    const username = message.author.username;

    // Increment the message count and XP for the user
    db.get('SELECT * FROM users WHERE userId = ?', [userId], (err, row) => {
        if (err) {
            console.error(err);
            return;
        }

        if (row) {
            console.log(`User ${username} found, updating...`);
            db.run('UPDATE users SET messagesSent = messagesSent + 1, xp = xp + 10 WHERE userId = ?', [userId], (updateErr) => {
                if (updateErr) {
                    console.error(updateErr);
                } else {
                    console.log(`User ${username} updated: messagesSent: ${row.messagesSent + 1}, xp: ${row.xp + 10}`);
                }
            });

            // Level up logic
            if (row.xp + 10 >= row.level * 100) {
                db.run('UPDATE users SET level = level + 1, xp = 0 WHERE userId = ?', [userId]);
                console.log(`User ${username} leveled up!`);
            }
        } else {
            console.log(`User ${username} not found, adding to database...`);
            db.run('INSERT INTO users (userId, username, messagesSent, xp, level) VALUES (?, ?, 1, 10, 1)', [userId, username], (insertErr) => {
                if (insertErr) {
                    console.error(insertErr);
                } else {
                    console.log(`User ${username} added to database.`);
                }
            });
        }
    });
});

client.on('voiceStateUpdate', (oldState, newState) => {
    // Track when the user joins or leaves a voice channel
    if (oldState.channelId !== newState.channelId) {
        const userId = newState.member.id;
        const username = newState.member.user.username;

        // If user joins a voice channel, start tracking time
        if (newState.channelId) {
            db.run('UPDATE users SET voiceStart = ? WHERE userId = ?', [Date.now(), userId]);
        }

        // If user leaves a voice channel, calculate time spent
        if (oldState.channelId) {
            db.get('SELECT voiceStart, xp, level FROM users WHERE userId = ?', [userId], (err, row) => {
                if (err) {
                    console.error(err);
                    return;
                }

                if (row && row.voiceStart) {
                    const timeSpent = Math.floor((Date.now() - row.voiceStart) / 1000); // Time in seconds
                    db.run('UPDATE users SET voiceTime = voiceTime + ? WHERE userId = ?', [timeSpent, userId]);

                    // Add XP based on time spent (1 XP per minute)
                    const minutesSpent = Math.floor(timeSpent / 60);
                    db.run('UPDATE users SET xp = xp + ? WHERE userId = ?', [minutesSpent, userId], (updateErr) => {
                        if (updateErr) {
                            console.error(updateErr);
                        } else {
                            console.log(`User ${username} has been awarded ${minutesSpent} XP for voice time.`);
                            
                            // Level-up logic
                            if (row.xp + minutesSpent >= row.level * 100) {
                                db.run('UPDATE users SET level = level + 1, xp = 0 WHERE userId = ?', [userId]);
                                console.log(`User ${username} leveled up!`);
                            }
                        }
                    });
                }
            });
        }
    }
});


// Function to check and update the XP based on the voice time already tracked in the database
const updateVoiceXP = () => {
    // Retrieve all users from the database
    db.all('SELECT userId, voiceTime, xp, level FROM users', (err, rows) => {
        if (err) {
            console.error('Error retrieving users from database:', err);
            return;
        }

        // Loop through all users
        rows.forEach((user) => {
            // Calculate the total XP based on voice time
            const timeSpentInSeconds = user.voiceTime; // Total voice time stored in seconds
            const minutesSpent = Math.floor(timeSpentInSeconds / 60); // Convert seconds to full minutes

            if (minutesSpent > 0) {
                // Update the XP in the database for the user based on their voice time (1 XP per minute)
                db.run('UPDATE users SET xp = xp + ? WHERE userId = ?', [minutesSpent, user.userId], (updateErr) => {
                    if (updateErr) {
                        console.error(`Error updating XP for user ${user.userId}:`, updateErr);
                    } else {
                        console.log(`User ${user.userId} has been awarded ${minutesSpent} XP for voice time.`);

                        // Level-up logic
                        if (user.xp + minutesSpent >= user.level * 100) {
                            db.run('UPDATE users SET level = level + 1, xp = 0 WHERE userId = ?', [user.userId]);
                            console.log(`User ${user.userId} leveled up!`);
                        }
                    }
                });
            }
        });
    });
};

// Call the function to update XP for all users based on their stored voice time
updateVoiceXP();



client.login(TOKEN); // Log in using the token from .env
