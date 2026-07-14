import { EmbedBuilder, Events, MessageFlags } from 'discord.js';
import type { Interaction } from 'discord.js';
import logger from '@function/log.js';
import type MyClient from '@utils/myClient.js';

export default {
    name: Events.InteractionCreate,

    async execute(interaction: Interaction, client: MyClient): Promise<void> {
        if (!interaction.isButton() && !interaction.isModalSubmit()) return;

        const pageMatch = interaction.customId.match(/^page:(\d+)_/);
        const pageText = pageMatch?.[1];
        if (!pageText) return;

        const page = Number.parseInt(pageText, 10);
        const customId = interaction.customId.replace(/^page:(\d+)_/, 'page_');
        const loaded = client.triggers.get(customId);
        if (!loaded) return;

        try {
            await loaded.trigger.execute(interaction, client, page);
        } catch (error) {
            logger.error(`Error executing component ${interaction.customId}`);
            logger.error(error instanceof Error ? error.stack : error);

            const embed = new EmbedBuilder()
                .setTitle('Error ❌')
                .setDescription('There was an error while executing this component.')
                .setColor(0xFF0000);

            if (interaction.replied || interaction.deferred) {
                await interaction.editReply({ embeds: [embed] });
            } else {
                await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
            }
        }
    },
};
