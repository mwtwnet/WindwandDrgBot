import { EmbedBuilder, MessageFlags, SlashCommandBuilder } from 'discord.js';
import type { AutocompleteInteraction, ChatInputCommandInteraction } from 'discord.js';
import type MyClient from '../../utils/myClient.js';

export default {
    data: new SlashCommandBuilder()
        .setName('ping')
        .setDescription('Replies with Pong!'),

    /**
     * @param {import('discord.js').ChatInputCommandInteraction} interaction
     * @param {import('discord.js').Client} client
     */

    async execute(interaction: ChatInputCommandInteraction, _client: MyClient) {

        const embed = new EmbedBuilder()
            .setTitle('Pong! 🏓')
            .setDescription(`Latency is \`${interaction.createdTimestamp - Date.now()}ms\``)
            .setColor(0x00FF00);

        await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
    },

    /**
     * @param {import('discord.js').AutocompleteInteraction} interaction
     * @param {import('discord.js').Client} client
     */
    async autocomplete(_interaction: AutocompleteInteraction, _client: MyClient) {


    }
};
