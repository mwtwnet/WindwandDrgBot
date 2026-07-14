import { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } from 'discord.js';
import type { BaseMessageOptions, Message } from 'discord.js';

import { Channel, Apply } from '@function/data';
import { sleep } from '@function/time';

export async function drgApplySet(message: Message) {

    if (!Channel.ApplyChannelId) {
        return await message.reply('> 申請頻道尚未設定，執行 `drg.apply.chl set` 指令設定目前頻道。').then(async msg => {
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
        .setCustomId('drg-apply');

    const buttons = new ActionRowBuilder<ButtonBuilder>().addComponents(learnMoreBtn, applyBtn);
    const messagePayload: BaseMessageOptions = { embeds: [embed], components: [buttons] };

    if (message.reference && message.reference.messageId) {
        const refMessage = await message.channel.messages.fetch(message.reference.messageId);
        return await refMessage.edit(messagePayload);
    }

    const applyChannel = await message.client.channels.fetch(Channel.ApplyChannelId).catch(async () => {
        await message.reply('> 設定的申請頻道無法取得，請確認頻道 ID 與機器人權限。').then(async msg => {
            await sleep(3000);
            await msg.delete();
        });
    });

    if (!applyChannel?.isSendable()) {
        return await message.reply('> 設定的申請頻道無法傳送訊息，請確認頻道 ID 與機器人權限。').then(async msg => {
            await sleep(3000);
            await msg.delete();
        });
    }

    return await applyChannel.send(messagePayload);
}
