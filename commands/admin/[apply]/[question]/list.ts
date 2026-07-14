import { MessageFlags, SlashCommandSubcommandBuilder } from 'discord.js';
import type { ChatInputCommandInteraction } from 'discord.js';
import { QuestionCategory } from '@generated/prisma/enums';
import prisma from '@function/db';
import type MyClient from '@utils/myClient';

const difficultyNames: Record<number, string> = { 1: 'Easy', 2: 'Medium', 3: 'Hard' };

export default {
    data: new SlashCommandSubcommandBuilder()
        .setName('list')
        .setDescription('List application questions and their IDs')
        .addStringOption(option => option
            .setName('category')
            .setDescription('Optionally filter by category')
            .addChoices(
                { name: 'Game Mechanics', value: QuestionCategory.GAMEMECHANIC },
                { name: 'Building', value: QuestionCategory.BUILDING },
            )),

    async execute(interaction: ChatInputCommandInteraction, _client: MyClient) {
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });

        const category = interaction.options.getString('category') as QuestionCategory | null;
        const questions = await prisma.questions.findMany({
            where: category ? { category } : {},
            include: { _count: { select: { options: true } } },
            orderBy: { id: 'desc' },
            take: 25,
        });

        if (questions.length === 0) {
            await interaction.editReply({ content: '> No questions found.' });
            return;
        }

        const lines = questions.map(question => {
            const text = question.question.length > 70
                ? `${question.question.slice(0, 67)}...`
                : question.question;
            return `#${question.id} [${difficultyNames[question.difficulty] ?? question.difficulty}] [${question.type}] (${question._count.options} options) ${text}`;
        });

        await interaction.editReply({ content: lines.join('\n') });
    },
};
