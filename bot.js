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

        // If the user joins a voice channel, start tracking time
        if (newState.channelId) {
            db.run('UPDATE users SET voiceStart = ? WHERE userId = ?', [Date.now(), userId]);
        }

        // If the user leaves a voice channel, calculate time spent and award XP
        if (oldState.channelId) {
            db.get('SELECT voiceStart FROM users WHERE userId = ?', [userId], (err, row) => {
                if (err) {
                    console.error(err);
                    return;
                }

                if (row && row.voiceStart) {
                    // Calculate time spent in the voice channel in seconds
                    const timeSpentInSeconds = Math.floor((Date.now() - row.voiceStart) / 1000); // Convert ms to seconds
                    
                    if (timeSpentInSeconds > 0) {
                        // Calculate minutes spent, and award XP for each full minute (1 XP per minute)
                        const minutesSpent = Math.floor(timeSpentInSeconds / 60); // Get full minutes spent

                        // Award XP for each full minute spent in voice
                        if (minutesSpent > 0) {
                            db.run('UPDATE users SET voiceTime = voiceTime + ?, xp = xp + ? WHERE userId = ?', [timeSpentInSeconds, minutesSpent, userId]);
                            console.log(`User ${userId} spent ${minutesSpent} minutes in voice chat and gained ${minutesSpent} XP.`);
                        }
                    }
                }
            });
        }
    }
});


client.login(TOKEN); // Log in using the token from .env
