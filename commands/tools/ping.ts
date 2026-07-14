import { EmbedBuilder, MessageFlags, SlashCommandBuilder } from 'discord.js';
import type { AutocompleteInteraction, ChatInputCommandInteraction } from 'discord.js';
import type MyClient from '@utils/myClient';

export default {
    data: new SlashCommandBuilder()
        .setName('ping')
        .setDescription('Replies with Pong!'),

    async execute(interaction: ChatInputCommandInteraction, _client: MyClient) {

        const embed = new EmbedBuilder()
            .setTitle('Pong! 🏓')
            .setDescription(`Latency is \`${interaction.createdTimestamp - Date.now()}ms\``)
            .setColor(0x00FF00);

        await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
    },

    async autocomplete(_interaction: AutocompleteInteraction, _client: MyClient) {


    }
};
