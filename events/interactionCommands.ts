import { EmbedBuilder, Events, GuildMemberRoleManager, MessageFlags } from 'discord.js';
import type { Interaction } from 'discord.js';
import config from '@root/config.json' with { type: 'json' };
import logger from '@function/log.js';
import type MyClient from '@utils/myClient.js';

const { Role } = config;
export default {
    name: Events.InteractionCreate,

    async execute(interaction: Interaction, client: MyClient): Promise<void> {
        if (!interaction.isChatInputCommand() && !interaction.isAutocomplete()) return;

        const command = client.commands.get(interaction.commandName);
        if (!command) {
            logger.warn(`No command matching ${interaction.commandName} was found.`);
            return;
        }

        try {
            const commandFolder = command.folder ?? '';
            const isAdminCommand = commandFolder === 'admin' || commandFolder.startsWith('admin-');
            const hasAdminRole = interaction.member !== null && (
                interaction.member.roles instanceof GuildMemberRoleManager
                    ? interaction.member.roles.cache.has(Role.AdminRoleId)
                    : interaction.member.roles.includes(Role.AdminRoleId)
            );

            if (isAdminCommand && !hasAdminRole) {
                const embed = new EmbedBuilder()
                    .setTitle('Permission Denied ❌')
                    .setDescription('You do not have permission to use this command.')
                    .setColor(0xFF0000);

                if (interaction.isChatInputCommand()) {
                    await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
                }
                return;
            }

            if (interaction.isAutocomplete()) {
                await command.autocomplete?.(interaction, client);
                return;
            }

            await command.execute(interaction, client);
        } catch (error) {
            logger.error(`Error executing command ${interaction.commandName}`);
            logger.error(error instanceof Error ? error.stack : error);

            if (!interaction.isChatInputCommand()) return;

            const embed = new EmbedBuilder()
                .setTitle('Error ❌')
                .setDescription('There was an error while executing this command.')
                .setColor(0xFF0000);

            if (interaction.replied || interaction.deferred) {
                await interaction.editReply({ embeds: [embed] });
            } else {
                await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
            }
        }
    },
};
