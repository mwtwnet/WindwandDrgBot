import { SlashCommandSubcommandGroupBuilder } from 'discord.js';

export default {
    data: new SlashCommandSubcommandGroupBuilder()
        .setName('data')
        .setDescription('modify the player apply data'),
};
