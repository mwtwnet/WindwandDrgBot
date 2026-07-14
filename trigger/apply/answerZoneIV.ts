import { FileUploadBuilder, LabelBuilder, MessageFlags, ModalBuilder, TextInputBuilder, TextInputStyle } from 'discord.js';
import type { StringSelectMenuInteraction } from 'discord.js';
import type MyClient from '@utils/myClient';

import { getApplyPlayerData, selectGameMechanicQuestions, setApplyPlayerData } from '@function/db';
import type { ApplyData, ApplyPlayerType } from '@function/db';
import { config } from '@function/data';
import { createZoneVMessage } from '@utils/apply/message';
import { createGameMechanicsPage } from '@utils/apply/gameMechanics';

const playerTypes: ApplyPlayerType[] = [
    'game-mechanics',
    'building-and-art',
    'workers',
    'technical-operations',
];

function emptyZoneIV(playerType: ApplyPlayerType): NonNullable<ApplyData['answers']['ZoneIV']> {
    return {
        PlayerType: playerType,
        Completed: false,
        Q1: '',
        Q2: '',
        Q3: '',
        Q4: '',
        Q5: '',
        Q6: '',
    };
}

async function saveZoneIV(
    userId: string,
    playerData: ApplyData,
    zoneIV: NonNullable<ApplyData['answers']['ZoneIV']>,
): Promise<void> {
    playerData.answers.ZoneIV = zoneIV;
    await setApplyPlayerData(userId, playerData);
}

export default {
    customId: 'answer-zone-4-q1',

    async execute(interaction: StringSelectMenuInteraction, _client: MyClient) {
        const selectedType = interaction.values[0];
        if (!playerTypes.includes(selectedType as ApplyPlayerType)) {
            await interaction.reply({ content: '> 無法辨識選擇的玩家類型。', flags: MessageFlags.Ephemeral });
            return;
        }

        const playerType = selectedType as ApplyPlayerType;
        const playerData = await getApplyPlayerData(interaction.user.id);
        const channel = interaction.channel;

        if (!playerData || !channel?.isThread()) {
            await interaction.reply({ content: '> 找不到你的申請資料或申請討論串。', flags: MessageFlags.Ephemeral });
            return;
        }

        switch (playerType) {
            case 'game-mechanics':
                await answerGameMechanics(interaction, playerData);
                break;
            case 'building-and-art':
                await answerBuildingAndArt(interaction, playerData);
                break;
            case 'workers':
                await passWorkers(interaction, playerData);
                break;
            case 'technical-operations':
                await answerTechnicalOperations(interaction, playerData);
                break;
        }
    },
};

const difficultyDetails = {
    1: { label: '簡單', score: 1.5 },
    2: { label: '中等', score: 2 },
    3: { label: '困難', score: 3.25 },
} as const;

async function answerGameMechanics(
    interaction: StringSelectMenuInteraction,
    playerData: ApplyData,
): Promise<void> {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const channel = interaction.channel;
    if (!channel?.isThread()) {
        await interaction.editReply({ content: '> 找不到申請討論串。' });
        return;
    }

    const questions = await selectGameMechanicQuestions(
        config.Apply.ZoneIV.QuestionDistribution,
    ).catch(async error => {
        const message = error instanceof Error ? error.message : 'Unknown question-pool error';
        await interaction.editReply({ content: `> 無法產生遊戲機制題目：${message}` });
    });

    if (!questions) return;

    const zoneIV = emptyZoneIV('game-mechanics');
    zoneIV.GameMechanics = {
        Questions: questions.map((question, index) => {
            const difficulty = difficultyDetails[question.difficulty as keyof typeof difficultyDetails];
            return {
                QuestionId: question.id,
                Order: index + 1,
                Question: question.question,
                RespondType: question.type,
                Difficulty: question.difficulty,
                MaxScore: difficulty.score,
                Attachment: question.attachment ?? '',
                Options: question.options.map(option => option.option),
                Answer: '',
            };
        }),
    };
    await saveZoneIV(interaction.user.id, playerData, zoneIV);

    await channel.send(createGameMechanicsPage(zoneIV.GameMechanics.Questions, 1));

    await interaction.editReply({
        content: '> 已產生 10 題遊戲機制題目。請使用題目訊息中的按鈕作答與換頁。',
    });
}

