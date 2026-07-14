import { MessageFlags, SlashCommandSubcommandBuilder } from 'discord.js';
import type { ChatInputCommandInteraction } from 'discord.js';
import { RespondType } from '@generated/prisma/enums';
import prisma from '@function/db';
import type MyClient from '@utils/myClient';

export default {
    data: new SlashCommandSubcommandBuilder()
        .setName('option')
        .setDescription('Add an option to an existing question')
        .addIntegerOption(option => option
            .setName('question_id')
            .setDescription('Question ID from the question list')
            .setMinValue(1)
            .setRequired(true))
        .addStringOption(option => option
            .setName('option')
            .setDescription('The option to add')
            .setMaxLength(191)
            .setRequired(true)),

    async execute(interaction: ChatInputCommandInteraction, _client: MyClient) {
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });

        const questionId = interaction.options.getInteger('question_id', true);
        const option = interaction.options.getString('option', true).trim();
        const question = await prisma.questions.findUnique({ where: { id: questionId } });

        if (!question) {
            await interaction.editReply({ content: `> Question #${questionId} does not exist.` });
            return;
        }
        if (question.type !== RespondType.MULTIPLE_CHOICE && question.type !== RespondType.OPTION) {
            await interaction.editReply({ content: '> Options can only be added to multiple-choice or single-option questions.' });
            return;
        }

        const duplicate = await prisma.options.findFirst({ where: { questionId, option } });
        if (duplicate) {
            await interaction.editReply({ content: '> That option already exists on this question.' });
            return;
        }

        await prisma.options.create({ data: { questionId, option } });
        await interaction.editReply({ content: `> Added option to question #${questionId}: ${option}` });
    },
};
