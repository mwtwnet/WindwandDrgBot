import { LabelBuilder, MessageFlags, ModalBuilder, StringSelectMenuBuilder, StringSelectMenuOptionBuilder, TextInputBuilder, TextInputStyle } from 'discord.js';
import type { ButtonInteraction } from 'discord.js';
import type MyClient from '@utils/myClient';

import { Apply } from '@function/data';
import { getApplyPlayerData, setApplyPlayerData } from '@function/db';

export default {
    customId: 'answer-zone-3',

    async execute(interaction: ButtonInteraction, _client: MyClient) {

        const getPlayerData = (await getApplyPlayerData(interaction.user.id));
        const answerData = getPlayerData?.answers;
        const selectedMods = new Set(
            (answerData?.ZoneIII.Q1 || '')
                .split(',')
                .map(mod => mod.trim())
                .filter(Boolean)
        );

        const modal = new ModalBuilder()
            .setCustomId('answer-zone-3-modal')
            .setTitle('申請表單 - 第三區');

        const Q1Label = new LabelBuilder().setLabel(Apply.Questions.ZoneIII.Questions.ModUsage.Title);
        const Q2Label = new LabelBuilder().setLabel(Apply.Questions.ZoneIII.Questions.UnreasonableSituation);
        const Q3Label = new LabelBuilder().setLabel(Apply.Questions.ZoneIII.Questions.TakingNonPublicItems);
        const Q4Label = new LabelBuilder().setLabel(Apply.Questions.ZoneIII.Questions.ProjectPreparation);
        const Q5Label = new LabelBuilder().setLabel(Apply.Questions.ZoneIII.Questions.ClearUnderstanding);

        const Q1Input = new StringSelectMenuBuilder()
            .setCustomId('answer-zone-3-q1')
            .setRequired(false)
            .setMinValues(0)
            .setMaxValues(Apply.Questions.ZoneIII.Questions.ModUsage.Mods.length)
            .setPlaceholder('請選擇使用過的 Mod')
            .addOptions(
                Apply.Questions.ZoneIII.Questions.ModUsage.Mods.map(mod =>
                    new StringSelectMenuOptionBuilder()
                        .setLabel(mod)
                        .setValue(mod)
                        .setDefault(selectedMods.has(mod))
                )
            );

        const Q2Input = new TextInputBuilder()
            .setCustomId('answer-zone-3-q2')
            .setStyle(TextInputStyle.Paragraph)
            .setValue(answerData?.ZoneIII.Q2 || '')
            .setRequired(true);

        const Q3Input = new TextInputBuilder()
            .setCustomId('answer-zone-3-q3')
            .setStyle(TextInputStyle.Paragraph)
            .setValue(answerData?.ZoneIII.Q3 || '')
            .setRequired(true);

        const Q4Input = new TextInputBuilder()
            .setCustomId('answer-zone-3-q4')
            .setStyle(TextInputStyle.Paragraph)
            .setValue(answerData?.ZoneIII.Q4 || '')
            .setRequired(true);

        const Q5Input = new TextInputBuilder()
            .setCustomId('answer-zone-3-q5')
            .setStyle(TextInputStyle.Paragraph)
            .setValue(answerData?.ZoneIII.Q5 || '')
            .setRequired(true);

        Q1Label.setStringSelectMenuComponent(Q1Input);
        Q2Label.setTextInputComponent(Q2Input);
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

        const Q1Answer = modalSubmit.fields.getStringSelectValues('answer-zone-3-q1').join(', ');
        const Q2Answer = modalSubmit.fields.getTextInputValue('answer-zone-3-q2');
        const Q3Answer = modalSubmit.fields.getTextInputValue('answer-zone-3-q3');
        const Q4Answer = modalSubmit.fields.getTextInputValue('answer-zone-3-q4');
        const Q5Answer = modalSubmit.fields.getTextInputValue('answer-zone-3-q5');

        const writeData = {
            ZoneIII: {
                Q1: Q1Answer,
                Q2: Q2Answer,
                Q3: Q3Answer,
                Q4: Q4Answer,
                Q5: Q5Answer,
            }
        }

        if (getPlayerData?.answers) {
            getPlayerData.answers.ZoneIII = writeData.ZoneIII;
            await setApplyPlayerData(interaction.user.id, {
                applyOpened: getPlayerData.applyOpened,
                answers: getPlayerData.answers,
            });
        }

        await modalSubmit.reply({ content: '> 申請表單已提交，感謝你的填寫！', flags: MessageFlags.Ephemeral });
    },
};
