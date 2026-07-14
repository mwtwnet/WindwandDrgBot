import { SlashCommandSubcommandBuilder } from 'discord.js';
import type { AutocompleteInteraction, ChatInputCommandInteraction } from 'discord.js';
import type MyClient from '@utils/myClient';

export default {
    data: new SlashCommandSubcommandBuilder()
        .setName('delete')
        .setDescription('delete a opened private thread'),

    async execute(interaction: ChatInputCommandInteraction, _client: MyClient) {
        
        await interaction.reply({ content: "Deleting the private thread...", flags: 'Ephemeral'});

        const thread = interaction.channel;
        if (!thread || !thread.isThread()) {
            await interaction.editReply({ content: "This command can only be used in a thread channel."});
            return;
        }

        await thread.delete('Admin command to delete the private thread.');

    },
    async autocomplete(_interaction: AutocompleteInteraction, _client: MyClient) {},
};
