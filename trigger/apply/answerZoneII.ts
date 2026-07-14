import { LabelBuilder, MessageFlags, ModalBuilder, TextInputBuilder, TextInputStyle } from 'discord.js';
import type { ButtonInteraction } from 'discord.js';
import type MyClient from '@utils/myClient';

import { Apply } from '@function/data';
import { getApplyPlayerData, setApplyPlayerData } from '@function/db';

export default {
    customId: 'answer-zone-2',

    async execute(interaction: ButtonInteraction, _client: MyClient) {

        const getPlayerData = (await getApplyPlayerData(interaction.user.id));
        const answerData = getPlayerData?.answers;

        const modal = new ModalBuilder()
            .setCustomId('answer-zone-2-modal')
            .setTitle('申請表單 - 第二區');

        const Q1Label = new LabelBuilder().setLabel(Apply.Questions.ZoneII.Questions.ImpactToSociality);
        const Q2Label = new LabelBuilder().setLabel(Apply.Questions.ZoneII.Questions.IdealCommunity);
        const Q3Label = new LabelBuilder().setLabel(Apply.Questions.ZoneII.Questions.TeachUs);
        const Q4Label = new LabelBuilder()
            .setLabel('Minecraft 經驗')
            .setDescription(Apply.Questions.ZoneII.Questions.Experience);

        const Q1Input = new TextInputBuilder()
            .setCustomId('answer-zone-2-q1')
            .setStyle(TextInputStyle.Paragraph)
            .setValue(answerData?.ZoneII.Q1 || '')
            .setRequired(true);

        const Q2Input = new TextInputBuilder()
            .setCustomId('answer-zone-2-q2')
            .setStyle(TextInputStyle.Paragraph)
            .setValue(answerData?.ZoneII.Q2 || '')
            .setRequired(true);

        const Q3Input = new TextInputBuilder()
            .setCustomId('answer-zone-2-q3')
            .setStyle(TextInputStyle.Paragraph)
            .setValue(answerData?.ZoneII.Q3 || '')
            .setRequired(true);

        const Q4Input = new TextInputBuilder()
            .setCustomId('answer-zone-2-q4')
            .setStyle(TextInputStyle.Paragraph)
            .setValue(answerData?.ZoneII.Q4 || '')
            .setRequired(true);

        Q1Label.setTextInputComponent(Q1Input);
        Q2Label.setTextInputComponent(Q2Input);
        Q3Label.setTextInputComponent(Q3Input);
        Q4Label.setTextInputComponent(Q4Input);

        modal.addLabelComponents(Q1Label, Q2Label, Q3Label, Q4Label);

        await interaction.showModal(modal);

        const modalSubmit = await interaction.awaitModalSubmit({
            time: 30 * 60 * 1000,
            filter: (i) => i.user.id === interaction.user.id,
        }).catch(async () => {
            await interaction.followUp({ content: '> 你已關閉或申請表單提交逾時，請重新開啟表單。', flags: MessageFlags.Ephemeral });
        })

        if (!modalSubmit) return;

        const Q1Answer = modalSubmit.fields.getTextInputValue('answer-zone-2-q1');
        const Q2Answer = modalSubmit.fields.getTextInputValue('answer-zone-2-q2');
        const Q3Answer = modalSubmit.fields.getTextInputValue('answer-zone-2-q3');
        const Q4Answer = modalSubmit.fields.getTextInputValue('answer-zone-2-q4');

        const writeData = {
            ZoneII: {
                Q1: Q1Answer,
                Q2: Q2Answer,
                Q3: Q3Answer,
                Q4: Q4Answer,
            }
        }

        if (getPlayerData?.answers) {
            getPlayerData.answers.ZoneII = writeData.ZoneII;
            await setApplyPlayerData(interaction.user.id, {
                applyOpened: getPlayerData.applyOpened,
                answers: getPlayerData.answers,
            });
        }

        await modalSubmit.reply({ content: '> 申請表單已提交，感謝你的填寫！', flags: MessageFlags.Ephemeral });
    },
};
