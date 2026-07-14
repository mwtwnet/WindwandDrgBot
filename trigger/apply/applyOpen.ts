import { ActionRowBuilder, ButtonBuilder, ButtonInteraction, ButtonStyle, ChannelType, ThreadAutoArchiveDuration, ThreadChannel } from 'discord.js';
import type MyClient from '@utils/myClient';

import { sleep } from '@function/time';

import { Channel, Apply } from '@function/data';
import { getApplyPlayerData, setApplyPlayerData } from '@root/function/db';

export default {
    customId: 'open-apply',

    async execute(interaction: ButtonInteraction, _client: MyClient) {

        const preCacheData = await getApplyPlayerData(interaction.user.id);

        if (!preCacheData) await initPlayerData(interaction.user.id);
        if (preCacheData?.applyOpened.opened) return await interaction.reply({
            content: `> 你已經開啟過申請表單，請前往 <#${preCacheData.applyOpened.channelId}> 繼續填寫。`,
            flags: 'Ephemeral'
        });


        const applyChannel = await interaction.client.channels.fetch(Channel.ApplyChannelId).catch(async () => {
            await interaction.reply('> 設定的申請頻道無法取得，請確認頻道 ID 與機器人權限。').then(async msg => {
                await sleep(3000);
                await msg.delete();
            });
        });

        if (!applyChannel || applyChannel.type !== ChannelType.GuildText) {
            return await interaction.reply('> 設定的申請頻道無法傳送訊息，請確認頻道 ID 與機器人權限。').then(async msg => {
                await sleep(3000);
                await msg.delete();
            });
        }

        await interaction.reply({ content: `> 申請表單開啟中，請稍候...`, flags: 'Ephemeral' });

        const createThread = await applyChannel.threads.create({
            name: `申請表單 - ${interaction.user.tag}`,
            autoArchiveDuration: ThreadAutoArchiveDuration.OneDay,
            type: ChannelType.PrivateThread,
            reason: `申請表單開啟 - ${interaction.user.tag}`,
        })

        const playerData = await getApplyPlayerData(interaction.user.id);
        if (playerData) {
            playerData.applyOpened.channelId = createThread.id;
            await setApplyPlayerData(interaction.user.id, playerData);
        }

        await createMessage(createThread);
        await createThread.members.add(interaction.user.id);
        await interaction.editReply({ content: `> 申請表單已開啟，請前往 <#${createThread.id}> 填寫。` });
    }
};


async function createMessage(thread: ThreadChannel): Promise<void> {

    const formIntro = `# ${Apply.Information.Title} - 階段一\n`
        + `${Apply.Information.Description}\n`
        + `-# 申請表單將會在 24 小時後自動關閉，請在此期間完成填寫。`

    const zone1Msg = `## ${Apply.Questions.ZoneI.Title}\n`
        + `> ${Apply.Questions.ZoneI.Description}\n\n`
        + `1. ${Apply.Questions.ZoneI.Questions.Id}\n`
        + `2. ${Apply.Questions.ZoneI.Questions.Age}\n`
        + `3. ${Apply.Questions.ZoneI.Questions.Playtime}\n`
        + `4. ${Apply.Questions.ZoneI.Questions.Category}\n`
        + `5. ${Apply.Questions.ZoneI.Questions.Server}\n`

    const zone2Msg = `## ${Apply.Questions.ZoneII.Title}\n`
        + `> ${Apply.Questions.ZoneII.Description}\n\n`
        + `1. ${Apply.Questions.ZoneII.Questions.ImpactToSociality}\n`
        + `2. ${Apply.Questions.ZoneII.Questions.IdealCommunity}\n`
        + `3. ${Apply.Questions.ZoneII.Questions.TeachUs}\n`
        + `4. ${Apply.Questions.ZoneII.Questions.Experience}\n`

    const zone3Msg = `## ${Apply.Questions.ZoneIII.Title}\n`
        + `> ${Apply.Questions.ZoneIII.Description}\n\n`
        + `1. ${Apply.Questions.ZoneIII.Questions.ModUsage.Title}\n`
        + Apply.Questions.ZoneIII.Questions.ModUsage.Mods.map(mod => `  - ${mod}`).join('\n') + '\n'
        + `2. ${Apply.Questions.ZoneIII.Questions.UnreasonableSituation}\n`
        + `3. ${Apply.Questions.ZoneIII.Questions.TakingNonPublicItems}\n`
        + `4. ${Apply.Questions.ZoneIII.Questions.ProjectPreparation}\n`
        + `5. ${Apply.Questions.ZoneIII.Questions.ClearUnderstanding}\n`

    const nextPartMsg = `## 前往下一階段\n`
        + `> 請在完成階段一的表單後，點擊下方按鈕開啟階段二的表單。`

    const zone1btn = new ButtonBuilder()
        .setCustomId('answer-zone-1')
        .setLabel('開啟第一區表單')
        .setEmoji('1️⃣')
        .setStyle(ButtonStyle.Secondary);

    const zone2btn = new ButtonBuilder()
        .setCustomId('answer-zone-2')
        .setLabel('開啟第二區表單')
        .setEmoji('2️⃣')
        .setStyle(ButtonStyle.Secondary);

    const zone3btn = new ButtonBuilder()
        .setCustomId('answer-zone-3')
        .setLabel('開啟第三區表單')
        .setEmoji('3️⃣')
        .setStyle(ButtonStyle.Secondary);

    const nextPartBtn = new ButtonBuilder()
        .setCustomId('next-part')
        .setLabel('開啟下一階段表單')
        .setEmoji('➡️')
        .setStyle(ButtonStyle.Primary);

    const row1 = new ActionRowBuilder<ButtonBuilder>().addComponents(zone1btn);
    const row2 = new ActionRowBuilder<ButtonBuilder>().addComponents(zone2btn);
    const row3 = new ActionRowBuilder<ButtonBuilder>().addComponents(zone3btn);
    const row4 = new ActionRowBuilder<ButtonBuilder>().addComponents(nextPartBtn);

    await thread.send({ content: formIntro });
    await thread.send({ content: zone1Msg, components: [row1] });
    await thread.send({ content: zone2Msg, components: [row2] });
    await thread.send({ content: zone3Msg, components: [row3] });
    await thread.send({ content: nextPartMsg, components: [row4] });
}

async function initPlayerData(id: string) {
    const applyData = {
        applyOpened: {
            opened: true,
            channelId: '',
        },
        answers: {
            ZoneI: {
                Q1: '',
                Q2: '',
                Q3: '',
                Q4: '',
                Q5: '',
            },
            ZoneII: {
                Q1: '',
                Q2: '',
                Q3: '',
                Q4: '',
            },
            ZoneIII: {
                Q1: '',
                Q2: '',
                Q3: '',
                Q4: '',
                Q5: '',
            },
            ZoneIV: {
                PlayerType: '' as const,
                Completed: false,
                Q1: '',
                Q2: '',
                Q3: '',
                Q4: '',
                Q5: '',
                Q6: '',
            },
            ZoneV: {
                Honesty: '',
            }
        }
    };

    await setApplyPlayerData(id, applyData);
}
