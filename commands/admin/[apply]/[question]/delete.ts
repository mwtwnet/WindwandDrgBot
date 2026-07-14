import fs from 'node:fs/promises';
import path from 'node:path';
import { MessageFlags, SlashCommandSubcommandBuilder } from 'discord.js';
import type { ChatInputCommandInteraction } from 'discord.js';
import prisma from '@function/db';
import type MyClient from '@utils/myClient';

export default {
    data: new SlashCommandSubcommandBuilder()
        .setName('delete')
        .setDescription('Delete a question and its options')
        .addIntegerOption(option => option
            .setName('question_id')
            .setDescription('Question ID from the question list')
            .setMinValue(1)
            .setRequired(true)),

    async execute(interaction: ChatInputCommandInteraction, _client: MyClient) {
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });

        const questionId = interaction.options.getInteger('question_id', true);
        const question = await prisma.questions.findUnique({ where: { id: questionId } });
        if (!question) {
            await interaction.editReply({ content: `> Question #${questionId} does not exist.` });
            return;
        }

        await prisma.$transaction([
            prisma.options.deleteMany({ where: { questionId } }),
            prisma.questions.delete({ where: { id: questionId } }),
        ]);

        if (question.attachment) {
            const repositoryRoot = path.resolve(import.meta.dirname, '..', '..', '..', '..');
            const attachmentPath = path.resolve(repositoryRoot, question.attachment);
            const managedDirectory = path.join(repositoryRoot, 'assets', 'apply', 'game-mechanics', 'questions');
            if (attachmentPath.startsWith(`${managedDirectory}${path.sep}`)) {
                await fs.unlink(attachmentPath).catch(() => undefined);
            }
        }

        await interaction.editReply({ content: `> Deleted question #${questionId}.` });
    },
};
