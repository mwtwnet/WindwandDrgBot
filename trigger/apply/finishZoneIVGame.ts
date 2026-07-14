import { MessageFlags } from 'discord.js';
import type { ButtonInteraction } from 'discord.js';
import type MyClient from '@utils/myClient';

import { getApplyPlayerData, setApplyPlayerData } from '@function/db';
import { createGameMechanicsPage } from '@utils/apply/gameMechanics';
import { createZoneVMessage } from '@utils/apply/message';

export default {
    customId: 'finish-zone-4-game',

    async execute(interaction: ButtonInteraction, _client: MyClient) {
        const playerData = await getApplyPlayerData(interaction.user.id);
        const zoneIV = playerData?.answers.ZoneIV;
        const questions = zoneIV?.GameMechanics?.Questions;

        if (!playerData || zoneIV?.PlayerType !== 'game-mechanics' || !questions) {
            await interaction.reply({ content: '> 找不到你目前的遊戲機制題目。', flags: MessageFlags.Ephemeral });
            return;
        }

        const unanswered = questions.filter(question => !question.Answer.trim());
        if (unanswered.length > 0) {
            await interaction.reply({
                content: `> 還有 ${unanswered.length} 題尚未回答，請完成後再提交第四區。`,
                flags: MessageFlags.Ephemeral,
            });
            return;
        }

        await interaction.deferUpdate();
        zoneIV.Completed = true;
        await setApplyPlayerData(interaction.user.id, playerData);

        await interaction.message.edit({
            ...createGameMechanicsPage(questions, questions.length + 1, true),
            attachments: [],
        });
        await interaction.followUp({
            content: '> 遊戲機制題目已提交。你仍可重新選擇玩家類型，或確認後提交整份申請。',
            ...createZoneVMessage(),
            flags: MessageFlags.Ephemeral,
        });
    },
};
