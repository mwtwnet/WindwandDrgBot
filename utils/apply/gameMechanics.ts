import fs from 'node:fs';
import path from 'node:path';
import { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } from 'discord.js';
import type { GameMechanicAnswer } from '@function/db';

interface GameMechanicsPagePayload {
    embeds: EmbedBuilder[];
    components: ActionRowBuilder<ButtonBuilder>[];
    files: Array<{ attachment: string; name: string }>;
}

const difficultyNames: Record<number, string> = {
    1: '簡單',
    2: '中等',
    3: '困難',
};

export function createGameMechanicsPage(
    questions: GameMechanicAnswer[],
    requestedPage: number,
    submitted = false,
): GameMechanicsPagePayload {
    const totalPages = questions.length + 1;
    const page = Math.min(Math.max(requestedPage, 1), totalPages);

    if (page === totalPages) {
        const answered = questions.filter(question => question.Answer.trim().length > 0).length;
        const ready = answered === questions.length;
        const embed = new EmbedBuilder()
            .setTitle('遊戲機制｜完成與提交')
            .setDescription([
                `已完成 **${answered}/${questions.length}** 題。`,
                ready
                    ? '所有題目都已回答，你可以提交第四區。'
                    : '仍有題目尚未回答，請返回前面的頁面完成。',
            ].join('\n'))
            .setColor(ready ? 0x57F287 : 0xFEE75C)
            .setFooter({ text: `Page ${page}/${totalPages}` });

        const previousButton = new ButtonBuilder()
            .setCustomId(`page:${page - 1}_game-question-page`)
            .setLabel('上一題')
            .setEmoji('⬅️')
            .setStyle(ButtonStyle.Secondary);
        const submitButton = new ButtonBuilder()
            .setCustomId('finish-zone-4-game')
            .setLabel(submitted ? '第四區已提交' : '提交第四區')
            .setEmoji('✅')
            .setStyle(ButtonStyle.Success)
            .setDisabled(!ready || submitted);

        return {
            embeds: [embed],
            components: [new ActionRowBuilder<ButtonBuilder>().addComponents(previousButton, submitButton)],
            files: [],
        };
    }

    const question = questions[page - 1]!;
    const embed = new EmbedBuilder()
        .setTitle(`Q${question.Order}`)
        .setDescription(question.Question)
        .addFields(
            { name: '難度', value: difficultyNames[question.Difficulty] ?? String(question.Difficulty), inline: true },
            { name: '配分', value: String(question.MaxScore), inline: true },
            { name: '狀態', value: question.Answer.trim() ? '✅ 已回答' : '⬜ 尚未回答', inline: true },
        )
        .setColor(question.Answer.trim() ? 0x57F287 : 0x5865F2)
        .setFooter({ text: `Page ${page}/${totalPages}` });

    const files: Array<{ attachment: string; name: string }> = [];
    if (question.Attachment) {
        const repositoryRoot = path.resolve(import.meta.dirname, '..', '..');
        const attachmentPath = path.resolve(repositoryRoot, question.Attachment);
        const isLocalAsset = attachmentPath.startsWith(`${repositoryRoot}${path.sep}`);

        if (isLocalAsset && fs.existsSync(attachmentPath)) {
            const fileName = path.basename(attachmentPath);
            files.push({ attachment: attachmentPath, name: fileName });
            embed.setImage(`attachment://${fileName}`);
        }
    }

    const previousButton = new ButtonBuilder()
        .setCustomId(`page:${Math.max(page - 1, 1)}_game-question-page`)
        .setLabel('上一題')
        .setEmoji('⬅️')
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(page === 1);
    const answerButton = new ButtonBuilder()
        .setCustomId(`page:${page}_answer-zone-4-game-question`)
        .setLabel(question.Answer.trim() ? '修改答案' : '回答問題')
        .setEmoji('✏️')
        .setStyle(ButtonStyle.Primary);
    const nextButton = new ButtonBuilder()
        .setCustomId(`page:${page + 1}_game-question-page`)
        .setLabel(page === questions.length ? '完成頁' : '下一題')
        .setEmoji('➡️')
        .setStyle(ButtonStyle.Secondary);

    return {
        embeds: [embed],
        files,
        components: [new ActionRowBuilder<ButtonBuilder>().addComponents(previousButton, answerButton, nextButton)],
    };
}
