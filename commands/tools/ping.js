const { SlashCommandBuilder, EmbedBuilder } = require('@discordjs/builders');
const logger = require('../../function/log');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ping')
        .setDescription('Replies with Pong!'),

    /**
     * @param {import('discord.js').ChatInputCommandInteraction} interaction
     * @param {import('discord.js').Client} client
     */

    async execute(interaction, client) {

        const embed = new EmbedBuilder()
            .setTitle('Pong! 🏓')
            .setDescription(`Latency is \`${interaction.createdTimestamp - Date.now()}ms\``)
            .setColor(0x00FF00);

        await interaction.reply({ embeds: [embed], flags: 'Ephemeral' });
    },

    async autocomplete(interaction, client) {


    }
}