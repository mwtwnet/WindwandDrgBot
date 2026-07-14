import {
    CheckboxGroupBuilder,
    CheckboxGroupOptionBuilder,
    LabelBuilder,
    MessageFlags,
    ModalBuilder,
    StringSelectMenuBuilder,
    StringSelectMenuOptionBuilder,
    TextInputBuilder,
    TextInputStyle,
} from 'discord.js';
import type { ButtonInteraction } from 'discord.js';
import type MyClient from '@utils/myClient';

import { getApplyPlayerData, setApplyPlayerData } from '@function/db';
import { createGameMechanicsPage } from '@utils/apply/gameMechanics';

export default {
    customId: 'page_answer-zone-4-game-question',

    async execute(interaction: ButtonInteraction, _client: MyClient, page?: number) {
        if (!page) {
            await interaction.reply({ content: '> 找不到題目頁數。', flags: MessageFlags.Ephemeral });
            return;
        }

        const playerData = await getApplyPlayerData(interaction.user.id);
        const gameMechanics = playerData?.answers.ZoneIV?.GameMechanics;
        const question = gameMechanics?.Questions[page - 1];

        if (!playerData || playerData.answers.ZoneIV?.PlayerType !== 'game-mechanics' || !question) {
            await interaction.reply({ content: '> 這題不在你目前的遊戲機制題目中。', flags: MessageFlags.Ephemeral });
            return;
        }

        const modalCustomId = `answer-zone-4-game-modal-${question.QuestionId}`;
        const modal = new ModalBuilder()
            .setCustomId(modalCustomId)
            .setTitle(`遊戲機制題目 - Q${question.Order}`);
        const answerLabel = new LabelBuilder()
            .setLabel(`回答 Q${question.Order}`)
            .setDescription(question.Question.slice(0, 100));

        if (question.RespondType === 'MULTIPLE_CHOICE') {
            const selectedOptions = new Set(question.Answer.split('、').filter(Boolean));
            const options = question.Options.map(option => {
                const builder = new CheckboxGroupOptionBuilder()
                    .setLabel(option)
                    .setValue(option);
                if (selectedOptions.has(option)) builder.setDefault(true);
                return builder;
            });

            answerLabel.setCheckboxGroupComponent(
                new CheckboxGroupBuilder()
                    .setCustomId('game-mechanics-answer')
                    .setRequired(true)
                    .setMinValues(1)
                    .setMaxValues(options.length)
                    .addOptions(options),
            );
        } else if (question.RespondType === 'OPTION') {
            answerLabel.setStringSelectMenuComponent(
                new StringSelectMenuBuilder()
                    .setCustomId('game-mechanics-answer')
                    .setRequired(true)
                    .addOptions(
                        question.Options.map(option => new StringSelectMenuOptionBuilder()
                            .setLabel(option)
                            .setValue(option)
                            .setDefault(option === question.Answer)),
                    ),
            );
        } else {
            answerLabel.setTextInputComponent(
                new TextInputBuilder()
                    .setCustomId('game-mechanics-answer')
                    .setStyle(question.RespondType === 'SHORT_ANSWER' ? TextInputStyle.Short : TextInputStyle.Paragraph)
                    .setValue(question.Answer)
                    .setRequired(true),
            );
        }

        modal.addLabelComponents(answerLabel);
        await interaction.showModal(modal);

        const modalSubmit = await interaction.awaitModalSubmit({
            time: 30 * 60 * 1000,
            filter: submitted => submitted.user.id === interaction.user.id
                && submitted.customId === modalCustomId,
        }).catch(async () => {
            await interaction.followUp({ content: '> 表單已關閉或提交逾時，請重新按下回答按鈕。', flags: MessageFlags.Ephemeral });
        });

        if (!modalSubmit) return;
        if (!modalSubmit.deferred && !modalSubmit.replied) {
            await modalSubmit.deferReply({ flags: MessageFlags.Ephemeral });
        }

        let answer: string;
        if (question.RespondType === 'MULTIPLE_CHOICE') {
            answer = modalSubmit.fields.getCheckboxGroup('game-mechanics-answer').join('、');
        } else if (question.RespondType === 'OPTION') {
            answer = modalSubmit.fields.getStringSelectValues('game-mechanics-answer')[0] ?? '';
        } else {
            answer = modalSubmit.fields.getTextInputValue('game-mechanics-answer');
        }

        const latestPlayerData = await getApplyPlayerData(interaction.user.id);
        const latestZoneIV = latestPlayerData?.answers.ZoneIV;
        const latestQuestion = latestZoneIV?.GameMechanics?.Questions
            .find(item => item.QuestionId === question.QuestionId);

        if (!latestPlayerData || latestZoneIV?.PlayerType !== 'game-mechanics' || !latestQuestion) {
            await modalSubmit.editReply({ content: '> 玩家類型已經變更，這次答案沒有儲存。' });
            return;
        }

        latestQuestion.Answer = answer;
        latestZoneIV.Completed = false;
        await setApplyPlayerData(interaction.user.id, latestPlayerData);

        const answered = latestZoneIV.GameMechanics!.Questions
            .filter(item => item.Answer.trim().length > 0)
            .length;
        const nextPage = Math.min(latestQuestion.Order + 1, latestZoneIV.GameMechanics!.Questions.length + 1);

        await interaction.message.edit({
            ...createGameMechanicsPage(latestZoneIV.GameMechanics!.Questions, nextPage),
            attachments: [],
        });
        await modalSubmit.editReply({
            content: `> Q${latestQuestion.Order} 的答案已儲存，目前完成 ${answered}/10 題，已自動前往下一頁。`,
        });
    },
};
