import { LabelBuilder, MessageFlags, ModalBuilder, StringSelectMenuBuilder, StringSelectMenuOptionBuilder, TextInputBuilder, TextInputStyle } from 'discord.js';
import type { ButtonInteraction } from 'discord.js';
import type MyClient from '@utils/myClient';

import { Apply } from '@function/data';
import { getApplyPlayerData, setApplyPlayerData } from '@function/db';

export default {
    customId: 'answer-zone-1',

    async execute(interaction: ButtonInteraction, _client: MyClient) {

        const getPlayerData = (await getApplyPlayerData(interaction.user.id));
        const answerData = getPlayerData?.answers;

        const modal = new ModalBuilder()
            .setCustomId('answer-zone-1-modal')
            .setTitle('申請表單 - 第一區');

        const Q1Label = new LabelBuilder().setLabel(Apply.Questions.ZoneI.Questions.Id);
        const Q2Label = new LabelBuilder().setLabel(Apply.Questions.ZoneI.Questions.Age);
        const Q3Label = new LabelBuilder().setLabel(Apply.Questions.ZoneI.Questions.Playtime);
        const Q4Label = new LabelBuilder().setLabel(Apply.Questions.ZoneI.Questions.Category);
        const Q5Label = new LabelBuilder().setLabel(Apply.Questions.ZoneI.Questions.Server);

        const Q1Input = new TextInputBuilder()
            .setCustomId('answer-zone-1-q1')
            .setStyle(TextInputStyle.Short)
            .setValue(answerData?.ZoneI.Q1 || '')
            .setRequired(true);

        const Q2Input =  new StringSelectMenuBuilder()
            .setCustomId('answer-zone-1-q2')
            .setRequired(true)
            .setPlaceholder(answerData?.ZoneI.Q2 || '')
            .addOptions(
                new StringSelectMenuOptionBuilder()
                    .setLabel('國小 (12< 歲)')
                    .setValue('elementary'),
                new StringSelectMenuOptionBuilder()
                    .setLabel('國中 (~15 歲)')
                    .setValue('junior-high'),
                new StringSelectMenuOptionBuilder()
                    .setLabel('高中 (~18 歲)')
                    .setValue('high-school'),
                new StringSelectMenuOptionBuilder()
                    .setLabel('其他 (>18 歲)')
                    .setValue('college')
            )

        const Q3Input = new TextInputBuilder()
            .setCustomId('answer-zone-1-q3')
            .setStyle(TextInputStyle.Short)
            .setValue(answerData?.ZoneI.Q3 || '')
            .setRequired(true);

        const Q4Input = new TextInputBuilder()
            .setCustomId('answer-zone-1-q4')
            .setStyle(TextInputStyle.Short)
            .setValue(answerData?.ZoneI.Q4 || '')
            .setRequired(true);

        const Q5Input = new TextInputBuilder()
            .setCustomId('answer-zone-1-q5')
            .setStyle(TextInputStyle.Short)
            .setValue(answerData?.ZoneI.Q5 || '')
            .setRequired(true);

        Q1Label.setTextInputComponent(Q1Input);
        Q2Label.setStringSelectMenuComponent(Q2Input);
        Q3Label.setTextInputComponent(Q3Input);
        Q4Label.setTextInputComponent(Q4Input);
        Q5Label.setTextInputComponent(Q5Input);
            
        modal.addLabelComponents(Q1Label, Q2Label, Q3Label, Q4Label, Q5Label);

        await interaction.showModal(modal);
        

        const modalSubmit = await interaction.awaitModalSubmit({
            time: 10*60*1000,
            filter: (i) => i.user.id === interaction.user.id,
        }).catch(async () => {
            await interaction.followUp({ content: '> 你已關閉或申請表單提交逾時，請重新開啟表單。', flags: MessageFlags.Ephemeral });
        })

        if (!modalSubmit) return;

        const Q1Answer = modalSubmit.fields.getTextInputValue('answer-zone-1-q1');
        const Q2Answer = modalSubmit.fields.getStringSelectValues('answer-zone-1-q2')[0] ?? '';
        const Q3Answer = modalSubmit.fields.getTextInputValue('answer-zone-1-q3');
        const Q4Answer = modalSubmit.fields.getTextInputValue('answer-zone-1-q4');
        const Q5Answer = modalSubmit.fields.getTextInputValue('answer-zone-1-q5');

        const writeData = {
            ZoneI: {
                Q1: Q1Answer,
                Q2: Q2Answer,
                Q3: Q3Answer,
                Q4: Q4Answer,
                Q5: Q5Answer,
            }
        }

        if (getPlayerData?.answers) {
            getPlayerData.answers.ZoneI = writeData.ZoneI;
            await setApplyPlayerData(interaction.user.id, {
                applyOpened: getPlayerData.applyOpened,
                answers: getPlayerData.answers,
            });
        }

        await modalSubmit.reply({ content: '> 申請表單已提交，感謝你的填寫！', flags: MessageFlags.Ephemeral });

    },
};
