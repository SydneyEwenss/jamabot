const { SlashCommandBuilder } = require('discord.js');
const db = require('../db'); // SQLite DB connection

module.exports = {
    data: new SlashCommandBuilder()
        .setName('level')
        .setDescription('Tells you your level'),
    async execute(interaction) {
        try {
            // Query the database for the top 10 users sorted by level (and XP if needed)
            db.all(`SELECT username, level, xp FROM users WHERE username = "${interaction.user.username}"`, async (err, rows) => {
                if (err) {
                    console.error(err);
                    return interaction.reply({ content: 'There was an error retrieving your level.', ephemeral: true });
                }
            
                // Create an embed for the top 10 users
                const levelEmbed = {
                    color: 0xF49AC1, // Green color for the embed
                    title: `${interaction.user.username}'s Level`,
                    description: rows.map((user) => {
                        return `Level: ${user.level}\nXP: ${user.xp}\n[Click here to view the leaderboard](http://jamaraz.sydders.com/leaderboard)`; // Add your website link here
                    }).join('\n\n') // Join all entries with newlines
                };
            

                // Send the embed to the channel where the command was invoked
                await interaction.reply({
                    embeds: [levelEmbed],
                    content: 'Here is your level!',
                });
            });
        } catch (err) {
            console.error(err);
            await interaction.reply({ content: 'There was an error executing the command.', ephemeral: true });
        }
    },
};
