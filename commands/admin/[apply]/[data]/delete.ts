import { SlashCommandSubcommandBuilder } from 'discord.js';
import type { AutocompleteInteraction, ChatInputCommandInteraction } from 'discord.js';
import { deletePlayerData, getApplyPlayerData } from '@function/db';
import type MyClient from '@utils/myClient';

export default {
    data: new SlashCommandSubcommandBuilder()
        .setName('delete')
        .setDescription('remove the player apply data')
        .addUserOption(opt => opt
            .setName('player')
            .setDescription('the player to remove the apply data')
            .setRequired(true)
        ),

    async execute(interaction: ChatInputCommandInteraction, _client: MyClient) {
        
        await interaction.reply({ content: "Finding the player apply data...", flags: 'Ephemeral'});

        const player = interaction.options.getUser('player', true);
        const fetchPlayerData = await getApplyPlayerData(player.id);

        if (!fetchPlayerData) {
            await interaction.editReply({ content: `No apply data found for player ${player.tag}.`});
            return;
        }

        await interaction.editReply({ content: `Deleting the apply data for player ${player.tag}...`});

        const deleted = await deletePlayerData(player.id);
        if (!deleted) {
            await interaction.editReply({ content: `The apply data for player ${player.tag} was not deleted because the database row no longer exists.`});
            return;
        }

        await interaction.editReply({ content: `Apply data for player ${player.tag} has been deleted.`});
    },
    async autocomplete(_interaction: AutocompleteInteraction, _client: MyClient) {},
};
