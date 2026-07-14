import { EmbedBuilder, Events, MessageFlags } from 'discord.js';
import type { Interaction } from 'discord.js';
import logger from '@function/log';
import type MyClient from '@utils/myClient';

export default {
    name: Events.InteractionCreate,

    async execute(interaction: Interaction, client: MyClient): Promise<void> {
        if (!interaction.isButton() && !interaction.isModalSubmit()) return;
        if (interaction.customId.startsWith('page:')) return;

        const loaded = client.triggers.get(interaction.customId);
        if (!loaded) return;

        try {
            await loaded.trigger.execute(interaction, client);
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
