import { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } from 'discord.js';
import type { BaseMessageOptions, Message } from 'discord.js';

import { writeConfig } from '@function/json'
import type { ApplyData, ApplyPlayerType } from '@function/db';

import { Channel, Apply } from '@function/data';
import { sleep } from '@function/time';

export async function drgApply(message: Message, arg: string): Promise<void> {

    switch (arg) {
        case 'set':
            return await drgApplySet(message);
        case 'create':
            return await drgApplyCreate(message);
        default:
            break;
    }
}

async function drgApplySet(message: Message): Promise<void> {
    writeConfig('Channel.ApplyChannelId', message.channel.id);
    return await message.reply(`> 已將申請頻道設定為 <#${message.channel.id}>。`).then(async msg => {
        await sleep(3000);
        await msg.delete();
    });
}

async function drgApplyCreate(message: Message): Promise<any> {

    if (!Channel.ApplyChannelId) {
        return await message.reply('> 申請頻道尚未設定，執行 `drg.apply.chl set` 指令設定目前頻道。').then(async msg => {
            await sleep(3000);
            await msg.delete();
        });
    }

    const applyChannel = await message.client.channels.fetch(Channel.ApplyChannelId).catch(async () => {
        await message.reply('> 設定的申請頻道無法取得，請確認頻道 ID 與機器人權限。').then(async msg => {
            await sleep(3000);
            await msg.delete();
        });
    });

    if (!applyChannel || !applyChannel.isTextBased()) {
        return await message.reply('> 設定的申請頻道無法傳送訊息，請確認頻道 ID 與機器人權限。').then(async msg => {
            await sleep(3000);
            await msg.delete();
        });
    }

    const embed = new EmbedBuilder()
        .setTitle(Apply.Information.Title)
        .setDescription(Apply.Information.Description);

    const learnMoreBtn = new ButtonBuilder()
        .setLabel(Apply.Information.MoreBtnText)
        .setStyle(ButtonStyle.Link)
        .setURL(Apply.Information.MoreLink);

    const applyBtn = new ButtonBuilder()
        .setLabel(Apply.Information.ApplyBtnText)
        .setStyle(ButtonStyle.Primary)
        .setCustomId('open-apply');

    const buttons = new ActionRowBuilder<ButtonBuilder>().addComponents(learnMoreBtn, applyBtn);
    const messagePayload: BaseMessageOptions = { embeds: [embed], components: [buttons] };

    if (message.reference && message.reference.messageId) {
        const refMessage = await message.channel.messages.fetch(message.reference.messageId);
        return await refMessage.edit(messagePayload);
    }

    if (!applyChannel?.isSendable()) {
        return await message.reply('> 設定的申請頻道無法傳送訊息，請確認頻道 ID 與機器人權限。').then(async msg => {
            await sleep(3000);
            await msg.delete();
        });
    }

    return await applyChannel.send(messagePayload);
}

export function createZoneVMessage() {
    const embed = new EmbedBuilder()
        .setTitle(Apply.Questions.ZoneV.Title)
        .setDescription(Apply.Questions.ZoneV.Description)
        .addFields({
            name: '誠信確認',
            value: Apply.Questions.ZoneV.Questions.Honesty,
        })
        .setColor(0x57F287);

    const submitButton = new ButtonBuilder()
        .setCustomId('submit-apply')
        .setLabel('確認並提交申請')
        .setEmoji('✅')
        .setStyle(ButtonStyle.Success);

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(submitButton);
    return { embeds: [embed], components: [row] };
}

const playerTypeNames: Record<ApplyPlayerType, string> = {
    'game-mechanics': '遊戲機制',
    'building-and-art': '建築與藝術',
    workers: '麵包人',
    'technical-operations': '維運技術',
};

function addAnswer(lines: string[], number: number, question: string, answer: string): void {
    lines.push(`${number}. ${question}`);
    lines.push(answer || '（未填寫）', '');
}

export function createApplicationSummary(applicant: string, data: ApplyData): string {
    const lines = [
        Apply.Information.Title,
        `申請者：${applicant}`,
        '',
        `【${Apply.Questions.ZoneI.Title}】`,
    ];

    addAnswer(lines, 1, Apply.Questions.ZoneI.Questions.Id, data.answers.ZoneI.Q1);
    addAnswer(lines, 2, Apply.Questions.ZoneI.Questions.Age, data.answers.ZoneI.Q2);
    addAnswer(lines, 3, Apply.Questions.ZoneI.Questions.Playtime, data.answers.ZoneI.Q3);
    addAnswer(lines, 4, Apply.Questions.ZoneI.Questions.Category, data.answers.ZoneI.Q4);
    addAnswer(lines, 5, Apply.Questions.ZoneI.Questions.Server, data.answers.ZoneI.Q5);

    lines.push(`【${Apply.Questions.ZoneII.Title}】`);
    addAnswer(lines, 1, Apply.Questions.ZoneII.Questions.ImpactToSociality, data.answers.ZoneII.Q1);
    addAnswer(lines, 2, Apply.Questions.ZoneII.Questions.IdealCommunity, data.answers.ZoneII.Q2);
    addAnswer(lines, 3, Apply.Questions.ZoneII.Questions.TeachUs, data.answers.ZoneII.Q3);
    addAnswer(lines, 4, Apply.Questions.ZoneII.Questions.Experience, data.answers.ZoneII.Q4);

    lines.push(`【${Apply.Questions.ZoneIII.Title}】`);
    addAnswer(lines, 1, Apply.Questions.ZoneIII.Questions.ModUsage.Title, data.answers.ZoneIII.Q1);
    addAnswer(lines, 2, Apply.Questions.ZoneIII.Questions.UnreasonableSituation, data.answers.ZoneIII.Q2);
    addAnswer(lines, 3, Apply.Questions.ZoneIII.Questions.TakingNonPublicItems, data.answers.ZoneIII.Q3);
    addAnswer(lines, 4, Apply.Questions.ZoneIII.Questions.ProjectPreparation, data.answers.ZoneIII.Q4);
    addAnswer(lines, 5, Apply.Questions.ZoneIII.Questions.ClearUnderstanding, data.answers.ZoneIII.Q5);

    const zoneIV = data.answers.ZoneIV;
    lines.push(`【${Apply.Questions.ZoneIV.Title}】`);
    lines.push(`玩家類型：${zoneIV?.PlayerType ? playerTypeNames[zoneIV.PlayerType] : '（未選擇）'}`, '');

    if (zoneIV?.PlayerType === 'game-mechanics') {
        for (const question of zoneIV.GameMechanics?.Questions ?? []) {
            addAnswer(
                lines,
                question.Order,
                `${question.Question}（${question.MaxScore} 分）`,
                question.Answer,
            );
        }
    } else if (zoneIV?.PlayerType === 'building-and-art') {
        addAnswer(lines, 1, '最滿意的建築作品', zoneIV.Q1);
        addAnswer(lines, 2, '作品說明', zoneIV.Q2);
    } else if (zoneIV?.PlayerType === 'technical-operations') {
        addAnswer(lines, 1, '請介紹你熟悉的維運或程式技術', zoneIV.Q1);
    } else if (zoneIV?.PlayerType === 'workers') {
        lines.push('此類型不需額外作答，第四區直接通過。', '');
    }

    lines.push(`【${Apply.Questions.ZoneV.Title}】`);
    addAnswer(lines, 1, Apply.Questions.ZoneV.Questions.Honesty, data.answers.ZoneV?.Honesty || '是');

    return lines.join('\n');
}
