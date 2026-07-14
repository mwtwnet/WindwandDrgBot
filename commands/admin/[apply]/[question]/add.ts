import fs from 'node:fs/promises';
import path from 'node:path';
import { MessageFlags, SlashCommandSubcommandBuilder } from 'discord.js';
import type { Attachment, ChatInputCommandInteraction } from 'discord.js';
import { QuestionCategory, RespondType } from '@generated/prisma/enums';
import prisma from '@function/db';
import type MyClient from '@utils/myClient';

const imageExtensions = new Set(['.png', '.jpg', '.jpeg', '.webp', '.gif']);

async function downloadAttachment(attachment: Attachment, questionId: number): Promise<string> {
    if (!attachment.contentType?.startsWith('image/')) {
        throw new Error('The attachment must be an image.');
    }

    const extension = path.extname(attachment.name).toLowerCase();
    if (!imageExtensions.has(extension)) {
        throw new Error('Supported image types: PNG, JPG, WEBP, and GIF.');
    }

    const response = await fetch(attachment.url);
    if (!response.ok) throw new Error(`Failed to download the attachment (${response.status}).`);

    const repositoryRoot = path.resolve(import.meta.dirname, '..', '..', '..', '..');
    const relativeDirectory = 'assets/apply/game-mechanics/questions';
    const targetDirectory = path.join(repositoryRoot, relativeDirectory);
    const fileName = `question-${questionId}${extension}`;

    await fs.mkdir(targetDirectory, { recursive: true });
    await fs.writeFile(path.join(targetDirectory, fileName), Buffer.from(await response.arrayBuffer()));
    return `${relativeDirectory}/${fileName}`;
}

export default {
    data: new SlashCommandSubcommandBuilder()
        .setName('add')
        .setDescription('Add a question to the application question pool')
        .addStringOption(option => option
            .setName('question')
            .setDescription('The question shown to applicants')
            .setMaxLength(191)
            .setRequired(true))
        .addStringOption(option => option
            .setName('type')
            .setDescription('How the applicant answers this question')
            .setRequired(true)
            .addChoices(
                { name: 'Multiple choice', value: RespondType.MULTIPLE_CHOICE },
                { name: 'Single option', value: RespondType.OPTION },
                { name: 'Short answer', value: RespondType.SHORT_ANSWER },
                { name: 'Paragraph', value: RespondType.PARAGRAPH },
            ))
        .addIntegerOption(option => option
            .setName('difficulty')
            .setDescription('Question difficulty and score')
            .setRequired(true)
            .addChoices(
                { name: 'Easy (1.5)', value: 1 },
                { name: 'Medium (2)', value: 2 },
                { name: 'Hard (3.25)', value: 3 },
            ))
        .addStringOption(option => option
            .setName('category')
            .setDescription('Question category')
            .setRequired(true)
            .addChoices(
                { name: 'Game Mechanics', value: QuestionCategory.GAMEMECHANIC },
                { name: 'Building', value: QuestionCategory.BUILDING },
            ))
        .addStringOption(option => option
            .setName('options')
            .setDescription('Choices separated with | (required for option question types)')
            .setMaxLength(1000))
        .addAttachmentOption(option => option
            .setName('attachment')
            .setDescription('Optional question image; it will be downloaded locally')),

    async execute(interaction: ChatInputCommandInteraction, _client: MyClient) {
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });

        const questionText = interaction.options.getString('question', true).trim();
        const type = interaction.options.getString('type', true) as RespondType;
        const difficulty = interaction.options.getInteger('difficulty', true);
        const category = interaction.options.getString('category', true) as QuestionCategory;
        const attachment = interaction.options.getAttachment('attachment');
        const options = [...new Set(
            (interaction.options.getString('options') ?? '')
                .split('|')
                .map(option => option.trim())
                .filter(Boolean),
        )];

        const usesOptions = type === RespondType.MULTIPLE_CHOICE || type === RespondType.OPTION;
        if (usesOptions && options.length < 2) {
            await interaction.editReply({ content: '> Multiple-choice and option questions require at least two choices separated by `|`.' });
            return;
        }
        if (options.some(option => option.length > 191)) {
            await interaction.editReply({ content: '> Each option must be 191 characters or fewer.' });
            return;
        }

        const duplicate = await prisma.questions.findFirst({
            where: { category, question: questionText },
        });
        if (duplicate) {
            await interaction.editReply({ content: `> Question #${duplicate.id} already has the same category and text.` });
            return;
        }

        const question = await prisma.questions.create({
            data: {
                type,
                category,
                difficulty,
                question: questionText,
                ...(usesOptions ? { options: { create: options.map(option => ({ option })) } } : {}),
            },
        });

        try {
            if (attachment) {
                const localPath = await downloadAttachment(attachment, question.id);
                await prisma.questions.update({
                    where: { id: question.id },
                    data: { attachment: localPath },
                });
            }
        } catch (error) {
            await prisma.options.deleteMany({ where: { questionId: question.id } });
            await prisma.questions.delete({ where: { id: question.id } });
            const message = error instanceof Error ? error.message : 'Unknown attachment error';
            await interaction.editReply({ content: `> The question was not added: ${message}` });
            return;
        }

        await interaction.editReply({
            content: `> Added question #${question.id} (${category}, difficulty ${difficulty}).`,
        });
    },
};
