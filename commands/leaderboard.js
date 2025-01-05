const { SlashCommandBuilder } = require('discord.js');
const db = require('../db'); // SQLite DB connection

module.exports = {
    data: new SlashCommandBuilder()
        .setName('leaderboard')
        .setDescription('Displays the top 10 users by level.'),
    async execute(interaction) {
        try {
            // Query the database for the top 10 users sorted by level (and XP if needed)
            db.all('SELECT username, level, xp FROM users ORDER BY level DESC, xp DESC LIMIT 10', async (err, rows) => {
                if (err) {
                    console.error(err);
                    return interaction.reply({ content: 'There was an error retrieving the leaderboard.', ephemeral: true });
                }

                // Create an embed for the top 10 users
                const leaderboardEmbed = {
                    color: 0xF49AC1, // Green color for the embed
                    title: 'Top 10 Users by Level',
                    fields: rows.map((user, index) => ({
                        name: `${index + 1}. ${user.username}`,
                        value: `Level: ${user.level}\nXP: ${user.xp}`,
                    })),
                    description: '[Click here to view the full leaderboard](http://jamaraz.sydders.com/leaderboard)', // Add your website link here
                };

                // Send the embed to the channel where the command was invoked
                await interaction.reply({
                    embeds: [leaderboardEmbed],
                    content: 'Here are the top 10 users based on level!',
                });
            });
        } catch (err) {
            console.error(err);
            await interaction.reply({ content: 'There was an error executing the command.', ephemeral: true });
        }
    },
};