async function answerBuildingAndArt(
    interaction: StringSelectMenuInteraction,
    playerData: ApplyData,
): Promise<void> {
    const previous = playerData.answers.ZoneIV?.PlayerType === 'building-and-art'
        ? playerData.answers.ZoneIV
        : emptyZoneIV('building-and-art');

    const modal = new ModalBuilder()
        .setCustomId('answer-zone-4-build-modal')
        .setTitle('建築與藝術題目');

    const uploadLabel = new LabelBuilder()
        .setLabel('最滿意的建築作品')
        .setDescription('請上傳一張或多張你做過最滿意的建築作品圖片。')
        .setFileUploadComponent(
            new FileUploadBuilder()
                .setCustomId('answer-zone-4-build-q1')
                .setRequired(true)
                .setMinValues(1)
                .setMaxValues(5),
        );

    const descriptionLabel = new LabelBuilder()
        .setLabel('作品說明')
        .setDescription('請介紹作品的設計想法、特色，以及你負責的部分。')
        .setTextInputComponent(
            new TextInputBuilder()
                .setCustomId('answer-zone-4-build-q2')
                .setStyle(TextInputStyle.Paragraph)
                .setValue(previous.Q2)
                .setRequired(true),
        );

    modal.addLabelComponents(uploadLabel, descriptionLabel);
    await interaction.showModal(modal);

    const channel = interaction.channel;
    if (!channel?.isThread()) return;

    const modalSubmit = await interaction.awaitModalSubmit({
        time: 30 * 60 * 1000,
        filter: submitted => submitted.user.id === interaction.user.id
            && submitted.customId === 'answer-zone-4-build-modal',
    }).catch(async () => {
        await interaction.followUp({ content: '> 表單已關閉或提交逾時，請重新選擇玩家類型。', flags: MessageFlags.Ephemeral });
    });

    if (!modalSubmit) return;

    const files = modalSubmit.fields.getUploadedFiles('answer-zone-4-build-q1', true);
    await saveZoneIV(interaction.user.id, playerData, {
        ...previous,
        PlayerType: 'building-and-art',
        Completed: true,
        Q1: files.map(file => file.url).join('\n'),
        Q2: modalSubmit.fields.getTextInputValue('answer-zone-4-build-q2'),
    });

    await modalSubmit.reply({
        content: '> 建築與藝術題目已提交。你仍可回到選單重新選擇，或確認後提交申請。',
        ...createZoneVMessage(),
        flags: MessageFlags.Ephemeral,
    });
}

async function passWorkers(
    interaction: StringSelectMenuInteraction,
    playerData: ApplyData,
): Promise<void> {
    const channel = interaction.channel;
    if (!channel?.isThread()) return;

    await saveZoneIV(interaction.user.id, playerData, {
        ...emptyZoneIV('workers'),
        Completed: true,
        Q1: '直接通過',
    });
    await interaction.reply({
        content: '> 麵包人不需回答額外題目，第四區已直接通過。你仍可回到選單重新選擇，或確認後提交申請。',
        ...createZoneVMessage(),
        flags: MessageFlags.Ephemeral,
    });
}

async function answerTechnicalOperations(
    interaction: StringSelectMenuInteraction,
    playerData: ApplyData,
): Promise<void> {
    const previous = playerData.answers.ZoneIV?.PlayerType === 'technical-operations'
        ? playerData.answers.ZoneIV
        : emptyZoneIV('technical-operations');

    const modal = new ModalBuilder()
        .setCustomId('answer-zone-4-technical-modal')
        .setTitle('維運技術題目');

    const knowledgeLabel = new LabelBuilder()
        .setLabel('維運與程式技術')
        .setDescription('請介紹你熟悉的維運、伺服器管理或程式技術。')
        .setTextInputComponent(
            new TextInputBuilder()
                .setCustomId('answer-zone-4-technical-q1')
                .setStyle(TextInputStyle.Paragraph)
                .setValue(previous.Q1)
                .setRequired(true),
        );

    modal.addLabelComponents(knowledgeLabel);
    await interaction.showModal(modal);

    const channel = interaction.channel;
    if (!channel?.isThread()) return;

    const modalSubmit = await interaction.awaitModalSubmit({
        time: 30 * 60 * 1000,
        filter: submitted => submitted.user.id === interaction.user.id
            && submitted.customId === 'answer-zone-4-technical-modal',
    }).catch(async () => {
        await interaction.followUp({ content: '> 表單已關閉或提交逾時，請重新選擇玩家類型。', flags: MessageFlags.Ephemeral });
    });

    if (!modalSubmit) return;

    await saveZoneIV(interaction.user.id, playerData, {
        ...previous,
        PlayerType: 'technical-operations',
        Completed: true,
        Q1: modalSubmit.fields.getTextInputValue('answer-zone-4-technical-q1'),
    });

    await modalSubmit.reply({
        content: '> 維運技術題目已提交。你仍可回到選單重新選擇，或確認後提交申請。',
        ...createZoneVMessage(),
        flags: MessageFlags.Ephemeral,
    });
}
