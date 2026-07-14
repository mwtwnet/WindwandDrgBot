import { SlashCommandSubcommandGroupBuilder } from 'discord.js';

export default {
    data: new SlashCommandSubcommandGroupBuilder()
        .setName('question')
        .setDescription('Manage application questions'),
};
