import { ActionRowBuilder, ButtonBuilder, MessageFlags, StringSelectMenuBuilder, StringSelectMenuOptionBuilder } from 'discord.js';
import type { ButtonInteraction } from 'discord.js';
import type MyClient from '@utils/myClient';
import { Apply } from '@function/data';

export default {
    customId: 'next-part',

    async execute(interaction: ButtonInteraction, _client: MyClient) {

        await interaction.deferUpdate()
        const interactionMessage = interaction.message;

        const channel = interaction.channel;
        if (!channel || !channel.isThread()) {
            await interaction.reply({ content: "This command can only be used in a thread channel.", flags: MessageFlags.Ephemeral });
            return;
        }

        const nextPartIntro = `# ${Apply.Information.Title} - 階段二\n`
            + `> ${Apply.Questions.PartTwoDescription}\n`

        const nextPartMsg = `## ${Apply.Questions.ZoneIV.Title}\n`
            + `> ${Apply.Questions.ZoneIV.Description}\n\n`
            + `1. ${Apply.Questions.ZoneIV.Questions.PlayerType}\n`
            + `  - ${Apply.Questions.ZoneIV.Category.GameMechanics}\n`
            + `  - ${Apply.Questions.ZoneIV.Category.BuildingAndArt}\n`
            + `  - ${Apply.Questions.ZoneIV.Category.Workers}\n`
            + `  - ${Apply.Questions.ZoneIV.Category.TechnicalOperations}\n\n`
            + `> 請選擇你想要申請的玩家類型，選擇後將會進入下一階段的申請表單。`;

        const selectType = new StringSelectMenuBuilder()
            .setCustomId('answer-zone-4-q1')
            .setRequired(true)
            .setPlaceholder('請選擇你想要申請的玩家類型')
            .addOptions(
                new StringSelectMenuOptionBuilder()
                    .setLabel('遊戲機制')
                    .setEmoji('🔬')
                    .setValue('game-mechanics'),
                new StringSelectMenuOptionBuilder()
                    .setLabel('建築與藝術')
                    .setEmoji('🧱')
                    .setValue('building-and-art'),
                new StringSelectMenuOptionBuilder()
                    .setLabel('麵包人')
                    .setEmoji('⛏️')
                    .setValue('workers'),
                new StringSelectMenuOptionBuilder()
                    .setLabel('維運技術')
                    .setEmoji('⚙️')
                    .setValue('technical-operations')
            );

        const row = new ActionRowBuilder<StringSelectMenuBuilder>()
            .addComponents(selectType);

        await channel.send({ content: nextPartIntro });
        await channel.send({ content: nextPartMsg, components: [row] });

        const disabledButton = ButtonBuilder.from(interaction.component)
            .setDisabled(true);

        const disabledButtonRow = new ActionRowBuilder<ButtonBuilder>()
            .addComponents(disabledButton);

        await interactionMessage.edit({ components: [disabledButtonRow] });
    }
};
