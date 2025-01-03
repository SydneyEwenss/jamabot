require('dotenv').config(); // Import dotenv and load environment variables
const { REST, Routes } = require('discord.js');
const fs = require('fs');

// Get the environment variables from the .env file
const CLIENT_ID = process.env.CLIENT_ID;
const GUILD_ID = process.env.GUILD_ID;
const TOKEN = process.env.TOKEN;

// Load all commands
const commands = [];
const commandFiles = fs.readdirSync('./commands').filter(file => file.endsWith('.js'));

// Load command files
for (const file of commandFiles) {
    const command = require(`./commands/${file}`);
    commands.push(command.data.toJSON());
}

// Register commands
const rest = new REST({ version: '10' }).setToken(TOKEN);

(async () => {
    try {
        console.log('Started refreshing application (/) commands.');

        // Get all current commands registered for the guild
        const currentCommands = await rest.get(Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID));
        
        // Find commands to remove (commands that are no longer in the file system)
        const commandsToRemove = currentCommands.filter(existingCommand => {
            return !commandFiles.some(file => {
                return file.split('.')[0] === existingCommand.name;
            });
        });

        // Remove outdated commands
        for (const command of commandsToRemove) {
            console.log(`Removing command: ${command.name}`);
            await rest.delete(Routes.applicationGuildCommand(CLIENT_ID, GUILD_ID, command.id));
        }

        // Register new commands or update existing ones
        await rest.put(
            Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID), // Use Routes.applicationCommands for global
            { body: commands },
        );

        console.log('Successfully reloaded application (/) commands.');
    } catch (error) {
        console.error(error);
    }
})();
