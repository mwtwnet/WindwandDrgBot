import { MessageFlags } from 'discord.js';
import type { ButtonInteraction } from 'discord.js';
import type MyClient from '@utils/myClient';

import { getApplyPlayerData } from '@function/db';
import { createGameMechanicsPage } from '@utils/apply/gameMechanics';

export default {
    customId: 'page_game-question-page',

    async execute(interaction: ButtonInteraction, _client: MyClient, page?: number) {
        const playerData = await getApplyPlayerData(interaction.user.id);
        const zoneIV = playerData?.answers.ZoneIV;
        const questions = zoneIV?.GameMechanics?.Questions;

        if (!page || zoneIV?.PlayerType !== 'game-mechanics' || !questions) {
            await interaction.reply({ content: '> 找不到你目前的遊戲機制題目。', flags: MessageFlags.Ephemeral });
            return;
        }

        await interaction.update({
            ...createGameMechanicsPage(questions, page, zoneIV.Completed),
            attachments: [],
        });
    },
};
