import { ActionRowBuilder, ButtonBuilder, MessageFlags } from 'discord.js';
import type { ButtonInteraction } from 'discord.js';
import type MyClient from '@utils/myClient';

import { getApplyPlayerData, setApplyPlayerData } from '@function/db';
import { createApplicationSummary } from '@utils/apply/message';

export default {
    customId: 'submit-apply',

    async execute(interaction: ButtonInteraction, _client: MyClient) {
        const playerData = await getApplyPlayerData(interaction.user.id);
        const channel = interaction.channel;

        if (!playerData || !channel?.isThread()) {
            await interaction.reply({ content: '> 找不到你的申請資料或申請討論串。', flags: MessageFlags.Ephemeral });
            return;
        }

        if (!playerData.answers.ZoneIV?.Completed) {
            await interaction.reply({ content: '> 請先完成第四區再提交申請。', flags: MessageFlags.Ephemeral });
            return;
        }

        await interaction.deferUpdate();

        playerData.answers.ZoneV = { Honesty: '是，以上資訊均已理解並誠實填寫。' };
        const summary = createApplicationSummary(interaction.user.tag, playerData);

        try {
            await interaction.user.send({
                content: '你的生電龍社群申請已提交，完整回答記錄如下：',
                files: [{
                    attachment: Buffer.from(summary, 'utf8'),
                    name: 'application-summary.txt',
                }],
            });
        } catch {
            await interaction.followUp({
                content: '> 無法寄送私人訊息。請開啟「允許伺服器成員傳送私人訊息」後再次提交。',
                flags: MessageFlags.Ephemeral,
            });
            return;
        }

        await setApplyPlayerData(interaction.user.id, playerData);

        const disabledButton = ButtonBuilder.from(interaction.component).setDisabled(true);
        const row = new ActionRowBuilder<ButtonBuilder>().addComponents(disabledButton);
        await interaction.editReply({ components: [row] });

        await channel.setLocked(true, `申請已由 ${interaction.user.tag} 提交`);
    },
};
