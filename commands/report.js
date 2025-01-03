const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('report')
        .setDescription('Report an issue to the moderators.')
        .addStringOption(option =>
            option.setName('description')
                .setDescription('Describe the issue or report')
                .setRequired(true)
        ),
    async execute(interaction) {
        // Get the description from the user input
        const description = interaction.options.getString('description');
        
        // Replace with your specific report channel ID and mod role ID
        const reportChannelId = '1243251997470097479';
        const modRoleId = '1243250506487562260';

        // Get the report channel and mod role
        const reportChannel = interaction.guild.channels.cache.get(reportChannelId);
        const modRole = interaction.guild.roles.cache.get(modRoleId);

        if (!reportChannel || !modRole) {
            return interaction.reply({
                content: 'Error: Report channel or mod role not found. Please contact Sydders',
                ephemeral: true
            });
        }

        // Get the channel name and the current time
        const reportChannelName = interaction.channel.name;
        const reportTime = new Date().toLocaleString(); // You can customize the date format here

        // Create the embed
        const reportEmbed = new EmbedBuilder()
            .setColor('#ff0000')  // Red color for urgency
            .setTitle('New Report')
            .setDescription(description)
            .addFields(
                { name: 'Reported By', value: interaction.user.tag, inline: true },
                { name: 'Report Channel', value: `#${reportChannelName}`, inline: true },
                { name: 'Time of Report', value: reportTime, inline: true }
            )
            .setTimestamp()
            .setFooter({ text: 'Reported Message' });

        // Send the report to the specified channel and ping the mod role
        await reportChannel.send({
            content: `${modRole}`,  // Ping the mod role
            embeds: [reportEmbed],
        });

        // Acknowledge the user who reported the issue
        await interaction.reply({
            content: 'Thank you for your report! The mod team has been notified.',
            ephemeral: true,  // This reply is only visible to the user
        });
    },
};
